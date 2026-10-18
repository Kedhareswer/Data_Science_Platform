"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { Bold, Check, Code, Heading2, Italic, Link2, List, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { applyMarkdown, type MarkdownAction } from "@/components/notes/markdown-format"
import { MarkdownView } from "@/components/notes/markdown-view"
import { useCellContent } from "@/lib/data-context"
import type { CellProps } from "./types"

export interface NotesCellContent {
  markdown: string
}

const FALLBACK: NotesCellContent = { markdown: "" }

const ACTIONS: Array<{ action: MarkdownAction; label: string; shortcut?: string; icon: typeof Bold }> = [
  { action: "bold", label: "Bold", shortcut: "Ctrl+B", icon: Bold },
  { action: "italic", label: "Italic", shortcut: "Ctrl+I", icon: Italic },
  { action: "heading", label: "Heading", icon: Heading2 },
  { action: "list", label: "Bulleted list", icon: List },
  { action: "code", label: "Code", icon: Code },
  { action: "link", label: "Link", shortcut: "Ctrl+K", icon: Link2 },
]

export function NotesCell({ cellId }: CellProps) {
  const [content, setContent] = useCellContent<NotesCellContent>(cellId, FALLBACK)
  const markdown = content.markdown ?? ""
  const [editing, setEditing] = useState(() => markdown.trim() === "")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pendingSelection = useRef<[number, number] | null>(null)

  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.max(el.scrollHeight, 120)}px`
    if (pendingSelection.current) {
      el.focus()
      el.setSelectionRange(...pendingSelection.current)
      pendingSelection.current = null
    }
  }, [markdown, editing])

  const setMarkdown = (next: string) => setContent({ markdown: next })

  const format = (action: MarkdownAction) => {
    const el = textareaRef.current
    if (!el) return
    const edit = applyMarkdown(markdown, el.selectionStart, el.selectionEnd, action)
    pendingSelection.current = [edit.selectionStart, edit.selectionEnd]
    setMarkdown(edit.text)
  }

  const startEditing = () => {
    pendingSelection.current = [markdown.length, markdown.length]
    setEditing(true)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = event.ctrlKey || event.metaKey
    if (event.key === "Escape" || (mod && event.key === "Enter")) {
      event.preventDefault()
      setEditing(false)
      return
    }
    if (!mod) return
    const key = event.key.toLowerCase()
    const action: MarkdownAction | undefined =
      key === "b" ? "bold" : key === "i" ? "italic" : key === "k" ? "link" : undefined
    if (action) {
      event.preventDefault()
      format(action)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1" role="toolbar" aria-label="Notes formatting">
        {editing &&
          ACTIONS.map(({ action, label, shortcut, icon: Icon }) => (
            <Button
              key={action}
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={label}
              title={shortcut ? `${label} (${shortcut})` : label}
              // Keep the textarea's selection when clicking a toolbar button.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => format(action)}
            >
              <Icon aria-hidden="true" />
            </Button>
          ))}
        <Button
          type="button"
          variant={editing ? "secondary" : "ghost"}
          size="sm"
          className="font-handwritten ml-auto"
          onClick={() => (editing ? setEditing(false) : startEditing())}
        >
          {editing ? <Check aria-hidden="true" /> : <Pencil aria-hidden="true" />}
          {editing ? "Done" : "Edit"}
        </Button>
      </div>

      {editing ? (
        <div className="space-y-1">
          <textarea
            ref={textareaRef}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Markdown notes"
            placeholder={"# My findings\n\nWrite notes in **markdown** — lists, tables, `code` and links all work."}
            className="bg-muted/30 text-foreground placeholder:text-muted-foreground focus-visible:ring-ring block w-full resize-none rounded-md border p-3 font-mono text-sm leading-6 outline-hidden focus-visible:ring-2"
            autoFocus={markdown.trim() === ""}
          />
          <p className="font-handwritten text-muted-foreground text-xs">
            Markdown supported · <kbd className="font-mono">Esc</kbd> or <kbd className="font-mono">Ctrl/⌘+Enter</kbd>{" "}
            to preview
          </p>
        </div>
      ) : markdown.trim() ? (
        <div
          onDoubleClick={startEditing}
          title="Double-click to edit"
          className="hover:bg-muted/30 cursor-text rounded-md p-2"
        >
          <MarkdownView markdown={markdown} />
        </div>
      ) : (
        <button
          type="button"
          onClick={startEditing}
          className="font-handwritten text-muted-foreground hover:bg-muted/30 focus-visible:ring-ring flex w-full flex-col items-center gap-1 rounded-md border-2 border-dashed p-6 text-center transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
        >
          <Pencil className="h-5 w-5" aria-hidden="true" />
          <span>Nothing here yet — click to jot down some notes.</span>
        </button>
      )}
    </div>
  )
}
