"use client"

import dynamic from "next/dynamic"
import type { ComponentType } from "react"
import {
  BarChart3,
  Brain,
  Code2,
  FileText,
  Microscope,
  ScanSearch,
  SearchX,
  Sparkles,
  Table2,
  Target,
  Wand2,
  type LucideIcon,
} from "lucide-react"
import type { CellProps } from "@/components/cells/types"
import type { CellType } from "@/lib/notebook"

function CellLoading() {
  return <div className="bg-muted h-32 animate-pulse rounded-md" aria-label="Loading cell" />
}

// Cells are code-split so the notebook loads fast and heavy cells (charts, ML) load on demand.
const load = (importer: () => Promise<ComponentType<CellProps>>) =>
  dynamic<CellProps>(importer, { ssr: false, loading: CellLoading })

export const CELL_COMPONENTS: Record<CellType, ComponentType<CellProps>> = {
  data: load(() => import("@/components/cells/data-table-cell").then((m) => m.DataTableCell)),
  profile: load(() => import("@/components/cells/profile-cell").then((m) => m.ProfileCell)),
  "missing-data": load(() => import("@/components/cells/missing-data-cell").then((m) => m.MissingDataCell)),
  visualization: load(() => import("@/components/cells/visualization-cell").then((m) => m.VisualizationCell)),
  preprocessing: load(() => import("@/components/cells/preprocessing-cell").then((m) => m.PreprocessingCell)),
  text: load(() => import("@/components/cells/notes-cell").then((m) => m.NotesCell)),
  code: load(() => import("@/components/cells/python-cell").then((m) => m.PythonCell)),
  "ml-trainer": load(() => import("@/components/cells/model-trainer-cell").then((m) => m.ModelTrainerCell)),
  "ml-predictor": load(() => import("@/components/cells/predictor-cell").then((m) => m.PredictorCell)),
  "ml-insights": load(() => import("@/components/cells/model-insights-cell").then((m) => m.ModelInsightsCell)),
  "auto-ml": load(() => import("@/components/cells/automl-cell").then((m) => m.AutoMLCell)),
}

export const CELL_ICONS: Record<CellType, LucideIcon> = {
  data: Table2,
  profile: ScanSearch,
  "missing-data": SearchX,
  visualization: BarChart3,
  preprocessing: Wand2,
  text: FileText,
  code: Code2,
  "ml-trainer": Brain,
  "ml-predictor": Target,
  "ml-insights": Microscope,
  "auto-ml": Sparkles,
}

/** Accent colour per category (works in light and dark mode). */
export const CATEGORY_ACCENT = {
  data: "border-l-chart-2",
  analysis: "border-l-chart-1",
  ml: "border-l-chart-4",
  notes: "border-l-muted-foreground",
} as const
