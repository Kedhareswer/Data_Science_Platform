"use client"

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatMetric, headlineMetrics, METRIC_LABELS, primaryMetric } from "@/lib/ml/engine"
import type { TaskType, TrainedModel } from "@/lib/ml/types"
import { cn } from "@/lib/utils"
import { AXIS_TICK, GRID_STROKE, TOOLTIP_ITEM_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_STYLE } from "./chart-theme"
import { algorithmName, formatDuration, isLowerBetter } from "./utils"

interface ModelComparisonProps {
  task: TaskType
  models: TrainedModel[]
  selectedId?: string
  onSelect: (id: string) => void
}

function metricValue(model: TrainedModel, key: string): number | undefined {
  const v = (model.metrics as Record<string, unknown>)[key]
  return typeof v === "number" && Number.isFinite(v) ? v : undefined
}

/** Side-by-side metrics table (best per metric highlighted) + primary-metric bar chart. */
export function ModelComparison({ task, models, selectedId, onSelect }: ModelComparisonProps) {
  const keys = headlineMetrics(task).filter((k) => models.some((m) => metricValue(m, k) !== undefined))
  const best: Record<string, number | undefined> = {}
  for (const k of keys) {
    const values = models.map((m) => metricValue(m, k)).filter((v): v is number => v !== undefined)
    best[k] = values.length > 1 ? (isLowerBetter(k) ? Math.min(...values) : Math.max(...values)) : undefined
  }
  const primary = primaryMetric(task)
  const chartData = models
    .map((m) => ({ id: m.id, name: m.name, value: metricValue(m, primary) }))
    .filter((d): d is { id: string; name: string; value: number } => d.value !== undefined)
    .sort((a, b) => (isLowerBetter(primary) ? a.value - b.value : b.value - a.value))

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Model</TableHead>
              {keys.map((k) => (
                <TableHead key={k} className="text-right">
                  {METRIC_LABELS[k] ?? k}
                  {isLowerBetter(k) && <span className="sr-only"> (lower is better)</span>}
                </TableHead>
              ))}
              <TableHead className="text-right">Train / test</TableHead>
              <TableHead className="text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.map((m) => (
              <TableRow key={m.id} data-state={m.id === selectedId ? "selected" : undefined}>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => onSelect(m.id)}
                    className="font-handwritten-bold focus-visible:ring-ring text-left underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-hidden"
                    aria-label={`Show details for ${m.name}`}
                  >
                    {m.name}
                  </button>
                  <span className="text-muted-foreground block text-xs">
                    {algorithmName(m.algorithm)} · {m.backend === "sklearn" ? "scikit-learn" : "TypeScript"}
                    {m.target ? ` · ${m.target}` : ""}
                  </span>
                </TableCell>
                {keys.map((k) => {
                  const v = metricValue(m, k)
                  const isBest = v !== undefined && v === best[k]
                  return (
                    <TableCell
                      key={k}
                      className={cn(
                        "text-right tabular-nums",
                        isBest && "bg-success/15 font-handwritten-bold text-success",
                      )}
                    >
                      {formatMetric(k, v)}
                      {isBest && <span className="sr-only"> (best)</span>}
                    </TableCell>
                  )
                })}
                <TableCell className="text-muted-foreground text-right tabular-nums">
                  {m.trainRows.toLocaleString()} / {m.testRows.toLocaleString()}
                </TableCell>
                <TableCell className="text-muted-foreground text-right tabular-nums">
                  {formatDuration(m.trainingTimeMs)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {chartData.length > 1 && (
        <figure className="space-y-1">
          <div
            style={{ height: Math.max(140, chartData.length * 32 + 40) }}
            role="img"
            aria-label={`${METRIC_LABELS[primary]} by model: ${chartData.map((d) => `${d.name} ${formatMetric(primary, d.value)}`).join(", ")}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
                <CartesianGrid horizontal={false} stroke={GRID_STROKE} strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tick={AXIS_TICK}
                  domain={primary === "r2Score" || primary === "silhouette" ? ["auto", 1] : [0, 1]}
                  tickFormatter={(v: number) => v.toFixed(2)}
                />
                <YAxis type="category" dataKey="name" tick={AXIS_TICK} width={170} interval={0} />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)" }}
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                  formatter={(v) => [formatMetric(primary, v), METRIC_LABELS[primary] ?? primary]}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 4, 4, 0]}
                  isAnimationActive={false}
                  onClick={(d: { payload?: { id?: string } }) => d.payload?.id && onSelect(d.payload.id)}
                >
                  {chartData.map((d, i) => (
                    <Cell
                      key={d.id}
                      fill={i === 0 ? "var(--color-chart-2)" : "var(--color-chart-1)"}
                      cursor="pointer"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <figcaption className="text-muted-foreground text-xs">
            {METRIC_LABELS[primary] ?? primary} on the held-out data — best model highlighted. Click a bar to inspect
            it.
          </figcaption>
        </figure>
      )}
    </div>
  )
}
