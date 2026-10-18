import { coerceValue } from "./infer"
import { iqrBounds, mean, median, numericValues, std } from "./stats"
import { type CellValue, type ColumnType, type DataRow, isMissing } from "./types"

/**
 * A serializable preprocessing step. Pipelines are stored on the notebook cell
 * so they survive export/import and can be re-applied to fresh data.
 */
export type TransformStep =
  | { type: "filter"; column: string; operator: FilterOperator; value: string }
  | { type: "drop_missing"; columns?: string[] }
  | { type: "fill_missing"; column: string; method: "mean" | "median" | "mode" | "constant"; value?: string }
  | { type: "drop_duplicates" }
  | { type: "drop_columns"; columns: string[] }
  | { type: "rename_column"; column: string; to: string }
  | { type: "cast"; column: string; to: ColumnType }
  | { type: "normalize"; column: string }
  | { type: "standardize"; column: string }
  | { type: "remove_outliers"; column: string; k?: number }
  | { type: "label_encode"; column: string }
  | { type: "one_hot"; column: string }
  | { type: "trim_text"; column: string }

export type FilterOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "not_contains"

export const FILTER_OPERATORS: Record<FilterOperator, string> = {
  eq: "equals",
  neq: "does not equal",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  contains: "contains",
  not_contains: "does not contain",
}

function matches(cell: CellValue, operator: FilterOperator, raw: string): boolean {
  if (operator === "contains" || operator === "not_contains") {
    const has = String(cell ?? "")
      .toLowerCase()
      .includes(raw.toLowerCase())
    return operator === "contains" ? has : !has
  }
  const asNumber = Number(raw)
  const comparable = typeof cell === "number" && raw.trim() !== "" && Number.isFinite(asNumber)
  const left = comparable ? (cell as number) : String(cell ?? "")
  const right = comparable ? asNumber : raw
  switch (operator) {
    case "eq":
      return left === right
    case "neq":
      return left !== right
    case "gt":
      return left > right
    case "gte":
      return left >= right
    case "lt":
      return left < right
    case "lte":
      return left <= right
  }
}

function modeOf(values: CellValue[]): CellValue {
  const counts = new Map<CellValue, number>()
  let best: CellValue = null
  let bestCount = 0
  for (const v of values) {
    if (isMissing(v)) continue
    const c = (counts.get(v) ?? 0) + 1
    counts.set(v, c)
    if (c > bestCount) {
      best = v
      bestCount = c
    }
  }
  return best
}

function mapColumn(rows: readonly DataRow[], column: string, fn: (v: CellValue) => CellValue): DataRow[] {
  return rows.map((row) => ({ ...row, [column]: fn(row[column]) }))
}

export function applyStep(rows: readonly DataRow[], step: TransformStep): DataRow[] {
  switch (step.type) {
    case "filter":
      return rows.filter((row) => matches(row[step.column], step.operator, step.value))

    case "drop_missing": {
      const cols = step.columns?.length ? step.columns : rows.length ? Object.keys(rows[0]) : []
      return rows.filter((row) => cols.every((c) => !isMissing(row[c])))
    }

    case "fill_missing": {
      let fill: CellValue
      if (step.method === "constant") {
        fill = step.value ?? ""
        const sample = rows.find((r) => !isMissing(r[step.column]))?.[step.column]
        if (typeof sample === "number" && Number.isFinite(Number(fill))) fill = Number(fill)
      } else if (step.method === "mode") {
        fill = modeOf(rows.map((r) => r[step.column]))
      } else {
        const nums = numericValues(rows, step.column)
        fill = nums.length ? (step.method === "mean" ? mean(nums) : median(nums)) : null
      }
      return mapColumn(rows, step.column, (v) => (isMissing(v) ? fill : v))
    }

    case "drop_duplicates": {
      const seen = new Set<string>()
      return rows.filter((row) => {
        const key = JSON.stringify(row)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    }

    case "drop_columns": {
      const drop = new Set(step.columns)
      return rows.map((row) => Object.fromEntries(Object.entries(row).filter(([k]) => !drop.has(k))))
    }

    case "rename_column":
      return rows.map((row) =>
        Object.fromEntries(Object.entries(row).map(([k, v]) => [k === step.column ? step.to : k, v])),
      )

    case "cast":
      return mapColumn(rows, step.column, (v) => coerceValue(v, step.to))

    case "normalize": {
      const nums = numericValues(rows, step.column)
      const min = Math.min(...nums)
      const range = Math.max(...nums) - min
      return mapColumn(rows, step.column, (v) => (typeof v === "number" ? (range === 0 ? 0 : (v - min) / range) : v))
    }

    case "standardize": {
      const nums = numericValues(rows, step.column)
      const m = mean(nums)
      const s = std(nums)
      return mapColumn(rows, step.column, (v) => (typeof v === "number" ? (s === 0 ? 0 : (v - m) / s) : v))
    }

    case "remove_outliers": {
      const { lower, upper } = iqrBounds(numericValues(rows, step.column), step.k ?? 1.5)
      return rows.filter((row) => {
        const v = row[step.column]
        return typeof v !== "number" || (v >= lower && v <= upper)
      })
    }

    case "label_encode": {
      const labels = [
        ...new Set(
          rows
            .map((r) => r[step.column])
            .filter((v) => !isMissing(v))
            .map(String),
        ),
      ].sort()
      const index = new Map(labels.map((l, i) => [l, i]))
      return mapColumn(rows, step.column, (v) => (isMissing(v) ? null : (index.get(String(v)) ?? null)))
    }

    case "one_hot": {
      const labels = [
        ...new Set(
          rows
            .map((r) => r[step.column])
            .filter((v) => !isMissing(v))
            .map(String),
        ),
      ].sort()
      return rows.map((row) => {
        const { [step.column]: value, ...rest } = row
        const encoded: DataRow = { ...rest }
        for (const label of labels) encoded[`${step.column}_${label}`] = String(value) === label ? 1 : 0
        return encoded
      })
    }

    case "trim_text":
      return mapColumn(rows, step.column, (v) => (typeof v === "string" ? v.trim() : v))
  }
}

export function applyPipeline(rows: readonly DataRow[], steps: readonly TransformStep[]): DataRow[] {
  return steps.reduce<DataRow[]>((acc, step) => applyStep(acc, step), [...rows])
}

export function describeStep(step: TransformStep): string {
  switch (step.type) {
    case "filter":
      return `Keep rows where ${step.column} ${FILTER_OPERATORS[step.operator]} "${step.value}"`
    case "drop_missing":
      return step.columns?.length ? `Drop rows missing ${step.columns.join(", ")}` : "Drop rows with any missing value"
    case "fill_missing":
      return `Fill missing ${step.column} with ${step.method === "constant" ? `"${step.value ?? ""}"` : step.method}`
    case "drop_duplicates":
      return "Drop duplicate rows"
    case "drop_columns":
      return `Drop column${step.columns.length > 1 ? "s" : ""} ${step.columns.join(", ")}`
    case "rename_column":
      return `Rename ${step.column} → ${step.to}`
    case "cast":
      return `Cast ${step.column} to ${step.to}`
    case "normalize":
      return `Min-max scale ${step.column} to [0, 1]`
    case "standardize":
      return `Standardize ${step.column} (z-score)`
    case "remove_outliers":
      return `Remove ${step.column} outliers (IQR × ${step.k ?? 1.5})`
    case "label_encode":
      return `Label-encode ${step.column}`
    case "one_hot":
      return `One-hot encode ${step.column}`
    case "trim_text":
      return `Trim whitespace in ${step.column}`
  }
}
