import type { CellValue } from "@/lib/data/types"

interface ConfusionMatrixProps {
  /** Rows = actual class, columns = predicted class. */
  matrix: number[][]
  classes?: CellValue[]
}

const MAX_CLASSES = 15

/** Confusion-matrix heatmap. Diagonal (correct) cells use one hue, errors another. */
export function ConfusionMatrix({ matrix, classes }: ConfusionMatrixProps) {
  if (matrix.length === 0) return <p className="text-muted-foreground text-sm">No confusion matrix available.</p>
  if (matrix.length > MAX_CLASSES) {
    return (
      <p className="text-muted-foreground text-sm">
        {matrix.length} classes — too many to draw a readable confusion matrix.
      </p>
    )
  }
  const labels = matrix.map((_, i) => String(classes?.[i] ?? i))
  const rowTotals = matrix.map((row) => row.reduce((a, b) => a + b, 0))
  const max = Math.max(1, ...matrix.flat())

  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-1 text-sm">
        <caption className="text-muted-foreground caption-bottom pt-2 text-left text-xs">
          Rows are actual classes, columns are predicted classes (held-out test set).
        </caption>
        <thead>
          <tr>
            <th scope="col" className="text-muted-foreground px-2 text-left text-xs font-normal">
              actual ↓ / predicted →
            </th>
            {labels.map((l) => (
              <th key={l} scope="col" className="font-handwritten-bold max-w-24 truncate px-2" title={l}>
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={labels[i]}>
              <th scope="row" className="font-handwritten-bold max-w-32 truncate px-2 text-left" title={labels[i]}>
                {labels[i]}
              </th>
              {row.map((count, j) => {
                const strength = Math.round((count / max) * 75)
                const hue = i === j ? "var(--color-chart-2)" : "var(--color-chart-1)"
                const share = rowTotals[i] ? Math.round((count / rowTotals[i]) * 100) : 0
                return (
                  <td
                    key={j}
                    className="min-w-14 rounded-md border px-2 py-2 text-center tabular-nums"
                    style={{ background: `color-mix(in oklab, ${hue} ${strength}%, transparent)` }}
                    title={`Actual ${labels[i]}, predicted ${labels[j]}: ${count} (${share}% of actual ${labels[i]})`}
                  >
                    <span className="font-handwritten-bold">{count}</span>
                    <span className="text-muted-foreground block text-[10px]">{share}%</span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
