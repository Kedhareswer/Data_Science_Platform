"use client"

import { memo, useMemo } from "react"
import type { MetricWidget } from "@/lib/dashboard"
import { computeMetric, describeAggregation, formatValue } from "@/lib/dashboard-data"
import type { ColumnTypes, DataRow } from "@/lib/data/types"
import { WidgetMessage } from "@/components/dashboard/widget-message"

interface MetricWidgetViewProps {
  widget: MetricWidget
  /** Rows after the dashboard filters. */
  rows: readonly DataRow[]
  /** All rows, used to show the unfiltered value for comparison. */
  allRows: readonly DataRow[]
  columnTypes: ColumnTypes
}

function MetricWidgetViewImpl({ widget, rows, allRows, columnTypes }: MetricWidgetViewProps) {
  const { column, aggregation, format } = widget
  const columnMissing = column !== undefined && column !== "" && !(column in columnTypes)
  const isFiltered = rows !== allRows

  const result = useMemo(
    () => (columnMissing ? null : computeMetric(rows, { column, aggregation })),
    [columnMissing, rows, column, aggregation],
  )
  const baseline = useMemo(
    () => (columnMissing || !isFiltered ? null : computeMetric(allRows, { column, aggregation })),
    [columnMissing, isFiltered, allRows, column, aggregation],
  )

  if (columnMissing) return <WidgetMessage>Column “{column}” is not in the current data.</WidgetMessage>
  if (!result) return null

  const delta =
    baseline && baseline.value !== null && result.value !== null && baseline.value !== 0
      ? (result.value - baseline.value) / Math.abs(baseline.value)
      : null

  return (
    <div className="flex h-full flex-col justify-between gap-2">
      <p className="font-handwritten-bold text-4xl leading-tight break-words tabular-nums" aria-live="polite">
        {formatValue(result.value, format)}
      </p>
      <div className="text-muted-foreground space-y-0.5 text-xs">
        <p>
          {describeAggregation(aggregation, column)} · {result.rowCount.toLocaleString()} row
          {result.rowCount === 1 ? "" : "s"}
        </p>
        {baseline && (
          <p>
            Unfiltered: {formatValue(baseline.value, format)}
            {delta !== null && Number.isFinite(delta) && (
              <span className="text-foreground ml-1 font-semibold">
                ({delta > 0 ? "+" : ""}
                {formatValue(delta, "percent")})
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  )
}

export const MetricWidgetView = memo(MetricWidgetViewImpl)
