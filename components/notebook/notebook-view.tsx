"use client"

import { useState } from "react"
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd"
import { BookOpen, Database, Loader2 } from "lucide-react"
import { DataUploadPrompt } from "@/components/data-upload-prompt"
import { Badge } from "@/components/ui/badge"
import { useData } from "@/lib/data-context"
import { AddCellMenu } from "./add-cell-menu"
import { NotebookCell } from "./notebook-cell"
import { NotebookOutline } from "./notebook-outline"
import { NotebookToolbar } from "./notebook-toolbar"

export function NotebookView() {
  const { notebookCells, reorderCells, fileName, processedData, columns, isHydrated } = useData()
  const [runningCell, setRunningCell] = useState<string | null>(null)

  const onDragEnd = (result: DropResult) => {
    if (result.destination) reorderCells(result.source.index, result.destination.index)
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-6 xl:grid-cols-[1fr_220px]">
      <div className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 font-handwritten-bold text-3xl">
              <BookOpen className="h-7 w-7" aria-hidden /> Notebook
            </h1>
            {fileName ? (
              <p className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
                <Database className="h-4 w-4" aria-hidden />
                <span className="font-handwritten-bold text-foreground">{fileName}</span>
                <Badge variant="secondary">{processedData.length.toLocaleString()} rows</Badge>
                <Badge variant="secondary">{columns.length} columns</Badge>
              </p>
            ) : (
              <p className="mt-1 text-muted-foreground">Load a dataset, then add cells to analyse it.</p>
            )}
          </div>
          <NotebookToolbar onRunningCell={setRunningCell} />
        </div>

        {!isHydrated ? (
          <div className="flex items-center gap-2 text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Restoring your workspace…
          </div>
        ) : (
          <>
            {processedData.length === 0 && (
              <DataUploadPrompt
                title="Start with some data"
                description="Drop a CSV, TSV, JSON or Excel file — it is parsed locally and never uploaded."
              />
            )}

            {notebookCells.length === 0 && processedData.length > 0 && (
              <div className="sketch-card flex flex-col items-center gap-3 p-10 text-center">
                <p className="font-handwritten-bold text-xl">Your notebook is empty</p>
                <p className="text-muted-foreground">Add a profile, chart, Python or ML cell to get going.</p>
                <AddCellMenu />
              </div>
            )}

            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="notebook">
                {(provided) => (
                  <ol ref={provided.innerRef} {...provided.droppableProps} className="space-y-2" aria-label="Notebook cells">
                    {notebookCells.map((cell, index) => (
                      <Draggable key={cell.id} draggableId={cell.id} index={index}>
                        {(drag) => (
                          <li ref={drag.innerRef} {...drag.draggableProps} className="space-y-2">
                            <NotebookCell
                              cell={cell}
                              index={index}
                              total={notebookCells.length}
                              dragHandleProps={drag.dragHandleProps}
                              isRunning={runningCell === cell.id}
                            />
                            <div className="flex justify-center opacity-60 transition-opacity focus-within:opacity-100 hover:opacity-100">
                              <AddCellMenu index={index + 1} variant="inline" />
                            </div>
                          </li>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </ol>
                )}
              </Droppable>
            </DragDropContext>
          </>
        )}
      </div>
      <NotebookOutline />
    </div>
  )
}
