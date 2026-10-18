"use client"

import { useId } from "react"
import { BarChart3 } from "lucide-react"
import type { CellProps } from "@/components/cells/types"
import { ConfusionMatrix } from "@/components/ml/confusion-matrix"
import { binaryScores, ClusterSizesChart, CurveCharts, RegressionCharts } from "@/components/ml/evaluation-charts"
import { FeatureImportanceChart } from "@/components/ml/feature-importance-chart"
import { MetricCards } from "@/components/ml/metric-cards"
import { ModelComparison } from "@/components/ml/model-comparison"
import { algorithmName, TASK_LABELS, TASKS } from "@/components/ml/utils"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCellContent, useData } from "@/lib/data-context"
import type { TaskType, TrainedModel } from "@/lib/ml/types"

interface InsightsContent {
  task?: TaskType
  modelId?: string
  tab?: string
}

interface DetailTab {
  value: string
  label: string
  render: () => React.ReactNode
}

function detailTabs(model: TrainedModel): DetailTab[] {
  const tabs: DetailTab[] = []
  if (model.task !== "clustering") {
    tabs.push({
      value: "importance",
      label: "Feature importance",
      render: () => <FeatureImportanceChart importance={model.featureImportance} />,
    })
  }
  if (model.task === "classification" && model.metrics.confusionMatrix) {
    const matrix = model.metrics.confusionMatrix
    tabs.push({
      value: "confusion",
      label: "Confusion matrix",
      render: () => <ConfusionMatrix matrix={matrix} classes={model.classes} />,
    })
  }
  if (binaryScores(model))
    tabs.push({ value: "curves", label: "ROC & PR", render: () => <CurveCharts model={model} /> })
  if (model.task === "regression")
    tabs.push({ value: "residuals", label: "Predicted vs actual", render: () => <RegressionCharts model={model} /> })
  if (model.task === "clustering")
    tabs.push({ value: "clusters", label: "Cluster sizes", render: () => <ClusterSizesChart model={model} /> })
  return tabs
}

export function ModelInsightsCell({ cellId }: CellProps) {
  const { trainedModels } = useData()
  const [content, setContent] = useCellContent<InsightsContent>(cellId, {})
  const id = useId()
  const update = (patch: Partial<InsightsContent>) => setContent((prev) => ({ ...prev, ...patch }))

  if (trainedModels.length === 0) {
    return (
      <div className="sketch-card flex flex-col items-center gap-2 p-8 text-center">
        <BarChart3 className="text-muted-foreground h-8 w-8" aria-hidden />
        <p className="font-handwritten-bold text-lg">No models to compare yet</p>
        <p className="text-muted-foreground max-w-md text-sm">
          Train models with a Model Trainer or AutoML cell. Their held-out metrics, feature importance and evaluation
          charts show up here.
        </p>
      </div>
    )
  }

  const tasks = TASKS.filter((t) => trainedModels.some((m) => m.task === t))
  const task = content.task && tasks.includes(content.task) ? content.task : (trainedModels.at(-1)?.task ?? tasks[0])
  const models = trainedModels.filter((m) => m.task === task)
  const model = models.find((m) => m.id === content.modelId) ?? models.at(-1)!
  const tabs = detailTabs(model)
  const tab = tabs.some((t) => t.value === content.tab) ? content.tab! : tabs[0]?.value

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        {tasks.length > 1 && (
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-task`}>Task</Label>
            <Select value={task} onValueChange={(v) => update({ task: v as TaskType, modelId: undefined })}>
              <SelectTrigger id={`${id}-task`} className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tasks.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TASK_LABELS[t]} ({trainedModels.filter((m) => m.task === t).length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <p className="text-muted-foreground text-sm">
          {models.length} {TASK_LABELS[task].toLowerCase()} model{models.length === 1 ? "" : "s"} · all metrics come
          from each model’s held-out evaluation.
        </p>
      </div>

      <section className="space-y-2" aria-labelledby={`${id}-cmp`}>
        <h3 id={`${id}-cmp`} className="font-handwritten-bold text-lg">
          Comparison
        </h3>
        <ModelComparison
          task={task}
          models={models}
          selectedId={model.id}
          onSelect={(modelId) => update({ modelId })}
        />
      </section>

      <section className="sketch-card space-y-4 p-4" aria-labelledby={`${id}-detail`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h3 id={`${id}-detail`} className="font-handwritten-bold text-lg">
              Model details
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline">{algorithmName(model.algorithm)}</Badge>
              <Badge variant="outline">{model.backend === "sklearn" ? "scikit-learn" : "TypeScript"}</Badge>
              <Badge variant="outline">trained {new Date(model.trainedAt).toLocaleString()}</Badge>
            </div>
          </div>
          <div className="min-w-56 space-y-1.5">
            <Label htmlFor={`${id}-model`}>Model</Label>
            <Select value={model.id} onValueChange={(modelId) => update({ modelId })}>
              <SelectTrigger id={`${id}-model`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <MetricCards task={model.task} metrics={model.metrics} />

        {Object.keys(model.hyperparameters).length > 0 && (
          <p className="text-muted-foreground text-xs">
            Hyperparameters:{" "}
            {Object.entries(model.hyperparameters)
              .map(([k, v]) => `${k}=${String(v)}`)
              .join(", ")}
          </p>
        )}

        {tabs.length > 0 && tab && (
          <Tabs value={tab} onValueChange={(v) => update({ tab: v })}>
            <TabsList className="h-auto flex-wrap">
              {tabs.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {tabs.map((t) => (
              <TabsContent key={t.value} value={t.value} className="pt-3">
                {t.render()}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </section>
    </div>
  )
}
