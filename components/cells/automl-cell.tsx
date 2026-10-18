"use client"

import { useId, useRef, useState } from "react"
import { AlertCircle, Check, Loader2, Save, Sparkles, Trophy } from "lucide-react"
import { toast } from "sonner"
import type { CellProps } from "@/components/cells/types"
import { DataUploadPrompt } from "@/components/data-upload-prompt"
import { FeaturePicker } from "@/components/ml/feature-picker"
import { type TaskTarget, TaskTargetFields } from "@/components/ml/task-target-fields"
import {
  algorithmName,
  defaultFeatures,
  errorMessage,
  formatDuration,
  resolveFeatures,
  scalarMetrics,
} from "@/components/ml/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCellContent, useCellRunner, useData } from "@/lib/data-context"
import { formatMetric, headlineMetrics, METRIC_LABELS, primaryMetric, runAutoML } from "@/lib/ml/engine"
import type { AlgorithmId, TaskType, TrainedModel } from "@/lib/ml/types"

interface LeaderRow {
  id: string
  name: string
  algorithm: AlgorithmId
  metrics: Record<string, number>
  trainingTimeMs: number
}

interface AutoMLSummary {
  runAt: string
  task: TaskType
  target?: string
  primaryMetric: string
  rows: LeaderRow[]
  failures: Array<{ algorithm: string; error: string }>
}

interface AutoMLContent {
  task: TaskType
  target?: string
  features?: string[]
  testSize: number
  seed: number
  /** Lightweight leaderboard (no fitted state); full models live in memory until saved. */
  result?: AutoMLSummary
}

const DEFAULT_CONTENT: AutoMLContent = { task: "classification", testSize: 0.2, seed: 42 }

interface LiveCandidate {
  name: string
  score?: number
  error?: string
}

export function AutoMLCell({ cellId }: CellProps) {
  const { processedData, columns, columnTypes, trainedModels, addTrainedModel } = useData()
  const [stored, setContent] = useCellContent<AutoMLContent>(cellId, DEFAULT_CONTENT)
  const content = { ...DEFAULT_CONTENT, ...stored }
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [live, setLive] = useState<LiveCandidate[]>([])
  const [models, setModels] = useState<Record<string, TrainedModel>>({})
  const [error, setError] = useState<string | null>(null)
  const busy = useRef(false)
  const id = useId()

  const { task, testSize, seed, result } = content
  const target = task === "clustering" ? undefined : content.target
  const fallback = defaultFeatures(processedData, columns, columnTypes, target)
  const features = resolveFeatures(content.features, fallback, columns, target)
  const savedIds = new Set(trainedModels.map((m) => m.id))

  const update = (patch: Partial<AutoMLContent>) => setContent((prev) => ({ ...DEFAULT_CONTENT, ...prev, ...patch }))

  const run = async () => {
    if (busy.current) return
    if (features.length === 0) return setError("Select at least one feature column.")
    if (task !== "clustering" && !target) return setError("Choose a target column.")
    busy.current = true
    setRunning(true)
    setError(null)
    setLive([])
    setProgress({ done: 0, total: 0 })
    const metric = primaryMetric(task)
    try {
      const out = await runAutoML(processedData, {
        task,
        target,
        features,
        testSize,
        seed,
        onProgress: (done, total, model, err) => {
          setProgress({ done, total })
          setLive((prev) => [
            ...prev,
            model
              ? { name: model.name, score: model.metrics[metric] as number | undefined }
              : { name: `Candidate ${done}`, error: err },
          ])
        },
      })
      setModels(Object.fromEntries(out.leaderboard.map((m) => [m.id, m])))
      update({
        result: {
          runAt: new Date().toISOString(),
          task,
          target,
          primaryMetric: out.primaryMetric,
          rows: out.leaderboard.map((m) => ({
            id: m.id,
            name: m.name,
            algorithm: m.algorithm,
            metrics: scalarMetrics(m.metrics),
            trainingTimeMs: m.trainingTimeMs,
          })),
          failures: out.failures,
        },
      })
      if (out.best) {
        toast.success(`AutoML finished: ${out.leaderboard.length} models`, {
          description: `Best: ${out.best.name} (${METRIC_LABELS[out.primaryMetric] ?? out.primaryMetric} ${formatMetric(out.primaryMetric, out.best.metrics[out.primaryMetric])})`,
        })
      } else {
        const message = out.failures[0]?.error ?? "No model could be trained."
        setError(message)
        toast.error("AutoML failed", { description: message })
      }
    } catch (err) {
      const message = errorMessage(err)
      setError(message)
      toast.error("AutoML failed", { description: message })
    } finally {
      busy.current = false
      setRunning(false)
    }
  }

  // "Run all" skips an unconfigured cell instead of erroring.
  useCellRunner(cellId, () =>
    processedData.length >= 10 && features.length > 0 && (task === "clustering" || !!target) ? run() : undefined,
  )

  const save = (rowId: string) => {
    if (savedIds.has(rowId)) {
      toast.info("That model is already saved.")
      return
    }
    const model = models[rowId]
    if (!model) {
      toast.error("Model no longer in memory", {
        description: "This leaderboard was restored from the notebook. Run AutoML again to save models.",
      })
      return
    }
    addTrainedModel(model)
    toast.success(`Saved ${model.name}`, { description: "Use it in a Predictor or Model Insights cell." })
  }

  if (processedData.length === 0) {
    return (
      <DataUploadPrompt
        title="No data for AutoML"
        description="Load a dataset to train and rank models automatically."
      />
    )
  }

  const changeTaskTarget = ({ task: nextTask, target: nextTarget }: TaskTarget) => {
    update({ task: nextTask, target: nextTarget, features: content.features?.filter((f) => f !== nextTarget) })
  }

  const tooFew = processedData.length < 10
  const canRun = !running && !tooFew && features.length > 0 && (task === "clustering" || !!target)
  const metricKeys = result
    ? headlineMetrics(result.task).filter((k) => result.rows.some((r) => typeof r.metrics[k] === "number"))
    : []
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="space-y-5">
      {tooFew && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not enough rows</AlertTitle>
          <AlertDescription>At least 10 rows are needed; this dataset has {processedData.length}.</AlertDescription>
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

      <div className="grid gap-4 sm:grid-cols-2">
        {task !== "clustering" && (
          <div className="space-y-2">
            <Label id={`${id}-test`}>Test set: {Math.round(testSize * 100)}%</Label>
            <Slider
              aria-labelledby={`${id}-test`}
              min={10}
              max={50}
              step={5}
              value={[Math.round(testSize * 100)]}
              onValueChange={([v]) => update({ testSize: v / 100 })}
              disabled={running}
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
            disabled={running}
            onChange={(e) =>
              Number.isFinite(e.target.valueAsNumber) && update({ seed: Math.trunc(e.target.valueAsNumber) })
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void run()} disabled={!canRun} className="font-handwritten-bold">
          {running ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
          {running ? "Searching…" : "Run AutoML"}
        </Button>
        <p className="text-muted-foreground text-xs">
          Trains every TypeScript algorithm for this task (plus a few variants) on the same split.
        </p>
      </div>

      {(running || live.length > 0) && (
        <div className="space-y-2" aria-live="polite">
          <div className="flex justify-between text-sm">
            <span>{running ? "Training candidates…" : "Candidates trained"}</span>
            <span className="text-muted-foreground tabular-nums">
              {progress.done}/{progress.total || "?"}
            </span>
          </div>
          <Progress value={pct} aria-label="AutoML progress" />
          <ul className="flex flex-wrap gap-1.5">
            {live.map((c, i) => (
              <li key={i}>
                <Badge variant={c.error ? "destructive" : "outline"} className="font-normal" title={c.error}>
                  {c.error ? "✗" : "✓"} {c.name}
                  {c.score !== undefined && (
                    <span className="text-muted-foreground ml-1 tabular-nums">
                      {formatMetric(primaryMetric(task), c.score)}
                    </span>
                  )}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>AutoML failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && result.rows.length > 0 && (
        <section className="sketch-card space-y-3 p-4" aria-labelledby={`${id}-lb`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id={`${id}-lb`} className="font-handwritten-bold flex items-center gap-2 text-lg">
              <Trophy className="text-warning h-5 w-5" aria-hidden /> Leaderboard
              <span className="text-muted-foreground text-sm font-normal">
                ranked by {METRIC_LABELS[result.primaryMetric] ?? result.primaryMetric}
                {result.target ? ` · target ${result.target}` : ""}
              </span>
            </h3>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => save(result.rows[0].id)}
              disabled={savedIds.has(result.rows[0].id)}
            >
              {savedIds.has(result.rows[0].id) ? <Check aria-hidden /> : <Save aria-hidden />}
              {savedIds.has(result.rows[0].id) ? "Best saved" : "Save best"}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Model</TableHead>
                  {metricKeys.map((k) => (
                    <TableHead key={k} className="text-right">
                      {METRIC_LABELS[k] ?? k}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Time</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((row, i) => {
                  const saved = savedIds.has(row.id)
                  return (
                    <TableRow key={row.id} className={i === 0 ? "bg-muted/60" : undefined}>
                      <TableCell className="tabular-nums">{i + 1}</TableCell>
                      <TableCell>
                        <span className="font-handwritten-bold">{row.name}</span>
                        {row.name !== algorithmName(row.algorithm) && (
                          <span className="text-muted-foreground block text-xs">{algorithmName(row.algorithm)}</span>
                        )}
                      </TableCell>
                      {metricKeys.map((k) => (
                        <TableCell
                          key={k}
                          className={`text-right tabular-nums ${k === result.primaryMetric ? "font-handwritten-bold" : ""}`}
                        >
                          {formatMetric(k, row.metrics[k])}
                        </TableCell>
                      ))}
                      <TableCell className="text-muted-foreground text-right tabular-nums">
                        {formatDuration(row.trainingTimeMs)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={saved ? "ghost" : "outline"}
                          onClick={() => save(row.id)}
                          disabled={saved}
                          aria-label={saved ? `${row.name} saved` : `Save ${row.name}`}
                        >
                          {saved ? <Check aria-hidden /> : <Save aria-hidden />}
                          {saved ? "Saved" : "Save"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <p className="text-muted-foreground text-xs">
            Run {new Date(result.runAt).toLocaleString()} · metrics are on the held-out test set
            {Object.keys(models).length === 0 && !running
              ? " · restored from the notebook, re-run to save unsaved models"
              : ""}
            .
          </p>
        </section>
      )}

      {result && result.failures.length > 0 && (
        <details className="rounded-lg border-2 border-dashed p-3 text-sm">
          <summary className="font-handwritten-bold cursor-pointer">
            {result.failures.length} candidate{result.failures.length === 1 ? "" : "s"} failed
          </summary>
          <ul className="mt-2 space-y-1">
            {result.failures.map((f, i) => (
              <li key={i}>
                <span className="font-handwritten-bold">{f.algorithm}:</span>{" "}
                <span className="text-destructive">{f.error}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
