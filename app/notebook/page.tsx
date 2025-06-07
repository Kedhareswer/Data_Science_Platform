"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Upload, Play, Download, RotateCcw } from "lucide-react"
import { NotebookCell } from "@/components/notebook-cell"
import { useData } from "@/lib/data-context"
import { FloatingAddButton, QuickAddButton } from "@/components/cell-addition-panel"
import { NavigationBreadcrumb } from "@/components/navigation-breadcrumb"
import { NavigationSidebar } from "@/components/navigation-sidebar"
import { NotebookNavigation } from "@/components/notebook-navigation"
import { useNavigation } from "@/lib/navigation-context"
import { useToast } from "@/hooks/use-toast"

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
  const { toast } = useToast()
  const [isExecutingAll, setIsExecutingAll] = useState(false)
  const [navSidebarOpen, setNavSidebarOpen] = useState(false)
  const [currentCellId, setCurrentCellId] = useState<string | null>(null)

  const handleDragEnd = useCallback(
    (result: any) => {
      if (!result.destination) return

      const sourceIndex = result.source.index
      const destinationIndex = result.destination.index

      if (sourceIndex !== destinationIndex) {
        reorderCells?.(sourceIndex, destinationIndex)
        toast({
          title: "Cell reordered",
          description: `Moved cell from position ${sourceIndex + 1} to ${destinationIndex + 1}`,
        })
      }
    },
    [reorderCells, toast],
  )

  const handleExecuteAll = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      setIsExecutingAll(true)

      try {
        toast({
          title: "Executing all cells",
          description: "Running all executable cells in sequence...",
        })

        // Simulate execution of all cells
        await new Promise((resolve) => setTimeout(resolve, 3000))

        toast({
          title: "Execution complete",
          description: "All cells have been executed successfully",
        })
      } catch (err) {
        console.error("Failed to execute cells:", err)
        toast({
          title: "Execution failed",
          description: "Some cells failed to execute",
          variant: "destructive",
        })
      } finally {
        setIsExecutingAll(false)
      }
    },
    [toast],
  )

  const handleExportNotebook = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()

      try {
        const notebookData = {
          cells: notebookCells,
          metadata: {
            fileName,
            dataRows: processedData.length,
            exportedAt: new Date().toISOString(),
            version: "1.0.0",
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

        toast({
          title: "Notebook exported",
          description: `Saved as ${exportFileName}`,
        })
      } catch (err) {
        console.error("Failed to export notebook:", err)
        toast({
          title: "Export failed",
          description: "Failed to export notebook",
          variant: "destructive",
        })
      }
    },
    [notebookCells, fileName, processedData.length, toast],
  )

  const handleUploadClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      navigateTo?.("/", "Home", "Upload Data")
    },
    [navigateTo],
  )

  const handleResetNotebook = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()

      if (window.confirm("Are you sure you want to reset the notebook? This will clear all cells and data.")) {
        resetData()
        setCurrentCellId(null)
        toast({
          title: "Notebook reset",
          description: "All cells and data have been cleared",
        })
      }
    },
    [resetData, toast],
  )

  // Add navigation tracking for cell operations
  const handleCellNavigate = useCallback(
    (cellId: string) => {
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
    },
    [notebookCells, navigateTo],
  )

  const handleCellClick = useCallback(
    (e: React.MouseEvent, cellId: string) => {
      // Prevent event bubbling that might cause scrolling
      e.stopPropagation()
      handleCellNavigate(cellId)
    },
    [handleCellNavigate],
  )

  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar isOpen={navSidebarOpen} onToggle={() => setNavSidebarOpen(!navSidebarOpen)} />

      <div className={`transition-all duration-200 ${navSidebarOpen ? "ml-80" : ""}`}>
        <div className="container mx-auto p-6 max-w-6xl">
          {/* Navigation Header */}
          <div className="mb-6">
            <NavigationBreadcrumb />

            {/* Notebook Controls */}
            {notebookCells.length > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <NotebookNavigation currentCellId={currentCellId} onCellNavigate={handleCellNavigate} />

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExecuteAll}
                    disabled={isExecutingAll}
                    className="gap-2"
                  >
                    <Play className="h-4 w-4" />
                    {isExecutingAll ? "Running..." : "Run All"}
                  </Button>

                  <Button type="button" variant="outline" size="sm" onClick={handleExportNotebook} className="gap-2">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetNotebook}
                    className="gap-2 text-red-600 hover:text-red-700"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Notebook Content */}
          {notebookCells.length === 0 ? (
            <Card className="border-dashed border-2 border-muted">
              <CardHeader className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle className="text-2xl">Welcome to Your Data Notebook</CardTitle>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                  Start building your data analysis workflow by adding cells. Upload data first, then add analysis,
                  visualization, and machine learning components.
                </p>
              </CardHeader>
              <CardContent className="text-center pb-12">
                {processedData.length === 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Upload a CSV, JSON, or Excel file to get started with data analysis.
                    </p>
                    <Button type="button" className="gap-2" onClick={handleUploadClick}>
                      <Upload className="h-4 w-4" />
                      Upload Data
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Data loaded! Add your first cell to start analyzing.
                    </p>
                    <QuickAddButton className="opacity-100" />
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="notebook-cells">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">
                    {notebookCells.map((cell, index) => (
                      <div key={cell.id} id={`cell-${cell.id}`}>
                        <Draggable draggableId={cell.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`transition-all duration-200 ${
                                snapshot.isDragging ? "rotate-1 scale-105 shadow-xl z-50" : ""
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

                        {/* Quick Add Button between cells */}
                        <div className="py-3">
                          <QuickAddButton insertIndex={index + 1} />
                        </div>
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
    </div>
  )
}
