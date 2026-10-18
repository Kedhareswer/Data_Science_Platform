"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, Columns3, Copy, Gauge, HardDrive, Loader2, Percent, RefreshCw, Rows3, SearchX } from "lucide-react"
import type { CellProps } from "@/components/cells/types"
import { CorrelationHeatmap } from "@/components/charts/correlation-heatmap"
import { formatNumber, truncateLabel } from "@/components/charts/theme"
import { DataUploadPrompt } from "@/components/data-upload-prompt"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { type ColumnProfile, type DataProfile, type DataQualityIssue, useCellRunner, useData } from "@/lib/data-context"
import { histogram, numericValues } from "@/lib/data/stats"
import type { ColumnType, DataRow } from "@/lib/data/types"
import { cn } from "@/lib/utils"

const MAX_HEATMAP_COLUMNS = 20
const INITIAL_COLUMN_CARDS = 12

export function ProfileCell({ cellId }: CellProps) {
  const { processedData, datasetVersion, dataProfile, isProfileLoading, generateDataProfile } = useData()
  const attemptedVersion = useRef<string | null>(null)

  // Generate once per dataset version. Tracking the attempted version means a
  // failed run (profile stays null) does not re-trigger an infinite loop.
  useEffect(() => {
    if (processedData.length === 0 || dataProfile || isProfileLoading) return
    if (attemptedVersion.current === datasetVersion) return
    attemptedVersion.current = datasetVersion
    void generateDataProfile()
  }, [processedData.length, dataProfile, isProfileLoading, datasetVersion, generateDataProfile])

  useCellRunner(cellId, () => generateDataProfile())

  if (processedData.length === 0) {
    return <DataUploadPrompt title="Nothing to profile yet" description="Load a dataset to see its profile, data quality and correlations." />
  }

  if (!dataProfile) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground" role="status">
        {isProfileLoading ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            <p className="font-handwritten">Profiling {processedData.length.toLocaleString()} rows…</p>
          </>
        ) : (
          <>
            <p className="font-handwritten">No profile generated yet.</p>
            <Button variant="outline" size="sm" onClick={() => void generateDataProfile()}>
              <RefreshCw aria-hidden="true" /> Generate profile
            </Button>
          </>
        )}
      </div>
    )
  }

  return <ProfileView profile={dataProfile} rows={processedData} isLoading={isProfileLoading} onRefresh={() => void generateDataProfile()} />
}

interface ProfileViewProps {
  profile: DataProfile
  rows: DataRow[]
  isLoading: boolean
  onRefresh: () => void
}

function ProfileView({ profile, rows, isLoading, onRefresh }: ProfileViewProps) {
  const correlationColumns = useMemo(() => Object.keys(profile.correlations), [profile.correlations])
  return (
    <div className="space-y-4 font-handwritten">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Generated {new Date(profile.generatedAt).toLocaleString()} · {profile.dataQuality.length} quality note
          {profile.dataQuality.length === 1 ? "" : "s"}
        </p>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={cn(isLoading && "animate-spin")} aria-hidden="true" /> Refresh
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="columns">Columns ({profile.overview.totalColumns})</TabsTrigger>
          <TabsTrigger value="correlations">Correlations</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <OverviewTiles overview={profile.overview} />
          <QualityIssues issues={profile.dataQuality} />
        </TabsContent>
        <TabsContent value="columns">
          <ColumnBrowser profile={profile} rows={rows} />
        </TabsContent>
        <TabsContent value="correlations">
          <CorrelationSection columns={correlationColumns} matrix={profile.correlations} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

function OverviewTiles({ overview }: { overview: DataProfile["overview"] }) {
  const tiles = [
    { label: "Rows", value: overview.totalRows.toLocaleString(), icon: Rows3 },
    { label: "Columns", value: overview.totalColumns.toLocaleString(), icon: Columns3 },
    { label: "Completeness", value: `${overview.completeness}%`, icon: Gauge },
    { label: "Duplicate rows", value: overview.duplicateRows.toLocaleString(), icon: Copy },
    { label: "Missing cells", value: overview.missingCells.toLocaleString(), icon: SearchX },
    { label: "Memory", value: overview.memoryUsage, icon: HardDrive },
  ]
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map(({ label, value, icon: Icon }) => (
          <div key={label} className="sketch-card p-3">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
            </dt>
            <dd className="mt-1 text-xl font-handwritten-bold">{value}</dd>
          </div>
        ))}
      </dl>
      <div>
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>Data completeness</span>
          <span>{overview.completeness}%</span>
        </div>
        <Progress value={overview.completeness} aria-label={`Data completeness ${overview.completeness}%`} />
      </div>
    </div>
  )
}

const SEVERITY_CLASS: Record<DataQualityIssue["severity"], string> = {
  high: "border-transparent bg-destructive text-destructive-foreground",
  medium: "border-transparent bg-warning/20 text-warning",
  low: "border-transparent bg-muted text-muted-foreground",
}

function QualityIssues({ issues }: { issues: DataQualityIssue[] }) {
  if (issues.length === 0) {
    return (
      <div className="sketch-card flex items-center gap-2 p-4 text-success">
        <Percent className="h-4 w-4" aria-hidden="true" /> No data quality issues detected. Nice and tidy!
      </div>
    )
  }
  return (
    <section aria-labelledby="quality-heading" className="space-y-2">
      <h3 id="quality-heading" className="flex items-center gap-2 text-base font-handwritten-bold">
        <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" /> Data quality
      </h3>
      <ul className="space-y-2">
        {issues.map((issue, i) => (
          <li key={`${issue.type}-${issue.column ?? "all"}-${i}`} className="sketch-card flex flex-col gap-1 p-3 sm:flex-row sm:items-start sm:gap-3">
            <Badge className={cn("w-fit shrink-0 capitalize", SEVERITY_CLASS[issue.severity])}>{issue.severity}</Badge>
            <div className="min-w-0">
              <p className="text-sm">{issue.description}</p>
              <p className="text-xs text-muted-foreground">💡 {issue.suggestion}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const TYPE_LABEL: Record<ColumnType, string> = { number: "numeric", string: "text", boolean: "boolean", date: "date" }

function ColumnBrowser({ profile, rows }: { profile: DataProfile; rows: DataRow[] }) {
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<ColumnType | "all">("all")
  const [showAll, setShowAll] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return Object.values(profile.columns).filter(
      (c) => (typeFilter === "all" || c.type === typeFilter) && (q === "" || c.name.toLowerCase().includes(q)),
    )
  }, [profile.columns, query, typeFilter])
  const visible = showAll ? filtered : filtered.slice(0, INITIAL_COLUMN_CARDS)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search columns…"
          aria-label="Search columns"
          className="max-w-xs"
        />
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ColumnType | "all")}>
          <SelectTrigger className="w-40" aria-label="Filter by column type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {(Object.keys(TYPE_LABEL) as ColumnType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {TYPE_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No columns match.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((column) => (
            <ColumnCard key={column.name} column={column} rows={rows} />
          ))}
        </div>
      )}
      {filtered.length > INITIAL_COLUMN_CARDS && (
        <Button variant="ghost" size="sm" onClick={() => setShowAll((s) => !s)}>
          {showAll ? "Show fewer columns" : `Show all ${filtered.length} columns`}
        </Button>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-mono text-xs leading-5">{value}</dd>
    </div>
  )
}

function ColumnCard({ column, rows }: { column: ColumnProfile; rows: DataRow[] }) {
  const allMissing = column.missing === column.count
  return (
    <article className="sketch-card space-y-3 p-3" aria-label={`Column ${column.name}`}>
      <header className="flex items-start justify-between gap-2">
        <h4 className="min-w-0 truncate font-handwritten-bold" title={column.name}>
          {column.name}
        </h4>
        <Badge variant="outline" className="shrink-0">
          {TYPE_LABEL[column.type]}
        </Badge>
      </header>

      <div>
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>Missing</span>
          <span>
            {column.missing.toLocaleString()} ({column.missingPercentage}%)
          </span>
        </div>
        <Progress value={column.missingPercentage} aria-label={`${column.missingPercentage}% missing`} className="h-2" />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
        <Stat label="Unique" value={`${column.unique.toLocaleString()} (${column.uniquePercentage}%)`} />
        <Stat label="Values" value={(column.count - column.missing).toLocaleString()} />
        {column.type === "number" && column.mean !== undefined && (
          <>
            <Stat label="Mean" value={formatNumber(column.mean)} />
            <Stat label="Std" value={formatNumber(column.std)} />
            <Stat label="Min" value={formatNumber(column.min)} />
            <Stat label="Max" value={formatNumber(column.max)} />
            <Stat label="Q1" value={formatNumber(column.q1)} />
            <Stat label="Median" value={formatNumber(column.median)} />
            <Stat label="Q3" value={formatNumber(column.q3)} />
            <Stat label="Outliers" value={(column.outlierCount ?? 0).toLocaleString()} />
            <Stat label="Skew" value={formatNumber(column.skewness)} />
            <Stat label="Kurtosis" value={formatNumber(column.kurtosis)} />
          </>
        )}
        {column.type === "string" && column.avgLength !== undefined && (
          <>
            <Stat label="Avg length" value={formatNumber(column.avgLength)} />
            <Stat label="Length range" value={`${column.minLength}–${column.maxLength}`} />
          </>
        )}
      </dl>

      {allMissing ? (
        <p className="text-xs text-muted-foreground">Every value in this column is missing.</p>
      ) : column.type === "number" ? (
        <MiniHistogram rows={rows} column={column.name} />
      ) : (
        <TopValues column={column} />
      )}

      {column.anomalies?.length ? <p className="text-xs text-warning">⚠ {column.anomalies.join(" · ")}</p> : null}
    </article>
  )
}

function MiniHistogram({ rows, column }: { rows: DataRow[]; column: string }) {
  const bins = useMemo(() => histogram(numericValues(rows, column), 16), [rows, column])
  const max = Math.max(1, ...bins.map((b) => b.count))
  if (bins.length === 0) return null
  return (
    <figure>
      <div className="flex h-16 items-end gap-px" role="img" aria-label={`Distribution of ${column}`}>
        {bins.map((bin, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-chart-2"
            style={{ height: `${Math.max(2, (bin.count / max) * 100)}%` }}
            title={`${formatNumber(bin.start)} – ${formatNumber(bin.end)}: ${bin.count.toLocaleString()}`}
          />
        ))}
      </div>
      <figcaption className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{formatNumber(bins[0].start)}</span>
        <span>{formatNumber(bins[bins.length - 1].end)}</span>
      </figcaption>
    </figure>
  )
}

function TopValues({ column }: { column: ColumnProfile }) {
  const top = (column.topValues ?? []).slice(0, 5)
  if (top.length === 0) return null
  const max = Math.max(...top.map((t) => t.percentage), 1)
  return (
    <ul className="space-y-1" aria-label={`Most frequent values in ${column.name}`}>
      {top.map((t) => (
        <li key={String(t.value)} className="text-xs">
          <div className="flex justify-between gap-2">
            <span className="truncate" title={String(t.value)}>
              {truncateLabel(t.value, 28)}
            </span>
            <span className="shrink-0 text-muted-foreground">
              {t.count.toLocaleString()} · {t.percentage}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted">
            <div className="h-1.5 rounded-full bg-chart-1" style={{ width: `${(t.percentage / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

// ---------------------------------------------------------------------------
// Correlations
// ---------------------------------------------------------------------------

function CorrelationSection({ columns, matrix }: { columns: string[]; matrix: DataProfile["correlations"] }) {
  const shown = columns.slice(0, MAX_HEATMAP_COLUMNS)
  const strongest = useMemo(() => {
    const pairs: Array<{ a: string; b: string; r: number }> = []
    for (let i = 0; i < columns.length; i++) {
      for (let j = i + 1; j < columns.length; j++) {
        const r = matrix[columns[i]]?.[columns[j]]
        if (r !== undefined && Number.isFinite(r)) pairs.push({ a: columns[i], b: columns[j], r })
      }
    }
    return pairs.sort((x, y) => Math.abs(y.r) - Math.abs(x.r)).slice(0, 8)
  }, [columns, matrix])

  if (columns.length < 2) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Correlations need at least two numeric columns.</p>
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div>
        <CorrelationHeatmap columns={shown} matrix={matrix} label="Pearson correlation between numeric columns" />
        {columns.length > shown.length && (
          <p className="mt-2 text-xs text-muted-foreground">
            Showing the first {shown.length} of {columns.length} numeric columns.
          </p>
        )}
      </div>
      <section aria-labelledby="strongest-heading">
        <h3 id="strongest-heading" className="mb-2 text-base font-handwritten-bold">
          Strongest relationships
        </h3>
        <ol className="space-y-1 text-sm">
          {strongest.map(({ a, b, r }) => (
            <li key={`${a}-${b}`} className="flex justify-between gap-2">
              <span className="truncate" title={`${a} × ${b}`}>
                {a} × {b}
              </span>
              <span className={cn("shrink-0 font-mono text-xs leading-5", r < 0 ? "text-destructive" : "text-chart-2")}>
                {r.toFixed(2)}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
