"use client"

import { mean, quantileSorted } from "@/lib/data/stats"
import { formatNumber, seriesColor, truncateLabel } from "./theme"

export interface BoxStats {
  label: string
  count: number
  mean: number
  q1: number
  median: number
  q3: number
  /** Whisker ends: most extreme values inside the 1.5·IQR fences. */
  lowerWhisker: number
  upperWhisker: number
  /** A sample of values outside the fences. */
  outliers: number[]
  outlierCount: number
}

const MAX_OUTLIER_DOTS = 60

/** Tukey box statistics for one group of numbers (returns null when empty). */
export function computeBoxStats(label: string, values: readonly number[]): BoxStats | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const q1 = quantileSorted(sorted, 0.25)
  const q3 = quantileSorted(sorted, 0.75)
  const iqr = q3 - q1
  const lowFence = q1 - 1.5 * iqr
  const highFence = q3 + 1.5 * iqr
  let lowerWhisker = q1
  let upperWhisker = q3
  const outliers: number[] = []
  for (const v of sorted) {
    if (v < lowFence || v > highFence) outliers.push(v)
    else {
      if (v < lowerWhisker) lowerWhisker = v
      if (v > upperWhisker) upperWhisker = v
    }
  }
  const stride = Math.max(1, Math.ceil(outliers.length / MAX_OUTLIER_DOTS))
  return {
    label,
    count: sorted.length,
    mean: mean(sorted),
    q1,
    median: quantileSorted(sorted, 0.5),
    q3,
    lowerWhisker,
    upperWhisker,
    outliers: outliers.filter((_, i) => i % stride === 0),
    outlierCount: outliers.length,
  }
}

interface BoxPlotProps {
  boxes: readonly BoxStats[]
  xLabel?: string
  yLabel?: string
  height?: number
}

const WIDTH = 800
const MARGIN = { top: 16, right: 16, bottom: 64, left: 72 }

/** "Nice" tick values covering [min, max]. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return []
  if (min === max) return [min]
  const rawStep = (max - min) / count
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rawStep) ?? rawStep
  const ticks: number[] = []
  for (let t = Math.ceil(min / step) * step; t <= max + step * 1e-9; t += step) ticks.push(Number(t.toFixed(10)))
  return ticks
}

/** Tukey box plot drawn as plain SVG (recharts has no box-plot primitive). */
export function BoxPlot({ boxes, xLabel, yLabel, height = 360 }: BoxPlotProps) {
  const innerW = WIDTH - MARGIN.left - MARGIN.right
  const innerH = height - MARGIN.top - MARGIN.bottom
  let lo = Infinity
  let hi = -Infinity
  for (const b of boxes) {
    lo = Math.min(lo, b.lowerWhisker, ...b.outliers)
    hi = Math.max(hi, b.upperWhisker, ...b.outliers)
  }
  if (lo === hi) {
    lo -= 1
    hi += 1
  }
  const pad = (hi - lo) * 0.05
  lo -= pad
  hi += pad
  const y = (v: number) => MARGIN.top + innerH - ((v - lo) / (hi - lo)) * innerH
  const band = innerW / Math.max(1, boxes.length)
  const boxWidth = Math.min(60, band * 0.5)
  const ticks = niceTicks(lo, hi)

  return (
    <svg
      role="img"
      aria-label={`Box plot of ${yLabel ?? "values"}${xLabel ? ` by ${xLabel}` : ""}`}
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="font-handwritten h-auto w-full"
    >
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={MARGIN.left}
            x2={WIDTH - MARGIN.right}
            y1={y(t)}
            y2={y(t)}
            strokeDasharray="3 3"
            style={{ stroke: "var(--color-border)" }}
          />
          <text
            x={MARGIN.left - 8}
            y={y(t)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={12}
            style={{ fill: "var(--color-muted-foreground)" }}
          >
            {formatNumber(t)}
          </text>
        </g>
      ))}
      {boxes.map((b, i) => {
        const cx = MARGIN.left + band * i + band / 2
        const color = seriesColor(i)
        return (
          <g key={b.label}>
            <title>
              {`${b.label}: n=${b.count}, min=${formatNumber(b.lowerWhisker)}, Q1=${formatNumber(b.q1)}, median=${formatNumber(b.median)}, Q3=${formatNumber(b.q3)}, max=${formatNumber(b.upperWhisker)}, mean=${formatNumber(b.mean)}, outliers=${b.outlierCount}`}
            </title>
            <line x1={cx} x2={cx} y1={y(b.upperWhisker)} y2={y(b.q3)} style={{ stroke: "var(--color-foreground)" }} />
            <line x1={cx} x2={cx} y1={y(b.q1)} y2={y(b.lowerWhisker)} style={{ stroke: "var(--color-foreground)" }} />
            <line
              x1={cx - boxWidth / 4}
              x2={cx + boxWidth / 4}
              y1={y(b.upperWhisker)}
              y2={y(b.upperWhisker)}
              style={{ stroke: "var(--color-foreground)" }}
            />
            <line
              x1={cx - boxWidth / 4}
              x2={cx + boxWidth / 4}
              y1={y(b.lowerWhisker)}
              y2={y(b.lowerWhisker)}
              style={{ stroke: "var(--color-foreground)" }}
            />
            <rect
              x={cx - boxWidth / 2}
              y={y(b.q3)}
              width={boxWidth}
              height={Math.max(1, y(b.q1) - y(b.q3))}
              rx={4}
              fillOpacity={0.75}
              strokeWidth={1.5}
              style={{ fill: color, stroke: "var(--color-foreground)" }}
            />
            <line
              x1={cx - boxWidth / 2}
              x2={cx + boxWidth / 2}
              y1={y(b.median)}
              y2={y(b.median)}
              strokeWidth={2.5}
              style={{ stroke: "var(--color-foreground)" }}
            />
            <circle
              cx={cx}
              cy={y(b.mean)}
              r={3}
              style={{ fill: "var(--color-background)", stroke: "var(--color-foreground)" }}
            />
            {b.outliers.map((v, k) => (
              <circle key={k} cx={cx + ((k % 5) - 2) * 2} cy={y(v)} r={2.5} fillOpacity={0.6} style={{ fill: color }} />
            ))}
            <text
              x={cx}
              y={height - MARGIN.bottom + 18}
              textAnchor="middle"
              fontSize={12}
              style={{ fill: "var(--color-muted-foreground)" }}
            >
              {truncateLabel(b.label, Math.max(6, Math.floor(band / 8)))}
            </text>
          </g>
        )
      })}
      {xLabel && (
        <text
          x={MARGIN.left + innerW / 2}
          y={height - 12}
          textAnchor="middle"
          fontSize={13}
          style={{ fill: "var(--color-muted-foreground)" }}
        >
          {xLabel}
        </text>
      )}
      {yLabel && (
        <text
          transform={`translate(16, ${MARGIN.top + innerH / 2}) rotate(-90)`}
          textAnchor="middle"
          fontSize={13}
          style={{ fill: "var(--color-muted-foreground)" }}
        >
          {yLabel}
        </text>
      )}
    </svg>
  )
}
