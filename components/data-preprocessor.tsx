"use client"

import { useState, useMemo } from "react"
import { useData } from "@/lib/data-context"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Filter, Trash2, Download, Upload, CheckCircle, Info, RotateCcw, Zap, Scale, Code } from "lucide-react"

interface PreprocessingStep {
  id: string
  type:
    | "filter"
    | "remove_nulls"
    | "fill_nulls"
    | "remove_duplicates"
    | "normalize"
    | "standardize"
    | "encode_categorical"
    | "encode_onehot"
  column?: string
  value?: string | number
  method?: string
  description: string
  config?: any
}

export function DataPreprocessor() {
  const { processedData, setProcessedData, columns, columnTypes, fileName } = useData()
  const [steps, setSteps] = useState<PreprocessingStep[]>([])
  const [selectedColumn, setSelectedColumn] = useState<string>("")
  const [filterValue, setFilterValue] = useState<string>("")
  const [fillValue, setFillValue] = useState<string>("")
  const [fillMethod, setFillMethod] = useState<string>("mean")
  const [scalingMethod, setScalingMethod] = useState<string>("standardize")
  const [encodingMethod, setEncodingMethod] = useState<string>("label")
  const [isProcessing, setIsProcessing] = useState(false)

  const numericColumns = columns.filter((col) => columnTypes[col] === "number")
  const categoricalColumns = columns.filter((col) => columnTypes[col] === "string" || columnTypes[col] === "boolean")

  // Calculate data quality metrics
  const dataQuality = useMemo(() => {
    if (!processedData.length) return null

    const totalCells = processedData.length * columns.length
    let nullCells = 0
    let duplicateRows = 0
    const uniqueRows = new Set()

    processedData.forEach((row) => {
      const rowString = JSON.stringify(row)
      if (uniqueRows.has(rowString)) {
        duplicateRows++
      } else {
        uniqueRows.add(rowString)
      }

      columns.forEach((col) => {
        if (row[col] === null || row[col] === undefined || row[col] === "") {
          nullCells++
        }
      })
    })

    return {
      totalRows: processedData.length,
      totalCells,
      nullCells,
      duplicateRows,
      completeness: (((totalCells - nullCells) / totalCells) * 100).toFixed(1),
      uniqueness: (((processedData.length - duplicateRows) / processedData.length) * 100).toFixed(1),
    }
  }, [processedData, columns])

  const addStep = (step: Omit<PreprocessingStep, "id">) => {
    const newStep = {
      ...step,
      id: Date.now().toString(),
    }
    setSteps([...steps, newStep])
  }

  const removeStep = (stepId: string) => {
    setSteps(steps.filter((step) => step.id !== stepId))
  }

  const calculateStatistics = (data: any[], column: string) => {
    const values = data.map((row) => row[column]).filter((v) => v !== null && v !== undefined && v !== "")
    const numericValues = values.filter((v) => !isNaN(Number(v))).map((v) => Number(v))

    if (numericValues.length === 0) return { mean: 0, median: 0, mode: values[0] || 0 }

    const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length
    const sorted = [...numericValues].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]

    // Calculate mode
    const frequency: Record<any, number> = {}
    values.forEach((v) => (frequency[v] = (frequency[v] || 0) + 1))
    const mode = Object.entries(frequency).reduce((a, b) => (frequency[a[0]] > frequency[b[0]] ? a : b))[0]

    return { mean, median, mode }
  }

  const applySteps = async () => {
    if (!processedData.length || !steps.length) return

    setIsProcessing(true)
    let data = [...processedData]

    try {
      for (const step of steps) {
        switch (step.type) {
          case "filter":
            if (step.column && step.value !== undefined) {
              data = data.filter((row) => {
                const cellValue = row[step.column!]
                if (typeof cellValue === "string") {
                  return cellValue.toLowerCase().includes(step.value!.toString().toLowerCase())
                }
                return cellValue == step.value
              })
            }
            break

          case "remove_nulls":
            if (step.column) {
              data = data.filter(
                (row) => row[step.column!] !== null && row[step.column!] !== undefined && row[step.column!] !== "",
              )
            }
            break

          case "fill_nulls":
            if (step.column) {
              const stats = calculateStatistics(data, step.column)
              let fillVal = step.value

              if (step.method === "mean") fillVal = stats.mean
              else if (step.method === "median") fillVal = stats.median
              else if (step.method === "mode") fillVal = stats.mode

              data = data.map((row) => ({
                ...row,
                [step.column!]:
                  row[step.column!] === null || row[step.column!] === undefined || row[step.column!] === ""
                    ? fillVal
                    : row[step.column!],
              }))
            }
            break

          case "remove_duplicates":
            const seen = new Set()
            data = data.filter((row) => {
              const key = JSON.stringify(row)
              if (seen.has(key)) {
                return false
              }
              seen.add(key)
              return true
            })
            break

          case "normalize":
            if (step.column) {
              const values = data.map((row) => Number.parseFloat(row[step.column!])).filter((v) => !isNaN(v))
              const min = Math.min(...values)
              const max = Math.max(...values)
              const range = max - min

              if (range > 0) {
                data = data.map((row) => ({
                  ...row,
                  [step.column!]: !isNaN(Number.parseFloat(row[step.column!]))
                    ? ((Number.parseFloat(row[step.column!]) - min) / range).toFixed(4)
                    : row[step.column!],
                }))
              }
            }
            break

          case "standardize":
            if (step.column) {
              const values = data.map((row) => Number.parseFloat(row[step.column!])).filter((v) => !isNaN(v))
              const mean = values.reduce((a, b) => a + b, 0) / values.length
              const std = Math.sqrt(values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length)

              if (std > 0) {
                data = data.map((row) => ({
                  ...row,
                  [step.column!]: !isNaN(Number.parseFloat(row[step.column!]))
                    ? ((Number.parseFloat(row[step.column!]) - mean) / std).toFixed(4)
                    : row[step.column!],
                }))
              }
            }
            break

          case "encode_categorical":
            if (step.column) {
              const uniqueValues = [...new Set(data.map((row) => row[step.column!]))]
              const labelMap = Object.fromEntries(uniqueValues.map((val, idx) => [val, idx]))

              data = data.map((row) => ({
                ...row,
                [step.column!]: labelMap[row[step.column!]] ?? row[step.column!],
              }))
            }
            break

          case "encode_onehot":
            if (step.column) {
              const uniqueValues = [...new Set(data.map((row) => row[step.column!]))]

              // Create new columns for each unique value
              data = data.map((row) => {
                const newRow = { ...row }
                uniqueValues.forEach((val) => {
                  newRow[`${step.column!}_${val}`] = row[step.column!] === val ? 1 : 0
                })
                delete newRow[step.column!] // Remove original column
                return newRow
              })
            }
            break
        }
      }

      setProcessedData(data)
      toast({
        title: "Preprocessing Complete",
        description: `Applied ${steps.length} preprocessing steps. ${data.length} rows remaining.`,
      })
    } catch (error) {
      toast({
        title: "Preprocessing Error",
        description: "An error occurred while processing the data.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const resetSteps = () => {
    setSteps([])
    toast({
      title: "Steps Cleared",
      description: "All preprocessing steps have been removed.",
    })
  }

  const exportProcessedData = () => {
    if (!processedData.length) return

    const newColumns = Object.keys(processedData[0])
    const csv = [
      newColumns.join(","),
      ...processedData.map((row) =>
        newColumns
          .map((col) => {
            const value = row[col]
            return typeof value === "string" && value.includes(",") ? `"${value}"` : value
          })
          .join(","),
      ),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const exportFileName = fileName ? `${fileName.split(".")[0]}_processed.csv` : "processed_data.csv"

    link.href = URL.createObjectURL(blob)
    link.download = exportFileName
    link.click()
  }

  if (!processedData.length) {
    return (
      <Card className="border-dashed border-2">
        <CardHeader className="text-center py-12">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
            <Filter className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>No Data to Preprocess</CardTitle>
          <p className="text-muted-foreground mt-2">Upload a dataset first to start preprocessing your data.</p>
        </CardHeader>
        <CardContent className="text-center pb-12">
          <Button className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Data
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Data Quality Overview */}
      {dataQuality && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Data Quality Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{dataQuality.totalRows.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Rows</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{dataQuality.nullCells.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Missing Values</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{dataQuality.completeness}%</div>
                <div className="text-sm text-muted-foreground">Completeness</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{dataQuality.uniqueness}%</div>
                <div className="text-sm text-muted-foreground">Uniqueness</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preprocessing Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Add Preprocessing Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="filter" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="filter">Filter</TabsTrigger>
                <TabsTrigger value="clean">Clean</TabsTrigger>
                <TabsTrigger value="scale">Scale</TabsTrigger>
                <TabsTrigger value="encode">Encode</TabsTrigger>
              </TabsList>

              <TabsContent value="filter" className="space-y-4">
                <div className="space-y-2">
                  <Label>Filter by Column Value</Label>
                  <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Filter value"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                  />
                  <Button
                    onClick={() => {
                      if (selectedColumn && filterValue) {
                        addStep({
                          type: "filter",
                          column: selectedColumn,
                          value: filterValue,
                          description: `Filter ${selectedColumn} contains "${filterValue}"`,
                        })
                        setFilterValue("")
                      }
                    }}
                    disabled={!selectedColumn || !filterValue}
                    className="w-full"
                  >
                    Add Filter Step
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="clean" className="space-y-4">
                <div className="space-y-2">
                  <Label>Handle Missing Values</Label>
                  <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        if (selectedColumn) {
                          addStep({
                            type: "remove_nulls",
                            column: selectedColumn,
                            description: `Remove rows with missing ${selectedColumn}`,
                          })
                        }
                      }}
                      disabled={!selectedColumn}
                      variant="outline"
                      className="flex-1"
                    >
                      Remove Missing
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Imputation Method</Label>
                    <Select value={fillMethod} onValueChange={setFillMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mean">Mean</SelectItem>
                        <SelectItem value="median">Median</SelectItem>
                        <SelectItem value="mode">Mode</SelectItem>
                        <SelectItem value="custom">Custom Value</SelectItem>
                      </SelectContent>
                    </Select>

                    {fillMethod === "custom" && (
                      <Input
                        placeholder="Fill value"
                        value={fillValue}
                        onChange={(e) => setFillValue(e.target.value)}
                      />
                    )}

                    <Button
                      onClick={() => {
                        if (selectedColumn) {
                          addStep({
                            type: "fill_nulls",
                            column: selectedColumn,
                            value: fillMethod === "custom" ? fillValue : undefined,
                            method: fillMethod,
                            description: `Fill missing ${selectedColumn} with ${fillMethod === "custom" ? fillValue : fillMethod}`,
                          })
                          if (fillMethod === "custom") setFillValue("")
                        }
                      }}
                      disabled={!selectedColumn || (fillMethod === "custom" && !fillValue)}
                      className="w-full"
                    >
                      Fill Missing Values
                    </Button>
                  </div>
                </div>

                <Separator />

                <Button
                  onClick={() => {
                    addStep({
                      type: "remove_duplicates",
                      description: "Remove duplicate rows",
                    })
                  }}
                  className="w-full"
                >
                  Remove Duplicates
                </Button>
              </TabsContent>

              <TabsContent value="scale" className="space-y-4">
                <div className="space-y-2">
                  <Label>Feature Scaling</Label>
                  <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select numeric column" />
                    </SelectTrigger>
                    <SelectContent>
                      {numericColumns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={scalingMethod} onValueChange={setScalingMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standardize">Standardization (Z-score)</SelectItem>
                      <SelectItem value="normalize">Min-Max Normalization</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={() => {
                      if (selectedColumn) {
                        addStep({
                          type: scalingMethod as any,
                          column: selectedColumn,
                          description: `${scalingMethod === "standardize" ? "Standardize" : "Normalize"} ${selectedColumn}`,
                        })
                      }
                    }}
                    disabled={!selectedColumn}
                    className="w-full"
                  >
                    <Scale className="h-4 w-4 mr-2" />
                    Apply Scaling
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="encode" className="space-y-4">
                <div className="space-y-2">
                  <Label>Categorical Encoding</Label>
                  <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select categorical column" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoricalColumns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={encodingMethod} onValueChange={setEncodingMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="label">Label Encoding</SelectItem>
                      <SelectItem value="onehot">One-Hot Encoding</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={() => {
                      if (selectedColumn) {
                        addStep({
                          type: encodingMethod === "label" ? "encode_categorical" : "encode_onehot",
                          column: selectedColumn,
                          description: `${encodingMethod === "label" ? "Label encode" : "One-hot encode"} ${selectedColumn}`,
                        })
                      }
                    }}
                    disabled={!selectedColumn}
                    className="w-full"
                  >
                    <Code className="h-4 w-4 mr-2" />
                    Apply Encoding
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Applied Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Preprocessing Pipeline
              </span>
              {steps.length > 0 && (
                <Button variant="outline" size="sm" onClick={resetSteps}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {steps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No preprocessing steps added yet.
                <br />
                Add steps from the left panel to build your pipeline.
              </div>
            ) : (
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{index + 1}</Badge>
                      <span className="text-sm">{step.description}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeStep(step.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <div className="flex gap-2 pt-4">
                  <Button onClick={applySteps} disabled={isProcessing} className="flex-1">
                    {isProcessing ? "Processing..." : "Apply All Steps"}
                  </Button>
                  <Button variant="outline" onClick={exportProcessedData}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
