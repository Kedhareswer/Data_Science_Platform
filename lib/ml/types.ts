import type { CellValue } from "@/lib/data/types"

export type TaskType = "classification" | "regression" | "clustering"

export type AlgorithmId =
  | "linear_regression"
  | "logistic_regression"
  | "knn"
  | "decision_tree"
  | "random_forest"
  | "naive_bayes"
  | "kmeans"
  | "gradient_boosting"
  | "svm"

export type Backend = "typescript" | "sklearn"

export type Hyperparameters = Record<string, number | string | boolean>

export interface HyperparameterSpec {
  key: string
  label: string
  type: "number" | "select"
  default: number | string
  min?: number
  max?: number
  step?: number
  options?: string[]
}

export interface AlgorithmInfo {
  id: AlgorithmId
  name: string
  tasks: TaskType[]
  /** Defaults to both backends. */
  backends?: Backend[]
  description: string
  hyperparameters: HyperparameterSpec[]
}

export interface ClassificationMetrics {
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  rocAuc?: number
  confusionMatrix: number[][]
}

export interface RegressionMetrics {
  rmse: number
  mae: number
  r2Score: number
}

export interface ClusteringMetrics {
  inertia: number
  silhouette: number
  clusterSizes: number[]
}

export type ModelMetrics = Partial<ClassificationMetrics & RegressionMetrics & ClusteringMetrics>

export interface FeatureImportance {
  feature: string
  importance: number
}

/** Held-out predictions kept with the model so insight charts use real data. */
export interface Evaluation {
  actual: CellValue[]
  predicted: CellValue[]
  /** Probability of the positive class (binary classification only). */
  scores?: number[]
}

export interface TrainingConfig {
  task: TaskType
  algorithm: AlgorithmId
  features: string[]
  target?: string
  hyperparameters?: Hyperparameters
  testSize?: number
  seed?: number
  backend?: Backend
  name?: string
}

/**
 * A fully serializable trained model. TypeScript models carry their fitted
 * parameters in `state` and can be exported/imported as JSON and used for
 * prediction offline. scikit-learn models live in the Python worker
 * (`state.sklearnId`) for the duration of the session.
 */
export interface TrainedModel {
  id: string
  name: string
  task: TaskType
  algorithm: AlgorithmId
  backend: Backend
  features: string[]
  target?: string
  classes?: CellValue[]
  hyperparameters: Hyperparameters
  metrics: ModelMetrics
  featureImportance: FeatureImportance[]
  evaluation: Evaluation
  trainRows: number
  testRows: number
  trainingTimeMs: number
  trainedAt: string
  pipeline?: import("./pipeline").PipelineState
  state: unknown
  version: 2
}

export interface Prediction {
  value: CellValue
  confidence?: number
  probabilities?: Record<string, number>
}
