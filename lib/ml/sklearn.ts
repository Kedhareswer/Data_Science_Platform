"use client"

import type { DataRow } from "@/lib/data/types"
import { getPythonRuntime } from "@/lib/python/client"
import { defaultHyperparameters, getAlgorithm } from "./algorithms"
import { newModelId, TrainingError } from "./engine"
import type { Prediction, TrainedModel, TrainingConfig } from "./types"

const SKLEARN_PACKAGES = ["scikit-learn"]

type SklearnTrainOutput = Pick<
  TrainedModel,
  "metrics" | "featureImportance" | "evaluation" | "classes" | "trainRows" | "testRows" | "trainingTimeMs"
>

/** Train with real scikit-learn inside the Pyodide worker. */
export async function trainSklearnModel(rows: readonly DataRow[], config: TrainingConfig): Promise<TrainedModel> {
  const info = getAlgorithm(config.algorithm)
  if (!info.tasks.includes(config.task)) throw new TrainingError(`${info.name} does not support ${config.task}.`)
  if (config.features.length === 0) throw new TrainingError("Select at least one feature column.")
  if (config.task !== "clustering" && !config.target) throw new TrainingError("Select a target column.")

  const id = newModelId()
  const hyperparameters = { ...defaultHyperparameters(config.algorithm), ...config.hyperparameters }
  const columns = [...config.features, ...(config.target ? [config.target] : [])]
  const slim = rows.map((r) => Object.fromEntries(columns.map((c) => [c, r[c] ?? null])))
  const runtime = getPythonRuntime()
  const out = await runtime.call<SklearnTrainOutput>(
    "_dn_sklearn_train",
    {
      modelId: id,
      task: config.task,
      algorithm: config.algorithm,
      features: config.features,
      target: config.target,
      hyperparameters,
      testSize: config.testSize ?? 0.2,
      seed: config.seed ?? 42,
      rows: slim,
    },
    SKLEARN_PACKAGES,
  )

  return {
    id,
    name: config.name?.trim() || `${info.name} (scikit-learn)${config.target ? ` → ${config.target}` : ""}`,
    task: config.task,
    algorithm: config.algorithm,
    backend: "sklearn",
    features: [...config.features],
    target: config.target,
    hyperparameters,
    trainedAt: new Date().toISOString(),
    state: { generation: runtime.generation },
    version: 2,
    ...out,
  }
}

export async function predictSklearn(model: TrainedModel, rows: readonly DataRow[]): Promise<Prediction[]> {
  const slim = rows.map((r) => Object.fromEntries(model.features.map((c) => [c, r[c] ?? null])))
  return getPythonRuntime().call<Prediction[]>("_dn_sklearn_predict", { modelId: model.id, rows: slim }, SKLEARN_PACKAGES)
}
