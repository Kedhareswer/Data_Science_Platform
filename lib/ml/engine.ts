import { type CellValue, type DataRow, isMissing } from "@/lib/data/types"
import {
  algorithmsFor,
  createEstimator,
  defaultHyperparameters,
  type Estimator,
  getAlgorithm,
  restoreEstimator,
} from "./algorithms"
import { classificationMetrics, regressionMetrics, silhouette } from "./metrics"
import { fitPipeline, type PipelineState, sourceFeature, transformRows } from "./pipeline"
import { createRng, shuffleInPlace, trainTestSplit } from "./random"
import type { FeatureImportance, ModelMetrics, Prediction, TaskType, TrainedModel, TrainingConfig } from "./types"

export class TrainingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "TrainingError"
  }
}

export function newModelId(): string {
  return `model_${crypto.randomUUID()}`
}

/** Suggest a task type from the target column's values. */
export function suggestTask(rows: readonly DataRow[], target?: string): TaskType {
  if (!target) return "clustering"
  const values = rows.map((r) => r[target]).filter((v) => !isMissing(v))
  const distinct = new Set(values.map(String)).size
  const numeric = values.every((v) => typeof v === "number")
  return numeric && distinct > Math.min(20, values.length * 0.05) ? "regression" : "classification"
}

interface Prepared {
  pipeline: PipelineState
  X: number[][]
  y: number[]
  classes?: CellValue[]
  rawTarget: CellValue[]
}

function prepare(rows: readonly DataRow[], config: TrainingConfig): Prepared {
  if (config.features.length === 0) throw new TrainingError("Select at least one feature column.")
  if (config.task !== "clustering") {
    if (!config.target) throw new TrainingError("Select a target column.")
    if (config.features.includes(config.target)) throw new TrainingError("The target cannot also be a feature.")
  }

  const usable = config.target ? rows.filter((r) => !isMissing(r[config.target!])) : [...rows]
  if (usable.length < 10) throw new TrainingError("At least 10 rows with a target value are needed to train.")

  const rawTarget = config.target ? usable.map((r) => r[config.target!]) : []
  let y: number[] = []
  let classes: CellValue[] | undefined

  if (config.task === "classification") {
    const labels = [...new Set(rawTarget.map((v) => JSON.stringify(v)))]
      .map((s) => JSON.parse(s) as CellValue)
      .sort((a, b) => (typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b))))
    if (labels.length < 2) throw new TrainingError("The target needs at least two distinct classes.")
    if (labels.length > 50) throw new TrainingError(`The target has ${labels.length} classes; did you mean regression?`)
    const index = new Map(labels.map((l, i) => [JSON.stringify(l), i]))
    y = rawTarget.map((v) => index.get(JSON.stringify(v))!)
    classes = labels
  } else if (config.task === "regression") {
    if (!rawTarget.every((v) => typeof v === "number")) throw new TrainingError("Regression needs a numeric target.")
    y = rawTarget as number[]
  }

  const pipeline = fitPipeline(usable, config.features)
  if (pipeline.outputNames.length === 0) throw new TrainingError("The selected features contain no usable values.")
  return { pipeline, X: transformRows(pipeline, usable), y, classes, rawTarget }
}

function score(task: TaskType, est: Estimator, X: number[][], y: number[]): number {
  const pred = est.predict(X)
  if (task === "classification") return pred.filter((p, i) => p === y[i]).length / y.length
  return regressionMetrics(y, pred).r2Score
}

/** Permutation importance on the held-out set: drop in score when a feature is shuffled. */
function permutationImportance(
  task: TaskType,
  est: Estimator,
  pipeline: PipelineState,
  X: number[][],
  y: number[],
  seed: number,
): FeatureImportance[] {
  if (X.length === 0) return []
  const rng = createRng(seed + 1)
  const sample =
    X.length > 500
      ? shuffleInPlace(
          X.map((_, i) => i),
          rng,
        ).slice(0, 500)
      : X.map((_, i) => i)
  const Xs = sample.map((i) => X[i])
  const ys = sample.map((i) => y[i])
  const base = score(task, est, Xs, ys)

  const groups = new Map<string, number[]>()
  pipeline.outputNames.forEach((_, j) => {
    const f = sourceFeature(pipeline, j)
    groups.set(f, [...(groups.get(f) ?? []), j])
  })

  const result: FeatureImportance[] = []
  for (const [feature, cols] of groups) {
    const perm = shuffleInPlace(
      Xs.map((_, i) => i),
      rng,
    )
    const Xp = Xs.map((row, i) => {
      const copy = [...row]
      for (const c of cols) copy[c] = Xs[perm[i]][c]
      return copy
    })
    result.push({ feature, importance: Math.max(0, base - score(task, est, Xp, ys)) })
  }
  const total = result.reduce((a, r) => a + r.importance, 0)
  return result
    .map((r) => ({ ...r, importance: total > 0 ? r.importance / total : 1 / result.length }))
    .sort((a, b) => b.importance - a.importance)
}

/** Train a TypeScript model with a held-out test split and real metrics. */
export function trainModel(rows: readonly DataRow[], config: TrainingConfig): TrainedModel {
  const started = performance.now()
  const info = getAlgorithm(config.algorithm)
  if (!info.tasks.includes(config.task)) throw new TrainingError(`${info.name} does not support ${config.task}.`)

  const seed = config.seed ?? 42
  const hyperparameters = { ...defaultHyperparameters(config.algorithm), ...config.hyperparameters }
  const { pipeline, X, y, classes, rawTarget } = prepare(rows, config)
  const nClasses = classes?.length ?? 0
  const rng = createRng(seed)
  const estimator = createEstimator(config.algorithm, config.task, hyperparameters, nClasses, seed)

  let metrics: ModelMetrics
  let evaluation: TrainedModel["evaluation"]
  let featureImportance: FeatureImportance[] = []
  let trainRows: number
  let testRows: number

  if (config.task === "clustering") {
    estimator.fit(X, [])
    const labels = estimator.predict(X)
    const k = Math.max(...labels) + 1
    const sizes = new Array<number>(k).fill(0)
    for (const l of labels) sizes[l]++
    metrics = {
      inertia: (estimator.toJSON() as { inertia: number }).inertia,
      silhouette: silhouette(X, labels),
      clusterSizes: sizes,
    }
    evaluation = { actual: [], predicted: labels.slice(0, 2000) }
    trainRows = X.length
    testRows = 0
  } else {
    const testSize = Math.min(0.5, Math.max(0.1, config.testSize ?? 0.2))
    const { train, test } = trainTestSplit(X.length, testSize, rng, config.task === "classification" ? y : undefined)
    const Xtr = train.map((i) => X[i])
    const ytr = train.map((i) => y[i])
    const Xte = test.map((i) => X[i])
    const yte = test.map((i) => y[i])
    estimator.fit(Xtr, ytr)
    const pred = estimator.predict(Xte)
    trainRows = train.length
    testRows = test.length

    if (config.task === "classification") {
      const proba = estimator.predictProba?.(Xte)
      const scores = nClasses === 2 && proba ? proba.map((p) => p[1]) : undefined
      metrics = classificationMetrics(yte, pred, nClasses, scores)
      evaluation = { actual: yte.map((i) => classes![i]), predicted: pred.map((i) => classes![i]), scores }
    } else {
      metrics = regressionMetrics(yte, pred)
      evaluation = { actual: test.map((i) => rawTarget[i]), predicted: pred }
    }
    featureImportance = permutationImportance(config.task, estimator, pipeline, Xte, yte, seed)
  }

  return {
    id: newModelId(),
    name: config.name?.trim() || `${info.name}${config.target ? ` → ${config.target}` : ""}`,
    task: config.task,
    algorithm: config.algorithm,
    backend: "typescript",
    features: [...config.features],
    target: config.target,
    classes,
    hyperparameters,
    metrics,
    featureImportance,
    evaluation,
    trainRows,
    testRows,
    trainingTimeMs: Math.round(performance.now() - started),
    trainedAt: new Date().toISOString(),
    pipeline,
    state: estimator.toJSON(),
    version: 2,
  }
}

/** Predict with a TypeScript model (rows only need the model's feature columns). */
export function predictWithModel(model: TrainedModel, rows: readonly DataRow[]): Prediction[] {
  if (model.backend !== "typescript" || !model.pipeline) {
    throw new Error("This model must be used through the Python runtime.")
  }
  const estimator = restoreEstimator(model.algorithm, model.task, model.state)
  const X = transformRows(model.pipeline, rows)
  const raw = estimator.predict(X)

  if (model.task === "classification" && model.classes) {
    const proba = estimator.predictProba?.(X)
    return raw.map((c, i) => {
      const p = proba?.[i]
      return {
        value: model.classes![c],
        confidence: p ? p[c] : undefined,
        probabilities: p ? Object.fromEntries(model.classes!.map((label, k) => [String(label), p[k]])) : undefined,
      }
    })
  }
  if (model.task === "clustering") return raw.map((c) => ({ value: `Cluster ${c + 1}` }))
  return raw.map((v) => ({ value: v }))
}

export interface AutoMLOptions {
  task: TaskType
  features: string[]
  target?: string
  testSize?: number
  seed?: number
  /** Called after each candidate finishes (for progress UI). */
  onProgress?: (done: number, total: number, model?: TrainedModel, error?: string) => void
}

export interface AutoMLResult {
  leaderboard: TrainedModel[]
  failures: Array<{ algorithm: string; error: string }>
  best?: TrainedModel
  primaryMetric: keyof ModelMetrics
}

export function primaryMetric(task: TaskType): keyof ModelMetrics {
  return task === "classification" ? "f1Score" : task === "regression" ? "r2Score" : "silhouette"
}

/**
 * Train every applicable algorithm (plus a couple of hyperparameter variants)
 * on the same split and rank them by the task's primary metric. Yields to the
 * event loop between candidates so the UI stays responsive.
 */
export async function runAutoML(rows: readonly DataRow[], options: AutoMLOptions): Promise<AutoMLResult> {
  const metric = primaryMetric(options.task)
  const candidates: TrainingConfig[] = []
  for (const algo of algorithmsFor(options.task)) {
    const base = {
      task: options.task,
      algorithm: algo.id,
      features: options.features,
      target: options.target,
      testSize: options.testSize,
      seed: options.seed,
    }
    candidates.push(base)
    if (algo.id === "random_forest")
      candidates.push({ ...base, hyperparameters: { nEstimators: 100, maxDepth: 15 }, name: "Random Forest (deep)" })
    if (algo.id === "knn") candidates.push({ ...base, hyperparameters: { k: 15 }, name: "k-Nearest Neighbours (k=15)" })
    if (algo.id === "kmeans")
      for (const k of [2, 4, 5]) candidates.push({ ...base, hyperparameters: { k }, name: `k-Means (k=${k})` })
  }

  const leaderboard: TrainedModel[] = []
  const failures: AutoMLResult["failures"] = []
  for (let i = 0; i < candidates.length; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
    try {
      const model = trainModel(rows, candidates[i])
      leaderboard.push(model)
      options.onProgress?.(i + 1, candidates.length, model)
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      failures.push({ algorithm: candidates[i].name ?? candidates[i].algorithm, error })
      options.onProgress?.(i + 1, candidates.length, undefined, error)
    }
  }

  leaderboard.sort(
    (a, b) => ((b.metrics[metric] as number) ?? -Infinity) - ((a.metrics[metric] as number) ?? -Infinity),
  )
  return { leaderboard, failures, best: leaderboard[0], primaryMetric: metric }
}

export const METRIC_LABELS: Record<string, string> = {
  accuracy: "Accuracy",
  precision: "Precision",
  recall: "Recall",
  f1Score: "F1 score",
  rocAuc: "ROC AUC",
  rmse: "RMSE",
  mae: "MAE",
  r2Score: "R²",
  inertia: "Inertia",
  silhouette: "Silhouette",
}

/** Metrics shown as headline numbers per task. */
export function headlineMetrics(task: TaskType): Array<keyof ModelMetrics> {
  if (task === "classification") return ["accuracy", "precision", "recall", "f1Score", "rocAuc"]
  if (task === "regression") return ["r2Score", "rmse", "mae"]
  return ["silhouette", "inertia"]
}

export function formatMetric(key: string, value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—"
  if (["accuracy", "precision", "recall", "f1Score"].includes(key)) return `${(value * 100).toFixed(1)}%`
  if (key === "inertia") return value.toFixed(1)
  return value.toFixed(3)
}

/** Predict with either backend. */
export async function predict(model: TrainedModel, rows: readonly DataRow[]): Promise<Prediction[]> {
  if (model.backend === "sklearn") {
    const { predictSklearn } = await import("./sklearn")
    return predictSklearn(model, rows)
  }
  return predictWithModel(model, rows)
}
