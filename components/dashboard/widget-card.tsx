"use client"

import { memo } from "react"
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd"
import { ArrowDown, ArrowUp, Copy, GripVertical, MoreVertical, Pencil, Ruler, Trash2 } from "lucide-react"
import type { DashboardWidget, WidgetSize } from "@/lib/dashboard"
import type { ColumnTypes, DataRow } from "@/lib/data/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChartWidgetView } from "@/components/dashboard/chart-widget"
import { MetricWidgetView } from "@/components/dashboard/metric-widget"
import { TableWidgetView } from "@/components/dashboard/table-widget"
import { TextWidgetView } from "@/components/dashboard/text-widget"
import { cn } from "@/lib/utils"

export type WidgetAction = "edit" | "duplicate" | "delete" | "move-up" | "move-down" | `size:${WidgetSize}`

export const SIZE_LABELS: Record<WidgetSize, string> = {
  sm: "Small (¼)",
  md: "Medium (½)",
  lg: "Large (¾)",
  full: "Full width",
}

interface WidgetCardProps {
  widget: DashboardWidget
  rows: readonly DataRow[]
  allRows: readonly DataRow[]
  columns: readonly string[]
  columnTypes: ColumnTypes
  editMode: boolean
  index: number
  total: number
  onAction: (id: string, action: WidgetAction) => void
  dragHandleProps?: DraggableProvidedDragHandleProps | null
  isDragging?: boolean
}

function WidgetBody({ widget, rows, allRows, columns, columnTypes }: Pick<WidgetCardProps, "widget" | "rows" | "allRows" | "columns" | "columnTypes">) {
  switch (widget.type) {
    case "metric":
      return <MetricWidgetView widget={widget} rows={rows} allRows={allRows} columnTypes={columnTypes} />
    case "chart":
      return <ChartWidgetView widget={widget} rows={rows} columnTypes={columnTypes} />
    case "table":
      return <TableWidgetView widget={widget} rows={rows} columns={columns} columnTypes={columnTypes} />
    case "text":
      return <TextWidgetView widget={widget} />
  }
}

function WidgetCardImpl({
  widget,
  rows,
  allRows,
  columns,
  columnTypes,
  editMode,
  index,
  total,
  onAction,
  dragHandleProps,
  isDragging,
}: WidgetCardProps) {
  const titleId = `widget-title-${widget.id}`
  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "sketch-card flex h-full flex-col p-4 transition-shadow",
        editMode && "border-primary/40",
        isDragging && "shadow-xl ring-2 ring-primary/40",
      )}
    >
      <header className="mb-3 flex items-start gap-2">
        {editMode && dragHandleProps && (
          <span
            {...dragHandleProps}
            aria-label={`Drag to reorder “${widget.title}”. Press space to lift, arrow keys to move.`}
            className="-ml-1 mt-0.5 cursor-grab rounded-sm p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing"
          >
            <GripVertical className="size-4" aria-hidden />
          </span>
        )}
        <h2 id={titleId} className="min-w-0 flex-1 truncate font-handwritten-bold text-lg leading-tight" title={widget.title}>
          {widget.title}
        </h2>
        {editMode && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="-mr-2 -mt-1 size-8" aria-label={`Widget options for “${widget.title}”`}>
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="font-handwritten">Widget</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => onAction(widget.id, "edit")}>
                <Pencil aria-hidden /> Edit…
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAction(widget.id, "duplicate")}>
                <Copy aria-hidden /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Ruler aria-hidden /> Size
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    value={widget.size}
                    onValueChange={(value) => onAction(widget.id, `size:${value as WidgetSize}`)}
                  >
                    {(Object.keys(SIZE_LABELS) as WidgetSize[]).map((size) => (
                      <DropdownMenuRadioItem key={size} value={size}>
                        {SIZE_LABELS[size]}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem disabled={index === 0} onSelect={() => onAction(widget.id, "move-up")}>
                <ArrowUp aria-hidden /> Move earlier
              </DropdownMenuItem>
              <DropdownMenuItem disabled={index >= total - 1} onSelect={() => onAction(widget.id, "move-down")}>
                <ArrowDown aria-hidden /> Move later
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => onAction(widget.id, "delete")}
              >
                <Trash2 aria-hidden /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>
      <div className="min-h-0 flex-1">
        <WidgetBody widget={widget} rows={rows} allRows={allRows} columns={columns} columnTypes={columnTypes} />
      </div>
    </section>
  )
}

export const WidgetCard = memo(WidgetCardImpl)
