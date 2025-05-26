"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useData } from "@/lib/data-context"
import { Filter, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

interface DashboardFilterProps {
  config: {
    columns: string[]
  }
}

export function DashboardFilter({ config }: DashboardFilterProps) {
  const { columns, columnTypes } = useData()
  const [selectedColumns, setSelectedColumns] = useState<string[]>(config.columns || [])
  const [filters, setFilters] = useState<Array<{ column: string; operator: string; value: string }>>([])
  const [showSettings, setShowSettings] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Array<{ column: string; operator: string; value: string }>>([])

  // Set default columns when columns change
  useEffect(() => {
    if (columns.length > 0 && selectedColumns.length === 0) {
      setSelectedColumns(columns.slice(0, 3)) // Default to first 3 columns
    }
  }, [columns, selectedColumns])

  const handleColumnToggle = (column: string) => {
    setSelectedColumns((prev) => (prev.includes(column) ? prev.filter((col) => col !== column) : [...prev, column]))
  }

  const addFilter = () => {
    setFilters([...filters, { column: selectedColumns[0] || "", operator: "equal", value: "" }])
  }

  const updateFilter = (index: number, field: string, value: string) => {
    try {
      const newFilters = [...filters]
      if (newFilters[index]) {
        newFilters[index] = { ...newFilters[index], [field]: value }
        setFilters(newFilters)
      }
    } catch (error) {
      console.error("Error updating filter:", error)
    }
  }

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index))
  }

  const applyFilters = () => {
    try {
      const validFilters = filters.filter(
        (filter) =>
          filter.column &&
          filter.operator &&
          filter.value !== null &&
          filter.value !== undefined &&
          filter.value !== "",
      )
      setActiveFilters([...validFilters])
      setShowSettings(false)
    } catch (error) {
      console.error("Error applying filters:", error)
    }
  }

  const removeActiveFilter = (index: number) => {
    try {
      if (index >= 0 && index < activeFilters.length) {
        setActiveFilters(activeFilters.filter((_, i) => i !== index))
      }
    } catch (error) {
      console.error("Error removing filter:", error)
    }
  }

  const getOperatorLabel = (operator: string) => {
    switch (operator) {
      case "equal":
        return "="
      case "notEqual":
        return "≠"
      case "greater":
        return ">"
      case "less":
        return "<"
      case "contains":
        return "contains"
      default:
        return operator
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter, index) => (
            <Badge key={index} variant="outline" className="sketch-card py-1 px-2">
              <span className="font-medium">{filter.column}</span>
              <span className="mx-1">{getOperatorLabel(filter.operator)}</span>
              <span>"{filter.value}"</span>
              <Button variant="ghost" size="sm" className="h-4 w-4 p-0 ml-2" onClick={() => removeActiveFilter(index)}>
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          {activeFilters.length === 0 && <span className="text-sm text-muted-foreground">No active filters</span>}
        </div>

        <Popover open={showSettings} onOpenChange={setShowSettings}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="sketch-button">
              <Filter className="h-4 w-4 mr-2" />
              Configure Filters
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Available Columns</Label>
                <div className="grid grid-cols-2 gap-2">
                  {columns.map((column) => (
                    <div key={column} className="flex items-center space-x-2">
                      <Checkbox
                        id={`column-${column}`}
                        checked={selectedColumns.includes(column)}
                        onCheckedChange={() => handleColumnToggle(column)}
                      />
                      <Label htmlFor={`column-${column}`} className="truncate">
                        {column}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Filter Conditions</Label>
                  <Button variant="outline" size="sm" onClick={addFilter} className="h-8 sketch-button">
                    Add Filter
                  </Button>
                </div>

                <div className="space-y-3">
                  {filters.map((filter, index) => (
                    <div key={index} className="flex flex-col gap-2 p-2 border rounded-md">
                      <div className="flex justify-between items-center">
                        <Label>Filter {index + 1}</Label>
                        <Button variant="ghost" size="sm" onClick={() => removeFilter(index)} className="h-6 w-6 p-0">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <Select
                        value={filter.column || "default"}
                        onValueChange={(value) => updateFilter(index, "column", value === "default" ? "" : value)}
                      >
                        <SelectTrigger className="sketch-input">
                          <SelectValue placeholder="Column" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedColumns.map((col) => (
                            <SelectItem key={col} value={col || `col-${col}`}>
                              {col}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={filter.operator || "equal"}
                        onValueChange={(value) => updateFilter(index, "operator", value)}
                      >
                        <SelectTrigger className="sketch-input">
                          <SelectValue placeholder="Operator" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equal">Equal to</SelectItem>
                          <SelectItem value="notEqual">Not equal to</SelectItem>
                          <SelectItem value="greater">Greater than</SelectItem>
                          <SelectItem value="less">Less than</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        placeholder="Value"
                        value={filter.value}
                        onChange={(e) => updateFilter(index, "value", e.target.value)}
                        className="sketch-input"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={applyFilters} className="sketch-button">
                Apply Filters
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
