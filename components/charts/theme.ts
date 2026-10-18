import type { CSSProperties } from "react"

/**
 * Chart colours resolve through the theme tokens in `app/globals.css`, so every
 * chart follows light/dark mode automatically. Beyond the five tokens we derive
 * extra tints with `color-mix` so long series lists stay distinguishable.
 */
export const CHART_COLORS: readonly string[] = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "color-mix(in oklab, var(--color-chart-1) 55%, var(--color-foreground))",
  "color-mix(in oklab, var(--color-chart-2) 55%, var(--color-foreground))",
  "color-mix(in oklab, var(--color-chart-3) 55%, var(--color-background))",
]

export function seriesColor(index: number): string {
  return CHART_COLORS[((index % CHART_COLORS.length) + CHART_COLORS.length) % CHART_COLORS.length]
}

export const AXIS_TICK = { fill: "var(--color-muted-foreground)", fontSize: 12 } as const
export const AXIS_LINE = { stroke: "var(--color-border)" } as const
export const GRID_STROKE = "var(--color-border)"
export const AXIS_LABEL_STYLE: CSSProperties = { fill: "var(--color-muted-foreground)", fontSize: 13 }

export const TOOLTIP_CONTENT_STYLE: CSSProperties = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  color: "var(--color-popover-foreground)",
  fontSize: 13,
}
export const TOOLTIP_LABEL_STYLE: CSSProperties = { color: "var(--color-popover-foreground)", fontWeight: 700 }
export const TOOLTIP_ITEM_STYLE: CSSProperties = { color: "var(--color-popover-foreground)" }
export const BAR_CURSOR = { fill: "var(--color-muted)", opacity: 0.5 } as const
export const LINE_CURSOR = { stroke: "var(--color-border)" } as const

/** Diverging scale for correlations: negative → red, 0 → muted, positive → blue. */
export function divergingColor(value: number): string {
  if (!Number.isFinite(value)) return "var(--color-muted)"
  const strength = Math.round(Math.min(1, Math.abs(value)) * 100)
  const hue = value >= 0 ? "hsl(217 80% 55%)" : "hsl(0 75% 55%)"
  return `color-mix(in oklab, ${hue} ${strength}%, var(--color-muted))`
}

/** Readable text colour on top of `divergingColor(value)`. */
export function divergingTextColor(value: number): string {
  return Number.isFinite(value) && Math.abs(value) > 0.55 ? "#ffffff" : "var(--color-foreground)"
}

const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 })
const precise = new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 })

/** Human-friendly number formatting for ticks, tooltips and tables. */
export function formatNumber(value: unknown): string {
  if (typeof value !== "number") return value === null || value === undefined ? "—" : String(value)
  if (!Number.isFinite(value)) return "—"
  return Math.abs(value) >= 10_000 ? compact.format(value) : precise.format(value)
}

/** Shorten long category labels on axes. */
export function truncateLabel(value: unknown, max = 14): string {
  const text = String(value ?? "")
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}
