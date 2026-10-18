"use client"

import { useRef, useState } from "react"
import { Download, FileDown, FileUp, Loader2, MoreHorizontal, PlayCircle, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useData } from "@/lib/data-context"
import { baseName, downloadJSON, isNotebookFile } from "@/lib/notebook"
import { AddCellMenu } from "./add-cell-menu"

export function NotebookToolbar({ onRunningCell }: { onRunningCell: (id: string | null) => void }) {
  const { notebookCells, runAllCells, exportNotebook, importNotebook, resetData, fileName, processedData } = useData()
  const [running, setRunning] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const runAll = async () => {
    setRunning(true)
    const id = toast.loading("Running cells…")
    try {
      const count = await runAllCells((cell, i, total) => {
        onRunningCell(cell.id)
        toast.loading(`Running ${i + 1}/${total}: ${cell.title}`, { id })
      })
      toast.success(count ? `Ran ${count} cell${count === 1 ? "" : "s"}` : "No runnable cells", { id })
    } catch (err) {
      toast.error("Run all stopped", { id, description: err instanceof Error ? err.message : String(err) })
    } finally {
      onRunningCell(null)
      setRunning(false)
    }
  }

  const exportNb = (includeData: boolean) => {
    downloadJSON(exportNotebook({ includeData }), `${baseName(fileName)}.dnb.json`)
    toast.success("Notebook exported")
  }

  const importNb = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!isNotebookFile(parsed)) throw new Error("This is not a DataNotebook file.")
      importNotebook(parsed)
      toast.success(`Imported ${parsed.cells.length} cells`, {
        description: parsed.dataset ? "Including the embedded dataset." : "Load the matching dataset to run the cells.",
      })
    } catch (err) {
      toast.error("Import failed", { description: err instanceof Error ? err.message : String(err) })
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <AddCellMenu />
      <Button variant="outline" onClick={runAll} disabled={running || notebookCells.length === 0}>
        {running ? <Loader2 className="animate-spin" aria-hidden /> : <PlayCircle aria-hidden />} Run all
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Notebook actions">
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => exportNb(false)}>
            <Download aria-hidden /> Export notebook
          </DropdownMenuItem>
          <DropdownMenuItem disabled={processedData.length === 0} onSelect={() => exportNb(true)}>
            <FileDown aria-hidden /> Export with data
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => fileInput.current?.click()}>
            <FileUp aria-hidden /> Import notebook…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setConfirmReset(true)}>
            <RotateCcw aria-hidden /> Reset workspace…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void importNb(file)
          e.target.value = ""
        }}
      />

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset the workspace?</DialogTitle>
            <DialogDescription>
              This removes the dataset, all cells, trained models and the dashboard from this browser. Export the
              notebook first if you want to keep it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                resetData()
                setConfirmReset(false)
                toast.success("Workspace cleared")
              }}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
