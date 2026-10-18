"use client"

import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { usePythonStatus } from "@/lib/python/client"
import { cn } from "@/lib/utils"

const LABELS = {
  idle: "Python idle",
  loading: "Loading Python",
  ready: "Python ready",
  busy: "Running",
  error: "Python error",
} as const

const STYLES = {
  idle: "border-border text-muted-foreground",
  loading: "border-warning/50 bg-warning/10 text-warning",
  ready: "border-success/50 bg-success/10 text-success",
  busy: "border-primary/50 bg-primary/10 text-primary",
  error: "border-destructive/50 bg-destructive/10 text-destructive",
} as const

/** Small badge showing the shared Pyodide runtime state. */
export function RuntimeBadge() {
  const { status, message } = usePythonStatus()
  return (
    <Badge
      variant="outline"
      role="status"
      title={message}
      className={cn("gap-1 font-handwritten font-normal", STYLES[status])}
    >
      {(status === "loading" || status === "busy") && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
      {LABELS[status]}
    </Badge>
  )
}
