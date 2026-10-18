"use client"

import { memo, useState } from "react"
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd"
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Copy,
  GripVertical,
  Loader2,
  MoreHorizontal,
  Play,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useData } from "@/lib/data-context"
import { CELL_META, type NotebookCell as NotebookCellModel } from "@/lib/notebook"
import { cn } from "@/lib/utils"
import { CellErrorBoundary } from "./cell-error-boundary"
import { CATEGORY_ACCENT, CELL_COMPONENTS, CELL_ICONS } from "./cell-registry"

interface NotebookCellProps {
  cell: NotebookCellModel
  index: number
  total: number
  dragHandleProps?: DraggableProvidedDragHandleProps | null
  isRunning?: boolean
}

function CellTitle({ cell }: { cell: NotebookCellModel }) {
  const { updateCellTitle } = useData()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(cell.title)

  if (editing) {
    const commit = () => {
      updateCellTitle(cell.id, draft.trim() || CELL_META[cell.type].title)
      setEditing(false)
    }
    return (
      <Input
        autoFocus
        value={draft}
        aria-label="Cell title"
        className="font-handwritten-bold h-8 max-w-sm"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit()
          if (e.key === "Escape") {
            setDraft(cell.title)
            setEditing(false)
          }
        }}
      />
    )
  }

  return (
    <button
      type="button"
      className="font-handwritten-bold focus-visible:ring-ring truncate rounded-sm text-left text-lg hover:underline hover:decoration-dashed focus-visible:ring-2 focus-visible:outline-hidden"
      title="Rename cell"
      onClick={() => {
        setDraft(cell.title)
        setEditing(true)
      }}
    >
      {cell.title}
    </button>
  )
}

export const NotebookCell = memo(function NotebookCell({
  cell,
  index,
  total,
  dragHandleProps,
  isRunning,
}: NotebookCellProps) {
  const { removeCell, duplicateCell, reorderCells, runCell, updateCell, notebookCells, importNotebook, trainedModels } =
    useData()
  const [running, setRunning] = useState(false)
  const meta = CELL_META[cell.type]
  const Icon = CELL_ICONS[cell.type]
  const Body = CELL_COMPONENTS[cell.type]
  const busy = running || isRunning

  const run = async () => {
    setRunning(true)
    try {
      await runCell(cell.id)
    } catch (err) {
      toast.error(`“${cell.title}” failed`, { description: err instanceof Error ? err.message : String(err) })
    } finally {
      setRunning(false)
    }
  }

  const remove = () => {
    const snapshot = notebookCells
    removeCell(cell.id)
    toast(`Deleted “${cell.title}”`, {
      action: {
        label: "Undo",
        onClick: () =>
          importNotebook({
            format: "datanotebook",
            version: 2,
            exportedAt: "",
            cells: snapshot,
            models: trainedModels,
          }),
      },
    })
  }

  return (
    <article
      id={cell.id}
      aria-labelledby={`${cell.id}-label`}
      className={cn(
        "sketch-card scroll-mt-20 border-l-4 shadow-xs",
        CATEGORY_ACCENT[meta.category],
        busy && "ring-ring/40 ring-2",
      )}
    >
      <header className="flex items-center gap-2 border-b border-dashed px-3 py-2">
        <span
          {...dragHandleProps}
          className="text-muted-foreground hover:bg-accent cursor-grab rounded-sm p-1 active:cursor-grabbing"
          aria-label={`Drag to reorder cell ${index + 1}`}
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label={cell.collapsed ? "Expand cell" : "Collapse cell"}
          aria-expanded={!cell.collapsed}
          onClick={() => updateCell(cell.id, { collapsed: !cell.collapsed })}
        >
          {cell.collapsed ? <ChevronRight aria-hidden /> : <ChevronDown aria-hidden />}
        </Button>
        <Icon className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden />
        <span id={`${cell.id}-label`} className="min-w-0 flex-1">
          <CellTitle cell={cell} />
        </span>
        <span className="text-muted-foreground hidden text-xs sm:inline">[{index + 1}]</span>

        {meta.runnable && (
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Run cell" onClick={run} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Play aria-hidden />}
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Cell actions">
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={index === 0} onSelect={() => reorderCells(index, index - 1)}>
              <ArrowUp aria-hidden /> Move up
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === total - 1} onSelect={() => reorderCells(index, index + 1)}>
              <ArrowDown aria-hidden /> Move down
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => duplicateCell(cell.id)}>
              <Copy aria-hidden /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={remove}>
              <Trash2 aria-hidden /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      {!cell.collapsed && (
        <div className="p-3 sm:p-4">
          <CellErrorBoundary>
            <Body cellId={cell.id} />
          </CellErrorBoundary>
        </div>
      )}
    </article>
  )
})
