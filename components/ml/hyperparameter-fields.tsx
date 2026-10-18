"use client"

import { useId } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { HyperparameterSpec, Hyperparameters } from "@/lib/ml/types"

interface HyperparameterFieldsProps {
  specs: HyperparameterSpec[]
  values: Hyperparameters
  onChange: (key: string, value: number | string) => void
  disabled?: boolean
}

function clamp(spec: HyperparameterSpec, n: number): number {
  let v = n
  if (spec.min !== undefined) v = Math.max(spec.min, v)
  if (spec.max !== undefined) v = Math.min(spec.max, v)
  return v
}

/** Form controls generated from an algorithm's hyperparameter specs. */
export function HyperparameterFields({ specs, values, onChange, disabled }: HyperparameterFieldsProps) {
  const id = useId()
  if (specs.length === 0)
    return <p className="text-muted-foreground text-sm">This algorithm has no hyperparameters to tune.</p>

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {specs.map((spec) => {
        const fieldId = `${id}-${spec.key}`
        const value = values[spec.key] ?? spec.default
        if (spec.type === "select") {
          return (
            <div key={spec.key} className="space-y-1.5">
              <Label htmlFor={fieldId}>{spec.label}</Label>
              <Select value={String(value)} onValueChange={(v) => onChange(spec.key, v)} disabled={disabled}>
                <SelectTrigger id={fieldId}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(spec.options ?? []).map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )
        }
        const range = spec.min !== undefined && spec.max !== undefined ? `${spec.min}–${spec.max}` : undefined
        return (
          <div key={spec.key} className="space-y-1.5">
            <Label htmlFor={fieldId}>{spec.label}</Label>
            <Input
              id={fieldId}
              type="number"
              inputMode="decimal"
              min={spec.min}
              max={spec.max}
              step={spec.step ?? "any"}
              value={typeof value === "number" ? value : String(value)}
              disabled={disabled}
              aria-describedby={range ? `${fieldId}-range` : undefined}
              onChange={(e) => {
                const n = e.target.valueAsNumber
                if (Number.isFinite(n)) onChange(spec.key, n)
              }}
              onBlur={(e) => {
                const n = e.target.valueAsNumber
                onChange(spec.key, Number.isFinite(n) ? clamp(spec, n) : Number(spec.default))
              }}
            />
            {range && (
              <p id={`${fieldId}-range`} className="text-muted-foreground text-xs">
                Range {range}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
