"use client"

import { useDeferredValue, useMemo, useState } from "react"
import { ArrowDown, ArrowRight, ArrowUp, ClipboardCopy, Play, Plus, RotateCcw, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import type { CellProps } from "@/components/cells/types"
import { formatNumber } from "@/components/charts/theme"
import { DataUploadPrompt } from "@/components/data-upload-prompt"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCellContent, useCellRunner, useData } from "@/lib/data-context"
import { describeRows } from "@/lib/data/infer"
import {
  applyPipeline,
  describeStep,
  FILTER_OPERATORS,
  type FilterOperator,
  type TransformStep,
} from "@/lib/data/transform"
import type { CellValue, ColumnType, ColumnTypes, DataRow } from "@/lib/data/types"

type StepType = TransformStep["type"]
type FillMethod = Extract<TransformStep, { type: "fill_missing" }>["method"]

interface PreprocessingContent {
  steps: TransformStep[]
  appliedAt?: string
}

const EMPTY_CONTENT: PreprocessingContent = { steps: [] }
const PREVIEW_ROWS = 10
const PREVIEW_COLUMNS = 12
const SCHEMA_SAMPLE = 500

const STEP_LABELS: Record<StepType, string> = {
  filter: "Filter rows",
  drop_missing: "Drop rows with missing values",
  fill_missing: "Fill missing values",
  drop_duplicates: "Drop duplicate rows",
  drop_columns: "Drop columns",
  rename_column: "Rename column",
  cast: "Change column type",
  normalize: "Min-max normalize",
  standardize: "Standardize (z-score)",
  remove_outliers: "Remove outliers (IQR)",
  label_encode: "Label encode",
  one_hot: "One-hot encode",
  trim_text: "Trim whitespace",
}

/** Column types a single-column step accepts (`null` = any column). */
const STEP_COLUMN_TYPES: Partial<Record<StepType, readonly ColumnType[]>> = {
  normalize: ["number"],
  standardize: ["number"],
  remove_outliers: ["number"],
  trim_text: ["string"],
}

const SINGLE_COLUMN_STEPS = new Set<StepType>([
  "filter",
  "fill_missing",
  "rename_column",
  "cast",
  "normalize",
  "standardize",
  "remove_outliers",
  "label_encode",
  "one_hot",
  "trim_text",
])

const COLUMN_TYPES: readonly ColumnType[] = ["number", "string", "boolean", "date"]

function readContent(raw: unknown): PreprocessingContent {
  if (raw && typeof raw === "object" && Array.isArray((raw as PreprocessingContent).steps))
    return raw as PreprocessingContent
  return EMPTY_CONTENT
}

export function PreprocessingCell({ cellId }: CellProps) {
  const { data, setProcessedData, resetProcessedData } = useData()
  const [rawContent, setContent] = useCellContent<PreprocessingContent>(cellId, EMPTY_CONTENT)
  const content = readContent(rawContent)
  const { steps } = content
  const deferredSteps = useDeferredValue(steps)

  const originalSchema = useMemo(() => describeRows(data.slice(0, SCHEMA_SAMPLE)), [data])
  const preview = useMemo(() => {
    try {
      return { rows: applyPipeline(data, deferredSteps), error: null }
    } catch (err) {
      return { rows: [] as DataRow[], error: err instanceof Error ? err.message : "Pipeline failed" }
    }
  }, [data, deferredSteps])
  const schema = useMemo(
    () => (preview.rows.length > 0 ? describeRows(preview.rows.slice(0, SCHEMA_SAMPLE)) : originalSchema),
    [preview.rows, originalSchema],
  )

  const setSteps = (next: TransformStep[]) => setContent({ ...content, steps: next })

  const apply = () => {
    if (steps.length === 0) return
    try {
      const rows = applyPipeline(data, steps)
      setProcessedData(rows)
      setContent({ ...content, appliedAt: new Date().toISOString() })
      toast.success(`Pipeline applied: ${rows.length.toLocaleString()} rows`, {
        description: `${steps.length} step${steps.length === 1 ? "" : "s"} on the original ${data.length.toLocaleString()} rows`,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pipeline failed")
    }
  }
  useCellRunner(cellId, apply)

  if (data.length === 0) {
    return <DataUploadPrompt title="No data to preprocess" description="Load a dataset to build a cleaning pipeline." />
  }

  const reset = () => {
    resetProcessedData()
    toast.success("Working data reset to the original upload")
  }

  const copyPandas = async () => {
    const code = pipelineToPandas(steps, originalSchema.columnTypes)
    try {
      await navigator.clipboard.writeText(code)
      toast.success("pandas code copied to clipboard")
    } catch {
      toast.error("Clipboard is unavailable in this browser")
    }
  }

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta
    if (target < 0 || target >= steps.length) return
    const next = [...steps]
    ;[next[index], next[target]] = [next[target], next[index]]
    setSteps(next)
  }

  return (
    <div className="font-handwritten space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <StepBuilder
          columns={schema.columns}
          columnTypes={schema.columnTypes}
          onAdd={(step) => setSteps([...steps, step])}
        />
        <StepList
          steps={steps}
          onMove={move}
          onRemove={(i) => setSteps(steps.filter((_, j) => j !== i))}
          onClear={() => setSteps([])}
        />
      </div>

      <PreviewPanel
        beforeRows={data.length}
        beforeColumns={originalSchema.columns.length}
        rows={preview.rows}
        columns={preview.rows.length > 0 ? schema.columns : []}
        error={preview.error}
        pending={deferredSteps !== steps}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={apply} disabled={steps.length === 0}>
          <Play aria-hidden="true" /> Apply pipeline
        </Button>
        <Button variant="outline" onClick={reset}>
          <RotateCcw aria-hidden="true" /> Reset to original
        </Button>
        <Button variant="outline" onClick={() => void copyPandas()} disabled={steps.length === 0}>
          <ClipboardCopy aria-hidden="true" /> Copy as pandas code
        </Button>
        {content.appliedAt && (
          <span className="text-muted-foreground text-xs">
            Last applied {new Date(content.appliedAt).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step builder
// ---------------------------------------------------------------------------

interface Draft {
  column: string
  columns: string[]
  operator: FilterOperator
  value: string
  method: FillMethod
  to: string
  castTo: ColumnType
  k: string
}

const INITIAL_DRAFT: Draft = {
  column: "",
  columns: [],
  operator: "eq",
  value: "",
  method: "median",
  to: "",
  castTo: "number",
  k: "1.5",
}

function buildStep(type: StepType, draft: Draft, column: string, columns: readonly string[]): TransformStep | string {
  if (SINGLE_COLUMN_STEPS.has(type) && !column) return "Pick a column."
  switch (type) {
    case "filter":
      return { type, column, operator: draft.operator, value: draft.value }
    case "drop_missing":
      return draft.columns.length ? { type, columns: draft.columns } : { type }
    case "fill_missing":
      if (draft.method === "constant" && draft.value === "") return "Enter a fill value."
      return draft.method === "constant"
        ? { type, column, method: "constant", value: draft.value }
        : { type, column, method: draft.method }
    case "drop_duplicates":
      return { type }
    case "drop_columns":
      if (draft.columns.length === 0) return "Select at least one column."
      if (draft.columns.length === columns.length) return "Keep at least one column."
      return { type, columns: draft.columns }
    case "rename_column": {
      const to = draft.to.trim()
      if (!to) return "Enter a new name."
      if (to !== column && columns.includes(to)) return `A column named "${to}" already exists.`
      return { type, column, to }
    }
    case "cast":
      return { type, column, to: draft.castTo }
    case "remove_outliers": {
      const k = Number(draft.k)
      if (!Number.isFinite(k) || k <= 0) return "IQR multiplier must be a positive number."
      return { type, column, k }
    }
    case "normalize":
    case "standardize":
    case "label_encode":
    case "one_hot":
    case "trim_text":
      return { type, column }
  }
}

interface StepBuilderProps {
  columns: string[]
  columnTypes: ColumnTypes
  onAdd: (step: TransformStep) => void
}

function StepBuilder({ columns, columnTypes, onAdd }: StepBuilderProps) {
  const [type, setType] = useState<StepType>("fill_missing")
  const [draft, setDraft] = useState<Draft>(INITIAL_DRAFT)
  const [error, setError] = useState<string | null>(null)

  const allowedTypes = STEP_COLUMN_TYPES[type]
  const columnOptions = allowedTypes
    ? columns.filter((c) => allowedTypes.includes(columnTypes[c] ?? "string"))
    : columns
  const column = columnOptions.includes(draft.column) ? draft.column : (columnOptions[0] ?? "")
  const patch = (p: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...p }))
    setError(null)
  }

  const add = () => {
    if (
      type === "fill_missing" &&
      (draft.method === "mean" || draft.method === "median") &&
      columnTypes[column] !== "number"
    ) {
      setError("Mean/median need a numeric column.")
      return
    }
    const step = buildStep(
      type,
      { ...draft, columns: draft.columns.filter((c) => columns.includes(c)) },
      column,
      columns,
    )
    if (typeof step === "string") {
      setError(step)
      return
    }
    onAdd(step)
    setDraft((d) => ({ ...d, value: "", to: "", columns: [] }))
    setError(null)
    toast.success(`Added: ${describeStep(step)}`)
  }

  return (
    <section className="sketch-card space-y-3 p-4" aria-labelledby="step-builder-heading">
      <h3 id="step-builder-heading" className="font-handwritten-bold text-base">
        Add a step
      </h3>
      <div className="space-y-1">
        <Label htmlFor="step-type">Operation</Label>
        <Select
          value={type}
          onValueChange={(v) => {
            setType(v as StepType)
            setError(null)
          }}
        >
          <SelectTrigger id="step-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(STEP_LABELS) as StepType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {STEP_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {SINGLE_COLUMN_STEPS.has(type) &&
        (columnOptions.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No {allowedTypes?.join("/") ?? ""} columns are available for this operation.
          </p>
        ) : (
          <div className="space-y-1">
            <Label htmlFor="step-column">Column</Label>
            <Select value={column} onValueChange={(v) => patch({ column: v })}>
              <SelectTrigger id="step-column">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columnOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c} <span className="text-muted-foreground text-xs">· {columnTypes[c]}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}

      <StepFields
        type={type}
        draft={draft}
        columns={columns}
        columnIsNumeric={columnTypes[column] === "number"}
        onChange={patch}
      />

      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      <Button onClick={add} size="sm" disabled={SINGLE_COLUMN_STEPS.has(type) && columnOptions.length === 0}>
        <Plus aria-hidden="true" /> Add step
      </Button>
    </section>
  )
}

interface StepFieldsProps {
  type: StepType
  draft: Draft
  columns: string[]
  columnIsNumeric: boolean
  onChange: (patch: Partial<Draft>) => void
}

function StepFields({ type, draft, columns, columnIsNumeric, onChange }: StepFieldsProps) {
  switch (type) {
    case "filter":
      return (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="step-operator">Condition</Label>
            <Select value={draft.operator} onValueChange={(v) => onChange({ operator: v as FilterOperator })}>
              <SelectTrigger id="step-operator">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FILTER_OPERATORS) as FilterOperator[]).map((op) => (
                  <SelectItem key={op} value={op}>
                    {FILTER_OPERATORS[op]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="step-value">Value</Label>
            <Input
              id="step-value"
              value={draft.value}
              inputMode={columnIsNumeric ? "decimal" : "text"}
              onChange={(e) => onChange({ value: e.target.value })}
            />
          </div>
        </div>
      )
    case "fill_missing":
      return (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="step-method">Fill with</Label>
            <Select value={draft.method} onValueChange={(v) => onChange({ method: v as FillMethod })}>
              <SelectTrigger id="step-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mean" disabled={!columnIsNumeric}>
                  Mean
                </SelectItem>
                <SelectItem value="median" disabled={!columnIsNumeric}>
                  Median
                </SelectItem>
                <SelectItem value="mode">Most frequent</SelectItem>
                <SelectItem value="constant">Constant value</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {draft.method === "constant" && (
            <div className="space-y-1">
              <Label htmlFor="step-fill">Value</Label>
              <Input id="step-fill" value={draft.value} onChange={(e) => onChange({ value: e.target.value })} />
            </div>
          )}
          {!columnIsNumeric && (draft.method === "mean" || draft.method === "median") && (
            <p className="text-warning col-span-2 text-xs">
              Mean/median only work on numeric columns — choose another method.
            </p>
          )}
        </div>
      )
    case "drop_missing":
    case "drop_columns":
      return (
        <ColumnChecklist
          legend={type === "drop_missing" ? "Only consider these columns (none = any column)" : "Columns to drop"}
          columns={columns}
          selected={draft.columns}
          onChange={(selected) => onChange({ columns: selected })}
        />
      )
    case "rename_column":
      return (
        <div className="space-y-1">
          <Label htmlFor="step-rename">New name</Label>
          <Input id="step-rename" value={draft.to} onChange={(e) => onChange({ to: e.target.value })} />
        </div>
      )
    case "cast":
      return (
        <div className="space-y-1">
          <Label htmlFor="step-cast">Convert to</Label>
          <Select value={draft.castTo} onValueChange={(v) => onChange({ castTo: v as ColumnType })}>
            <SelectTrigger id="step-cast">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COLUMN_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    case "remove_outliers":
      return (
        <div className="space-y-1">
          <Label htmlFor="step-k">IQR multiplier</Label>
          <Input
            id="step-k"
            type="number"
            min={0.1}
            step={0.1}
            value={draft.k}
            onChange={(e) => onChange({ k: e.target.value })}
          />
        </div>
      )
    default:
      return null
  }
}

function ColumnChecklist({
  legend,
  columns,
  selected,
  onChange,
}: {
  legend: string
  columns: string[]
  selected: string[]
  onChange: (selected: string[]) => void
}) {
  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
        {columns.map((c, i) => {
          const id = `step-col-${i}`
          return (
            <div key={c} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={selected.includes(c)}
                onCheckedChange={(checked) =>
                  onChange(checked === true ? [...selected, c] : selected.filter((s) => s !== c))
                }
              />
              <Label htmlFor={id} className="truncate font-normal">
                {c}
              </Label>
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}

// ---------------------------------------------------------------------------
// Step list & preview
// ---------------------------------------------------------------------------

function StepList({
  steps,
  onMove,
  onRemove,
  onClear,
}: {
  steps: TransformStep[]
  onMove: (index: number, delta: -1 | 1) => void
  onRemove: (index: number) => void
  onClear: () => void
}) {
  return (
    <section className="sketch-card space-y-3 p-4" aria-labelledby="pipeline-heading">
      <div className="flex items-center justify-between gap-2">
        <h3 id="pipeline-heading" className="font-handwritten-bold text-base">
          Pipeline <Badge variant="outline">{steps.length}</Badge>
        </h3>
        {steps.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <Trash2 aria-hidden="true" /> Clear
          </Button>
        )}
      </div>
      {steps.length === 0 ? (
        <p className="text-muted-foreground text-sm">No steps yet. Steps run in order on the original data.</p>
      ) : (
        <ol className="space-y-1.5">
          {steps.map((step, i) => {
            const label = describeStep(step)
            return (
              <li
                key={`${i}-${label}`}
                className="bg-muted/40 flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm"
              >
                <span className="text-muted-foreground w-5 shrink-0 text-right">{i + 1}.</span>
                <span className="min-w-0 flex-1 break-words">{label}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label={`Move step ${i + 1} up`}
                  disabled={i === 0}
                  onClick={() => onMove(i, -1)}
                >
                  <ArrowUp aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label={`Move step ${i + 1} down`}
                  disabled={i === steps.length - 1}
                  onClick={() => onMove(i, 1)}
                >
                  <ArrowDown aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label={`Remove step ${i + 1}: ${label}`}
                  onClick={() => onRemove(i)}
                >
                  <X aria-hidden="true" />
                </Button>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

function formatCell(value: CellValue | undefined) {
  if (value === null || value === undefined || value === "")
    return <span className="text-muted-foreground italic">null</span>
  if (typeof value === "number") return formatNumber(value)
  return String(value)
}

function PreviewPanel({
  beforeRows,
  beforeColumns,
  rows,
  columns,
  error,
  pending,
}: {
  beforeRows: number
  beforeColumns: number
  rows: DataRow[]
  columns: string[]
  error: string | null
  pending: boolean
}) {
  const shownColumns = columns.slice(0, PREVIEW_COLUMNS)
  return (
    <section className="space-y-2" aria-labelledby="preview-heading" aria-busy={pending}>
      <div className="flex flex-wrap items-center gap-3">
        <h3 id="preview-heading" className="font-handwritten-bold text-base">
          Preview
        </h3>
        <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
          {beforeRows.toLocaleString()} rows × {beforeColumns} cols{" "}
          <ArrowRight className="h-3.5 w-3.5" aria-label="becomes" />
          <span className="text-foreground">
            {rows.length.toLocaleString()} rows × {columns.length} cols
          </span>
        </span>
        {pending && <span className="text-muted-foreground text-xs">updating…</span>}
      </div>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-warning text-sm">The pipeline removes every row.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {shownColumns.map((c) => (
                  <TableHead key={c} className="whitespace-nowrap">
                    {c}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, PREVIEW_ROWS).map((row, i) => (
                <TableRow key={i}>
                  {shownColumns.map((c) => (
                    <TableCell key={c} className="max-w-[12rem] truncate py-1.5 whitespace-nowrap">
                      {formatCell(row[c])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {columns.length > shownColumns.length && (
            <p className="text-muted-foreground px-3 py-1 text-xs">
              + {columns.length - shownColumns.length} more columns
            </p>
          )}
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// pandas export
// ---------------------------------------------------------------------------

/** Python string literal. JSON string escapes are valid Python escapes. */
const py = (text: string) => JSON.stringify(text)
const pyList = (items: readonly string[]) => `[${items.map(py).join(", ")}]`
const PY_OPERATORS: Record<Exclude<FilterOperator, "contains" | "not_contains">, string> = {
  eq: "==",
  neq: "!=",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
}

function isNumericLiteral(text: string): boolean {
  return text.trim() !== "" && Number.isFinite(Number(text))
}

function stepToPandas(step: TransformStep, types: ColumnTypes): string[] {
  switch (step.type) {
    case "filter": {
      const col = `df[${py(step.column)}]`
      if (step.operator === "contains" || step.operator === "not_contains") {
        const mask = `${col}.astype(str).str.contains(${py(step.value)}, case=False, regex=False, na=False)`
        return [`df = df[${step.operator === "not_contains" ? `~${mask}` : mask}]`]
      }
      const op = PY_OPERATORS[step.operator]
      return types[step.column] === "number" && isNumericLiteral(step.value)
        ? [`df = df[${col} ${op} ${Number(step.value)}]`]
        : [`df = df[${col}.astype(str) ${op} ${py(step.value)}]`]
    }
    case "drop_missing":
      return [step.columns?.length ? `df = df.dropna(subset=${pyList(step.columns)})` : "df = df.dropna()"]
    case "fill_missing": {
      const col = `df[${py(step.column)}]`
      if (step.method === "constant") {
        const raw = step.value ?? ""
        const literal = types[step.column] === "number" && isNumericLiteral(raw) ? String(Number(raw)) : py(raw)
        return [`${col} = ${col}.fillna(${literal})`]
      }
      if (step.method === "mode") return [`${col} = ${col}.fillna(${col}.mode().iloc[0])`]
      return [`${col} = ${col}.fillna(${col}.${step.method}())`]
    }
    case "drop_duplicates":
      return ["df = df.drop_duplicates()"]
    case "drop_columns":
      return [`df = df.drop(columns=${pyList(step.columns)})`]
    case "rename_column":
      return [`df = df.rename(columns={${py(step.column)}: ${py(step.to)}})`]
    case "cast": {
      const col = `df[${py(step.column)}]`
      switch (step.to) {
        case "number":
          return [`${col} = pd.to_numeric(${col}, errors="coerce")`]
        case "date":
          return [`${col} = pd.to_datetime(${col}, errors="coerce")`]
        case "boolean":
          return [
            `_bool_map = {"true": True, "yes": True, "y": True, "false": False, "no": False, "n": False}`,
            `${col} = ${col}.map(lambda v: v if isinstance(v, bool) else _bool_map.get(str(v).strip().lower()))`,
          ]
        case "string":
          return [`${col} = ${col}.astype("string")`]
      }
      break
    }
    case "normalize": {
      const col = `df[${py(step.column)}]`
      return [`${col} = (${col} - ${col}.min()) / (${col}.max() - ${col}.min())`]
    }
    case "standardize": {
      const col = `df[${py(step.column)}]`
      return [`${col} = (${col} - ${col}.mean()) / ${col}.std()`]
    }
    case "remove_outliers": {
      const col = `df[${py(step.column)}]`
      const k = step.k ?? 1.5
      return [
        `_q1, _q3 = ${col}.quantile([0.25, 0.75])`,
        `_iqr = _q3 - _q1`,
        `df = df[${col}.between(_q1 - ${k} * _iqr, _q3 + ${k} * _iqr) | ${col}.isna()]`,
      ]
    }
    case "label_encode": {
      const col = `df[${py(step.column)}]`
      return [
        `_labels = sorted(${col}.dropna().astype(str).unique())`,
        `${col} = ${col}.where(${col}.isna(), ${col}.astype(str)).map({label: i for i, label in enumerate(_labels)})`,
      ]
    }
    case "one_hot":
      return [
        `df = pd.get_dummies(df, columns=[${py(step.column)}], prefix=[${py(step.column)}], prefix_sep="_", dtype=int)`,
      ]
    case "trim_text": {
      const col = `df[${py(step.column)}]`
      return [`${col} = ${col}.map(lambda v: v.strip() if isinstance(v, str) else v)`]
    }
  }
  return []
}

/** Track column types through the pipeline so later steps emit the right literals. */
function nextTypes(step: TransformStep, types: ColumnTypes): ColumnTypes {
  const next = { ...types }
  switch (step.type) {
    case "drop_columns":
      for (const c of step.columns) delete next[c]
      break
    case "rename_column":
      if (step.column in next) {
        next[step.to] = next[step.column]
        delete next[step.column]
      }
      break
    case "cast":
      next[step.column] = step.to
      break
    case "label_encode":
      next[step.column] = "number"
      break
    case "one_hot":
      delete next[step.column]
      break
  }
  return next
}

/** Generate a standalone pandas script equivalent to the pipeline. */
export function pipelineToPandas(steps: readonly TransformStep[], initialTypes: ColumnTypes): string {
  const lines = ["import pandas as pd", "", '# df = pd.read_csv("your_data.csv")', ""]
  let types = initialTypes
  steps.forEach((step, i) => {
    lines.push(`# ${i + 1}. ${describeStep(step).replace(/[\r\n]+/g, " ")}`)
    lines.push(...stepToPandas(step, types))
    lines.push("")
    types = nextTypes(step, types)
  })
  return lines.join("\n")
}
