"use client"

import type React from "react"
import { useState } from "react"
import type { NotebookCellType } from "@/types"
import { useData } from "@/lib/data-context"
import { AlertCircle } from "lucide-react"

// Import necessary components (replace with actual imports)
import { DataTable } from "@/components/data-table" // Assuming this exists
import { DataProfiler } from "@/components/data-profiler" // Assuming this exists
import { MissingDataExplorer } from "@/components/missing-data-explorer" // Assuming this exists
import { InteractiveDataVisualizer } from "@/components/interactive-data-visualizer" // Assuming this exists
import { DataPreprocessor } from "@/components/data-preprocessor" // Assuming this exists
import { TextEditor } from "@/components/text-editor" // Assuming this exists
import { PythonCodeEditor } from "@/components/python-code-editor" // Assuming this exists
import { MLModelTrainer } from "@/components/ml-model-trainer" // Assuming this exists
import { MLPredictor } from "@/components/ml-predictor" // Assuming this exists
import { MLModelComparison } from "@/components/ml-model-comparison" // Assuming this exists

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

const NotebookCell: React.FC<NotebookCellProps> = ({
  cell,
  index,
  onUpdateTitle,
  onRemove,
  dragHandleProps,
  isExecuting,
}) => {
  const [title, setTitle] = useState(cell.title)
  const { data } = useData()

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    setTitle(e.target.value)
  }

  const handleTitleBlur = () => {
    onUpdateTitle(cell.id, title)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      e.currentTarget.blur()
    }
  }

  const handleRemoveClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    onRemove(cell.id)
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
    <div className="relative rounded-md border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center">
          {dragHandleProps && (
            <div
              className="cursor-grab p-1 hover:bg-gray-100 rounded"
              {...dragHandleProps}
              role="button"
              aria-label="Drag to reorder cell"
            >
              ☰
            </div>
          )}
          <span className={`ml-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${typeInfo.color}`}>
            {typeInfo.icon} {typeInfo.label}
          </span>
          {isExecuting && <div className="ml-2 h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>}
        </div>

        <div className="flex items-center">
          <input
            type="text"
            className="w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            placeholder="Cell title"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
          />
          <button
            type="button"
            onClick={handleRemoveClick}
            className="ml-2 rounded-md bg-red-500 px-3 py-1 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 text-sm transition-colors"
            aria-label="Delete cell"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="p-4">{renderCellContent()}</div>
    </div>
  )
}

export { NotebookCell }
export default NotebookCell
