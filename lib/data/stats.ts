import { type CellValue, type ColumnType, type ColumnTypes, type DataRow, isMissing } from "./types"

export function sum(values: readonly number[]): number {
  let total = 0
  for (const v of values) total += v
  return total
}

export function mean(values: readonly number[]): number {
  return values.length === 0 ? Number.NaN : sum(values) / values.length
}

/** Linear-interpolated quantile (same as numpy's default / pandas `quantile`). */
export function quantileSorted(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return Number.NaN
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

export function quantile(values: readonly number[], q: number): number {
  return quantileSorted([...values].sort((a, b) => a - b), q)
}

export function median(values: readonly number[]): number {
  return quantile(values, 0.5)
}

/** Sample variance (ddof = 1), matching pandas' default. */
export function variance(values: readonly number[]): number {
  const n = values.length
  if (n < 2) return n === 1 ? 0 : Number.NaN
  const m = mean(values)
  let acc = 0
  for (const v of values) acc += (v - m) ** 2
  return acc / (n - 1)
}

export function std(values: readonly number[]): number {
  return Math.sqrt(variance(values))
}

/** Adjusted Fisher–Pearson skewness (pandas `skew`). */
export function skewness(values: readonly number[]): number {
  const n = values.length
  if (n < 3) return Number.NaN
  const m = mean(values)
  const s = std(values)
  if (s === 0) return 0
  let acc = 0
  for (const v of values) acc += ((v - m) / s) ** 3
  return (n / ((n - 1) * (n - 2))) * acc
}

/** Excess kurtosis with bias correction (pandas `kurt`). */
export function kurtosis(values: readonly number[]): number {
  const n = values.length
  if (n < 4) return Number.NaN
  const m = mean(values)
  const s = std(values)
  if (s === 0) return 0
  let acc = 0
  for (const v of values) acc += ((v - m) / s) ** 4
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * acc - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3))
}

/** Pearson correlation over pairs where *both* values are finite numbers. */
export function pearson(xs: readonly unknown[], ys: readonly unknown[]): number {
  const a: number[] = []
  const b: number[] = []
  const n = Math.min(xs.length, ys.length)
  for (let i = 0; i < n; i++) {
    const x = xs[i]
    const y = ys[i]
    if (typeof x === "number" && typeof y === "number" && Number.isFinite(x) && Number.isFinite(y)) {
      a.push(x)
      b.push(y)
    }
  }
  if (a.length < 2) return Number.NaN
  const ma = mean(a)
  const mb = mean(b)
  let num = 0
  let da = 0
  let db = 0
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb)
    da += (a[i] - ma) ** 2
    db += (b[i] - mb) ** 2
  }
  const den = Math.sqrt(da * db)
  return den === 0 ? Number.NaN : num / den
}

export function numericValues(rows: readonly DataRow[], column: string): number[] {
  const out: number[] = []
  for (const row of rows) {
    const v = row[column]
    if (typeof v === "number" && Number.isFinite(v)) out.push(v)
  }
  return out
}

/** Tukey fences: values outside [Q1 - k·IQR, Q3 + k·IQR]. */
export function iqrBounds(values: readonly number[], k = 1.5): { lower: number; upper: number } {
  const sorted = [...values].sort((a, b) => a - b)
  const q1 = quantileSorted(sorted, 0.25)
  const q3 = quantileSorted(sorted, 0.75)
  const iqr = q3 - q1
  return { lower: q1 - k * iqr, upper: q3 + k * iqr }
}

export function zScores(values: readonly number[]): number[] {
  const m = mean(values)
  const s = std(values)
  return values.map((v) => (s === 0 ? 0 : (v - m) / s))
}

export interface HistogramBin {
  start: number
  end: number
  count: number
}

export function histogram(values: readonly number[], binCount = 20): HistogramBin[] {
  if (values.length === 0) return []
  let min = Infinity
  let max = -Infinity
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
  }
  if (min === max) return [{ start: min, end: max, count: values.length }]
  const width = (max - min) / binCount
  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => ({
    start: min + i * width,
    end: min + (i + 1) * width,
    count: 0,
  }))
  for (const v of values) bins[Math.min(binCount - 1, Math.floor((v - min) / width))].count++
  return bins
}

// ---------------------------------------------------------------------------
// Profiling
// ---------------------------------------------------------------------------

export interface ColumnProfile {
  name: string
  type: ColumnType
  count: number
  missing: number
  missingPercentage: number
  unique: number
  uniquePercentage: number
  duplicates: number
  mean?: number
  median?: number
  mode?: CellValue
  std?: number
  min?: number
  max?: number
  q1?: number
  q3?: number
  skewness?: number
  kurtosis?: number
  avgLength?: number
  minLength?: number
  maxLength?: number
  topValues?: Array<{ value: CellValue; count: number; percentage: number }>
  outliers?: number[]
  outlierCount?: number
  patterns?: string[]
  anomalies?: string[]
}

export interface DataQualityIssue {
  type: "missing_values" | "duplicates" | "outliers" | "inconsistent_format" | "data_type_mismatch" | "unusual_patterns"
  severity: "low" | "medium" | "high"
  column?: string
  description: string
  count: number
  suggestion: string
}

export interface DataProfile {
  overview: {
    totalRows: number
    totalColumns: number
    memoryUsage: string
    duplicateRows: number
    completeness: number
    missingCells: number
  }
  columns: Record<string, ColumnProfile>
  dataQuality: DataQualityIssue[]
  correlations: Record<string, Record<string, number>>
  generatedAt: string
}

function round(value: number, digits = 4): number {
  if (!Number.isFinite(value)) return value
  const f = 10 ** digits
  return Math.round(value * f) / f
}

function pct(part: number, whole: number): number {
  return whole === 0 ? 0 : round((part / whole) * 100, 2)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

export function countDuplicateRows(rows: readonly DataRow[], columns: readonly string[]): number {
  const seen = new Set<string>()
  let duplicates = 0
  for (const row of rows) {
    const key = JSON.stringify(columns.map((c) => row[c] ?? null))
    if (seen.has(key)) duplicates++
    else seen.add(key)
  }
  return duplicates
}

export function profileColumn(rows: readonly DataRow[], column: string, type: ColumnType): ColumnProfile {
  const values = rows.map((row) => row[column])
  const present = values.filter((v) => !isMissing(v)) as Exclude<CellValue, null>[]
  const missing = values.length - present.length

  const counts = new Map<Exclude<CellValue, null>, number>()
  for (const v of present) counts.set(v, (counts.get(v) ?? 0) + 1)
  const unique = counts.size
  const sortedCounts = [...counts.entries()].sort((a, b) => b[1] - a[1])

  const profile: ColumnProfile = {
    name: column,
    type,
    count: values.length,
    missing,
    missingPercentage: pct(missing, values.length),
    unique,
    uniquePercentage: pct(unique, present.length),
    duplicates: present.length - unique,
    mode: sortedCounts[0]?.[0] ?? null,
    topValues: sortedCounts.slice(0, 10).map(([value, count]) => ({ value, count, percentage: pct(count, present.length) })),
  }

  if (type === "number") {
    const nums = present.filter((v): v is number => typeof v === "number")
    if (nums.length > 0) {
      const sorted = [...nums].sort((a, b) => a - b)
      const q1 = quantileSorted(sorted, 0.25)
      const q3 = quantileSorted(sorted, 0.75)
      const iqr = q3 - q1
      const outliers = nums.filter((v) => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr)
      Object.assign(profile, {
        mean: round(mean(nums)),
        median: round(quantileSorted(sorted, 0.5)),
        std: round(std(nums)),
        min: sorted[0],
        max: sorted[sorted.length - 1],
        q1: round(q1),
        q3: round(q3),
        skewness: round(skewness(nums)),
        kurtosis: round(kurtosis(nums)),
        outliers: outliers.slice(0, 100),
        outlierCount: outliers.length,
      })
    }
  } else if (type === "string") {
    const lengths = present.map((v) => String(v).length)
    if (lengths.length > 0) {
      profile.avgLength = round(mean(lengths), 1)
      profile.minLength = Math.min(...lengths)
      profile.maxLength = Math.max(...lengths)
    }
    const anomalies: string[] = []
    if (present.some((v) => String(v) !== String(v).trim())) anomalies.push("Leading/trailing whitespace")
    const lowerUnique = new Set(present.map((v) => String(v).toLowerCase())).size
    if (lowerUnique < unique) anomalies.push("Same values with different capitalisation")
    if (anomalies.length) profile.anomalies = anomalies
  }

  return profile
}

export function correlationMatrix(rows: readonly DataRow[], columns: readonly string[]): Record<string, Record<string, number>> {
  const series = Object.fromEntries(columns.map((c) => [c, rows.map((r) => r[c])]))
  const matrix: Record<string, Record<string, number>> = {}
  for (const a of columns) matrix[a] = {}
  for (let i = 0; i < columns.length; i++) {
    const a = columns[i]
    matrix[a][a] = 1
    for (let j = i + 1; j < columns.length; j++) {
      const b = columns[j]
      const r = round(pearson(series[a], series[b]))
      matrix[a][b] = r
      matrix[b][a] = r
    }
  }
  return matrix
}

export function detectQualityIssues(
  overview: DataProfile["overview"],
  columns: Record<string, ColumnProfile>,
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = []

  if (overview.duplicateRows > 0) {
    issues.push({
      type: "duplicates",
      severity: pct(overview.duplicateRows, overview.totalRows) > 5 ? "medium" : "low",
      description: `${overview.duplicateRows} fully duplicated rows`,
      count: overview.duplicateRows,
      suggestion: "Remove duplicate rows in a Preprocessing cell unless repeats are meaningful.",
    })
  }

  for (const profile of Object.values(columns)) {
    if (profile.missingPercentage > 5) {
      issues.push({
        type: "missing_values",
        severity: profile.missingPercentage > 50 ? "high" : profile.missingPercentage > 20 ? "medium" : "low",
        column: profile.name,
        description: `${profile.missingPercentage}% of values are missing in "${profile.name}"`,
        count: profile.missing,
        suggestion:
          profile.missingPercentage > 50
            ? "Consider dropping this column."
            : `Impute with the ${profile.type === "number" ? "median" : "most frequent value"} or drop affected rows.`,
      })
    }
    if (profile.outlierCount && profile.outlierCount > 0) {
      const share = pct(profile.outlierCount, profile.count - profile.missing)
      issues.push({
        type: "outliers",
        severity: share > 10 ? "medium" : "low",
        column: profile.name,
        description: `${profile.outlierCount} outliers (IQR rule) in "${profile.name}"`,
        count: profile.outlierCount,
        suggestion: "Inspect them; cap, transform (log) or remove if they are errors.",
      })
    }
    if (profile.type === "string" && profile.count > 20 && profile.uniquePercentage > 95) {
      issues.push({
        type: "unusual_patterns",
        severity: "low",
        column: profile.name,
        description: `"${profile.name}" is almost entirely unique — likely an identifier`,
        count: profile.unique,
        suggestion: "Exclude identifier columns from modelling.",
      })
    }
    if (profile.anomalies?.length) {
      issues.push({
        type: "inconsistent_format",
        severity: "low",
        column: profile.name,
        description: `${profile.anomalies.join("; ")} in "${profile.name}"`,
        count: profile.unique,
        suggestion: "Trim and normalise text values.",
      })
    }
    if (profile.unique === 1 && profile.count > 1) {
      issues.push({
        type: "unusual_patterns",
        severity: "low",
        column: profile.name,
        description: `"${profile.name}" has a single constant value`,
        count: profile.count,
        suggestion: "Constant columns carry no information and can be dropped.",
      })
    }
  }

  const order = { high: 0, medium: 1, low: 2 }
  return issues.sort((a, b) => order[a.severity] - order[b.severity])
}

export function generateProfile(rows: readonly DataRow[], columns: readonly string[], columnTypes: ColumnTypes): DataProfile {
  const columnProfiles: Record<string, ColumnProfile> = {}
  let missingCells = 0
  for (const column of columns) {
    const profile = profileColumn(rows, column, columnTypes[column] ?? "string")
    columnProfiles[column] = profile
    missingCells += profile.missing
  }

  const totalCells = rows.length * columns.length
  const overview: DataProfile["overview"] = {
    totalRows: rows.length,
    totalColumns: columns.length,
    memoryUsage: formatBytes(new Blob([JSON.stringify(rows)]).size),
    duplicateRows: countDuplicateRows(rows, columns),
    completeness: totalCells === 0 ? 100 : pct(totalCells - missingCells, totalCells),
    missingCells,
  }

  const numericColumns = columns.filter((c) => columnTypes[c] === "number")
  return {
    overview,
    columns: columnProfiles,
    dataQuality: detectQualityIssues(overview, columnProfiles),
    correlations: numericColumns.length > 1 ? correlationMatrix(rows, numericColumns) : {},
    generatedAt: new Date().toISOString(),
  }
}
