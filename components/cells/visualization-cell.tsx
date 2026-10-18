"use client"

import { useDeferredValue, useMemo, useRef, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label as ChartLabel,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  type PieLabelRenderProps,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  AreaChart as AreaIcon,
  BarChart3,
  BoxSelect,
  Download,
  Grid3x3,
  ImageDown,
  LineChart as LineIcon,
  PieChart as PieIcon,
  RotateCcw,
  ScatterChart as ScatterIcon,
  BarChartBig,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import type { CellProps } from "@/components/cells/types"
import { BoxPlot } from "@/components/charts/box-plot"
import {
  AGGREGATIONS,
  type Aggregation,
  autoLabels,
  type ChartConfig,
  type ChartResult,
  type ChartType,
  chartTable,
  type ColumnRole,
  columnsForRole,
  computeChart,
  isRoleOptional,
  resolveConfig,
  ROLE_TYPES,
  SORT_ORDERS,
  type SortOrder,
  usesAggregation,
  usesSort,
  usesStacking,
} from "@/components/charts/chart-data"
import { CorrelationHeatmap } from "@/components/charts/correlation-heatmap"
import { downloadCsv, exportChartPng, type LegendEntry } from "@/components/charts/export"
import {
  AXIS_LABEL_STYLE,
  AXIS_LINE,
  AXIS_TICK,
  BAR_CURSOR,
  formatNumber,
  GRID_STROKE,
  LINE_CURSOR,
  seriesColor,
  TOOLTIP_CONTENT_STYLE,
  TOOLTIP_ITEM_STYLE,
  TOOLTIP_LABEL_STYLE,
  truncateLabel,
} from "@/components/charts/theme"
import { DataUploadPrompt } from "@/components/data-upload-prompt"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useCellContent, useData } from "@/lib/data-context"
import type { ColumnTypes } from "@/lib/data/types"
import { baseName } from "@/lib/notebook"
import { cn } from "@/lib/utils"

const CHART_HEIGHT = 380
const NONE = "__none__"

const CHART_OPTIONS: Array<{ type: ChartType; label: string; icon: LucideIcon }> = [
  { type: "bar", label: "Bar", icon: BarChart3 },
  { type: "line", label: "Line", icon: LineIcon },
  { type: "area", label: "Area", icon: AreaIcon },
  { type: "scatter", label: "Scatter", icon: ScatterIcon },
  { type: "pie", label: "Pie", icon: PieIcon },
  { type: "histogram", label: "Histogram", icon: BarChartBig },
  { type: "box", label: "Box plot", icon: BoxSelect },
  { type: "heatmap", label: "Correlations", icon: Grid3x3 },
]

const ROLE_LABEL: Record<ChartType, Record<ColumnRole, string>> = {
  bar: { x: "X axis (categories)", y: "Value", groupBy: "Colour by" },
  line: { x: "X axis", y: "Value", groupBy: "Colour by" },
  area: { x: "X axis", y: "Value", groupBy: "Colour by" },
  pie: { x: "Slices", y: "Value", groupBy: "Colour by" },
  scatter: { x: "X axis", y: "Y axis", groupBy: "Colour by" },
  histogram: { x: "Column", y: "", groupBy: "" },
  box: { x: "Group by", y: "Value", groupBy: "" },
  heatmap: { x: "", y: "", groupBy: "" },
}

export function VisualizationCell({ cellId }: CellProps) {
  const { processedData, columns, columnTypes, fileName } = useData()
  const [stored, setStored] = useCellContent<Partial<ChartConfig> | null>(cellId, null)
  const config = useMemo(() => resolveConfig(stored, columns, columnTypes), [stored, columns, columnTypes])
  const deferredConfig = useDeferredValue(config)
  const result = useMemo(
    () => computeChart(processedData, deferredConfig, columns, columnTypes),
    [processedData, deferredConfig, columns, columnTypes],
  )
  const chartRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  if (processedData.length === 0) {
    return <DataUploadPrompt title="Nothing to visualize yet" description="Load a dataset to start building charts." />
  }

  const update = (patch: Partial<ChartConfig>) => setStored({ ...config, ...patch })
  const labels = autoLabels(deferredConfig)
  const fileStem = `${baseName(fileName)}_${config.title ? baseName(config.title) : config.chartType}`

  const exportPng = async () => {
    if (!chartRef.current) return
    setExporting(true)
    try {
      await exportChartPng(chartRef.current, fileStem, { title: config.title || undefined, legend: legendEntries(result) })
      toast.success("Chart exported as PNG")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not export chart")
    } finally {
      setExporting(false)
    }
  }

  const exportCsv = () => {
    const table = chartTable(result, deferredConfig)
    if (table.rows.length === 0) {
      toast.error("Nothing to export")
      return
    }
    downloadCsv(table.headers, table.rows, fileStem)
    toast.success(`Exported ${table.rows.length.toLocaleString()} rows as CSV`)
  }

  return (
    <div className="space-y-4 font-handwritten">
      <ChartTypePicker value={config.chartType} onChange={(chartType) => update({ chartType })} />
      <ChartControls config={config} columns={columns} columnTypes={columnTypes} onChange={update} onReset={() => setStored(null)} />

      <div className="sketch-card p-3">
        {config.title && <h3 className="mb-2 text-center text-lg font-handwritten-bold">{config.title}</h3>}
        <div ref={chartRef} className={cn("transition-opacity", deferredConfig !== config && "opacity-60")}>
          <ChartView result={result} config={deferredConfig} xLabel={labels.x} yLabel={labels.y} />
        </div>
        {result.kind !== "empty" && result.notes.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            {result.notes.map((note) => (
              <li key={note}>ℹ {note}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={result.kind === "empty"}>
          <Download aria-hidden="true" /> Data as CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => void exportPng()} disabled={result.kind === "empty" || exporting}>
          <ImageDown aria-hidden="true" /> {exporting ? "Exporting…" : "Chart as PNG"}
        </Button>
      </div>
    </div>
  )
}

function legendEntries(result: ChartResult): LegendEntry[] {
  if (result.kind === "categorical" && result.series.length > 1) return result.series.map((s, i) => ({ label: s.name, color: seriesColor(i) }))
  if (result.kind === "scatter" && result.series.length > 1) return result.series.map((s, i) => ({ label: s.name, color: seriesColor(i) }))
  return []
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

function ChartTypePicker({ value, onChange }: { value: ChartType; onChange: (type: ChartType) => void }) {
  return (
    <div role="group" aria-label="Chart type" className="flex flex-wrap gap-1.5">
      {CHART_OPTIONS.map(({ type, label, icon: Icon }) => (
        <Button
          key={type}
          type="button"
          size="sm"
          variant={value === type ? "default" : "outline"}
          aria-pressed={value === type}
          onClick={() => onChange(type)}
        >
          <Icon aria-hidden="true" /> {label}
        </Button>
      ))}
    </div>
  )
}

interface ChartControlsProps {
  config: ChartConfig
  columns: string[]
  columnTypes: ColumnTypes
  onChange: (patch: Partial<ChartConfig>) => void
  onReset: () => void
}

function ChartControls({ config, columns, columnTypes, onChange, onReset }: ChartControlsProps) {
  const { chartType } = config
  const roles = (["x", "y", "groupBy"] as const).filter((role) => ROLE_TYPES[chartType][role] !== null && ROLE_LABEL[chartType][role] !== "")
  const hasAgg = usesAggregation(chartType)

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {roles.map((role) => {
        // Value column is only meaningful when aggregating something other than counts.
        if (role === "y" && hasAgg && config.aggregation === "count") return null
        const label = ROLE_LABEL[chartType][role]
        return (
          <ColumnSelect
            key={role}
            id={`viz-${role}`}
            label={label}
            value={config[role]}
            options={columnsForRole(chartType, role, columns, columnTypes)}
            columnTypes={columnTypes}
            optional={isRoleOptional(chartType, role, config.aggregation)}
            onChange={(value) => onChange({ [role]: value })}
          />
        )
      })}

      {hasAgg && (
        <Field id="viz-agg" label="Aggregation">
          <Select value={config.aggregation} onValueChange={(v) => onChange({ aggregation: v as Aggregation })}>
            <SelectTrigger id="viz-agg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AGGREGATIONS.map((a) => (
                <SelectItem key={a} value={a} disabled={a !== "count" && columnsForRole(chartType, "y", columns, columnTypes).length === 0}>
                  {a === "count" ? "Count rows" : a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {usesSort(chartType) && (
        <>
          <Field id="viz-sort" label="Sort">
            <Select value={config.sort} onValueChange={(v) => onChange({ sort: v as SortOrder })}>
              <SelectTrigger id="viz-sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORT_ORDERS) as SortOrder[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {SORT_ORDERS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="viz-limit" label="Top N (0 = all)">
            <Input
              id="viz-limit"
              type="number"
              min={0}
              max={500}
              value={config.limit}
              onChange={(e) => onChange({ limit: Math.max(0, Number(e.target.value) || 0) })}
            />
          </Field>
        </>
      )}

      {chartType === "histogram" && (
        <Field id="viz-bins" label="Bins">
          <Input
            id="viz-bins"
            type="number"
            min={2}
            max={100}
            value={config.bins}
            onChange={(e) => onChange({ bins: Math.min(100, Math.max(2, Number(e.target.value) || 2)) })}
          />
        </Field>
      )}

      {usesStacking(chartType) && config.groupBy && (
        <div className="flex items-end gap-2 pb-2">
          <Switch id="viz-stacked" checked={config.stacked} onCheckedChange={(stacked) => onChange({ stacked })} />
          <Label htmlFor="viz-stacked">Stacked</Label>
        </div>
      )}

      <Field id="viz-title" label="Title">
        <Input id="viz-title" value={config.title} placeholder="Untitled chart" onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      {chartType !== "pie" && chartType !== "heatmap" && (
        <>
          <Field id="viz-xlabel" label="X axis label">
            <Input id="viz-xlabel" value={config.xLabel} placeholder={config.x ?? "auto"} onChange={(e) => onChange({ xLabel: e.target.value })} />
          </Field>
          <Field id="viz-ylabel" label="Y axis label">
            <Input
              id="viz-ylabel"
              value={config.yLabel}
              placeholder={autoLabels({ ...config, yLabel: "" }).y || "auto"}
              onChange={(e) => onChange({ yLabel: e.target.value })}
            />
          </Field>
        </>
      )}
      <div className="flex items-end">
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw aria-hidden="true" /> Reset chart
        </Button>
      </div>
    </div>
  )
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

interface ColumnSelectProps {
  id: string
  label: string
  value: string | null
  options: string[]
  columnTypes: ColumnTypes
  optional: boolean
  onChange: (value: string | null) => void
}

function ColumnSelect({ id, label, value, options, columnTypes, optional, onChange }: ColumnSelectProps) {
  return (
    <Field id={id} label={label}>
      <Select value={value ?? NONE} onValueChange={(v) => onChange(v === NONE ? null : v)} disabled={options.length === 0}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="No suitable columns" />
        </SelectTrigger>
        <SelectContent>
          {optional && <SelectItem value={NONE}>None</SelectItem>}
          {options.map((c) => (
            <SelectItem key={c} value={c}>
              {c} <span className="text-xs text-muted-foreground">· {columnTypes[c]}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

// ---------------------------------------------------------------------------
// Chart rendering
// ---------------------------------------------------------------------------

interface ChartViewProps {
  result: ChartResult
  config: ChartConfig
  xLabel: string
  yLabel: string
}

const tooltipProps = {
  contentStyle: TOOLTIP_CONTENT_STYLE,
  labelStyle: TOOLTIP_LABEL_STYLE,
  itemStyle: TOOLTIP_ITEM_STYLE,
  formatter: (value: unknown) => formatNumber(value),
}

const legendProps = { wrapperStyle: { color: "var(--color-foreground)", fontSize: 13, paddingTop: 8 } }

function ChartView({ result, config, xLabel, yLabel }: ChartViewProps) {
  switch (result.kind) {
    case "empty":
      return <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">{result.reason}</p>
    case "categorical":
      return config.chartType === "pie" ? (
        <PieView result={result} />
      ) : (
        <CategoricalView result={result} config={config} xLabel={xLabel} yLabel={yLabel} />
      )
    case "scatter":
      return <ScatterView result={result} xLabel={xLabel} yLabel={yLabel} />
    case "histogram":
      return <HistogramView result={result} xLabel={xLabel} yLabel={yLabel} />
    case "box":
      return <BoxPlot boxes={result.boxes} xLabel={config.x ? xLabel : undefined} yLabel={yLabel} height={CHART_HEIGHT} />
    case "heatmap":
      return <CorrelationHeatmap columns={result.columns} matrix={result.matrix} label="Correlation heatmap of numeric columns" />
  }
}

function XAxisLabel({ value }: { value: string }) {
  return <ChartLabel value={value} position="insideBottom" offset={-4} style={AXIS_LABEL_STYLE} />
}

function YAxisLabel({ value }: { value: string }) {
  return <ChartLabel value={value} angle={-90} position="insideLeft" style={{ ...AXIS_LABEL_STYLE, textAnchor: "middle" }} />
}

function CategoricalView({
  result,
  config,
  xLabel,
  yLabel,
}: {
  result: Extract<ChartResult, { kind: "categorical" }>
  config: ChartConfig
  xLabel: string
  yLabel: string
}) {
  const many = result.data.length > 8
  const showLegend = result.series.length > 1
  const margin = { top: 8, right: 16, bottom: many ? 48 : 24, left: 16 }
  const xAxis = (
    <XAxis
      dataKey="x"
      tick={AXIS_TICK}
      axisLine={AXIS_LINE}
      tickLine={AXIS_LINE}
      interval="preserveStartEnd"
      angle={many ? -35 : 0}
      textAnchor={many ? "end" : "middle"}
      height={many ? 64 : 36}
      tickFormatter={(v: string) => truncateLabel(v)}
    >
      {xLabel && !many && <XAxisLabel value={xLabel} />}
    </XAxis>
  )
  const yAxis = (
    <YAxis tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={AXIS_LINE} tickFormatter={(v: number) => formatNumber(v)} width={64}>
      {yLabel && <YAxisLabel value={yLabel} />}
    </YAxis>
  )
  const grid = <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
  const stackId = config.stacked && result.series.length > 1 ? "stack" : undefined

  return (
    <div style={{ height: CHART_HEIGHT }} role="img" aria-label={`${config.chartType} chart of ${yLabel} by ${xLabel}`}>
      <ResponsiveContainer width="100%" height="100%">
        {config.chartType === "line" ? (
          <LineChart data={result.data} margin={margin}>
            {grid}
            {xAxis}
            {yAxis}
            <Tooltip cursor={LINE_CURSOR} {...tooltipProps} />
            {showLegend && <Legend {...legendProps} />}
            {result.series.map((s, i) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={seriesColor(i)}
                strokeWidth={2}
                dot={result.data.length <= 60}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        ) : config.chartType === "area" ? (
          <AreaChart data={result.data} margin={margin}>
            {grid}
            {xAxis}
            {yAxis}
            <Tooltip cursor={LINE_CURSOR} {...tooltipProps} />
            {showLegend && <Legend {...legendProps} />}
            {result.series.map((s, i) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stackId={stackId}
                stroke={seriesColor(i)}
                fill={seriesColor(i)}
                fillOpacity={0.3}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        ) : (
          <BarChart data={result.data} margin={margin}>
            {grid}
            {xAxis}
            {yAxis}
            <Tooltip cursor={BAR_CURSOR} {...tooltipProps} />
            {showLegend && <Legend {...legendProps} />}
            {result.series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                stackId={stackId}
                fill={seriesColor(i)}
                radius={stackId ? 0 : [4, 4, 0, 0]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

function PieView({ result }: { result: Extract<ChartResult, { kind: "categorical" }> }) {
  const series = result.series[0]
  const data = result.data.filter((d) => typeof d[series.key] === "number" && (d[series.key] as number) > 0)
  if (data.length === 0) return <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">No positive values to show.</p>
  const renderLabel = ({ name, percent }: PieLabelRenderProps) => `${truncateLabel(name, 12)} ${((percent ?? 0) * 100).toFixed(0)}%`
  return (
    <div style={{ height: CHART_HEIGHT }} role="img" aria-label={`Pie chart of ${series.name}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip {...tooltipProps} />
          <Legend {...legendProps} />
          <Pie
            data={data}
            dataKey={series.key}
            nameKey="x"
            name={series.name}
            outerRadius="75%"
            innerRadius="35%"
            paddingAngle={1}
            label={renderLabel}
            labelLine={false}
            stroke="var(--color-card)"
            isAnimationActive={false}
          >
            {data.map((d, i) => (
              <Cell key={d.x} fill={seriesColor(i)} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

function ScatterView({ result, xLabel, yLabel }: { result: Extract<ChartResult, { kind: "scatter" }>; xLabel: string; yLabel: string }) {
  const formatX = (v: number) => (result.xIsDate ? new Date(v).toLocaleDateString() : formatNumber(v))
  return (
    <div style={{ height: CHART_HEIGHT }} role="img" aria-label={`Scatter plot of ${yLabel} against ${xLabel}`}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis
            type="number"
            dataKey="x"
            name={xLabel}
            domain={["auto", "auto"]}
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={AXIS_LINE}
            tickFormatter={formatX}
            height={40}
          >
            {xLabel && <XAxisLabel value={xLabel} />}
          </XAxis>
          <YAxis
            type="number"
            dataKey="y"
            name={yLabel}
            domain={["auto", "auto"]}
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={AXIS_LINE}
            tickFormatter={(v: number) => formatNumber(v)}
            width={64}
          >
            {yLabel && <YAxisLabel value={yLabel} />}
          </YAxis>
          <Tooltip
            cursor={{ strokeDasharray: "3 3", stroke: "var(--color-border)" }}
            contentStyle={TOOLTIP_CONTENT_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            formatter={(value: unknown, name: unknown) =>
              typeof value === "number" && name === xLabel ? formatX(value) : formatNumber(value)
            }
          />
          {result.series.length > 1 && <Legend {...legendProps} />}
          {result.series.map((s, i) => (
            <Scatter key={s.name} name={s.name} data={s.points} fill={seriesColor(i)} fillOpacity={0.7} isAnimationActive={false} />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

function HistogramView({ result, xLabel, yLabel }: { result: Extract<ChartResult, { kind: "histogram" }>; xLabel: string; yLabel: string }) {
  return (
    <div style={{ height: CHART_HEIGHT }} role="img" aria-label={`Histogram of ${xLabel}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={result.data} margin={{ top: 8, right: 16, bottom: 24, left: 16 }} barCategoryGap={1}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={AXIS_LINE} interval="preserveStartEnd" height={40}>
            {xLabel && <XAxisLabel value={xLabel} />}
          </XAxis>
          <YAxis tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={AXIS_LINE} allowDecimals={false} width={64}>
            {yLabel && <YAxisLabel value={yLabel} />}
          </YAxis>
          <Tooltip cursor={BAR_CURSOR} {...tooltipProps} />
          <Bar dataKey="count" name="Count" fill={seriesColor(1)} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
