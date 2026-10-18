/** A single cell value. Everything stays JSON-serializable so datasets can be
 * persisted, exported and transferred to the Python Web Worker unchanged. */
export type CellValue = string | number | boolean | null

export type DataRow = Record<string, CellValue>

/** Dates are stored as ISO-8601 strings and tagged as `"date"`. */
export type ColumnType = "number" | "boolean" | "date" | "string"

export type ColumnTypes = Record<string, ColumnType>

export interface Dataset {
  rows: DataRow[]
  columns: string[]
  columnTypes: ColumnTypes
}

export function isMissing(value: unknown): value is null | undefined | "" {
  return value === null || value === undefined || value === "" || (typeof value === "number" && Number.isNaN(value))
}
