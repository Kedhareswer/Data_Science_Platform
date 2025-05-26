"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Treemap,
  ComposedChart,
  Funnel,
  FunnelChart,
  LabelList,
  ZAxis,
  Rectangle,
  ReferenceLine,
  Brush,
  Label,
} from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label as UILabel } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  BarChart3,
  LineChartIcon,
  PieChartIcon,
  ScatterChartIcon as ScatterChart2,
  AreaChartIcon,
  Download,
  Settings,
  RadarIcon,
  LayoutGrid,
  GitMerge,
  Filter,
  Grid,
  Circle,
  AlertCircle,
  Info,
  HelpCircle,
  RefreshCw,
  Palette,
  Eye,
  EyeOff,
  Wand2,
  Database,
  TrendingUp,
  Activity,
  FileText,
  BarChart4,
  Hash,
  Calendar,
  Type,
  AlertTriangle,
  CheckCircle,
  Zap,
} from "lucide-react"
import { useData } from "@/lib/data-context"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import React from "react"

// Color palettes
const COLOR_PALETTES = {
  default: ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE", "#00C49F", "#FFBB28", "#FF8042"],
  pastel: ["#a1c9f4", "#ffb482", "#8de5a1", "#ff9f9b", "#d0bbff", "#debb9b", "#cfcfcf", "#fffea3"],
  vibrant: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f"],
  monochrome: ["#0000FF", "#4D4DFF", "#7373FF", "#9999FF", "#BFBFFF", "#E5E5FF"],
  rainbow: ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#4B0082", "#9400D3"],
  categorical: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#ffff33", "#a65628", "#f781bf"],
}

// Chart type definitions with metadata
const CHART_TYPES = {
  bar: {
    name: "Bar Chart",
    icon: <BarChart3 className="h-4 w-4" />,
    description: "Compare values across categories",
    recommendedFor: ["categorical-numerical", "date-numerical"],
    supportsStacking: true,
  },
  line: {
    name: "Line Chart",
    icon: <LineChartIcon className="h-4 w-4" />,
    description: "Show trends over time or ordered categories",
    recommendedFor: ["date-numerical", "numerical-numerical", "categorical-numerical"],
    supportsMultipleSeries: true,
  },
  area: {
    name: "Area Chart",
    icon: <AreaChartIcon className="h-4 w-4" />,
    description: "Emphasize volume under a line",
    recommendedFor: ["date-numerical", "numerical-numerical", "categorical-numerical"],
    supportsStacking: true,
  },
  pie: {
    name: "Pie Chart",
    icon: <PieChartIcon className="h-4 w-4" />,
    description: "Show proportions of a whole",
    recommendedFor: ["categorical-numerical"],
    maxCategories: 10,
  },
  scatter: {
    name: "Scatter Plot",
    icon: <ScatterChart2 className="h-4 w-4" />,
    description: "Show relationship between two numerical variables",
    recommendedFor: ["numerical-numerical"],
  },
  bubble: {
    name: "Bubble Chart",
    icon: <Circle className="h-4 w-4" />,
    description: "Like scatter plot with a third dimension (size)",
    recommendedFor: ["numerical-numerical-numerical"],
  },
  radar: {
    name: "Radar Chart",
    icon: <RadarIcon className="h-4 w-4" />,
    description: "Compare multiple variables in a radial layout",
    recommendedFor: ["categorical-numerical-multiple"],
  },
  treemap: {
    name: "Treemap",
    icon: <LayoutGrid className="h-4 w-4" />,
    description: "Show hierarchical data as nested rectangles",
    recommendedFor: ["categorical-numerical"],
  },
  composed: {
    name: "Composed Chart",
    icon: <GitMerge className="h-4 w-4" />,
    description: "Combine different chart types",
    recommendedFor: ["categorical-numerical-multiple", "date-numerical-multiple"],
  },
  funnel: {
    name: "Funnel Chart",
    icon: <Filter className="h-4 w-4" />,
    description: "Show values through stages of a process",
    recommendedFor: ["categorical-numerical"],
    maxCategories: 10,
  },
  heatmap: {
    name: "Heatmap",
    icon: <Grid className="h-4 w-4" />,
    description: "Show data intensity across two categorical dimensions",
    recommendedFor: ["categorical-categorical-numerical"],
  },
}

// Data profiling interfaces
interface ColumnProfile {
  name: string
  type: "string" | "number" | "date" | "boolean"
  count: number
  missing: number
  missingPercentage: number
  unique: number
  uniquePercentage: number
  // Numeric statistics
  mean?: number
  median?: number
  mode?: any
  std?: number
  min?: number
  max?: number
  q1?: number
  q3?: number
  // String statistics
  avgLength?: number
  minLength?: number
  maxLength?: number
  // Top values
  topValues?: Array<{ value: any; count: number; percentage: number }>
  // Quality indicators
  hasOutliers?: boolean
  outlierCount?: number
  dataQuality?: "excellent" | "good" | "fair" | "poor"
}

interface DatasetProfile {
  totalRows: number
  totalColumns: number
  memoryUsage: string
  completeness: number
  duplicateRows: number
  columns: Record<string, ColumnProfile>
  correlations?: Record<string, Record<string, number>>
  generatedAt: Date
}

// Add a simple error boundary component to catch rendering errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, errorMessage: "" }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error.message || "Error rendering chart" }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Chart rendering error:", error, errorInfo)
    if (this.props.onError) {
      this.props.onError(error)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center border border-red-200 rounded-md bg-red-50">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <h3 className="text-lg font-medium text-red-800">Chart Rendering Error</h3>
          <p className="mt-2 text-red-600">
            {this.state.errorMessage ||
              "There was an error rendering this chart. Try selecting different data or chart type."}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => this.setState({ hasError: false, errorMessage: "" })}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

// Helper function to determine if a column is compatible with a chart type
function isColumnCompatible(columnType, requiredType) {
  if (requiredType === "numerical" && columnType === "number") return true
  if (requiredType === "categorical" && (columnType === "string" || columnType === "boolean")) return true
  if (requiredType === "date" && columnType === "date") return true
  return false
}

// Helper function to suggest chart types based on selected columns
function suggestChartTypes(xAxisType, yAxisType, additionalColumns = []) {
  const dataPattern = `${xAxisType}-${yAxisType}${additionalColumns.length > 0 ? "-multiple" : ""}`

  return Object.entries(CHART_TYPES)
    .filter(([_, chartInfo]) => chartInfo.recommendedFor.includes(dataPattern))
    .map(([chartType, _]) => chartType)
}

// Data Profiling Component
function DataProfilingPanel({ profile, isLoading, onRefresh }) {
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    columns: true,
    quality: false,
  })

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const getColumnIcon = (type: string) => {
    switch (type) {
      case "number":
        return <Hash className="h-4 w-4 text-blue-500" />
      case "string":
        return <Type className="h-4 w-4 text-green-500" />
      case "date":
        return <Calendar className="h-4 w-4 text-purple-500" />
      case "boolean":
        return <CheckCircle className="h-4 w-4 text-orange-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case "excellent":
        return "text-green-600 bg-green-50 border-green-200"
      case "good":
        return "text-blue-600 bg-blue-50 border-blue-200"
      case "fair":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "poor":
        return "text-red-600 bg-red-50 border-red-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const formatNumber = (num: number | undefined): string => {
    if (num === undefined || num === null) return "N/A"
    if (Number.isInteger(num)) return num.toLocaleString()
    return num.toLocaleString(undefined, { maximumFractionDigits: 3 })
  }

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Profiling
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Analyzing dataset...</span>
            </div>
            <Progress value={undefined} className="h-2" />
            <div className="text-sm text-muted-foreground">Generating statistical insights</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!profile) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Profiling
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Load a dataset to see profiling insights</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Profile
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>Generated on {profile.generatedAt.toLocaleString()}</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-6">
            {/* Dataset Overview */}
            <div className="space-y-3">
              <Button
                variant="ghost"
                className="w-full justify-between p-0 h-auto"
                onClick={() => toggleSection("overview")}
              >
                <h3 className="font-semibold flex items-center gap-2">
                  <BarChart4 className="h-4 w-4" />
                  Dataset Overview
                </h3>
                <span className="text-xs">{expandedSections.overview ? "−" : "+"}</span>
              </Button>

              {expandedSections.overview && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">{profile.totalRows.toLocaleString()}</div>
                    <div className="text-xs text-blue-700">Rows</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-lg font-bold text-green-600">{profile.totalColumns}</div>
                    <div className="text-xs text-green-700">Columns</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">{profile.completeness.toFixed(1)}%</div>
                    <div className="text-xs text-purple-700">Complete</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="text-lg font-bold text-orange-600">{profile.memoryUsage}</div>
                    <div className="text-xs text-orange-700">Memory</div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Column Analysis */}
            <div className="space-y-3">
              <Button
                variant="ghost"
                className="w-full justify-between p-0 h-auto"
                onClick={() => toggleSection("columns")}
              >
                <h3 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Column Analysis
                </h3>
                <span className="text-xs">{expandedSections.columns ? "−" : "+"}</span>
              </Button>

              {expandedSections.columns && (
                <div className="space-y-2">
                  {Object.values(profile.columns).map((column) => (
                    <div
                      key={column.name}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedColumn === column.name ? "bg-primary/10 border-primary" : "bg-muted/50 hover:bg-muted"
                      }`}
                      onClick={() => setSelectedColumn(selectedColumn === column.name ? null : column.name)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getColumnIcon(column.type)}
                          <span className="font-medium text-sm">{column.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {column.type}
                          </Badge>
                          {column.missingPercentage > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {column.missingPercentage.toFixed(1)}% missing
                            </Badge>
                          )}
                        </div>
                      </div>

                      {selectedColumn === column.name && (
                        <div className="mt-3 space-y-3 border-t pt-3">
                          {/* Basic Stats */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Count:</span>{" "}
                              <span className="font-medium">{column.count.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Unique:</span>{" "}
                              <span className="font-medium">{column.unique.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Missing:</span>{" "}
                              <span className="font-medium">{column.missing.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Uniqueness:</span>{" "}
                              <span className="font-medium">{column.uniquePercentage.toFixed(1)}%</span>
                            </div>
                          </div>

                          {/* Type-specific stats */}
                          {column.type === "number" && (
                            <div className="space-y-2">
                              <div className="text-xs font-medium text-muted-foreground">Numerical Statistics</div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Mean:</span>{" "}
                                  <span className="font-medium">{formatNumber(column.mean)}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Median:</span>{" "}
                                  <span className="font-medium">{formatNumber(column.median)}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Std Dev:</span>{" "}
                                  <span className="font-medium">{formatNumber(column.std)}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Range:</span>{" "}
                                  <span className="font-medium">
                                    {formatNumber(column.min)} - {formatNumber(column.max)}
                                  </span>
                                </div>
                              </div>
                              {column.hasOutliers && (
                                <Alert className="py-2">
                                  <AlertTriangle className="h-3 w-3" />
                                  <AlertDescription className="text-xs">
                                    {column.outlierCount} outliers detected
                                  </AlertDescription>
                                </Alert>
                              )}
                            </div>
                          )}

                          {column.type === "string" && (
                            <div className="space-y-2">
                              <div className="text-xs font-medium text-muted-foreground">String Statistics</div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Avg Length:</span>{" "}
                                  <span className="font-medium">{formatNumber(column.avgLength)}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Length Range:</span>{" "}
                                  <span className="font-medium">
                                    {column.minLength} - {column.maxLength}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Top values */}
                          {column.topValues && column.topValues.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs font-medium text-muted-foreground">Top Values</div>
                              <div className="space-y-1">
                                {column.topValues.slice(0, 3).map((item, index) => (
                                  <div key={index} className="flex justify-between text-xs">
                                    <span className="truncate max-w-20" title={String(item.value)}>
                                      {String(item.value)}
                                    </span>
                                    <span className="text-muted-foreground">{item.percentage.toFixed(1)}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Data Quality */}
                          {column.dataQuality && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Quality:</span>
                              <Badge className={`text-xs ${getQualityColor(column.dataQuality)}`}>
                                {column.dataQuality}
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Data Quality Summary */}
            <div className="space-y-3">
              <Button
                variant="ghost"
                className="w-full justify-between p-0 h-auto"
                onClick={() => toggleSection("quality")}
              >
                <h3 className="font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Quality Summary
                </h3>
                <span className="text-xs">{expandedSections.quality ? "−" : "+"}</span>
              </Button>

              {expandedSections.quality && (
                <div className="space-y-3">
                  {/* Overall completeness */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Data Completeness</span>
                      <span className="font-medium">{profile.completeness.toFixed(1)}%</span>
                    </div>
                    <Progress value={profile.completeness} className="h-2" />
                  </div>

                  {/* Quality indicators */}
                  <div className="grid grid-cols-1 gap-2">
                    {profile.duplicateRows > 0 && (
                      <Alert className="py-2">
                        <AlertTriangle className="h-3 w-3" />
                        <AlertDescription className="text-xs">
                          {profile.duplicateRows} duplicate rows found (
                          {((profile.duplicateRows / profile.totalRows) * 100).toFixed(1)}%)
                        </AlertDescription>
                      </Alert>
                    )}

                    {Object.values(profile.columns).some((col) => col.hasOutliers) && (
                      <Alert className="py-2">
                        <Info className="h-3 w-3" />
                        <AlertDescription className="text-xs">
                          Outliers detected in {Object.values(profile.columns).filter((col) => col.hasOutliers).length}{" "}
                          columns
                        </AlertDescription>
                      </Alert>
                    )}

                    {Object.values(profile.columns).some((col) => col.missingPercentage > 20) && (
                      <Alert className="py-2">
                        <AlertTriangle className="h-3 w-3" />
                        <AlertDescription className="text-xs">
                          High missing values in{" "}
                          {Object.values(profile.columns).filter((col) => col.missingPercentage > 20).length} columns
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  {/* Column type distribution */}
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Column Types</div>
                    {Object.entries(
                      Object.values(profile.columns).reduce(
                        (acc, col) => {
                          acc[col.type] = (acc[col.type] || 0) + 1
                          return acc
                        },
                        {} as Record<string, number>,
                      ),
                    ).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {getColumnIcon(type)}
                          <span className="capitalize">{type}</span>
                        </div>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// Add more chart types and customization options
export function DataVisualizer() {
  // Keep existing state variables
  const { processedData, columns, columnTypes } = useData()
  const chartRef = useRef(null)

  const [chartType, setChartType] = useState("bar")
  const [xAxis, setXAxis] = useState("")
  const [yAxis, setYAxis] = useState("")
  const [secondYAxis, setSecondYAxis] = useState("")
  const [colorPalette, setColorPalette] = useState("default")
  const [showGrid, setShowGrid] = useState(true)
  const [showLegend, setShowLegend] = useState(true)
  const [chartTitle, setChartTitle] = useState("")
  const [xAxisLabel, setXAxisLabel] = useState("")
  const [yAxisLabel, setYAxisLabel] = useState("")
  const [pieChartInnerRadius, setPieChartInnerRadius] = useState(0)
  const [stackedChart, setStackedChart] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [treemapDataKey, setTreemapDataKey] = useState("")

  // Add new state variables for enhanced customization
  const [bubbleSize, setBubbleSize] = useState("")
  const [showDataLabels, setShowDataLabels] = useState(false)
  const [sortData, setSortData] = useState(false)
  const [maxItems, setMaxItems] = useState(50)
  const [dataPercentage, setDataPercentage] = useState(100)
  const [showBrush, setShowBrush] = useState(false)
  const [showReferenceLines, setShowReferenceLines] = useState(false)
  const [referenceLine, setReferenceLine] = useState(0)
  const [chartOrientation, setChartOrientation] = useState("vertical")
  const [smoothCurve, setSmoothCurve] = useState(false)
  const [heatmapValue, setHeatmapValue] = useState("")
  const [heatmapRows, setHeatmapRows] = useState("")
  const [heatmapCols, setHeatmapCols] = useState("")
  const [animation, setAnimation] = useState(true)

  // UI state
  const [activeTab, setActiveTab] = useState("data")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showChartSuggestions, setShowChartSuggestions] = useState(false)
  const [autoUpdatePreview, setAutoUpdatePreview] = useState(true)
  const [needsUpdate, setNeedsUpdate] = useState(false)

  // Data profiling state
  const [dataProfile, setDataProfile] = useState<DatasetProfile | null>(null)
  const [isProfilingLoading, setIsProfilingLoading] = useState(false)
  const [showProfilingPanel, setShowProfilingPanel] = useState(false)

  // Get column types
  const numericColumns = useMemo(() => columns.filter((col) => columnTypes[col] === "number"), [columns, columnTypes])

  const categoricalColumns = useMemo(
    () => columns.filter((col) => columnTypes[col] === "string" || columnTypes[col] === "boolean"),
    [columns, columnTypes],
  )

  const dateColumns = useMemo(() => columns.filter((col) => columnTypes[col] === "date"), [columns, columnTypes])

  // Suggested chart types based on selected columns
  const suggestedCharts = useMemo(() => {
    if (!xAxis || !yAxis) return []

    const xAxisType =
      columnTypes[xAxis] === "number" ? "numerical" : columnTypes[xAxis] === "date" ? "date" : "categorical"

    const yAxisType =
      columnTypes[yAxis] === "number" ? "numerical" : columnTypes[yAxis] === "date" ? "date" : "categorical"

    const additionalColumns = [secondYAxis, bubbleSize, heatmapValue].filter(
      (col) => col && col !== xAxis && col !== yAxis,
    )

    return suggestChartTypes(xAxisType, yAxisType, additionalColumns)
  }, [xAxis, yAxis, secondYAxis, bubbleSize, heatmapValue, columnTypes])

  // Generate data profile
  const generateDataProfile = async () => {
    if (!processedData.length || !columns.length) return

    setIsProfilingLoading(true)
    try {
      // Use setTimeout to prevent blocking the UI
      await new Promise((resolve) => setTimeout(resolve, 100))

      const profile: DatasetProfile = {
        totalRows: processedData.length,
        totalColumns: columns.length,
        memoryUsage: `${((JSON.stringify(processedData).length / 1024 / 1024) * 2).toFixed(2)} MB`,
        completeness: 0,
        duplicateRows: 0,
        columns: {},
        generatedAt: new Date(),
      }

      // Calculate overall completeness and duplicates
      let totalCells = 0
      let filledCells = 0
      const uniqueRows = new Set()

      processedData.forEach((row) => {
        uniqueRows.add(JSON.stringify(row))
        columns.forEach((col) => {
          totalCells++
          if (row[col] !== null && row[col] !== undefined && row[col] !== "") {
            filledCells++
          }
        })
      })

      profile.completeness = totalCells > 0 ? (filledCells / totalCells) * 100 : 0
      profile.duplicateRows = processedData.length - uniqueRows.size

      // Analyze each column
      for (const column of columns) {
        const columnProfile = await analyzeColumn(column, processedData, columnTypes[column])
        profile.columns[column] = columnProfile
      }

      // Calculate correlations for numeric columns (sample for performance)
      if (numericColumns.length > 1 && processedData.length > 0) {
        profile.correlations = calculateCorrelations(numericColumns, processedData)
      }

      setDataProfile(profile)
    } catch (err) {
      console.error("Error generating data profile:", err)
    } finally {
      setIsProfilingLoading(false)
    }
  }

  // Analyze individual column
  const analyzeColumn = async (columnName: string, data: any[], type: string): Promise<ColumnProfile> => {
    const values = data.map((row) => row[columnName])
    const nonNullValues = values.filter((v) => v !== null && v !== undefined && v !== "")

    const profile: ColumnProfile = {
      name: columnName,
      type: type as any,
      count: values.length,
      missing: values.length - nonNullValues.length,
      missingPercentage: ((values.length - nonNullValues.length) / values.length) * 100,
      unique: new Set(nonNullValues).size,
      uniquePercentage: (new Set(nonNullValues).size / nonNullValues.length) * 100,
      topValues: getTopValues(nonNullValues),
    }

    // Type-specific analysis
    if (type === "number" && nonNullValues.length > 0) {
      const numericValues = nonNullValues.map((v) => Number(v)).filter((v) => !isNaN(v))
      if (numericValues.length > 0) {
        const sorted = [...numericValues].sort((a, b) => a - b)
        const mean = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length

        profile.mean = mean
        profile.median = getMedian(sorted)
        profile.std = Math.sqrt(
          numericValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / numericValues.length,
        )
        profile.min = Math.min(...numericValues)
        profile.max = Math.max(...numericValues)
        profile.q1 = getPercentile(sorted, 25)
        profile.q3 = getPercentile(sorted, 75)

        // Detect outliers using IQR method
        const iqr = profile.q3! - profile.q1!
        const lowerBound = profile.q1! - 1.5 * iqr
        const upperBound = profile.q3! + 1.5 * iqr
        const outliers = numericValues.filter((val) => val < lowerBound || val > upperBound)

        profile.hasOutliers = outliers.length > 0
        profile.outlierCount = outliers.length
      }
    } else if (type === "string" && nonNullValues.length > 0) {
      const stringValues = nonNullValues.map((v) => String(v))
      profile.avgLength = stringValues.reduce((sum, val) => sum + val.length, 0) / stringValues.length
      profile.minLength = Math.min(...stringValues.map((v) => v.length))
      profile.maxLength = Math.max(...stringValues.map((v) => v.length))
    }

    // Calculate mode
    profile.mode = getMode(nonNullValues)

    // Assess data quality
    profile.dataQuality = assessDataQuality(profile)

    return profile
  }

  // Helper functions for statistical calculations
  const getMedian = (sortedArray: number[]): number => {
    const mid = Math.floor(sortedArray.length / 2)
    return sortedArray.length % 2 === 0 ? (sortedArray[mid - 1] + sortedArray[mid]) / 2 : sortedArray[mid]
  }

  const getPercentile = (sortedArray: number[], percentile: number): number => {
    const index = (percentile / 100) * (sortedArray.length - 1)
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    const weight = index % 1

    if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1]
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight
  }

  const getMode = (values: any[]): any => {
    const counts = values.reduce(
      (acc, val) => {
        acc[val] = (acc[val] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    let maxCount = 0
    let mode = null

    for (const [val, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count
        mode = val
      }
    }

    return mode
  }

  const getTopValues = (values: any[]): Array<{ value: any; count: number; percentage: number }> => {
    const counts = values.reduce(
      (acc, val) => {
        acc[val] = (acc[val] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([value, count]) => ({
        value,
        count,
        percentage: (count / values.length) * 100,
      }))
  }

  const calculateCorrelations = (numericCols: string[], data: any[]): Record<string, Record<string, number>> => {
    const correlations: Record<string, Record<string, number>> = {}

    // Sample data for performance if dataset is large
    const sampleSize = Math.min(1000, data.length)
    const sampleData = data.slice(0, sampleSize)

    numericCols.forEach((col1) => {
      correlations[col1] = {}
      numericCols.forEach((col2) => {
        if (col1 === col2) {
          correlations[col1][col2] = 1
        } else {
          const values1 = sampleData.map((row) => Number(row[col1])).filter((v) => !isNaN(v))
          const values2 = sampleData.map((row) => Number(row[col2])).filter((v) => !isNaN(v))

          if (values1.length === values2.length && values1.length > 1) {
            correlations[col1][col2] = calculatePearsonCorrelation(values1, values2)
          } else {
            correlations[col1][col2] = 0
          }
        }
      })
    })

    return correlations
  }

  const calculatePearsonCorrelation = (x: number[], y: number[]): number => {
    const n = x.length
    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = y.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0)
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0)

    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

    if (denominator === 0) return 0
    return numerator / denominator
  }

  const assessDataQuality = (profile: ColumnProfile): "excellent" | "good" | "fair" | "poor" => {
    let score = 100

    // Penalize for missing values
    score -= profile.missingPercentage * 0.5

    // Penalize for low uniqueness in non-categorical data
    if (profile.type === "number" && profile.uniquePercentage < 10) {
      score -= 20
    }

    // Penalize for outliers
    if (profile.hasOutliers && profile.outlierCount! > profile.count * 0.1) {
      score -= 15
    }

    if (score >= 90) return "excellent"
    if (score >= 75) return "good"
    if (score >= 60) return "fair"
    return "poor"
  }

  // Auto-generate profile when data changes
  useEffect(() => {
    if (processedData.length > 0 && columns.length > 0) {
      generateDataProfile()
    }
  }, [processedData, columns])

  // Set default axes when columns change
  useEffect(() => {
    if (columns.length > 0 && (!xAxis || !yAxis)) {
      // Set default X-axis
      if (categoricalColumns.length > 0 && !xAxis) {
        setXAxis(categoricalColumns[0])
      } else if (dateColumns.length > 0 && !xAxis) {
        setXAxis(dateColumns[0])
      } else if (numericColumns.length > 0 && !xAxis) {
        setXAxis(numericColumns[0])
      }

      // Set default Y-axis
      if (numericColumns.length > 0 && !yAxis) {
        setYAxis(numericColumns[0])
        if (numericColumns.length > 1) {
          setSecondYAxis(numericColumns[1])
        }
      }

      // Set other defaults
      if (numericColumns.length > 0) {
        if (!treemapDataKey) setTreemapDataKey(numericColumns[0])
        if (!bubbleSize) setBubbleSize(numericColumns[0])
        if (!heatmapValue) setHeatmapValue(numericColumns[0])
      }

      if (categoricalColumns.length > 0) {
        if (!heatmapRows) setHeatmapRows(categoricalColumns[0])
        if (!heatmapCols && categoricalColumns.length > 1) {
          setHeatmapCols(categoricalColumns[1])
        } else if (!heatmapCols) {
          setHeatmapCols(categoricalColumns[0])
        }
      }
    }
  }, [
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
    xAxis,
    yAxis,
    treemapDataKey,
    bubbleSize,
    heatmapValue,
    heatmapRows,
    heatmapCols,
  ])

  // Auto-suggest chart type when columns change
  useEffect(() => {
    if (suggestedCharts.length > 0 && !suggestedCharts.includes(chartType)) {
      setShowChartSuggestions(true)
    }
  }, [suggestedCharts, chartType])

  // Mark chart as needing update when settings change
  useEffect(() => {
    if (!autoUpdatePreview) {
      setNeedsUpdate(true)
    }
  }, [
    xAxis,
    yAxis,
    secondYAxis,
    chartType,
    colorPalette,
    stackedChart,
    selectedCategories,
    treemapDataKey,
    bubbleSize,
    sortData,
    maxItems,
    chartOrientation,
    smoothCurve,
    heatmapValue,
    heatmapRows,
    heatmapCols,
    autoUpdatePreview,
    dataPercentage,
  ])

  // Validate column selections
  const validationErrors = useMemo(() => {
    const errors = []

    if (!xAxis) errors.push("Please select an X-axis column")
    if (!yAxis) errors.push("Please select a Y-axis column")

    if (xAxis && yAxis) {
      // Chart-specific validations
      if (chartType === "scatter" || chartType === "bubble") {
        if (columnTypes[xAxis] !== "number") {
          errors.push("Scatter/bubble charts require numerical X-axis")
        }
        if (columnTypes[yAxis] !== "number") {
          errors.push("Scatter/bubble charts require numerical Y-axis")
        }
      }

      if (chartType === "bubble" && (!bubbleSize || columnTypes[bubbleSize] !== "number")) {
        errors.push("Bubble charts require a numerical size column")
      }

      if (chartType === "heatmap") {
        if (!heatmapRows) errors.push("Please select a row column for heatmap")
        if (!heatmapCols) errors.push("Please select a column column for heatmap")
        if (!heatmapValue || columnTypes[heatmapValue] !== "number") {
          errors.push("Heatmap requires a numerical value column")
        }
      }

      if (chartType === "pie" && columnTypes[yAxis] !== "number") {
        errors.push("Pie charts require a numerical value column")
      }
    }

    return errors
  }, [xAxis, yAxis, chartType, columnTypes, bubbleSize, heatmapRows, heatmapCols, heatmapValue])

  // Prepare data for visualization with error handling
  const prepareChartData = () => {
    try {
      setError(null)

      if (!xAxis || !yAxis || processedData.length === 0 || validationErrors.length > 0) {
        return []
      }

      // Calculate the number of data points based on percentage
      const targetDataPoints = Math.floor((processedData.length * dataPercentage) / 100)
      const actualDataPoints = Math.min(targetDataPoints, maxItems)

      // Sample data based on percentage and max limit
      let limitedData = processedData

      if (actualDataPoints < processedData.length) {
        if (sortData && (chartType === "pie" || chartType === "treemap" || chartType === "funnel")) {
          // For charts that benefit from sorting, take top N items
          limitedData = processedData.slice(0, actualDataPoints)
        } else {
          // For other charts, take evenly distributed sample
          const step = Math.floor(processedData.length / actualDataPoints)
          limitedData = processedData.filter((_, index) => index % step === 0).slice(0, actualDataPoints)
        }
      }

      if (chartType === "pie") {
        // For pie charts, we need to aggregate data by the x-axis
        const aggregatedData = limitedData.reduce((acc, row) => {
          const key = String(row[xAxis])
          if (!acc[key]) {
            acc[key] = 0
          }
          acc[key] += Number(row[yAxis]) || 0
          return acc
        }, {})

        let result = Object.entries(aggregatedData).map(([name, value]) => ({ name, value }))

        if (sortData) {
          result = result.sort((a, b) => b.value - a.value)
        }

        return result
      } else if (chartType === "scatter" || chartType === "bubble") {
        // For scatter/bubble charts, we need x, y, and optionally z values
        return limitedData.map((row) => ({
          x: Number(row[xAxis]) || 0,
          y: Number(row[yAxis]) || 0,
          z: bubbleSize ? Number(row[bubbleSize]) || 1 : 1,
          name: String(row[xAxis]),
        }))
      } else if (chartType === "treemap") {
        // For treemaps, we need to aggregate by the x-axis
        const aggregatedData = limitedData.reduce((acc, row) => {
          const key = String(row[xAxis])
          if (!acc[key]) {
            acc[key] = 0
          }
          acc[key] += Number(row[treemapDataKey]) || 0
          return acc
        }, {})

        let result = Object.entries(aggregatedData).map(([name, value]) => ({ name, value }))

        if (sortData) {
          result = result.sort((a, b) => b.value - a.value)
        }

        return result
      } else if (chartType === "radar") {
        // For radar charts, we need to transform the data
        const uniqueCategories = [...new Set(limitedData.map((row) => row[xAxis]))]
        return uniqueCategories.map((category) => {
          const result = { name: category }
          numericColumns.forEach((col) => {
            const matchingRows = limitedData.filter((row) => row[xAxis] === category)
            if (matchingRows.length > 0) {
              result[col] = matchingRows.reduce((sum, row) => sum + (Number(row[col]) || 0), 0) / matchingRows.length
            } else {
              result[col] = 0
            }
          })
          return result
        })
      } else if (chartType === "funnel") {
        // For funnel charts, we need to aggregate by the x-axis
        const aggregatedData = limitedData.reduce((acc, row) => {
          const key = String(row[xAxis])
          if (!acc[key]) {
            acc[key] = 0
          }
          acc[key] += Number(row[yAxis]) || 0
          return acc
        }, {})

        let result = Object.entries(aggregatedData).map(([name, value]) => ({ name, value }))

        if (sortData) {
          result = result.sort((a, b) => b.value - a.value)
        }

        return result
      } else if (chartType === "heatmap") {
        // For heatmaps, we need to create a matrix of values
        const rowValues = [...new Set(limitedData.map((row) => String(row[heatmapRows])))]
        const colValues = [...new Set(limitedData.map((row) => String(row[heatmapCols])))]

        const heatmapData = []

        rowValues.forEach((rowVal) => {
          colValues.forEach((colVal) => {
            const matchingRows = limitedData.filter(
              (row) => String(row[heatmapRows]) === rowVal && String(row[heatmapCols]) === colVal,
            )

            const value =
              matchingRows.length > 0
                ? matchingRows.reduce((sum, row) => sum + (Number(row[heatmapValue]) || 0), 0) / matchingRows.length
                : 0

            heatmapData.push({
              rowValue: rowVal,
              colValue: colVal,
              value,
            })
          })
        })

        return heatmapData
      } else if (stackedChart && selectedCategories.length > 0) {
        // For stacked charts, we need to aggregate by categories
        const uniqueXValues = [...new Set(limitedData.map((row) => row[xAxis]))]

        let result = uniqueXValues.map((xValue) => {
          const result = { name: xValue }

          selectedCategories.forEach((category) => {
            const matchingRows = limitedData.filter(
              (row) => row[xAxis] === xValue && row[selectedCategories[0]] === category,
            )

            if (matchingRows.length > 0) {
              // Sum the y values for this category
              result[category] = matchingRows.reduce((sum, row) => sum + (Number(row[yAxis]) || 0), 0)
            } else {
              result[category] = 0
            }
          })

          return result
        })

        if (sortData) {
          // Sort by the sum of all category values
          result = result.sort((a, b) => {
            const sumA = selectedCategories.reduce((sum, cat) => sum + (a[cat] || 0), 0)
            const sumB = selectedCategories.reduce((sum, cat) => sum + (b[cat] || 0), 0)
            return sumB - sumA
          })
        }

        return result
      } else {
        // For regular charts
        let result = limitedData.map((row) => ({
          name: row[xAxis],
          value: Number(row[yAxis]) || 0,
          secondValue: secondYAxis ? Number(row[secondYAxis]) || 0 : undefined,
        }))

        if (sortData) {
          result = result.sort((a, b) => b.value - a.value)
        }

        return result
      }
    } catch (error) {
      console.error("Error preparing chart data:", error)
      setError(`Error preparing chart data: ${error.message}`)
      return []
    }
  }

  const chartData = useMemo(() => {
    if (autoUpdatePreview || needsUpdate) {
      setIsLoading(true)
      try {
        const data = prepareChartData()
        setIsLoading(false)
        setNeedsUpdate(false)
        return data
      } catch (error) {
        setIsLoading(false)
        setError(`Error preparing chart data: ${error instanceof Error ? error.message : "Unknown error"}`)
        return []
      }
    }
    return []
  }, [
    autoUpdatePreview,
    needsUpdate,
    xAxis,
    yAxis,
    secondYAxis,
    chartType,
    processedData,
    maxItems,
    bubbleSize,
    treemapDataKey,
    heatmapRows,
    heatmapCols,
    heatmapValue,
    stackedChart,
    selectedCategories,
    sortData,
    validationErrors.length,
    dataPercentage,
  ])

  // Get unique categories for stacked charts
  const getUniqueCategories = () => {
    if (!selectedCategories[0] || processedData.length === 0) return []
    return [...new Set(processedData.map((row) => row[selectedCategories[0]]))]
  }

  const uniqueCategories = getUniqueCategories()

  // Handle category selection for stacked charts
  const handleCategoryToggle = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    )
  }

  const exportChart = () => {
    if (!chartRef.current) {
      setError("Chart reference not available for export")
      return
    }

    try {
      const chartContainer = chartRef.current.container
      if (!chartContainer || !chartContainer.children[0]) {
        setError("Chart container not found")
        return
      }

      const svgElement = chartContainer.children[0]
      const svgData = new XMLSerializer().serializeToString(svgElement)
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        setError("Canvas context not available")
        return
      }

      const img = new Image()
      img.setAttribute("crossOrigin", "anonymous")

      img.onload = () => {
        try {
          canvas.width = img.width || 800
          canvas.height = img.height || 600

          ctx.fillStyle = "white"
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0)

          const downloadLink = document.createElement("a")
          downloadLink.download = `${chartTitle || "chart"}.png`
          downloadLink.href = canvas.toDataURL("image/png")
          downloadLink.click()
        } catch (error) {
          setError(`Failed to export chart: ${error instanceof Error ? error.message : "Unknown error"}`)
        }
      }

      img.onerror = () => {
        setError("Failed to load chart image for export")
      }

      img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`
    } catch (error) {
      setError(`Failed to export chart: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  // Get color for heatmap cell
  const getHeatmapColor = (value) => {
    // Normalize value between 0 and 1
    const min = Math.min(...chartData.map((item) => item.value))
    const max = Math.max(...chartData.map((item) => item.value))
    const range = max - min
    const normalized = range === 0 ? 0.5 : (value - min) / range

    // Color gradient from blue to red
    const r = Math.round(normalized * 255)
    const b = Math.round((1 - normalized) * 255)
    return `rgb(${r}, 100, ${b})`
  }

  // Apply suggested chart type
  const applySuggestedChart = (type) => {
    setChartType(type)
    setShowChartSuggestions(false)
  }

  // Force update preview
  const updatePreview = () => {
    setNeedsUpdate(true)
  }

  return (
    <div className="space-y-6">
      {/* Data Profiling Toggle */}
      {processedData.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant={showProfilingPanel ? "default" : "outline"}
              size="sm"
              onClick={() => setShowProfilingPanel(!showProfilingPanel)}
              className="flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              Data Insights
              {isProfilingLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
            </Button>
            {dataProfile && (
              <Badge variant="outline" className="text-xs">
                {dataProfile.totalRows.toLocaleString()} rows × {dataProfile.totalColumns} cols
              </Badge>
            )}
          </div>
          {dataProfile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4" />
              <span>{dataProfile.completeness.toFixed(1)}% complete</span>
            </div>
          )}
        </div>
      )}

      <div className={`grid gap-6 ${showProfilingPanel ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"}`}>
        {/* Data Profiling Panel */}
        {showProfilingPanel && (
          <div className="lg:col-span-1">
            <DataProfilingPanel profile={dataProfile} isLoading={isProfilingLoading} onRefresh={generateDataProfile} />
          </div>
        )}

        {/* Main Visualization Panel */}
        <div className={showProfilingPanel ? "lg:col-span-2" : "col-span-1"}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Mobile Navigation Dropdown */}
            <div className="block lg:hidden mb-4">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full h-12">
                  <SelectValue placeholder="Select visualization step" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="data">
                    <div className="flex items-center gap-3 py-1">
                      <Settings className="h-4 w-4" />
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Data Selection</span>
                        <span className="text-xs text-muted-foreground">Choose columns and chart type</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="appearance">
                    <div className="flex items-center gap-3 py-1">
                      <Palette className="h-4 w-4" />
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Appearance</span>
                        <span className="text-xs text-muted-foreground">Customize colors and styling</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="preview">
                    <div className="flex items-center gap-3 py-1">
                      <Eye className="h-4 w-4" />
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Preview</span>
                        <span className="text-xs text-muted-foreground">View and export chart</span>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="hidden lg:block">
              <TabsList className="grid w-full grid-cols-3 h-auto p-1">
                <TabsTrigger value="data" className="flex items-center gap-2 px-3 py-2 text-sm">
                  <Settings className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Data Selection</span>
                </TabsTrigger>
                <TabsTrigger value="appearance" className="flex items-center gap-2 px-3 py-2 text-sm">
                  <Palette className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Appearance</span>
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-2 px-3 py-2 text-sm">
                  <Eye className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Preview</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="data" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Data Selection</span>
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <HelpCircle className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p>
                            Select the columns you want to visualize. The chart type will be suggested based on your
                            selection.
                          </p>
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </CardTitle>
                  <CardDescription>Select the columns you want to visualize</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <UILabel htmlFor="x-axis">
                        X-Axis
                        {columnTypes[xAxis] && (
                          <Badge variant="outline" className="ml-2">
                            {columnTypes[xAxis]}
                          </Badge>
                        )}
                      </UILabel>
                      <Select
                        value={xAxis}
                        onValueChange={(value) => {
                          setXAxis(value)
                          if (!autoUpdatePreview) setNeedsUpdate(true)
                        }}
                      >
                        <SelectTrigger id="x-axis" className="w-full">
                          <SelectValue placeholder="Select X-Axis column" />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map((column) => (
                            <SelectItem key={column} value={column}>
                              <span className="flex items-center">
                                {column}
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {columnTypes[column]}
                                </Badge>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <UILabel htmlFor="y-axis">
                        Y-Axis
                        {columnTypes[yAxis] && (
                          <Badge variant="outline" className="ml-2">
                            {columnTypes[yAxis]}
                          </Badge>
                        )}
                      </UILabel>
                      <Select
                        value={yAxis}
                        onValueChange={(value) => {
                          setYAxis(value)
                          if (!autoUpdatePreview) setNeedsUpdate(true)
                        }}
                      >
                        <SelectTrigger id="y-axis" className="w-full">
                          <SelectValue placeholder="Select Y-Axis column" />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map((column) => (
                            <SelectItem key={column} value={column}>
                              <span className="flex items-center">
                                {column}
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {columnTypes[column]}
                                </Badge>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Chart type selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <UILabel>Chart Type</UILabel>
                      {suggestedCharts.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowChartSuggestions(!showChartSuggestions)}
                          className="flex items-center gap-1"
                        >
                          <Wand2 className="h-3.5 w-3.5" />
                          <span>Suggested Charts</span>
                        </Button>
                      )}
                    </div>

                    {showChartSuggestions && suggestedCharts.length > 0 && (
                      <Alert className="bg-blue-50 border-blue-200">
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertTitle className="text-blue-800">Chart Suggestions</AlertTitle>
                        <AlertDescription className="text-blue-700">
                          <p className="mb-2">Based on your selected columns, these chart types are recommended:</p>
                          <div className="flex flex-wrap gap-2">
                            {suggestedCharts.map((type) => (
                              <Button
                                key={type}
                                variant={chartType === type ? "default" : "outline"}
                                size="sm"
                                onClick={() => applySuggestedChart(type)}
                                className="flex items-center gap-1"
                              >
                                {CHART_TYPES[type].icon}
                                <span>{CHART_TYPES[type].name}</span>
                              </Button>
                            ))}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {Object.entries(CHART_TYPES).map(([type, info]) => (
                        <TooltipProvider key={type}>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={chartType === type ? "default" : "outline"}
                                className="flex flex-col items-center justify-center h-20 p-2"
                                onClick={() => {
                                  setChartType(type)
                                  if (!autoUpdatePreview) setNeedsUpdate(true)
                                }}
                              >
                                <div className="text-lg mb-1">{info.icon}</div>
                                <span className="text-xs text-center">{info.name}</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{info.description}</p>
                            </TooltipContent>
                          </UITooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </div>

                  {/* Chart-specific data options */}
                  {chartType === "bubble" && (
                    <div className="space-y-2">
                      <UILabel htmlFor="bubble-size">
                        Bubble Size (Z-Axis)
                        {columnTypes[bubbleSize] && (
                          <Badge variant="outline" className="ml-2">
                            {columnTypes[bubbleSize]}
                          </Badge>
                        )}
                      </UILabel>
                      <Select
                        value={bubbleSize}
                        onValueChange={(value) => {
                          setBubbleSize(value)
                          if (!autoUpdatePreview) setNeedsUpdate(true)
                        }}
                      >
                        <SelectTrigger id="bubble-size" className="w-full">
                          <SelectValue placeholder="Select bubble size column" />
                        </SelectTrigger>
                        <SelectContent>
                          {numericColumns.map((column) => (
                            <SelectItem key={column} value={column}>
                              {column}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {chartType === "heatmap" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <UILabel htmlFor="heatmap-rows">Rows (Y-Axis)</UILabel>
                          <Select
                            value={heatmapRows}
                            onValueChange={(value) => {
                              setHeatmapRows(value)
                              if (!autoUpdatePreview) setNeedsUpdate(true)
                            }}
                          >
                            <SelectTrigger id="heatmap-rows" className="w-full">
                              <SelectValue placeholder="Select row column" />
                            </SelectTrigger>
                            <SelectContent>
                              {categoricalColumns.map((column) => (
                                <SelectItem key={column} value={column}>
                                  {column}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <UILabel htmlFor="heatmap-cols">Columns (X-Axis)</UILabel>
                          <Select
                            value={heatmapCols}
                            onValueChange={(value) => {
                              setHeatmapCols(value)
                              if (!autoUpdatePreview) setNeedsUpdate(true)
                            }}
                          >
                            <SelectTrigger id="heatmap-cols" className="w-full">
                              <SelectValue placeholder="Select column column" />
                            </SelectTrigger>
                            <SelectContent>
                              {categoricalColumns.map((column) => (
                                <SelectItem key={column} value={column}>
                                  {column}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <UILabel htmlFor="heatmap-value">Value (Color Intensity)</UILabel>
                        <Select
                          value={heatmapValue}
                          onValueChange={(value) => {
                            setHeatmapValue(value)
                            if (!autoUpdatePreview) setNeedsUpdate(true)
                          }}
                        >
                          <SelectTrigger id="heatmap-value" className="w-full">
                            <SelectValue placeholder="Select value column" />
                          </SelectTrigger>
                          <SelectContent>
                            {numericColumns.map((column) => (
                              <SelectItem key={column} value={column}>
                                {column}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {(chartType === "line" ||
                    chartType === "bar" ||
                    chartType === "area" ||
                    chartType === "composed") && (
                    <div className="space-y-2">
                      <UILabel htmlFor="second-y-axis">
                        Second Y-Axis (Optional)
                        {secondYAxis && columnTypes[secondYAxis] && (
                          <Badge variant="outline" className="ml-2">
                            {columnTypes[secondYAxis]}
                          </Badge>
                        )}
                      </UILabel>
                      <Select
                        value={secondYAxis}
                        onValueChange={(value) => {
                          setSecondYAxis(value)
                          if (!autoUpdatePreview) setNeedsUpdate(true)
                        }}
                      >
                        <SelectTrigger id="second-y-axis" className="w-full">
                          <SelectValue placeholder="Select second Y-Axis column (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {numericColumns
                            .filter((col) => col !== yAxis)
                            .map((column) => (
                              <SelectItem key={column} value={column}>
                                {column}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {(chartType === "bar" || chartType === "area") && categoricalColumns.length > 0 && (
                    <div className="space-y-2 border p-4 rounded-md">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="stacked-chart"
                          checked={stackedChart}
                          onCheckedChange={(checked) => {
                            setStackedChart(checked)
                            if (!autoUpdatePreview) setNeedsUpdate(true)
                          }}
                        />
                        <UILabel htmlFor="stacked-chart">Stacked Chart</UILabel>
                      </div>

                      {stackedChart && (
                        <div className="space-y-2 mt-2">
                          <UILabel>Group By</UILabel>
                          <Select
                            value={selectedCategories[0] || ""}
                            onValueChange={(value) => {
                              setSelectedCategories(value ? [value] : [])
                              if (!autoUpdatePreview) setNeedsUpdate(true)
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categoricalColumns.map((column) => (
                                <SelectItem key={column} value={column}>
                                  {column}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {selectedCategories[0] && uniqueCategories.length > 0 && (
                            <div className="space-y-1 mt-2">
                              <UILabel>Categories</UILabel>
                              <div className="grid grid-cols-2 gap-2">
                                {uniqueCategories.map((category) => (
                                  <div key={category} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`category-${category}`}
                                      checked={true} // Always show all categories
                                      onCheckedChange={() => handleCategoryToggle(category)}
                                    />
                                    <UILabel htmlFor={`category-${category}`} className="truncate">
                                      {category}
                                    </UILabel>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Data processing options */}
                  <div className="space-y-4 border p-4 rounded-md">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Data Sampling Options</h3>
                      <TooltipProvider>
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <HelpCircle className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">
                            <p>Control how much data is displayed in your chart for better performance and clarity.</p>
                          </TooltipContent>
                        </UITooltip>
                      </TooltipProvider>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="sort-data"
                        checked={sortData}
                        onCheckedChange={(checked) => {
                          setSortData(checked)
                          if (!autoUpdatePreview) setNeedsUpdate(true)
                        }}
                      />
                      <UILabel htmlFor="sort-data" className="text-sm">
                        Sort Data by Value
                      </UILabel>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <UILabel htmlFor="data-percentage" className="text-sm font-medium">
                            Data Percentage: {dataPercentage}%
                          </UILabel>
                          <Badge variant="outline" className="text-xs px-2 py-1">
                            {Math.floor((processedData.length * dataPercentage) / 100)} / {processedData.length} points
                          </Badge>
                        </div>
                        <Slider
                          id="data-percentage"
                          min={5}
                          max={100}
                          step={5}
                          value={[dataPercentage]}
                          onValueChange={(value) => {
                            setDataPercentage(value[0])
                            if (!autoUpdatePreview) setNeedsUpdate(true)
                          }}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground px-1">
                          <span>5%</span>
                          <span>25%</span>
                          <span>50%</span>
                          <span>75%</span>
                          <span>100%</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <UILabel htmlFor="max-items" className="text-sm font-medium">
                            Maximum Data Points: {maxItems}
                          </UILabel>
                          <TooltipProvider>
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-4 w-4">
                                  <HelpCircle className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">
                                <p>
                                  Hard limit on data points regardless of percentage. Useful for performance with very
                                  large datasets.
                                </p>
                              </TooltipContent>
                            </UITooltip>
                          </TooltipProvider>
                        </div>
                        <Slider
                          id="max-items"
                          min={10}
                          max={1000}
                          step={10}
                          value={[maxItems]}
                          onValueChange={(value) => {
                            setMaxItems(value[0])
                            if (!autoUpdatePreview) setNeedsUpdate(true)
                          }}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">Performance limit for very large datasets</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch id="auto-update" checked={autoUpdatePreview} onCheckedChange={setAutoUpdatePreview} />
                    <UILabel htmlFor="auto-update">Auto-update preview</UILabel>
                  </div>

                  {!autoUpdatePreview && (
                    <Button onClick={updatePreview} disabled={!needsUpdate}>
                      Update Preview
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Chart Appearance</CardTitle>
                  <CardDescription>Customize the look and feel of your chart</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Chart title and labels */}
                  <div className="space-y-2">
                    <UILabel htmlFor="chart-title">Chart Title</UILabel>
                    <Input
                      id="chart-title"
                      placeholder="Enter chart title"
                      value={chartTitle}
                      onChange={(e) => setChartTitle(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <UILabel htmlFor="x-axis-label">X-Axis Label</UILabel>
                      <Input
                        id="x-axis-label"
                        placeholder="Enter X-axis label"
                        value={xAxisLabel}
                        onChange={(e) => setXAxisLabel(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <UILabel htmlFor="y-axis-label">Y-Axis Label</UILabel>
                      <Input
                        id="y-axis-label"
                        placeholder="Enter Y-axis label"
                        value={yAxisLabel}
                        onChange={(e) => setYAxisLabel(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Color palette */}
                  <div className="space-y-2">
                    <UILabel htmlFor="color-palette">Color Palette</UILabel>
                    <Select value={colorPalette} onValueChange={setColorPalette}>
                      <SelectTrigger id="color-palette" className="w-full">
                        <SelectValue placeholder="Select color palette" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="pastel">Pastel</SelectItem>
                        <SelectItem value="vibrant">Vibrant</SelectItem>
                        <SelectItem value="monochrome">Monochrome</SelectItem>
                        <SelectItem value="rainbow">Rainbow</SelectItem>
                        <SelectItem value="categorical">Categorical</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {COLOR_PALETTES[colorPalette].map((color, index) => (
                        <div key={index} className="w-6 h-6 rounded-full border" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Chart-specific appearance options */}
                  {chartType === "pie" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <UILabel htmlFor="pie-inner-radius">Inner Radius (Donut): {pieChartInnerRadius}</UILabel>
                      </div>
                      <Slider
                        id="pie-inner-radius"
                        min={0}
                        max={100}
                        step={5}
                        value={[pieChartInnerRadius]}
                        onValueChange={(value) => setPieChartInnerRadius(value[0])}
                      />
                    </div>
                  )}

                  {(chartType === "bar" ||
                    chartType === "line" ||
                    chartType === "area" ||
                    chartType === "composed") && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="chart-orientation"
                          checked={chartOrientation === "horizontal"}
                          onCheckedChange={(checked) => {
                            setChartOrientation(checked ? "horizontal" : "vertical")
                            if (!autoUpdatePreview) setNeedsUpdate(true)
                          }}
                        />
                        <UILabel htmlFor="chart-orientation">Horizontal Orientation</UILabel>
                      </div>
                    </div>
                  )}

                  {(chartType === "line" || chartType === "area") && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="smooth-curve"
                          checked={smoothCurve}
                          onCheckedChange={(checked) => {
                            setSmoothCurve(checked)
                            if (!autoUpdatePreview) setNeedsUpdate(true)
                          }}
                        />
                        <UILabel htmlFor="smooth-curve">Smooth Curves</UILabel>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="show-data-labels"
                        checked={showDataLabels}
                        onCheckedChange={(checked) => {
                          setShowDataLabels(checked)
                          if (!autoUpdatePreview) setNeedsUpdate(true)
                        }}
                      />
                      <UILabel htmlFor="show-data-labels">Show Data Labels</UILabel>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch id="show-grid" checked={showGrid} onCheckedChange={setShowGrid} />
                      <UILabel htmlFor="show-grid">Show Grid</UILabel>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch id="show-legend" checked={showLegend} onCheckedChange={setShowLegend} />
                      <UILabel htmlFor="show-legend">Show Legend</UILabel>
                    </div>
                  </div>

                  {(chartType === "line" ||
                    chartType === "bar" ||
                    chartType === "area" ||
                    chartType === "composed") && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="show-brush"
                          checked={showBrush}
                          onCheckedChange={(checked) => {
                            setShowBrush(checked)
                            if (!autoUpdatePreview) setNeedsUpdate(true)
                          }}
                        />
                        <UILabel htmlFor="show-brush">Show Brush (Zoom/Pan)</UILabel>
                      </div>
                    </div>
                  )}

                  {(chartType === "line" ||
                    chartType === "bar" ||
                    chartType === "area" ||
                    chartType === "scatter" ||
                    chartType === "bubble" ||
                    chartType === "composed") && (
                    <div className="space-y-2 border p-4 rounded-md">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="show-reference-lines"
                          checked={showReferenceLines}
                          onCheckedChange={(checked) => {
                            setShowReferenceLines(checked)
                            if (!autoUpdatePreview) setNeedsUpdate(true)
                          }}
                        />
                        <UILabel htmlFor="show-reference-lines">Show Reference Line</UILabel>
                      </div>

                      {showReferenceLines && (
                        <div className="space-y-2 mt-2">
                          <UILabel htmlFor="reference-line-value">Reference Line Value: {referenceLine}</UILabel>
                          <Input
                            id="reference-line-value"
                            type="number"
                            value={referenceLine}
                            onChange={(e) => setReferenceLine(Number(e.target.value))}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="animation"
                        checked={animation}
                        onCheckedChange={(checked) => {
                          setAnimation(checked)
                          if (!autoUpdatePreview) setNeedsUpdate(true)
                        }}
                      />
                      <UILabel htmlFor="animation">Enable Animations</UILabel>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{chartTitle || "Chart Preview"}</span>
                    <Button variant="outline" size="sm" onClick={exportChart}>
                      <Download className="mr-2 h-4 w-4" />
                      Export Chart
                    </Button>
                  </CardTitle>
                  {(xAxisLabel || yAxisLabel) && (
                    <CardDescription>
                      {xAxisLabel && <span>X-Axis: {xAxisLabel}</span>}
                      {xAxisLabel && yAxisLabel && <span> | </span>}
                      {yAxisLabel && <span>Y-Axis: {yAxisLabel}</span>}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {validationErrors.length > 0 ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Validation Errors</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc pl-5 mt-2">
                          {validationErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  ) : isLoading ? (
                    <div className="flex items-center justify-center h-[400px]">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Generating chart preview...</p>
                      </div>
                    </div>
                  ) : error ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ) : chartData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-center">
                      <EyeOff className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">No Preview Available</h3>
                      <p className="text-muted-foreground mt-2 max-w-md">
                        {!autoUpdatePreview && needsUpdate
                          ? "Click 'Update Preview' to generate the chart"
                          : "Select columns and chart type to generate a preview"}
                      </p>
                      {!autoUpdatePreview && needsUpdate && (
                        <Button onClick={updatePreview} className="mt-4">
                          Update Preview
                        </Button>
                      )}
                    </div>
                  ) : (
                    <ErrorBoundary onError={(error) => setError(error.message)}>
                      <div className="h-[400px] w-full" ref={chartRef}>
                        <ResponsiveContainer width="100%" height="100%">
                          {chartType === "bar" && (
                            <BarChart
                              data={chartData}
                              margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                              layout={chartOrientation === "horizontal" ? "vertical" : "horizontal"}
                            >
                              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                              {chartOrientation === "horizontal" ? (
                                <>
                                  <XAxis type="number" />
                                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                </>
                              ) : (
                                <>
                                  <XAxis
                                    dataKey="name"
                                    label={{ value: xAxisLabel, position: "bottom", offset: 0 }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={70}
                                  />
                                  <YAxis label={{ value: yAxisLabel, angle: -90, position: "insideLeft" }} />
                                </>
                              )}
                              <Tooltip />
                              {showLegend && <Legend />}
                              {showBrush && <Brush dataKey="name" height={30} stroke="#8884d8" />}
                              {showReferenceLines && (
                                <ReferenceLine
                                  y={referenceLine}
                                  stroke="red"
                                  strokeDasharray="3 3"
                                  label={{ value: `Reference: ${referenceLine}`, position: "top" }}
                                />
                              )}

                              {stackedChart && uniqueCategories.length > 0 ? (
                                uniqueCategories.map((category, index) => (
                                  <Bar
                                    key={category}
                                    dataKey={category}
                                    stackId="stack"
                                    fill={COLOR_PALETTES[colorPalette][index % COLOR_PALETTES[colorPalette].length]}
                                    isAnimationActive={animation}
                                  >
                                    {showDataLabels && (
                                      <LabelList
                                        dataKey={category}
                                        position="top"
                                        style={{ fontSize: "80%", fill: "#666" }}
                                      />
                                    )}
                                  </Bar>
                                ))
                              ) : (
                                <>
                                  <Bar
                                    dataKey="value"
                                    fill={COLOR_PALETTES[colorPalette][0]}
                                    name={yAxis}
                                    isAnimationActive={animation}
                                  >
                                    {showDataLabels && (
                                      <LabelList
                                        dataKey="value"
                                        position="top"
                                        style={{ fontSize: "80%", fill: "#666" }}
                                      />
                                    )}
                                  </Bar>
                                  {secondYAxis && (
                                    <Bar
                                      dataKey="secondValue"
                                      fill={COLOR_PALETTES[colorPalette][1]}
                                      name={secondYAxis}
                                      isAnimationActive={animation}
                                    >
                                      {showDataLabels && (
                                        <LabelList
                                          dataKey="secondValue"
                                          position="top"
                                          style={{ fontSize: "80%", fill: "#666" }}
                                        />
                                      )}
                                    </Bar>
                                  )}
                                </>
                              )}
                            </BarChart>
                          )}

                          {chartType === "line" && (
                            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                              <XAxis
                                dataKey="name"
                                label={{ value: xAxisLabel, position: "bottom", offset: 0 }}
                                angle={-45}
                                textAnchor="end"
                                height={70}
                              />
                              <YAxis label={{ value: yAxisLabel, angle: -90, position: "insideLeft" }} />
                              <Tooltip />
                              {showLegend && <Legend />}
                              {showBrush && <Brush dataKey="name" height={30} stroke="#8884d8" />}
                              {showReferenceLines && (
                                <ReferenceLine
                                  y={referenceLine}
                                  stroke="red"
                                  strokeDasharray="3 3"
                                  label={{ value: `Reference: ${referenceLine}`, position: "top" }}
                                />
                              )}
                              <Line
                                type={smoothCurve ? "monotone" : "linear"}
                                dataKey="value"
                                stroke={COLOR_PALETTES[colorPalette][0]}
                                activeDot={{ r: 8 }}
                                name={yAxis}
                                isAnimationActive={animation}
                              >
                                {showDataLabels && (
                                  <LabelList dataKey="value" position="top" style={{ fontSize: "80%", fill: "#666" }} />
                                )}
                              </Line>
                              {secondYAxis && (
                                <Line
                                  type={smoothCurve ? "monotone" : "linear"}
                                  dataKey="secondValue"
                                  stroke={COLOR_PALETTES[colorPalette][1]}
                                  activeDot={{ r: 8 }}
                                  name={secondYAxis}
                                  isAnimationActive={animation}
                                >
                                  {showDataLabels && (
                                    <LabelList
                                      dataKey="secondValue"
                                      position="top"
                                      style={{ fontSize: "80%", fill: "#666" }}
                                    />
                                  )}
                                </Line>
                              )}
                            </LineChart>
                          )}

                          {chartType === "area" && (
                            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                              <XAxis
                                dataKey="name"
                                label={{ value: xAxisLabel, position: "bottom", offset: 0 }}
                                angle={-45}
                                textAnchor="end"
                                height={70}
                              />
                              <YAxis label={{ value: yAxisLabel, angle: -90, position: "insideLeft" }} />
                              <Tooltip />
                              {showLegend && <Legend />}
                              {showBrush && <Brush dataKey="name" height={30} stroke="#8884d8" />}
                              {showReferenceLines && (
                                <ReferenceLine
                                  y={referenceLine}
                                  stroke="red"
                                  strokeDasharray="3 3"
                                  label={{ value: `Reference: ${referenceLine}`, position: "top" }}
                                />
                              )}

                              {stackedChart && uniqueCategories.length > 0 ? (
                                uniqueCategories.map((category, index) => (
                                  <Area
                                    key={category}
                                    type={smoothCurve ? "monotone" : "linear"}
                                    dataKey={category}
                                    stackId="stack"
                                    fill={COLOR_PALETTES[colorPalette][index % COLOR_PALETTES[colorPalette].length]}
                                    stroke={COLOR_PALETTES[colorPalette][index % COLOR_PALETTES[colorPalette].length]}
                                    isAnimationActive={animation}
                                  >
                                    {showDataLabels && (
                                      <LabelList
                                        dataKey={category}
                                        position="top"
                                        style={{ fontSize: "80%", fill: "#666" }}
                                      />
                                    )}
                                  </Area>
                                ))
                              ) : (
                                <>
                                  <Area
                                    type={smoothCurve ? "monotone" : "linear"}
                                    dataKey="value"
                                    fill={COLOR_PALETTES[colorPalette][0]}
                                    stroke={COLOR_PALETTES[colorPalette][0]}
                                    name={yAxis}
                                    isAnimationActive={animation}
                                  >
                                    {showDataLabels && (
                                      <LabelList
                                        dataKey="value"
                                        position="top"
                                        style={{ fontSize: "80%", fill: "#666" }}
                                      />
                                    )}
                                  </Area>
                                  {secondYAxis && (
                                    <Area
                                      type={smoothCurve ? "monotone" : "linear"}
                                      dataKey="secondValue"
                                      fill={COLOR_PALETTES[colorPalette][1]}
                                      stroke={COLOR_PALETTES[colorPalette][1]}
                                      name={secondYAxis}
                                      isAnimationActive={animation}
                                    >
                                      {showDataLabels && (
                                        <LabelList
                                          dataKey="secondValue"
                                          position="top"
                                          style={{ fontSize: "80%", fill: "#666" }}
                                        />
                                      )}
                                    </Area>
                                  )}
                                </>
                              )}
                            </AreaChart>
                          )}

                          {chartType === "pie" && (
                            <PieChart>
                              <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                labelLine={true}
                                label={
                                  showDataLabels
                                    ? ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`
                                    : false
                                }
                                outerRadius={150}
                                innerRadius={pieChartInnerRadius}
                                fill="#8884d8"
                                dataKey="value"
                                isAnimationActive={animation}
                              >
                                {chartData.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={COLOR_PALETTES[colorPalette][index % COLOR_PALETTES[colorPalette].length]}
                                  />
                                ))}
                              </Pie>
                              <Tooltip />
                              {showLegend && <Legend />}
                            </PieChart>
                          )}

                          {chartType === "scatter" && (
                            <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                              <XAxis
                                type="number"
                                dataKey="x"
                                name={xAxis}
                                label={{ value: xAxisLabel || xAxis, position: "bottom", offset: 0 }}
                              />
                              <YAxis
                                type="number"
                                dataKey="y"
                                name={yAxis}
                                label={{ value: yAxisLabel || yAxis, angle: -90, position: "insideLeft" }}
                              />
                              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                              {showLegend && <Legend />}
                              {showReferenceLines && (
                                <>
                                  <ReferenceLine
                                    y={referenceLine}
                                    stroke="red"
                                    strokeDasharray="3 3"
                                    label={{ value: `Y: ${referenceLine}`, position: "right" }}
                                  />
                                  <ReferenceLine
                                    x={referenceLine}
                                    stroke="red"
                                    strokeDasharray="3 3"
                                    label={{ value: `X: ${referenceLine}`, position: "top" }}
                                  />
                                </>
                              )}
                              <Scatter
                                name={`${xAxis} vs ${yAxis}`}
                                data={chartData}
                                fill={COLOR_PALETTES[colorPalette][0]}
                                isAnimationActive={animation}
                              />
                            </ScatterChart>
                          )}

                          {chartType === "bubble" && (
                            <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                              <XAxis
                                type="number"
                                dataKey="x"
                                name={xAxis}
                                label={{ value: xAxisLabel || xAxis, position: "bottom", offset: 0 }}
                              />
                              <YAxis
                                type="number"
                                dataKey="y"
                                name={yAxis}
                                label={{ value: yAxisLabel || yAxis, angle: -90, position: "insideLeft" }}
                              />
                              <ZAxis dataKey="z" range={[50, 500]} name={bubbleSize} />
                              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                              {showLegend && <Legend />}
                              {showReferenceLines && (
                                <>
                                  <ReferenceLine
                                    y={referenceLine}
                                    stroke="red"
                                    strokeDasharray="3 3"
                                    label={{ value: `Y: ${referenceLine}`, position: "right" }}
                                  />
                                  <ReferenceLine
                                    x={referenceLine}
                                    stroke="red"
                                    strokeDasharray="3 3"
                                    label={{ value: `X: ${referenceLine}`, position: "top" }}
                                  />
                                </>
                              )}
                              <Scatter
                                name={`${xAxis} vs ${yAxis} (size: ${bubbleSize})`}
                                data={chartData}
                                fill={COLOR_PALETTES[colorPalette][0]}
                                isAnimationActive={animation}
                              >
                                {showDataLabels &&
                                  chartData.map((entry, index) => (
                                    <LabelList
                                      key={`label-${index}`}
                                      dataKey="name"
                                      position="top"
                                      style={{ fontSize: "70%", fill: "#666" }}
                                    />
                                  ))}
                              </Scatter>
                            </ScatterChart>
                          )}

                          {chartType === "radar" && (
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="name" />
                              <PolarRadiusAxis />
                              {numericColumns.slice(0, 5).map((col, index) => (
                                <Radar
                                  key={col}
                                  name={col}
                                  dataKey={col}
                                  stroke={COLOR_PALETTES[colorPalette][index % COLOR_PALETTES[colorPalette].length]}
                                  fill={COLOR_PALETTES[colorPalette][index % COLOR_PALETTES[colorPalette].length]}
                                  fillOpacity={0.6}
                                  isAnimationActive={animation}
                                />
                              ))}
                              <Tooltip />
                              {showLegend && <Legend />}
                            </RadarChart>
                          )}

                          {chartType === "treemap" && (
                            <Treemap
                              data={chartData}
                              dataKey="value"
                              nameKey="name"
                              aspectRatio={4 / 3}
                              stroke="#fff"
                              fill={COLOR_PALETTES[colorPalette][0]}
                              isAnimationActive={animation}
                            >
                              <Tooltip formatter={(value) => [`${value}`, treemapDataKey]} />
                              {showDataLabels &&
                                chartData.map((entry, index) => (
                                  <Label
                                    key={`label-${index}`}
                                    position="center"
                                    style={{ fontSize: "80%", fill: "#fff" }}
                                  />
                                ))}
                            </Treemap>
                          )}

                          {chartType === "composed" && (
                            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                              <XAxis
                                dataKey="name"
                                label={{ value: xAxisLabel, position: "bottom", offset: 0 }}
                                angle={-45}
                                textAnchor="end"
                                height={70}
                              />
                              <YAxis label={{ value: yAxisLabel, angle: -90, position: "insideLeft" }} />
                              <Tooltip />
                              {showLegend && <Legend />}
                              {showBrush && <Brush dataKey="name" height={30} stroke="#8884d8" />}
                              {showReferenceLines && (
                                <ReferenceLine
                                  y={referenceLine}
                                  stroke="red"
                                  strokeDasharray="3 3"
                                  label={{ value: `Reference: ${referenceLine}`, position: "top" }}
                                />
                              )}
                              <Bar
                                dataKey="value"
                                fill={COLOR_PALETTES[colorPalette][0]}
                                name={yAxis}
                                isAnimationActive={animation}
                              >
                                {showDataLabels && (
                                  <LabelList dataKey="value" position="top" style={{ fontSize: "80%", fill: "#666" }} />
                                )}
                              </Bar>
                              {secondYAxis && (
                                <Line
                                  type={smoothCurve ? "monotone" : "linear"}
                                  dataKey="secondValue"
                                  stroke={COLOR_PALETTES[colorPalette][1]}
                                  name={secondYAxis}
                                  isAnimationActive={animation}
                                >
                                  {showDataLabels && (
                                    <LabelList
                                      dataKey="secondValue"
                                      position="top"
                                      style={{ fontSize: "80%", fill: "#666" }}
                                    />
                                  )}
                                </Line>
                              )}
                            </ComposedChart>
                          )}

                          {chartType === "funnel" && (
                            <FunnelChart>
                              <Tooltip />
                              {showLegend && <Legend />}
                              <Funnel
                                dataKey="value"
                                nameKey="name"
                                data={chartData}
                                isAnimationActive={animation}
                                fill={COLOR_PALETTES[colorPalette][0]}
                              >
                                {showDataLabels && (
                                  <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
                                )}
                                {chartData.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={COLOR_PALETTES[colorPalette][index % COLOR_PALETTES[colorPalette].length]}
                                  />
                                ))}
                              </Funnel>
                            </FunnelChart>
                          )}

                          {chartType === "heatmap" && (
                            <ScatterChart
                              margin={{ top: 20, right: 30, left: 100, bottom: 70 }}
                              height={400}
                              width={500}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                type="category"
                                dataKey="colValue"
                                name={heatmapCols}
                                label={{ value: heatmapCols, position: "bottom", offset: 0 }}
                                angle={-45}
                                textAnchor="end"
                                height={70}
                              />
                              <YAxis
                                type="category"
                                dataKey="rowValue"
                                name={heatmapRows}
                                label={{ value: heatmapRows, angle: -90, position: "insideLeft" }}
                                width={80}
                              />
                              <Tooltip
                                cursor={{ strokeDasharray: "3 3" }}
                                formatter={(value) => [`${value}`, heatmapValue]}
                              />
                              <Scatter
                                name={heatmapValue}
                                data={chartData}
                                fill="#8884d8"
                                shape={(props) => {
                                  const { x, y, width, height, value } = props
                                  return (
                                    <Rectangle
                                      x={x - width / 2}
                                      y={y - height / 2}
                                      width={width}
                                      height={height}
                                      fill={getHeatmapColor(value)}
                                      fillOpacity={0.8}
                                    />
                                  )
                                }}
                              />
                            </ScatterChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    </ErrorBoundary>
                  )}
                </CardContent>
                <CardFooter>
                  <div className="flex justify-between w-full text-xs text-muted-foreground">
                    <span>
                      {chartData.length > 0 && `Showing ${chartData.length} data points`}
                      {dataPercentage < 100 && ` (${dataPercentage}% of ${processedData.length})`}
                    </span>
                    {(() => {
                      const targetDataPoints = Math.floor((processedData.length * dataPercentage) / 100)
                      const actualDataPoints = Math.min(targetDataPoints, maxItems)
                      return (
                        actualDataPoints < processedData.length && (
                          <span>Limited by {dataPercentage < 100 ? "percentage" : "max points"} setting</span>
                        )
                      )
                    })()}
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
