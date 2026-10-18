"use client"

import { useLayoutEffect, useMemo, useRef } from "react"
import { cn } from "@/lib/utils"

const INDENT = "    "

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  onRun?: () => void
  ariaLabel?: string
  className?: string
  minRows?: number
}

/**
 * A lightweight Python code editor: monospace textarea with a line-number gutter,
 * Tab/Shift+Tab indentation, Shift/Ctrl/Cmd+Enter to run, and auto-growing height.
 * Escape blurs the editor so keyboard users are never trapped by Tab handling.
 */
export function CodeEditor({
  value,
  onChange,
  onRun,
  ariaLabel = "Python code",
  className,
  minRows = 4,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pendingSelection = useRef<[number, number] | null>(null)
  const lineCount = useMemo(() => Math.max(minRows, value.split("\n").length), [value, minRows])

  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
    if (pendingSelection.current) {
      el.setSelectionRange(...pendingSelection.current)
      pendingSelection.current = null
    }
  }, [value])

  const replaceRange = (start: number, end: number, text: string, selection: [number, number]) => {
    pendingSelection.current = selection
    onChange(value.slice(0, start) + text + value.slice(end))
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = event.currentTarget
    if (event.key === "Enter" && (event.shiftKey || event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      onRun?.()
      return
    }
    if (event.key === "Escape") {
      el.blur()
      return
    }
    if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey) return
    event.preventDefault()
    const { selectionStart: start, selectionEnd: end } = el
    const lineStart = value.lastIndexOf("\n", start - 1) + 1

    if (event.shiftKey) {
      // Dedent every selected line by up to 4 spaces.
      const block = value.slice(lineStart, end)
      let removedFirst = 0
      let removedTotal = 0
      const dedented = block
        .split("\n")
        .map((line, i) => {
          const n = line.match(/^ {1,4}/)?.[0].length ?? 0
          if (i === 0) removedFirst = n
          removedTotal += n
          return line.slice(n)
        })
        .join("\n")
      replaceRange(lineStart, end, dedented, [
        Math.max(lineStart, start - removedFirst),
        Math.max(lineStart, end - removedTotal),
      ])
      return
    }

    if (start !== end && value.slice(start, end).includes("\n")) {
      // Indent every selected line.
      const block = value.slice(lineStart, end)
      const lines = block.split("\n")
      const indented = lines.map((line) => INDENT + line).join("\n")
      replaceRange(lineStart, end, indented, [start + INDENT.length, end + INDENT.length * lines.length])
      return
    }
    replaceRange(start, end, INDENT, [start + INDENT.length, start + INDENT.length])
  }

  return (
    <div className={cn("bg-muted/40 flex overflow-hidden rounded-md border font-mono text-sm leading-6", className)}>
      <div
        aria-hidden="true"
        className="bg-muted/60 text-muted-foreground border-r px-2 py-2 text-right text-xs leading-6 tabular-nums select-none"
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        wrap="off"
        rows={minRows}
        className="text-foreground placeholder:text-muted-foreground focus-visible:ring-ring block min-w-0 flex-1 resize-none overflow-x-auto overflow-y-hidden bg-transparent px-3 py-2 leading-6 whitespace-pre outline-hidden focus-visible:ring-2 focus-visible:ring-inset"
        placeholder="# Write Python here — df is your dataset"
      />
    </div>
  )
}
