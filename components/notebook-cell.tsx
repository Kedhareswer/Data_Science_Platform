"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, GripVertical, Trash2, Play, Square } from "lucide-react"
import type { NotebookCell as NotebookCellType } from "@/lib/data-context"

// Import cell components
import { DataTable } from "@/components/data-table"
import { DataProfiler } from "@/components/data-profiler"
import { MissingDataExplorer } from "@/components/missing-data-explorer"
import { InteractiveDataVisualizer } from "@/components/interactive-data-visualizer"
import { DataPreprocessor } from "@/components/data-preprocessor"
import { TextEditor } from "@/components/text-editor"
import { EnhancedPythonEditor } from "@/components/enhanced-python-editor"
import { EnhancedMLTrainer } from "@/components/enhanced-ml-trainer"
import { MLPredictor } from "@/components/ml-predictor"
import { MLModelComparison } from "@/components/ml-model-comparison"
import { AutoMLTrainer } from "@/components/auto-ml-trainer"

interface NotebookCellProps {
  cell: NotebookCellType
  index: number
  onUpdateTitle: (id: string, title: string) => void
  onRemove: (id: string) => void
  dragHandleProps?: any
  isExecuting?: boolean
}

const getCellTypeInfo = (type: string) => {
  const typeMap = {
    data: { label: "Data Table", color: "bg-blue-50 text-blue-700 border-blue-200", icon: "📊" },
    profile: { label: "Data Profile", color: "bg-green-50 text-green-700 border-green-200", icon: "📈" },
    "missing-data": { label: "Missing Data", color: "bg-orange-50 text-orange-700 border-orange-200", icon: "🔍" },
    visualization: { label: "Visualization", color: "bg-purple-50 text-purple-700 border-purple-200", icon: "📊" },
    preprocessing: { label: "Preprocessing", color: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: "🔧" },
    text: { label: "Text/Markdown", color: "bg-gray-50 text-gray-700 border-gray-200", icon: "📝" },
    code: { label: "Python Code", color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: "💻" },
    "ml-trainer": { label: "ML Trainer", color: "bg-red-50 text-red-700 border-red-200", icon: "🤖" },
    "ml-predictor": { label: "ML Predictor", color: "bg-pink-50 text-pink-700 border-pink-200", icon: "🔮" },
    "ml-insights": { label: "ML Insights", color: "bg-cyan-50 text-cyan-700 border-cyan-200", icon: "🧠" },
    "auto-ml": { label: "Auto ML", color: "bg-violet-50 text-violet-700 border-violet-200", icon: "✨" },
  }
  return typeMap[type as keyof typeof typeMap] || typeMap.text
}

export function NotebookCell({
  cell,
  index,
  onUpdateTitle,
  onRemove,
  dragHandleProps,
  isExecuting = false,
}: NotebookCellProps) {
  const [title, setTitle] = useState(cell.title)
  const [isEditing, setIsEditing] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
  }

  const handleTitleSubmit = () => {
    onUpdateTitle(cell.id, title)
    setIsEditing(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleTitleSubmit()
    } else if (e.key === "Escape") {
      setTitle(cell.title)
      setIsEditing(false)
    }
  }

  const handleRemoveClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    // Remove confirmation dialog to fix deletion issue
    onRemove(cell.id)
  }

  const handleRunCell = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsRunning(true)

    try {
      // Simulate cell execution
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      console.error("Error running cell:", error)
    } finally {
      setIsRunning(false)
    }
  }

  const typeInfo = getCellTypeInfo(cell.type)

  const renderCellContent = () => {
    try {
      switch (cell.type) {
        case "data":
          return <DataTable />
        case "profile":
          return <DataProfiler />
        case "missing-data":
          return <MissingDataExplorer />
        case "visualization":
          return <InteractiveDataVisualizer />
        case "preprocessing":
          return <DataPreprocessor />
        case "text":
          return <TextEditor />
        case "code":
          return <EnhancedPythonEditor />
        case "ml-trainer":
          return <EnhancedMLTrainer />
        case "ml-predictor":
          return <MLPredictor />
        case "ml-insights":
          return <MLModelComparison />
        case "auto-ml":
          return <AutoMLTrainer />
        default:
          return (
            <div className="p-8 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Unknown cell type: {cell.type}</p>
            </div>
          )
      }
    } catch (error) {
      return (
        <div className="p-8 text-center text-red-500">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>Error rendering cell: {error instanceof Error ? error.message : "Unknown error"}</p>
        </div>
      )
    }
  }

  return (
    <Card className="relative group hover:shadow-md transition-all duration-200 border-l-4 border-l-transparent hover:border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Drag Handle */}
            <div
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
              {...dragHandleProps}
              role="button"
              aria-label="Drag to reorder cell"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Cell Type Badge */}
            <Badge variant="outline" className={`${typeInfo.color} font-medium`}>
              <span className="mr-1">{typeInfo.icon}</span>
              {typeInfo.label}
            </Badge>

            {/* Cell Index */}
            <span className="text-xs text-muted-foreground font-mono">[{index + 1}]</span>

            {/* Execution Status */}
            {(isExecuting || isRunning) && (
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-600">Running</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Run Button */}
            {(cell.type === "code" || cell.type === "ml-trainer") && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRunCell}
                disabled={isRunning || isExecuting}
                className="h-8 w-8 p-0"
                title="Run cell"
              >
                {isRunning || isExecuting ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </Button>
            )}

            {/* Delete Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveClick}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
              title="Delete cell"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Cell Title */}
        <div className="mt-2">
          {isEditing ? (
            <Input
              type="text"
              value={title}
              onChange={handleTitleChange}
              onBlur={handleTitleSubmit}
              onKeyDown={handleTitleKeyDown}
              className="text-lg font-semibold"
              placeholder="Enter cell title..."
              autoFocus
            />
          ) : (
            <h3
              className="text-lg font-semibold cursor-pointer hover:text-primary transition-colors"
              onClick={() => setIsEditing(true)}
              title="Click to edit title"
            >
              {title || "Untitled Cell"}
            </h3>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="min-h-[200px]">{renderCellContent()}</div>
      </CardContent>
    </Card>
  )
}

export default NotebookCell
