"use client"

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
  const { notebookCells, updateCellTitle, removeCell, reorderCells, fileName, processedData, resetData } = useData()
  const { navigateTo } = useNavigation()
  const [isExecutingAll, setIsExecutingAll] = useState(false)
  const [navSidebarOpen, setNavSidebarOpen] = useState(false)
  const [currentCellId, setCurrentCellId] = useState<string | null>(null)

  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const sourceIndex = result.source.index
    const destinationIndex = result.destination.index

    if (sourceIndex !== destinationIndex) {
      reorderCells(sourceIndex, destinationIndex)
    }
  }

  const executeAllCells = async () => {
    setIsExecutingAll(true)
    // Simulate execution of all cells
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsExecutingAll(false)
  }

  const exportNotebook = () => {
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
  }

  // Add navigation tracking for cell operations
  const handleCellNavigate = (cellId: string) => {
    setCurrentCellId(cellId)
    const cell = notebookCells.find((c) => c.id === cellId)
    if (cell) {
      navigateTo("/notebook", "Data Notebook", cell.title, {
        cellId: cell.id,
        cellType: cell.type,
        section: "notebook",
        subsection: "cell",
      })
    }
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

        {/* Header */}
        {/* <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Data Analysis Notebook</h1>
            {fileName && (
              <Badge variant="outline" className="ml-2">
                {fileName}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {notebookCells.length > 0 && (
              <>
                <Button variant="outline" onClick={executeAllCells} disabled={isExecutingAll} className="gap-2">
                  <Play className="h-4 w-4" />
                  {isExecutingAll ? "Running..." : "Run All"}
                </Button>
                <Button variant="outline" onClick={exportNotebook} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </>
            )}
            {processedData.length > 0 && (
              <Button variant="outline" onClick={resetData} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset Data
              </Button>
            )}
          </div>
        </div> */}

        {/* Notebook Stats */}
        {/* {notebookCells.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium">Total Cells</span>
                </div>
                <p className="text-2xl font-bold mt-1">{notebookCells.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Data Rows</span>
                </div>
                <p className="text-2xl font-bold mt-1">{processedData.length.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm font-medium">Last Modified</span>
                </div>
                <p className="text-sm font-medium mt-1">
                  {notebookCells.length > 0
                    ? new Date(Math.max(...notebookCells.map((cell) => cell.createdAt.getTime()))).toLocaleDateString()
                    : "Never"}
                </p>
              </CardContent>
            </Card>
          </div>
        )} */}

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
                  <Button className="gap-2">
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
                            onClick={() => handleCellNavigate(cell.id)}
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
