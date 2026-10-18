import { Badge } from "@/components/ui/badge"
import type { TrainedModel } from "@/lib/ml/types"
import { ConfusionMatrix } from "./confusion-matrix"
import { FeatureImportanceChart } from "./feature-importance-chart"
import { MetricCards } from "./metric-cards"
import { algorithmName, formatDuration, TASK_LABELS } from "./utils"

/** Summary of a trained model: metrics, confusion matrix, importance, sizes. */
export function ModelResult({ model }: { model: TrainedModel }) {
  const matrix = model.metrics.confusionMatrix
  const sizes = model.metrics.clusterSizes
  return (
    <section className="sketch-card space-y-4 p-4" aria-label={`Results for ${model.name}`}>
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="font-handwritten-bold text-lg">{model.name}</h3>
        <Badge variant="secondary">{TASK_LABELS[model.task]}</Badge>
        <Badge variant="outline">{algorithmName(model.algorithm)}</Badge>
        <Badge variant="outline">{model.backend === "sklearn" ? "scikit-learn" : "TypeScript"}</Badge>
      </header>
      <dl className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div className="flex gap-1">
          <dt>{model.task === "clustering" ? "Rows clustered:" : "Train rows:"}</dt>
          <dd className="text-foreground tabular-nums">{model.trainRows.toLocaleString()}</dd>
        </div>
        {model.task !== "clustering" && (
          <div className="flex gap-1">
            <dt>Test rows:</dt>
            <dd className="text-foreground tabular-nums">{model.testRows.toLocaleString()}</dd>
          </div>
        )}
        <div className="flex gap-1">
          <dt>Training time:</dt>
          <dd className="text-foreground tabular-nums">{formatDuration(model.trainingTimeMs)}</dd>
        </div>
        <div className="flex gap-1">
          <dt>Features:</dt>
          <dd className="text-foreground tabular-nums">{model.features.length}</dd>
        </div>
      </dl>
      <MetricCards task={model.task} metrics={model.metrics} />
      {model.task === "classification" && matrix && (
        <div className="space-y-2">
          <h4 className="font-handwritten-bold">Confusion matrix</h4>
          <ConfusionMatrix matrix={matrix} classes={model.classes} />
        </div>
      )}
      {model.task === "clustering" && sizes && (
        <p className="text-sm">
          Cluster sizes:{" "}
          {sizes.map((n, i) => (
            <Badge key={i} variant="outline" className="mr-1 tabular-nums">
              #{i + 1}: {n}
            </Badge>
          ))}
        </p>
      )}
      {model.task !== "clustering" && (
        <div className="space-y-2">
          <h4 className="font-handwritten-bold">Feature importance</h4>
          <FeatureImportanceChart importance={model.featureImportance} limit={10} />
        </div>
      )}
    </section>
  )
}
