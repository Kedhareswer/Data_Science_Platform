import { describe, expect, it } from "vitest"
import type { DashboardWidget } from "@/lib/dashboard"
import { EMPTY_DASHBOARD } from "@/lib/dashboard"
import type { DataRow } from "@/lib/data/types"
import {
  aggregate,
  applyFilters,
  autoDateBucket,
  BLANK_LABEL,
  computeMetric,
  distinctValues,
  formatValue,
  groupAggregate,
  numericExtent,
  OTHER_LABEL,
  parseDashboardFile,
  scatterPoints,
  suggestWidgets,
  toDashboardFile,
} from "@/lib/dashboard-data"

const rows: DataRow[] = [
  { city: "Paris", price: 10, sold: true, day: "2024-01-01" },
  { city: "Paris", price: 20, sold: false, day: "2024-01-02" },
  { city: "Rome", price: 30, sold: true, day: "2024-01-02" },
  { city: "Oslo", price: null, sold: true, day: "2024-01-05" },
  { city: null, price: 40, sold: false, day: null },
]

describe("aggregate", () => {
  it("handles every aggregation and ignores missing values", () => {
    const values = [1, 2, 3, null, "", 4]
    expect(aggregate(values, "count")).toBe(4)
    expect(aggregate(values, "sum")).toBe(10)
    expect(aggregate(values, "mean")).toBe(2.5)
    expect(aggregate(values, "median")).toBe(2.5)
    expect(aggregate(values, "min")).toBe(1)
    expect(aggregate(values, "max")).toBe(4)
    expect(aggregate(["a", "b", "a", null], "distinct")).toBe(2)
  })

  it("returns null for numeric aggregations without numbers", () => {
    expect(aggregate([], "mean")).toBeNull()
    expect(aggregate(["x", null], "sum")).toBeNull()
    expect(aggregate([], "count")).toBe(0)
  })

  it("coerces numeric strings and booleans", () => {
    expect(aggregate(["1.5", "2.5"], "sum")).toBe(4)
    expect(aggregate([true, false, true], "mean")).toBeCloseTo(2 / 3)
  })
})

describe("applyFilters", () => {
  it("returns the same array when no filter is active", () => {
    expect(applyFilters(rows, [])).toBe(rows)
    expect(applyFilters(rows, [{ id: "f", column: "city", values: [] }])).toBe(rows)
  })

  it("filters categorical values, including blanks", () => {
    expect(applyFilters(rows, [{ id: "f", column: "city", values: ["Paris"] }])).toHaveLength(2)
    expect(applyFilters(rows, [{ id: "f", column: "city", values: [BLANK_LABEL] }])).toHaveLength(1)
    expect(applyFilters(rows, [{ id: "f", column: "sold", values: ["true"] }])).toHaveLength(3)
  })

  it("filters numeric ranges inclusively and drops missing values", () => {
    const out = applyFilters(rows, [{ id: "f", column: "price", min: 20, max: 30 }])
    expect(out.map((r) => r.price)).toEqual([20, 30])
    expect(applyFilters(rows, [{ id: "f", column: "price", min: 25 }])).toHaveLength(2)
  })

  it("filters date ranges inclusive of the end day", () => {
    const out = applyFilters(rows, [{ id: "f", column: "day", from: "2024-01-02", to: "2024-01-02" }])
    expect(out).toHaveLength(2)
  })

  it("ANDs multiple filters", () => {
    const out = applyFilters(rows, [
      { id: "a", column: "city", values: ["Paris", "Rome"] },
      { id: "b", column: "price", min: 15 },
    ])
    expect(out.map((r) => r.price)).toEqual([20, 30])
  })
})

describe("computeMetric", () => {
  it("counts rows without a column", () => {
    expect(computeMetric(rows, { aggregation: "count" })).toEqual({ value: 5, rowCount: 5 })
    expect(computeMetric(rows, { aggregation: "mean" }).value).toBeNull()
  })

  it("aggregates a column", () => {
    expect(computeMetric(rows, { column: "price", aggregation: "mean" }).value).toBe(25)
    expect(computeMetric(rows, { column: "price", aggregation: "count" }).value).toBe(4)
    expect(computeMetric(rows, { column: "city", aggregation: "distinct" }).value).toBe(3)
  })
})

describe("groupAggregate", () => {
  it("counts categories sorted by value", () => {
    const result = groupAggregate(rows, "city", undefined, "count")
    expect(result.kind).toBe("category")
    expect(result.points[0]).toEqual({ label: "Paris", value: 2, count: 2 })
    expect(result.points.map((p) => p.label)).toContain(BLANK_LABEL)
  })

  it("aggregates y per category", () => {
    const result = groupAggregate(rows, "city", "price", "sum")
    expect(result.points.find((p) => p.label === "Paris")?.value).toBe(30)
    expect(result.points.find((p) => p.label === "Oslo")?.value).toBeNull()
  })

  it("folds the tail into Other with pooled aggregation", () => {
    const many: DataRow[] = []
    for (let i = 0; i < 20; i++) for (let j = 0; j <= i; j++) many.push({ k: `c${i}`, v: i })
    const result = groupAggregate(many, "k", "v", "mean", 3)
    expect(result.points).toHaveLength(4)
    expect(result.points.slice(0, 3).map((p) => p.label)).toEqual(["c19", "c18", "c17"])
    const other = result.points[3]
    expect(other.label).toBe(OTHER_LABEL)
    expect(result.otherCount).toBe(17)
    // Pooled mean of values 0..16 weighted by (i + 1).
    let sum = 0
    let n = 0
    for (let i = 0; i <= 16; i++) {
      sum += i * (i + 1)
      n += i + 1
    }
    expect(other.value).toBeCloseTo(sum / n)
    expect(other.count).toBe(n)
  })

  it("keeps few distinct numeric values in axis order", () => {
    const data: DataRow[] = [{ n: 3 }, { n: 1 }, { n: 2 }, { n: 1 }]
    const result = groupAggregate(data, "n", undefined, "count")
    expect(result.kind).toBe("ordered")
    expect(result.points.map((p) => [p.label, p.value])).toEqual([
      ["1", 2],
      ["2", 1],
      ["3", 1],
    ])
  })

  it("bins wide numeric x into equal-width bins", () => {
    const data: DataRow[] = Array.from({ length: 100 }, (_, i) => ({ n: i }))
    const result = groupAggregate(data, "n", undefined, "count", 10)
    expect(result.points).toHaveLength(10)
    expect(result.points.every((p) => p.value === 10)).toBe(true)
    expect(result.otherCount).toBe(0)
  })

  it("buckets dates automatically", () => {
    const daily = groupAggregate(rows, "day", "price", "sum", 10, { xType: "date" })
    expect(daily.bucket).toBe("day")
    expect(daily.points.map((p) => p.label)).toEqual(["2024-01-01", "2024-01-02", "2024-01-05"])
    expect(daily.points[1].value).toBe(50)

    const monthly: DataRow[] = Array.from({ length: 24 }, (_, i) => ({
      d: new Date(Date.UTC(2022, i, 15)).toISOString(),
    }))
    const result = groupAggregate(monthly, "d", undefined, "count")
    expect(result.kind).toBe("ordered")
    expect(result.bucket).toBe("month")
    expect(result.points).toHaveLength(24)
    expect(result.points[0].label).toBe("2022-01")
  })

  it("honours an explicit date bucket", () => {
    const result = groupAggregate(rows, "day", undefined, "count", 10, { bucket: "year" })
    expect(result.points).toEqual([{ label: "2024", value: 4, count: 4 }])
  })

  it("returns no points for an empty column", () => {
    expect(groupAggregate([], "x", undefined, "count").points).toEqual([])
  })
})

describe("autoDateBucket", () => {
  it("picks day / month / year from the span", () => {
    const day = 86_400_000
    expect(autoDateBucket(0, 30 * day)).toBe("day")
    expect(autoDateBucket(0, 400 * day)).toBe("month")
    expect(autoDateBucket(0, 3000 * day)).toBe("year")
  })
})

describe("helpers", () => {
  it("lists distinct values by frequency", () => {
    expect(distinctValues(rows, "city")[0]).toEqual({ value: "Paris", count: 2 })
  })

  it("finds numeric extents", () => {
    expect(numericExtent(rows, "price")).toEqual({ min: 10, max: 40 })
    expect(numericExtent(rows, "city")).toBeNull()
  })

  it("down-samples scatter points", () => {
    const data: DataRow[] = Array.from({ length: 10_000 }, (_, i) => ({ a: i, b: i * 2 }))
    const { points, total } = scatterPoints(data, "a", "b", 500)
    expect(total).toBe(10_000)
    expect(points).toHaveLength(500)
    expect(points[0]).toEqual({ x: 0, y: 0 })
  })
})

describe("formatValue", () => {
  it("formats numbers, percents and currency", () => {
    expect(formatValue(null)).toBe("—")
    expect(formatValue(Number.NaN)).toBe("—")
    expect(formatValue(1234)).toBe("1,234")
    expect(formatValue(3.14159)).toBe("3.14")
    expect(formatValue(2_500_000)).toBe("2.5M")
    expect(formatValue(0.256, "percent")).toBe("25.6%")
    expect(formatValue(12.5, "currency")).toBe("$12.50")
  })
})

describe("suggestWidgets", () => {
  it("builds a starter dashboard", () => {
    const widgets = suggestWidgets(
      ["city", "price", "sold", "day"],
      {
        city: "string",
        price: "number",
        sold: "boolean",
        day: "date",
      },
      rows,
    )
    const types = widgets.map((w) => w.type)
    expect(widgets[0]).toMatchObject({ type: "metric", aggregation: "count" })
    expect(types).toContain("table")
    const charts = widgets.filter((w): w is Extract<DashboardWidget, { type: "chart" }> => w.type === "chart")
    expect(charts.some((c) => c.chart === "bar" && c.x === "city")).toBe(true)
    expect(charts.some((c) => c.chart === "line" && c.x === "day")).toBe(true)
    expect(new Set(widgets.map((w) => w.id)).size).toBe(widgets.length)
  })

  it("adds a histogram when there is no date column", () => {
    const widgets = suggestWidgets(["v"], { v: "number" })
    expect(widgets.some((w) => w.type === "chart" && w.x === "v" && w.aggregation === "count")).toBe(true)
  })

  it("works for an empty schema", () => {
    const widgets = suggestWidgets([], {})
    expect(widgets.map((w) => w.type)).toEqual(["metric", "table"])
  })
})

describe("dashboard files", () => {
  it("round-trips through export and import", () => {
    const state = {
      ...EMPTY_DASHBOARD,
      widgets: suggestWidgets(["v"], { v: "number" }),
      filters: [{ id: "f", column: "v", min: 1 }],
    }
    const json: unknown = JSON.parse(JSON.stringify(toDashboardFile(state)))
    expect(parseDashboardFile(json)).toEqual(state)
  })

  it("rejects invalid files", () => {
    expect(() => parseDashboardFile({ widgets: [{ id: "x", type: "nope" }] })).toThrow(/Not a valid dashboard/)
    expect(() => parseDashboardFile("hello")).toThrow()
  })

  it("re-ids duplicate widgets", () => {
    const w = { id: "same", type: "text", title: "t", size: "sm", markdown: "" }
    const parsed = parseDashboardFile({ title: "x", widgets: [w, w], filters: [] })
    expect(parsed.widgets[0].id).not.toBe(parsed.widgets[1].id)
  })
})
