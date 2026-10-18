/// <reference lib="webworker" />
import { BOOTSTRAP_PY } from "./bootstrap-py"
import { SKLEARN_PY } from "./sklearn-py"
import type { DatasetPayload, RunResult, WorkerRequest, WorkerResponse } from "./protocol"

// Minimal surface of the Pyodide API we use (the CDN module is untyped here).
interface PyProxy {
  toJs(options?: { dict_converter?: typeof Object.fromEntries }): unknown
  destroy(): void
}
interface Pyodide {
  globals: { get(name: string): unknown; set(name: string, value: unknown): void }
  runPythonAsync(code: string, options?: { globals?: unknown }): Promise<unknown>
  runPython(code: string): unknown
  loadPackage(names: string | string[]): Promise<unknown>
  loadPackagesFromImports(code: string): Promise<unknown>
  setStdout(options: { batched: (text: string) => void }): void
  setStderr(options: { batched: (text: string) => void }): void
  pyimport(name: string): { install(pkgs: string[]): Promise<void> }
  isPyProxy?(value: unknown): value is PyProxy
}

declare const self: DedicatedWorkerGlobalScope

let pyodide: Pyodide | null = null
let loading: Promise<Pyodide> | null = null
let currentId = -1
let stdout = ""
let stderr = ""

function post(message: WorkerResponse) {
  self.postMessage(message)
}

async function load(indexURL: string): Promise<Pyodide> {
  if (pyodide) return pyodide
  if (loading) return loading
  loading = (async () => {
    post({ kind: "status", status: "loading", message: "Downloading Python runtime…" })
    const url = new URL("pyodide.mjs", indexURL).href
    const mod = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url)) as {
      loadPyodide(options: { indexURL: string }): Promise<Pyodide>
    }
    const py = await mod.loadPyodide({ indexURL })
    post({ kind: "status", status: "loading", message: "Loading pandas & numpy…" })
    await py.loadPackage(["numpy", "pandas"])
    py.setStdout({
      batched: (text) => {
        stdout += text + "\n"
        post({ kind: "stream", id: currentId, stream: "stdout", text: text + "\n" })
      },
    })
    py.setStderr({
      batched: (text) => {
        stderr += text + "\n"
        post({ kind: "stream", id: currentId, stream: "stderr", text: text + "\n" })
      },
    })
    py.runPython(BOOTSTRAP_PY)
    py.runPython(SKLEARN_PY)
    pyodide = py
    post({ kind: "status", status: "ready" })
    return py
  })()
  try {
    return await loading
  } catch (err) {
    loading = null
    post({ kind: "status", status: "error", message: errorMessage(err) })
    throw err
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

function syncDataset(py: Pyodide, dataset?: DatasetPayload) {
  if (!dataset) return
  py.globals.set("__dn_version", dataset.version)
  py.globals.set("__dn_columns", JSON.stringify(dataset.columns))
  py.globals.set("__dn_rows", JSON.stringify(dataset.rows))
  py.runPython("_dn_load_dataset(__dn_version, __dn_columns, __dn_rows)\ndel __dn_rows, __dn_columns, __dn_version")
}

function toJs(value: unknown): unknown {
  if (value && typeof value === "object" && "toJs" in value) {
    const proxy = value as PyProxy
    const js = proxy.toJs({ dict_converter: Object.fromEntries })
    proxy.destroy()
    return js
  }
  return value
}

async function run(py: Pyodide, code: string, dataset?: DatasetPayload): Promise<RunResult> {
  const started = performance.now()
  stdout = ""
  stderr = ""
  try {
    await py.loadPackagesFromImports(code)
    if (/\b(matplotlib|seaborn|plt)\b/.test(code)) {
      await py.loadPackage("matplotlib")
      py.runPython("_dn_setup_matplotlib()")
    }
    syncDataset(py, dataset)
    const value = await py.runPythonAsync(code)
    py.globals.set("__dn_last", value)
    const described = toJs(py.runPython("_dn_describe(__dn_last)")) as [string | null, RunResult["table"] | null]
    py.runPython("del __dn_last")
    if (value && typeof value === "object" && "destroy" in value) (value as PyProxy).destroy()
    const figures = toJs(py.runPython("_dn_capture_figures()")) as string[]
    return {
      ok: true,
      stdout,
      stderr,
      result: described[0] ?? undefined,
      table: described[1] ?? undefined,
      figures,
      durationMs: Math.round(performance.now() - started),
    }
  } catch (err) {
    let figures: string[] = []
    try {
      figures = toJs(py.runPython("_dn_capture_figures()")) as string[]
    } catch {
      // ignore – the interpreter may be in a bad state
    }
    return { ok: false, stdout, stderr, figures, error: errorMessage(err), durationMs: Math.round(performance.now() - started) }
  }
}

async function handle(req: WorkerRequest): Promise<unknown> {
  if (req.kind === "init") {
    await load(req.indexURL)
    return true
  }
  const py = pyodide
  if (!py) throw new Error("Python runtime is not initialised")
  switch (req.kind) {
    case "run":
      return run(py, req.code, req.dataset)
    case "install": {
      await py.loadPackage("micropip")
      const micropip = py.pyimport("micropip")
      await micropip.install(req.packages)
      return true
    }
    case "export_df": {
      py.globals.set("__dn_name", req.name)
      const json = py.runPython("_dn_export(__dn_name)") as string
      return JSON.parse(json)
    }
    case "call": {
      if (req.packages.length) await py.loadPackage(req.packages)
      syncDataset(py, req.dataset)
      py.globals.set("__dn_payload", req.payload)
      // `fn` is chosen by our own code from a fixed allow-list (see client.ts).
      if (!/^_dn_[a-z_]+$/.test(req.fn)) throw new Error("Invalid helper")
      const json = (await py.runPythonAsync(`${req.fn}(__dn_payload)`)) as string
      return JSON.parse(json)
    }
  }
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const req = event.data
  currentId = req.id
  if (req.kind !== "init" && pyodide) post({ kind: "status", status: "busy" })
  try {
    const value = await handle(req)
    post({ kind: "reply", id: req.id, ok: true, value })
  } catch (err) {
    post({ kind: "reply", id: req.id, ok: false, error: errorMessage(err) })
  } finally {
    if (pyodide) post({ kind: "status", status: "ready" })
  }
}
