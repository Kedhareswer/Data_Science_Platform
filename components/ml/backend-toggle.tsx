"use client"

import { Cpu, FlaskConical } from "lucide-react"
import type { Backend } from "@/lib/ml/types"
import { cn } from "@/lib/utils"

const OPTIONS: Array<{ value: Backend; label: string; hint: string; Icon: typeof Cpu }> = [
  { value: "typescript", label: "TypeScript", hint: "instant, runs in this tab", Icon: Cpu },
  { value: "sklearn", label: "scikit-learn", hint: "real Python in your browser", Icon: FlaskConical },
]

interface BackendToggleProps {
  value: Backend
  onChange: (backend: Backend) => void
  disabled?: boolean
  labelId: string
}

/** Two-option radio group for the training backend (arrow keys move between options). */
export function BackendToggle({ value, onChange, disabled, labelId }: BackendToggleProps) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault()
      const next = value === "typescript" ? "sklearn" : "typescript"
      onChange(next)
      const sibling = e.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-value="${next}"]`)
      sibling?.focus()
    }
  }
  return (
    <div role="radiogroup" aria-labelledby={labelId} className="grid gap-2 sm:grid-cols-2">
      {OPTIONS.map(({ value: v, label, hint, Icon }) => {
        const checked = v === value
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={checked}
            data-value={v}
            tabIndex={checked ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(v)}
            onKeyDown={onKeyDown}
            className={cn(
              "focus-visible:ring-ring flex items-center gap-3 rounded-lg border-2 px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-hidden disabled:opacity-50",
              checked ? "border-primary bg-muted" : "hover:bg-muted/60 border-dashed",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            <span>
              <span className="font-handwritten-bold block">{label}</span>
              <span className="text-muted-foreground block text-xs">{hint}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
