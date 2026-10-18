/** Dashboard model — persisted with the workspace (see data-context). */

export type Aggregation = "count" | "sum" | "mean" | "median" | "min" | "max" | "distinct"
export type WidgetChart = "bar" | "line" | "area" | "pie" | "scatter"
export type WidgetSize = "sm" | "md" | "lg" | "full"

interface WidgetBase {
  id: string
  title: string
  size: WidgetSize
}

export interface MetricWidget extends WidgetBase {
  type: "metric"
  column?: string
  aggregation: Aggregation
  format?: "number" | "percent" | "currency"
}

export interface ChartWidget extends WidgetBase {
  type: "chart"
  chart: WidgetChart
  x?: string
  y?: string
  aggregation: Aggregation
  /** Max categories shown (rest grouped as "Other"). */
  limit?: number
}

export interface TableWidget extends WidgetBase {
  type: "table"
  columns: string[]
  pageSize: number
}

export interface TextWidget extends WidgetBase {
  type: "text"
  markdown: string
}

export type DashboardWidget = MetricWidget | ChartWidget | TableWidget | TextWidget

export interface DashboardFilter {
  id: string
  column: string
  /** Categorical: selected values. */
  values?: string[]
  /** Numeric range. */
  min?: number
  max?: number
}

export interface DashboardState {
  title: string
  widgets: DashboardWidget[]
  filters: DashboardFilter[]
}

export const EMPTY_DASHBOARD: DashboardState = { title: "My dashboard", widgets: [], filters: [] }
