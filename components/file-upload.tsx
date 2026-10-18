"use client"

import { useCallback, useState } from "react"
import { type FileRejection, useDropzone } from "react-dropzone"
import { AlertCircle, FlaskConical, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { SAMPLE_DATASETS, useData } from "@/lib/data-context"
import { MAX_FILE_SIZE_BYTES, SUPPORTED_EXTENSIONS } from "@/lib/data/parse"
import { cn } from "@/lib/utils"

interface FileUploadProps {
  onLoaded?: (fileName: string) => void
  compact?: boolean
  className?: string
}

/** MIME types are unreliable for these formats, so accept by extension under a few generic types. */
const ACCEPT: Record<string, string[]> = {
  "text/csv": [".csv"],
  "text/tab-separated-values": [".tsv"],
  "text/plain": [".txt"],
  "application/json": [".json"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
}

const MAX_MB = Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)
const EXTENSION_LIST = SUPPORTED_EXTENSIONS.map((e) => e.toUpperCase()).join(", ")

function describeRejection(rejection: FileRejection): string {
  const code = rejection.errors[0]?.code
  if (code === "file-too-large") {
    const mb = (rejection.file.size / 1024 / 1024).toFixed(1)
    return `“${rejection.file.name}” is ${mb} MB — the limit is ${MAX_MB} MB.`
  }
  if (code === "file-invalid-type") return `“${rejection.file.name}” isn't a supported file. Use ${EXTENSION_LIST}.`
  if (code === "too-many-files") return "Please drop one file at a time."
  return rejection.errors[0]?.message ?? "That file couldn't be used."
}

export function FileUpload({ onLoaded, compact = false, className }: FileUploadProps) {
  const { processFile, loadSample, isLoading } = useData()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const working = isLoading || busy !== null

  const load = useCallback(
    async (label: string, action: () => Promise<void>) => {
      setBusy(label)
      setError(null)
      try {
        await action()
        toast.success(`Loaded ${label}`)
        onLoaded?.(label)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong while reading the file."
        setError(message)
        toast.error("Could not load data", { description: message })
      } finally {
        setBusy(null)
      }
    },
    [onLoaded],
  )

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length > 0) {
        const message = describeRejection(rejected[0])
        setError(message)
        toast.error("File not accepted", { description: message })
        return
      }
      const file = accepted[0]
      if (file) void load(file.name, () => processFile(file))
    },
    [load, processFile],
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxSize: MAX_FILE_SIZE_BYTES,
    maxFiles: 1,
    multiple: false,
    disabled: working,
  })

  const sampleFile = SAMPLE_DATASETS.iris.file.split("/").pop() ?? "iris.csv"

  return (
    <div className={cn("space-y-3", className)}>
      <div
        {...getRootProps({
          role: "button",
          "aria-label": `Upload a data file: drop it here or press Enter to browse. ${EXTENSION_LIST} up to ${MAX_MB} MB.`,
          "aria-busy": working,
        })}
        className={cn(
          "focus-visible:ring-ring flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-center transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden",
          compact ? "p-5" : "p-10",
          isDragReject
            ? "border-destructive bg-destructive/5"
            : isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/40",
          working && "cursor-wait opacity-70",
        )}
      >
        <input {...getInputProps()} />
        <div className={cn("rounded-full p-3", isDragReject ? "bg-destructive/10" : "bg-primary/10")}>
          {working ? (
            <Loader2 className="text-primary h-6 w-6 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className={cn("h-6 w-6", isDragReject ? "text-destructive" : "text-primary")} aria-hidden="true" />
          )}
        </div>
        <p className={cn("font-handwritten-bold", compact ? "text-base" : "text-lg")}>
          {working
            ? `Reading ${busy ?? "your data"}…`
            : isDragReject
              ? "That file type isn't supported"
              : isDragActive
                ? "Drop it like it's hot!"
                : "Drag & drop a data file, or click to browse"}
        </p>
        <p className="font-handwritten text-muted-foreground text-sm">
          {EXTENSION_LIST} · up to {MAX_MB} MB · stays in your browser
        </p>
      </div>

      <div className="font-handwritten text-muted-foreground flex flex-wrap items-center justify-center gap-2 text-sm">
        <span>No data handy?</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="font-handwritten"
          disabled={working}
          onClick={() => void load(sampleFile, () => loadSample("iris"))}
        >
          <FlaskConical aria-hidden="true" />
          Try the Iris sample
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle className="font-handwritten-bold">Couldn&apos;t load that</AlertTitle>
          <AlertDescription className="font-handwritten">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
