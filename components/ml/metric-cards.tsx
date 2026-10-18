import { formatMetric, headlineMetrics, METRIC_LABELS } from "@/lib/ml/engine"
import type { ModelMetrics, TaskType } from "@/lib/ml/types"

interface MetricCardsProps {
  task: TaskType
  metrics: ModelMetrics | Record<string, number>
}

/** Headline metric tiles for a task (missing metrics are skipped). */
export function MetricCards({ task, metrics }: MetricCardsProps) {
  const values = metrics as Record<string, unknown>
  const keys = headlineMetrics(task).filter((k) => typeof values[k] === "number")
  if (keys.length === 0) return <p className="text-muted-foreground text-sm">No metrics were computed.</p>
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {keys.map((key) => (
        <div key={key} className="sketch-card px-3 py-2">
          <dt className="text-muted-foreground text-xs">{METRIC_LABELS[key] ?? key}</dt>
          <dd className="font-handwritten-bold text-xl tabular-nums">{formatMetric(key, values[key])}</dd>
        </div>
      ))}
    </dl>
  )
}
