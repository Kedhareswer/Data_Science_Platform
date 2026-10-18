"use client"

import { AlertTriangle, Clock, OctagonX } from "lucide-react"
import { formatDuration, formatValue, type StoredOutput } from "./output"

interface RunOutputProps {
  output: StoredOutput
}

/** Renders a Python cell's output. Everything is rendered as text nodes — never as HTML. */
export function RunOutput({ output }: RunOutputProps) {
  const hasError = Boolean(output.error) || output.stopped
  return (
    <div className="space-y-3" aria-live="polite">
      {output.stdout && (
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/50 p-3 font-mono text-xs leading-5 text-foreground">
          {output.stdout}
        </pre>
      )}
      {output.stderr && (
        <pre
          aria-label="Warnings"
          className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md border border-warning/40 bg-warning/10 p-3 font-mono text-xs leading-5 text-foreground"
        >
          {output.stderr}
        </pre>
      )}
      {output.stopped ? (
        <div role="status" className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 font-handwritten text-sm text-destructive">
          <OctagonX className="h-4 w-4" aria-hidden="true" />
          Execution stopped. Python state was reset — the next run restarts the runtime.
        </div>
      ) : (
        output.error && (
          <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3">
            <div className="mb-1 flex items-center gap-2 font-handwritten-bold text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Error
            </div>
            <pre className="max-h-96 overflow-auto whitespace-pre font-mono text-xs leading-5 text-destructive">{output.error}</pre>
          </div>
        )
      )}
      {output.table ? (
        <OutputTable table={output.table} />
      ) : (
        output.result && (
          <pre className="max-h-96 overflow-auto whitespace-pre rounded-md border bg-card p-3 font-mono text-xs leading-5 text-foreground">
            {output.result}
          </pre>
        )
      )}
      {output.figures.map((figure, i) => (
        <img
          key={i}
          src={`data:image/png;base64,${figure}`}
          alt={`Figure ${i + 1} produced by the Python cell`}
          className="max-w-full rounded-md border"
        />
      ))}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {!hasError && output.durationMs > 0 && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            Ran in {formatDuration(output.durationMs)}
          </span>
        )}
        {output.truncated && <span>Output was trimmed to keep the notebook small.</span>}
      </div>
    </div>
  )
}

function OutputTable({ table }: { table: NonNullable<StoredOutput["table"]> }) {
  return (
    <div className="space-y-1">
      <div className="max-h-[28rem] overflow-auto rounded-md border">
        <table className="w-full border-collapse font-mono text-xs">
          <thead className="sticky top-0 bg-muted">
            <tr>
              {table.columns.map((column, i) => (
                <th key={`${column}-${i}`} scope="col" className="whitespace-nowrap border-b px-3 py-1.5 text-left font-semibold text-foreground">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, r) => (
              <tr key={r} className="odd:bg-card even:bg-muted/30">
                {table.columns.map((column, c) => {
                  const value = row[column]
                  return (
                    <td key={c} className="whitespace-nowrap border-b px-3 py-1 text-foreground">
                      {value === null || value === undefined ? (
                        <span className="italic text-muted-foreground">null</span>
                      ) : (
                        formatValue(value)
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="font-handwritten text-xs text-muted-foreground">
        {table.totalRows > table.rows.length
          ? `Showing ${table.rows.length.toLocaleString()} of ${table.totalRows.toLocaleString()} rows`
          : `${table.totalRows.toLocaleString()} rows`}{" "}
        × {table.columns.length} columns
      </p>
    </div>
  )
}
