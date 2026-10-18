import type { DataRow } from "@/lib/data/types"
import type { TrainedModel } from "@/lib/ml/types"

export type CellType =
  | "data"
  | "profile"
  | "missing-data"
  | "visualization"
  | "preprocessing"
  | "text"
  | "code"
  | "ml-trainer"
  | "ml-predictor"
  | "ml-insights"
  | "auto-ml"

export interface NotebookCell {
  id: string
  type: CellType
  title: string
  createdAt: string
  /** Cell-specific state (code, markdown, chart config, pipeline steps…). Must be JSON-serializable. */
  content?: unknown
  collapsed?: boolean
}

export interface CellMeta {
  title: string
  description: string
  category: "data" | "analysis" | "ml" | "notes"
  /** Cells that are useless without a dataset. */
  requiresData?: boolean
  /** Whether "Run all" executes this cell. */
  runnable?: boolean
}

export const CELL_META: Record<CellType, CellMeta> = {
  data: {
    requiresData: true,
    title: "Data Table",
    description: "Browse, search and sort the current dataset",
    category: "data",
  },
  profile: {
    requiresData: true,
    title: "Data Profile",
    description: "Column statistics, quality issues and correlations",
    category: "analysis",
    runnable: true,
  },
  "missing-data": {
    requiresData: true,
    title: "Missing Data",
    description: "Find and visualise missing values",
    category: "analysis",
  },
  visualization: {
    requiresData: true,
    title: "Visualization",
    description: "Interactive charts",
    category: "analysis",
  },
  preprocessing: {
    requiresData: true,
    title: "Preprocessing",
    description: "Clean and transform data with a replayable pipeline",
    category: "data",
    runnable: true,
  },
  text: { title: "Notes", description: "Markdown notes", category: "notes" },
  code: {
    title: "Python",
    description: "Run Python (pandas, numpy, scikit-learn, matplotlib) in your browser",
    category: "analysis",
    runnable: true,
  },
  "ml-trainer": {
    requiresData: true,
    title: "Model Trainer",
    description: "Train a model with held-out evaluation",
    category: "ml",
    runnable: true,
  },
  "ml-predictor": { title: "Predictor", description: "Make predictions with a trained model", category: "ml" },
  "ml-insights": {
    title: "Model Insights",
    description: "Compare models, feature importance, ROC and residuals",
    category: "ml",
  },
  "auto-ml": {
    requiresData: true,
    title: "AutoML",
    description: "Train and rank many models automatically",
    category: "ml",
    runnable: true,
  },
}

/** On-disk notebook format (`.dnb.json`). */
export interface NotebookFile {
  format: "datanotebook"
  version: 2
  exportedAt: string
  fileName?: string
  cells: NotebookCell[]
  models: TrainedModel[]
  /** Optional embedded dataset so a notebook is fully reproducible. */
  dataset?: { rows: DataRow[]; columns: string[] }
}

export function newCellId(): string {
  return `cell_${crypto.randomUUID()}`
}

export function isNotebookFile(value: unknown): value is NotebookFile {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as NotebookFile).format === "datanotebook" &&
    Array.isArray((value as NotebookFile).cells)
  )
}

export function downloadJSON(value: unknown, fileName: string) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadText(text: string, fileName: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function baseName(fileName?: string): string {
  return (fileName ?? "notebook").replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "_") || "notebook"
}
