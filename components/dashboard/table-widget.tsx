"use client"

import { memo, useMemo, useState } from "react"
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react"
import type { TableWidget } from "@/lib/dashboard"
import type { CellValue, ColumnTypes, DataRow } from "@/lib/data/types"
import { isMissing } from "@/lib/data/types"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { WidgetMessage } from "@/components/dashboard/widget-message"
import { cn } from "@/lib/utils"

interface TableWidgetViewProps {
  widget: TableWidget
  rows: readonly DataRow[]
  columns: readonly string[]
  columnTypes: ColumnTypes
}

type SortState = { column: string; dir: "asc" | "desc" } | null

function compareCells(a: CellValue | undefined, b: CellValue | undefined): number {
  const am = isMissing(a)
  const bm = isMissing(b)
  if (am || bm) return am === bm ? 0 : am ? 1 : -1
  if (typeof a === "number" && typeof b === "number") return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true })
}

function renderCell(value: CellValue | undefined) {
  if (isMissing(value)) return <span className="text-muted-foreground">—</span>
  if (typeof value === "number") return value.toLocaleString(undefined, { maximumFractionDigits: 4 })
  return String(value)
}

function TableWidgetViewImpl({ widget, rows, columns, columnTypes }: TableWidgetViewProps) {
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<SortState>(null)

  const visibleColumns = useMemo(() => {
    const wanted = widget.columns.length > 0 ? widget.columns : columns
    return wanted.filter((c) => c in columnTypes)
  }, [widget.columns, columns, columnTypes])

  const sorted = useMemo(() => {
    if (!sort || !visibleColumns.includes(sort.column)) return rows
    const factor = sort.dir === "asc" ? 1 : -1
    const col = sort.column
    return [...rows].sort((a, b) => {
      const c = compareCells(a[col], b[col])
      // Missing values stay last regardless of direction.
      return isMissing(a[col]) || isMissing(b[col]) ? c : c * factor
    })
  }, [rows, sort, visibleColumns])

  const pageSize = Math.max(1, widget.pageSize)
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const current = Math.min(page, pageCount - 1)
  const pageRows = sorted.slice(current * pageSize, current * pageSize + pageSize)

  if (visibleColumns.length === 0) return <WidgetMessage>None of the selected columns are in the current data.</WidgetMessage>
  if (rows.length === 0) return <WidgetMessage>No rows match the current filters.</WidgetMessage>

  const toggleSort = (column: string) => {
    setPage(0)
    setSort((prev) =>
      prev?.column !== column ? { column, dir: "asc" } : prev.dir === "asc" ? { column, dir: "desc" } : null,
    )
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="min-h-0 flex-1 overflow-auto rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
            <TableRow>
              {visibleColumns.map((column) => {
                const active = sort?.column === column
                return (
                  <TableHead
                    key={column}
                    aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                    className={cn("whitespace-nowrap", columnTypes[column] === "number" && "text-right")}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(column)}
                      className="inline-flex items-center gap-1 rounded-sm font-semibold hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      {column}
                      {active &&
                        (sort.dir === "asc" ? (
                          <ArrowUp className="size-3" aria-hidden />
                        ) : (
                          <ArrowDown className="size-3" aria-hidden />
                        ))}
                    </button>
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((row, i) => (
              <TableRow key={current * pageSize + i}>
                {visibleColumns.map((column) => (
                  <TableCell
                    key={column}
                    className={cn(
                      "max-w-64 truncate py-2",
                      columnTypes[column] === "number" && "text-right font-mono text-xs tabular-nums",
                    )}
                  >
                    {renderCell(row[column])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {(current * pageSize + 1).toLocaleString()}–{Math.min(sorted.length, (current + 1) * pageSize).toLocaleString()} of{" "}
          {sorted.length.toLocaleString()}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Previous page"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft />
          </Button>
          <span aria-live="polite">
            Page {current + 1} / {pageCount.toLocaleString()}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Next page"
            disabled={current >= pageCount - 1}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  )
}

export const TableWidgetView = memo(TableWidgetViewImpl)
