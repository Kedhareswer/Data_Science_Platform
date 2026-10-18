import { median } from "@/lib/data/stats"
import type { CellValue, ColumnTypes, DataRow } from "@/lib/data/types"
import { isMissing } from "@/lib/data/types"
import type { TrainedModel } from "@/lib/ml/types"

export type FieldKind = "number" | "boolean" | "category" | "text"

export interface FeatureField {
  name: string
  kind: FieldKind
  /** For categories: the observed values (as strings). */
  options: string[]
  /** Typical value as a string (median / most frequent). */
  typical: string
}

const MAX_OPTIONS = 100

function mostFrequent(values: readonly CellValue[]): string {
  const counts = new Map<string, number>()
  for (const v of values) counts.set(String(v), (counts.get(String(v)) ?? 0) + 1)
  let best = ""
  let bestCount = -1
  for (const [k, n] of counts) {
    if (n > bestCount) {
      best = k
      bestCount = n
    }
  }
  return best
}

/** Work out an input control for each model feature from the model's pipeline and the current data. */
export function featureFields(model: TrainedModel, rows: readonly DataRow[], types: ColumnTypes): FeatureField[] {
  const sample = rows.slice(0, 5000)
  return model.features.map((name): FeatureField => {
    const observed = sample.map((r) => r[name]).filter((v): v is Exclude<CellValue, null> => !isMissing(v))
    const pipeNum = model.pipeline?.numeric[name]
    const pipeCat = model.pipeline?.categorical[name]
    const allBool = observed.length > 0 && observed.every((v) => typeof v === "boolean")

    if (types[name] === "boolean" || allBool) {
      return {
        name,
        kind: "boolean",
        options: ["true", "false"],
        typical: observed.length ? mostFrequent(observed) : "false",
      }
    }
    if (pipeNum) return { name, kind: "number", options: [], typical: String(round(pipeNum.fill)) }
    if (pipeCat)
      return {
        name,
        kind: "category",
        options: pipeCat,
        typical: observed.length ? mostFrequent(observed) : (pipeCat[0] ?? ""),
      }

    const numbers = observed.filter((v): v is number => typeof v === "number")
    if (types[name] === "number" || (observed.length > 0 && numbers.length === observed.length)) {
      return { name, kind: "number", options: [], typical: numbers.length ? String(round(median(numbers))) : "" }
    }
    const distinct = [...new Set(observed.map(String))].sort()
    if (distinct.length > 0 && distinct.length <= MAX_OPTIONS) {
      return { name, kind: "category", options: distinct, typical: mostFrequent(observed) }
    }
    return { name, kind: "text", options: [], typical: observed.length ? String(observed[0]) : "" }
  })
}

function round(n: number): number {
  return Number.isFinite(n) ? Math.round(n * 1e6) / 1e6 : 0
}

/** Turn form strings back into typed cell values. */
export function buildRow(fields: readonly FeatureField[], values: Record<string, string>): DataRow {
  const row: DataRow = {}
  for (const f of fields) {
    const raw = (values[f.name] ?? f.typical).trim()
    if (raw === "") row[f.name] = null
    else if (f.kind === "number") row[f.name] = Number.isFinite(Number(raw)) ? Number(raw) : null
    else if (f.kind === "boolean") row[f.name] = raw === "true"
    else row[f.name] = raw
  }
  return row
}

/** Form strings from an existing data row. */
export function valuesFromRow(fields: readonly FeatureField[], row: DataRow | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of fields) {
    const v = row?.[f.name]
    out[f.name] = isMissing(v) ? "" : String(v)
  }
  return out
}
