"use client"

import { memo, useDeferredValue, useId, useMemo, useState } from "react"
import Papa from "papaparse"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Search,
  X,
} from "lucide-react"
import { DataUploadPrompt } from "@/components/data-upload-prompt"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCellContent, useData } from "@/lib/data-context"
import { type CellValue, type ColumnType, type ColumnTypes, type DataRow, isMissing } from "@/lib/data/types"
import { baseName, downloadText } from "@/lib/notebook"
import { cn } from "@/lib/utils"
import type { CellProps } from "./types"

const PAGE_SIZES = [10, 25, 50, 100] as const

interface SortState {
  column: string
  direction: "asc" | "desc"
}

export interface DataTableCellContent {
  pageSize: number
  sort: SortState | null
}

const FALLBACK: DataTableCellContent = { pageSize: 25, sort: null }

const TYPE_BADGE: Record<ColumnType, { label: string; className: string }> = {
  number: { label: "123", className: "bg-primary/10 text-primary" },
  string: { label: "abc", className: "bg-muted text-muted-foreground" },
  boolean: { label: "t/f", className: "bg-warning/15 text-warning" },
  date: { label: "date", className: "bg-success/15 text-success" },
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" })

function toNumber(value: CellValue): number {
  if (typeof value === "number") return value
  if (typeof value === "boolean") return value ? 1 : 0
  const n = Number(value)
  return Number.isNaN(n) ? Number.POSITIVE_INFINITY : n
}

/** Sort rows by one column; missing values always go last. Returns a new array. */
function sortRows(rows: DataRow[], sort: SortState, type: ColumnType | undefined): DataRow[] {
  const { column } = sort
  const dir = sort.direction === "asc" ? 1 : -1
  const numeric = type === "number" || type === "boolean"
  // Decorate-sort-undecorate keeps comparisons cheap on large tables.
  const decorated = rows.map((row, index) => ({ row, index, value: row[column] }))
  decorated.sort((a, b) => {
    const am = isMissing(a.value)
    const bm = isMissing(b.value)
    if (am || bm) return am === bm ? a.index - b.index : am ? 1 : -1
    let cmp: number
    if (numeric || (typeof a.value === "number" && typeof b.value === "number")) {
      cmp = toNumber(a.value) - toNumber(b.value)
    } else {
      cmp = collator.compare(String(a.value), String(b.value))
    }
    return cmp === 0 ? a.index - b.index : cmp * dir
  })
  return decorated.map((d) => d.row)
}

function formatCell(value: CellValue): string {
  if (typeof value === "number")
    return Number.isInteger(value) ? value.toLocaleString() : String(Number(value.toPrecision(8)))
  return String(value)
}

export function DataTableCell({ cellId }: CellProps) {
  const { processedData, columns, columnTypes, fileName } = useData()
  const [settings, setSettings] = useCellContent<DataTableCellContent>(cellId, FALLBACK)
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(0)
  const searchId = useId()
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())

  const pageSize = PAGE_SIZES.includes(settings.pageSize as (typeof PAGE_SIZES)[number])
    ? settings.pageSize
    : FALLBACK.pageSize
  const sort = settings.sort && columns.includes(settings.sort.column) ? settings.sort : null

  // One lowercase haystack per row, built once per dataset.
  const searchIndex = useMemo(
    () =>
      processedData.map((row) => {
        let text = ""
        for (const c of columns) {
          const v = row[c]
          if (v !== null && v !== undefined) text += `${String(v).toLowerCase()}\u0000`
        }
        return text
      }),
    [processedData, columns],
  )

  const filtered = useMemo(() => {
    if (!deferredQuery) return processedData
    const out: DataRow[] = []
    for (let i = 0; i < processedData.length; i++)
      if (searchIndex[i].includes(deferredQuery)) out.push(processedData[i])
    return out
  }, [processedData, searchIndex, deferredQuery])

  const sorted = useMemo(
    () => (sort ? sortRows(filtered, sort, columnTypes[sort.column]) : filtered),
    [filtered, sort, columnTypes],
  )

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, pageCount - 1)
  const pageRows = useMemo(
    () => sorted.slice(currentPage * pageSize, currentPage * pageSize + pageSize),
    [sorted, currentPage, pageSize],
  )

  if (processedData.length === 0) {
    return (
      <DataUploadPrompt
        title="No data to show yet"
        description="Load a dataset and it will appear here as a searchable, sortable table."
      />
    )
  }

  const toggleSort = (column: string) => {
    setPage(0)
    setSettings((prev) => {
      const current = prev.sort?.column === column ? prev.sort.direction : null
      const next: SortState | null =
        current === null ? { column, direction: "asc" } : current === "asc" ? { column, direction: "desc" } : null
      return { ...prev, sort: next }
    })
  }

  const download = (format: "csv" | "json") => {
    const name = `${baseName(fileName)}${deferredQuery ? "-filtered" : ""}`
    if (format === "csv") downloadText(Papa.unparse(sorted, { columns }), `${name}.csv`, "text/csv")
    else downloadText(JSON.stringify(sorted, null, 2), `${name}.json`, "application/json")
  }

  const first = sorted.length === 0 ? 0 : currentPage * pageSize + 1
  const last = Math.min(sorted.length, (currentPage + 1) * pageSize)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <label htmlFor={searchId} className="sr-only">
            Search all columns
          </label>
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(0)
            }}
            placeholder="Search every column…"
            className="font-handwritten h-9 pr-8 pl-8"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-2 -translate-y-1/2 rounded-sm focus-visible:ring-2 focus-visible:outline-hidden"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="font-handwritten" disabled={sorted.length === 0}>
              <Download aria-hidden="true" />
              Download view
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => download("csv")}>
              CSV ({sorted.length.toLocaleString()} rows)
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => download("json")}>
              JSON ({sorted.length.toLocaleString()} rows)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="max-h-[32rem] overflow-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            {fileName ?? "Dataset"} — page {currentPage + 1} of {pageCount}
          </caption>
          <thead className="bg-muted sticky top-0 z-10">
            <tr>
              {columns.map((column) => (
                <HeaderCell key={column} column={column} type={columnTypes[column]} sort={sort} onSort={toggleSort} />
              ))}
            </tr>
          </thead>
          <TableBody rows={pageRows} columns={columns} columnTypes={columnTypes} />
        </table>
        {sorted.length === 0 && (
          <p className="font-handwritten text-muted-foreground p-6 text-center">No rows match “{query}”.</p>
        )}
      </div>

      <div className="font-handwritten text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-sm">
        <p aria-live="polite">
          {sorted.length === 0
            ? "0 rows"
            : `Showing ${first.toLocaleString()}–${last.toLocaleString()} of ${sorted.length.toLocaleString()} rows`}
          {deferredQuery && ` (filtered from ${processedData.length.toLocaleString()})`} · {columns.length} columns
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPage(0)
              setSettings((prev) => ({ ...prev, pageSize: Number(v) }))
            }}
          >
            <SelectTrigger className="h-8 w-20" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <nav aria-label="Table pagination" className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(0)}
              disabled={currentPage === 0}
              aria-label="First page"
            >
              <ChevronsLeft aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 0}
              aria-label="Previous page"
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span className="min-w-20 text-center text-xs tabular-nums">
              {currentPage + 1} / {pageCount}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= pageCount - 1}
              aria-label="Next page"
            >
              <ChevronRight aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(pageCount - 1)}
              disabled={currentPage >= pageCount - 1}
              aria-label="Last page"
            >
              <ChevronsRight aria-hidden="true" />
            </Button>
          </nav>
        </div>
      </div>
    </div>
  )
}

function HeaderCell({
  column,
  type,
  sort,
  onSort,
}: {
  column: string
  type: ColumnType | undefined
  sort: SortState | null
  onSort: (column: string) => void
}) {
  const active = sort?.column === column ? sort.direction : null
  const badge = type ? TYPE_BADGE[type] : null
  const SortIcon = active === "asc" ? ArrowUp : active === "desc" ? ArrowDown : ArrowUpDown
  return (
    <th
      scope="col"
      aria-sort={active === "asc" ? "ascending" : active === "desc" ? "descending" : "none"}
      className="text-foreground border-b p-0 text-left font-semibold whitespace-nowrap"
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className="hover:bg-accent focus-visible:ring-ring flex w-full items-center gap-1.5 px-3 py-2 focus-visible:ring-2 focus-visible:outline-hidden focus-visible:ring-inset"
        title={`Sort by ${column}`}
      >
        <span className="font-handwritten-bold">{column}</span>
        {badge && (
          <span
            className={cn("rounded px-1 font-mono text-[10px] font-normal", badge.className)}
            title={`${type} column`}
          >
            {badge.label}
          </span>
        )}
        <SortIcon
          className={cn("ml-auto h-3.5 w-3.5", active ? "text-foreground" : "text-muted-foreground/60")}
          aria-hidden="true"
        />
      </button>
    </th>
  )
}

const TableBody = memo(function TableBody({
  rows,
  columns,
  columnTypes,
}: {
  rows: DataRow[]
  columns: string[]
  columnTypes: ColumnTypes
}) {
  return (
    <tbody>
      {rows.map((row, r) => (
        <tr key={r} className="odd:bg-card even:bg-muted/30 hover:bg-accent/40 border-b last:border-0">
          {columns.map((column) => {
            const value = row[column]
            const numeric = columnTypes[column] === "number"
            return (
              <td
                key={column}
                className={cn(
                  "max-w-xs truncate px-3 py-1.5 whitespace-nowrap",
                  numeric && "text-right font-mono tabular-nums",
                )}
              >
                {isMissing(value) ? (
                  <span className="text-muted-foreground font-mono text-xs italic">null</span>
                ) : (
                  formatCell(value)
                )}
              </td>
            )
          })}
        </tr>
      ))}
    </tbody>
  )
})
