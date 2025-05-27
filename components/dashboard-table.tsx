"use client"

import { useState, useEffect, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Settings, Search } from "lucide-react"
import { useData } from "@/lib/data-context"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DashboardTableProps {
  config: {
    columns: string[]
    pageSize: number
  }
}

export function DashboardTable({ config }: DashboardTableProps) {
  const { processedData, columns } = useData()
  const [searchTerm, setSearchTerm] = useState("")
  const [visibleColumns, setVisibleColumns] = useState<string[]>(config.columns || [])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(config.pageSize || 5)
  const [showSettings, setShowSettings] = useState(false)

  // Update visible columns when columns change
  useEffect(() => {
    if (columns.length > 0 && visibleColumns.length === 0) {
      setVisibleColumns(columns.slice(0, 5)) // Default to first 5 columns
    }
  }, [columns, visibleColumns])

  const filteredData = useMemo(() => {
    if (!processedData || processedData.length === 0) return []

    return processedData.filter((row) => {
      if (!row || typeof row !== "object") return false

      // If no search term, include all rows with visible columns
      if (!searchTerm.trim()) {
        return visibleColumns.some((col) => col in row)
      }

      return Object.entries(row).some(([key, value]) => {
        if (!visibleColumns.includes(key)) return false
        if (value === null || value === undefined) return false

        try {
          const stringValue = String(value).toLowerCase()
          return stringValue.includes(searchTerm.toLowerCase())
        } catch (error) {
          console.warn(`Error converting value to string for column ${key}:`, error)
          return false
        }
      })
    })
  }, [processedData, searchTerm, visibleColumns])

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize))
  const currentPageSafe = Math.min(Math.max(1, currentPage), totalPages)
  const startIndex = (currentPageSafe - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, filteredData.length)
  const paginatedData = filteredData.slice(startIndex, endIndex)

  // Update current page if it's out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const toggleColumn = (column: string) => {
    setVisibleColumns((prev) => (prev.includes(column) ? prev.filter((col) => col !== column) : [...prev, column]))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search data..."
            className="pl-8 sketch-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Popover open={showSettings} onOpenChange={setShowSettings}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="sketch-button">
              <Settings className="h-4 w-4 mr-2" />
              Table Settings
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Visible Columns</Label>
                <div className="grid grid-cols-2 gap-2">
                  {columns.map((column) => (
                    <div key={column} className="flex items-center space-x-2">
                      <Checkbox
                        id={`column-${column}`}
                        checked={visibleColumns.includes(column)}
                        onCheckedChange={() => toggleColumn(column)}
                      />
                      <Label htmlFor={`column-${column}`} className="truncate">
                        {column}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rows Per Page</Label>
                <div className="flex gap-2">
                  {[5, 10, 15, 20].map((size) => (
                    <Button
                      key={size}
                      variant={pageSize === size ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPageSize(size)}
                      className="sketch-button"
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="rounded-md border-2 border-gray-800 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(
                (column) =>
                  visibleColumns.includes(column) && (
                    <TableHead key={column} className="font-medium whitespace-nowrap">
                      {column}
                    </TableHead>
                  ),
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIndex) => (
                <TableRow key={`row-${rowIndex}`}>
                  {columns.map(
                    (column) =>
                      visibleColumns.includes(column) && (
                        <TableCell key={`${rowIndex}-${column}`} className="max-w-[200px] truncate">
                          {(() => {
                            try {
                              const value = row[column]
                              if (value === null || value === undefined) return "—"
                              if (typeof value === "object") {
                                return JSON.stringify(value).length > 50
                                  ? `${JSON.stringify(value).substring(0, 47)}...`
                                  : JSON.stringify(value)
                              }
                              const stringValue = String(value)
                              return stringValue.length > 50 ? `${stringValue.substring(0, 47)}...` : stringValue
                            } catch (error) {
                              console.warn(`Error rendering cell value for column ${column}:`, error)
                              return "Error"
                            }
                          })()}
                        </TableCell>
                      ),
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={visibleColumns.length} className="h-24 text-center">
                  {searchTerm ? `No results found for "${searchTerm}"` : "No data available"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1

              // Adjust page numbers for large datasets
              if (totalPages > 5) {
                if (currentPage > 3 && currentPage < totalPages - 1) {
                  pageNum = currentPage - 2 + i
                } else if (currentPage >= totalPages - 1) {
                  pageNum = totalPages - 4 + i
                }
              }

              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink isActive={currentPage === pageNum} onClick={() => setCurrentPage(pageNum)}>
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              )
            })}

            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <div className="text-xs text-muted-foreground">
        Showing {paginatedData.length} of {filteredData.length} rows
        {filteredData.length !== processedData.length && ` (filtered from ${processedData.length} total rows)`}
      </div>
    </div>
  )
}
