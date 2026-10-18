"use client"

import { useId } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import type { ColumnTypes } from "@/lib/data/types"

interface FeaturePickerProps {
  columns: readonly string[]
  columnTypes: ColumnTypes
  selected: readonly string[]
  onChange: (features: string[]) => void
  /** Columns that cannot be features (e.g. the target). */
  exclude?: readonly string[]
}

const TYPE_ABBR: Record<string, string> = { number: "num", boolean: "bool", date: "date", string: "text" }

export function FeaturePicker({ columns, columnTypes, selected, onChange, exclude = [] }: FeaturePickerProps) {
  const baseId = useId()
  const available = columns.filter((c) => !exclude.includes(c))
  const chosen = new Set(selected)
  const count = available.filter((c) => chosen.has(c)).length

  const toggle = (column: string, on: boolean) => {
    onChange(available.filter((c) => (c === column ? on : chosen.has(c))))
  }

  return (
    <div role="group" aria-labelledby={`${baseId}-label`} className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span id={`${baseId}-label`} className="font-handwritten-bold text-sm">
          Features{" "}
          <span className="text-muted-foreground">
            ({count}/{available.length})
          </span>
        </span>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange([...available])}
            disabled={count === available.length}
          >
            Select all
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])} disabled={count === 0}>
            None
          </Button>
        </div>
      </div>
      {available.length === 0 ? (
        <p className="text-muted-foreground text-sm">No columns available as features.</p>
      ) : (
        <div className="grid max-h-48 grid-cols-1 gap-1.5 overflow-y-auto rounded-md border p-2 sm:grid-cols-2 lg:grid-cols-3">
          {available.map((column, i) => {
            const id = `${baseId}-f${i}`
            return (
              <div key={column} className="hover:bg-muted flex min-w-0 items-center gap-2 rounded px-1 py-0.5">
                <Checkbox id={id} checked={chosen.has(column)} onCheckedChange={(v) => toggle(column, v === true)} />
                <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer truncate text-sm" title={column}>
                  {column}
                </label>
                <Badge variant="outline" className="text-muted-foreground shrink-0 px-1.5 py-0 text-[10px] font-normal">
                  {TYPE_ABBR[columnTypes[column] ?? "string"] ?? columnTypes[column]}
                </Badge>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
