import type { RunResult } from "@/lib/python/protocol"

/** What a Python cell persists from its last run (kept small: it lives in the notebook file). */
export interface StoredOutput {
  ok: boolean
  stdout: string
  stderr: string
  result?: string
  table?: { columns: string[]; rows: Array<Record<string, unknown>>; totalRows: number }
  figures: string[]
  error?: string
  durationMs: number
  stopped?: boolean
  /** True when something was cut to keep the notebook small. */
  truncated?: boolean
}

const MAX_TEXT = 20_000
const MAX_TABLE_ROWS = 100
const MAX_TABLE_COLUMNS = 50
const MAX_FIGURES = 4
const MAX_FIGURE_BYTES = 1_500_000

function capText(text: string): [string, boolean] {
  if (text.length <= MAX_TEXT) return [text, false]
  return [`${text.slice(0, MAX_TEXT)}\n… (output truncated)`, true]
}

/** Shrink a RunResult so it can be stored with the notebook. Values are made JSON-safe. */
export function capOutput(result: RunResult): StoredOutput {
  const [stdout, t1] = capText(result.stdout ?? "")
  const [stderr, t2] = capText(result.stderr ?? "")
  const [error, t3] = result.error ? capText(result.error) : [undefined, false]
  const [repr, t4] = result.result ? capText(result.result) : [undefined, false]
  let truncated = t1 || t2 || t3 || t4

  let table: StoredOutput["table"]
  if (result.table) {
    const columns = result.table.columns.slice(0, MAX_TABLE_COLUMNS)
    const rows = result.table.rows.slice(0, MAX_TABLE_ROWS).map((row) => {
      const out: Record<string, unknown> = {}
      for (const c of columns) out[c] = toJsonSafe(row[c])
      return out
    })
    if (columns.length < result.table.columns.length || rows.length < result.table.rows.length) truncated = true
    table = { columns, rows, totalRows: result.table.totalRows }
  }

  const figures: string[] = []
  let figureBytes = 0
  for (const fig of result.figures ?? []) {
    if (figures.length >= MAX_FIGURES || figureBytes + fig.length > MAX_FIGURE_BYTES) {
      truncated = true
      break
    }
    figures.push(fig)
    figureBytes += fig.length
  }

  return {
    ok: result.ok,
    stdout,
    stderr,
    result: repr,
    table,
    figures,
    error,
    durationMs: result.durationMs,
    truncated: truncated || undefined,
  }
}

function toJsonSafe(value: unknown): unknown {
  if (value === null || value === undefined) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value)
  if (typeof value === "string" || typeof value === "boolean") return value
  return String(value)
}

/** Render any table cell value as plain text (React escapes it). */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(6)))
  if (typeof value === "object") {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)} s`
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`
}
