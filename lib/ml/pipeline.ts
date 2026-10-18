import { type CellValue, type DataRow, isMissing } from "@/lib/data/types"
import { mean, median, std } from "@/lib/data/stats"

/**
 * Turns table rows into a numeric design matrix:
 *  - numeric columns: median-imputed, then standardized (z-score)
 *  - other columns: one-hot encoded (unseen categories map to all zeros)
 * The fitted state is plain JSON so it can be saved alongside the model.
 */
export interface PipelineState {
  features: string[]
  numeric: Record<string, { fill: number; mean: number; std: number }>
  categorical: Record<string, string[]>
  outputNames: string[]
}

function asNumber(v: CellValue): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  if (typeof v === "boolean") return v ? 1 : 0
  return null
}

export function fitPipeline(rows: readonly DataRow[], features: readonly string[]): PipelineState {
  const state: PipelineState = { features: [...features], numeric: {}, categorical: {}, outputNames: [] }
  for (const feature of features) {
    const values = rows.map((r) => r[feature]).filter((v) => !isMissing(v))
    const nums = values.map(asNumber)
    const isNumeric = values.length > 0 && nums.every((n) => n !== null)
    if (isNumeric) {
      const ns = nums as number[]
      const s = std(ns)
      state.numeric[feature] = { fill: median(ns), mean: mean(ns), std: Number.isFinite(s) && s > 0 ? s : 1 }
      state.outputNames.push(feature)
    } else {
      const categories = [...new Set(values.map(String))].sort().slice(0, 50)
      state.categorical[feature] = categories
      for (const c of categories) state.outputNames.push(`${feature}=${c}`)
    }
  }
  return state
}

export function transformRow(state: PipelineState, row: DataRow): number[] {
  const out: number[] = []
  for (const feature of state.features) {
    const num = state.numeric[feature]
    if (num) {
      const v = asNumber(row[feature] ?? null) ?? num.fill
      out.push((v - num.mean) / num.std)
    } else {
      const raw = row[feature]
      const value = isMissing(raw) ? null : String(raw)
      for (const c of state.categorical[feature] ?? []) out.push(value === c ? 1 : 0)
    }
  }
  return out
}

export function transformRows(state: PipelineState, rows: readonly DataRow[]): number[][] {
  return rows.map((row) => transformRow(state, row))
}

/** Map an expanded column back to the original feature (for importance). */
export function sourceFeature(state: PipelineState, outputIndex: number): string {
  const name = state.outputNames[outputIndex]
  return state.numeric[name] ? name : name.slice(0, name.indexOf("="))
}
