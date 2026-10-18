import type { CellValue, ColumnTypes, DataRow } from "@/lib/data/types"
import { isMissing } from "@/lib/data/types"
import { ALGORITHMS } from "@/lib/ml/algorithms"
import type { AlgorithmId, ModelMetrics, TaskType, TrainedModel } from "@/lib/ml/types"

export const TASK_LABELS: Record<TaskType, string> = {
  classification: "Classification",
  regression: "Regression",
  clustering: "Clustering",
}

export const TASKS: TaskType[] = ["classification", "regression", "clustering"]

/** Metrics where a smaller value is better. */
const LOWER_IS_BETTER = new Set<string>(["rmse", "mae", "inertia"])

export function isLowerBetter(metric: string): boolean {
  return LOWER_IS_BETTER.has(metric)
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return typeof err === "string" ? err : "Something went wrong."
}

/** True when a scikit-learn model was lost because the Python worker restarted. */
export function isLostSklearnModel(err: unknown): boolean {
  return /no longer in memory/i.test(errorMessage(err))
}

/** Scalar (numeric) metrics only — drops the confusion matrix and cluster sizes. */
export function scalarMetrics(metrics: ModelMetrics): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(metrics)) {
    if (typeof value === "number" && Number.isFinite(value)) out[key] = value
  }
  return out
}

export function numericColumns(columns: readonly string[], types: ColumnTypes): string[] {
  return columns.filter((c) => types[c] === "number")
}

/** Columns usable as targets for a task. */
export function targetCandidates(task: TaskType, columns: readonly string[], types: ColumnTypes): string[] {
  if (task === "clustering") return []
  if (task === "regression") return numericColumns(columns, types)
  return [...columns]
}

/** Count of rows with a missing value in `column`. */
export function missingCount(rows: readonly DataRow[], column: string): number {
  let n = 0
  for (const r of rows) if (isMissing(r[column])) n++
  return n
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms)) return "—"
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

export function formatCellValue(value: CellValue | undefined): string {
  if (value === null || value === undefined || value === "") return "—"
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(4).replace(/\.?0+$/, "")
  return String(value)
}

export function algorithmName(id: AlgorithmId): string {
  return ALGORITHMS.find((a) => a.id === id)?.name ?? id
}

/** Quote a value for CSV (RFC 4180) and neutralise spreadsheet formula injection. */
export function csvField(value: CellValue | undefined): string {
  if (value === null || value === undefined) return ""
  let text = String(value)
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\r\n]|^\s|\s$/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCSV(headers: readonly string[], rows: ReadonlyArray<ReadonlyArray<CellValue | undefined>>): string {
  const lines = [headers.map((h) => csvField(h)).join(",")]
  for (const row of rows) lines.push(row.map(csvField).join(","))
  return lines.join("\r\n")
}

export function downloadText(text: string, fileName: string, mime = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

const ALGORITHM_IDS = new Set<string>(ALGORITHMS.map((a) => a.id))

/** Validate an imported model file. Returns the model or an error message. */
export function parseModelFile(raw: unknown): { model: TrainedModel } | { error: string } {
  if (!isRecord(raw)) return { error: "The file does not contain a model object." }
  if (raw.version !== 2) return { error: "Unsupported model version (expected a DataNotebook v2 model)." }
  if (raw.backend !== "typescript") {
    return { error: "Only TypeScript models can be imported; scikit-learn models live in the Python session." }
  }
  if (typeof raw.id !== "string" || typeof raw.name !== "string")
    return { error: "The model is missing an id or name." }
  if (typeof raw.task !== "string" || !(TASKS as string[]).includes(raw.task)) return { error: "Unknown task type." }
  if (typeof raw.algorithm !== "string" || !ALGORITHM_IDS.has(raw.algorithm)) return { error: "Unknown algorithm." }
  if (!Array.isArray(raw.features) || !raw.features.every((f) => typeof f === "string")) {
    return { error: "The model has no feature list." }
  }
  const pipeline = raw.pipeline
  if (
    !isRecord(pipeline) ||
    !Array.isArray(pipeline.features) ||
    !isRecord(pipeline.numeric) ||
    !isRecord(pipeline.categorical)
  ) {
    return { error: "The model has no preprocessing pipeline." }
  }
  if (!("state" in raw) || raw.state === undefined || raw.state === null)
    return { error: "The model has no fitted state." }
  if (!isRecord(raw.metrics)) return { error: "The model has no metrics." }
  const evaluation = isRecord(raw.evaluation) ? raw.evaluation : {}
  const model = {
    ...raw,
    hyperparameters: isRecord(raw.hyperparameters) ? raw.hyperparameters : {},
    featureImportance: Array.isArray(raw.featureImportance) ? raw.featureImportance : [],
    evaluation: {
      actual: Array.isArray(evaluation.actual) ? evaluation.actual : [],
      predicted: Array.isArray(evaluation.predicted) ? evaluation.predicted : [],
      scores: Array.isArray(evaluation.scores) ? evaluation.scores : undefined,
    },
    trainRows: typeof raw.trainRows === "number" ? raw.trainRows : 0,
    testRows: typeof raw.testRows === "number" ? raw.testRows : 0,
    trainingTimeMs: typeof raw.trainingTimeMs === "number" ? raw.trainingTimeMs : 0,
    trainedAt: typeof raw.trainedAt === "string" ? raw.trainedAt : new Date().toISOString(),
  } as TrainedModel
  return { model }
}

/**
 * Sensible default features: every column except the target, dates and
 * identifier-like text columns (almost every value unique).
 */
export function defaultFeatures(
  rows: readonly DataRow[],
  columns: readonly string[],
  types: ColumnTypes,
  target?: string,
): string[] {
  const sample = rows.slice(0, 2000)
  return columns.filter((c) => {
    if (c === target || types[c] === "date") return false
    if (types[c] === "string") {
      const distinct = new Set(sample.map((r) => r[c]).filter((v) => !isMissing(v))).size
      if (distinct > 50 && distinct > sample.length * 0.5) return false
    }
    return true
  })
}

/** Keep only features that still exist and are not the target, preserving column order. */
export function resolveFeatures(
  stored: readonly string[] | undefined,
  fallback: readonly string[],
  columns: readonly string[],
  target?: string,
): string[] {
  const chosen = new Set(stored ?? fallback)
  return columns.filter((c) => c !== target && chosen.has(c))
}
