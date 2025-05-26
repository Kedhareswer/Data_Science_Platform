"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Play,
  Square,
  Copy,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Code2,
  FileText,
  Lightbulb,
} from "lucide-react"
import { useData } from "@/lib/data-context"

interface ExecutionResult {
  success: boolean
  result?: any
  error?: string
  output?: string
  executionTime?: number
}

export function PythonCodeEditor() {
  const { executeCustomCode, processedData, columns } = useData()
  const [code, setCode] = useState(`# Welcome to Python Code Editor
# You have access to your dataset and powerful analysis functions

# Example: Basic data exploration
print(f"Dataset shape: {len(data)} rows, {len(columns)} columns")
print(f"Columns: {', '.join(columns[:5])}{'...' if len(columns) > 5 else ''}")

# Example: Calculate statistics
if len(data) > 0:
    numeric_cols = [col for col in columns if isinstance(data[0].get(col), (int, float))]
    if numeric_cols:
        col = numeric_cols[0]
        values = [row[col] for row in data if row[col] is not None]
        if values:
            print(f"\\n{col} statistics:")
            print(f"  Mean: {sum(values) / len(values):.2f}")
            print(f"  Min: {min(values)}")
            print(f"  Max: {max(values)}")`)

  const [output, setOutput] = useState("")
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)
  const [activeTab, setActiveTab] = useState("editor")
  const codeEditorRef = useRef<HTMLTextAreaElement>(null)

  const examples = [
    {
      title: "Data Overview",
      description: "Get basic information about your dataset",
      code: `# Dataset Overview
print(f"Total rows: {len(data)}")
print(f"Total columns: {len(columns)}")
print(f"Columns: {', '.join(columns)}")

# Show first few rows
print("\\nFirst 3 rows:")
for i, row in enumerate(data[:3]):
    print(f"Row {i + 1}: {dict(list(row.items())[:3])}...")

# Check for missing values
missing_counts = {}
for col in columns:
    missing = sum(1 for row in data if row.get(col) is None or row.get(col) == "")
    if missing > 0:
        missing_counts[col] = missing

if missing_counts:
    print(f"\\nMissing values: {missing_counts}")
else:
    print("\\nNo missing values found!")`,
    },
    {
      title: "Statistical Analysis",
      description: "Calculate descriptive statistics for numerical columns",
      code: `# Statistical Analysis
import math

def calculate_stats(values):
    if not values:
        return None
    
    n = len(values)
    mean = sum(values) / n
    sorted_vals = sorted(values)
    
    # Median
    if n % 2 == 0:
        median = (sorted_vals[n//2 - 1] + sorted_vals[n//2]) / 2
    else:
        median = sorted_vals[n//2]
    
    # Standard deviation
    variance = sum((x - mean) ** 2 for x in values) / n
    std_dev = math.sqrt(variance)
    
    return {
        'count': n,
        'mean': round(mean, 2),
        'median': median,
        'std': round(std_dev, 2),
        'min': min(values),
        'max': max(values)
    }

# Analyze numerical columns
for col in columns:
    values = []
    for row in data:
        val = row.get(col)
        if isinstance(val, (int, float)) and val is not None:
            values.append(val)
    
    if len(values) > 0:
        stats = calculate_stats(values)
        print(f"\\n{col} Statistics:")
        for key, value in stats.items():
            print(f"  {key}: {value}")`,
    },
    {
      title: "Data Filtering",
      description: "Filter and analyze subsets of your data",
      code: `# Data Filtering Examples

# Example 1: Filter by condition (adjust column name as needed)
# Replace 'age' with an actual column name from your dataset
target_col = columns[0] if columns else 'age'
print(f"Filtering by {target_col}...")

# For numerical columns
numeric_data = []
for row in data:
    val = row.get(target_col)
    if isinstance(val, (int, float)) and val is not None:
        numeric_data.append(row)

print(f"Rows with numeric {target_col}: {len(numeric_data)}")

# Example 2: Group by categorical column
if len(columns) > 1:
    group_col = columns[1]
    groups = {}
    
    for row in data:
        key = str(row.get(group_col, 'Unknown'))
        if key not in groups:
            groups[key] = []
        groups[key].append(row)
    
    print(f"\\nGrouping by {group_col}:")
    for key, group in groups.items():
        print(f"  {key}: {len(group)} rows")

# Example 3: Find unique values
if columns:
    col = columns[0]
    unique_values = set()
    for row in data:
        val = row.get(col)
        if val is not None:
            unique_values.add(str(val))
    
    print(f"\\nUnique values in {col}: {len(unique_values)}")
    if len(unique_values) <= 10:
        print(f"Values: {sorted(list(unique_values))}")`,
    },
    {
      title: "Missing Data Analysis",
      description: "Analyze patterns in missing data",
      code: `# Missing Data Analysis

# Calculate missing data percentage for each column
missing_analysis = {}
total_rows = len(data)

for col in columns:
    missing_count = 0
    for row in data:
        val = row.get(col)
        if val is None or val == "" or (isinstance(val, str) and val.strip() == ""):
            missing_count += 1
    
    missing_percentage = (missing_count / total_rows) * 100 if total_rows > 0 else 0
    missing_analysis[col] = {
        'missing_count': missing_count,
        'missing_percentage': round(missing_percentage, 2)
    }

# Display results
print("Missing Data Analysis:")
print("-" * 50)
for col, stats in missing_analysis.items():
    print(f"{col}:")
    print(f"  Missing: {stats['missing_count']} ({stats['missing_percentage']}%)")

# Find rows with most missing values
row_missing_counts = []
for i, row in enumerate(data):
    missing_in_row = 0
    for col in columns:
        val = row.get(col)
        if val is None or val == "":
            missing_in_row += 1
    row_missing_counts.append((i, missing_in_row))

# Sort by missing count
row_missing_counts.sort(key=lambda x: x[1], reverse=True)

print(f"\\nRows with most missing values:")
for i, (row_idx, missing_count) in enumerate(row_missing_counts[:5]):
    if missing_count > 0:
        print(f"  Row {row_idx + 1}: {missing_count} missing values")`,
    },
  ]

  const executeCode = async () => {
    if (!code.trim()) {
      setExecutionResult({
        success: false,
        error: "Please enter some code to execute",
      })
      return
    }

    setIsExecuting(true)
    setOutput("")
    setExecutionResult(null)

    const startTime = Date.now()

    try {
      const result = await executeCustomCode(code)
      const executionTime = Date.now() - startTime

      let formattedOutput = ""
      if (result.output) {
        formattedOutput += result.output
      }
      if (result.result !== undefined) {
        if (formattedOutput) formattedOutput += "\n\n"
        formattedOutput += "Result:\n"
        formattedOutput +=
          typeof result.result === "object" ? JSON.stringify(result.result, null, 2) : String(result.result)
      }

      setOutput(formattedOutput || "Code executed successfully (no output)")
      setExecutionResult({
        success: result.success,
        result: result.result,
        error: result.error,
        output: result.output,
        executionTime,
      })
    } catch (err) {
      const executionTime = Date.now() - startTime
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"

      setOutput(`Execution Error: ${errorMessage}`)
      setExecutionResult({
        success: false,
        error: errorMessage,
        executionTime,
      })
    } finally {
      setIsExecuting(false)
    }
  }

  const stopExecution = () => {
    setIsExecuting(false)
    setOutput("Execution stopped by user")
    setExecutionResult({
      success: false,
      error: "Execution stopped",
    })
  }

  const copyOutput = async () => {
    if (output) {
      try {
        await navigator.clipboard.writeText(output)
      } catch (err) {
        console.error("Failed to copy output:", err)
      }
    }
  }

  const downloadOutput = () => {
    if (output) {
      const blob = new Blob([output], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "python_output.txt"
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const clearOutput = () => {
    setOutput("")
    setExecutionResult(null)
  }

  const insertExample = (exampleCode: string) => {
    setCode(exampleCode)
    setActiveTab("editor")
  }

  const getStatusIcon = () => {
    if (isExecuting) {
      return <Clock className="h-4 w-4 animate-spin text-blue-500" />
    }
    if (executionResult?.success) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    if (executionResult?.error) {
      return <AlertCircle className="h-4 w-4 text-red-500" />
    }
    return null
  }

  return (
    <div className="space-y-4">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="h-5 w-5" />
          <h3 className="font-semibold">Python Code Editor</h3>
          {getStatusIcon()}
        </div>

        {executionResult?.executionTime && (
          <Badge variant="outline" className="text-xs">
            {executionResult.executionTime}ms
          </Badge>
        )}
      </div>

      {/* Data availability notice */}
      {processedData.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No data loaded. Upload a dataset to access data analysis functions.</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="editor" className="gap-2">
            <Code2 className="h-4 w-4" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="examples" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            Examples
          </TabsTrigger>
          <TabsTrigger value="output" className="gap-2">
            <FileText className="h-4 w-4" />
            Output
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Code Editor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                ref={codeEditorRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter your Python code here..."
                className="font-mono text-sm min-h-[300px] resize-none"
                style={{ fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace' }}
              />

              <div className="flex gap-2">
                <Button onClick={isExecuting ? stopExecution : executeCode} disabled={!code.trim()} className="gap-2">
                  {isExecuting ? (
                    <>
                      <Square className="h-4 w-4" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Run Code
                    </>
                  )}
                </Button>

                <Button variant="outline" onClick={() => setCode("")}>
                  Clear
                </Button>

                {processedData.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {processedData.length} rows, {columns.length} columns available
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examples" className="space-y-4">
          <div className="grid gap-4">
            {examples.map((example, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{example.title}</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => insertExample(example.code)} className="gap-2">
                      <Code2 className="h-3 w-3" />
                      Use Example
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{example.description}</p>
                  <ScrollArea className="h-32 w-full border rounded-md p-3 bg-muted/50">
                    <pre className="text-xs font-mono whitespace-pre-wrap">{example.code}</pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="output" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Execution Output</CardTitle>
                <div className="flex gap-2">
                  {output && (
                    <>
                      <Button variant="outline" size="sm" onClick={copyOutput} className="gap-2">
                        <Copy className="h-3 w-3" />
                        Copy
                      </Button>
                      <Button variant="outline" size="sm" onClick={downloadOutput} className="gap-2">
                        <Download className="h-3 w-3" />
                        Download
                      </Button>
                    </>
                  )}
                  <Button variant="outline" size="sm" onClick={clearOutput}>
                    Clear
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isExecuting ? (
                <div className="flex items-center gap-2 p-4 text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Executing code...
                </div>
              ) : output ? (
                <ScrollArea className="h-64 w-full border rounded-md p-3 bg-muted/50">
                  <pre className="text-sm font-mono whitespace-pre-wrap">{output}</pre>
                </ScrollArea>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2" />
                  <p>No output yet. Run some code to see results here.</p>
                </div>
              )}

              {executionResult?.error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{executionResult.error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
