"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { FeatureImportance } from "@/lib/ml/types"
import { AXIS_TICK, GRID_STROKE, TOOLTIP_ITEM_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_STYLE } from "./chart-theme"

interface FeatureImportanceChartProps {
  importance: FeatureImportance[]
  /** Show at most this many features. */
  limit?: number
}

/** Horizontal bar chart of (normalised) permutation feature importance. */
export function FeatureImportanceChart({ importance, limit = 15 }: FeatureImportanceChartProps) {
  if (importance.length === 0) {
    return <p className="text-muted-foreground text-sm">Feature importance is not available for this model.</p>
  }
  const data = [...importance]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, limit)
    .map((f) => ({ feature: f.feature, importance: Math.round(f.importance * 1000) / 10 }))
  const longest = Math.max(...data.map((d) => d.feature.length))

  return (
    <figure className="space-y-1">
      <div
        style={{ height: Math.max(160, data.length * 28 + 40) }}
        role="img"
        aria-label={`Feature importance: ${data.map((d) => `${d.feature} ${d.importance}%`).join(", ")}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
            <CartesianGrid horizontal={false} stroke={GRID_STROKE} strokeDasharray="3 3" />
            <XAxis type="number" tick={AXIS_TICK} unit="%" domain={[0, "auto"]} />
            <YAxis
              type="category"
              dataKey="feature"
              tick={AXIS_TICK}
              width={Math.min(160, 12 + longest * 7)}
              interval={0}
            />
            <Tooltip
              cursor={{ fill: "var(--color-muted)" }}
              contentStyle={TOOLTIP_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              formatter={(value) => [`${String(value)}%`, "Importance"]}
            />
            <Bar dataKey="importance" fill="var(--color-chart-2)" radius={[0, 4, 4, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="text-muted-foreground text-xs">
        Permutation importance on the test set — how much the score drops when a feature is shuffled.
        {importance.length > limit ? ` Top ${limit} of ${importance.length}.` : ""}
      </figcaption>
    </figure>
  )
}
