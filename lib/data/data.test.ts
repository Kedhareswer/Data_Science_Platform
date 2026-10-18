import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { buildDataset, coerceValue, inferColumnType, normalizeHeaders } from "./infer"
import { DataParseError, parseDelimitedText, parseJSONText } from "./parse"
import { countDuplicateRows, generateProfile, kurtosis, median, pearson, quantile, skewness, std } from "./stats"
import { applyPipeline } from "./transform"

describe("type inference", () => {
  it("looks at every value, not just the first row", () => {
    expect(inferColumnType(["1", "2", "x"])).toBe("string")
    expect(inferColumnType(["1", "", "3.5", "NA"])).toBe("number")
    expect(inferColumnType(["yes", "no", "Yes"])).toBe("boolean")
    expect(inferColumnType(["2024-01-02", "2024-02-03T10:00:00Z"])).toBe("date")
    expect(inferColumnType(["", null, undefined])).toBe("string")
  })

  it("coerces values and maps missing tokens to null", () => {
    expect(coerceValue("1,234.5", "number")).toBe(1234.5)
    expect(coerceValue("N/A", "number")).toBeNull()
    expect(coerceValue("No", "boolean")).toBe(false)
    expect(coerceValue("2024-01-02", "date")).toBe("2024-01-02T00:00:00.000Z")
  })

  it("dedupes and fills headers", () => {
    expect(normalizeHeaders(["", "a", "a", " b "])).toEqual(["column_1", "a", "a_2", "b"])
  })
})

describe("parsing", () => {
  it("handles quoted commas, newlines and BOM in CSV", () => {
    const ds = parseDelimitedText('﻿name,notes,score\n"Smith, J","line1\nline2",9\nDoe,,7\n')
    expect(ds.columns).toEqual(["name", "notes", "score"])
    expect(ds.rows).toHaveLength(2)
    expect(ds.rows[0]).toEqual({ name: "Smith, J", notes: "line1\nline2", score: 9 })
    expect(ds.rows[1].notes).toBeNull()
    expect(ds.columnTypes.score).toBe("number")
  })

  it("auto-detects tab delimiters", () => {
    const ds = parseDelimitedText("a\tb\n1\t2\n3\t4")
    expect(ds.columns).toEqual(["a", "b"])
    expect(ds.rows[1]).toEqual({ a: 3, b: 4 })
  })

  it("parses the bundled iris sample", () => {
    const ds = parseDelimitedText(readFileSync(new URL("../../public/samples/iris.csv", import.meta.url), "utf8"))
    expect(ds.rows).toHaveLength(150)
    expect(Object.values(ds.columnTypes).filter((t) => t === "number")).toHaveLength(4)
  })

  it("accepts record arrays, wrappers, column-oriented JSON and flattens nesting", () => {
    expect(parseJSONText('[{"a":1,"b":{"c":2}}]').columns).toEqual(["a", "b.c"])
    expect(parseJSONText('{"data":[{"x":1},{"x":2}]}').rows).toHaveLength(2)
    expect(parseJSONText('{"x":[1,2,3],"y":["a","b","c"]}').rows[2]).toEqual({ x: 3, y: "c" })
    expect(() => parseJSONText("{oops")).toThrow(DataParseError)
  })

  it("unions keys across heterogeneous records", () => {
    const ds = buildDataset([{ a: 1 }, { b: "x" }])
    expect(ds.columns).toEqual(["a", "b"])
    expect(ds.rows[0].b).toBeNull()
  })
})

describe("statistics", () => {
  it("matches pandas conventions", () => {
    const xs = [2, 4, 4, 4, 5, 5, 7, 9]
    expect(median([1, 2, 3, 4])).toBe(2.5)
    expect(quantile([1, 2, 3, 4], 0.25)).toBe(1.75)
    expect(std(xs)).toBeCloseTo(2.13809, 4)
    expect(skewness(xs)).toBeCloseTo(0.81848, 4)
    expect(kurtosis(xs)).toBeCloseTo(0.940625, 4)
  })

  it("computes pairwise-complete correlations", () => {
    expect(pearson([1, 2, null, 4], [2, 4, 100, 8])).toBeCloseTo(1, 10)
    expect(Number.isNaN(pearson([1, 1, 1], [1, 2, 3]))).toBe(true)
  })

  it("profiles a dataset", () => {
    const rows = [
      { x: 1, y: "a" },
      { x: 2, y: "b" },
      { x: null, y: "a" },
      { x: 1, y: "a" },
      { x: 1, y: "a" },
    ]
    const profile = generateProfile(rows, ["x", "y"], { x: "number", y: "string" })
    expect(profile.overview.duplicateRows).toBe(2)
    expect(profile.overview.missingCells).toBe(1)
    expect(profile.overview.completeness).toBe(90)
    expect(profile.columns.x.median).toBe(1)
    expect(profile.columns.y.mode).toBe("a")
    expect(countDuplicateRows(rows, ["y"])).toBe(3)
  })
})

describe("transform pipeline", () => {
  const rows = [
    { city: "A", temp: 10, label: "hot" },
    { city: "B", temp: null, label: "cold" },
    { city: "A", temp: 30, label: "hot" },
    { city: "A", temp: 10, label: "hot" },
  ]

  it("fills, filters, dedupes and encodes", () => {
    const out = applyPipeline(rows, [
      { type: "fill_missing", column: "temp", method: "median" },
      { type: "drop_duplicates" },
      { type: "filter", column: "temp", operator: "gte", value: "10" },
      { type: "one_hot", column: "city" },
      { type: "label_encode", column: "label" },
    ])
    expect(out).toEqual([
      { temp: 10, label: 1, city_A: 1, city_B: 0 },
      { temp: 10, label: 0, city_A: 0, city_B: 1 },
      { temp: 30, label: 1, city_A: 1, city_B: 0 },
    ])
  })

  it("min-max scales", () => {
    const out = applyPipeline(rows, [{ type: "normalize", column: "temp" }])
    expect(out.map((r) => r.temp)).toEqual([0, null, 1, 0])
  })
})
