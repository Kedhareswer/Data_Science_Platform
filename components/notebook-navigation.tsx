"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, FileText, BarChart3, Settings, Code, Brain, Search, Database, Target } from "lucide-react"
import { useData, type CellType } from "@/lib/data-context"
import { useNavigation } from "@/lib/navigation-context"

interface NotebookNavigationProps {
  currentCellId?: string
  onCellNavigate?: (cellId: string) => void
}

export function NotebookNavigation({ currentCellId, onCellNavigate }: NotebookNavigationProps) {
  const { notebookCells } = useData()
  const { navigateTo } = useNavigation()
  const [isOpen, setIsOpen] = useState(false)

  const getCellIcon = (type: CellType) => {
    const iconMap = {
      data: <Database className="h-4 w-4" />,
      profile: <BarChart3 className="h-4 w-4" />,
      "missing-data": <Search className="h-4 w-4" />,
      visualization: <BarChart3 className="h-4 w-4" />,
      preprocessing: <Settings className="h-4 w-4" />,
      text: <FileText className="h-4 w-4" />,
      code: <Code className="h-4 w-4" />,
      "ml-trainer": <Brain className="h-4 w-4" />,
      "ml-predictor": <Target className="h-4 w-4" />,
      "ml-insights": <Brain className="h-4 w-4" />,
    }
    return iconMap[type] || <FileText className="h-4 w-4" />
  }

  const getCellTypeLabel = (type: CellType) => {
    const labelMap = {
      data: "Data",
      profile: "Profile",
      "missing-data": "Missing Data",
      visualization: "Visualization",
      preprocessing: "Preprocessing",
      text: "Text",
      code: "Code",
      "ml-trainer": "ML Trainer",
      "ml-predictor": "ML Predictor",
      "ml-insights": "ML Insights",
    }
    return labelMap[type] || "Unknown"
  }

  const handleCellClick = (cellId: string, cellTitle: string, cellType: CellType) => {
    // Update navigation context with cell-specific metadata
    navigateTo("/notebook", "Data Notebook", cellTitle, {
      cellId,
      cellType,
      section: "notebook",
      subsection: "cell",
    })

    // Call the cell navigation callback if provided
    if (onCellNavigate) {
      onCellNavigate(cellId)
    }

    // Scroll to the cell
    const cellElement = document.getElementById(`cell-${cellId}`)
    if (cellElement) {
      cellElement.scrollIntoView({ behavior: "smooth", block: "center" })
    }

    setIsOpen(false)
  }

  const currentCell = notebookCells.find((cell) => cell.id === currentCellId)

  if (notebookCells.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      {/* Current Cell Indicator */}
      {currentCell && (
        <Card className="border-primary/20">
          <CardContent className="p-2">
            <div className="flex items-center gap-2">
              {getCellIcon(currentCell.type)}
              <span className="text-sm font-medium">{currentCell.title}</span>
              <Badge variant="outline" className="text-xs">
                {getCellTypeLabel(currentCell.type)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cell Navigation Dropdown */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <span>Navigate to Cell</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
          <div className="px-2 py-1.5 text-sm font-medium border-b">Notebook Cells ({notebookCells.length})</div>
          {notebookCells.map((cell, index) => (
            <DropdownMenuItem
              key={cell.id}
              onClick={() => handleCellClick(cell.id, cell.title, cell.type)}
              className={`flex items-center gap-3 p-3 ${currentCellId === cell.id ? "bg-muted" : ""}`}
            >
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-mono text-muted-foreground w-6">[{index + 1}]</span>
                {getCellIcon(cell.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{cell.title}</span>
                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    {getCellTypeLabel(cell.type)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Created {cell.createdAt.toLocaleDateString()}</p>
              </div>

              {currentCellId === cell.id && (
                <Badge variant="default" className="text-xs">
                  Current
                </Badge>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Quick Navigation Buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const currentIndex = notebookCells.findIndex((cell) => cell.id === currentCellId)
            if (currentIndex > 0) {
              const prevCell = notebookCells[currentIndex - 1]
              handleCellClick(prevCell.id, prevCell.title, prevCell.type)
            }
          }}
          disabled={!currentCellId || notebookCells.findIndex((cell) => cell.id === currentCellId) === 0}
          className="h-8 w-8 p-0"
          title="Previous cell"
        >
          ↑
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const currentIndex = notebookCells.findIndex((cell) => cell.id === currentCellId)
            if (currentIndex < notebookCells.length - 1) {
              const nextCell = notebookCells[currentIndex + 1]
              handleCellClick(nextCell.id, nextCell.title, nextCell.type)
            }
          }}
          disabled={
            !currentCellId || notebookCells.findIndex((cell) => cell.id === currentCellId) === notebookCells.length - 1
          }
          className="h-8 w-8 p-0"
          title="Next cell"
        >
          ↓
        </Button>
      </div>
    </div>
  )
}
