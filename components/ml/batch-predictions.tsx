"use client"

import { useId, useState } from "react"
import { AlertCircle, Download, Loader2, Rows3 } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { CellValue, DataRow } from "@/lib/data/types"
import { predict } from "@/lib/ml/engine"
import type { Prediction, TrainedModel } from "@/lib/ml/types"
import { downloadText, errorMessage, formatCellValue, isLostSklearnModel, toCSV } from "./utils"

interface BatchPredictionsProps {
  model: TrainedModel
  rows: readonly DataRow[]
  columns: readonly string[]
  onLostModel: () => void
}

const LIMITS = ["100", "1000", "10000", "all"] as const
type Limit = (typeof LIMITS)[number]
const PREVIEW_ROWS = 20

export function BatchPredictions({ model, rows, columns, onLostModel }: BatchPredictionsProps) {
  const id = useId()
  const [limit, setLimit] = useState<Limit>(rows.length <= 1000 ? "all" : "1000")
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ rows: readonly DataRow[]; predictions: Prediction[] } | null>(null)

  const run = async () => {
    const subset = limit === "all" ? rows : rows.slice(0, Number(limit))
    setRunning(true)
    setError(null)
    try {
      await new Promise((resolve) => setTimeout(resolve, 0))
      const predictions = await predict(model, subset)
      setResult({ rows: subset, predictions })
      toast.success(`Predicted ${predictions.length.toLocaleString()} rows`)
    } catch (err) {
      if (isLostSklearnModel(err)) onLostModel()
      else setError(errorMessage(err))
    } finally {
      setRunning(false)
    }
  }

  const predictionColumn = `predicted_${model.target ?? (model.task === "clustering" ? "cluster" : "value")}`
  const classLabels = result ? [...new Set(result.predictions.flatMap((p) => Object.keys(p.probabilities ?? {})))] : []
  const hasConfidence = !!result?.predictions.some((p) => p.confidence !== undefined)

  const downloadCSV = () => {
    if (!result) return
    const probCols = classLabels.length <= 20 ? classLabels : []
    const headers = [
      ...columns,
      predictionColumn,
      ...(hasConfidence ? ["confidence"] : []),
      ...probCols.map((c) => `p_${c}`),
    ]
    const body = result.rows.map((row, i): CellValue[] => {
      const p = result.predictions[i]
      return [
        ...columns.map((c) => row[c] ?? null),
        p?.value ?? null,
        ...(hasConfidence ? [p?.confidence ?? null] : []),
        ...probCols.map((c) => p?.probabilities?.[c] ?? null),
      ]
    })
    downloadText(toCSV(headers, body), `${model.name.replace(/[^\w.-]+/g, "_").toLowerCase()}_predictions.csv`)
  }

  const shownFeatures = model.features.slice(0, 6)
  const showActual = !!model.target && columns.includes(model.target)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-limit`}>Rows to predict</Label>
          <Select value={limit} onValueChange={(v) => setLimit(v as Limit)}>
            <SelectTrigger id={`${id}-limit`} className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIMITS.filter((l) => l === "all" || Number(l) < rows.length).map((l) => (
                <SelectItem key={l} value={l}>
                  {l === "all" ? `All ${rows.length.toLocaleString()} rows` : `First ${Number(l).toLocaleString()}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => void run()} disabled={running || rows.length === 0}>
          {running ? <Loader2 className="animate-spin" aria-hidden /> : <Rows3 aria-hidden />}
          {running ? "Predicting…" : "Predict dataset"}
        </Button>
        <Button variant="outline" onClick={downloadCSV} disabled={!result}>
          <Download aria-hidden /> Download CSV
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Batch prediction failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <div className="space-y-2">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {shownFeatures.map((f) => (
                    <TableHead key={f}>{f}</TableHead>
                  ))}
                  {showActual && <TableHead>{model.target} (actual)</TableHead>}
                  <TableHead className="font-handwritten-bold text-foreground">Prediction</TableHead>
                  {hasConfidence && <TableHead className="text-right">Confidence</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.slice(0, PREVIEW_ROWS).map((row, i) => {
                  const p = result.predictions[i]
                  return (
                    <TableRow key={i}>
                      {shownFeatures.map((f) => (
                        <TableCell key={f} className="tabular-nums">
                          {formatCellValue(row[f])}
                        </TableCell>
                      ))}
                      {showActual && (
                        <TableCell className="tabular-nums">{formatCellValue(row[model.target!])}</TableCell>
                      )}
                      <TableCell className="font-handwritten-bold tabular-nums">{formatCellValue(p?.value)}</TableCell>
                      {hasConfidence && (
                        <TableCell className="text-right tabular-nums">
                          {p?.confidence !== undefined ? `${(p.confidence * 100).toFixed(1)}%` : "—"}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <p className="text-muted-foreground text-xs">
            Showing {Math.min(PREVIEW_ROWS, result.rows.length)} of {result.rows.length.toLocaleString()} predictions
            {model.features.length > shownFeatures.length
              ? ` · ${model.features.length - shownFeatures.length} more features in the CSV`
              : ""}
            .
          </p>
        </div>
      )}
    </div>
  )
}
