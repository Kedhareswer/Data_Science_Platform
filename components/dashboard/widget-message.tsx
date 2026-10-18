import type { ReactNode } from "react"

/** Centered, muted placeholder shown inside a widget (missing config, no data…). */
export function WidgetMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-24 items-center justify-center px-4 py-6 text-center text-sm text-muted-foreground font-handwritten">
      <p>{children}</p>
    </div>
  )
}
