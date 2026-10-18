"use client"

import { useRef, useState } from "react"
import { Download, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useData } from "@/lib/data-context"
import type { TrainedModel } from "@/lib/ml/types"
import { errorMessage, parseModelFile } from "./utils"

interface ModelActionsProps {
  model?: TrainedModel
  /** Called with the imported model so the caller can select it. */
  onImported?: (model: TrainedModel) => void
}

const MAX_FILE_BYTES = 50 * 1024 * 1024

/** Download / import / delete trained models. */
export function ModelActions({ model, onImported }: ModelActionsProps) {
  const { downloadModel, importModel, removeTrainedModel } = useData()
  const fileInput = useRef<HTMLInputElement>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      if (file.size > MAX_FILE_BYTES) throw new Error("The file is larger than 50 MB.")
      let raw: unknown
      try {
        raw = JSON.parse(await file.text())
      } catch {
        throw new Error("The file is not valid JSON.")
      }
      const parsed = parseModelFile(raw)
      if ("error" in parsed) throw new Error(parsed.error)
      importModel(parsed.model)
      onImported?.(parsed.model)
      toast.success(`Imported ${parsed.model.name}`)
    } catch (err) {
      toast.error("Could not import model", { description: errorMessage(err) })
    } finally {
      if (fileInput.current) fileInput.current.value = ""
    }
  }

  const download = () => {
    if (!model) return
    if (model.backend === "sklearn") {
      toast.info("Downloaded the model summary", {
        description: "scikit-learn models can't be re-imported — their fitted state lives in the Python session.",
      })
    }
    try {
      downloadModel(model.id)
    } catch (err) {
      toast.error("Download failed", { description: errorMessage(err) })
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" onClick={download} disabled={!model}>
        <Download aria-hidden /> Download JSON
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => fileInput.current?.click()}>
        <Upload aria-hidden /> Import model
      </Button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        tabIndex={-1}
        aria-label="Import model JSON file"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-destructive hover:text-destructive"
        onClick={() => setConfirmOpen(true)}
        disabled={!model}
      >
        <Trash2 aria-hidden /> Delete
      </Button>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-handwritten-bold">Delete model?</DialogTitle>
            <DialogDescription>
              “{model?.name}” will be removed from this notebook. Download it first if you want to keep a copy.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                if (model) {
                  removeTrainedModel(model.id)
                  toast.success(`Deleted ${model.name}`)
                }
                setConfirmOpen(false)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
