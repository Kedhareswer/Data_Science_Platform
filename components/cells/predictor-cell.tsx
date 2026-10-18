"use client"

import { useId, useMemo, useState } from "react"
import { AlertTriangle, Target } from "lucide-react"
import type { CellProps } from "@/components/cells/types"
import { BatchPredictions } from "@/components/ml/batch-predictions"
import { featureFields } from "@/components/ml/feature-fields"
import { MetricCards } from "@/components/ml/metric-cards"
import { ModelActions } from "@/components/ml/model-actions"
import { SinglePrediction } from "@/components/ml/single-prediction"
import { algorithmName, TASK_LABELS } from "@/components/ml/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCellContent, useData } from "@/lib/data-context"

interface PredictorContent {
  modelId?: string
  mode: "single" | "batch"
  /** Form values by feature name (shared between models with the same feature). */
  values: Record<string, string>
}

const DEFAULT_CONTENT: PredictorContent = { mode: "single", values: {} }

export function PredictorCell({ cellId }: CellProps) {
  const { processedData, columns, columnTypes, trainedModels } = useData()
  const [stored, setContent] = useCellContent<PredictorContent>(cellId, DEFAULT_CONTENT)
  const content = { ...DEFAULT_CONTENT, ...stored }
  const [lostIds, setLostIds] = useState<string[]>([])
  const id = useId()

  const model = trainedModels.find((m) => m.id === content.modelId) ?? trainedModels.at(-1)
  const fields = useMemo(
    () => (model ? featureFields(model, processedData, columnTypes) : []),
    [model, processedData, columnTypes],
  )
  const update = (patch: Partial<PredictorContent>) => setContent((prev) => ({ ...DEFAULT_CONTENT, ...prev, ...patch }))

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      {trainedModels.length > 0 && (
        <div className="min-w-56 flex-1 space-y-1.5">
          <Label htmlFor={`${id}-model`}>Model</Label>
          <Select value={model?.id} onValueChange={(v) => update({ modelId: v })}>
            <SelectTrigger id={`${id}-model`}>
              <SelectValue placeholder="Choose a model…" />
            </SelectTrigger>
            <SelectContent>
              {trainedModels.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name} · {TASK_LABELS[m.task]}
                  {m.backend === "sklearn" ? " · scikit-learn" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <ModelActions model={model} onImported={(m) => update({ modelId: m.id })} />
    </div>
  )

  if (!model) {
    return (
      <div className="space-y-4">
        {header}
        <div className="sketch-card flex flex-col items-center gap-2 p-8 text-center">
          <Target className="text-muted-foreground h-8 w-8" aria-hidden />
          <p className="font-handwritten-bold text-lg">No trained models yet</p>
          <p className="text-muted-foreground max-w-md text-sm">
            Train one in a Model Trainer or AutoML cell, or import a model JSON file, then make predictions here.
          </p>
        </div>
      </div>
    )
  }

  const lost = lostIds.includes(model.id)
  const markLost = () => setLostIds((prev) => (prev.includes(model.id) ? prev : [...prev, model.id]))
  const missingFeatures = model.features.filter((f) => !columns.includes(f))
  const values = Object.fromEntries(fields.map((f) => [f.name, content.values[f.name] ?? f.typical]))

  return (
    <div className="space-y-5">
      {header}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="secondary">{TASK_LABELS[model.task]}</Badge>
        <Badge variant="outline">{algorithmName(model.algorithm)}</Badge>
        <Badge variant="outline">{model.backend === "sklearn" ? "scikit-learn" : "TypeScript"}</Badge>
        {model.target && (
          <span className="text-muted-foreground">
            predicts <span className="font-handwritten-bold text-foreground">{model.target}</span> from{" "}
            {model.features.length} feature
            {model.features.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <MetricCards task={model.task} metrics={model.metrics} />

      {model.backend === "sklearn" && !lost && (
        <p className="text-muted-foreground text-xs">
          scikit-learn models live in this tab’s Python session. After a reload or Python restart they need to be
          retrained.
        </p>
      )}
      {lost && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>This model is no longer in memory</AlertTitle>
          <AlertDescription>
            The Python runtime was restarted (or the page reloaded), so the fitted scikit-learn model is gone. Retrain
            it in a Model Trainer cell — its metrics are still shown above.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={content.mode} onValueChange={(v) => update({ mode: v === "batch" ? "batch" : "single" })}>
        <TabsList>
          <TabsTrigger value="single">Single row</TabsTrigger>
          <TabsTrigger value="batch">Whole dataset</TabsTrigger>
        </TabsList>
        <TabsContent value="single" className="pt-3">
          <SinglePrediction
            key={model.id}
            model={model}
            fields={fields}
            values={values}
            onValuesChange={(next) => update({ values: { ...content.values, ...next } })}
            firstRow={processedData[0]}
            onLostModel={markLost}
          />
        </TabsContent>
        <TabsContent value="batch" className="space-y-3 pt-3">
          {processedData.length === 0 ? (
            <p className="text-muted-foreground text-sm">Load a dataset to predict many rows at once.</p>
          ) : (
            <>
              {missingFeatures.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Some features are missing from the current data</AlertTitle>
                  <AlertDescription>
                    {missingFeatures.join(", ")} — {missingFeatures.length === 1 ? "it" : "they"} will be treated as
                    missing values.
                  </AlertDescription>
                </Alert>
              )}
              <BatchPredictions
                key={model.id}
                model={model}
                rows={processedData}
                columns={columns}
                onLostModel={markLost}
              />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
