"use client"

import { divergingColor, divergingTextColor, truncateLabel } from "./theme"

interface CorrelationHeatmapProps {
  columns: readonly string[]
  matrix: Record<string, Record<string, number>>
  /** Accessible description for screen readers. */
  label?: string
}

const CELL = 56
const LABEL_SPACE = 110

/**
 * Pearson correlation matrix as an SVG grid with a diverging colour scale.
 * Every cell carries its value as text plus a `<title>` tooltip, so the chart
 * is readable without colour and exportable as PNG.
 */
export function CorrelationHeatmap({ columns, matrix, label = "Correlation heatmap" }: CorrelationHeatmapProps) {
  const n = columns.length
  const size = LABEL_SPACE + n * CELL
  const showValues = n <= 14

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${size + 8} ${size + 8}`}
        width={size + 8}
        className="font-handwritten h-auto max-w-full"
      >
        <title>{label}</title>
        {columns.map((col, i) => (
          <text
            key={`row-${col}`}
            x={LABEL_SPACE - 8}
            y={LABEL_SPACE + i * CELL + CELL / 2}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={12}
            style={{ fill: "var(--color-muted-foreground)" }}
          >
            {truncateLabel(col)}
          </text>
        ))}
        {columns.map((col, j) => (
          <text
            key={`col-${col}`}
            transform={`translate(${LABEL_SPACE + j * CELL + CELL / 2}, ${LABEL_SPACE - 8}) rotate(-45)`}
            textAnchor="start"
            fontSize={12}
            style={{ fill: "var(--color-muted-foreground)" }}
          >
            {truncateLabel(col)}
          </text>
        ))}
        {columns.map((a, i) =>
          columns.map((b, j) => {
            const value = matrix[a]?.[b] ?? Number.NaN
            const display = Number.isFinite(value) ? value.toFixed(2) : "n/a"
            return (
              <g key={`${a}::${b}`}>
                <rect
                  x={LABEL_SPACE + j * CELL + 1}
                  y={LABEL_SPACE + i * CELL + 1}
                  width={CELL - 2}
                  height={CELL - 2}
                  rx={6}
                  style={{ fill: divergingColor(value) }}
                >
                  <title>{`${a} × ${b}: r = ${display}`}</title>
                </rect>
                {showValues && (
                  <text
                    x={LABEL_SPACE + j * CELL + CELL / 2}
                    y={LABEL_SPACE + i * CELL + CELL / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={12}
                    pointerEvents="none"
                    style={{ fill: divergingTextColor(value) }}
                  >
                    {display}
                  </text>
                )}
              </g>
            )
          }),
        )}
      </svg>
      <div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs" aria-hidden="true">
        <span>-1</span>
        <span
          className="h-2 w-40 rounded-full"
          style={{
            background: `linear-gradient(to right, ${divergingColor(-1)}, ${divergingColor(-0.5)}, ${divergingColor(0)}, ${divergingColor(0.5)}, ${divergingColor(1)})`,
          }}
        />
        <span>+1</span>
      </div>
    </div>
  )
}
