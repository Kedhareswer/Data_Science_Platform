"use client"

import { useId, useState, type ReactNode } from "react"
import { AreaChart, BarChart3, FileText, Hash, LineChart, PieChart, ScatterChart, Table2 } from "lucide-react"
import type { Aggregation, DashboardWidget, DateBucket, MetricWidget, WidgetChart, WidgetSize } from "@/lib/dashboard"
import {
  AGGREGATION_LABELS,
  AGGREGATIONS,
  defaultWidgetTitle,
  NUMERIC_AGGREGATIONS,
  newWidgetId,
} from "@/lib/dashboard-data"
import type { ColumnTypes } from "@/lib/data/types"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { SIZE_LABELS } from "@/components/dashboard/widget-card"
import { cn } from "@/lib/utils"

type WidgetType = DashboardWidget["type"]
type ValueFormat = NonNullable<MetricWidget["format"]>

const NONE = "__none__"

const TYPE_OPTIONS: { value: WidgetType; label: string; icon: ReactNode }[] = [
  { value: "metric", label: "Metric", icon: <Hash aria-hidden /> },
  { value: "chart", label: "Chart", icon: <BarChart3 aria-hidden /> },
  { value: "table", label: "Table", icon: <Table2 aria-hidden /> },
  { value: "text", label: "Text", icon: <FileText aria-hidden /> },
]

const CHART_OPTIONS: { value: WidgetChart; label: string; icon: ReactNode }[] = [
  { value: "bar", label: "Bar", icon: <BarChart3 aria-hidden /> },
  { value: "line", label: "Line", icon: <LineChart aria-hidden /> },
  { value: "area", label: "Area", icon: <AreaChart aria-hidden /> },
  { value: "pie", label: "Pie", icon: <PieChart aria-hidden /> },
  { value: "scatter", label: "Scatter", icon: <ScatterChart aria-hidden /> },
]

const DEFAULT_SIZE: Record<WidgetType, WidgetSize> = { metric: "sm", chart: "md", table: "full", text: "md" }

interface FormState {
  id: string
  type: WidgetType
  title: string
  size: WidgetSize
  sizeTouched: boolean
  // metric
  metricColumn?: string
  metricAggregation: Aggregation
  format: ValueFormat
  // chart
  chart: WidgetChart
  x?: string
  y?: string
  chartAggregation: Aggregation
  limit: string
  bucket: DateBucket
  // table
  tableColumns: string[]
  pageSize: number
  // text
  markdown: string
}

function initialForm(widget: DashboardWidget | undefined, columns: readonly string[]): FormState {
  const form: FormState = {
    id: widget?.id ?? newWidgetId(),
    type: widget?.type ?? "metric",
    title: widget?.title ?? "",
    size: widget?.size ?? "sm",
    sizeTouched: Boolean(widget),
    metricAggregation: "count",
    format: "number",
    chart: "bar",
    chartAggregation: "count",
    limit: "",
    bucket: "auto",
    tableColumns: columns.slice(0, 8),
    pageSize: 10,
    markdown: "",
  }
  if (!widget) return form
  switch (widget.type) {
    case "metric":
      return {
        ...form,
        metricColumn: widget.column,
        metricAggregation: widget.aggregation,
        format: widget.format ?? "number",
      }
    case "chart":
      return {
        ...form,
        chart: widget.chart,
        x: widget.x,
        y: widget.y,
        chartAggregation: widget.aggregation,
        limit: widget.limit !== undefined ? String(widget.limit) : "",
        bucket: widget.bucket ?? "auto",
      }
    case "table":
      return { ...form, tableColumns: widget.columns, pageSize: widget.pageSize }
    case "text":
      return { ...form, markdown: widget.markdown }
  }
}

function buildWidget(form: FormState): DashboardWidget {
  const base = { id: form.id, title: form.title.trim(), size: form.size }
  let widget: DashboardWidget
  switch (form.type) {
    case "metric":
      widget = {
        ...base,
        type: "metric",
        column: form.metricColumn,
        aggregation: form.metricColumn ? form.metricAggregation : "count",
        format: form.format,
      }
      break
    case "chart": {
      const limit = Number.parseInt(form.limit, 10)
      widget = {
        ...base,
        type: "chart",
        chart: form.chart,
        x: form.x,
        y: form.y,
        aggregation: form.y ? form.chartAggregation : "count",
        ...(Number.isFinite(limit) && limit > 0 ? { limit: Math.min(limit, 50) } : {}),
        ...(form.bucket !== "auto" ? { bucket: form.bucket } : {}),
      }
      break
    }
    case "table":
      widget = { ...base, type: "table", columns: form.tableColumns, pageSize: form.pageSize }
      break
    case "text":
      widget = { ...base, type: "text", markdown: form.markdown }
      break
  }
  return widget.title ? widget : { ...widget, title: defaultWidgetTitle(widget) }
}

function aggregationsFor(column: string | undefined, columnTypes: ColumnTypes): readonly Aggregation[] {
  if (!column) return ["count"]
  return columnTypes[column] === "number" ? AGGREGATIONS : AGGREGATIONS.filter((a) => !NUMERIC_AGGREGATIONS.includes(a))
}

interface WidgetEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Widget to edit; undefined creates a new one. */
  widget?: DashboardWidget
  columns: readonly string[]
  columnTypes: ColumnTypes
  onSave: (widget: DashboardWidget) => void
}

export function WidgetEditor({ open, onOpenChange, widget, columns, columnTypes, onSave }: WidgetEditorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        {open && (
          <EditorForm
            key={widget?.id ?? "new"}
            widget={widget}
            columns={columns}
            columnTypes={columnTypes}
            onCancel={() => onOpenChange(false)}
            onSave={(w) => {
              onSave(w)
              onOpenChange(false)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="font-handwritten-bold">
        {label}
      </Label>
      {children}
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  )
}

function ColumnSelect({
  id,
  value,
  onChange,
  columns,
  columnTypes,
  allowNone,
  noneLabel = "None",
  filter,
}: {
  id: string
  value?: string
  onChange: (value: string | undefined) => void
  columns: readonly string[]
  columnTypes: ColumnTypes
  allowNone?: boolean
  noneLabel?: string
  filter?: (column: string) => boolean
}) {
  const options = filter ? columns.filter(filter) : columns
  const missing = value && !columns.includes(value)
  return (
    <Select value={value ?? NONE} onValueChange={(v) => onChange(v === NONE ? undefined : v)}>
      <SelectTrigger id={id}>
        <SelectValue placeholder="Pick a column" />
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value={NONE}>{noneLabel}</SelectItem>}
        {!allowNone && !value && (
          <SelectItem value={NONE} disabled>
            Pick a column
          </SelectItem>
        )}
        {missing && (
          <SelectItem value={value} disabled>
            {value} (missing)
          </SelectItem>
        )}
        {options.map((column) => (
          <SelectItem key={column} value={column}>
            {column} <span className="text-muted-foreground text-xs">· {columnTypes[column]}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function AggregationSelect({
  id,
  value,
  options,
  onChange,
  disabled,
}: {
  id: string
  value: Aggregation
  options: readonly Aggregation[]
  onChange: (value: Aggregation) => void
  disabled?: boolean
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Aggregation)} disabled={disabled}>
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((a) => (
          <SelectItem key={a} value={a}>
            {AGGREGATION_LABELS[a]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function EditorForm({
  widget,
  columns,
  columnTypes,
  onCancel,
  onSave,
}: {
  widget?: DashboardWidget
  columns: readonly string[]
  columnTypes: ColumnTypes
  onCancel: () => void
  onSave: (widget: DashboardWidget) => void
}) {
  const uid = useId()
  const [form, setForm] = useState<FormState>(() => initialForm(widget, columns))
  const set = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))
  const fid = (name: string) => `${uid}-${name}`

  const numericColumns = (c: string) => columnTypes[c] === "number"
  const metricAggs = aggregationsFor(form.metricColumn, columnTypes)
  const chartAggs = aggregationsFor(form.y, columnTypes)
  const isScatter = form.chart === "scatter"
  const xIsDate = form.x !== undefined && columnTypes[form.x] === "date"

  const error =
    form.type === "chart" && !form.x
      ? "Choose an X axis column."
      : form.type === "chart" && isScatter && !form.y
        ? "A scatter plot needs a Y column."
        : form.type === "chart" && isScatter && form.x && !numericColumns(form.x)
          ? "Scatter plots need a numeric X column."
          : null

  const preview = buildWidget(form)

  const setType = (type: WidgetType) =>
    setForm((prev) => ({ ...prev, type, size: prev.sizeTouched ? prev.size : DEFAULT_SIZE[type] }))

  const setChart = (chart: WidgetChart) =>
    setForm((prev) => {
      if (chart !== "scatter") return { ...prev, chart }
      // Scatter is numeric vs numeric — drop incompatible picks.
      return {
        ...prev,
        chart,
        x: prev.x && numericColumns(prev.x) ? prev.x : undefined,
        y: prev.y && numericColumns(prev.y) ? prev.y : undefined,
      }
    })

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (!error) onSave(buildWidget(form))
      }}
    >
      <DialogHeader>
        <DialogTitle className="font-handwritten-bold text-2xl">{widget ? "Edit widget" : "Add a widget"}</DialogTitle>
        <DialogDescription>Widgets update live with the dashboard filters.</DialogDescription>
      </DialogHeader>

      <Tabs value={form.type} onValueChange={(v) => setType(v as WidgetType)}>
        <TabsList className="grid w-full grid-cols-4" aria-label="Widget type">
          {TYPE_OPTIONS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5 [&_svg]:size-4">
              {t.icon}
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <Field label="Title" htmlFor={fid("title")}>
          <Input
            id={fid("title")}
            value={form.title}
            placeholder={defaultWidgetTitle({ ...preview, title: "" })}
            onChange={(e) => set({ title: e.target.value })}
            maxLength={120}
          />
        </Field>
        <Field label="Size" htmlFor={fid("size")}>
          <Select value={form.size} onValueChange={(v) => set({ size: v as WidgetSize, sizeTouched: true })}>
            <SelectTrigger id={fid("size")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SIZE_LABELS) as WidgetSize[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {SIZE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {form.type === "metric" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Column" htmlFor={fid("metric-column")}>
            <ColumnSelect
              id={fid("metric-column")}
              value={form.metricColumn}
              columns={columns}
              columnTypes={columnTypes}
              allowNone
              noneLabel="All rows"
              onChange={(metricColumn) => {
                const allowed = aggregationsFor(metricColumn, columnTypes)
                const metricAggregation = allowed.includes(form.metricAggregation)
                  ? form.metricAggregation
                  : metricColumn && columnTypes[metricColumn] === "number"
                    ? "mean"
                    : "count"
                set({ metricColumn, metricAggregation })
              }}
            />
          </Field>
          <Field label="Aggregation" htmlFor={fid("metric-agg")}>
            <AggregationSelect
              id={fid("metric-agg")}
              value={form.metricAggregation}
              options={metricAggs}
              disabled={!form.metricColumn}
              onChange={(metricAggregation) => set({ metricAggregation })}
            />
          </Field>
          <Field
            label="Format"
            htmlFor={fid("format")}
            hint={form.format === "percent" ? "0.25 shows as 25%." : undefined}
          >
            <Select value={form.format} onValueChange={(v) => set({ format: v as ValueFormat })}>
              <SelectTrigger id={fid("format")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="percent">Percent</SelectItem>
                <SelectItem value="currency">Currency ($)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      )}

      {form.type === "chart" && (
        <div className="space-y-4">
          <fieldset>
            <legend className="font-handwritten-bold mb-1.5 text-sm">Chart type</legend>
            <div role="group" aria-label="Chart type" className="grid grid-cols-5 gap-2">
              {CHART_OPTIONS.map((c) => {
                const selected = form.chart === c.value
                return (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setChart(c.value)}
                    className={cn(
                      "focus-visible:outline-ring flex flex-col items-center gap-1 rounded-md border-2 px-2 py-2 text-xs transition-colors focus-visible:outline-2 [&_svg]:size-5",
                      selected ? "border-primary bg-primary/10" : "hover:bg-accent border-dashed",
                    )}
                  >
                    {c.icon}
                    {c.label}
                  </button>
                )
              })}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label={isScatter ? "X (numeric)" : "Group by (X)"}
              htmlFor={fid("x")}
              hint={
                !isScatter && form.x && columnTypes[form.x] === "number" ? "Wide numeric ranges are binned." : undefined
              }
            >
              <ColumnSelect
                id={fid("x")}
                value={form.x}
                columns={columns}
                columnTypes={columnTypes}
                filter={isScatter ? numericColumns : undefined}
                onChange={(x) => set({ x })}
              />
            </Field>
            <Field label={isScatter ? "Y (numeric)" : "Value (Y)"} htmlFor={fid("y")}>
              <ColumnSelect
                id={fid("y")}
                value={form.y}
                columns={columns}
                columnTypes={columnTypes}
                allowNone={!isScatter}
                noneLabel="Row count"
                filter={isScatter ? numericColumns : undefined}
                onChange={(y) => {
                  const allowed = aggregationsFor(y, columnTypes)
                  const chartAggregation = allowed.includes(form.chartAggregation)
                    ? form.chartAggregation
                    : y && columnTypes[y] === "number"
                      ? "mean"
                      : "count"
                  set({ y, chartAggregation })
                }}
              />
            </Field>
            {!isScatter && (
              <Field label="Aggregation" htmlFor={fid("chart-agg")}>
                <AggregationSelect
                  id={fid("chart-agg")}
                  value={form.y ? form.chartAggregation : "count"}
                  options={chartAggs}
                  disabled={!form.y}
                  onChange={(chartAggregation) => set({ chartAggregation })}
                />
              </Field>
            )}
          </div>
          {!isScatter && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label={form.x && columnTypes[form.x] === "number" ? "Max bins" : "Max categories"}
                htmlFor={fid("limit")}
                hint={xIsDate ? "Not used for date axes." : "The rest are grouped as “Other”."}
              >
                <Input
                  id={fid("limit")}
                  type="number"
                  min={1}
                  max={50}
                  inputMode="numeric"
                  placeholder={form.chart === "pie" ? "6" : "10"}
                  value={form.limit}
                  disabled={xIsDate}
                  onChange={(e) => set({ limit: e.target.value })}
                />
              </Field>
              {xIsDate && (
                <Field label="Date buckets" htmlFor={fid("bucket")}>
                  <Select value={form.bucket} onValueChange={(v) => set({ bucket: v as DateBucket })}>
                    <SelectTrigger id={fid("bucket")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Automatic</SelectItem>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                      <SelectItem value="year">Year</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </div>
          )}
        </div>
      )}

      {form.type === "table" && (
        <div className="space-y-4">
          <fieldset className="space-y-2">
            <div className="flex items-center justify-between">
              <legend className="font-handwritten-bold text-sm">Columns</legend>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => set({ tableColumns: [...columns] })}
                >
                  All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => set({ tableColumns: [] })}
                >
                  None
                </Button>
              </div>
            </div>
            <ScrollArea className="h-48 rounded-md border">
              <ul className="grid gap-1 p-2 sm:grid-cols-2">
                {columns.map((column, i) => {
                  const id = fid(`col-${i}`)
                  const checked = form.tableColumns.includes(column)
                  return (
                    <li key={column} className="flex items-center gap-2">
                      <Checkbox
                        id={id}
                        checked={checked}
                        onCheckedChange={(c) =>
                          set({
                            tableColumns:
                              c === true
                                ? columns.filter((col) => col === column || form.tableColumns.includes(col))
                                : form.tableColumns.filter((col) => col !== column),
                          })
                        }
                      />
                      <label htmlFor={id} className="truncate text-sm">
                        {column}
                      </label>
                    </li>
                  )
                })}
              </ul>
            </ScrollArea>
            <p className="text-muted-foreground text-xs">
              {form.tableColumns.length === 0
                ? "No columns picked — every column will be shown."
                : `${form.tableColumns.length} selected.`}
            </p>
          </fieldset>
          <Field label="Rows per page" htmlFor={fid("page-size")}>
            <Select value={String(form.pageSize)} onValueChange={(v) => set({ pageSize: Number(v) })}>
              <SelectTrigger id={fid("page-size")} className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      )}

      {form.type === "text" && (
        <Field
          label="Markdown"
          htmlFor={fid("markdown")}
          hint="Supports **bold**, lists, links, tables (GFM). Raw HTML is not rendered."
        >
          <Textarea
            id={fid("markdown")}
            value={form.markdown}
            onChange={(e) => set({ markdown: e.target.value })}
            rows={8}
            className="font-mono text-sm"
            placeholder={"## Key takeaways\n- Sales peak in **December**\n- …"}
          />
        </Field>
      )}

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={Boolean(error)}>
          {widget ? "Save changes" : "Add widget"}
        </Button>
      </DialogFooter>
    </form>
  )
}
