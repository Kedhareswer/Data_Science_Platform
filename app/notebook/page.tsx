"use client"

import type React from "react"

import { useState } from "react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Upload } from "lucide-react"
import { NotebookCell } from "@/components/notebook-cell"
import { useData } from "@/lib/data-context"
import { FloatingAddButton, QuickAddButton } from "@/components/cell-addition-panel"
import { NavigationBreadcrumb } from "@/components/navigation-breadcrumb"
import { NavigationSidebar } from "@/components/navigation-sidebar"
import { NotebookNavigation } from "@/components/notebook-navigation"
import { useNavigation } from "@/lib/navigation-context"

export default function NotebookPage() {
  const {
    notebookCells = [],
    updateCellTitle,
    removeCell,
    reorderCells,
    fileName,
    processedData = [],
    resetData,
  } = useData()
  const { navigateTo } = useNavigation()
  const [isExecutingAll, setIsExecutingAll] = useState(false)
  const [navSidebarOpen, setNavSidebarOpen] = useState(false)
  const [currentCellId, setCurrentCellId] = useState<string | null>(null)

  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const sourceIndex = result.source.index
    const destinationIndex = result.destination.index

    if (sourceIndex !== destinationIndex) {
      reorderCells?.(sourceIndex, destinationIndex)
    }
  }

  const handleExecuteAll = async (e: React.MouseEvent) => {
    e.preventDefault()
    setIsExecutingAll(true)
    try {
      // Simulate execution of all cells
      await new Promise((resolve) => setTimeout(resolve, 2000))
    } catch (err) {
      console.error("Failed to execute cells:", err)
    } finally {
      setIsExecutingAll(false)
    }
  }

  const handleExportNotebook = (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      const notebookData = {
        cells: notebookCells,
        metadata: {
          fileName,
          dataRows: processedData.length,
          exportedAt: new Date().toISOString(),
        },
      }

      const blob = new Blob([JSON.stringify(notebookData, null, 2)], {
        type: "application/json;charset=utf-8;",
      })
      const link = document.createElement("a")
      const exportFileName = fileName ? `${fileName.split(".")[0]}_notebook.json` : "data_notebook.json"

      link.href = URL.createObjectURL(blob)
      link.download = exportFileName
      link.click()

      // Clean up the URL object
      setTimeout(() => URL.revokeObjectURL(link.href), 100)
    } catch (err) {
      console.error("Failed to export notebook:", err)
    }
  }

  const handleUploadClick = (e: React.MouseEvent) => {
    e.preventDefault()
    navigateTo?.("/", "Home", "Upload Data")
  }

  // Add navigation tracking for cell operations
  const handleCellNavigate = (cellId: string) => {
    setCurrentCellId(cellId)
    const cell = notebookCells.find((c) => c.id === cellId)
    if (cell) {
      navigateTo?.("/notebook", "Data Notebook", cell.title, {
        cellId: cell.id,
        cellType: cell.type,
        section: "notebook",
        subsection: "cell",
      })
    }
  }

  const handleCellClick = (e: React.MouseEvent, cellId: string) => {
    // Prevent event bubbling that might cause scrolling
    e.stopPropagation()
    handleCellNavigate(cellId)
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <NavigationSidebar isOpen={navSidebarOpen} onToggle={() => setNavSidebarOpen(!navSidebarOpen)} />

      <div className={`transition-all duration-200 ${navSidebarOpen ? "ml-80" : ""}`}>
        {/* Navigation Header */}
        <div className="mb-6">
          <NavigationBreadcrumb />
          {notebookCells.length > 0 && (
            <div className="mt-4">
              <NotebookNavigation currentCellId={currentCellId} onCellNavigate={handleCellNavigate} />
            </div>
          )}
        </div>

        {/* Notebook Cells */}
        {notebookCells.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardHeader className="text-center py-12">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>Welcome to Your Data Notebook</CardTitle>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Start building your data analysis workflow by adding cells. Upload data first, then add analysis,
                visualization, and machine learning components.
              </p>
            </CardHeader>
            <CardContent className="text-center pb-12">
              {processedData.length === 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Upload a CSV or Excel file to get started with data analysis.
                  </p>
                  <Button type="button" className="gap-2" onClick={handleUploadClick}>
                    <Upload className="h-4 w-4" />
                    Upload Data
                  </Button>
                </div>
              ) : (
                <QuickAddButton className="opacity-100" />
              )}
            </CardContent>
          </Card>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="notebook-cells">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                  {notebookCells.map((cell, index) => (
                    <div key={cell.id} id={`cell-${cell.id}`}>
                      <Draggable draggableId={cell.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`transition-all duration-200 ${
                              snapshot.isDragging ? "rotate-2 scale-105 shadow-lg" : ""
                            }`}
                            onClick={(e) => handleCellClick(e, cell.id)}
                          >
                            <NotebookCell
                              cell={cell}
                              index={index}
                              onUpdateTitle={updateCellTitle}
                              onRemove={removeCell}
                              dragHandleProps={provided.dragHandleProps}
                              isExecuting={isExecutingAll}
                            />
                          </div>
                        )}
                      </Draggable>
                      <QuickAddButton insertIndex={index + 1} />
                    </div>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}

        {/* Floating Add Button */}
        <FloatingAddButton />
      </div>
    </div>
  )
}
