"use client"

import { useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { CheckCircle2, Eraser, Wand2 } from "lucide-react"
import { toast } from "sonner"
import type { CellProps } from "@/components/cells/types"
import {
  AXIS_LINE,
  AXIS_TICK,
  BAR_CURSOR,
  GRID_STROKE,
  TOOLTIP_CONTENT_STYLE,
  TOOLTIP_ITEM_STYLE,
  TOOLTIP_LABEL_STYLE,
  truncateLabel,
} from "@/components/charts/theme"
import { DataUploadPrompt } from "@/components/data-upload-prompt"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useData } from "@/lib/data-context"
import { applyStep, describeStep, type TransformStep } from "@/lib/data/transform"
import { type ColumnTypes, type DataRow, isMissing } from "@/lib/data/types"

const MATRIX_ROWS = 200
const MATRIX_COLUMNS = 40
const PAIR_COLUMNS = 25
const CHART_COLUMNS = 25

interface ColumnMissing {
  column: string
  missing: number
  percentage: number
}

interface MissingPair {
  a: string
  b: string
  both: number
  /** Share of the rarer column's missing values that co-occur with the other's. */
  overlap: number
}

interface MissingSummary {
  perColumn: ColumnMissing[]
  totalMissing: number
  rowsWithMissing: number
  pairs: MissingPair[]
}

function summarize(rows: readonly DataRow[], columns: readonly string[]): MissingSummary {
  const counts = new Array<number>(columns.length).fill(0)
  let rowsWithMissing = 0
  for (const row of rows) {
    let any = false
    for (let c = 0; c < columns.length; c++) {
      if (isMissing(row[columns[c]])) {
        counts[c]++
        any = true
      }
    }
    if (any) rowsWithMissing++
  }
  const perColumn = columns.map((column, i) => ({
    column,
    missing: counts[i],
    percentage: rows.length ? Math.round((counts[i] / rows.length) * 1000) / 10 : 0,
  }))

  // Co-missing pairs across the most incomplete columns (bounded for large tables).
  const tracked = perColumn
    .filter((c) => c.missing > 0)
    .sort((a, b) => b.missing - a.missing)
    .slice(0, PAIR_COLUMNS)
  const k = tracked.length
  const both = new Float64Array(k * k)
  if (k > 1) {
    const missingIdx: number[] = []
    for (const row of rows) {
      missingIdx.length = 0
      for (let i = 0; i < k; i++) if (isMissing(row[tracked[i].column])) missingIdx.push(i)
      for (let x = 0; x < missingIdx.length; x++)
        for (let y = x + 1; y < missingIdx.length; y++) both[missingIdx[x] * k + missingIdx[y]]++
    }
  }
  const pairs: MissingPair[] = []
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const n = both[i * k + j]
      if (n > 0) pairs.push({ a: tracked[i].column, b: tracked[j].column, both: n, overlap: n / Math.min(tracked[i].missing, tracked[j].missing) })
    }
  }
  pairs.sort((p, q) => q.both - p.both)

  return {
    perColumn,
    totalMissing: counts.reduce((s, n) => s + n, 0),
    rowsWithMissing,
    pairs: pairs.slice(0, 10),
  }
}

export function MissingDataCell(_props: CellProps) {
  const { processedData, columns, columnTypes, setProcessedData } = useData()
  const summary = useMemo(() => summarize(processedData, columns), [processedData, columns])

  if (processedData.length === 0) {
    return <DataUploadPrompt title="No data to inspect" description="Load a dataset to explore where values are missing." />
  }

  const totalCells = processedData.length * columns.length
  const incomplete = summary.perColumn.filter((c) => c.missing > 0)

  const apply = (step: TransformStep) => {
    const before = processedData.length
    const next = applyStep(processedData, step)
    setProcessedData(next)
    const dropped = before - next.length
    toast.success(describeStep(step), {
      description: dropped > 0 ? `${dropped.toLocaleString()} rows removed` : "Working data updated",
    })
  }

  return (
    <div className="space-y-5 font-handwritten">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryTile label="Missing cells" value={summary.totalMissing.toLocaleString()} />
        <SummaryTile label="Of all cells" value={`${totalCells ? ((summary.totalMissing / totalCells) * 100).toFixed(1) : "0"}%`} />
        <SummaryTile label="Rows with any missing" value={summary.rowsWithMissing.toLocaleString()} />
        <SummaryTile label="Complete rows" value={(processedData.length - summary.rowsWithMissing).toLocaleString()} />
      </dl>

      {incomplete.length === 0 ? (
        <div className="sketch-card flex items-center gap-2 p-4 text-success">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> No missing values. Every cell is filled in!
        </div>
      ) : (
        <>
          <MissingBarChart perColumn={incomplete} />
          <MissingMatrix rows={processedData} columns={columns} />
          <CoMissingPairs pairs={summary.pairs} />
          <QuickActions incomplete={incomplete} columnTypes={columnTypes} onApply={apply} />
        </>
      )}
    </div>
  )
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="sketch-card p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-xl font-handwritten-bold">{value}</dd>
    </div>
  )
}

function Section({ title, children, description }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-base font-handwritten-bold">{title}</h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function missingColor(percentage: number): string {
  if (percentage > 50) return "var(--color-destructive)"
  if (percentage > 20) return "var(--color-warning)"
  return "var(--color-chart-2)"
}

function MissingBarChart({ perColumn }: { perColumn: ColumnMissing[] }) {
  const data = useMemo(() => [...perColumn].sort((a, b) => b.percentage - a.percentage).slice(0, CHART_COLUMNS), [perColumn])
  return (
    <Section
      title="Missing values by column"
      description={perColumn.length > data.length ? `Top ${data.length} of ${perColumn.length} incomplete columns` : undefined}
    >
      <div style={{ height: data.length * 28 + 48 }} role="img" aria-label="Bar chart of missing percentage per column">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 16, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
            <XAxis type="number" domain={[0, 100]} unit="%" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={AXIS_LINE} />
            <YAxis
              type="category"
              dataKey="column"
              width={120}
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              tickFormatter={(v: string) => truncateLabel(v, 16)}
            />
            <Tooltip
              cursor={BAR_CURSOR}
              contentStyle={TOOLTIP_CONTENT_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              formatter={(value: unknown, _name: unknown, item: { payload?: ColumnMissing }) => [
                `${String(value)}% (${item.payload?.missing.toLocaleString() ?? 0} rows)`,
                "Missing",
              ]}
            />
            <Bar dataKey="percentage" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.column} fill={missingColor(d.percentage)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Section>
  )
}

function MissingMatrix({ rows, columns }: { rows: DataRow[]; columns: string[] }) {
  const { shownColumns, sample, cells } = useMemo(() => {
    const visibleColumns = columns.slice(0, MATRIX_COLUMNS)
    const stride = Math.max(1, rows.length / MATRIX_ROWS)
    const sampleIdx: number[] = []
    for (let i = 0; i < Math.min(rows.length, MATRIX_ROWS); i++) sampleIdx.push(Math.floor(i * stride))
    const missingCells: Array<{ r: number; c: number }> = []
    sampleIdx.forEach((rowIndex, r) => {
      visibleColumns.forEach((col, c) => {
        if (isMissing(rows[rowIndex][col])) missingCells.push({ r, c })
      })
    })
    return { shownColumns: visibleColumns, sample: sampleIdx, cells: missingCells }
  }, [rows, columns])

  const width = 800
  const labelSpace = 90
  const cellW = width / Math.max(1, shownColumns.length)
  const cellH = Math.max(2, Math.min(8, 400 / Math.max(1, sample.length)))
  const height = sample.length * cellH

  return (
    <Section
      title="Missingness matrix"
      description={`${sample.length < rows.length ? `${sample.length} evenly spaced rows of ${rows.length.toLocaleString()}` : `All ${rows.length} rows`}${
        columns.length > shownColumns.length ? ` · first ${shownColumns.length} columns` : ""
      }. Dark marks are missing values.`}
    >
      <svg
        viewBox={`0 0 ${width} ${height + labelSpace}`}
        className="h-auto w-full font-handwritten"
        role="img"
        aria-label={`Missingness matrix: ${cells.length} missing cells among ${sample.length} sampled rows`}
      >
        <rect x={0} y={labelSpace} width={width} height={height} style={{ fill: "var(--color-muted)" }} />
        {cells.map(({ r, c }) => (
          <rect key={`${r}-${c}`} x={c * cellW} y={labelSpace + r * cellH} width={Math.max(1, cellW - 1)} height={cellH} style={{ fill: "var(--color-foreground)" }} />
        ))}
        {shownColumns.map((col, c) => (
          <text
            key={col}
            transform={`translate(${c * cellW + cellW / 2}, ${labelSpace - 6}) rotate(-60)`}
            fontSize={Math.min(13, Math.max(9, cellW / 2))}
            style={{ fill: "var(--color-muted-foreground)" }}
          >
            <title>{col}</title>
            {truncateLabel(col, 12)}
          </text>
        ))}
      </svg>
    </Section>
  )
}

function CoMissingPairs({ pairs }: { pairs: MissingPair[] }) {
  return (
    <Section title="Missing together" description="Column pairs whose values are often missing in the same rows.">
      {pairs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No columns are missing together.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {pairs.map((p) => (
            <li key={`${p.a}|${p.b}`} className="sketch-card p-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="truncate" title={`${p.a} + ${p.b}`}>
                  {p.a} + {p.b}
                </span>
                <span className="shrink-0 text-muted-foreground">{p.both.toLocaleString()} rows</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-muted" aria-hidden="true">
                <div className="h-1.5 rounded-full bg-chart-4" style={{ width: `${Math.round(p.overlap * 100)}%` }} />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{Math.round(p.overlap * 100)}% overlap</p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function QuickActions({
  incomplete,
  columnTypes,
  onApply,
}: {
  incomplete: ColumnMissing[]
  columnTypes: ColumnTypes
  onApply: (step: TransformStep) => void
}) {
  const [selected, setSelected] = useState<string>("")
  const column = incomplete.some((c) => c.column === selected) ? selected : incomplete[0].column
  const numeric = columnTypes[column] === "number"
  return (
    <Section
      title="Quick fixes"
      description="These change the working data right away. For a reproducible pipeline, use a Preprocessing cell."
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="missing-column">Column</Label>
          <Select value={column} onValueChange={setSelected}>
            <SelectTrigger id="missing-column" className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {incomplete.map((c) => (
                <SelectItem key={c.column} value={c.column}>
                  {c.column} ({c.percentage}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={() => onApply({ type: "drop_missing", columns: [column] })}>
          <Eraser aria-hidden="true" /> Drop rows
        </Button>
        {numeric && (
          <>
            <Button variant="outline" size="sm" onClick={() => onApply({ type: "fill_missing", column, method: "mean" })}>
              <Wand2 aria-hidden="true" /> Fill mean
            </Button>
            <Button variant="outline" size="sm" onClick={() => onApply({ type: "fill_missing", column, method: "median" })}>
              <Wand2 aria-hidden="true" /> Fill median
            </Button>
          </>
        )}
        <Button variant="outline" size="sm" onClick={() => onApply({ type: "fill_missing", column, method: "mode" })}>
          <Wand2 aria-hidden="true" /> Fill mode
        </Button>
        <Button variant="destructive" size="sm" onClick={() => onApply({ type: "drop_missing" })}>
          <Eraser aria-hidden="true" /> Drop rows with any missing
        </Button>
      </div>
    </Section>
  )
}
