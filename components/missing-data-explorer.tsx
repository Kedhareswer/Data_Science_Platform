"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts"
import {
  AlertTriangle,
  Info,
  CheckCircle,
  TrendingUp,
  Database,
  Grid,
  Activity,
  Download,
  RefreshCw,
} from "lucide-react"
import { useData } from "@/lib/data-context"

interface MissingDataPattern {
  pattern: string
  count: number
  percentage: number
  columns: string[]
  description: string
}

interface MissingDataStats {
  totalMissing: number
  totalCells: number
  missingPercentage: number
  completeRows: number
  incompleteRows: number
  columnStats: Array<{
    column: string
    missing: number
    percentage: number
    type: string
  }>
  patterns: MissingDataPattern[]
  correlations: Array<{
    column1: string
    column2: string
    correlation: number
  }>
}

export function MissingDataExplorer() {
  const { processedData, columns, columnTypes, isLoading } = useData()
  const [selectedVisualization, setSelectedVisualization] = useState("overview")
  const [showOnlyMissing, setShowOnlyMissing] = useState(false)
  const [missingThreshold, setMissingThreshold] = useState([5])
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])

  // Calculate comprehensive missing data statistics
  const missingDataStats = useMemo((): MissingDataStats => {
    if (!processedData.length || !columns.length) {
      return {
        totalMissing: 0,
        totalCells: 0,
        missingPercentage: 0,
        completeRows: 0,
        incompleteRows: 0,
        columnStats: [],
        patterns: [],
        correlations: [],
      }
    }

    const totalCells = processedData.length * columns.length
    let totalMissing = 0
    let completeRows = 0

    // Calculate column-level statistics
    const columnStats = columns.map((column) => {
      const missing = processedData.filter(
        (row) => row[column] === null || row[column] === undefined || row[column] === "",
      ).length
      totalMissing += missing
      return {
        column,
        missing,
        percentage: (missing / processedData.length) * 100,
        type: columnTypes[column] || "unknown",
      }
    })

    // Calculate complete/incomplete rows
    processedData.forEach((row) => {
      const isComplete = columns.every((col) => row[col] !== null && row[col] !== undefined && row[col] !== "")
      if (isComplete) completeRows++
    })

    const incompleteRows = processedData.length - completeRows

    // Identify missing data patterns
    const patternMap = new Map<string, { count: number; columns: string[] }>()

    processedData.forEach((row) => {
      const missingCols = columns.filter((col) => row[col] === null || row[col] === undefined || row[col] === "")

      if (missingCols.length > 0) {
        const pattern = missingCols.sort().join(",")
        const existing = patternMap.get(pattern) || { count: 0, columns: missingCols }
        patternMap.set(pattern, { count: existing.count + 1, columns: missingCols })
      }
    })

    const patterns: MissingDataPattern[] = Array.from(patternMap.entries())
      .map(([pattern, data]) => ({
        pattern,
        count: data.count,
        percentage: (data.count / processedData.length) * 100,
        columns: data.columns,
        description: `Missing in ${data.columns.length} column${data.columns.length > 1 ? "s" : ""}: ${data.columns.join(", ")}`,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // Top 10 patterns

    // Calculate missing data correlations
    const correlations: Array<{ column1: string; column2: string; correlation: number }> = []

    for (let i = 0; i < columns.length; i++) {
      for (let j = i + 1; j < columns.length; j++) {
        const col1 = columns[i]
        const col2 = columns[j]

        const pairs = processedData.map((row) => ({
          missing1: row[col1] === null || row[col1] === undefined || row[col1] === "",
          missing2: row[col2] === null || row[col2] === undefined || row[col2] === "",
        }))

        // Calculate correlation between missing patterns
        const n = pairs.length
        const sum1 = pairs.filter((p) => p.missing1).length
        const sum2 = pairs.filter((p) => p.missing2).length
        const sum12 = pairs.filter((p) => p.missing1 && p.missing2).length

        if (sum1 > 0 && sum2 > 0) {
          const correlation = (n * sum12 - sum1 * sum2) / Math.sqrt((n * sum1 - sum1 * sum1) * (n * sum2 - sum2 * sum2))
          if (!isNaN(correlation) && Math.abs(correlation) > 0.1) {
            correlations.push({ column1: col1, column2: col2, correlation })
          }
        }
      }
    }

    correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))

    return {
      totalMissing,
      totalCells,
      missingPercentage: (totalMissing / totalCells) * 100,
      completeRows,
      incompleteRows,
      columnStats,
      patterns,
      correlations: correlations.slice(0, 10),
    }
  }, [processedData, columns, columnTypes])

  // Filter columns based on missing threshold
  const filteredColumnStats = useMemo(() => {
    if (showOnlyMissing) {
      return missingDataStats.columnStats.filter((stat) => stat.percentage >= missingThreshold[0])
    }
    return missingDataStats.columnStats
  }, [missingDataStats.columnStats, showOnlyMissing, missingThreshold])

  // Prepare data for missing data heatmap
  const heatmapData = useMemo(() => {
    if (!processedData.length) return []

    // Sample data for performance (max 100 rows)
    const sampleSize = Math.min(100, processedData.length)
    const step = Math.floor(processedData.length / sampleSize)
    const sampledData = processedData.filter((_, index) => index % step === 0).slice(0, sampleSize)

    return sampledData.map((row, rowIndex) => {
      const rowData: any = { rowIndex }
      columns.forEach((col) => {
        rowData[col] = row[col] === null || row[col] === undefined || row[col] === "" ? 1 : 0
      })
      return rowData
    })
  }, [processedData, columns])

  // Prepare data for missing data by row visualization
  const missingByRowData = useMemo(() => {
    const rowMissingCounts = processedData.map((row, index) => {
      const missingCount = columns.filter(
        (col) => row[col] === null || row[col] === undefined || row[col] === "",
      ).length
      return { rowIndex: index + 1, missingCount, percentage: (missingCount / columns.length) * 100 }
    })

    // Group by missing count for histogram
    const histogram = Array.from({ length: columns.length + 1 }, (_, i) => ({
      missingCount: i,
      rows: rowMissingCounts.filter((row) => row.missingCount === i).length,
      percentage: (rowMissingCounts.filter((row) => row.missingCount === i).length / processedData.length) * 100,
    })).filter((item) => item.rows > 0)

    return { rowMissingCounts, histogram }
  }, [processedData, columns])

  const exportMissingDataReport = () => {
    const report = {
      summary: {
        totalRows: processedData.length,
        totalColumns: columns.length,
        totalCells: missingDataStats.totalCells,
        totalMissing: missingDataStats.totalMissing,
        missingPercentage: missingDataStats.missingPercentage,
        completeRows: missingDataStats.completeRows,
        incompleteRows: missingDataStats.incompleteRows,
      },
      columnAnalysis: missingDataStats.columnStats,
      patterns: missingDataStats.patterns,
      correlations: missingDataStats.correlations,
      generatedAt: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "missing_data_report.json"
    link.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Missing Data Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Analyzing missing data patterns...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!processedData.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Missing Data Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No data available for missing data analysis</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Missing Cells</p>
                <p className="text-2xl font-bold">{missingDataStats.totalMissing.toLocaleString()}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
            <div className="mt-2">
              <Progress value={missingDataStats.missingPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {missingDataStats.missingPercentage.toFixed(1)}% of total data
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Complete Rows</p>
                <p className="text-2xl font-bold">{missingDataStats.completeRows.toLocaleString()}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div className="mt-2">
              <Progress value={(missingDataStats.completeRows / processedData.length) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {((missingDataStats.completeRows / processedData.length) * 100).toFixed(1)}% complete
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Affected Columns</p>
                <p className="text-2xl font-bold">
                  {missingDataStats.columnStats.filter((stat) => stat.missing > 0).length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
            <div className="mt-2">
              <Progress
                value={(missingDataStats.columnStats.filter((stat) => stat.missing > 0).length / columns.length) * 100}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(
                  (missingDataStats.columnStats.filter((stat) => stat.missing > 0).length / columns.length) *
                  100
                ).toFixed(1)}
                % of columns
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Missing Patterns</p>
                <p className="text-2xl font-bold">{missingDataStats.patterns.length}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                {missingDataStats.patterns.length > 0
                  ? `Most common: ${missingDataStats.patterns[0].percentage.toFixed(1)}%`
                  : "No patterns detected"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analysis Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Missing Data Analysis
              </CardTitle>
              <CardDescription>Comprehensive analysis of missing data patterns and distributions</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportMissingDataReport}>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedVisualization} onValueChange={setSelectedVisualization}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="columns">By Column</TabsTrigger>
              <TabsTrigger value="patterns">Patterns</TabsTrigger>
              <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
              <TabsTrigger value="correlations">Correlations</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Missing Data Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Missing Data by Row</CardTitle>
                    <CardDescription>Distribution of missing values across rows</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={missingByRowData.histogram}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="missingCount" />
                          <YAxis />
                          <Tooltip
                            formatter={(value, name) => [
                              `${value} rows (${missingByRowData.histogram.find((d) => d.rows === value)?.percentage.toFixed(1)}%)`,
                              "Count",
                            ]}
                            labelFormatter={(label) => `${label} missing columns`}
                          />
                          <Bar dataKey="rows" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Data Completeness Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Data Completeness</CardTitle>
                    <CardDescription>Overall data completeness visualization</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              {
                                name: "Complete",
                                value: missingDataStats.totalCells - missingDataStats.totalMissing,
                                fill: "#22c55e",
                              },
                              { name: "Missing", value: missingDataStats.totalMissing, fill: "#ef4444" },
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          />
                          <Tooltip formatter={(value) => [value.toLocaleString(), "Cells"]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Summary Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Summary Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{processedData.length.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Total Rows</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{columns.length}</div>
                      <div className="text-sm text-muted-foreground">Total Columns</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {missingDataStats.missingPercentage.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Missing Data</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{missingDataStats.patterns.length}</div>
                      <div className="text-sm text-muted-foreground">Unique Patterns</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="columns" className="space-y-4">
              {/* Column Filters */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Switch id="show-missing-only" checked={showOnlyMissing} onCheckedChange={setShowOnlyMissing} />
                  <Label htmlFor="show-missing-only">Show only columns with missing data</Label>
                </div>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex items-center space-x-2">
                  <Label>Minimum missing %:</Label>
                  <div className="w-32">
                    <Slider
                      value={missingThreshold}
                      onValueChange={setMissingThreshold}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">{missingThreshold[0]}%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Column Missing Data Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Missing Data by Column</CardTitle>
                    <CardDescription>Percentage of missing values per column</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={filteredColumnStats} layout="horizontal">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" domain={[0, 100]} />
                          <YAxis dataKey="column" type="category" width={100} />
                          <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, "Missing"]} />
                          <Bar dataKey="percentage">
                            {filteredColumnStats.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.percentage > 50 ? "#ef4444" : entry.percentage > 20 ? "#f59e0b" : "#22c55e"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Column Details Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Column Details</CardTitle>
                    <CardDescription>Detailed missing data statistics by column</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-80">
                      <div className="space-y-2">
                        {filteredColumnStats.map((stat) => (
                          <div key={stat.column} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="font-medium">{stat.column}</div>
                                <div className="text-sm text-muted-foreground">
                                  Type: {stat.type} • Missing: {stat.missing.toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge
                                variant={
                                  stat.percentage > 50 ? "destructive" : stat.percentage > 20 ? "secondary" : "default"
                                }
                              >
                                {stat.percentage.toFixed(1)}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="patterns" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Missing Data Patterns</CardTitle>
                  <CardDescription>Common patterns of missing data across columns</CardDescription>
                </CardHeader>
                <CardContent>
                  {missingDataStats.patterns.length > 0 ? (
                    <div className="space-y-4">
                      {/* Pattern Visualization */}
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={missingDataStats.patterns.slice(0, 10)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="pattern" angle={-45} textAnchor="end" height={100} interval={0} />
                            <YAxis />
                            <Tooltip
                              formatter={(value) => [`${value} rows`, "Count"]}
                              labelFormatter={(label) => `Pattern: ${label}`}
                            />
                            <Bar dataKey="count" fill="#8884d8" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Pattern Details */}
                      <div className="space-y-3">
                        <h4 className="font-medium">Pattern Details</h4>
                        {missingDataStats.patterns.slice(0, 5).map((pattern, index) => (
                          <div key={index} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline">Pattern #{index + 1}</Badge>
                              <div className="text-sm text-muted-foreground">
                                {pattern.count} rows ({pattern.percentage.toFixed(1)}%)
                              </div>
                            </div>
                            <div className="text-sm">
                              <strong>Affected columns:</strong> {pattern.columns.join(", ")}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">{pattern.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No missing data patterns detected</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="heatmap" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Missing Data Heatmap</CardTitle>
                  <CardDescription>
                    Visual representation of missing data patterns (sample of {Math.min(100, processedData.length)}{" "}
                    rows)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {heatmapData.length > 0 ? (
                    <div className="space-y-4">
                      {/* Heatmap Legend */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-green-500 rounded"></div>
                          <span>Present</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-red-500 rounded"></div>
                          <span>Missing</span>
                        </div>
                      </div>

                      {/* Simplified Heatmap using Scatter Plot */}
                      <div className="h-96 overflow-auto">
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="category" dataKey="column" angle={-45} textAnchor="end" height={100} />
                            <YAxis type="category" dataKey="rowIndex" domain={["dataMin", "dataMax"]} />
                            <Tooltip
                              formatter={(value, name, props) => [
                                value === 1 ? "Missing" : "Present",
                                `${props.payload.column} (Row ${props.payload.rowIndex})`,
                              ]}
                            />
                            <ZAxis range={[50, 50]} />
                            {columns.map((column, colIndex) => (
                              <Scatter
                                key={column}
                                name={column}
                                data={heatmapData.map((row) => ({
                                  column: colIndex,
                                  rowIndex: row.rowIndex,
                                  value: row[column],
                                  columnName: column,
                                }))}
                                fill={colIndex % 2 === 0 ? "#8884d8" : "#82ca9d"}
                              />
                            ))}
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Heatmap Summary */}
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Heatmap Interpretation</AlertTitle>
                        <AlertDescription>
                          Each point represents a data cell. Red points indicate missing values, while green points show
                          present values. Patterns in the visualization can help identify systematic missing data
                          issues.
                        </AlertDescription>
                      </Alert>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Grid className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No data available for heatmap visualization</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="correlations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Missing Data Correlations</CardTitle>
                  <CardDescription>Correlations between missing data patterns across columns</CardDescription>
                </CardHeader>
                <CardContent>
                  {missingDataStats.correlations.length > 0 ? (
                    <div className="space-y-4">
                      {/* Correlation Chart */}
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={missingDataStats.correlations}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="column1" angle={-45} textAnchor="end" height={100} />
                            <YAxis domain={[-1, 1]} />
                            <Tooltip
                              formatter={(value) => [Number(value).toFixed(3), "Correlation"]}
                              labelFormatter={(label, payload) =>
                                payload?.[0] ? `${payload[0].payload.column1} ↔ ${payload[0].payload.column2}` : label
                              }
                            />
                            <Bar dataKey="correlation">
                              {missingDataStats.correlations.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.correlation > 0 ? "#22c55e" : "#ef4444"} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Correlation Details */}
                      <div className="space-y-3">
                        <h4 className="font-medium">Correlation Details</h4>
                        {missingDataStats.correlations.map((corr, index) => (
                          <div key={index} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">
                                  {corr.column1} ↔ {corr.column2}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {corr.correlation > 0 ? "Positive" : "Negative"} correlation
                                </div>
                              </div>
                              <Badge variant={Math.abs(corr.correlation) > 0.5 ? "default" : "secondary"}>
                                {corr.correlation.toFixed(3)}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Correlation Interpretation</AlertTitle>
                        <AlertDescription>
                          Positive correlations indicate that missing values in one column tend to coincide with missing
                          values in another. Strong correlations (|r| &gt; 0.5) may suggest systematic data collection
                          issues.
                        </AlertDescription>
                      </Alert>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No significant correlations found between missing data patterns</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
