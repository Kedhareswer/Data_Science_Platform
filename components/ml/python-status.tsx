"use client"

import { AlertCircle, CheckCircle2, Loader2, Snail } from "lucide-react"
import { usePythonStatus } from "@/lib/python/client"

/** Inline status of the in-browser Python runtime (only mount when scikit-learn is used). */
export function PythonStatus() {
  const { status, message } = usePythonStatus()
  const text: Record<typeof status, string> = {
    idle: "Python starts on first use (one-time download, then cached).",
    loading: message ?? "Loading Python…",
    ready: "Python is ready.",
    busy: message ?? "Python is working…",
    error: message ?? "Python failed to start.",
  }
  const Icon =
    status === "error" ? AlertCircle : status === "ready" ? CheckCircle2 : status === "idle" ? Snail : Loader2
  const tone = status === "error" ? "text-destructive" : status === "ready" ? "text-success" : "text-muted-foreground"
  return (
    <p className={`flex items-center gap-1.5 text-xs ${tone}`} role="status" aria-live="polite">
      <Icon
        className={`h-3.5 w-3.5 shrink-0 ${status === "loading" || status === "busy" ? "animate-spin" : ""}`}
        aria-hidden
      />
      {text[status]}
    </p>
  )
}
