import Papa from "papaparse"
import { buildDataset, normalizeHeaders } from "./infer"
import type { Dataset } from "./types"

export const SUPPORTED_EXTENSIONS = ["csv", "tsv", "txt", "json", "xlsx"] as const
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024

export class DataParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DataParseError"
  }
}

function fromMatrix(matrix: readonly (readonly unknown[])[]): Dataset {
  const nonEmpty = matrix.filter((row) => row.some((cell) => cell !== null && cell !== undefined && cell !== ""))
  if (nonEmpty.length < 2) throw new DataParseError("The file needs a header row and at least one data row.")
  const headers = normalizeHeaders(nonEmpty[0])
  const records = nonEmpty.slice(1).map((cells) => {
    const record: Record<string, unknown> = {}
    headers.forEach((header, i) => {
      record[header] = cells[i] ?? null
    })
    return record
  })
  return buildDataset(records, headers)
}

/** Parse delimited text (CSV/TSV, delimiter auto-detected) with full RFC-4180 quoting support. */
export function parseDelimitedText(text: string): Dataset {
  const result = Papa.parse<string[]>(text.replace(/^﻿/, ""), {
    skipEmptyLines: "greedy",
    dynamicTyping: false,
  })
  const fatal = result.errors.find((e) => e.type === "Quotes")
  if (fatal) throw new DataParseError(`CSV parse error on row ${fatal.row ?? "?"}: ${fatal.message}`)
  if (result.data.length === 0) throw new DataParseError("The file is empty.")
  return fromMatrix(result.data)
}

function flatten(value: unknown, prefix = "", out: Record<string, unknown> = {}): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, inner] of Object.entries(value)) flatten(inner, prefix ? `${prefix}.${key}` : key, out)
  } else {
    out[prefix || "value"] = Array.isArray(value) ? JSON.stringify(value) : value
  }
  return out
}

/**
 * Parse JSON. Accepts an array of records, `{ "data": [...] }`-style wrappers,
 * column-oriented objects (`{ "a": [1,2], "b": [3,4] }`) or a single record.
 * Nested objects are flattened with dotted keys.
 */
export function parseJSONText(text: string): Dataset {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (err) {
    throw new DataParseError(`Invalid JSON: ${err instanceof Error ? err.message : String(err)}`)
  }

  let records: unknown[]
  if (Array.isArray(parsed)) {
    records = parsed
  } else if (parsed !== null && typeof parsed === "object") {
    const entries = Object.entries(parsed)
    const arrayEntry = entries.find(([, v]) => Array.isArray(v) && v.length > 0 && typeof v[0] === "object")
    const columnOriented = entries.length > 0 && entries.every(([, v]) => Array.isArray(v))
    if (arrayEntry) {
      records = arrayEntry[1] as unknown[]
    } else if (columnOriented) {
      const length = Math.max(...entries.map(([, v]) => (v as unknown[]).length))
      records = Array.from({ length }, (_, i) => Object.fromEntries(entries.map(([k, v]) => [k, (v as unknown[])[i]])))
    } else {
      records = [parsed]
    }
  } else {
    throw new DataParseError("JSON must be an array of records or an object.")
  }

  if (records.length === 0) throw new DataParseError("The JSON file contains no records.")
  return buildDataset(records.map((r) => flatten(r)))
}

export async function parseExcel(input: ArrayBuffer | Blob): Promise<Dataset> {
  const { readSheet } = await import("read-excel-file/universal")
  const matrix = await readSheet(input)
  return fromMatrix(matrix as unknown[][])
}

export function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".")
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase()
}

/** Parse a user-supplied file into a typed dataset. */
export async function parseFile(file: File): Promise<Dataset> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new DataParseError(`File is larger than ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`)
  }
  const ext = getExtension(file.name)
  switch (ext) {
    case "csv":
    case "tsv":
    case "txt":
      return parseDelimitedText(await file.text())
    case "json":
      return parseJSONText(await file.text())
    case "xlsx":
      return parseExcel(await file.arrayBuffer())
    case "xls":
      throw new DataParseError("Legacy .xls files are not supported. Save the sheet as .xlsx or .csv.")
    default:
      throw new DataParseError(`Unsupported file type ".${ext}". Use CSV, TSV, JSON or XLSX.`)
  }
}
