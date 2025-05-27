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
import { Plus, Database, BarChart3, Search, Settings, FileText, Code, Brain, Target } from "lucide-react"
import { useData, type CellType } from "@/lib/data-context"

interface CellTypeOption {
  type: CellType
  label: string
  description: string
  icon: React.ReactNode
  color: string
  requiresData?: boolean
}

const cellTypes: CellTypeOption[] = [
  {
    type: "data",
    label: "Data Table",
    description: "View and explore your dataset in a table format",
    icon: <Database className="h-5 w-5" />,
    color: "bg-blue-100 text-blue-800 border-blue-200",
    requiresData: true,
  },
  {
    type: "profile",
    label: "Data Profile",
    description: "Generate statistical summaries and data quality insights",
    icon: <BarChart3 className="h-5 w-5" />,
    color: "bg-green-100 text-green-800 border-green-200",
    requiresData: true,
  },
  {
    type: "missing-data",
    label: "Missing Data Analysis",
    description: "Analyze patterns and handle missing values in your data",
    icon: <Search className="h-5 w-5" />,
    color: "bg-orange-100 text-orange-800 border-orange-200",
    requiresData: true,
  },
  {
    type: "visualization",
    label: "Data Visualization",
    description: "Create interactive charts and graphs",
    icon: <BarChart3 className="h-5 w-5" />,
    color: "bg-purple-100 text-purple-800 border-purple-200",
    requiresData: true,
  },
  {
    type: "preprocessing",
    label: "Data Preprocessing",
    description: "Clean, transform, and prepare your data for analysis",
    icon: <Settings className="h-5 w-5" />,
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    requiresData: true,
  },
  {
    type: "text",
    label: "Text/Markdown",
    description: "Add notes, documentation, or explanations",
    icon: <FileText className="h-5 w-5" />,
    color: "bg-gray-100 text-gray-800 border-gray-200",
  },
  {
    type: "code",
    label: "Python Code",
    description: "Write and execute custom Python code",
    icon: <Code className="h-5 w-5" />,
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  {
    type: "ml-trainer",
    label: "ML Model Trainer",
    description: "Train machine learning models on your data",
    icon: <Brain className="h-5 w-5" />,
    color: "bg-red-100 text-red-800 border-red-200",
    requiresData: true,
  },
  {
    type: "ml-predictor",
    label: "ML Predictor",
    description: "Make predictions using trained models",
    icon: <Target className="h-5 w-5" />,
    color: "bg-pink-100 text-pink-800 border-pink-200",
    requiresData: true,
  },
  {
    type: "ml-insights",
    label: "ML Model Comparison",
    description: "Compare and analyze different machine learning models",
    icon: <Brain className="h-5 w-5" />,
    color: "bg-cyan-100 text-cyan-800 border-cyan-200",
    requiresData: true,
  },
]

interface CellAdditionPanelProps {
  insertIndex?: number
  onClose?: () => void
}

export function CellAdditionPanel({ insertIndex, onClose }: CellAdditionPanelProps) {
  const { addCell, processedData } = useData()
  const [isOpen, setIsOpen] = useState(false)

  const handleAddCell = (e: React.MouseEvent, cellType: CellType) => {
    e.preventDefault()
    e.stopPropagation()

    addCell(cellType, insertIndex)
    setIsOpen(false)
    onClose?.()
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

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="gap-2 hover:bg-primary/5 border-dashed"
          onClick={(e) => e.preventDefault()}
        >
          <Plus className="h-4 w-4" />
          Add Cell
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Cell</DialogTitle>
          <DialogDescription>Choose a cell type to add to your notebook</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Available Cells */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Available Cell Types</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableCells.map((cellType) => (
                <Card
                  key={cellType.type}
                  className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02] border-2"
                  onClick={(e) => handleAddCell(e, cellType.type)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {cellType.icon}
                        <CardTitle className="text-base">{cellType.label}</CardTitle>
                      </div>
                      <Badge variant="outline" className={cellType.color}>
                        {cellType.type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{cellType.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Unavailable Cells */}
          {unavailableCells.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-muted-foreground">Requires Data Upload</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {unavailableCells.map((cellType) => (
                  <Card key={cellType.type} className="opacity-50 cursor-not-allowed border-2 border-dashed">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {cellType.icon}
                          <CardTitle className="text-base">{cellType.label}</CardTitle>
                        </div>
                        <Badge variant="outline" className={cellType.color}>
                          {cellType.type}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{cellType.description}</p>
                      <p className="text-xs text-orange-600 mt-2">Upload data first to enable this cell type</p>
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
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
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
    <div className={`flex justify-center py-2 ${className}`}>
      <CellAdditionPanel insertIndex={insertIndex} />
    </div>
  )
}
