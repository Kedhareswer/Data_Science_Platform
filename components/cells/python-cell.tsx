"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { Code2, Eraser, Loader2, Play, Square, TableProperties } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CodeEditor } from "@/components/python/code-editor"
import { InstallPackage } from "@/components/python/install-package"
import { capOutput, type StoredOutput } from "@/components/python/output"
import { RunOutput } from "@/components/python/run-output"
import { RuntimeBadge } from "@/components/python/runtime-badge"
import { DEFAULT_PYTHON_CODE, PYTHON_SNIPPETS } from "@/components/python/snippets"
import { useCellContent, useCellRunner, useData } from "@/lib/data-context"
import { getPythonRuntime, usePythonStatus } from "@/lib/python/client"
import type { DatasetPayload } from "@/lib/python/protocol"
import type { CellProps } from "./types"

export interface PythonCellContent {
  code: string
  output?: StoredOutput
}

const FALLBACK: PythonCellContent = { code: DEFAULT_PYTHON_CODE }

interface LiveStreams {
  stdout: string
  stderr: string
}

export function PythonCell({ cellId }: CellProps) {
  const { processedData, columns, datasetVersion, setProcessedData } = useData()
  const [content, setContent] = useCellContent<PythonCellContent>(cellId, FALLBACK)
  const { status, message } = usePythonStatus()
  const [running, setRunning] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [live, setLive] = useState<LiveStreams | null>(null)
  const runningRef = useRef(false)
  const stoppedRef = useRef(false)

  const dataset = useMemo<DatasetPayload>(
    () => ({ version: datasetVersion, columns, rows: processedData }),
    [datasetVersion, columns, processedData],
  )

  const setCode = useCallback((code: string) => setContent((prev) => ({ ...prev, code })), [setContent])

  const run = useCallback(async () => {
    if (runningRef.current) return
    const code = content.code
    if (!code.trim()) return
    runningRef.current = true
    stoppedRef.current = false
    setRunning(true)
    setLive({ stdout: "", stderr: "" })

    const streams: LiveStreams = { stdout: "", stderr: "" }
    let frame: number | null = null
    const flush = () => {
      frame = null
      setLive({ ...streams })
    }
    const started = performance.now()
    try {
      const result = await getPythonRuntime().run(code, dataset, (stream, text) => {
        streams[stream] += text
        frame ??= requestAnimationFrame(flush)
      })
      setContent((prev) => ({ ...prev, output: capOutput(result) }))
    } catch (err) {
      const stopped = stoppedRef.current
      const failed = capOutput({
        ok: false,
        stdout: streams.stdout,
        stderr: streams.stderr,
        figures: [],
        error: stopped ? undefined : err instanceof Error ? err.message : String(err),
        durationMs: performance.now() - started,
      })
      setContent((prev) => ({ ...prev, output: stopped ? { ...failed, stopped: true } : failed }))
    } finally {
      if (frame !== null) cancelAnimationFrame(frame)
      runningRef.current = false
      setRunning(false)
      setLive(null)
    }
  }, [content.code, dataset, setContent])

  useCellRunner(cellId, run)

  const stop = () => {
    stoppedRef.current = true
    getPythonRuntime().restart()
    toast.info("Python stopped", { description: "Variables were cleared; the runtime restarts on the next run." })
  }

  const clearOutput = () => setContent((prev) => ({ code: prev.code }))

  const insertSnippet = (snippet: string) => {
    const current = content.code.trimEnd()
    const replace = current === "" || current === DEFAULT_PYTHON_CODE.trimEnd()
    setCode(replace ? snippet : `${current}\n\n${snippet}`)
  }

  const adoptDataFrame = async () => {
    setExporting(true)
    try {
      const { columns: cols, rows } = await getPythonRuntime().exportDataFrame("df")
      setProcessedData(rows)
      toast.success("Notebook data updated from df", {
        description: `${rows.length.toLocaleString()} rows × ${cols.length} columns are now used by every cell.`,
      })
    } catch (err) {
      toast.error("Could not use df", { description: err instanceof Error ? err.message : String(err) })
    } finally {
      setExporting(false)
    }
  }

  const output: StoredOutput | undefined = live
    ? { ok: true, stdout: live.stdout, stderr: live.stderr, figures: [], durationMs: 0 }
    : content.output

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Python cell actions">
        {running ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={stop}
            className="font-handwritten"
            aria-label="Stop execution (restarts Python)"
          >
            <Square aria-hidden="true" />
            Stop
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => void run()}
            disabled={!content.code.trim()}
            className="font-handwritten"
            aria-label="Run code (Shift+Enter)"
          >
            <Play aria-hidden="true" />
            Run
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={clearOutput}
          disabled={running || !content.output}
          className="font-handwritten"
        >
          <Eraser aria-hidden="true" />
          Clear
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="font-handwritten">
              <Code2 aria-hidden="true" />
              Snippets
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuLabel className="font-handwritten-bold">Insert a snippet</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {PYTHON_SNIPPETS.map((snippet) => (
              <DropdownMenuItem
                key={snippet.id}
                onSelect={() => insertSnippet(snippet.code)}
                className="flex-col items-start gap-0"
              >
                <span className="font-handwritten">{snippet.label}</span>
                <span className="text-muted-foreground font-mono text-xs">{snippet.description}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void adoptDataFrame()}
          disabled={running || exporting}
          className="font-handwritten"
          title="Replace the notebook's working data with the current pandas df"
        >
          {exporting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <TableProperties aria-hidden="true" />}
          Use df as notebook data
        </Button>
        <InstallPackage disabled={running} />
        <div className="ml-auto">
          <RuntimeBadge />
        </div>
      </div>

      <CodeEditor value={content.code} onChange={setCode} onRun={() => void run()} ariaLabel="Python code editor" />

      <p className="font-handwritten text-muted-foreground text-xs">
        <kbd className="font-mono">Shift+Enter</kbd> or <kbd className="font-mono">Ctrl/⌘+Enter</kbd> to run ·{" "}
        <kbd className="font-mono">Esc</kbd> to leave the editor ·{" "}
        {processedData.length > 0
          ? `df has ${processedData.length.toLocaleString()} rows × ${columns.length} columns`
          : "no dataset loaded — df is empty"}
      </p>

      {running && status === "loading" && (
        <div
          role="status"
          className="bg-muted/40 font-handwritten text-muted-foreground flex items-center gap-2 rounded-md border border-dashed p-3 text-sm"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {message ?? "Loading Python…"} The first run downloads about 10 MB; after that it is cached.
        </div>
      )}

      {output && (!live || live.stdout || live.stderr) && (
        <section aria-label="Cell output" className="border-primary/40 rounded-md border-l-4 pl-3">
          <RunOutput output={output} />
        </section>
      )}
    </div>
  )
}
