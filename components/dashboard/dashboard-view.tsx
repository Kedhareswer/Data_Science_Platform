"use client"

import { useCallback } from "react"
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd"
import type { DashboardWidget, WidgetSize } from "@/lib/dashboard"
import type { ColumnTypes, DataRow } from "@/lib/data/types"
import { type WidgetAction, WidgetCard } from "@/components/dashboard/widget-card"
import { cn } from "@/lib/utils"

/** Column spans in the 4-column view grid (1 col on phones, 2 on tablets). */
const GRID_SPAN: Record<WidgetSize, string> = {
  sm: "col-span-1",
  md: "col-span-1 md:col-span-2",
  lg: "col-span-1 md:col-span-2 xl:col-span-3",
  full: "col-span-1 md:col-span-2 xl:col-span-4",
}

/**
 * Widths used in edit mode. @hello-pangea/dnd only supports single-axis lists,
 * so while editing widgets are stacked vertically (each keeping its width as
 * a preview of its size) and can be dragged up/down reliably.
 */
const EDIT_WIDTH: Record<WidgetSize, string> = {
  sm: "w-full md:w-1/2 xl:w-1/4",
  md: "w-full xl:w-1/2",
  lg: "w-full xl:w-3/4",
  full: "w-full",
}

const MIN_HEIGHT: Record<DashboardWidget["type"], string> = {
  metric: "min-h-36",
  chart: "min-h-80",
  table: "min-h-80",
  text: "min-h-36",
}

interface DashboardViewProps {
  widgets: readonly DashboardWidget[]
  rows: readonly DataRow[]
  allRows: readonly DataRow[]
  columns: readonly string[]
  columnTypes: ColumnTypes
  editMode: boolean
  onAction: (id: string, action: WidgetAction) => void
  onReorder: (from: number, to: number) => void
}

export function DashboardView({
  widgets,
  rows,
  allRows,
  columns,
  columnTypes,
  editMode,
  onAction,
  onReorder,
}: DashboardViewProps) {
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination || result.destination.index === result.source.index) return
      onReorder(result.source.index, result.destination.index)
    },
    [onReorder],
  )

  if (!editMode) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {widgets.map((widget, index) => (
          <div key={widget.id} className={cn(GRID_SPAN[widget.size], MIN_HEIGHT[widget.type])}>
            <WidgetCard
              widget={widget}
              rows={rows}
              allRows={allRows}
              columns={columns}
              columnTypes={columnTypes}
              editMode={false}
              index={index}
              total={widgets.length}
              onAction={onAction}
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="dashboard-widgets">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col">
            {widgets.map((widget, index) => (
              <Draggable key={widget.id} draggableId={widget.id} index={index}>
                {(drag, snapshot) => (
                  <div ref={drag.innerRef} {...drag.draggableProps} className="pb-4">
                    <div className={cn(EDIT_WIDTH[widget.size], MIN_HEIGHT[widget.type])}>
                      <WidgetCard
                        widget={widget}
                        rows={rows}
                        allRows={allRows}
                        columns={columns}
                        columnTypes={columnTypes}
                        editMode
                        index={index}
                        total={widgets.length}
                        onAction={onAction}
                        dragHandleProps={drag.dragHandleProps}
                        isDragging={snapshot.isDragging}
                      />
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )
}
