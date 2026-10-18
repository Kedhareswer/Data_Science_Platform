"use client"

import { useId, useRef, useState } from "react"
import { AlertCircle, Brain, Loader2, Play } from "lucide-react"
import { toast } from "sonner"
import type { CellProps } from "@/components/cells/types"
import { DataUploadPrompt } from "@/components/data-upload-prompt"
import { BackendToggle } from "@/components/ml/backend-toggle"
import { FeaturePicker } from "@/components/ml/feature-picker"
import { HyperparameterFields } from "@/components/ml/hyperparameter-fields"
import { ModelResult } from "@/components/ml/model-result"
import { PythonStatus } from "@/components/ml/python-status"
import { type TaskTarget, TaskTargetFields } from "@/components/ml/task-target-fields"
import { defaultFeatures, errorMessage, resolveFeatures } from "@/components/ml/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { useCellContent, useCellRunner, useData } from "@/lib/data-context"
import { algorithmsFor, defaultHyperparameters } from "@/lib/ml/algorithms"
import { formatMetric, METRIC_LABELS, primaryMetric, trainModel } from "@/lib/ml/engine"
import type { AlgorithmId, Backend, Hyperparameters, TaskType, TrainedModel, TrainingConfig } from "@/lib/ml/types"

interface TrainerContent {
  task: TaskType
  target?: string
  /** `undefined` means "use the default feature set". */
  features?: string[]
  backend: Backend
  algorithm?: AlgorithmId
  /** Hyperparameter overrides per algorithm, so switching back keeps your values. */
  hyperparameters: Partial<Record<AlgorithmId, Hyperparameters>>
  testSize: number
  seed: number
  name: string
  lastModelId?: string
}

const DEFAULT_CONTENT: TrainerContent = {
  task: "classification",
  backend: "typescript",
  hyperparameters: {},
  testSize: 0.2,
  seed: 42,
  name: "",
}

export function ModelTrainerCell({ cellId }: CellProps) {
  const { processedData, columns, columnTypes, trainedModels, addTrainedModel, importModel } = useData()
  const [stored, setContent] = useCellContent<TrainerContent>(cellId, DEFAULT_CONTENT)
  const content = { ...DEFAULT_CONTENT, ...stored }
  const [isTraining, setIsTraining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busy = useRef(false)
  const id = useId()

  const { task, backend, testSize, seed, name } = content
  const target = task === "clustering" ? undefined : content.target
  const fallbackFeatures = defaultFeatures(processedData, columns, columnTypes, target)
  const features = resolveFeatures(content.features, fallbackFeatures, columns, target)
  const algorithms = algorithmsFor(task, backend)
  const algorithm = algorithms.find((a) => a.id === content.algorithm) ?? algorithms[0]
  const hyperparameters: Hyperparameters = algorithm
    ? { ...defaultHyperparameters(algorithm.id), ...content.hyperparameters[algorithm.id] }
    : {}
  const lastModel = trainedModels.find((m) => m.id === content.lastModelId)

  const update = (patch: Partial<TrainerContent>) => setContent((prev) => ({ ...DEFAULT_CONTENT, ...prev, ...patch }))

  const train = async (replacePrevious = false) => {
    if (busy.current) return
    if (!algorithm) {
      setError("No algorithm supports this task with the selected backend.")
      return
    }
    const config: TrainingConfig = {
      task,
      algorithm: algorithm.id,
      features,
      target,
      hyperparameters,
      testSize,
      seed,
      backend,
      name: name.trim() || undefined,
    }
    busy.current = true
    setIsTraining(true)
    setError(null)
    try {
      let model: TrainedModel
      if (backend === "sklearn") {
        const { trainSklearnModel } = await import("@/lib/ml/sklearn")
        model = await trainSklearnModel(processedData, config)
      } else {
        // Let the spinner paint before the synchronous training work.
        await new Promise((resolve) => setTimeout(resolve, 0))
        model = trainModel(processedData, config)
      }
      const previous = trainedModels.find((m) => m.id === content.lastModelId)
      if (replacePrevious && previous && previous.backend === "typescript" && model.backend === "typescript") {
        // Re-runs keep the same id so predictors pointing at this model stay connected.
        model = { ...model, id: previous.id }
        importModel(model)
      } else {
        addTrainedModel(model)
      }
      update({ lastModelId: model.id })
      const metric = primaryMetric(model.task)
      toast.success(`Trained ${model.name}`, {
        description: `${METRIC_LABELS[metric] ?? metric}: ${formatMetric(metric, model.metrics[metric])}`,
      })
    } catch (err) {
      const message = errorMessage(err)
      setError(message)
      toast.error("Training failed", { description: message })
    } finally {
      busy.current = false
      setIsTraining(false)
    }
  }

  const needsTarget = task !== "clustering" && !target
  const tooFew = processedData.length < 10
  // "Run all" retrains only a configured cell (an unconfigured one is skipped instead of erroring).
  useCellRunner(cellId, () => (!needsTarget && features.length > 0 && !tooFew ? train(true) : undefined))

  if (processedData.length === 0) {
    return (
      <DataUploadPrompt title="No data to train on" description="Load a dataset to train a machine-learning model." />
    )
  }

  const canTrain = !isTraining && !!algorithm && features.length > 0 && !needsTarget && !tooFew

  const changeTaskTarget = ({ task: nextTask, target: nextTarget }: TaskTarget) => {
    // Drop an explicit feature list entry that would collide with the new target.
    const nextFeatures = content.features?.filter((f) => f !== nextTarget)
    update({ task: nextTask, target: nextTarget, features: nextFeatures })
  }

  return (
    <div className="space-y-5">
      {tooFew && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not enough rows</AlertTitle>
          <AlertDescription>
            The dataset has {processedData.length} row{processedData.length === 1 ? "" : "s"}; at least 10 are needed to
            train and evaluate a model.
          </AlertDescription>
        </Alert>
      )}

      <TaskTargetFields
        task={task}
        target={target}
        rows={processedData}
        columns={columns}
        columnTypes={columnTypes}
        onChange={changeTaskTarget}
      />

      <FeaturePicker
        columns={columns}
        columnTypes={columnTypes}
        selected={features}
        exclude={target ? [target] : []}
        onChange={(next) => update({ features: next })}
      />

      <div className="space-y-2">
        <span id={`${id}-backend`} className="font-handwritten-bold text-sm">
          Engine
        </span>
        <BackendToggle
          labelId={`${id}-backend`}
          value={backend}
          onChange={(b) => update({ backend: b })}
          disabled={isTraining}
        />
        {backend === "sklearn" && <PythonStatus />}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-algo`}>Algorithm</Label>
        <Select
          value={algorithm?.id}
          onValueChange={(v) => update({ algorithm: v as AlgorithmId })}
          disabled={isTraining}
        >
          <SelectTrigger id={`${id}-algo`}>
            <SelectValue placeholder="No algorithm available" />
          </SelectTrigger>
          <SelectContent>
            {algorithms.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {algorithm && <p className="text-muted-foreground text-xs">{algorithm.description}</p>}
      </div>

      <details className="group rounded-lg border-2 border-dashed p-3">
        <summary className="font-handwritten-bold focus-visible:ring-ring cursor-pointer text-sm select-none focus-visible:ring-2 focus-visible:outline-hidden">
          Hyperparameters &amp; evaluation settings
        </summary>
        <div className="mt-4 space-y-5">
          {algorithm && (
            <HyperparameterFields
              specs={algorithm.hyperparameters}
              values={hyperparameters}
              disabled={isTraining}
              onChange={(key, value) =>
                update({
                  hyperparameters: {
                    ...content.hyperparameters,
                    [algorithm.id]: { ...content.hyperparameters[algorithm.id], [key]: value },
                  },
                })
              }
            />
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            {task !== "clustering" && (
              <div className="space-y-2">
                <Label id={`${id}-test-label`}>Test set: {Math.round(testSize * 100)}%</Label>
                <Slider
                  aria-labelledby={`${id}-test-label`}
                  min={10}
                  max={50}
                  step={5}
                  value={[Math.round(testSize * 100)]}
                  onValueChange={([v]) => update({ testSize: v / 100 })}
                  disabled={isTraining}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-seed`}>Random seed</Label>
              <Input
                id={`${id}-seed`}
                type="number"
                step={1}
                value={seed}
                onChange={(e) =>
                  Number.isFinite(e.target.valueAsNumber) && update({ seed: Math.trunc(e.target.valueAsNumber) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-name`}>Model name (optional)</Label>
              <Input
                id={`${id}-name`}
                value={name}
                placeholder={algorithm ? `${algorithm.name}${target ? ` → ${target}` : ""}` : ""}
                onChange={(e) => update({ name: e.target.value })}
              />
            </div>
          </div>
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void train()} disabled={!canTrain} className="font-handwritten-bold">
          {isTraining ? <Loader2 className="animate-spin" aria-hidden /> : <Play aria-hidden />}
          {isTraining ? "Training…" : "Train model"}
        </Button>
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {isTraining
            ? backend === "sklearn"
              ? "Training with scikit-learn (first run downloads Python)…"
              : "Training…"
            : needsTarget
              ? "Choose a target column to train."
              : features.length === 0
                ? "Select at least one feature."
                : `${processedData.length.toLocaleString()} rows · ${features.length} feature${features.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Training failed</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
        </Alert>
      )}

      {lastModel ? (
        <ModelResult model={lastModel} />
      ) : (
        !error && (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Brain className="h-4 w-4" aria-hidden /> Results appear here after training — evaluated on a held-out test
            set.
          </p>
        )
      )}
    </div>
  )
}
