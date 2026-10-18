import { type CellValue, type ColumnType, type ColumnTypes, type DataRow, type Dataset, isMissing } from "./types"

/** Tokens treated as "no value" when importing text data. */
const MISSING_TOKENS = new Set(["", "na", "n/a", "nan", "null", "none", "undefined", "-", "?"])
const TRUE_TOKENS = new Set(["true", "yes", "y"])
const FALSE_TOKENS = new Set(["false", "no", "n"])
const NUMBER_RE = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/
// ISO dates/datetimes, or d/m/y-style dates with 4-digit years.
const DATE_RE = /^(\d{4}-\d{1,2}-\d{1,2}([T ]\d{1,2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?|\d{1,2}[/.-]\d{1,2}[/.-]\d{4})$/

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value)
}

function parseNumber(text: string): number | null {
  const cleaned = text.replace(/,(?=\d{3}\b)/g, "")
  if (!NUMBER_RE.test(cleaned)) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function parseDate(text: string): string | null {
  if (!DATE_RE.test(text)) return null
  const t = Date.parse(text)
  return Number.isNaN(t) ? null : new Date(t).toISOString()
}

function isMissingToken(value: unknown): boolean {
  if (isMissing(value)) return true
  return typeof value === "string" && MISSING_TOKENS.has(value.trim().toLowerCase())
}

/**
 * Infer a column type from *all* non-missing values (not just the first row).
 * A column is numeric/boolean/date only if every present value parses as such.
 */
export function inferColumnType(values: readonly unknown[]): ColumnType {
  let sawValue = false
  let allNumber = true
  let allBoolean = true
  let allDate = true

  for (const raw of values) {
    if (isMissingToken(raw)) continue
    sawValue = true
    if (raw instanceof Date) {
      allNumber = allBoolean = false
      continue
    }
    if (typeof raw === "number") {
      allBoolean = allDate = false
      if (!Number.isFinite(raw)) allNumber = false
      continue
    }
    if (typeof raw === "boolean") {
      allNumber = allDate = false
      continue
    }
    const text = toText(raw)
    const lower = text.toLowerCase()
    if (allNumber && parseNumber(text) === null) allNumber = false
    if (allBoolean && !TRUE_TOKENS.has(lower) && !FALSE_TOKENS.has(lower)) allBoolean = false
    if (allDate && parseDate(text) === null) allDate = false
    if (!allNumber && !allBoolean && !allDate) return "string"
  }

  if (!sawValue) return "string"
  if (allNumber) return "number"
  if (allBoolean) return "boolean"
  if (allDate) return "date"
  return "string"
}

/** Convert a raw value to the canonical representation for `type`. */
export function coerceValue(raw: unknown, type: ColumnType): CellValue {
  if (isMissingToken(raw)) return null
  switch (type) {
    case "number": {
      if (typeof raw === "number") return Number.isFinite(raw) ? raw : null
      return parseNumber(toText(raw))
    }
    case "boolean": {
      if (typeof raw === "boolean") return raw
      const lower = toText(raw).toLowerCase()
      if (TRUE_TOKENS.has(lower)) return true
      if (FALSE_TOKENS.has(lower)) return false
      return null
    }
    case "date": {
      if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw.toISOString()
      return parseDate(toText(raw))
    }
    default: {
      if (raw instanceof Date) return raw.toISOString()
      if (typeof raw === "object") return JSON.stringify(raw)
      return typeof raw === "string" ? raw.trim() : String(raw)
    }
  }
}

/** Make header names unique and non-empty ("", "a", "a" -> "column_1", "a", "a_2"). */
export function normalizeHeaders(headers: readonly unknown[]): string[] {
  const seen = new Map<string, number>()
  return headers.map((h, i) => {
    const base = (h === null || h === undefined ? "" : String(h)).trim() || `column_${i + 1}`
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base}_${count + 1}`
  })
}

export function inferColumnTypes(rows: readonly Record<string, unknown>[], columns: readonly string[]): ColumnTypes {
  const types: ColumnTypes = {}
  for (const column of columns) {
    types[column] = inferColumnType(rows.map((row) => row[column]))
  }
  return types
}

/** Build a typed dataset from loosely-typed records (CSV/JSON/Excel output). */
export function buildDataset(records: readonly Record<string, unknown>[], columnOrder?: readonly string[]): Dataset {
  const columns: string[] = columnOrder ? [...columnOrder] : []
  if (!columnOrder) {
    const seen = new Set<string>()
    for (const record of records) {
      for (const key of Object.keys(record)) {
        if (!seen.has(key)) {
          seen.add(key)
          columns.push(key)
        }
      }
    }
  }

  const columnTypes = inferColumnTypes(records, columns)
  const rows: DataRow[] = records.map((record) => {
    const row: DataRow = {}
    for (const column of columns) row[column] = coerceValue(record[column], columnTypes[column])
    return row
  })

  return { rows, columns, columnTypes }
}

/** Re-derive column list and types after a transformation produced new rows. */
export function describeRows(rows: readonly DataRow[]): Pick<Dataset, "columns" | "columnTypes"> {
  const columns = rows.length > 0 ? Object.keys(rows[0]) : []
  return { columns, columnTypes: inferColumnTypes(rows, columns) }
}
