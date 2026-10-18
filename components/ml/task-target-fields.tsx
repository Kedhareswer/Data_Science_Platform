"use client"

import { useId } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ColumnTypes, DataRow } from "@/lib/data/types"
import { suggestTask } from "@/lib/ml/engine"
import type { TaskType } from "@/lib/ml/types"
import { missingCount, TASK_LABELS, TASKS, targetCandidates } from "./utils"

export interface TaskTarget {
  task: TaskType
  target?: string
}

interface TaskTargetFieldsProps extends TaskTarget {
  rows: readonly DataRow[]
  columns: readonly string[]
  columnTypes: ColumnTypes
  onChange: (next: TaskTarget) => void
}

/** Task + target selectors. Picking a target auto-suggests the task. */
export function TaskTargetFields({ task, target, rows, columns, columnTypes, onChange }: TaskTargetFieldsProps) {
  const id = useId()
  const candidates = targetCandidates(task === "clustering" ? "classification" : task, columns, columnTypes).filter(
    Boolean,
  )
  const missing = target ? missingCount(rows, target) : 0

  const changeTask = (next: TaskType) => {
    const keep = target && targetCandidates(next, columns, columnTypes).includes(target) ? target : undefined
    onChange({ task: next, target: next === "clustering" ? target : keep })
  }

  const changeTarget = (column: string) => {
    onChange({ target: column, task: suggestTask(rows, column) })
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-task`}>Task</Label>
        <Select value={task} onValueChange={(v) => changeTask(v as TaskType)}>
          <SelectTrigger id={`${id}-task`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TASKS.map((t) => (
              <SelectItem key={t} value={t}>
                {TASK_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          {task === "clustering"
            ? "Groups similar rows — no target needed."
            : "Picking a target suggests the task automatically."}
        </p>
      </div>
      {task !== "clustering" && (
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-target`}>Target (what to predict)</Label>
          <Select value={target && candidates.includes(target) ? target : undefined} onValueChange={changeTarget}>
            <SelectTrigger id={`${id}-target`}>
              <SelectValue placeholder="Choose a column…" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {target && missing > 0 ? (
            <p className="text-warning text-xs">
              {missing} row{missing === 1 ? "" : "s"} without a {target} value will be skipped.
            </p>
          ) : task === "regression" && candidates.length === 0 ? (
            <p className="text-warning text-xs">Regression needs a numeric column.</p>
          ) : null}
        </div>
      )}
    </div>
  )
}
