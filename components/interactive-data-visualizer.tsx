"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  PieChart,
  Pie,
  Legend,
} from "recharts"
import {
  BarChart3,
  ScatterChartIcon,
  PieChartIcon,
  TrendingUp,
  Activity,
  Download,
  Settings,
  Eye,
  Info,
  Zap,
} from "lucide-react"
import { useData } from "@/lib/data-context"

interface VisualizationConfig {
  type: string
  xAxis?: string
  yAxis?: string
  colorBy?: string
  sizeBy?: string
  aggregation?: string
  binCount?: number
  showMissing?: boolean
  filterMissing?: boolean
}

export function InteractiveDataVisualizer() {
  const { processedData, columns, columnTypes, isLoading } = useData()
  const [config, setConfig] = useState<VisualizationConfig>({
    type: "histogram",
    xAxis: "default", // Updated default value
    showMissing: true,
    filterMissing: false,
    binCount: 20,
    aggregation: "count",
  })

  // Get column types for filtering
  const numericColumns = useMemo(() => columns.filter((col) => columnTypes[col] === "number"), [columns, columnTypes])
  const categoricalColumns = useMemo(
    () => columns.filter((col) => columnTypes[col] === "string" || columnTypes[col] === "boolean"),
    [columns, columnTypes],
  )
  const allColumns = useMemo(() => columns, [columns])

  // Filter data based on missing value settings
  const filteredData = useMemo(() => {
    if (!config.filterMissing) return processedData

    return processedData.filter((row) => {
      const relevantColumns = [config.xAxis, config.yAxis, config.colorBy, config.sizeBy].filter(Boolean)
      return relevantColumns.every((col) => col && row[col] !== null && row[col] !== undefined && row[col] !== "")
    })
  }, [processedData, config])

  // Prepare data for different visualization types
  const visualizationData = useMemo(() => {
    if (!filteredData.length) return []

    switch (config.type) {
      case "histogram":
        return prepareHistogramData()
      case "boxplot":
        return prepareBoxPlotData()
      case "scatter":
        return prepareScatterData()
      case "bar":
        return prepareBarData()
      case "line":
        return prepareLineData()
      case "pie":
        return preparePieData()
      default:
        return []
    }
  }, [filteredData, config])

  function prepareHistogramData() {
    if (!config.xAxis || columnTypes[config.xAxis] !== "number") {
      return []
    }

    const values = filteredData
      .map((row) => {
        const value = Number(row[config.xAxis])
        return isNaN(value) ? null : value
      })
      .filter((val): val is number => val !== null)
      .sort((a, b) => a - b)

    if (values.length === 0) return []

    const min = Math.min(...values)
    const max = Math.max(...values)

    // Handle case where all values are the same
    if (min === max) {
      return [
        {
          bin: `${min.toFixed(2)}`,
          binIndex: 0,
          count: values.length,
          percentage: 100,
          midpoint: min,
        },
      ]
    }

    const binCount = Math.min(config.binCount || 20, values.length)
    const binWidth = (max - min) / binCount

    const bins = Array.from({ length: binCount }, (_, i) => ({
      binStart: min + i * binWidth,
      binEnd: min + (i + 1) * binWidth,
      count: 0,
      percentage: 0,
    }))

    values.forEach((value) => {
      const binIndex = Math.min(Math.floor((value - min) / binWidth), bins.length - 1)
      if (binIndex >= 0 && binIndex < bins.length) {
        bins[binIndex].count++
      }
    })

    bins.forEach((bin) => {
      bin.percentage = values.length > 0 ? (bin.count / values.length) * 100 : 0
    })

    return bins.map((bin, index) => ({
      bin: `${bin.binStart.toFixed(1)}-${bin.binEnd.toFixed(1)}`,
      binIndex: index,
      count: bin.count,
      percentage: bin.percentage,
      midpoint: (bin.binStart + bin.binEnd) / 2,
    }))
  }

  function prepareBoxPlotData() {
    if (!config.xAxis) return []

    if (columnTypes[config.xAxis] === "number") {
      // Single numeric column box plot
      const values = filteredData
        .map((row) => Number(row[config.xAxis]))
        .filter((val) => !isNaN(val))
        .sort((a, b) => a - b)

      if (values.length === 0) return []

      const q1 = values[Math.floor(values.length * 0.25)]
      const median = values[Math.floor(values.length * 0.5)]
      const q3 = values[Math.floor(values.length * 0.75)]
      const iqr = q3 - q1
      const min = Math.max(values[0], q1 - 1.5 * iqr)
      const max = Math.min(values[values.length - 1], q3 + 1.5 * iqr)

      const outliers = values.filter((val) => val < min || val > max)

      return [
        {
          category: config.xAxis,
          min,
          q1,
          median,
          q3,
          max,
          outliers,
          count: values.length,
        },
      ]
    } else if (config.yAxis && columnTypes[config.yAxis] === "number") {
      // Grouped box plot by category
      const groups = filteredData.reduce(
        (acc, row) => {
          const category = String(row[config.xAxis] || "Unknown")
          const value = Number(row[config.yAxis])

          if (!isNaN(value)) {
            if (!acc[category]) acc[category] = []
            acc[category].push(value)
          }
          return acc
        },
        {} as Record<string, number[]>,
      )

      return Object.entries(groups).map(([category, values]) => {
        values.sort((a, b) => a - b)
        const q1 = values[Math.floor(values.length * 0.25)]
        const median = values[Math.floor(values.length * 0.5)]
        const q3 = values[Math.floor(values.length * 0.75)]
        const iqr = q3 - q1
        const min = Math.max(values[0], q1 - 1.5 * iqr)
        const max = Math.min(values[values.length - 1], q3 + 1.5 * iqr)
        const outliers = values.filter((val) => val < min || val > max)

        return {
          category,
          min,
          q1,
          median,
          q3,
          max,
          outliers,
          count: values.length,
        }
      })
    }

    return []
  }

  function prepareScatterData() {
    if (!config.xAxis || !config.yAxis) return []
    if (columnTypes[config.xAxis] !== "number" || columnTypes[config.yAxis] !== "number") return []

    return filteredData
      .map((row, index) => {
        const x = Number(row[config.xAxis])
        const y = Number(row[config.yAxis])

        if (isNaN(x) || isNaN(y)) return null

        const size = config.sizeBy ? Math.max(1, Number(row[config.sizeBy]) || 1) : 4
        const color = config.colorBy ? String(row[config.colorBy] || "default") : "default"

        return {
          x,
          y,
          size: Math.min(size, 20), // Cap size for visual clarity
          color,
          index,
          [config.xAxis!]: x,
          [config.yAxis!]: y,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, 5000) // Limit points for performance
  }

  function prepareBarData() {
    if (!config.xAxis) return []

    if (columnTypes[config.xAxis] === "string" || columnTypes[config.xAxis] === "boolean") {
      // Categorical bar chart
      const counts = filteredData.reduce(
        (acc, row) => {
          const category = String(row[config.xAxis] || "Unknown")
          acc[category] = (acc[category] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      return Object.entries(counts)
        .map(([category, count]) => ({
          category,
          count,
          percentage: (count / filteredData.length) * 100,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20) // Limit to top 20 categories
    } else if (config.yAxis && columnTypes[config.yAxis] === "number") {
      // Aggregated bar chart
      const groups = filteredData.reduce(
        (acc, row) => {
          const category = String(row[config.xAxis] || "Unknown")
          const value = Number(row[config.yAxis])

          if (!isNaN(value)) {
            if (!acc[category]) acc[category] = []
            acc[category].push(value)
          }
          return acc
        },
        {} as Record<string, number[]>,
      )

      return Object.entries(groups).map(([category, values]) => {
        let aggregatedValue = 0
        switch (config.aggregation) {
          case "sum":
            aggregatedValue = values.reduce((sum, val) => sum + val, 0)
            break
          case "mean":
            aggregatedValue = values.reduce((sum, val) => sum + val, 0) / values.length
            break
          case "median":
            values.sort((a, b) => a - b)
            aggregatedValue = values[Math.floor(values.length / 2)]
            break
          case "count":
          default:
            aggregatedValue = values.length
            break
        }

        return {
          category,
          value: aggregatedValue,
          count: values.length,
        }
      })
    }

    return []
  }

  function prepareLineData() {
    if (!config.xAxis || !config.yAxis) return []

    // Sort by x-axis for line chart
    return filteredData
      .map((row) => ({
        x: row[config.xAxis],
        y: Number(row[config.yAxis]),
        category: config.colorBy ? String(row[config.colorBy]) : "default",
      }))
      .filter((item) => !isNaN(item.y))
      .sort((a, b) => {
        if (columnTypes[config.xAxis!] === "number") {
          return Number(a.x) - Number(b.x)
        }
        return String(a.x).localeCompare(String(b.x))
      })
  }

  function preparePieData() {
    if (!config.xAxis) return []

    const counts = filteredData.reduce(
      (acc, row) => {
        const category = String(row[config.xAxis] || "Unknown")
        acc[category] = (acc[category] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(counts)
      .map(([name, value]) => ({
        name,
        value,
        percentage: (value / filteredData.length) * 100,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10) // Limit to top 10 for readability
  }

  const exportVisualization = () => {
    const exportData = {
      config,
      data: visualizationData,
      metadata: {
        totalRows: filteredData.length,
        originalRows: processedData.length,
        columns: columns.length,
        exportedAt: new Date().toISOString(),
      },
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `visualization_${config.type}_${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Interactive Data Visualizer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading visualization tools...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!processedData.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Interactive Data Visualizer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No data available for visualization</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Visualization Configuration
              </CardTitle>
              <CardDescription>Configure your interactive data visualization</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportVisualization}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Visualization Type */}
            <div className="space-y-2">
              <Label>Visualization Type</Label>
              <Select value={config.type} onValueChange={(value) => setConfig({ ...config, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="histogram">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Histogram
                    </div>
                  </SelectItem>
                  <SelectItem value="boxplot">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Box Plot
                    </div>
                  </SelectItem>
                  <SelectItem value="scatter">
                    <div className="flex items-center gap-2">
                      <ScatterChartIcon className="h-4 w-4" />
                      Scatter Plot
                    </div>
                  </SelectItem>
                  <SelectItem value="bar">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Bar Chart
                    </div>
                  </SelectItem>
                  <SelectItem value="line">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Line Chart
                    </div>
                  </SelectItem>
                  <SelectItem value="pie">
                    <div className="flex items-center gap-2">
                      <PieChartIcon className="h-4 w-4" />
                      Pie Chart
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* X-Axis */}
            <div className="space-y-2">
              <Label>X-Axis</Label>
              <Select
                value={config.xAxis || "default"}
                onValueChange={(value) => setConfig({ ...config, xAxis: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {allColumns.map((col) => (
                    <SelectItem key={col} value={col}>
                      <div className="flex items-center justify-between w-full">
                        <span>{col}</span>
                        <Badge variant="outline" className="ml-2">
                          {columnTypes[col]}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Y-Axis */}
            {(config.type === "scatter" ||
              config.type === "line" ||
              config.type === "boxplot" ||
              config.type === "bar") && (
              <div className="space-y-2">
                <Label>Y-Axis</Label>
                <Select
                  value={config.yAxis || "default"}
                  onValueChange={(value) => setConfig({ ...config, yAxis: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {(config.type === "scatter" || config.type === "line" ? numericColumns : allColumns).map((col) => (
                      <SelectItem key={col} value={col}>
                        <div className="flex items-center justify-between w-full">
                          <span>{col}</span>
                          <Badge variant="outline" className="ml-2">
                            {columnTypes[col]}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Color By */}
            {(config.type === "scatter" || config.type === "line") && (
              <div className="space-y-2">
                <Label>Color By (Optional)</Label>
                <Select
                  value={config.colorBy || "default"}
                  onValueChange={(value) => setConfig({ ...config, colorBy: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">None</SelectItem>
                    {categoricalColumns.map((col) => (
                      <SelectItem key={col} value={col}>
                        <div className="flex items-center justify-between w-full">
                          <span>{col}</span>
                          <Badge variant="outline" className="ml-2">
                            {columnTypes[col]}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Additional Options */}
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="filter-missing"
                  checked={config.filterMissing}
                  onCheckedChange={(checked) => setConfig({ ...config, filterMissing: checked })}
                />
                <Label htmlFor="filter-missing">Filter out missing values</Label>
              </div>

              {config.type === "histogram" && (
                <div className="flex items-center space-x-2">
                  <Label>Bins:</Label>
                  <div className="w-32">
                    <Slider
                      value={[config.binCount || 20]}
                      onValueChange={([value]) => setConfig({ ...config, binCount: value })}
                      min={5}
                      max={50}
                      step={1}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">{config.binCount || 20}</span>
                </div>
              )}

              {config.type === "bar" && config.yAxis && (
                <div className="flex items-center space-x-2">
                  <Label>Aggregation:</Label>
                  <Select
                    value={config.aggregation || "count"}
                    onValueChange={(value) => setConfig({ ...config, aggregation: value })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="count">Count</SelectItem>
                      <SelectItem value="sum">Sum</SelectItem>
                      <SelectItem value="mean">Mean</SelectItem>
                      <SelectItem value="median">Median</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {config.type.charAt(0).toUpperCase() + config.type.slice(1)} Visualization
          </CardTitle>
          <CardDescription>
            {filteredData.length !== processedData.length && (
              <span className="text-orange-600">
                Showing {filteredData.length} of {processedData.length} rows (filtered)
              </span>
            )}
            {filteredData.length === processedData.length && <span>Showing all {processedData.length} rows</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {visualizationData.length > 0 ? (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                {config.type === "histogram" && config.xAxis && columnTypes[config.xAxis] === "number" && (
                  <BarChart data={visualizationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bin" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name) => [
                        name === "count" ? `${value} observations` : `${Number(value).toFixed(1)}%`,
                        name === "count" ? "Count" : "Percentage",
                      ]}
                      labelFormatter={(label) => `Range: ${label}`}
                    />
                    <Bar dataKey="count" fill="#8884d8" radius={[2, 2, 0, 0]} />
                  </BarChart>
                )}

                {config.type === "scatter" &&
                  config.xAxis &&
                  config.yAxis &&
                  columnTypes[config.xAxis] === "number" &&
                  columnTypes[config.yAxis] === "number" && (
                    <ScatterChart data={visualizationData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="x" name={config.xAxis} type="number" domain={["dataMin", "dataMax"]} />
                      <YAxis dataKey="y" name={config.yAxis} type="number" domain={["dataMin", "dataMax"]} />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        formatter={(value, name) => [Number(value).toFixed(2), name]}
                      />
                      <Scatter name="Data Points" data={visualizationData} fill="#8884d8" />
                    </ScatterChart>
                  )}

                {config.type === "bar" && config.xAxis && (
                  <BarChart data={visualizationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="category"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fontSize: 11 }}
                      interval={0}
                    />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [Number(value).toLocaleString(), name]} />
                    <Bar dataKey={config.yAxis ? "value" : "count"} fill="#8884d8" radius={[2, 2, 0, 0]} />
                  </BarChart>
                )}

                {config.type === "line" && config.xAxis && config.yAxis && (
                  <LineChart data={visualizationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="x" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [Number(value).toFixed(2), name]} />
                    <Line
                      type="monotone"
                      dataKey="y"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                )}

                {config.type === "pie" && config.xAxis && (
                  <PieChart>
                    <Pie
                      data={visualizationData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => (percentage > 3 ? `${name}: ${percentage.toFixed(1)}%` : "")}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {visualizationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${index * 36}, 70%, 60%)`} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [Number(value).toLocaleString(), name]} />
                    <Legend />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Configure the visualization settings to generate a chart</p>
              {!config.xAxis && <p className="text-sm text-muted-foreground mt-2">Select an X-axis column to begin</p>}
              {config.xAxis && config.type === "scatter" && !config.yAxis && (
                <p className="text-sm text-muted-foreground mt-2">Select a Y-axis column for scatter plot</p>
              )}
              {config.xAxis && config.type === "histogram" && columnTypes[config.xAxis] !== "number" && (
                <p className="text-sm text-orange-600 mt-2">Histogram requires a numeric column</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Summary */}
      {visualizationData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Visualization Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold">{visualizationData.length}</div>
                <div className="text-sm text-muted-foreground">Data Points</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold">{config.xAxis || "N/A"}</div>
                <div className="text-sm text-muted-foreground">X-Axis</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold">{config.yAxis || "N/A"}</div>
                <div className="text-sm text-muted-foreground">Y-Axis</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold">{config.type}</div>
                <div className="text-sm text-muted-foreground">Chart Type</div>
              </div>
            </div>

            {config.filterMissing && (
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Missing values have been filtered out. Original dataset had {processedData.length} rows, showing{" "}
                  {filteredData.length} rows after filtering.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
