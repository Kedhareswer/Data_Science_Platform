"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useData } from "@/lib/data-context"
import { CELL_META, type CellMeta, type CellType } from "@/lib/notebook"
import { cn } from "@/lib/utils"
import { CATEGORY_ACCENT, CELL_ICONS } from "./cell-registry"

const CATEGORIES: Array<{ id: CellMeta["category"]; label: string }> = [
  { id: "data", label: "Data" },
  { id: "analysis", label: "Analysis" },
  { id: "ml", label: "Machine learning" },
  { id: "notes", label: "Notes" },
]

interface AddCellMenuProps {
  /** Insert position; appends when omitted. */
  index?: number
  variant?: "default" | "inline"
}

export function AddCellMenu({ index, variant = "default" }: AddCellMenuProps) {
  const { addCell, processedData } = useData()
  const [open, setOpen] = useState(false)
  const hasData = processedData.length > 0

  const add = (type: CellType) => {
    const id = addCell(type, index)
    setOpen(false)
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "inline" ? (
          <Button variant="ghost" size="sm" className="h-7 border border-dashed text-muted-foreground" aria-label="Insert cell here">
            <Plus aria-hidden /> Add cell
          </Button>
        ) : (
          <Button>
            <Plus aria-hidden /> Add cell
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-handwritten-bold text-2xl">Add a cell</DialogTitle>
          <DialogDescription>
            {hasData ? "Pick what you want to do next." : "Upload data first to unlock the data and ML cells."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {CATEGORIES.map((category) => (
            <section key={category.id} aria-label={category.label}>
              <h3 className="mb-2 text-sm text-muted-foreground">{category.label}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {(Object.entries(CELL_META) as Array<[CellType, CellMeta]>)
                  .filter(([, meta]) => meta.category === category.id)
                  .map(([type, meta]) => {
                    const Icon = CELL_ICONS[type]
                    const disabled = meta.requiresData && !hasData
                    return (
                      <button
                        key={type}
                        type="button"
                        disabled={disabled}
                        onClick={() => add(type)}
                        className={cn(
                          "flex items-start gap-3 rounded-md border border-l-4 p-3 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
                          CATEGORY_ACCENT[meta.category],
                        )}
                      >
                        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                        <span>
                          <span className="block font-handwritten-bold">{meta.title}</span>
                          <span className="block text-sm text-muted-foreground">{meta.description}</span>
                        </span>
                      </button>
                    )
                  })}
              </div>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
