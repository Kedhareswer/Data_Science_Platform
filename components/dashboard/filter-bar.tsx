"use client"

import { useMemo, useState } from "react"
import { Filter, Plus, X } from "lucide-react"
import type { DashboardFilter } from "@/lib/dashboard"
import { distinctValues, formatValue, isFilterActive, newWidgetId, numericExtent } from "@/lib/dashboard-data"
import type { ColumnType, ColumnTypes, DataRow } from "@/lib/data/types"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type FilterKind = "category" | "range" | "date"

function filterKind(type: ColumnType | undefined): FilterKind {
  return type === "number" ? "range" : type === "date" ? "date" : "category"
}

function summarize(filter: DashboardFilter, type: ColumnType | undefined): string {
  if (!isFilterActive(filter)) return "any"
  const kind = filterKind(type)
  if (kind === "category") {
    const values = filter.values ?? []
    return values.length <= 2 ? values.join(", ") : `${values.length} selected`
  }
  const [lo, hi] =
    kind === "range"
      ? [
          filter.min !== undefined ? formatValue(filter.min) : undefined,
          filter.max !== undefined ? formatValue(filter.max) : undefined,
        ]
      : [filter.from || undefined, filter.to || undefined]
  if (lo !== undefined && hi !== undefined) return `${lo} – ${hi}`
  return lo !== undefined ? `≥ ${lo}` : `≤ ${hi}`
}

interface FilterBarProps {
  filters: readonly DashboardFilter[]
  /** Unfiltered rows (filter options are derived from these). */
  rows: readonly DataRow[]
  columns: readonly string[]
  columnTypes: ColumnTypes
  filteredCount: number
  onChange: (filters: DashboardFilter[]) => void
}

export function FilterBar({ filters, rows, columns, columnTypes, filteredCount, onChange }: FilterBarProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const update = (id: string, patch: Partial<DashboardFilter>) =>
    onChange(filters.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  const remove = (id: string) => onChange(filters.filter((f) => f.id !== id))
  const add = (column: string) => {
    const id = newWidgetId()
    onChange([...filters, { id, column }])
    setAddOpen(false)
    // Open the new filter's editor once its chip has rendered.
    requestAnimationFrame(() => setOpenId(id))
  }

  const available = columns.filter((c) => !filters.some((f) => f.column === c))
  const activeCount = filters.filter((f) => isFilterActive(f) && f.column in columnTypes).length

  return (
    <div
      role="region"
      aria-label="Dashboard filters"
      className="sketch-card flex flex-wrap items-center gap-2 px-3 py-2"
    >
      <span className="font-handwritten-bold flex items-center gap-1.5 text-sm">
        <Filter className="size-4" aria-hidden /> Filters
      </span>

      {filters.length === 0 && <span className="text-muted-foreground text-sm">None — showing every row.</span>}

      {filters.map((filter) => {
        const type = columnTypes[filter.column]
        const stale = !(filter.column in columnTypes)
        const active = isFilterActive(filter)
        return (
          <div
            key={filter.id}
            className={cn(
              "flex items-center rounded-full border text-sm",
              active && !stale ? "border-primary/50 bg-primary/10" : "bg-muted/40 border-dashed",
            )}
          >
            <Popover open={openId === filter.id} onOpenChange={(open) => setOpenId(open ? filter.id : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={stale}
                  className="focus-visible:outline-ring max-w-64 truncate rounded-l-full py-1 pr-1 pl-3 text-left focus-visible:outline-2 disabled:cursor-not-allowed"
                  aria-label={`Edit filter on ${filter.column}`}
                >
                  <span className="font-semibold">{filter.column}</span>
                  <span className="text-muted-foreground">: {stale ? "column missing" : summarize(filter, type)}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80">
                {filterKind(type) === "category" ? (
                  <CategoryEditor filter={filter} rows={rows} onChange={(values) => update(filter.id, { values })} />
                ) : filterKind(type) === "range" ? (
                  <RangeEditor filter={filter} rows={rows} onChange={(min, max) => update(filter.id, { min, max })} />
                ) : (
                  <DateEditor filter={filter} onChange={(from, to) => update(filter.id, { from, to })} />
                )}
              </PopoverContent>
            </Popover>
            <button
              type="button"
              onClick={() => remove(filter.id)}
              className="text-muted-foreground hover:text-foreground focus-visible:outline-ring rounded-r-full py-1 pr-2 pl-1 focus-visible:outline-2"
              aria-label={`Remove filter on ${filter.column}`}
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        )
      })}

      <Popover open={addOpen} onOpenChange={setAddOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8" disabled={available.length === 0}>
            <Plus aria-hidden /> Add filter
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-1">
          <p className="text-muted-foreground px-2 py-1.5 text-xs font-semibold">Filter by column</p>
          <ScrollArea className="max-h-72">
            <ul className="max-h-72">
              {available.map((column) => (
                <li key={column}>
                  <button
                    type="button"
                    onClick={() => add(column)}
                    className="hover:bg-accent focus-visible:bg-accent flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm focus-visible:outline-hidden"
                  >
                    <span className="truncate">{column}</span>
                    <span className="text-muted-foreground text-xs">{columnTypes[column]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      <div className="text-muted-foreground ml-auto flex items-center gap-2 text-sm">
        <span aria-live="polite">
          {activeCount > 0
            ? `${filteredCount.toLocaleString()} of ${rows.length.toLocaleString()} rows`
            : `${rows.length.toLocaleString()} rows`}
        </span>
        {filters.length > 0 && (
          <Button variant="ghost" size="sm" className="h-8" onClick={() => onChange([])}>
            Clear all
          </Button>
        )}
      </div>
    </div>
  )
}

const MAX_OPTIONS = 300

function CategoryEditor({
  filter,
  rows,
  onChange,
}: {
  filter: DashboardFilter
  rows: readonly DataRow[]
  onChange: (values: string[]) => void
}) {
  const [query, setQuery] = useState("")
  const options = useMemo(() => distinctValues(rows, filter.column, 5000), [rows, filter.column])
  const selected = useMemo(() => new Set(filter.values ?? []), [filter.values])
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (q ? options.filter((o) => o.value.toLowerCase().includes(q)) : options).slice(0, MAX_OPTIONS)
  }, [options, query])

  const toggle = (value: string, checked: boolean) => {
    const next = new Set(selected)
    if (checked) next.add(value)
    else next.delete(value)
    onChange([...next])
  }

  const searchId = `filter-search-${filter.id}`
  return (
    <div className="space-y-2">
      <Label htmlFor={searchId} className="font-handwritten-bold">
        {filter.column}
      </Label>
      <Input
        id={searchId}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Search ${options.length.toLocaleString()} values…`}
        className="h-8"
        autoFocus
      />
      <ScrollArea className="h-56 rounded-md border">
        <ul className="p-1" aria-label={`Values of ${filter.column}`}>
          {shown.map((option, i) => {
            const id = `${filter.id}-opt-${i}`
            return (
              <li key={option.value} className="hover:bg-accent flex items-center gap-2 rounded-sm px-2 py-1">
                <Checkbox
                  id={id}
                  checked={selected.has(option.value)}
                  onCheckedChange={(c) => toggle(option.value, c === true)}
                />
                <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer truncate text-sm">
                  {option.value}
                </label>
                <span className="text-muted-foreground text-xs tabular-nums">{option.count.toLocaleString()}</span>
              </li>
            )
          })}
          {shown.length === 0 && <li className="text-muted-foreground px-2 py-3 text-center text-sm">No matches</li>}
        </ul>
      </ScrollArea>
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>{selected.size.toLocaleString()} selected</span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => onChange([...new Set([...selected, ...shown.map((o) => o.value)])])}
          >
            Select shown
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            disabled={selected.size === 0}
            onClick={() => onChange([])}
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
  )
}

function parseOptionalNumber(text: string): number | undefined | null {
  if (text.trim() === "") return undefined
  const n = Number(text)
  return Number.isFinite(n) ? n : null
}

function RangeEditor({
  filter,
  rows,
  onChange,
}: {
  filter: DashboardFilter
  rows: readonly DataRow[]
  onChange: (min: number | undefined, max: number | undefined) => void
}) {
  const extent = useMemo(() => numericExtent(rows, filter.column), [rows, filter.column])
  const [minText, setMinText] = useState(filter.min !== undefined ? String(filter.min) : "")
  const [maxText, setMaxText] = useState(filter.max !== undefined ? String(filter.max) : "")

  const commit = (nextMin: string, nextMax: string) => {
    const min = parseOptionalNumber(nextMin)
    const max = parseOptionalNumber(nextMax)
    if (min === null || max === null) return
    onChange(min, max)
  }

  const minId = `filter-min-${filter.id}`
  const maxId = `filter-max-${filter.id}`
  return (
    <div className="space-y-3">
      <p className="font-handwritten-bold text-sm">{filter.column}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor={minId} className="text-xs">
            Min
          </Label>
          <Input
            id={minId}
            type="number"
            inputMode="decimal"
            className="h-8"
            value={minText}
            placeholder={extent ? String(extent.min) : undefined}
            onChange={(e) => {
              setMinText(e.target.value)
              commit(e.target.value, maxText)
            }}
            autoFocus
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={maxId} className="text-xs">
            Max
          </Label>
          <Input
            id={maxId}
            type="number"
            inputMode="decimal"
            className="h-8"
            value={maxText}
            placeholder={extent ? String(extent.max) : undefined}
            onChange={(e) => {
              setMaxText(e.target.value)
              commit(minText, e.target.value)
            }}
          />
        </div>
      </div>
      {extent && (
        <p className="text-muted-foreground text-xs">
          Data range: {formatValue(extent.min)} – {formatValue(extent.max)}. Rows without a value are excluded while a
          range is set.
        </p>
      )}
    </div>
  )
}

function DateEditor({
  filter,
  onChange,
}: {
  filter: DashboardFilter
  onChange: (from: string | undefined, to: string | undefined) => void
}) {
  const fromId = `filter-from-${filter.id}`
  const toId = `filter-to-${filter.id}`
  return (
    <div className="space-y-3">
      <p className="font-handwritten-bold text-sm">{filter.column}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor={fromId} className="text-xs">
            From
          </Label>
          <Input
            id={fromId}
            type="date"
            className="h-8"
            value={filter.from ?? ""}
            onChange={(e) => onChange(e.target.value || undefined, filter.to)}
            autoFocus
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={toId} className="text-xs">
            To
          </Label>
          <Input
            id={toId}
            type="date"
            className="h-8"
            value={filter.to ?? ""}
            onChange={(e) => onChange(filter.from, e.target.value || undefined)}
          />
        </div>
      </div>
    </div>
  )
}
