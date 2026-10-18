/**
 * Pure data helpers behind the dashboard (no React). Everything here works on
 * plain `DataRow[]` so it can be unit-tested and memoized by the widgets.
 */
import { z } from "zod"
import type {
  Aggregation,
  ChartWidget,
  DashboardFilter,
  DashboardState,
  DashboardWidget,
  DateBucket,
  MetricWidget,
  TableWidget,
} from "@/lib/dashboard"
import { EMPTY_DASHBOARD } from "@/lib/dashboard"
import { median } from "@/lib/data/stats"
import type { CellValue, ColumnType, ColumnTypes, DataRow } from "@/lib/data/types"
import { isMissing } from "@/lib/data/types"

/** Label used for missing categorical values. */
export const BLANK_LABEL = "(blank)"
/** Label of the bucket that collects every category beyond the top-N. */
export const OTHER_LABEL = "Other"

export const AGGREGATIONS: readonly Aggregation[] = ["count", "sum", "mean", "median", "min", "max", "distinct"]
/** Aggregations that only make sense on numeric values. */
export const NUMERIC_AGGREGATIONS: readonly Aggregation[] = ["sum", "mean", "median", "min", "max"]

export const AGGREGATION_LABELS: Record<Aggregation, string> = {
  count: "Count",
  sum: "Sum",
  mean: "Average",
  median: "Median",
  min: "Minimum",
  max: "Maximum",
  distinct: "Distinct count",
}

export function newWidgetId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID()
  return `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Stable string key for a categorical cell value. */
export function categoryKey(value: CellValue | undefined): string {
  return isMissing(value) ? BLANK_LABEL : String(value)
}

function toNumber(value: CellValue | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "boolean") return value ? 1 : 0
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function toTime(value: CellValue | undefined): number | null {
  if (typeof value !== "string" || value === "") return null
  const t = Date.parse(value)
  return Number.isNaN(t) ? null : t
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

/** True when the filter actually restricts anything. */
export function isFilterActive(filter: DashboardFilter): boolean {
  return (
    (filter.values !== undefined && filter.values.length > 0) ||
    filter.min !== undefined ||
    filter.max !== undefined ||
    Boolean(filter.from) ||
    Boolean(filter.to)
  )
}

type RowPredicate = (row: DataRow) => boolean

function compileFilter(filter: DashboardFilter): RowPredicate | null {
  if (!isFilterActive(filter)) return null
  const { column } = filter
  const checks: RowPredicate[] = []

  if (filter.values && filter.values.length > 0) {
    const allowed = new Set(filter.values)
    checks.push((row) => allowed.has(categoryKey(row[column])))
  }
  if (filter.min !== undefined || filter.max !== undefined) {
    const lo = filter.min ?? -Infinity
    const hi = filter.max ?? Infinity
    checks.push((row) => {
      const n = toNumber(row[column])
      return n !== null && n >= lo && n <= hi
    })
  }
  if (filter.from || filter.to) {
    const lo = filter.from ? Date.parse(filter.from) : -Infinity
    // `to` is inclusive of the whole day.
    const hi = filter.to ? Date.parse(filter.to) + 86_399_999 : Infinity
    checks.push((row) => {
      const t = toTime(row[column])
      return t !== null && t >= (Number.isNaN(lo) ? -Infinity : lo) && t <= (Number.isNaN(hi) ? Infinity : hi)
    })
  }
  return checks.length === 1 ? checks[0] : (row) => checks.every((check) => check(row))
}

/** Rows matching every active filter (AND). Returns the input array when nothing filters. */
export function applyFilters(rows: readonly DataRow[], filters: readonly DashboardFilter[]): readonly DataRow[] {
  const predicates = filters.map(compileFilter).filter((p): p is RowPredicate => p !== null)
  if (predicates.length === 0) return rows
  return rows.filter((row) => predicates.every((p) => p(row)))
}

/** Distinct categorical values of a column, most frequent first. */
export function distinctValues(rows: readonly DataRow[], column: string, limit = 500): { value: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const key = categoryKey(row[column])
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .slice(0, limit)
}

/** Min / max of a numeric column (null when it has no numbers). */
export function numericExtent(rows: readonly DataRow[], column: string): { min: number; max: number } | null {
  let min = Infinity
  let max = -Infinity
  for (const row of rows) {
    const n = toNumber(row[column])
    if (n === null) continue
    if (n < min) min = n
    if (n > max) max = n
  }
  return min <= max ? { min, max } : null
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

/**
 * Aggregates cell values. Missing values are ignored. `count` counts non-missing
 * values, `distinct` counts unique non-missing values; numeric aggregations use
 * the numeric values only and return `null` when there are none.
 */
export function aggregate(values: readonly (CellValue | undefined)[], aggregation: Aggregation): number | null {
  if (aggregation === "count") {
    let n = 0
    for (const v of values) if (!isMissing(v)) n++
    return n
  }
  if (aggregation === "distinct") {
    const seen = new Set<string>()
    for (const v of values) if (!isMissing(v)) seen.add(String(v))
    return seen.size
  }
  const nums: number[] = []
  for (const v of values) {
    if (isMissing(v)) continue
    const n = toNumber(v)
    if (n !== null) nums.push(n)
  }
  if (nums.length === 0) return null
  switch (aggregation) {
    case "sum":
      return nums.reduce((a, b) => a + b, 0)
    case "mean":
      return nums.reduce((a, b) => a + b, 0) / nums.length
    case "median":
      return median(nums)
    case "min":
      return nums.reduce((a, b) => (b < a ? b : a), Infinity)
    case "max":
      return nums.reduce((a, b) => (b > a ? b : a), -Infinity)
  }
}

export interface MetricResult {
  value: number | null
  /** Rows the metric was computed over. */
  rowCount: number
}

export function computeMetric(rows: readonly DataRow[], widget: Pick<MetricWidget, "column" | "aggregation">): MetricResult {
  const { column, aggregation } = widget
  if (!column) {
    // Without a column only row counting is meaningful.
    return { value: aggregation === "count" ? rows.length : null, rowCount: rows.length }
  }
  return { value: aggregate(rows.map((row) => row[column]), aggregation), rowCount: rows.length }
}

/** Human description such as "Average of price" or "Row count". */
export function describeAggregation(aggregation: Aggregation, column?: string): string {
  if (!column) return aggregation === "count" ? "Row count" : AGGREGATION_LABELS[aggregation]
  return `${AGGREGATION_LABELS[aggregation]} of ${column}`
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

export interface GroupPoint {
  label: string
  value: number | null
  /** Rows in the group. */
  count: number
}

export interface GroupResult {
  points: GroupPoint[]
  /** "category" = sorted by value with top-N; "ordered" = numeric bins / date buckets in axis order. */
  kind: "category" | "ordered"
  /** Date bucket used (date axes only). */
  bucket?: Exclude<DateBucket, "auto">
  /** Number of categories folded into "Other". */
  otherCount: number
}

export interface GroupOptions {
  /** Column type of `x`; inferred from the values when omitted. */
  xType?: ColumnType
  bucket?: DateBucket
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/
const DAY_MS = 86_400_000

function inferType(rows: readonly DataRow[], column: string): ColumnType {
  for (let i = 0, seen = 0; i < rows.length && seen < 50; i++) {
    const v = rows[i][column]
    if (isMissing(v)) continue
    seen++
    if (typeof v === "number") return "number"
    if (typeof v === "boolean") return "boolean"
    return ISO_DATE.test(v) && !Number.isNaN(Date.parse(v)) ? "date" : "string"
  }
  return "string"
}

/** Picks a date bucket from the span of the data. */
export function autoDateBucket(minTime: number, maxTime: number): Exclude<DateBucket, "auto"> {
  const days = (maxTime - minTime) / DAY_MS
  if (days <= 62) return "day"
  if (days <= 366 * 4) return "month"
  return "year"
}

function bucketLabel(time: number, bucket: Exclude<DateBucket, "auto">): string {
  const iso = new Date(time).toISOString()
  return bucket === "day" ? iso.slice(0, 10) : bucket === "month" ? iso.slice(0, 7) : iso.slice(0, 4)
}

class Accumulator {
  count = 0
  values: CellValue[] = []
}

function finish(acc: Accumulator, y: string | undefined, aggregation: Aggregation): number | null {
  if (!y) return acc.count
  return aggregate(acc.values, aggregation)
}

function bucketsToPoints(
  groups: Map<string, Accumulator>,
  y: string | undefined,
  aggregation: Aggregation,
): GroupPoint[] {
  const points: GroupPoint[] = []
  for (const [label, acc] of groups) points.push({ label, value: finish(acc, y, aggregation), count: acc.count })
  return points
}

const compactFormat = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 })

/**
 * Groups rows by `x` and aggregates `y` (or counts rows when `y` is omitted).
 * - Categorical x: sorted by value (desc), top `limit` kept, the rest pooled into "Other".
 * - Numeric x: discrete values in order when there are few, otherwise `limit` equal-width bins.
 * - Date x: bucketed by day / month / year (auto from the span unless `bucket` is given).
 */
export function groupAggregate(
  rows: readonly DataRow[],
  x: string,
  y: string | undefined,
  aggregation: Aggregation,
  limit = 10,
  options: GroupOptions = {},
): GroupResult {
  limit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 10
  const effectiveAgg: Aggregation = y ? aggregation : "count"
  const xType = options.xType ?? inferType(rows, x)
  const add = (groups: Map<string, Accumulator>, key: string, row: DataRow) => {
    let acc = groups.get(key)
    if (!acc) {
      acc = new Accumulator()
      groups.set(key, acc)
    }
    acc.count++
    if (y) acc.values.push(row[y] ?? null)
  }

  if (xType === "date") {
    let minT = Infinity
    let maxT = -Infinity
    const times = new Array<number | null>(rows.length)
    for (let i = 0; i < rows.length; i++) {
      const t = toTime(rows[i][x])
      times[i] = t
      if (t === null) continue
      if (t < minT) minT = t
      if (t > maxT) maxT = t
    }
    if (minT > maxT) return { points: [], kind: "ordered", otherCount: 0 }
    const bucket = !options.bucket || options.bucket === "auto" ? autoDateBucket(minT, maxT) : options.bucket
    const groups = new Map<string, Accumulator>()
    for (let i = 0; i < rows.length; i++) {
      const t = times[i]
      if (t !== null) add(groups, bucketLabel(t, bucket), rows[i])
    }
    const points = bucketsToPoints(groups, y, effectiveAgg).sort((a, b) => a.label.localeCompare(b.label))
    return { points, kind: "ordered", bucket, otherCount: 0 }
  }

  if (xType === "number") {
    const nums: (number | null)[] = rows.map((row) => toNumber(row[x]))
    const distinct = new Set<number>()
    let min = Infinity
    let max = -Infinity
    for (const n of nums) {
      if (n === null) continue
      if (distinct.size <= limit) distinct.add(n)
      if (n < min) min = n
      if (n > max) max = n
    }
    if (min > max) return { points: [], kind: "ordered", otherCount: 0 }

    if (distinct.size <= limit) {
      const groups = new Map<number, Accumulator>()
      nums.forEach((n, i) => {
        if (n === null) return
        let acc = groups.get(n)
        if (!acc) {
          acc = new Accumulator()
          groups.set(n, acc)
        }
        acc.count++
        if (y) acc.values.push(rows[i][y] ?? null)
      })
      const points = [...groups.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([n, acc]) => ({ label: compactFormat.format(n), value: finish(acc, y, effectiveAgg), count: acc.count }))
      return { points, kind: "ordered", otherCount: 0 }
    }

    const binCount = Math.max(2, Math.min(50, limit))
    const width = (max - min) / binCount
    const bins = Array.from({ length: binCount }, () => new Accumulator())
    nums.forEach((n, i) => {
      if (n === null) return
      const idx = Math.min(binCount - 1, Math.floor((n - min) / width))
      bins[idx].count++
      if (y) bins[idx].values.push(rows[i][y] ?? null)
    })
    const points = bins.map((acc, i) => {
      const lo = min + i * width
      const hi = i === binCount - 1 ? max : lo + width
      return {
        label: `${compactFormat.format(lo)}–${compactFormat.format(hi)}`,
        value: acc.count === 0 && y ? null : finish(acc, y, effectiveAgg),
        count: acc.count,
      }
    })
    return { points, kind: "ordered", otherCount: 0 }
  }

  // Categorical (string / boolean).
  const groups = new Map<string, Accumulator>()
  for (const row of rows) add(groups, categoryKey(row[x]), row)
  const points = bucketsToPoints(groups, y, effectiveAgg).sort(
    (a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity) || a.label.localeCompare(b.label),
  )
  const keep = limit
  if (points.length <= keep) return { points, kind: "category", otherCount: 0 }

  const top = points.slice(0, keep)
  const rest = points.slice(keep)
  const pooled = new Accumulator()
  for (const p of rest) {
    const acc = groups.get(p.label)
    if (!acc) continue
    pooled.count += acc.count
    if (y) for (const v of acc.values) pooled.values.push(v)
  }
  top.push({ label: OTHER_LABEL, value: finish(pooled, y, effectiveAgg), count: pooled.count })
  return { points: top, kind: "category", otherCount: rest.length }
}

/** Numeric (x, y) pairs for scatter plots, evenly down-sampled to at most `maxPoints`. */
export function scatterPoints(
  rows: readonly DataRow[],
  x: string,
  y: string,
  maxPoints = 2000,
): { points: { x: number; y: number }[]; total: number } {
  const all: { x: number; y: number }[] = []
  for (const row of rows) {
    const xv = toNumber(row[x])
    const yv = toNumber(row[y])
    if (xv !== null && yv !== null) all.push({ x: xv, y: yv })
  }
  if (all.length <= maxPoints) return { points: all, total: all.length }
  const step = all.length / maxPoints
  const points: { x: number; y: number }[] = []
  for (let i = 0; i < maxPoints; i++) points.push(all[Math.floor(i * step)])
  return { points, total: all.length }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export type ValueFormat = NonNullable<MetricWidget["format"]>

/**
 * Formats a number for display. `percent` treats the value as a ratio
 * (0.25 → "25%"). Large magnitudes use compact notation ("1.2M").
 */
export function formatValue(n: number | null | undefined, format: ValueFormat = "number"): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—"
  const abs = Math.abs(n)
  if (format === "percent") {
    return new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: abs < 0.1 ? 2 : 1 }).format(n)
  }
  const compact = abs >= 1_000_000
  const maximumFractionDigits = compact ? 2 : Number.isInteger(n) ? 0 : abs >= 100 ? 1 : abs >= 1 ? 2 : 4
  if (format === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: 2,
    }).format(n)
  }
  return new Intl.NumberFormat("en-US", { notation: compact ? "compact" : "standard", maximumFractionDigits }).format(n)
}

/** Compact axis tick formatter. */
export function formatTick(n: number): string {
  return Number.isFinite(n) ? compactFormat.format(n) : ""
}

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------

function isCategorical(type: ColumnType | undefined): boolean {
  return type === "string" || type === "boolean"
}

/**
 * A sensible starter dashboard for a dataset: row count + numeric averages,
 * a bar chart of the best categorical column, a trend line (date) or
 * histogram (numeric), and a table. `rows` (optional) lets it avoid
 * ID-like categorical columns.
 */
export function suggestWidgets(
  columns: readonly string[],
  columnTypes: ColumnTypes,
  rows?: readonly DataRow[],
): DashboardWidget[] {
  const numeric = columns.filter((c) => columnTypes[c] === "number")
  const dates = columns.filter((c) => columnTypes[c] === "date")
  let categorical = columns.filter((c) => isCategorical(columnTypes[c]))

  if (rows && rows.length > 0) {
    const sample = rows.length > 5000 ? rows.slice(0, 5000) : rows
    const cardinality = new Map(categorical.map((c) => [c, new Set(sample.map((r) => categoryKey(r[c]))).size]))
    const good = categorical.filter((c) => {
      const k = cardinality.get(c) ?? 0
      return k >= 2 && k <= Math.max(50, sample.length * 0.2)
    })
    categorical = good.length > 0 ? good : categorical
    categorical.sort((a, b) => (cardinality.get(a) ?? 0) - (cardinality.get(b) ?? 0) || columns.indexOf(a) - columns.indexOf(b))
    // Prefer something with more than two groups for the bar chart when available.
    const multi = categorical.find((c) => (cardinality.get(c) ?? 0) > 2)
    if (multi) categorical = [multi, ...categorical.filter((c) => c !== multi)]
  }

  const widgets: DashboardWidget[] = [
    { id: newWidgetId(), type: "metric", title: "Rows", size: "sm", aggregation: "count", format: "number" },
  ]
  for (const column of numeric.slice(0, 3)) {
    widgets.push({ id: newWidgetId(), type: "metric", title: `Avg ${column}`, size: "sm", column, aggregation: "mean" })
  }
  if (numeric.length < 3) {
    for (const column of categorical.slice(0, 3 - numeric.length)) {
      widgets.push({
        id: newWidgetId(),
        type: "metric",
        title: `Distinct ${column}`,
        size: "sm",
        column,
        aggregation: "distinct",
      })
    }
  }

  const cat = categorical[0]
  if (cat) {
    const chart: ChartWidget = numeric[0]
      ? {
          id: newWidgetId(),
          type: "chart",
          title: `Average ${numeric[0]} by ${cat}`,
          size: "md",
          chart: "bar",
          x: cat,
          y: numeric[0],
          aggregation: "mean",
          limit: 10,
        }
      : { id: newWidgetId(), type: "chart", title: `Rows by ${cat}`, size: "md", chart: "bar", x: cat, aggregation: "count", limit: 10 }
    widgets.push(chart)
  }

  if (dates[0]) {
    widgets.push(
      numeric[0]
        ? {
            id: newWidgetId(),
            type: "chart",
            title: `${numeric[0]} over time`,
            size: cat ? "md" : "full",
            chart: "line",
            x: dates[0],
            y: numeric[0],
            aggregation: "mean",
            bucket: "auto",
          }
        : {
            id: newWidgetId(),
            type: "chart",
            title: "Rows over time",
            size: cat ? "md" : "full",
            chart: "area",
            x: dates[0],
            aggregation: "count",
            bucket: "auto",
          },
    )
  } else if (numeric[0]) {
    widgets.push({
      id: newWidgetId(),
      type: "chart",
      title: `Distribution of ${numeric[0]}`,
      size: cat ? "md" : "full",
      chart: "bar",
      x: numeric[0],
      aggregation: "count",
      limit: 20,
    })
  }

  if (cat && categorical[1]) {
    widgets.push({
      id: newWidgetId(),
      type: "chart",
      title: `Share by ${categorical[1]}`,
      size: "md",
      chart: "pie",
      x: categorical[1],
      aggregation: "count",
      limit: 6,
    })
  }
  if (numeric.length >= 2) {
    widgets.push({
      id: newWidgetId(),
      type: "chart",
      title: `${numeric[1]} vs ${numeric[0]}`,
      size: "md",
      chart: "scatter",
      x: numeric[0],
      y: numeric[1],
      aggregation: "count",
    })
  }

  const table: TableWidget = {
    id: newWidgetId(),
    type: "table",
    title: "Data preview",
    size: "full",
    columns: columns.slice(0, 8),
    pageSize: 10,
  }
  widgets.push(table)
  return widgets
}

/** Default title for a widget whose title was left blank. */
export function defaultWidgetTitle(widget: DashboardWidget): string {
  switch (widget.type) {
    case "metric":
      return describeAggregation(widget.aggregation, widget.column)
    case "chart":
      if (!widget.x) return "Chart"
      if (widget.chart === "scatter") return widget.y ? `${widget.y} vs ${widget.x}` : widget.x
      return widget.y ? `${AGGREGATION_LABELS[widget.aggregation]} ${widget.y} by ${widget.x}` : `Rows by ${widget.x}`
    case "table":
      return "Table"
    case "text":
      return "Notes"
  }
}

// ---------------------------------------------------------------------------
// Import / export
// ---------------------------------------------------------------------------

export const DASHBOARD_FILE_KIND = "datanotebook-dashboard"

export interface DashboardFile {
  kind: typeof DASHBOARD_FILE_KIND
  version: 1
  exportedAt: string
  dashboard: DashboardState
}

const aggregationSchema = z.enum(["count", "sum", "mean", "median", "min", "max", "distinct"])
const sizeSchema = z.enum(["sm", "md", "lg", "full"])
const base = { id: z.string().min(1), title: z.string(), size: sizeSchema }

const widgetSchema = z.discriminatedUnion("type", [
  z.object({
    ...base,
    type: z.literal("metric"),
    column: z.string().optional(),
    aggregation: aggregationSchema,
    format: z.enum(["number", "percent", "currency"]).optional(),
  }),
  z.object({
    ...base,
    type: z.literal("chart"),
    chart: z.enum(["bar", "line", "area", "pie", "scatter"]),
    x: z.string().optional(),
    y: z.string().optional(),
    aggregation: aggregationSchema,
    limit: z.number().int().positive().max(100).optional(),
    bucket: z.enum(["auto", "day", "month", "year"]).optional(),
  }),
  z.object({
    ...base,
    type: z.literal("table"),
    columns: z.array(z.string()),
    pageSize: z.number().int().positive().max(500),
  }),
  z.object({ ...base, type: z.literal("text"), markdown: z.string() }),
])

const filterSchema = z.object({
  id: z.string().min(1),
  column: z.string(),
  values: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})

const dashboardSchema = z.object({
  title: z.string().default(EMPTY_DASHBOARD.title),
  widgets: z.array(widgetSchema).default([]),
  filters: z.array(filterSchema).default([]),
})

export function toDashboardFile(dashboard: DashboardState): DashboardFile {
  return { kind: DASHBOARD_FILE_KIND, version: 1, exportedAt: new Date().toISOString(), dashboard }
}

/**
 * Validates an imported JSON value (either a `DashboardFile` or a bare
 * `DashboardState`). Throws an Error with a readable message when invalid.
 */
export function parseDashboardFile(json: unknown): DashboardState {
  const candidate =
    json !== null && typeof json === "object" && "dashboard" in json ? (json as { dashboard: unknown }).dashboard : json
  const result = dashboardSchema.safeParse(candidate)
  if (!result.success) {
    const issue = result.error.issues[0]
    const where = issue?.path.length ? ` at ${issue.path.join(".")}` : ""
    throw new Error(`Not a valid dashboard file${where}: ${issue?.message ?? "unknown error"}`)
  }
  // Ensure unique ids (files may be hand-edited).
  const seen = new Set<string>()
  const widgets = result.data.widgets.map((w) => {
    if (seen.has(w.id)) return { ...w, id: newWidgetId() }
    seen.add(w.id)
    return w
  })
  return { title: result.data.title, widgets, filters: result.data.filters }
}
