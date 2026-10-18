"use client"

import { Sparkles } from "lucide-react"
import { FileUpload } from "@/components/file-upload"

interface DataUploadPromptProps {
  title?: string
  description?: string
}

/** Friendly empty state shown by cells that need a dataset. */
export function DataUploadPrompt({
  title = "No data loaded yet",
  description = "Drop in a CSV, Excel or JSON file (or try the Iris sample) and this cell will spring to life.",
}: DataUploadPromptProps) {
  return (
    <section aria-label={title} className="sketch-card mx-auto max-w-xl space-y-4 p-5 text-center">
      <div className="space-y-1">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Sparkles className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
        <h3 className="font-handwritten-bold text-lg">{title}</h3>
        <p className="font-handwritten text-sm text-muted-foreground">{description}</p>
      </div>
      <FileUpload compact />
    </section>
  )
}
