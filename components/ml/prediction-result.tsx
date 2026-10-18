import type { Prediction, TaskType } from "@/lib/ml/types"
import { formatCellValue } from "./utils"

/** The predicted value, its confidence and the class-probability bars. */
export function PredictionResult({
  prediction,
  task,
  target,
}: {
  prediction: Prediction
  task: TaskType
  target?: string
}) {
  const probs = Object.entries(prediction.probabilities ?? {}).sort((a, b) => b[1] - a[1])
  return (
    <div className="sketch-card space-y-3 p-4" role="status" aria-live="polite">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-muted-foreground text-sm">
          {task === "clustering" ? "Assigned to" : `Predicted ${target ?? "value"}`}
        </span>
        <span className="font-handwritten-bold text-3xl">{formatCellValue(prediction.value)}</span>
        {prediction.confidence !== undefined && Number.isFinite(prediction.confidence) && (
          <span className="text-muted-foreground text-sm">
            confidence <span className="text-foreground tabular-nums">{(prediction.confidence * 100).toFixed(1)}%</span>
          </span>
        )}
      </div>
      {probs.length > 0 && (
        <ul className="space-y-1.5" aria-label="Class probabilities">
          {probs.slice(0, 12).map(([label, p]) => (
            <li key={label} className="grid grid-cols-[minmax(4rem,10rem)_1fr_3.5rem] items-center gap-2 text-sm">
              <span className="truncate" title={label}>
                {label}
              </span>
              <span className="bg-muted h-3 overflow-hidden rounded-full" aria-hidden>
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${Math.max(0, Math.min(1, p)) * 100}%`,
                    background: label === String(prediction.value) ? "var(--color-chart-2)" : "var(--color-chart-1)",
                  }}
                />
              </span>
              <span className="text-right tabular-nums">{(p * 100).toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
