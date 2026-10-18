"use client"

import { useData } from "@/lib/data-context"
import { CELL_ICONS } from "./cell-registry"

/** Sticky table of contents for jumping between cells on large screens. */
export function NotebookOutline() {
  const { notebookCells } = useData()
  if (notebookCells.length < 2) return null
  return (
    <nav aria-label="Notebook outline" className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] overflow-y-auto xl:block">
      <p className="mb-2 font-handwritten-bold text-sm text-muted-foreground">Outline</p>
      <ol className="space-y-1 text-sm">
        {notebookCells.map((cell, i) => {
          const Icon = CELL_ICONS[cell.type]
          return (
            <li key={cell.id}>
              <a
                href={`#${cell.id}`}
                className="flex items-center gap-2 rounded-sm px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <span className="w-5 text-right text-xs">{i + 1}</span>
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{cell.title}</span>
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
