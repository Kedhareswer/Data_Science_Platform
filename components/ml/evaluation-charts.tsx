"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { prCurve, rocCurve } from "@/lib/ml/metrics"
import type { TrainedModel } from "@/lib/ml/types"
import { AXIS_TICK, GRID_STROKE, TOOLTIP_ITEM_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_STYLE } from "./chart-theme"

const MAX_POINTS = 800

function thin<T>(points: readonly T[], max = MAX_POINTS): T[] {
  if (points.length <= max) return [...points]
  const step = points.length / max
  const out: T[] = []
  for (let i = 0; i < max; i++) out.push(points[Math.floor(i * step)])
  out.push(points[points.length - 1])
  return out
}

function extent(values: readonly number[]): [number, number] {
  let lo = Infinity
  let hi = -Infinity
  for (const v of values) {
    if (v < lo) lo = v
    if (v > hi) hi = v
  }
  return [lo, hi]
}

const fmt = (v: unknown) => (typeof v === "number" ? v.toFixed(3) : String(v))

function ChartFrame({ label, children, caption }: { label: string; children: React.ReactElement; caption?: string }) {
  return (
    <figure className="space-y-1">
      <div className="h-64" role="img" aria-label={label}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
      {caption && <figcaption className="text-muted-foreground text-xs">{caption}</figcaption>}
    </figure>
  )
}

/** Binary labels (positive = second class) and scores for curve charts, when available. */
export function binaryScores(model: TrainedModel): { yTrue: number[]; scores: number[]; positive: string } | null {
  const scores = model.evaluation.scores
  if (model.task !== "classification" || !scores || model.classes?.length !== 2) return null
  const positive = String(model.classes[1])
  const n = Math.min(scores.length, model.evaluation.actual.length)
  if (n === 0) return null
  return {
    yTrue: model.evaluation.actual.slice(0, n).map((v) => (String(v) === positive ? 1 : 0)),
    scores: scores.slice(0, n),
    positive,
  }
}

export function CurveCharts({ model }: { model: TrainedModel }) {
  const data = binaryScores(model)
  if (!data)
    return (
      <p className="text-muted-foreground text-sm">
        ROC and PR curves need a binary classifier with probability scores.
      </p>
    )
  const roc = thin(rocCurve(data.yTrue, data.scores).points)
  const pr = thin(prCurve(data.yTrue, data.scores).points)
  const auc = model.metrics.rocAuc
  const base = data.yTrue.filter((y) => y === 1).length / data.yTrue.length

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartFrame
        label={`ROC curve${auc !== undefined ? `, AUC ${auc.toFixed(3)}` : ""}`}
        caption={`ROC — positive class “${data.positive}”${auc !== undefined ? ` · AUC ${auc.toFixed(3)}` : ""}. Dashed line = random guessing.`}
      >
        <LineChart data={roc} margin={{ top: 8, right: 16, bottom: 20, left: 0 }}>
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, 1]}
            tick={AXIS_TICK}
            tickFormatter={(v: number) => v.toFixed(1)}
            label={{
              value: "False positive rate",
              position: "insideBottom",
              offset: -12,
              fill: "var(--color-muted-foreground)",
              fontSize: 12,
            }}
          />
          <YAxis type="number" domain={[0, 1]} tick={AXIS_TICK} tickFormatter={(v: number) => v.toFixed(1)} />
          <ReferenceLine
            segment={[
              { x: 0, y: 0 },
              { x: 1, y: 1 },
            ]}
            stroke="var(--color-muted-foreground)"
            strokeDasharray="4 4"
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            labelFormatter={(v) => `FPR ${fmt(v)}`}
            formatter={(v) => [fmt(v), "TPR"]}
          />
          <Line
            type="stepAfter"
            dataKey="y"
            stroke="var(--color-chart-1)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartFrame>
      <ChartFrame
        label="Precision–recall curve"
        caption={`Precision–recall. Dashed line = positive rate (${(base * 100).toFixed(1)}%).`}
      >
        <LineChart data={pr} margin={{ top: 8, right: 16, bottom: 20, left: 0 }}>
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, 1]}
            tick={AXIS_TICK}
            tickFormatter={(v: number) => v.toFixed(1)}
            label={{
              value: "Recall",
              position: "insideBottom",
              offset: -12,
              fill: "var(--color-muted-foreground)",
              fontSize: 12,
            }}
          />
          <YAxis type="number" domain={[0, 1]} tick={AXIS_TICK} tickFormatter={(v: number) => v.toFixed(1)} />
          <ReferenceLine y={base} stroke="var(--color-muted-foreground)" strokeDasharray="4 4" />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            labelFormatter={(v) => `Recall ${fmt(v)}`}
            formatter={(v) => [fmt(v), "Precision"]}
          />
          <Line
            type="linear"
            dataKey="y"
            stroke="var(--color-chart-2)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartFrame>
    </div>
  )
}

function regressionPairs(model: TrainedModel): Array<{ actual: number; predicted: number }> {
  const { actual, predicted } = model.evaluation
  const out: Array<{ actual: number; predicted: number }> = []
  for (let i = 0; i < Math.min(actual.length, predicted.length); i++) {
    const a = actual[i]
    const p = predicted[i]
    if (typeof a === "number" && typeof p === "number" && Number.isFinite(a) && Number.isFinite(p))
      out.push({ actual: a, predicted: p })
  }
  return out
}

function histogram(values: readonly number[], bins = 20): Array<{ bin: string; mid: number; count: number }> {
  const [min, max] = extent(values)
  const width = max > min ? (max - min) / bins : 1
  const counts = new Array<number>(max > min ? bins : 1).fill(0)
  for (const v of values) counts[Math.min(counts.length - 1, Math.floor((v - min) / width))]++
  return counts.map((count, i) => {
    const lo = min + i * width
    return { bin: `${lo.toPrecision(3)} – ${(lo + width).toPrecision(3)}`, mid: lo + width / 2, count }
  })
}

export function RegressionCharts({ model }: { model: TrainedModel }) {
  const pairs = regressionPairs(model)
  if (pairs.length === 0)
    return <p className="text-muted-foreground text-sm">No held-out predictions stored for this model.</p>
  const points = thin(pairs)
  const [lo, hi] = extent(pairs.flatMap((p) => [p.actual, p.predicted]))
  const residuals = histogram(pairs.map((p) => p.actual - p.predicted))

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartFrame
        label="Predicted versus actual scatter plot"
        caption={`Predicted vs actual on ${pairs.length.toLocaleString()} test rows. Points on the dashed line are perfect.`}
      >
        <ScatterChart margin={{ top: 8, right: 16, bottom: 20, left: 0 }}>
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="actual"
            name="Actual"
            domain={[lo, hi]}
            tick={AXIS_TICK}
            tickFormatter={(v: number) => v.toPrecision(3)}
            label={{
              value: "Actual",
              position: "insideBottom",
              offset: -12,
              fill: "var(--color-muted-foreground)",
              fontSize: 12,
            }}
          />
          <YAxis
            type="number"
            dataKey="predicted"
            name="Predicted"
            domain={[lo, hi]}
            tick={AXIS_TICK}
            tickFormatter={(v: number) => v.toPrecision(3)}
          />
          <ReferenceLine
            segment={[
              { x: lo, y: lo },
              { x: hi, y: hi },
            ]}
            stroke="var(--color-muted-foreground)"
            strokeDasharray="4 4"
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            formatter={(v) => fmt(v)}
            cursor={{ strokeDasharray: "3 3" }}
          />
          <Scatter data={points} fill="var(--color-chart-1)" fillOpacity={0.6} isAnimationActive={false} />
        </ScatterChart>
      </ChartFrame>
      <ChartFrame
        label="Residual histogram"
        caption="Residuals (actual − predicted). A narrow peak centred on 0 is good."
      >
        <BarChart data={residuals} margin={{ top: 8, right: 16, bottom: 20, left: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="3 3" />
          <XAxis
            dataKey="mid"
            tick={AXIS_TICK}
            tickFormatter={(v: number) => v.toPrecision(2)}
            label={{
              value: "Residual",
              position: "insideBottom",
              offset: -12,
              fill: "var(--color-muted-foreground)",
              fontSize: 12,
            }}
          />
          <YAxis allowDecimals={false} tick={AXIS_TICK} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            cursor={{ fill: "var(--color-muted)" }}
            labelFormatter={(_, payload) => String(payload?.[0]?.payload?.bin ?? "")}
            formatter={(v) => [String(v), "Rows"]}
          />
          <Bar dataKey="count" fill="var(--color-chart-2)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ChartFrame>
    </div>
  )
}

export function ClusterSizesChart({ model }: { model: TrainedModel }) {
  const sizes = model.metrics.clusterSizes ?? []
  if (sizes.length === 0)
    return <p className="text-muted-foreground text-sm">No cluster sizes stored for this model.</p>
  const data = sizes.map((count, i) => ({ cluster: `Cluster ${i + 1}`, count }))
  const total = sizes.reduce((a, b) => a + b, 0)
  return (
    <ChartFrame
      label={`Cluster sizes: ${data.map((d) => `${d.cluster} ${d.count}`).join(", ")}`}
      caption={`${total.toLocaleString()} rows in ${sizes.length} clusters.`}
    >
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="3 3" />
        <XAxis dataKey="cluster" tick={AXIS_TICK} />
        <YAxis allowDecimals={false} tick={AXIS_TICK} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          itemStyle={TOOLTIP_ITEM_STYLE}
          cursor={{ fill: "var(--color-muted)" }}
          formatter={(v) => [String(v), "Rows"]}
        />
        <Bar dataKey="count" fill="var(--color-chart-4)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ChartFrame>
  )
}
