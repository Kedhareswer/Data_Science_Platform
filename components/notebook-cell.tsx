"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { GripVertical, Play, Square, Edit2, Trash2, Check, X, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { DataPreprocessor } from "@/components/data-preprocessor"
import { DataProfiler } from "@/components/data-profiler"
import { TextEditor } from "@/components/text-editor"
import { MLModelTrainer } from "@/components/ml-model-trainer"
import { MLPredictor } from "@/components/ml-predictor"
import { MLModelComparison } from "@/components/ml-model-comparison"
import { MissingDataExplorer } from "@/components/missing-data-explorer"
import { InteractiveDataVisualizer } from "@/components/interactive-data-visualizer"
import type { NotebookCell as NotebookCellType } from "@/lib/data-context"
import { PythonCodeEditor } from "@/components/python-code-editor"

interface NotebookCellProps {
  cell: NotebookCellType
  index: number
  onUpdateTitle: (id: string, title: string) => void
  onRemove: (id: string) => void
  dragHandleProps?: any
  isExecuting?: boolean
}

type CellStatus = "idle" | "running" | "completed" | "error"

export function NotebookCell({
  cell,
  index,
  onUpdateTitle,
  onRemove,
  dragHandleProps,
  isExecuting = false,
}: NotebookCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(cell.title)
  const [cellStatus, setCellStatus] = useState<CellStatus>("idle")
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleSaveTitle = () => {
    onUpdateTitle(cell.id, editTitle)
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditTitle(cell.title)
    setIsEditing(false)
  }

  const handleExecuteCell = async () => {
    setCellStatus("running")
    // Simulate execution
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setCellStatus("completed")
    setTimeout(() => setCellStatus("idle"), 3000)
  }

  const getCellTypeInfo = (type: string) => {
    const typeMap = {
      data: { label: "Data", color: "bg-blue-100 text-blue-800", icon: "📊" },
      profile: { label: "Profile", color: "bg-green-100 text-green-800", icon: "📈" },
      "missing-data": { label: "Missing Data", color: "bg-orange-100 text-orange-800", icon: "🔍" },
      visualization: { label: "Visualizer", color: "bg-purple-100 text-purple-800", icon: "📊" },
      preprocessing: { label: "Preprocessing", color: "bg-yellow-100 text-yellow-800", icon: "🔧" },
      text: { label: "Text", color: "bg-gray-100 text-gray-800", icon: "📝" },
      code: { label: "Code", color: "bg-purple-100 text-purple-800", icon: "💻" },
      "ml-trainer": { label: "ML Trainer", color: "bg-red-100 text-red-800", icon: "🤖" },
      "ml-predictor": { label: "ML Predictor", color: "bg-indigo-100 text-indigo-800", icon: "🔮" },
      "ml-insights": { label: "ML Insights", color: "bg-pink-100 text-pink-800", icon: "🧠" },
    }
    return typeMap[type as keyof typeof typeMap] || typeMap.text
  }

  const renderCellContent = () => {
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
        return <PythonCodeEditor />
      case "ml-trainer":
        return <MLModelTrainer />
      case "ml-predictor":
        return <MLPredictor />
      case "ml-insights":
        return <MLModelComparison />
      default:
        return (
          <div className="p-8 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Unknown cell type: {cell.type}</p>
          </div>
        )
    }
  }

  const getStatusIcon = () => {
    switch (cellStatus) {
      case "running":
        return <Clock className="h-4 w-4 animate-spin text-blue-500" />
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const typeInfo = getCellTypeInfo(cell.type)
  const canExecute = ["code", "ml-trainer", "ml-predictor"].includes(cell.type)

  return (
    <Card
      className={`transition-all duration-200 hover:shadow-md ${
        cellStatus === "running" ? "ring-2 ring-blue-200" : ""
      } ${isExecuting ? "opacity-75" : ""}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Drag Handle */}
            <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Cell Index */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-muted-foreground">[{index + 1}]</span>
              <Badge variant="secondary" className={typeInfo.color}>
                <span className="mr-1">{typeInfo.icon}</span>
                {typeInfo.label}
              </Badge>
            </div>

            {/* Cell Title */}
            <div className="flex items-center gap-2 flex-1">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveTitle()
                      if (e.key === "Escape") handleCancelEdit()
                    }}
                    autoFocus
                  />
                  <Button size="sm" variant="ghost" onClick={handleSaveTitle}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm">{cell.title}</h3>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="h-6 w-6 p-0">
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Cell Actions */}
          <div className="flex items-center gap-2">
            {getStatusIcon()}

            {canExecute && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleExecuteCell}
                disabled={cellStatus === "running" || isExecuting}
                className="h-8 gap-1"
              >
                {cellStatus === "running" ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                {cellStatus === "running" ? "Stop" : "Run"}
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 text-muted-foreground"
            >
              {isCollapsed ? "Expand" : "Collapse"}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRemove(cell.id)}
              className="h-8 text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Cell Metadata */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Created: {cell.createdAt.toLocaleDateString()}</span>
          {cellStatus === "completed" && <span className="text-green-600">✓ Last executed successfully</span>}
          {cellStatus === "error" && <span className="text-red-600">✗ Execution failed</span>}
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="pt-0">
          <div className={`transition-opacity duration-200 ${cellStatus === "running" ? "opacity-50" : ""}`}>
            {renderCellContent()}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// Make sure to export as default as well for compatibility
export default NotebookCell
