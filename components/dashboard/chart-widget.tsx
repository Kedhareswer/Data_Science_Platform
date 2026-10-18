"use client"

import { memo, type ReactNode, useMemo } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { ChartWidget } from "@/lib/dashboard"
import {
  AGGREGATION_LABELS,
  formatTick,
  formatValue,
  groupAggregate,
  OTHER_LABEL,
  scatterPoints,
} from "@/lib/dashboard-data"
import type { ColumnTypes, DataRow } from "@/lib/data/types"
import { WidgetMessage } from "@/components/dashboard/widget-message"

export const CHART_COLORS = [1, 2, 3, 4, 5].map((i) => `var(--color-chart-${i})`)

const AXIS_TICK = { fill: "var(--color-muted-foreground)", fontSize: 12 }
const TOOLTIP_STYLE = {
  contentStyle: {
    background: "var(--color-popover)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    color: "var(--color-popover-foreground)",
  },
  labelStyle: { color: "var(--color-popover-foreground)", fontWeight: 700 },
  itemStyle: { color: "var(--color-popover-foreground)" },
} as const

function tooltipValue(value: unknown): string {
  return typeof value === "number" ? formatValue(value) : String(value ?? "—")
}

interface ChartWidgetViewProps {
  widget: ChartWidget
  rows: readonly DataRow[]
  columnTypes: ColumnTypes
}

function ChartWidgetViewImpl({ widget, rows, columnTypes }: ChartWidgetViewProps) {
  const { chart, x, y, aggregation, limit, bucket } = widget
  const missing = [x, y].filter((c): c is string => typeof c === "string" && c !== "" && !(c in columnTypes))

  const isScatter = chart === "scatter"
  const valid = Boolean(x) && missing.length === 0 && (!isScatter || Boolean(y))

  const grouped = useMemo(() => {
    if (!valid || isScatter || !x) return null
    const defaultLimit = chart === "pie" ? 6 : 10
    return groupAggregate(rows, x, y, aggregation, limit ?? defaultLimit, { xType: columnTypes[x], bucket })
  }, [valid, isScatter, rows, x, y, aggregation, limit, chart, columnTypes, bucket])

  const scatter = useMemo(() => {
    if (!valid || !isScatter || !x || !y) return null
    return scatterPoints(rows, x, y)
  }, [valid, isScatter, rows, x, y])

  if (!x) return <WidgetMessage>Pick a column for the X axis in the widget settings.</WidgetMessage>
  if (missing.length > 0) {
    return <WidgetMessage>Column{missing.length > 1 ? "s" : ""} {missing.map((c) => `“${c}”`).join(", ")} not in the current data.</WidgetMessage>
  }
  if (isScatter && !y) return <WidgetMessage>A scatter plot needs a Y column.</WidgetMessage>

  const valueLabel = y ? `${AGGREGATION_LABELS[aggregation]} of ${y}` : "Rows"

  if (scatter) {
    if (scatter.points.length === 0) return <WidgetMessage>No numeric pairs to plot.</WidgetMessage>
    return (
      <figure className="flex h-full flex-col" aria-label={`Scatter plot of ${y} against ${x}`}>
        <div className="h-64 min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" />
              <XAxis type="number" dataKey="x" name={x} tick={AXIS_TICK} tickFormatter={formatTick} stroke="var(--color-border)" />
              <YAxis type="number" dataKey="y" name={y} tick={AXIS_TICK} tickFormatter={formatTick} width={48} stroke="var(--color-border)" />
              <Tooltip {...TOOLTIP_STYLE} formatter={tooltipValue} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={scatter.points} fill={CHART_COLORS[1]} fillOpacity={0.6} isAnimationActive={false} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        {scatter.total > scatter.points.length && (
          <figcaption className="pt-1 text-xs text-muted-foreground">
            Showing a sample of {scatter.points.length.toLocaleString()} of {scatter.total.toLocaleString()} points.
          </figcaption>
        )}
      </figure>
    )
  }

  if (!grouped || grouped.points.length === 0) return <WidgetMessage>No data to chart for the current filters.</WidgetMessage>

  const data = grouped.points
  const summary = data
    .slice(0, 5)
    .map((p) => `${p.label}: ${formatValue(p.value)}`)
    .join("; ")
  const caption =
    grouped.otherCount > 0
      ? `${grouped.otherCount.toLocaleString()} smaller categories grouped into “${OTHER_LABEL}”.`
      : grouped.bucket
        ? `Grouped by ${grouped.bucket}.`
        : null

  let body: ReactNode
  if (chart === "pie") {
    const slices = data.filter((p) => p.value !== null && p.value > 0)
    body = (
      <PieChart>
        <Pie
          data={slices}
          dataKey="value"
          nameKey="label"
          innerRadius="45%"
          outerRadius="80%"
          paddingAngle={2}
          stroke="var(--color-card)"
          isAnimationActive={false}
        >
          {slices.map((p, i) => (
            <Cell key={p.label} fill={p.label === OTHER_LABEL ? "var(--color-muted-foreground)" : CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip {...TOOLTIP_STYLE} formatter={tooltipValue} />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--color-muted-foreground)" }} />
      </PieChart>
    )
  } else if (chart === "bar") {
    const horizontal = grouped.kind === "category" && data.length > 6
    body = horizontal ? (
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" horizontal={false} />
        <XAxis type="number" tick={AXIS_TICK} tickFormatter={formatTick} stroke="var(--color-border)" />
        <YAxis type="category" dataKey="label" tick={AXIS_TICK} width={96} interval={0} stroke="var(--color-border)" />
        <Tooltip {...TOOLTIP_STYLE} formatter={tooltipValue} cursor={{ fill: "var(--color-muted)", opacity: 0.5 }} />
        <Bar dataKey="value" name={valueLabel} radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {data.map((p) => (
            <Cell key={p.label} fill={p.label === OTHER_LABEL ? "var(--color-muted-foreground)" : CHART_COLORS[0]} />
          ))}
        </Bar>
      </BarChart>
    ) : (
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} stroke="var(--color-border)" minTickGap={8} />
        <YAxis tick={AXIS_TICK} tickFormatter={formatTick} width={48} stroke="var(--color-border)" />
        <Tooltip {...TOOLTIP_STYLE} formatter={tooltipValue} cursor={{ fill: "var(--color-muted)", opacity: 0.5 }} />
        <Bar dataKey="value" name={valueLabel} radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((p) => (
            <Cell key={p.label} fill={p.label === OTHER_LABEL ? "var(--color-muted-foreground)" : CHART_COLORS[0]} />
          ))}
        </Bar>
      </BarChart>
    )
  } else if (chart === "area") {
    body = (
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} stroke="var(--color-border)" minTickGap={16} />
        <YAxis tick={AXIS_TICK} tickFormatter={formatTick} width={48} stroke="var(--color-border)" />
        <Tooltip {...TOOLTIP_STYLE} formatter={tooltipValue} />
        <Area
          type="monotone"
          dataKey="value"
          name={valueLabel}
          stroke={CHART_COLORS[1]}
          fill={CHART_COLORS[1]}
          fillOpacity={0.25}
          strokeWidth={2}
          connectNulls
          isAnimationActive={false}
        />
      </AreaChart>
    )
  } else {
    body = (
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} stroke="var(--color-border)" minTickGap={16} />
        <YAxis tick={AXIS_TICK} tickFormatter={formatTick} width={48} stroke="var(--color-border)" />
        <Tooltip {...TOOLTIP_STYLE} formatter={tooltipValue} />
        <Line
          type="monotone"
          dataKey="value"
          name={valueLabel}
          stroke={CHART_COLORS[0]}
          strokeWidth={2}
          dot={data.length <= 40}
          connectNulls
          isAnimationActive={false}
        />
      </LineChart>
    )
  }

  return (
    <figure className="flex h-full flex-col" aria-label={`${chart} chart: ${valueLabel} by ${x}`}>
      <div className="h-64 min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          {body}
        </ResponsiveContainer>
      </div>
      <figcaption className="pt-1 text-xs text-muted-foreground">
        <span className="sr-only">{summary}. </span>
        {caption}
      </figcaption>
    </figure>
  )
}

export const ChartWidgetView = memo(ChartWidgetViewImpl)
