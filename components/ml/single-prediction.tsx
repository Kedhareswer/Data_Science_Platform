"use client"

import { useId, useState } from "react"
import { AlertCircle, Loader2, RotateCcw, Rows3, Wand2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DataRow } from "@/lib/data/types"
import { predict } from "@/lib/ml/engine"
import type { Prediction, TrainedModel } from "@/lib/ml/types"
import { buildRow, type FeatureField, valuesFromRow } from "./feature-fields"
import { PredictionResult } from "./prediction-result"
import { errorMessage, isLostSklearnModel } from "./utils"

interface SinglePredictionProps {
  model: TrainedModel
  fields: FeatureField[]
  values: Record<string, string>
  onValuesChange: (values: Record<string, string>) => void
  firstRow?: DataRow
  onLostModel: () => void
}

/** One-row prediction form. */
export function SinglePrediction({
  model,
  fields,
  values,
  onValuesChange,
  firstRow,
  onLostModel,
}: SinglePredictionProps) {
  const id = useId()
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)

  const set = (name: string, value: string) => onValuesChange({ ...values, [name]: value })

  const run = async () => {
    setRunning(true)
    setError(null)
    try {
      const [p] = await predict(model, [buildRow(fields, values)])
      setPrediction(p ?? null)
    } catch (err) {
      setPrediction(null)
      if (isLostSklearnModel(err)) onLostModel()
      else setError(errorMessage(err))
    } finally {
      setRunning(false)
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void run()
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((f, i) => {
          const fieldId = `${id}-${i}`
          const value = values[f.name] ?? f.typical
          if (f.kind === "category" || f.kind === "boolean") {
            const options = value && !f.options.includes(value) ? [value, ...f.options] : f.options
            return (
              <div key={f.name} className="space-y-1.5">
                <Label htmlFor={fieldId} className="block truncate" title={f.name}>
                  {f.name}
                </Label>
                <Select value={value || undefined} onValueChange={(v) => set(f.name, v)}>
                  <SelectTrigger id={fieldId}>
                    <SelectValue placeholder="Choose…" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.filter(Boolean).map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          }
          return (
            <div key={f.name} className="space-y-1.5">
              <Label htmlFor={fieldId} className="block truncate" title={f.name}>
                {f.name}
              </Label>
              <Input
                id={fieldId}
                type={f.kind === "number" ? "number" : "text"}
                inputMode={f.kind === "number" ? "decimal" : undefined}
                step="any"
                value={value}
                placeholder={f.typical}
                onChange={(e) => set(f.name, e.target.value)}
              />
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={running} className="font-handwritten-bold">
          {running ? <Loader2 className="animate-spin" aria-hidden /> : <Wand2 aria-hidden />}
          {running ? "Predicting…" : "Predict"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onValuesChange(Object.fromEntries(fields.map((f) => [f.name, f.typical])))}
        >
          <RotateCcw aria-hidden /> Typical values
        </Button>
        {firstRow && (
          <Button type="button" variant="outline" onClick={() => onValuesChange(valuesFromRow(fields, firstRow))}>
            <Rows3 aria-hidden /> Use first row
          </Button>
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        Empty fields are treated as missing and imputed the same way as during training.
      </p>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Prediction failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {prediction && <PredictionResult prediction={prediction} task={model.task} target={model.target} />}
    </form>
  )
}
