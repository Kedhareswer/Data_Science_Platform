"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Database, BarChart3, Search, Settings, FileText, Code, Brain, Target, Sparkles } from "lucide-react"
import { useData, type CellType } from "@/lib/data-context"
import { useToast } from "@/hooks/use-toast"

interface CellTypeOption {
  type: CellType
  label: string
  description: string
  icon: React.ReactNode
  color: string
  requiresData?: boolean
  category: "data" | "analysis" | "ml" | "utility"
}

const cellTypes: CellTypeOption[] = [
  {
    type: "data",
    label: "Data Table",
    description: "View and explore your dataset in a table format",
    icon: <Database className="h-5 w-5" />,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    requiresData: true,
    category: "data",
  },
  {
    type: "profile",
    label: "Data Profile",
    description: "Generate statistical summaries and data quality insights",
    icon: <BarChart3 className="h-5 w-5" />,
    color: "bg-green-50 text-green-700 border-green-200",
    requiresData: true,
    category: "analysis",
  },
  {
    type: "missing-data",
    label: "Missing Data Analysis",
    description: "Analyze patterns and handle missing values in your data",
    icon: <Search className="h-5 w-5" />,
    color: "bg-orange-50 text-orange-700 border-orange-200",
    requiresData: true,
    category: "analysis",
  },
  {
    type: "visualization",
    label: "Data Visualization",
    description: "Create interactive charts and graphs",
    icon: <BarChart3 className="h-5 w-5" />,
    color: "bg-purple-50 text-purple-700 border-purple-200",
    requiresData: true,
    category: "analysis",
  },
  {
    type: "preprocessing",
    label: "Data Preprocessing",
    description: "Clean, transform, and prepare your data for analysis",
    icon: <Settings className="h-5 w-5" />,
    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
    requiresData: true,
    category: "analysis",
  },
  {
    type: "text",
    label: "Text/Markdown",
    description: "Add notes, documentation, or explanations",
    icon: <FileText className="h-5 w-5" />,
    color: "bg-gray-50 text-gray-700 border-gray-200",
    category: "utility",
  },
  {
    type: "code",
    label: "Python Code",
    description: "Write and execute custom Python code",
    icon: <Code className="h-5 w-5" />,
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    category: "utility",
  },
  {
    type: "ml-trainer",
    label: "ML Model Trainer",
    description: "Train machine learning models on your data",
    icon: <Brain className="h-5 w-5" />,
    color: "bg-red-50 text-red-700 border-red-200",
    requiresData: true,
    category: "ml",
  },
  {
    type: "ml-predictor",
    label: "ML Predictor",
    description: "Make predictions using trained models",
    icon: <Target className="h-5 w-5" />,
    color: "bg-pink-50 text-pink-700 border-pink-200",
    requiresData: true,
    category: "ml",
  },
  {
    type: "ml-insights",
    label: "ML Model Comparison",
    description: "Compare and analyze different machine learning models",
    icon: <Sparkles className="h-5 w-5" />,
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
    requiresData: true,
    category: "ml",
  },
  {
    type: "auto-ml",
    label: "Auto ML Trainer",
    description: "Automatically train and compare multiple ML models",
    icon: <Sparkles className="h-5 w-5" />,
    color: "bg-violet-50 text-violet-700 border-violet-200",
    requiresData: true,
    category: "ml",
  },
]

const categoryLabels = {
  data: "Data Management",
  analysis: "Data Analysis",
  ml: "Machine Learning",
  utility: "Utilities",
}

interface CellAdditionPanelProps {
  insertIndex?: number
  onClose?: () => void
}

export function CellAdditionPanel({ insertIndex, onClose }: CellAdditionPanelProps) {
  const { addCell, processedData } = useData()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)

  const handleAddCell = (e: React.MouseEvent, cellType: CellType) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      const cellId = addCell(cellType, insertIndex)
      const cellInfo = cellTypes.find((ct) => ct.type === cellType)

      toast({
        title: "Cell added",
        description: `Added ${cellInfo?.label || cellType} cell to notebook`
      })

      setIsOpen(false)
      onClose?.()

      // Scroll to the new cell after a brief delay
      setTimeout(() => {
        const cellElement = document.getElementById(`cell-${cellId}`)
        if (cellElement) {
          cellElement.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      }, 100)
    } catch (error) {
      toast({
        title: "Failed to add cell",
        description: "There was an error adding the cell to your notebook",
        variant: "destructive"
      })
    }
  }

  const handleDialogOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      onClose?.()
    }
  }

  const availableCells = cellTypes.filter((cellType) => {
    if (cellType.requiresData && processedData.length === 0) {
      return false
    }
    return true
  })

  const unavailableCells = cellTypes.filter((cellType) => {
    if (cellType.requiresData && processedData.length === 0) {
      return true
    }
    return false
  })

  const groupedAvailableCells = availableCells.reduce(
    (acc, cell) => {
      if (!acc[cell.category]) {
        acc[cell.category] = []
      }
      acc[cell.category].push(cell)
      return acc
    },
    {} as Record<string, CellTypeOption[]>,
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="gap-2 hover:bg-primary/5 border-dashed border-2 hover:border-primary/20 transition-all duration-200"
          onClick={(e) => {
            e.preventDefault();
            setIsOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add Cell
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Add New Cell</DialogTitle>
          <DialogDescription>
            Choose a cell type to add to your notebook.{" "}
            {insertIndex !== undefined
              ? `Will be inserted at position ${insertIndex + 1}.`
              : "Will be added to the end."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8">
          {/* Available Cells by Category */}
          {Object.entries(groupedAvailableCells).map(([category, cells]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                {categoryLabels[category as keyof typeof categoryLabels]}
                <Badge variant="secondary" className="text-xs">
                  {cells.length} available
                </Badge>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cells.map((cellType) => (
                  <Card
                    key={cellType.type}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-2 hover:border-primary/20 group"
                    onClick={(e) => handleAddCell(e, cellType.type)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                            {cellType.icon}
                          </div>
                          <CardTitle className="text-base">{cellType.label}</CardTitle>
                        </div>
                        <Badge variant="outline" className={`${cellType.color} text-xs`}>
                          {cellType.type}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground">{cellType.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {/* Unavailable Cells */}
          {unavailableCells.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-muted-foreground flex items-center gap-2">
                Requires Data Upload
                <Badge variant="outline" className="text-xs">
                  {unavailableCells.length} disabled
                </Badge>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unavailableCells.map((cellType) => (
                  <Card key={cellType.type} className="opacity-50 cursor-not-allowed border-2 border-dashed">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-muted">{cellType.icon}</div>
                          <CardTitle className="text-base">{cellType.label}</CardTitle>
                        </div>
                        <Badge variant="outline" className={`${cellType.color} text-xs`}>
                          {cellType.type}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground">{cellType.description}</p>
                      <p className="text-xs text-orange-600 mt-2 font-medium">
                        Upload data first to enable this cell type
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface FloatingAddButtonProps {
  className?: string
}

export function FloatingAddButton({ className }: FloatingAddButtonProps) {
  return (
    <div className={`fixed bottom-8 right-8 z-40 ${className}`}>
      <CellAdditionPanel />
    </div>
  )
}

interface QuickAddButtonProps {
  insertIndex?: number
  className?: string
}

export function QuickAddButton({ insertIndex, className }: QuickAddButtonProps) {
  return (
    <div className={`flex justify-center ${className}`}>
      <div className="transition-all duration-200 opacity-100 hover:scale-105">
        <CellAdditionPanel insertIndex={insertIndex} />
      </div>
    </div>
  )
}
