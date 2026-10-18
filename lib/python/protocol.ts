import type { DataRow } from "@/lib/data/types"

/** Where Pyodide is loaded from. Override with NEXT_PUBLIC_PYODIDE_INDEX_URL to self-host. */
export const DEFAULT_PYODIDE_INDEX_URL = "https://cdn.jsdelivr.net/pyodide/v0.29.5/full/"

export type RuntimeStatus = "idle" | "loading" | "ready" | "busy" | "error"

export interface DatasetPayload {
  /** Changes whenever the notebook data changes; the worker only rebuilds `df` when it does. */
  version: string
  columns: string[]
  rows: DataRow[]
}

export interface TablePreview {
  columns: string[]
  rows: Array<Record<string, unknown>>
  totalRows: number
}

export interface RunResult {
  ok: boolean
  stdout: string
  stderr: string
  /** `repr()` of the last expression, if any. */
  result?: string
  /** Set when the last expression is a DataFrame/Series. */
  table?: TablePreview
  /** PNG figures captured from matplotlib, base64-encoded. */
  figures: string[]
  error?: string
  durationMs: number
}

export type WorkerRequest =
  | { kind: "init"; id: number; indexURL: string }
  | { kind: "run"; id: number; code: string; dataset?: DatasetPayload }
  | { kind: "install"; id: number; packages: string[] }
  | { kind: "export_df"; id: number; name: string }
  | { kind: "call"; id: number; fn: string; payload: string; packages: string[]; dataset?: DatasetPayload }

export type WorkerResponse =
  | { kind: "status"; status: RuntimeStatus; message?: string }
  | { kind: "stream"; id: number; stream: "stdout" | "stderr"; text: string }
  | { kind: "reply"; id: number; ok: true; value: unknown }
  | { kind: "reply"; id: number; ok: false; error: string }
