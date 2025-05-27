"use client"

import { Label } from "@/components/ui/label"
import { useMemo, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { useData } from "@/lib/data-context"
import {
  AlertCircle,
  TrendingUp,
  Target,
  BarChart3,
  Award,
  Brain,
  Zap,
  Settings,
  CheckCircle,
  Info,
  Trophy,
  Lightbulb,
  ArrowRight,
  BarChart,
  LineChart,
  ScatterChartIcon as Scatter,
  HelpCircle,
  Download,
} from "lucide-react"
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart as RechartsLineChart,
  Line,
  ScatterChart,
  Scatter as RechartsScatter,
  Cell,
  PieChart,
  Pie,
  Area,
  AreaChart,
} from "recharts"

interface ModelComparisonData {
  id: string
  name: string
  type: string
  algorithm: string
  accuracy?: number
  precision?: number
  recall?: number
  f1Score?: number
  r2Score?: number
  rmse?: number
  mae?: number
  rocAuc?: number
  features: string[]
  target?: string
  trainedAt: Date
  featureImportance?: Array<{ feature: string; importance: number }>
  isAutoML?: boolean
  predictions?: Array<{ actual: number; predicted: number }>
  rocCurve?: Array<{ fpr: number; tpr: number; threshold: number }>
  prCurve?: Array<{ precision: number; recall: number; threshold: number }>
  confusionMatrix?: Array<Array<number>>
}

interface VisualizationSettings {
  colorScheme: string
  chartType: string
  selectedMetrics: string[]
  showGrid: boolean
  showLegend: boolean
  chartSize: number
}

const COLOR_SCHEMES = {
  default: ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00", "#ff00ff", "#00ffff", "#ff0000"],
  professional: ["#2563eb", "#059669", "#dc2626", "#7c3aed", "#ea580c", "#0891b2", "#be185d", "#4338ca"],
  pastel: ["#a78bfa", "#34d399", "#fbbf24", "#f87171", "#60a5fa", "#fb7185", "#4ade80", "#a855f7"],
  monochrome: ["#374151", "#6b7280", "#9ca3af", "#d1d5db", "#1f2937", "#4b5563", "#111827", "#f9fafb"],
  vibrant: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"],
}

const CHART_TYPES = {
  bar: "Bar Chart",
  line: "Line Chart",
  area: "Area Chart",
  radar: "Radar Chart",
  scatter: "Scatter Plot",
}

const AVAILABLE_METRICS = [
  { key: "accuracy", label: "Accuracy", description: "Percentage of correct predictions" },
  { key: "precision", label: "Precision", description: "True positives / (True positives + False positives)" },
  { key: "recall", label: "Recall", description: "True positives / (True positives + False negatives)" },
  { key: "f1Score", label: "F1 Score", description: "Harmonic mean of precision and recall" },
  { key: "r2Score", label: "R² Score", description: "Coefficient of determination" },
  { key: "rmse", label: "RMSE", description: "Root Mean Square Error" },
  { key: "mae", label: "MAE", description: "Mean Absolute Error" },
  { key: "rocAuc", label: "ROC AUC", description: "Area Under the ROC Curve" },
]

export function MLModelComparison() {
  const { trainedModels = [] } = useData()

  const [visualizationSettings, setVisualizationSettings] = useState<VisualizationSettings>({
    colorScheme: "default",
    chartType: "bar",
    selectedMetrics: ["accuracy", "f1Score", "r2Score"],
    showGrid: true,
    showLegend: true,
    chartSize: 300,
  })

  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [showCustomization, setShowCustomization] = useState(false)

  const comparisonData = useMemo((): ModelComparisonData[] => {
    if (!trainedModels || !Array.isArray(trainedModels)) {
      return []
    }

    return trainedModels
      .filter((model) => model.performance && Object.keys(model.performance).length > 0)
      .map((model) => ({
        id: model.id,
        name: model.name,
        type: model.type,
        algorithm: model.algorithm,
        accuracy: model.performance?.accuracy,
        precision: model.performance?.precision,
        recall: model.performance?.recall,
        f1Score: model.performance?.f1Score,
        r2Score: model.performance?.r2Score,
        rmse: model.performance?.rmse,
        mae: model.performance?.mae,
        rocAuc: model.performance?.rocAuc,
        features: model.features,
        target: model.target,
        trainedAt: model.trainedAt || new Date(),
        featureImportance: model.performance?.featureImportance || [],
        isAutoML: model.name?.includes("AutoML") || false,
        // Generate synthetic data for visualizations (in real app, this would come from actual model evaluation)
        predictions: generateSyntheticPredictions(model),
        rocCurve: generateSyntheticROCCurve(model),
        prCurve: generateSyntheticPRCurve(model),
        confusionMatrix: generateSyntheticConfusionMatrix(model),
      }))
  }, [trainedModels])

  // Generate synthetic data for demonstration
  function generateSyntheticPredictions(model: any) {
    const predictions = []
    const baseAccuracy = model.performance?.accuracy || 0.8
    for (let i = 0; i < 100; i++) {
      const actual = Math.random() * 100
      const noise = (Math.random() - 0.5) * 20 * (1 - baseAccuracy)
      const predicted = actual + noise
      predictions.push({ actual, predicted })
    }
    return predictions
  }

  function generateSyntheticROCCurve(model: any) {
    const rocCurve = []
    const auc = model.performance?.rocAuc || 0.85
    for (let i = 0; i <= 100; i++) {
      const fpr = i / 100
      const tpr = Math.min(1, fpr + (auc - 0.5) * 2 * (1 - fpr))
      rocCurve.push({ fpr, tpr, threshold: 1 - i / 100 })
    }
    return rocCurve
  }

  function generateSyntheticPRCurve(model: any) {
    const prCurve = []
    const f1 = model.performance?.f1Score || 0.8
    for (let i = 0; i <= 100; i++) {
      const recall = i / 100
      const precision = Math.max(0.1, (f1 * 2) / (1 + recall))
      prCurve.push({ precision, recall, threshold: 1 - i / 100 })
    }
    return prCurve
  }

  function generateSyntheticConfusionMatrix(model: any) {
    const accuracy = model.performance?.accuracy || 0.8
    const tp = Math.round(accuracy * 85)
    const fn = Math.round((1 - accuracy) * 15)
    const fp = Math.round((1 - accuracy) * 10)
    const tn = Math.round(accuracy * 90)
    return [
      [tp, fp],
      [fn, tn],
    ]
  }

  const autoMLModels = comparisonData.filter((model) => model.isAutoML)
  const manualModels = comparisonData.filter((model) => !model.isAutoML)

  const getBestModel = (metric: string) => {
    if (comparisonData.length === 0) return null

    const validModels = comparisonData.filter((model) => {
      const value = (model as any)[metric]
      return value !== undefined && value !== null && !isNaN(value)
    })

    if (validModels.length === 0) return null

    const isLowerBetter = metric === "rmse" || metric === "mae"

    return validModels.reduce((best, current) => {
      const bestValue = (best as any)[metric]
      const currentValue = (current as any)[metric]

      if (isLowerBetter) {
        return currentValue < bestValue ? current : best
      } else {
        return currentValue > bestValue ? current : best
      }
    })
  }

  const getModelTypeIcon = (type: string) => {
    switch (type) {
      case "regression":
        return <TrendingUp className="h-4 w-4" />
      case "classification":
        return <Target className="h-4 w-4" />
      case "clustering":
        return <BarChart3 className="h-4 w-4" />
      default:
        return <Brain className="h-4 w-4" />
    }
  }

  const formatMetric = (value: number | undefined, decimals = 3) => {
    if (value === undefined || value === null || isNaN(value)) return "N/A"
    return value.toFixed(decimals)
  }

  const formatPercentage = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) return "N/A"
    return `${(value * 100).toFixed(1)}%`
  }

  const getColors = () => COLOR_SCHEMES[visualizationSettings.colorScheme as keyof typeof COLOR_SCHEMES]

  // Prepare data for charts
  const performanceChartData = comparisonData.map((model, index) => {
    const data: any = {
      name: model.name.length > 15 ? model.name.substring(0, 15) + "..." : model.name,
      fullName: model.name,
      isAutoML: model.isAutoML,
      color: getColors()[index % getColors().length],
    }

    visualizationSettings.selectedMetrics.forEach((metric) => {
      const value = (model as any)[metric]
      if (value !== undefined && value !== null) {
        data[metric] = metric.includes("Score") || metric === "accuracy" ? value * 100 : value
      }
    })

    return data
  })

  const filteredData =
    selectedModels.length > 0
      ? performanceChartData.filter((item) => selectedModels.includes(item.fullName))
      : performanceChartData

  const renderChart = () => {
    const colors = getColors()

    switch (visualizationSettings.chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={visualizationSettings.chartSize}>
            <RechartsBarChart data={filteredData}>
              {visualizationSettings.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value, name) => [
                  typeof value === "number"
                    ? `${value.toFixed(1)}${name.includes("Score") || name.includes("accuracy") ? "%" : ""}`
                    : value,
                  AVAILABLE_METRICS.find((m) => m.key === name)?.label || name,
                ]}
                labelFormatter={(label) => {
                  const model = filteredData.find((m) => m.name === label)
                  return model?.fullName || label
                }}
              />
              {visualizationSettings.selectedMetrics.map((metric, index) => (
                <Bar
                  key={metric}
                  dataKey={metric}
                  fill={colors[index % colors.length]}
                  name={AVAILABLE_METRICS.find((m) => m.key === metric)?.label || metric}
                />
              ))}
            </RechartsBarChart>
          </ResponsiveContainer>
        )

      case "line":
        return (
          <ResponsiveContainer width="100%" height={visualizationSettings.chartSize}>
            <RechartsLineChart data={filteredData}>
              {visualizationSettings.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              {visualizationSettings.selectedMetrics.map((metric, index) => (
                <Line
                  key={metric}
                  type="monotone"
                  dataKey={metric}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  name={AVAILABLE_METRICS.find((m) => m.key === metric)?.label || metric}
                />
              ))}
            </RechartsLineChart>
          </ResponsiveContainer>
        )

      case "area":
        return (
          <ResponsiveContainer width="100%" height={visualizationSettings.chartSize}>
            <AreaChart data={filteredData}>
              {visualizationSettings.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              {visualizationSettings.selectedMetrics.map((metric, index) => (
                <Area
                  key={metric}
                  type="monotone"
                  dataKey={metric}
                  stackId="1"
                  stroke={colors[index % colors.length]}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.6}
                  name={AVAILABLE_METRICS.find((m) => m.key === metric)?.label || metric}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )

      case "radar":
        const radarData = visualizationSettings.selectedMetrics.map((metric) => {
          const metricData: any = { metric: AVAILABLE_METRICS.find((m) => m.key === metric)?.label || metric }
          filteredData.forEach((model, index) => {
            metricData[model.name] = model[metric] || 0
          })
          return metricData
        })

        return (
          <ResponsiveContainer width="100%" height={visualizationSettings.chartSize}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              {filteredData.map((model, index) => (
                <Radar
                  key={model.name}
                  name={model.name}
                  dataKey={model.name}
                  stroke={colors[index % colors.length]}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.1}
                />
              ))}
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        )

      default:
        return null
    }
  }

  if (comparisonData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Advanced ML Model Comparison & Visualizations
          </CardTitle>
          <CardDescription>
            Compare model performance with comprehensive visualizations and interactive charts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No models available for comparison. Train some models first to see their performance metrics and advanced
              visualizations here.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Advanced ML Model Comparison & Visualizations
          </CardTitle>
          <CardDescription>
            Compare {comparisonData.length} trained models with interactive visualizations, ROC curves, and
            comprehensive performance analysis.
          </CardDescription>
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomization(!showCustomization)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Customize Visualizations
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Charts
            </Button>
          </div>
        </CardHeader>

        {showCustomization && (
          <CardContent className="border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Color Scheme</Label>
                <Select
                  value={visualizationSettings.colorScheme}
                  onValueChange={(value) => setVisualizationSettings((prev) => ({ ...prev, colorScheme: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COLOR_SCHEMES).map(([key, colors]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {colors.slice(0, 3).map((color, i) => (
                              <div key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                            ))}
                          </div>
                          <span className="capitalize">{key}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Chart Type</Label>
                <Select
                  value={visualizationSettings.chartType}
                  onValueChange={(value) => setVisualizationSettings((prev) => ({ ...prev, chartType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CHART_TYPES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Chart Size</Label>
                <div className="px-2">
                  <Slider
                    value={[visualizationSettings.chartSize]}
                    onValueChange={([value]) => setVisualizationSettings((prev) => ({ ...prev, chartSize: value }))}
                    min={200}
                    max={600}
                    step={50}
                    className="w-full"
                  />
                  <div className="text-xs text-muted-foreground mt-1">{visualizationSettings.chartSize}px</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Display Options</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-grid"
                      checked={visualizationSettings.showGrid}
                      onCheckedChange={(checked) =>
                        setVisualizationSettings((prev) => ({ ...prev, showGrid: checked }))
                      }
                    />
                    <Label htmlFor="show-grid" className="text-sm">
                      Show Grid
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-legend"
                      checked={visualizationSettings.showLegend}
                      onCheckedChange={(checked) =>
                        setVisualizationSettings((prev) => ({ ...prev, showLegend: checked }))
                      }
                    />
                    <Label htmlFor="show-legend" className="text-sm">
                      Show Legend
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Label className="text-sm font-medium">Select Metrics to Display</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {AVAILABLE_METRICS.map((metric) => (
                  <div key={metric.key} className="flex items-center space-x-2">
                    <Switch
                      id={metric.key}
                      checked={visualizationSettings.selectedMetrics.includes(metric.key)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setVisualizationSettings((prev) => ({
                            ...prev,
                            selectedMetrics: [...prev.selectedMetrics, metric.key],
                          }))
                        } else {
                          setVisualizationSettings((prev) => ({
                            ...prev,
                            selectedMetrics: prev.selectedMetrics.filter((m) => m !== metric.key),
                          }))
                        }
                      }}
                    />
                    <Label htmlFor={metric.key} className="text-sm">
                      {metric.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Label className="text-sm font-medium">Select Models to Compare</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {comparisonData.map((model) => (
                  <div key={model.id} className="flex items-center space-x-2">
                    <Switch
                      id={model.id}
                      checked={selectedModels.includes(model.name)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedModels((prev) => [...prev, model.name])
                        } else {
                          setSelectedModels((prev) => prev.filter((m) => m !== model.name))
                        }
                      }}
                    />
                    <Label htmlFor={model.id} className="text-sm truncate">
                      {model.name}
                    </Label>
                    {model.isAutoML && (
                      <Badge variant="secondary" className="text-xs">
                        AutoML
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedModels([])} className="mt-2">
                Show All Models
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="visualizations">Advanced Charts</TabsTrigger>
          <TabsTrigger value="roc-pr">ROC & PR Curves</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Champion Model */}
          {getBestModel("accuracy") || getBestModel("r2Score") ? (
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                  <Trophy className="h-5 w-5" />
                  Champion Model
                </CardTitle>
                <CardDescription>The best performing model from your training session</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const bestModel = getBestModel("accuracy") || getBestModel("r2Score")
                  if (!bestModel) return null

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Model Name</Label>
                        <div className="flex items-center gap-2">
                          {getModelTypeIcon(bestModel.type)}
                          <span className="font-semibold">{bestModel.name}</span>
                          {bestModel.isAutoML && <Badge variant="secondary">AutoML</Badge>}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Algorithm</Label>
                        <Badge variant="outline">{bestModel.algorithm.replace("_", " ").toUpperCase()}</Badge>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Performance</Label>
                        <div className="text-2xl font-bold text-green-600">
                          {bestModel.accuracy
                            ? formatPercentage(bestModel.accuracy)
                            : bestModel.r2Score
                              ? formatMetric(bestModel.r2Score, 3)
                              : "N/A"}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Features Used</Label>
                        <div className="text-lg font-semibold">{bestModel.features.length}</div>
                      </div>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          ) : null}

          {/* Interactive Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Interactive Performance Comparison
              </CardTitle>
              <CardDescription>Customizable visualization of model performance metrics</CardDescription>
            </CardHeader>
            <CardContent>{renderChart()}</CardContent>
          </Card>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {AVAILABLE_METRICS.slice(0, 4).map((metric) => {
              const bestModel = getBestModel(metric.key)
              if (!bestModel) return null

              return (
                <Card key={metric.key}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Award className="h-5 w-5 text-yellow-500" />
                      Best {metric.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="font-medium">{bestModel.name}</p>
                      <p className="text-2xl font-bold text-green-600">
                        {metric.key.includes("Score") || metric.key === "accuracy"
                          ? formatPercentage((bestModel as any)[metric.key])
                          : formatMetric((bestModel as any)[metric.key])}
                      </p>
                      <p className="text-sm text-muted-foreground">{bestModel.algorithm.replace("_", " ")}</p>
                      {bestModel.isAutoML && (
                        <Badge variant="secondary" className="text-xs">
                          AutoML Generated
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {/* Enhanced Metrics Table */}
          <Card>
            <CardHeader>
              <CardTitle>Comprehensive Performance Metrics</CardTitle>
              <CardDescription>
                Detailed comparison of all model performance indicators with explanations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Model</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Algorithm</TableHead>
                      {AVAILABLE_METRICS.map((metric) => (
                        <TableHead key={metric.key} className="text-center">
                          <div className="flex items-center gap-1">
                            {metric.label}
                            <HelpCircle
                              className="h-3 w-3 text-muted-foreground cursor-help"
                              title={metric.description}
                            />
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonData.map((model) => (
                      <TableRow key={model.id} className={model.isAutoML ? "bg-blue-50 dark:bg-blue-950/20" : ""}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {getModelTypeIcon(model.type)}
                            <div>
                              <div>{model.name}</div>
                              {model.isAutoML && (
                                <Badge variant="secondary" className="text-xs mt-1">
                                  AutoML
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{model.type}</Badge>
                        </TableCell>
                        <TableCell>{model.algorithm.replace("_", " ")}</TableCell>
                        {AVAILABLE_METRICS.map((metric) => {
                          const value = (model as any)[metric.key]
                          const isBest = getBestModel(metric.key)?.id === model.id

                          return (
                            <TableCell key={metric.key} className="text-center">
                              {value !== undefined && value !== null ? (
                                <div className="flex items-center justify-center gap-2">
                                  <span>
                                    {metric.key.includes("Score") || metric.key === "accuracy"
                                      ? formatPercentage(value)
                                      : formatMetric(value)}
                                  </span>
                                  {isBest && <Award className="h-4 w-4 text-yellow-500" />}
                                </div>
                              ) : (
                                "N/A"
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Metrics Explanation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Understanding Performance Metrics
              </CardTitle>
              <CardDescription>Detailed explanations of each metric and when to use them</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {AVAILABLE_METRICS.map((metric) => (
                  <div key={metric.key} className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">{metric.label}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{metric.description}</p>
                    <div className="text-xs text-muted-foreground">
                      {metric.key === "accuracy" && "Best for: Balanced datasets, overall model performance"}
                      {metric.key === "precision" && "Best for: When false positives are costly (e.g., spam detection)"}
                      {metric.key === "recall" && "Best for: When false negatives are costly (e.g., medical diagnosis)"}
                      {metric.key === "f1Score" && "Best for: Imbalanced datasets, overall classification performance"}
                      {metric.key === "r2Score" && "Best for: Regression models, explained variance"}
                      {metric.key === "rmse" && "Best for: Regression models, prediction error magnitude"}
                      {metric.key === "mae" && "Best for: Regression models, average prediction error"}
                      {metric.key === "rocAuc" && "Best for: Binary classification, ranking quality"}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visualizations" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Main Interactive Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Interactive Performance Chart</CardTitle>
                <CardDescription>Customizable visualization of selected metrics</CardDescription>
              </CardHeader>
              <CardContent>{renderChart()}</CardContent>
            </Card>

            {/* Metric Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Metric Distribution</CardTitle>
                <CardDescription>Distribution of performance across all models</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={visualizationSettings.chartSize}>
                  <PieChart>
                    <Pie
                      data={comparisonData.map((model, index) => ({
                        name: model.name,
                        value: model.accuracy || model.r2Score || 0.5,
                        fill: getColors()[index % getColors().length],
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {comparisonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getColors()[index % getColors().length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Model Comparison Matrix */}
          <Card>
            <CardHeader>
              <CardTitle>Model Comparison Matrix</CardTitle>
              <CardDescription>Side-by-side comparison of all performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {comparisonData.map((model, index) => (
                  <Card key={model.id} className={model.isAutoML ? "border-blue-200" : ""}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {getModelTypeIcon(model.type)}
                        {model.name}
                        {model.isAutoML && <Badge variant="secondary">AutoML</Badge>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <RadarChart
                          data={[
                            {
                              metric: "Performance",
                              accuracy: (model.accuracy || 0) * 100,
                              precision: (model.precision || 0) * 100,
                              recall: (model.recall || 0) * 100,
                              f1Score: (model.f1Score || 0) * 100,
                            },
                          ]}
                        >
                          <PolarGrid />
                          <PolarAngleAxis dataKey="metric" />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} />
                          <Radar
                            name="Accuracy"
                            dataKey="accuracy"
                            stroke={getColors()[0]}
                            fill={getColors()[0]}
                            fillOpacity={0.1}
                          />
                          <Radar
                            name="Precision"
                            dataKey="precision"
                            stroke={getColors()[1]}
                            fill={getColors()[1]}
                            fillOpacity={0.1}
                          />
                          <Radar
                            name="Recall"
                            dataKey="recall"
                            stroke={getColors()[2]}
                            fill={getColors()[2]}
                            fillOpacity={0.1}
                          />
                          <Radar
                            name="F1 Score"
                            dataKey="f1Score"
                            stroke={getColors()[3]}
                            fill={getColors()[3]}
                            fillOpacity={0.1}
                          />
                          <Tooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roc-pr" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ROC Curves */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  ROC Curves
                </CardTitle>
                <CardDescription>
                  Receiver Operating Characteristic curves showing true positive vs false positive rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RechartsLineChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="fpr"
                      type="number"
                      domain={[0, 1]}
                      label={{ value: "False Positive Rate", position: "insideBottom", offset: -10 }}
                    />
                    <YAxis
                      dataKey="tpr"
                      type="number"
                      domain={[0, 1]}
                      label={{ value: "True Positive Rate", angle: -90, position: "insideLeft" }}
                    />
                    <Tooltip
                      formatter={(value, name) => [`${(value as number).toFixed(3)}`, name]}
                      labelFormatter={(value) => `FPR: ${(value as number).toFixed(3)}`}
                    />
                    {comparisonData
                      .filter((m) => m.type === "classification")
                      .map((model, index) => (
                        <Line
                          key={model.id}
                          data={model.rocCurve}
                          type="monotone"
                          dataKey="tpr"
                          stroke={getColors()[index % getColors().length]}
                          strokeWidth={2}
                          dot={false}
                          name={`${model.name} (AUC: ${formatMetric(model.rocAuc || 0.85, 3)})`}
                        />
                      ))}
                    {/* Diagonal reference line */}
                    <Line
                      data={[
                        { fpr: 0, tpr: 0 },
                        { fpr: 1, tpr: 1 },
                      ]}
                      type="monotone"
                      dataKey="tpr"
                      stroke="#ccc"
                      strokeDasharray="5 5"
                      dot={false}
                      name="Random Classifier"
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Precision-Recall Curves */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Precision-Recall Curves
                </CardTitle>
                <CardDescription>Precision vs Recall curves, especially useful for imbalanced datasets</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RechartsLineChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="recall"
                      type="number"
                      domain={[0, 1]}
                      label={{ value: "Recall", position: "insideBottom", offset: -10 }}
                    />
                    <YAxis
                      dataKey="precision"
                      type="number"
                      domain={[0, 1]}
                      label={{ value: "Precision", angle: -90, position: "insideLeft" }}
                    />
                    <Tooltip
                      formatter={(value, name) => [`${(value as number).toFixed(3)}`, name]}
                      labelFormatter={(value) => `Recall: ${(value as number).toFixed(3)}`}
                    />
                    {comparisonData
                      .filter((m) => m.type === "classification")
                      .map((model, index) => (
                        <Line
                          key={model.id}
                          data={model.prCurve}
                          type="monotone"
                          dataKey="precision"
                          stroke={getColors()[index % getColors().length]}
                          strokeWidth={2}
                          dot={false}
                          name={`${model.name} (F1: ${formatMetric(model.f1Score || 0.8, 3)})`}
                        />
                      ))}
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* ROC/PR Explanation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Understanding ROC and Precision-Recall Curves
              </CardTitle>
              <CardDescription>Learn how to interpret these important evaluation curves</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold">ROC Curve (Receiver Operating Characteristic)</h4>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      Shows trade-off between True Positive Rate and False Positive Rate
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      Area Under Curve (AUC) measures overall performance (0.5 = random, 1.0 = perfect)
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      Curves closer to top-left corner indicate better performance
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      Best for balanced datasets with equal class importance
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Precision-Recall Curve</h4>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      Shows trade-off between Precision and Recall
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      More informative than ROC for imbalanced datasets
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      Curves closer to top-right corner indicate better performance
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      F1-score represents the harmonic mean of precision and recall
                    </li>
                  </ul>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Pro Tip:</strong> For imbalanced datasets (e.g., fraud detection, rare disease diagnosis),
                  focus more on Precision-Recall curves as they provide better insights than ROC curves.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {comparisonData
              .filter((m) => m.type === "regression")
              .map((model, index) => (
                <Card key={model.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Scatter className="h-5 w-5" />
                      {model.name} - Predicted vs Actual
                    </CardTitle>
                    <CardDescription>
                      Scatter plot showing prediction accuracy (closer to diagonal = better)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <ScatterChart data={model.predictions}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="actual"
                          type="number"
                          name="Actual"
                          label={{ value: "Actual Values", position: "insideBottom", offset: -10 }}
                        />
                        <YAxis
                          dataKey="predicted"
                          type="number"
                          name="Predicted"
                          label={{ value: "Predicted Values", angle: -90, position: "insideLeft" }}
                        />
                        <Tooltip
                          formatter={(value, name) => [`${(value as number).toFixed(2)}`, name]}
                          cursor={{ strokeDasharray: "3 3" }}
                        />
                        <RechartsScatter
                          name="Predictions"
                          data={model.predictions}
                          fill={getColors()[index % getColors().length]}
                          fillOpacity={0.6}
                        />
                        {/* Perfect prediction line */}
                        <Line
                          data={[
                            {
                              actual: Math.min(...model.predictions!.map((p) => p.actual)),
                              predicted: Math.min(...model.predictions!.map((p) => p.actual)),
                            },
                            {
                              actual: Math.max(...model.predictions!.map((p) => p.actual)),
                              predicted: Math.max(...model.predictions!.map((p) => p.actual)),
                            },
                          ]}
                          type="monotone"
                          dataKey="predicted"
                          stroke="#ff0000"
                          strokeDasharray="5 5"
                          dot={false}
                          name="Perfect Prediction"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">R² Score:</span> {formatMetric(model.r2Score)}
                      </div>
                      <div>
                        <span className="font-medium">RMSE:</span> {formatMetric(model.rmse)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>

          {/* Prediction Quality Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Prediction Quality Analysis</CardTitle>
              <CardDescription>Understanding how well your models predict actual values</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Perfect Predictions</h4>
                  <p className="text-sm text-muted-foreground">
                    Points that fall exactly on the red diagonal line represent perfect predictions where predicted
                    value equals actual value.
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Prediction Scatter</h4>
                  <p className="text-sm text-muted-foreground">
                    The tighter the scatter around the diagonal line, the better the model's predictions. Wide scatter
                    indicates higher prediction error.
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Systematic Bias</h4>
                  <p className="text-sm text-muted-foreground">
                    If points consistently fall above or below the diagonal, it indicates systematic over-prediction or
                    under-prediction bias.
                  </p>
                </div>
              </div>

              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  <strong>Interpretation Guide:</strong> Look for tight clustering around the diagonal line. Models with
                  R² scores above 0.7 and low RMSE values typically show good prediction accuracy.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {comparisonData.map((model) => (
              <Card key={model.id} className={model.isAutoML ? "border-blue-200" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getModelTypeIcon(model.type)}
                    {model.name}
                    {model.isAutoML && <Badge variant="secondary">AutoML</Badge>}
                  </CardTitle>
                  <CardDescription>Feature analysis and importance ranking</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Features Used ({model.features.length})</Label>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {model.features.slice(0, 10).map((feature, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {model.features.length > 10 && (
                        <Badge variant="secondary" className="text-xs">
                          +{model.features.length - 10} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {model.target && (
                    <div>
                      <Label className="text-sm font-medium">Target Variable</Label>
                      <Badge variant="secondary" className="mt-1">
                        {model.target}
                      </Badge>
                    </div>
                  )}

                  {model.featureImportance && model.featureImportance.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Feature Importance (Top 5)</Label>
                      <div className="mt-2 space-y-2">
                        {model.featureImportance.slice(0, 5).map((item, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium truncate max-w-[150px]" title={item.feature}>
                                {item.feature}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {(item.importance * 100).toFixed(1)}%
                              </span>
                            </div>
                            <Progress value={item.importance * 100} className="h-2" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {model.isAutoML && (
                    <Alert>
                      <Zap className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        This model was created using AutoML, which automatically selected and engineered the most
                        relevant features.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Best Performance Cards */}
            {AVAILABLE_METRICS.slice(0, 3).map((metric) => {
              const bestModel = getBestModel(metric.key)
              if (!bestModel) return null

              return (
                <Card key={metric.key}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Award className="h-5 w-5 text-yellow-500" />
                      Best {metric.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="font-medium">{bestModel.name}</p>
                      <p className="text-2xl font-bold text-green-600">
                        {metric.key.includes("Score") || metric.key === "accuracy"
                          ? formatPercentage((bestModel as any)[metric.key])
                          : formatMetric((bestModel as any)[metric.key])}
                      </p>
                      <p className="text-sm text-muted-foreground">{bestModel.algorithm.replace("_", " ")}</p>
                      {bestModel.isAutoML && (
                        <Badge variant="secondary" className="text-xs">
                          AutoML Generated
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Comprehensive Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Comprehensive Model Analysis</CardTitle>
              <CardDescription>Deep insights into your model performance and recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Model Distribution
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(
                      comparisonData.reduce(
                        (acc, model) => {
                          acc[model.type] = (acc[model.type] || 0) + 1
                          return acc
                        },
                        {} as Record<string, number>,
                      ),
                    ).map(([type, count]) => (
                      <div
                        key={type}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded"
                      >
                        <div className="flex items-center gap-2">
                          {getModelTypeIcon(type)}
                          <span className="capitalize">{type}</span>
                        </div>
                        <Badge variant="outline">
                          {count} model{count !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Algorithm Usage
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(
                      comparisonData.reduce(
                        (acc, model) => {
                          const alg = model.algorithm.replace("_", " ")
                          acc[alg] = (acc[alg] || 0) + 1
                          return acc
                        },
                        {} as Record<string, number>,
                      ),
                    ).map(([algorithm, count]) => (
                      <div
                        key={algorithm}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded"
                      >
                        <span className="capitalize">{algorithm}</span>
                        <Badge variant="outline">
                          {count} model{count !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Key Insights & Recommendations
                </h4>
                <div className="space-y-3 text-sm text-muted-foreground">
                  {comparisonData.length === 1 && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        You have trained one model. Consider training additional models with different algorithms to
                        compare performance and find the best approach for your data.
                      </AlertDescription>
                    </Alert>
                  )}

                  {autoMLModels.length > 0 && (
                    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                      <Zap className="h-4 w-4" />
                      <AlertDescription>
                        <strong>AutoML Success:</strong> {autoMLModels.length} model
                        {autoMLModels.length !== 1 ? "s" : ""} were created automatically, testing multiple algorithms
                        and optimizing features without manual intervention.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <h5 className="font-medium text-green-800 dark:text-green-200 mb-2">Performance Highlights</h5>
                      <p className="text-sm">
                        Your models show strong performance across key metrics. Focus on the champion model for
                        production use and consider the insights from feature importance analysis.
                      </p>
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Visualization Insights</h5>
                      <p className="text-sm">
                        ROC and PR curves provide deep insights into model behavior. Use these visualizations to
                        understand trade-offs between precision and recall for your specific use case.
                      </p>
                    </div>
                  </div>

                  {comparisonData.some((m) => m.type === "classification") && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                      <p>
                        <strong>Classification Models:</strong> Focus on F1-score for balanced performance between
                        precision and recall. Use ROC curves for balanced datasets and PR curves for imbalanced data.
                        Consider the business impact of false positives vs false negatives when selecting your final
                        model.
                      </p>
                    </div>
                  )}

                  {comparisonData.some((m) => m.type === "regression") && (
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                      <p>
                        <strong>Regression Models:</strong> Higher R² scores indicate better fit to your data. Lower
                        RMSE values mean more accurate predictions. Use the predicted vs actual scatter plots to
                        identify systematic biases in your models. R² above 0.7 is generally considered good
                        performance.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Advanced Recommendations & Next Steps
              </CardTitle>
              <CardDescription>Actionable insights to improve your machine learning pipeline</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Immediate Actions</h4>

                  {comparisonData.length < 3 && (
                    <Alert>
                      <ArrowRight className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Train More Models:</strong> Try different algorithms to find the best performer. AutoML
                        can automatically test multiple approaches for you.
                      </AlertDescription>
                    </Alert>
                  )}

                  {autoMLModels.length === 0 && (
                    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                      <Zap className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Try AutoML:</strong> Let AutoML automatically optimize your models with feature
                        engineering, algorithm selection, and hyperparameter tuning.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <h5 className="font-medium">Quick Wins:</h5>
                    <ul className="text-sm space-y-1">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        Deploy your champion model for predictions
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        Monitor the top 5 most important features
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        Set up validation on new, unseen data
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        Use ROC/PR curves to set optimal thresholds
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Long-term Strategy</h4>

                  <div className="space-y-3">
                    <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                      <h5 className="font-medium text-orange-800 dark:text-orange-200">Model Monitoring</h5>
                      <p className="text-sm mt-1">
                        Set up continuous monitoring to detect model drift and performance degradation over time.
                      </p>
                    </div>

                    <div className="p-3 bg-teal-50 dark:bg-teal-950/20 rounded-lg">
                      <h5 className="font-medium text-teal-800 dark:text-teal-200">A/B Testing</h5>
                      <p className="text-sm mt-1">
                        Compare your top models in production using A/B testing to validate real-world performance.
                      </p>
                    </div>

                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg">
                      <h5 className="font-medium text-indigo-800 dark:text-indigo-200">Ensemble Methods</h5>
                      <p className="text-sm mt-1">
                        Combine your best models using ensemble techniques to potentially achieve even better
                        performance.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
