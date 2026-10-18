"use client"

import { useSyncExternalStore } from "react"
import type { DataRow } from "@/lib/data/types"
import {
  DEFAULT_PYODIDE_INDEX_URL,
  type DatasetPayload,
  type RunResult,
  type RuntimeStatus,
  type WorkerRequest,
  type WorkerResponse,
} from "./protocol"

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

type Pending = {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  onStream?: (stream: "stdout" | "stderr", text: string) => void
}

export interface RuntimeState {
  status: RuntimeStatus
  message?: string
}

/** Helpers callable through `call()`; anything else is rejected by the worker too. */
export type PythonHelper = "_dn_sklearn_train" | "_dn_sklearn_predict" | "_dn_sklearn_forget"

/**
 * Owns the Pyodide Web Worker. Python runs off the main thread, so the UI never
 * freezes, and "Stop" terminates the worker (the only reliable way to interrupt
 * a running WebAssembly interpreter without cross-origin isolation).
 */
class PythonRuntime {
  private worker: Worker | null = null
  private ready: Promise<void> | null = null
  private nextId = 1
  private pending = new Map<number, Pending>()
  private state: RuntimeState = { status: "idle" }
  private listeners = new Set<() => void>()
  /** Bumps on restart so callers know in-memory Python state was lost. */
  generation = 0

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getState = () => this.state

  private setState(state: RuntimeState) {
    this.state = state
    for (const l of this.listeners) l()
  }

  private spawn(): Worker {
    const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module", name: "pyodide" })
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const msg = event.data
      if (msg.kind === "status") {
        this.setState({ status: msg.status, message: msg.message })
      } else if (msg.kind === "stream") {
        this.pending.get(msg.id)?.onStream?.(msg.stream, msg.text)
      } else {
        const p = this.pending.get(msg.id)
        if (!p) return
        this.pending.delete(msg.id)
        if (msg.ok) p.resolve(msg.value)
        else p.reject(new Error(msg.error))
      }
    }
    worker.onerror = (event) => {
      this.setState({ status: "error", message: event.message || "The Python worker crashed." })
    }
    return worker
  }

  private send<T>(req: DistributiveOmit<WorkerRequest, "id">, onStream?: Pending["onStream"]): Promise<T> {
    const id = this.nextId++
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, onStream })
      this.worker!.postMessage({ ...req, id } as WorkerRequest)
    })
  }

  /** Start the runtime (downloads ~10 MB the first time; cached by the browser afterwards). */
  init(): Promise<void> {
    if (this.ready) return this.ready
    this.worker = this.spawn()
    const indexURL = process.env.NEXT_PUBLIC_PYODIDE_INDEX_URL || DEFAULT_PYODIDE_INDEX_URL
    this.setState({ status: "loading", message: "Starting Python…" })
    this.ready = this.send<boolean>({ kind: "init", indexURL }).then(
      () => undefined,
      (err: Error) => {
        this.ready = null
        this.worker?.terminate()
        this.worker = null
        this.setState({ status: "error", message: err.message })
        throw err
      },
    )
    return this.ready
  }

  async run(code: string, dataset?: DatasetPayload, onStream?: Pending["onStream"]): Promise<RunResult> {
    await this.init()
    return this.send<RunResult>({ kind: "run", code, dataset }, onStream)
  }

  async install(packages: string[]): Promise<void> {
    await this.init()
    await this.send({ kind: "install", packages })
  }

  async exportDataFrame(name = "df"): Promise<{ columns: string[]; rows: DataRow[] }> {
    await this.init()
    return this.send({ kind: "export_df", name })
  }

  async call<T>(fn: PythonHelper, payload: unknown, packages: string[] = []): Promise<T> {
    await this.init()
    return this.send<T>({ kind: "call", fn, payload: JSON.stringify(payload), packages })
  }

  /** Kill the interpreter (interrupting any running code) and reject outstanding calls. */
  restart() {
    this.worker?.terminate()
    this.worker = null
    this.ready = null
    this.generation++
    for (const p of this.pending.values()) p.reject(new Error("Execution stopped — the Python runtime was restarted."))
    this.pending.clear()
    this.setState({ status: "idle", message: "Runtime stopped. It will restart on the next run." })
  }
}

let runtime: PythonRuntime | null = null

export function getPythonRuntime(): PythonRuntime {
  if (typeof window === "undefined") throw new Error("The Python runtime is only available in the browser.")
  runtime ??= new PythonRuntime()
  return runtime
}

const SERVER_STATE: RuntimeState = { status: "idle" }

/** Subscribe to the runtime's status (idle/loading/ready/busy/error). */
export function usePythonStatus(): RuntimeState {
  return useSyncExternalStore(
    (cb) => getPythonRuntime().subscribe(cb),
    () => getPythonRuntime().getState(),
    () => SERVER_STATE,
  )
}
