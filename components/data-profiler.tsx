"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  RefreshCw,
  Database,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  FileText,
  Eye,
  Info,
  XCircle,
} from "lucide-react"
import { useData } from "@/lib/data-context"

export function DataProfiler() {
  const { dataProfile, isProfileLoading, generateDataProfile, processedData, columns } = useData()
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    quality: true,
    columns: true,
    correlations: false,
  })

  useEffect(() => {
    if (processedData.length > 0 && !dataProfile && !isProfileLoading) {
      generateDataProfile()
    }
  }, [processedData, dataProfile, isProfileLoading, generateDataProfile])

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "high":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "medium":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "low":
        return <Info className="h-4 w-4 text-blue-500" />
      default:
        return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "destructive"
      case "medium":
        return "secondary"
      case "low":
        return "outline"
      default:
        return "outline"
    }
  }

  const formatNumber = (num: number | undefined): string => {
    if (num === undefined || num === null) return "N/A"
    if (Number.isInteger(num)) return num.toLocaleString()
    return num.toLocaleString(undefined, { maximumFractionDigits: 3 })
  }

  const getCorrelationColor = (correlation: number): string => {
    const abs = Math.abs(correlation)
    if (abs >= 0.8) return "text-red-600 font-bold"
    if (abs >= 0.6) return "text-orange-600 font-semibold"
    if (abs >= 0.4) return "text-yellow-600"
    if (abs >= 0.2) return "text-blue-600"
    return "text-gray-500"
  }

  const refreshDataProfile = () => {
    generateDataProfile()
  }

  if (!processedData.length) {
    return (
      <Card className="sketch-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Profiler
          </CardTitle>
          <CardDescription>Upload a dataset to generate a comprehensive data profile</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No data available for profiling</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isProfileLoading) {
    return (
      <Card className="sketch-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Profiler
          </CardTitle>
          <CardDescription>Analyzing your dataset...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Generating comprehensive data profile...</span>
            </div>
            <Progress value={undefined} className="h-2" />
            <div className="text-sm text-muted-foreground">This may take a moment for large datasets</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!dataProfile) {
    return (
      <Card className="sketch-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Profiler
          </CardTitle>
          <CardDescription>Generate insights about your dataset</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Button onClick={generateDataProfile} className="sketch-button">
              <Activity className="mr-2 h-4 w-4" />
              Generate Data Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="sketch-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Profile Report
              </CardTitle>
              <CardDescription>
                Generated on {dataProfile.generatedAt ? dataProfile.generatedAt.toLocaleString() : "Unknown"}
              </CardDescription>
            </div>
            <Button onClick={refreshDataProfile} variant="outline" className="sketch-button">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 p-1 gap-1">
          <TabsTrigger value="overview" className="sketch-tab">
            <FileText className="h-4 w-4 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="columns" className="sketch-tab">
            <BarChart3 className="h-4 w-4 mr-1" />
            Columns
          </TabsTrigger>
          <TabsTrigger value="quality" className="sketch-tab">
            <AlertTriangle className="h-4 w-4 mr-1" />
            Quality
          </TabsTrigger>
          <TabsTrigger value="correlations" className="sketch-tab">
            <TrendingUp className="h-4 w-4 mr-1" />
            Correlations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="sketch-card">
            <CardHeader>
              <CardTitle>Dataset Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {dataProfile.overview?.totalRows?.toLocaleString() || processedData.length.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Rows</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {dataProfile.overview?.totalColumns || columns.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Columns</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {dataProfile.overview?.completeness || "100"}%
                  </div>
                  <div className="text-sm text-muted-foreground">Data Completeness</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{dataProfile.overview?.memoryUsage || "N/A"}</div>
                  <div className="text-sm text-muted-foreground">Memory Usage</div>
                </div>
              </div>

              {dataProfile.overview?.duplicateRows > 0 && (
                <Alert className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Duplicate Rows Detected</AlertTitle>
                  <AlertDescription>
                    Found {dataProfile.overview.duplicateRows} duplicate rows (
                    {((dataProfile.overview.duplicateRows / (dataProfile.overview.totalRows || 1)) * 100).toFixed(1)}%
                    of total)
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card className="sketch-card">
            <CardHeader>
              <CardTitle>Column Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dataProfile.columns &&
                  Object.entries(
                    Object.values(dataProfile.columns).reduce(
                      (acc, col) => {
                        acc[col.type] = (acc[col.type] || 0) + 1
                        return acc
                      },
                      {} as Record<string, number>,
                    ),
                  ).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {type}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{count} columns</span>
                      </div>
                      <div className="flex-1 mx-4">
                        <Progress
                          value={(count / (dataProfile.overview?.totalColumns || columns.length)) * 100}
                          className="h-2"
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {Math.round((count / (dataProfile.overview?.totalColumns || columns.length)) * 100)}%
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="columns" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-1 sketch-card">
              <CardHeader>
                <CardTitle>Column List</CardTitle>
                <CardDescription>Click a column to view detailed statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {dataProfile.columns &&
                      Object.values(dataProfile.columns).map((column) => (
                        <div
                          key={column.name}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedColumn === column.name
                              ? "bg-primary/10 border-primary"
                              : "bg-muted/50 hover:bg-muted"
                          }`}
                          onClick={() => setSelectedColumn(column.name)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{column.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {column.type}
                                </Badge>
                                {column.missingPercentage > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {column.missingPercentage}% missing
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 sketch-card">
              <CardHeader>
                <CardTitle>{selectedColumn ? `Column Details: ${selectedColumn}` : "Select a Column"}</CardTitle>
                <CardDescription>
                  {selectedColumn
                    ? "Detailed statistics and analysis for the selected column"
                    : "Choose a column from the list to view its detailed profile"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedColumn && dataProfile.columns && dataProfile.columns[selectedColumn] ? (
                  <div className="space-y-6">
                    {(() => {
                      const column = dataProfile.columns[selectedColumn]
                      return (
                        <>
                          {/* Basic Statistics */}
                          <div>
                            <h4 className="font-semibold mb-3">Basic Statistics</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <div className="text-center p-3 bg-muted/50 rounded-lg">
                                <div className="text-lg font-bold">{column.count?.toLocaleString() || "N/A"}</div>
                                <div className="text-xs text-muted-foreground">Total Values</div>
                              </div>
                              <div className="text-center p-3 bg-muted/50 rounded-lg">
                                <div className="text-lg font-bold">{column.unique?.toLocaleString() || "N/A"}</div>
                                <div className="text-xs text-muted-foreground">Unique Values</div>
                              </div>
                              <div className="text-center p-3 bg-muted/50 rounded-lg">
                                <div className="text-lg font-bold">{column.missing?.toLocaleString() || "0"}</div>
                                <div className="text-xs text-muted-foreground">Missing Values</div>
                              </div>
                            </div>
                          </div>

                          {/* Type-specific Statistics */}
                          {column.type === "number" && (
                            <div>
                              <h4 className="font-semibold mb-3">Numerical Statistics</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-3 bg-muted/50 rounded-lg">
                                  <div className="text-lg font-bold">{formatNumber(column.mean)}</div>
                                  <div className="text-xs text-muted-foreground">Mean</div>
                                </div>
                                <div className="text-center p-3 bg-muted/50 rounded-lg">
                                  <div className="text-lg font-bold">{formatNumber(column.median)}</div>
                                  <div className="text-xs text-muted-foreground">Median</div>
                                </div>
                                <div className="text-center p-3 bg-muted/50 rounded-lg">
                                  <div className="text-lg font-bold">{formatNumber(column.std)}</div>
                                  <div className="text-xs text-muted-foreground">Std Dev</div>
                                </div>
                                <div className="text-center p-3 bg-muted/50 rounded-lg">
                                  <div className="text-lg font-bold">{formatNumber(column.mode)}</div>
                                  <div className="text-xs text-muted-foreground">Mode</div>
                                </div>
                                <div className="text-center p-3 bg-muted/50 rounded-lg">
                                  <div className="text-lg font-bold">{formatNumber(column.min)}</div>
                                  <div className="text-xs text-muted-foreground">Minimum</div>
                                </div>
                                <div className="text-center p-3 bg-muted/50 rounded-lg">
                                  <div className="text-lg font-bold">{formatNumber(column.max)}</div>
                                  <div className="text-xs text-muted-foreground">Maximum</div>
                                </div>
                                <div className="text-center p-3 bg-muted/50 rounded-lg">
                                  <div className="text-lg font-bold">{formatNumber(column.q1)}</div>
                                  <div className="text-xs text-muted-foreground">Q1 (25%)</div>
                                </div>
                                <div className="text-center p-3 bg-muted/50 rounded-lg">
                                  <div className="text-lg font-bold">{formatNumber(column.q3)}</div>
                                  <div className="text-xs text-muted-foreground">Q3 (75%)</div>
                                </div>
                              </div>

                              {(column.skewness !== undefined || column.kurtosis !== undefined) && (
                                <div className="mt-4 grid grid-cols-2 gap-4">
                                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                                    <div className="text-lg font-bold">{formatNumber(column.skewness)}</div>
                                    <div className="text-xs text-muted-foreground">Skewness</div>
                                  </div>
                                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                                    <div className="text-lg font-bold">{formatNumber(column.kurtosis)}</div>
                                    <div className="text-xs text-muted-foreground">Kurtosis</div>
                                  </div>
                                </div>
                              )}

                              {column.outliers && column.outliers.length > 0 && (
                                <Alert className="mt-4">
                                  <AlertTriangle className="h-4 w-4" />
                                  <AlertTitle>Outliers Detected</AlertTitle>
                                  <AlertDescription>
                                    Found {column.outliers.length} outliers using IQR method (
                                    {((column.outliers.length / (column.count || 1)) * 100).toFixed(1)}% of values)
                                  </AlertDescription>
                                </Alert>
                              )}
                            </div>
                          )}

                          {column.type === "string" && (
                            <div>
                              <h4 className="font-semibold mb-3">String Statistics</h4>
                              <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-3 bg-muted/50 rounded-lg">
                                  <div className="text-lg font-bold">{formatNumber(column.avgLength)}</div>
                                  <div className="text-xs text-muted-foreground">Avg Length</div>
                                </div>
                                <div className="text-center p-3 bg-muted/50 rounded-lg">
                                  <div className="text-lg font-bold">{formatNumber(column.minLength)}</div>
                                  <div className="text-xs text-muted-foreground">Min Length</div>
                                </div>
                                <div className="text-center p-3 bg-muted/50 rounded-lg">
                                  <div className="text-lg font-bold">{formatNumber(column.maxLength)}</div>
                                  <div className="text-xs text-muted-foreground">Max Length</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Top Values */}
                          {column.topValues && column.topValues.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-3">Top Values</h4>
                              <div className="space-y-2">
                                {column.topValues.slice(0, 5).map((item, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between p-2 bg-muted/50 rounded"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        #{index + 1}
                                      </Badge>
                                      <span className="font-mono text-sm truncate max-w-32">{String(item.value)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">{item.count?.toLocaleString() || "N/A"}</span>
                                      <Badge variant="secondary" className="text-xs">
                                        {item.percentage || "N/A"}%
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Patterns */}
                          {column.patterns && column.patterns.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-3">Detected Patterns</h4>
                              <div className="space-y-2">
                                {column.patterns.map((pattern, index) => (
                                  <Badge key={index} variant="outline" className="mr-2">
                                    {pattern}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Anomalies */}
                          {column.anomalies && column.anomalies.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-3">Anomalies</h4>
                              <div className="space-y-2">
                                {column.anomalies.map((anomaly, index) => (
                                  <Alert key={index}>
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>{anomaly}</AlertDescription>
                                  </Alert>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a column to view detailed statistics</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <Card className="sketch-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Data Quality Issues
              </CardTitle>
              <CardDescription>
                {dataProfile.dataQuality && dataProfile.dataQuality.length > 0
                  ? `Found ${dataProfile.dataQuality.length} potential data quality issues`
                  : "No significant data quality issues detected"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dataProfile.dataQuality && dataProfile.dataQuality.length > 0 ? (
                <div className="space-y-4">
                  {dataProfile.dataQuality.map((issue, index) => (
                    <Alert key={index} variant={getSeverityColor(issue.severity) as any}>
                      <div className="flex items-start gap-3">
                        {getSeverityIcon(issue.severity)}
                        <div className="flex-1">
                          <AlertTitle className="flex items-center gap-2">
                            {issue.description}
                            <Badge variant={getSeverityColor(issue.severity) as any} className="text-xs">
                              {issue.severity}
                            </Badge>
                          </AlertTitle>
                          <AlertDescription className="mt-2">
                            <div className="space-y-1">
                              <p>{issue.suggestion}</p>
                              {issue.column && (
                                <p className="text-xs">
                                  <strong>Column:</strong> {issue.column}
                                </p>
                              )}
                              <p className="text-xs">
                                <strong>Affected items:</strong> {issue.count?.toLocaleString() || "N/A"}
                              </p>
                            </div>
                          </AlertDescription>
                        </div>
                      </div>
                    </Alert>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <h3 className="text-lg font-semibold text-green-700 mb-2">Great Data Quality!</h3>
                  <p className="text-muted-foreground">
                    No significant data quality issues were detected in your dataset.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="sketch-card">
            <CardHeader>
              <CardTitle>Data Quality Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {dataProfile.dataQuality
                      ? dataProfile.dataQuality.filter((issue) => issue.severity === "low").length
                      : 0}
                  </div>
                  <div className="text-sm text-green-700">Low Severity Issues</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {dataProfile.dataQuality
                      ? dataProfile.dataQuality.filter((issue) => issue.severity === "medium").length
                      : 0}
                  </div>
                  <div className="text-sm text-yellow-700">Medium Severity Issues</div>
                </div>
                <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {dataProfile.dataQuality
                      ? dataProfile.dataQuality.filter((issue) => issue.severity === "high").length
                      : 0}
                  </div>
                  <div className="text-sm text-red-700">High Severity Issues</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correlations" className="space-y-4">
          <Card className="sketch-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Correlation Matrix
              </CardTitle>
              <CardDescription>Pearson correlation coefficients between numerical columns</CardDescription>
            </CardHeader>
            <CardContent>
              {dataProfile.correlations && Object.keys(dataProfile.correlations).length > 0 ? (
                <div className="space-y-4">
                  <ScrollArea className="w-full">
                    <div className="min-w-max">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            <th className="p-2 text-left font-medium border-b"></th>
                            {Object.keys(dataProfile.correlations).map((col) => (
                              <th key={col} className="p-2 text-center font-medium border-b min-w-20">
                                <div className="truncate max-w-20" title={col}>
                                  {col}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(dataProfile.correlations).map(([row, correlations]) => (
                            <tr key={row}>
                              <td className="p-2 font-medium border-r">
                                <div className="truncate max-w-32" title={row}>
                                  {row}
                                </div>
                              </td>
                              {Object.entries(correlations).map(([col, correlation]) => (
                                <td key={col} className="p-2 text-center border-r border-b">
                                  <span
                                    className={`font-mono text-sm ${getCorrelationColor(correlation)}`}
                                    title={`${row} vs ${col}: ${correlation.toFixed(3)}`}
                                  >
                                    {correlation.toFixed(2)}
                                  </span>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ScrollArea>

                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold mb-2">Correlation Strength Guide</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded"></div>
                        <span>Strong (&gt;=0.8)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded"></div>
                        <span>Moderate (&gt;=0.6)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                        <span>Weak (&gt;=0.4)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-500 rounded"></div>
                        <span>Very Weak (&lt;0.4)</span>
                      </div>
                    </div>
                  </div>

                  {/* Strong correlations highlight */}
                  {(() => {
                    const strongCorrelations = []
                    Object.entries(dataProfile.correlations).forEach(([row, correlations]) => {
                      Object.entries(correlations).forEach(([col, correlation]) => {
                        if (row !== col && Math.abs(correlation) >= 0.7) {
                          strongCorrelations.push({ row, col, correlation })
                        }
                      })
                    })

                    if (strongCorrelations.length > 0) {
                      return (
                        <Alert>
                          <TrendingUp className="h-4 w-4" />
                          <AlertTitle>Strong Correlations Detected</AlertTitle>
                          <AlertDescription>
                            <div className="mt-2 space-y-1">
                              {strongCorrelations.slice(0, 5).map((item, index) => (
                                <div key={index} className="text-sm">
                                  <strong>{item.row}</strong> ↔ <strong>{item.col}</strong>:{" "}
                                  <span className={getCorrelationColor(item.correlation)}>
                                    {item.correlation.toFixed(3)}
                                  </span>
                                </div>
                              ))}
                              {strongCorrelations.length > 5 && (
                                <div className="text-sm text-muted-foreground">
                                  ...and {strongCorrelations.length - 5} more
                                </div>
                              )}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )
                    }
                    return null
                  })()}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No numerical columns available for correlation analysis</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
