import type { CSSProperties } from "react"

/** Shared recharts styling that follows the light/dark theme tokens. */
export const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]

export const AXIS_TICK = { fill: "var(--color-muted-foreground)", fontSize: 12 }

export const GRID_STROKE = "var(--color-border)"

export const TOOLTIP_STYLE: CSSProperties = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  color: "var(--color-popover-foreground)",
  fontSize: 12,
}

export const TOOLTIP_LABEL_STYLE: CSSProperties = { color: "var(--color-popover-foreground)" }
export const TOOLTIP_ITEM_STYLE: CSSProperties = { color: "var(--color-popover-foreground)" }
