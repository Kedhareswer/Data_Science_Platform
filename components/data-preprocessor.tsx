"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Check, RefreshCw, Plus, Trash2, AlertCircle, Code, Play, Eye } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useData } from "@/lib/data-context"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export function DataPreprocessor() {
  const {
    columns,
    columnTypes,
    isLoading,
    applyPreprocessing,
    processedData,
    detectOutliers,
    handleOutliers,
    createFeature,
    binColumn,
    executeCustomCode,
    getDataSample,
  } = useData()

  const [activeTab, setActiveTab] = useState("missing")
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [strategy, setStrategy] = useState("mean")
  const [constantValue, setConstantValue] = useState("")
  const [normalizationMethod, setNormalizationMethod] = useState("minmax")
  const [isSuccess, setIsSuccess] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [filterConditions, setFilterConditions] = useState([{ column: "", operator: "equal", value: "" }])
  const [transformOptions, setTransformOptions] = useState({
    logTransform: false,
    oneHotEncode: false,
  })

  // Outlier detection states
  const [outlierMethod, setOutlierMethod] = useState("iqr")
  const [outlierAction, setOutlierAction] = useState("remove")
  const [outlierResults, setOutlierResults] = useState<{ column: string; outliers: number[] }[]>([])
  const [showOutlierPreview, setShowOutlierPreview] = useState(false)

  // Feature engineering states
  const [featureName, setFeatureName] = useState("")
  const [featureExpression, setFeatureExpression] = useState("")
  const [featureType, setFeatureType] = useState("arithmetic")
  const [binColumnState, setBinColumnState] = useState("")
  const [binCount, setBinCount] = useState(5)
  const [binLabels, setBinLabels] = useState("")

  // Python code execution states
  const [pythonCode, setPythonCode] = useState(`# Example: Filter data where age > 25
filtered_data = filter(lambda row: row.get('age', 0) > 25)
console.log('Filtered rows:', len(list(filtered_data)))

# Example: Calculate average of a column
avg_value = aggregate('age', 'mean')
console.log('Average age:', avg_value)

# Example: Group data by category
groups = groupBy('category')
console.log('Groups:', Object.keys(groups))`)
  const [codeOutput, setCodeOutput] = useState("")
  const [isExecuting, setIsExecuting] = useState(false)
  const codeEditorRef = useRef<HTMLTextAreaElement>(null)

  // Get numeric and categorical columns
  const numericColumns = columns.filter((col) => columnTypes[col] === "number")
  const categoricalColumns = columns.filter((col) => columnTypes[col] === "string" || columnTypes[col] === "boolean")

  const handleColumnToggle = (column: string) => {
    setSelectedColumns((prev) => (prev.includes(column) ? prev.filter((col) => col !== column) : [...prev, column]))
  }

  const handleProcess = async () => {
    if (selectedColumns.length === 0 && activeTab !== "python") {
      setError("Please select at least one column")
      setTimeout(() => setError(null), 3000)
      return
    }

    setError(null)
    setProcessingProgress(0)

    const progressInterval = setInterval(() => {
      setProcessingProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 100)

    try {
      if (activeTab === "missing") {
        await applyPreprocessing("missing", {
          columns: selectedColumns,
          strategy,
          value: constantValue,
        })
      } else if (activeTab === "normalize") {
        await applyPreprocessing("normalize", {
          columns: selectedColumns,
          method: normalizationMethod,
        })
      } else if (activeTab === "transform") {
        await applyPreprocessing("transform", {
          columns: selectedColumns,
          action: "drop",
        })
      } else if (activeTab === "outliers") {
        await handleOutliers(selectedColumns, outlierMethod, outlierAction)
      }

      clearInterval(progressInterval)
      setProcessingProgress(100)
      setIsSuccess(true)
      setTimeout(() => {
        setIsSuccess(false)
        setProcessingProgress(0)
      }, 3000)
    } catch (err) {
      clearInterval(progressInterval)
      setError(err instanceof Error ? err.message : "An error occurred during processing")
      setProcessingProgress(0)
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleDetectOutliers = () => {
    if (selectedColumns.length === 0) {
      setError("Please select at least one column")
      return
    }

    const results = detectOutliers(selectedColumns, outlierMethod)
    setOutlierResults(results)
    setShowOutlierPreview(true)
  }

  const handleCreateFeature = () => {
    if (!featureName || !featureExpression) {
      setError("Please provide feature name and expression")
      return
    }

    createFeature(featureName, featureExpression, featureType)
    setFeatureName("")
    setFeatureExpression("")
    setIsSuccess(true)
    setTimeout(() => setIsSuccess(false), 3000)
  }

  const handleBinColumn = () => {
    if (!binColumnState) {
      setError("Please select a column to bin")
      return
    }

    const labels = binLabels ? binLabels.split(",").map((l) => l.trim()) : undefined
    binColumn(binColumnState, binCount, labels)
    setBinColumnState("")
    setBinLabels("")
    setIsSuccess(true)
    setTimeout(() => setIsSuccess(false), 3000)
  }

  const handleExecuteCode = async () => {
    if (!pythonCode.trim()) {
      setError("Please enter some code to execute")
      return
    }

    setIsExecuting(true)
    setCodeOutput("")

    try {
      const result = await executeCustomCode(pythonCode)

      if (result.success) {
        let output = result.output || ""
        if (result.result !== undefined) {
          output += output ? "\n\nResult:\n" : "Result:\n"
          output += typeof result.result === "object" ? JSON.stringify(result.result, null, 2) : String(result.result)
        }
        setCodeOutput(output || "Code executed successfully (no output)")
      } else {
        setCodeOutput(`Error: ${result.error}`)
      }
    } catch (err) {
      setCodeOutput(`Execution Error: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setIsExecuting(false)
    }
  }

  const addFilterCondition = () => {
    setFilterConditions([...filterConditions, { column: "", operator: "equal", value: "" }])
  }

  const removeFilterCondition = (index: number) => {
    setFilterConditions(filterConditions.filter((_, i) => i !== index))
  }

  const updateFilterCondition = (index: number, field: string, value: string) => {
    const newConditions = [...filterConditions]
    newConditions[index] = { ...newConditions[index], [field]: value }
    setFilterConditions(newConditions)
  }

  const selectAllColumns = (type: "numeric" | "categorical" | "all") => {
    if (type === "numeric") {
      setSelectedColumns(numericColumns)
    } else if (type === "categorical") {
      setSelectedColumns(categoricalColumns)
    } else {
      setSelectedColumns(columns)
    }
  }

  const insertCodeTemplate = (template: string) => {
    const templates = {
      filter: `# Filter data based on condition
filtered_data = filter(lambda row: row.get('column_name', 0) > threshold_value)
console.log('Filtered rows:', len(list(filtered_data)))`,

      aggregate: `# Calculate statistics
avg_value = aggregate('column_name', 'mean')
sum_value = aggregate('column_name', 'sum')
console.log('Average:', avg_value, 'Sum:', sum_value)`,

      groupby: `# Group data by category
groups = groupBy('category_column')
for (const [key, group] of Object.entries(groups)) {
  console.log(\`Group \${key}: \${group.length} rows\`)
}`,

      transform: `# Transform data
transformed_data = map(row => ({
  ...row,
  new_column: row.existing_column * 2
}))
console.log('Transformed', transformed_data.length, 'rows')`,
    }

    setPythonCode(templates[template as keyof typeof templates] || template)
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="sketch-card">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isSuccess && (
        <Alert variant="default" className="bg-green-50 border-green-200 sketch-card">
          <Check className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success</AlertTitle>
          <AlertDescription className="text-green-700">
            Data preprocessing completed successfully. {processedData.length} rows processed.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sketch-tabs">
        <TabsList className="grid w-full grid-cols-6 p-1 gap-1">
          <TabsTrigger value="missing" className="sketch-tab text-xs">
            Missing Values
          </TabsTrigger>
          <TabsTrigger value="outliers" className="sketch-tab text-xs">
            Outliers
          </TabsTrigger>
          <TabsTrigger value="normalize" className="sketch-tab text-xs">
            Normalize
          </TabsTrigger>
          <TabsTrigger value="transform" className="sketch-tab text-xs">
            Transform
          </TabsTrigger>
          <TabsTrigger value="features" className="sketch-tab text-xs">
            Features
          </TabsTrigger>
          <TabsTrigger value="python" className="sketch-tab text-xs">
            <Code className="h-3 w-3 mr-1" />
            Python
          </TabsTrigger>
        </TabsList>

        <TabsContent value="missing" className="space-y-4">
          <Card className="sketch-card">
            <CardHeader>
              <CardTitle>Handle Missing Values</CardTitle>
              <CardDescription>
                Select columns and choose a strategy to handle missing values in your dataset.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Select Columns</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectAllColumns("all")}
                      className="h-8 sketch-button"
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedColumns([])}
                      className="h-8 sketch-button"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {columns.map((column) => (
                    <div key={column} className="flex items-center space-x-2">
                      <Checkbox
                        id={`column-${column}`}
                        checked={selectedColumns.includes(column)}
                        onCheckedChange={() => handleColumnToggle(column)}
                      />
                      <Label htmlFor={`column-${column}`} className="truncate">
                        {column}
                        {columnTypes[column] && (
                          <Badge variant="outline" className="ml-1 text-xs">
                            {columnTypes[column]}
                          </Badge>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Strategy</Label>
                <Select value={strategy || "mean"} onValueChange={setStrategy}>
                  <SelectTrigger className="sketch-input">
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mean">Replace with Mean</SelectItem>
                    <SelectItem value="median">Replace with Median</SelectItem>
                    <SelectItem value="mode">Replace with Mode</SelectItem>
                    <SelectItem value="constant">Replace with Constant</SelectItem>
                    <SelectItem value="drop">Drop Rows</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {strategy === "constant" && (
                <div className="space-y-2">
                  <Label>Constant Value</Label>
                  <Input
                    type="text"
                    placeholder="Enter value"
                    value={constantValue}
                    onChange={(e) => setConstantValue(e.target.value)}
                    className="sketch-input"
                  />
                </div>
              )}

              {processingProgress > 0 && (
                <div className="space-y-2">
                  <Progress value={processingProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-right">{processingProgress}% processed</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setSelectedColumns([])} className="sketch-button">
                Reset
              </Button>
              <Button
                onClick={handleProcess}
                disabled={selectedColumns.length === 0 || isLoading || processingProgress > 0}
                className="sketch-button"
              >
                {isLoading || processingProgress > 0 ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Apply Changes"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="outliers" className="space-y-4">
          <Card className="sketch-card">
            <CardHeader>
              <CardTitle>Outlier Detection & Handling</CardTitle>
              <CardDescription>
                Detect and handle outliers in numerical columns using statistical methods.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Select Numerical Columns</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectAllColumns("numeric")}
                      className="h-8 sketch-button"
                    >
                      Select All Numeric
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedColumns([])}
                      className="h-8 sketch-button"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {numericColumns.map((column) => (
                    <div key={column} className="flex items-center space-x-2">
                      <Checkbox
                        id={`outlier-column-${column}`}
                        checked={selectedColumns.includes(column)}
                        onCheckedChange={() => handleColumnToggle(column)}
                      />
                      <Label htmlFor={`outlier-column-${column}`} className="truncate">
                        {column}
                      </Label>
                    </div>
                  ))}
                </div>
                {numericColumns.length === 0 && (
                  <p className="text-sm text-muted-foreground">No numerical columns found in the dataset.</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Detection Method</Label>
                  <Select value={outlierMethod || "iqr"} onValueChange={setOutlierMethod}>
                    <SelectTrigger className="sketch-input">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iqr">IQR Method (1.5 * IQR)</SelectItem>
                      <SelectItem value="zscore">Z-Score (3 standard deviations)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select value={outlierAction || "remove"} onValueChange={setOutlierAction}>
                    <SelectTrigger className="sketch-input">
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remove">Remove Outliers</SelectItem>
                      <SelectItem value="cap">Cap to Percentiles (5th-95th)</SelectItem>
                      <SelectItem value="transform">Log Transform</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleDetectOutliers}
                  disabled={selectedColumns.length === 0}
                  className="sketch-button"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview Outliers
                </Button>
              </div>

              {showOutlierPreview && outlierResults.length > 0 && (
                <div className="space-y-2">
                  <Label>Outlier Detection Results</Label>
                  <div className="border rounded-md p-3 bg-muted/50">
                    {outlierResults.map((result) => (
                      <div key={result.column} className="flex justify-between items-center py-1">
                        <span className="font-medium">{result.column}</span>
                        <Badge variant="secondary">{result.outliers.length} outliers found</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {processingProgress > 0 && (
                <div className="space-y-2">
                  <Progress value={processingProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-right">{processingProgress}% processed</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setSelectedColumns([])} className="sketch-button">
                Reset
              </Button>
              <Button
                onClick={handleProcess}
                disabled={selectedColumns.length === 0 || isLoading || processingProgress > 0}
                className="sketch-button"
              >
                {isLoading || processingProgress > 0 ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Apply Outlier Handling"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="normalize" className="space-y-4">
          <Card className="sketch-card">
            <CardHeader>
              <CardTitle>Normalize Data</CardTitle>
              <CardDescription>Normalize numerical columns to a standard scale.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Select Numerical Columns</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectAllColumns("numeric")}
                      className="h-8 sketch-button"
                    >
                      Select All Numeric
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedColumns([])}
                      className="h-8 sketch-button"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {numericColumns.map((column) => (
                    <div key={column} className="flex items-center space-x-2">
                      <Checkbox
                        id={`norm-column-${column}`}
                        checked={selectedColumns.includes(column)}
                        onCheckedChange={() => handleColumnToggle(column)}
                      />
                      <Label htmlFor={`norm-column-${column}`} className="truncate">
                        {column}
                      </Label>
                    </div>
                  ))}
                </div>
                {numericColumns.length === 0 && (
                  <p className="text-sm text-muted-foreground">No numerical columns found in the dataset.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Normalization Method</Label>
                <Select value={normalizationMethod || "minmax"} onValueChange={setNormalizationMethod}>
                  <SelectTrigger className="sketch-input">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minmax">Min-Max Scaling (0-1)</SelectItem>
                    <SelectItem value="zscore">Z-Score Standardization</SelectItem>
                    <SelectItem value="robust">Robust Scaling</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {normalizationMethod === "minmax" && "Scales values to range between 0 and 1"}
                  {normalizationMethod === "zscore" && "Standardizes values to have mean=0 and standard deviation=1"}
                  {normalizationMethod === "robust" && "Scales using quartiles, less sensitive to outliers"}
                </p>
              </div>

              {processingProgress > 0 && (
                <div className="space-y-2">
                  <Progress value={processingProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-right">{processingProgress}% processed</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setSelectedColumns([])} className="sketch-button">
                Reset
              </Button>
              <Button
                onClick={handleProcess}
                disabled={selectedColumns.length === 0 || isLoading || processingProgress > 0}
                className="sketch-button"
              >
                {isLoading || processingProgress > 0 ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Apply Normalization"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="transform" className="space-y-4">
          <Card className="sketch-card">
            <CardHeader>
              <CardTitle>Transform & Drop Columns</CardTitle>
              <CardDescription>Drop columns or transform data in your dataset.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Drop Columns</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectAllColumns("all")}
                      className="h-8 sketch-button"
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedColumns([])}
                      className="h-8 sketch-button"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {columns.map((column) => (
                    <div key={column} className="flex items-center space-x-2">
                      <Checkbox
                        id={`drop-column-${column}`}
                        checked={selectedColumns.includes(column)}
                        onCheckedChange={() => handleColumnToggle(column)}
                      />
                      <Label htmlFor={`drop-column-${column}`} className="truncate">
                        {column}
                        {columnTypes[column] && (
                          <Badge variant="outline" className="ml-1 text-xs">
                            {columnTypes[column]}
                          </Badge>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Filter Conditions</Label>
                  <Button variant="outline" size="sm" onClick={addFilterCondition} className="h-8 sketch-button">
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Condition
                  </Button>
                </div>

                <div className="space-y-3">
                  {filterConditions.map((condition, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-2">
                      <Select
                        value={condition.column || "default"}
                        onValueChange={(value) =>
                          updateFilterCondition(index, "column", value === "default" ? "" : value)
                        }
                      >
                        <SelectTrigger className="w-[150px] sketch-input">
                          <SelectValue placeholder="Column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default" disabled>
                            Select Column
                          </SelectItem>
                          {columns.map((col) => (
                            <SelectItem key={col} value={col}>
                              {col}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={condition.operator || "equal"}
                        onValueChange={(value) => updateFilterCondition(index, "operator", value)}
                      >
                        <SelectTrigger className="w-[150px] sketch-input">
                          <SelectValue placeholder="Operator" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equal">Equal to</SelectItem>
                          <SelectItem value="greater">Greater than</SelectItem>
                          <SelectItem value="less">Less than</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        className="w-[150px] sketch-input"
                        placeholder="Value"
                        value={condition.value}
                        onChange={(e) => updateFilterCondition(index, "value", e.target.value)}
                      />

                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 sketch-button"
                        onClick={() => removeFilterCondition(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Transform Columns</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="transform-log"
                      checked={transformOptions.logTransform}
                      onCheckedChange={(checked) =>
                        setTransformOptions((prev) => ({ ...prev, logTransform: !!checked }))
                      }
                    />
                    <Label htmlFor="transform-log">Apply log transformation to numerical columns</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="transform-onehot"
                      checked={transformOptions.oneHotEncode}
                      onCheckedChange={(checked) =>
                        setTransformOptions((prev) => ({ ...prev, oneHotEncode: !!checked }))
                      }
                    />
                    <Label htmlFor="transform-onehot">One-hot encode categorical columns</Label>
                  </div>
                </div>
              </div>

              {processingProgress > 0 && (
                <div className="space-y-2">
                  <Progress value={processingProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-right">{processingProgress}% processed</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedColumns([])
                  setFilterConditions([{ column: "", operator: "equal", value: "" }])
                  setTransformOptions({ logTransform: false, oneHotEncode: false })
                }}
                className="sketch-button"
              >
                Reset
              </Button>
              <Button
                onClick={handleProcess}
                disabled={selectedColumns.length === 0 || isLoading || processingProgress > 0}
                className="sketch-button"
              >
                {isLoading || processingProgress > 0 ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Drop Selected Columns"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="sketch-card">
              <CardHeader>
                <CardTitle>Feature Engineering</CardTitle>
                <CardDescription>Create new features from existing columns.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Feature Name</Label>
                  <Input
                    placeholder="e.g., age_group, total_score"
                    value={featureName}
                    onChange={(e) => setFeatureName(e.target.value)}
                    className="sketch-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Feature Type</Label>
                  <Select value={featureType || "arithmetic"} onValueChange={setFeatureType}>
                    <SelectTrigger className="sketch-input">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="arithmetic">Arithmetic Expression</SelectItem>
                      <SelectItem value="categorical">Categorical Mapping</SelectItem>
                      <SelectItem value="datetime">DateTime Extraction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Expression</Label>
                  <Textarea
                    placeholder={
                      featureType === "arithmetic"
                        ? "e.g., age * 2 + height / 100"
                        : featureType === "categorical"
                          ? "e.g., high_value (for values containing 'high')"
                          : "e.g., year, month, day, weekday"
                    }
                    value={featureExpression}
                    onChange={(e) => setFeatureExpression(e.target.value)}
                    className="sketch-input"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    {featureType === "arithmetic" && "Use column names and operators (+, -, *, /, %)"}
                    {featureType === "categorical" && "Enter text to match for creating Yes/No categories"}
                    {featureType === "datetime" && "Extract: year, month, day, weekday from date columns"}
                  </p>
                </div>

                <Button onClick={handleCreateFeature} className="w-full sketch-button">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Feature
                </Button>
              </CardContent>
            </Card>

            <Card className="sketch-card">
              <CardHeader>
                <CardTitle>Column Binning</CardTitle>
                <CardDescription>Convert numerical columns into categorical bins.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Column</Label>
                  <Select
                    value={binColumnState || "default"}
                    onValueChange={(value) => setBinColumnState(value === "default" ? "" : value)}
                  >
                    <SelectTrigger className="sketch-input">
                      <SelectValue placeholder="Select column to bin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default" disabled>
                        Select column to bin
                      </SelectItem>
                      {numericColumns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Number of Bins</Label>
                  <Input
                    type="number"
                    min="2"
                    max="20"
                    value={binCount}
                    onChange={(e) => setBinCount(Number(e.target.value))}
                    className="sketch-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Custom Labels (Optional)</Label>
                  <Input
                    placeholder="e.g., Low, Medium, High (comma-separated)"
                    value={binLabels}
                    onChange={(e) => setBinLabels(e.target.value)}
                    className="sketch-input"
                  />
                  <p className="text-xs text-muted-foreground">Leave empty for default labels (Bin 1, Bin 2, etc.)</p>
                </div>

                <Button onClick={handleBinColumn} className="w-full sketch-button">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Binned Column
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="python" className="space-y-4">
          <Card className="sketch-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Python Code Execution
              </CardTitle>
              <CardDescription>
                Write and execute custom data preprocessing code. Available functions: filter, map, reduce, groupBy,
                aggregate.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Code Templates</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => insertCodeTemplate("filter")}
                      className="h-8 sketch-button"
                    >
                      Filter
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => insertCodeTemplate("aggregate")}
                      className="h-8 sketch-button"
                    >
                      Aggregate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => insertCodeTemplate("groupby")}
                      className="h-8 sketch-button"
                    >
                      Group By
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => insertCodeTemplate("transform")}
                      className="h-8 sketch-button"
                    >
                      Transform
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Python Code</Label>
                <Textarea
                  ref={codeEditorRef}
                  value={pythonCode}
                  onChange={(e) => setPythonCode(e.target.value)}
                  className="sketch-input font-mono text-sm"
                  rows={12}
                  placeholder="Enter your Python-like code here..."
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleExecuteCode} disabled={isExecuting} className="sketch-button">
                  {isExecuting ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Execute Code
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setPythonCode("")} className="sketch-button">
                  Clear
                </Button>
              </div>

              {codeOutput && (
                <div className="space-y-2">
                  <Label>Output</Label>
                  <ScrollArea className="h-32 w-full border rounded-md p-3 bg-muted/50">
                    <pre className="text-sm font-mono whitespace-pre-wrap">{codeOutput}</pre>
                  </ScrollArea>
                </div>
              )}

              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full sketch-button">
                    <Code className="mr-2 h-4 w-4" />
                    Available Functions & Examples
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  <div className="border rounded-md p-3 bg-muted/50 text-sm">
                    <div className="space-y-2">
                      <div>
                        <strong>Available Variables:</strong>
                        <ul className="list-disc list-inside ml-2">
                          <li>
                            <code>data</code> - Current dataset
                          </li>
                          <li>
                            <code>columns</code> - Column names array
                          </li>
                        </ul>
                      </div>
                      <div>
                        <strong>Available Functions:</strong>
                        <ul className="list-disc list-inside ml-2">
                          <li>
                            <code>filter(condition)</code> - Filter rows
                          </li>
                          <li>
                            <code>map(transform)</code> - Transform rows
                          </li>
                          <li>
                            <code>groupBy(column)</code> - Group by column
                          </li>
                          <li>
                            <code>aggregate(column, operation)</code> - Calculate statistics
                          </li>
                        </ul>
                      </div>
                      <div>
                        <strong>Example:</strong>
                        <pre className="bg-background p-2 rounded text-xs mt-1">
                          {`// Filter high-value customers
const highValue = filter(row => row.purchase_amount > 1000)
console.log('High value customers:', highValue.length)

// Calculate average age by category
const groups = groupBy('category')
Object.entries(groups).forEach(([cat, rows]) => {
  const avgAge = rows.reduce((sum, row) => sum + (row.age || 0), 0) / rows.length
  console.log(\`\${cat}: \${avgAge.toFixed(1)} years\`)
})`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
