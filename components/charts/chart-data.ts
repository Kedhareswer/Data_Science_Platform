import { correlationMatrix, histogram, mean, median, sum } from "@/lib/data/stats"
import { type ColumnType, type ColumnTypes, type DataRow, isMissing } from "@/lib/data/types"
import { type BoxStats, computeBoxStats } from "./box-plot"

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export const CHART_TYPES = ["bar", "line", "area", "scatter", "pie", "histogram", "box", "heatmap"] as const
export type ChartType = (typeof CHART_TYPES)[number]

export const AGGREGATIONS = ["count", "sum", "mean", "median", "min", "max"] as const
export type Aggregation = (typeof AGGREGATIONS)[number]

export const SORT_ORDERS = {
  none: "Original order",
  x_asc: "X ascending",
  x_desc: "X descending",
  y_desc: "Value high → low",
  y_asc: "Value low → high",
} as const
export type SortOrder = keyof typeof SORT_ORDERS

export interface ChartConfig {
  chartType: ChartType
  x: string | null
  y: string | null
  groupBy: string | null
  aggregation: Aggregation
  sort: SortOrder
  /** Keep only the first N categories after sorting (0 = all). */
  limit: number
  bins: number
  stacked: boolean
  title: string
  /** Empty string = derive from the selected columns. */
  xLabel: string
  yLabel: string
}

export type ColumnRole = "x" | "y" | "groupBy"

const ALL: readonly ColumnType[] = ["number", "string", "boolean", "date"]
const CATEGORICAL: readonly ColumnType[] = ["string", "boolean"]
const NUMERIC: readonly ColumnType[] = ["number"]

/** Which column types each chart accepts per role (`null` = role not used). */
export const ROLE_TYPES: Record<ChartType, Record<ColumnRole, readonly ColumnType[] | null>> = {
  bar: { x: ALL, y: NUMERIC, groupBy: CATEGORICAL },
  line: { x: ALL, y: NUMERIC, groupBy: CATEGORICAL },
  area: { x: ALL, y: NUMERIC, groupBy: CATEGORICAL },
  pie: { x: ALL, y: NUMERIC, groupBy: null },
  scatter: { x: ["number", "date"], y: NUMERIC, groupBy: CATEGORICAL },
  histogram: { x: NUMERIC, y: null, groupBy: null },
  box: { x: CATEGORICAL, y: NUMERIC, groupBy: null },
  heatmap: { x: null, y: null, groupBy: null },
}

/** Roles that may be left empty. */
export function isRoleOptional(chart: ChartType, role: ColumnRole, aggregation: Aggregation): boolean {
  if (role === "groupBy") return true
  if (role === "y") return usesAggregation(chart) && aggregation === "count"
  return chart === "box"
}

export const usesAggregation = (chart: ChartType) =>
  chart === "bar" || chart === "line" || chart === "area" || chart === "pie"
export const usesSort = usesAggregation
export const usesStacking = (chart: ChartType) => chart === "bar" || chart === "area"

export const MAX_GROUPS = 6
export const MAX_CATEGORIES = 500
export const MAX_SCATTER_POINTS = 2000
export const MAX_BOXES = 12
export const MAX_HEATMAP_COLUMNS = 12
export const HEATMAP_SAMPLE_ROWS = 5000

export function columnsForRole(
  chart: ChartType,
  role: ColumnRole,
  columns: readonly string[],
  types: ColumnTypes,
): string[] {
  const allowed = ROLE_TYPES[chart][role]
  if (!allowed) return []
  return columns.filter((c) => allowed.includes(types[c] ?? "string"))
}

export function defaultConfig(columns: readonly string[], types: ColumnTypes): ChartConfig {
  const numeric = columns.filter((c) => types[c] === "number")
  const categorical = columns.filter((c) => types[c] === "string" || types[c] === "boolean")
  const dates = columns.filter((c) => types[c] === "date")
  const base: ChartConfig = {
    chartType: "bar",
    x: columns[0] ?? null,
    y: null,
    groupBy: null,
    aggregation: "count",
    sort: "y_desc",
    limit: 20,
    bins: 20,
    stacked: false,
    title: "",
    xLabel: "",
    yLabel: "",
  }
  if (categorical.length && numeric.length) return { ...base, x: categorical[0], y: numeric[0], aggregation: "mean" }
  if (dates.length && numeric.length)
    return { ...base, chartType: "line", x: dates[0], y: numeric[0], aggregation: "mean", sort: "x_asc", limit: 0 }
  if (numeric.length >= 2) return { ...base, chartType: "scatter", x: numeric[0], y: numeric[1] }
  if (numeric.length === 1) return { ...base, chartType: "histogram", x: numeric[0] }
  if (categorical.length) return { ...base, x: categorical[0] }
  return base
}

/** Merge a (possibly stale) stored config with defaults and repair invalid column choices. */
export function resolveConfig(
  stored: Partial<ChartConfig> | null,
  columns: readonly string[],
  types: ColumnTypes,
): ChartConfig {
  const defaults = defaultConfig(columns, types)
  const merged: ChartConfig = { ...defaults, ...(stored && typeof stored === "object" ? stored : {}) }
  if (!CHART_TYPES.includes(merged.chartType)) merged.chartType = defaults.chartType
  if (!AGGREGATIONS.includes(merged.aggregation)) merged.aggregation = "count"
  if (!(merged.sort in SORT_ORDERS)) merged.sort = "none"
  merged.limit = Number.isFinite(merged.limit) ? Math.max(0, Math.floor(merged.limit)) : 0
  merged.bins = Number.isFinite(merged.bins) ? Math.min(100, Math.max(2, Math.floor(merged.bins))) : 20

  for (const role of ["x", "y", "groupBy"] as const) {
    const options = columnsForRole(merged.chartType, role, columns, types)
    const current = merged[role]
    if (options.length === 0) {
      merged[role] = null
    } else if (current === null || !options.includes(current)) {
      merged[role] = isRoleOptional(merged.chartType, role, merged.aggregation)
        ? null
        : (options.find((o) => o !== merged.x) ?? options[0])
    }
  }
  // Plotting a column against itself is rarely intended: pick a different Y when possible.
  if (merged.chartType === "scatter" && merged.x !== null && merged.x === merged.y) {
    merged.y = columnsForRole("scatter", "y", columns, types).find((c) => c !== merged.x) ?? merged.y
  }
  // An aggregation other than count needs a numeric value column.
  if (usesAggregation(merged.chartType) && merged.aggregation !== "count" && merged.y === null)
    merged.aggregation = "count"
  if (merged.groupBy !== null && merged.groupBy === merged.x) merged.groupBy = null
  return merged
}

export function autoLabels(config: ChartConfig): { x: string; y: string } {
  const x = config.xLabel || (config.x ?? "")
  let y = config.yLabel
  if (!y) {
    if (config.chartType === "histogram") y = "Count"
    else if (config.chartType === "scatter" || config.chartType === "box") y = config.y ?? ""
    else y = config.aggregation === "count" || !config.y ? "Count" : `${config.aggregation} of ${config.y}`
  }
  return { x, y }
}

// ---------------------------------------------------------------------------
// Computation
// ---------------------------------------------------------------------------

export interface SeriesInfo {
  /** Safe recharts dataKey (`s0`, `s1`…) — raw names may contain dots. */
  key: string
  name: string
}

export type CategoricalRow = { x: string } & Record<string, string | number | null>

export type ChartResult =
  | { kind: "categorical"; data: CategoricalRow[]; series: SeriesInfo[]; notes: string[] }
  | {
      kind: "scatter"
      series: Array<{ name: string; points: Array<{ x: number; y: number }> }>
      xIsDate: boolean
      notes: string[]
    }
  | { kind: "histogram"; data: Array<{ label: string; start: number; end: number; count: number }>; notes: string[] }
  | { kind: "box"; boxes: BoxStats[]; notes: string[] }
  | { kind: "heatmap"; columns: string[]; matrix: Record<string, Record<string, number>>; notes: string[] }
  | { kind: "empty"; reason: string }

const MISSING_LABEL = "(missing)"
const OTHER_LABEL = "Other"

export function aggregate(values: readonly number[], rowCount: number, agg: Aggregation): number | null {
  if (agg === "count") return rowCount
  if (values.length === 0) return null
  switch (agg) {
    case "sum":
      return sum(values)
    case "mean":
      return mean(values)
    case "median":
      return median(values)
    case "min":
      return values.reduce((a, b) => (b < a ? b : a), Infinity)
    case "max":
      return values.reduce((a, b) => (b > a ? b : a), -Infinity)
  }
}

function labelOf(value: unknown): string {
  return isMissing(value) ? MISSING_LABEL : String(value)
}

/** Top-N group labels by row count; everything else is folded into "Other". */
function topGroups(rows: readonly DataRow[], column: string, limit: number): { keep: Set<string>; folded: boolean } {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const key = labelOf(row[column])
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  return { keep: new Set(sorted.slice(0, limit).map(([k]) => k)), folded: sorted.length > limit }
}

interface Bucket {
  sortKey: number | string
  rows: number[]
  values: number[][]
}

function computeCategorical(rows: readonly DataRow[], config: ChartConfig, types: ColumnTypes): ChartResult {
  const x = config.x
  if (!x) return { kind: "empty", reason: "Pick a column for the X axis." }
  const notes: string[] = []
  const y = config.aggregation === "count" ? null : config.y
  const groupBy = config.chartType === "pie" ? null : config.groupBy

  let seriesNames = ["value"]
  let groupKeep: Set<string> | null = null
  if (groupBy) {
    const { keep, folded } = topGroups(rows, groupBy, MAX_GROUPS)
    groupKeep = keep
    seriesNames = [...keep]
    if (folded) {
      seriesNames.push(OTHER_LABEL)
      notes.push(
        `Only the ${MAX_GROUPS} most frequent "${groupBy}" groups are shown; the rest are combined as "${OTHER_LABEL}".`,
      )
    }
  }
  const seriesIndex = new Map(seriesNames.map((n, i) => [n, i]))
  const xIsNumber = types[x] === "number"

  const buckets = new Map<string, Bucket>()
  for (const row of rows) {
    const raw = row[x]
    const key = labelOf(raw)
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = {
        sortKey: xIsNumber && typeof raw === "number" ? raw : key,
        rows: new Array<number>(seriesNames.length).fill(0),
        values: seriesNames.map(() => []),
      }
      buckets.set(key, bucket)
    }
    let s = 0
    if (groupBy && groupKeep) {
      const g = labelOf(row[groupBy])
      s = seriesIndex.get(groupKeep.has(g) ? g : OTHER_LABEL) ?? 0
    }
    bucket.rows[s]++
    if (y) {
      const v = row[y]
      if (typeof v === "number" && Number.isFinite(v)) bucket.values[s].push(v)
    }
  }

  const series: SeriesInfo[] = seriesNames.map((name, i) => ({
    key: `s${i}`,
    name: groupBy ? name : autoLabels(config).y,
  }))
  let data: Array<CategoricalRow & { __total: number; __sort: number | string }> = [...buckets.entries()].map(
    ([label, bucket]) => {
      const row: CategoricalRow & { __total: number; __sort: number | string } = {
        x: label,
        __total: 0,
        __sort: bucket.sortKey,
      }
      series.forEach((s, i) => {
        const value = bucket.rows[i] === 0 ? null : aggregate(bucket.values[i], bucket.rows[i], config.aggregation)
        row[s.key] = value
        row.__total += value ?? 0
      })
      return row
    },
  )

  const compareX = (a: { __sort: number | string }, b: { __sort: number | string }) =>
    typeof a.__sort === "number" && typeof b.__sort === "number"
      ? a.__sort - b.__sort
      : String(a.__sort).localeCompare(String(b.__sort), undefined, { numeric: true })
  switch (config.sort) {
    case "x_asc":
      data.sort(compareX)
      break
    case "x_desc":
      data.sort((a, b) => compareX(b, a))
      break
    case "y_asc":
      data.sort((a, b) => a.__total - b.__total)
      break
    case "y_desc":
      data.sort((a, b) => b.__total - a.__total)
      break
  }

  const limit = config.limit > 0 ? Math.min(config.limit, MAX_CATEGORIES) : MAX_CATEGORIES
  if (data.length > limit) {
    const rest = data.slice(limit)
    data = data.slice(0, limit)
    if (config.chartType === "pie" && (config.aggregation === "count" || config.aggregation === "sum")) {
      const other = { x: OTHER_LABEL, __total: 0, __sort: OTHER_LABEL } as CategoricalRow & {
        __total: number
        __sort: string
      }
      other.s0 = rest.reduce((acc, r) => acc + (typeof r.s0 === "number" ? r.s0 : 0), 0)
      data.push(other)
      notes.push(`${rest.length} smaller categories are combined as "${OTHER_LABEL}".`)
    } else {
      notes.push(`Showing ${limit} of ${limit + rest.length} categories.`)
    }
  }

  return {
    kind: "categorical",
    data: data.map((row) => {
      const clean: CategoricalRow = { x: row.x }
      for (const s of series) clean[s.key] = row[s.key] ?? null
      return clean
    }),
    series,
    notes,
  }
}

/** Deterministic PRNG (mulberry32) so sampling is stable between renders. */
function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Uniform random sample of `k` indices from [0, n) without replacement, kept in order. */
export function sampleIndices(n: number, k: number, seed = 42): number[] {
  if (n <= k) return Array.from({ length: n }, (_, i) => i)
  const rand = seeded(seed)
  const pool = Array.from({ length: n }, (_, i) => i)
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rand() * (n - i))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, k).sort((a, b) => a - b)
}

function toXNumber(value: unknown, isDate: boolean): number | null {
  if (isDate) {
    if (typeof value !== "string") return null
    const t = Date.parse(value)
    return Number.isNaN(t) ? null : t
  }
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function computeScatter(rows: readonly DataRow[], config: ChartConfig, types: ColumnTypes): ChartResult {
  const { x, y, groupBy } = config
  if (!x || !y) return { kind: "empty", reason: "Scatter plots need numeric X and Y columns." }
  const xIsDate = types[x] === "date"
  const valid: Array<{ x: number; y: number; row: DataRow }> = []
  for (const row of rows) {
    const xv = toXNumber(row[x], xIsDate)
    const yv = row[y]
    if (xv !== null && typeof yv === "number" && Number.isFinite(yv)) valid.push({ x: xv, y: yv, row })
  }
  if (valid.length === 0) return { kind: "empty", reason: "No rows have both X and Y values." }
  const notes: string[] = []
  const picked = sampleIndices(valid.length, MAX_SCATTER_POINTS).map((i) => valid[i])
  if (picked.length < valid.length)
    notes.push(
      `Showing a random sample of ${picked.length.toLocaleString()} of ${valid.length.toLocaleString()} points.`,
    )

  if (!groupBy)
    return {
      kind: "scatter",
      series: [{ name: y, points: picked.map(({ x: px, y: py }) => ({ x: px, y: py })) }],
      xIsDate,
      notes,
    }
  const { keep, folded } = topGroups(rows, groupBy, MAX_GROUPS)
  const names = [...keep, ...(folded ? [OTHER_LABEL] : [])]
  const buckets = new Map(names.map((n) => [n, [] as Array<{ x: number; y: number }>]))
  for (const p of picked) {
    const g = labelOf(p.row[groupBy])
    buckets.get(keep.has(g) ? g : OTHER_LABEL)?.push({ x: p.x, y: p.y })
  }
  if (folded) notes.push(`Only the ${MAX_GROUPS} most frequent "${groupBy}" groups are coloured individually.`)
  return { kind: "scatter", series: names.map((name) => ({ name, points: buckets.get(name) ?? [] })), xIsDate, notes }
}

function computeHistogram(rows: readonly DataRow[], config: ChartConfig): ChartResult {
  if (!config.x) return { kind: "empty", reason: "Pick a numeric column." }
  const values: number[] = []
  for (const row of rows) {
    const v = row[config.x]
    if (typeof v === "number" && Number.isFinite(v)) values.push(v)
  }
  if (values.length === 0) return { kind: "empty", reason: `"${config.x}" has no numeric values.` }
  const bins = histogram(values, config.bins)
  const digits = Math.abs(bins[0].end - bins[0].start) < 1 ? 3 : 1
  return {
    kind: "histogram",
    data: bins.map((b) => ({ ...b, label: `${Number(b.start.toFixed(digits))}–${Number(b.end.toFixed(digits))}` })),
    notes:
      values.length < rows.length
        ? [`${(rows.length - values.length).toLocaleString()} rows without a value are excluded.`]
        : [],
  }
}

function computeBoxes(rows: readonly DataRow[], config: ChartConfig): ChartResult {
  const { y, x } = config
  if (!y) return { kind: "empty", reason: "Box plots need a numeric value column." }
  const groups = new Map<string, number[]>()
  for (const row of rows) {
    const v = row[y]
    if (typeof v !== "number" || !Number.isFinite(v)) continue
    const key = x ? labelOf(row[x]) : y
    let list = groups.get(key)
    if (!list) groups.set(key, (list = []))
    list.push(v)
  }
  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)
  const notes = sorted.length > MAX_BOXES ? [`Showing the ${MAX_BOXES} largest of ${sorted.length} groups.`] : []
  const boxes = sorted
    .slice(0, MAX_BOXES)
    .map(([label, values]) => computeBoxStats(label, values))
    .filter((b): b is BoxStats => b !== null)
  if (boxes.length === 0) return { kind: "empty", reason: `"${y}" has no numeric values.` }
  return { kind: "box", boxes, notes }
}

function computeHeatmap(rows: readonly DataRow[], columns: readonly string[], types: ColumnTypes): ChartResult {
  const numeric = columns.filter((c) => types[c] === "number")
  if (numeric.length < 2) return { kind: "empty", reason: "A correlation heatmap needs at least two numeric columns." }
  const shown = numeric.slice(0, MAX_HEATMAP_COLUMNS)
  const sample = sampleIndices(rows.length, HEATMAP_SAMPLE_ROWS).map((i) => rows[i])
  const notes: string[] = []
  if (shown.length < numeric.length)
    notes.push(`Showing the first ${shown.length} of ${numeric.length} numeric columns.`)
  if (sample.length < rows.length)
    notes.push(`Correlations estimated from a random sample of ${sample.length.toLocaleString()} rows.`)
  return { kind: "heatmap", columns: shown, matrix: correlationMatrix(sample, shown), notes }
}

export function computeChart(
  rows: readonly DataRow[],
  config: ChartConfig,
  columns: readonly string[],
  types: ColumnTypes,
): ChartResult {
  if (rows.length === 0) return { kind: "empty", reason: "There is no data to plot." }
  switch (config.chartType) {
    case "bar":
    case "line":
    case "area":
    case "pie":
      return computeCategorical(rows, config, types)
    case "scatter":
      return computeScatter(rows, config, types)
    case "histogram":
      return computeHistogram(rows, config)
    case "box":
      return computeBoxes(rows, config)
    case "heatmap":
      return computeHeatmap(rows, columns, types)
  }
}

/** Flatten a chart result into a table (for CSV export). */
export function chartTable(
  result: ChartResult,
  config: ChartConfig,
): { headers: string[]; rows: Array<Array<string | number | null>> } {
  const labels = autoLabels(config)
  switch (result.kind) {
    case "categorical":
      return {
        headers: [labels.x || "x", ...result.series.map((s) => s.name)],
        rows: result.data.map((row) => [row.x, ...result.series.map((s) => row[s.key] ?? null)]),
      }
    case "scatter":
      return {
        headers: [labels.x || "x", labels.y || "y", ...(config.groupBy ? [config.groupBy] : [])],
        rows: result.series.flatMap((s) =>
          s.points.map((p) => [
            result.xIsDate ? new Date(p.x).toISOString() : p.x,
            p.y,
            ...(config.groupBy ? [s.name] : []),
          ]),
        ),
      }
    case "histogram":
      return { headers: ["bin_start", "bin_end", "count"], rows: result.data.map((b) => [b.start, b.end, b.count]) }
    case "box":
      return {
        headers: ["group", "count", "mean", "lower_whisker", "q1", "median", "q3", "upper_whisker", "outliers"],
        rows: result.boxes.map((b) => [
          b.label,
          b.count,
          b.mean,
          b.lowerWhisker,
          b.q1,
          b.median,
          b.q3,
          b.upperWhisker,
          b.outlierCount,
        ]),
      }
    case "heatmap":
      return {
        headers: ["column", ...result.columns],
        rows: result.columns.map((a) => [a, ...result.columns.map((b) => result.matrix[a]?.[b] ?? null)]),
      }
    case "empty":
      return { headers: [], rows: [] }
  }
}
