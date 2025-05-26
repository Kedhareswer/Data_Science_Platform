"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart3,
  ScatterChartIcon as ScatterIcon,
  TableIcon,
  BoxSelect,
  AlertTriangle,
  Clock,
  Gauge,
  Fingerprint,
  Activity,
  BarChart2,
} from "lucide-react"
import { useData } from "@/lib/data-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
  Line,
  ComposedChart,
  ReferenceLine,
  ErrorBar,
} from "recharts"

export function DataExplorer() {
  const { processedData, columns, columnTypes } = useData()
  const [activeTab, setActiveTab] = useState("summary")
  const [selectedColumn, setSelectedColumn] = useState("")
  const [scatterX, setScatterX] = useState("")
  const [scatterY, setScatterY] = useState("")
  const [outlierThreshold, setOutlierThreshold] = useState(2.5)
  const [showOutliers, setShowOutliers] = useState(true)
  const [selectedTimeColumn, setSelectedTimeColumn] = useState("")
  const [selectedValueColumn, setSelectedValueColumn] = useState("")
  const [selectedFeature, setSelectedFeature] = useState("")
  const [selectedDistColumn, setSelectedDistColumn] = useState("")
  const [binCount, setBinCount] = useState(10)
  const [selectedTestType, setSelectedTestType] = useState("ttest")
  const [selectedTestColumn1, setSelectedTestColumn1] = useState("")
  const [selectedTestColumn2, setSelectedTestColumn2] = useState("")
  const [selectedGroupColumn, setSelectedGroupColumn] = useState("")

  // Get numeric and categorical columns
  const numericColumns = useMemo(() => columns.filter((col) => columnTypes[col] === "number"), [columns, columnTypes])

  const categoricalColumns = useMemo(
    () => columns.filter((col) => columnTypes[col] === "string" || columnTypes[col] === "boolean"),
    [columns, columnTypes],
  )

  const dateColumns = useMemo(() => columns.filter((col) => columnTypes[col] === "date"), [columns, columnTypes])

  // Set default columns when data is loaded
  useEffect(() => {
    if (columns.length > 0) {
      if (categoricalColumns.length > 0 && !selectedColumn) {
        setSelectedColumn(categoricalColumns[0])
      } else if (numericColumns.length > 0 && !selectedColumn) {
        setSelectedColumn(numericColumns[0])
      }

      if (numericColumns.length > 0) {
        if (!scatterX) setScatterX(numericColumns[0])
        if (!scatterY && numericColumns.length > 1) {
          setScatterY(numericColumns[1])
        } else if (!scatterY) {
          setScatterY(numericColumns[0])
        }
        if (!selectedDistColumn) setSelectedDistColumn(numericColumns[0])
        if (!selectedValueColumn) setSelectedValueColumn(numericColumns[0])
        if (!selectedFeature) setSelectedFeature(numericColumns[0])
        if (!selectedTestColumn1) setSelectedTestColumn1(numericColumns[0])
        if (numericColumns.length > 1 && !selectedTestColumn2) {
          setSelectedTestColumn2(numericColumns[1])
        }
      }

      if (dateColumns.length > 0 && !selectedTimeColumn) {
        setSelectedTimeColumn(dateColumns[0])
      }

      if (categoricalColumns.length > 0 && !selectedGroupColumn) {
        setSelectedGroupColumn(categoricalColumns[0])
      }
    }
  }, [
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
    selectedColumn,
    scatterX,
    scatterY,
    selectedDistColumn,
    selectedTimeColumn,
    selectedValueColumn,
    selectedFeature,
    selectedTestColumn1,
    selectedTestColumn2,
    selectedGroupColumn,
  ])

  // Calculate summary statistics for numeric columns
  const summaryStats = useMemo(() => {
    if (!processedData.length || !numericColumns.length) return {}

    return numericColumns.reduce((acc, column) => {
      const values = processedData.map((row) => Number(row[column])).filter((val) => !isNaN(val))

      if (!values.length) {
        acc[column] = {
          count: 0,
          mean: "N/A",
          median: "N/A",
          min: "N/A",
          max: "N/A",
          range: "N/A",
          stdDev: "N/A",
          q1: "N/A",
          q3: "N/A",
          iqr: "N/A",
          skewness: "N/A",
          kurtosis: "N/A",
          missingCount: "N/A",
          missingPercent: "N/A",
        }
        return acc
      }

      const sum = values.reduce((a, b) => a + b, 0)
      const mean = sum / values.length
      const min = Math.min(...values)
      const max = Math.max(...values)
      const sortedValues = [...values].sort((a, b) => a - b)
      const median =
        values.length % 2 === 0
          ? (sortedValues[values.length / 2 - 1] + sortedValues[values.length / 2]) / 2
          : sortedValues[Math.floor(values.length / 2)]

      // Calculate quartiles
      const q1Index = Math.floor(sortedValues.length * 0.25)
      const q3Index = Math.floor(sortedValues.length * 0.75)
      const q1 = sortedValues[q1Index]
      const q3 = sortedValues[q3Index]
      const iqr = q3 - q1

      // Calculate standard deviation
      const squaredDiffs = values.map((val) => Math.pow(val - mean, 2))
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length
      const stdDev = Math.sqrt(variance)

      // Calculate skewness
      const cubedDiffs = values.map((val) => Math.pow((val - mean) / stdDev, 3))
      const skewness = cubedDiffs.reduce((a, b) => a + b, 0) / values.length

      // Calculate kurtosis
      const fourthDiffs = values.map((val) => Math.pow((val - mean) / stdDev, 4))
      const kurtosis = fourthDiffs.reduce((a, b) => a + b, 0) / values.length - 3 // Excess kurtosis

      // Calculate missing values
      const missingCount = processedData.length - values.length
      const missingPercent = (missingCount / processedData.length) * 100

      acc[column] = {
        count: values.length,
        mean: mean.toFixed(2),
        median: median.toFixed(2),
        min: min.toFixed(2),
        max: max.toFixed(2),
        range: (max - min).toFixed(2),
        stdDev: stdDev.toFixed(2),
        q1: q1.toFixed(2),
        q3: q3.toFixed(2),
        iqr: iqr.toFixed(2),
        skewness: skewness.toFixed(2),
        kurtosis: kurtosis.toFixed(2),
        missingCount,
        missingPercent: missingPercent.toFixed(2),
      }

      return acc
    }, {})
  }, [processedData, numericColumns])

  // Calculate frequency distributions for categorical columns
  const distributions = useMemo(() => {
    if (!processedData.length || !categoricalColumns.length) return {}

    return categoricalColumns.reduce((acc, column) => {
      const counts = {}
      let totalCount = 0
      let uniqueCount = 0
      let missingCount = 0

      processedData.forEach((row) => {
        const value = row[column] !== null && row[column] !== undefined ? String(row[column]) : "N/A"

        if (value === "N/A") {
          missingCount++
        } else {
          counts[value] = (counts[value] || 0) + 1
          totalCount++
        }
      })

      uniqueCount = Object.keys(counts).length

      acc[column] = {
        distribution: Object.entries(counts)
          .map(([name, value]) => ({ name, value, percentage: (((value as number) / totalCount) * 100).toFixed(1) }))
          .sort((a, b) => b.value - a.value),
        uniqueCount,
        missingCount,
        missingPercent: ((missingCount / processedData.length) * 100).toFixed(2),
      }

      return acc
    }, {})
  }, [processedData, categoricalColumns])

  // Prepare data for scatter plot
  const scatterData = useMemo(() => {
    if (!processedData.length || !scatterX || !scatterY) return []

    return processedData
      .filter(
        (row) =>
          row[scatterX] !== null &&
          row[scatterX] !== undefined &&
          row[scatterY] !== null &&
          row[scatterY] !== undefined,
      )
      .map((row) => ({
        x: Number(row[scatterX]),
        y: Number(row[scatterY]),
        name: row[scatterX],
      }))
  }, [processedData, scatterX, scatterY])

  // Prepare data for box plot
  const boxPlotData = useMemo(() => {
    if (!processedData.length || !numericColumns.length) return []

    return numericColumns.map((column) => {
      const values = processedData
        .map((row) => Number(row[column]))
        .filter((val) => !isNaN(val))
        .sort((a, b) => a - b)

      if (!values.length) {
        return {
          name: column,
          min: 0,
          q1: 0,
          median: 0,
          q3: 0,
          max: 0,
        }
      }

      const min = values[0]
      const max = values[values.length - 1]
      const q1Index = Math.floor(values.length * 0.25)
      const medianIndex = Math.floor(values.length * 0.5)
      const q3Index = Math.floor(values.length * 0.75)

      return {
        name: column,
        min,
        q1: values[q1Index],
        median: values[medianIndex],
        q3: values[q3Index],
        max,
      }
    })
  }, [processedData, numericColumns])

  // Calculate correlation coefficient
  const correlationCoefficient = useMemo(() => {
    if (!scatterData.length || scatterX === scatterY) return null

    const n = scatterData.length
    const sumX = scatterData.reduce((acc, point) => acc + point.x, 0)
    const sumY = scatterData.reduce((acc, point) => acc + point.y, 0)
    const sumXY = scatterData.reduce((acc, point) => acc + point.x * point.y, 0)
    const sumXSquare = scatterData.reduce((acc, point) => acc + point.x * point.x, 0)
    const sumYSquare = scatterData.reduce((acc, point) => acc + point.y * point.y, 0)

    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumXSquare - sumX * sumX) * (n * sumYSquare - sumY * sumY))

    if (denominator === 0) return null

    return (numerator / denominator).toFixed(4)
  }, [scatterData, scatterX, scatterY])

  // Calculate correlation matrix for numeric columns
  const correlationMatrix = useMemo(() => {
    if (!processedData.length || numericColumns.length < 2) return []

    const matrix = []

    for (let i = 0; i < numericColumns.length; i++) {
      const row = []
      for (let j = 0; j < numericColumns.length; j++) {
        if (i === j) {
          row.push(1) // Correlation of a variable with itself is 1
          continue
        }

        const col1 = numericColumns[i]
        const col2 = numericColumns[j]

        const validPairs = processedData.filter(
          (dataRow) =>
            dataRow[col1] !== null &&
            dataRow[col1] !== undefined &&
            dataRow[col2] !== null &&
            dataRow[col2] !== undefined &&
            !isNaN(Number(dataRow[col1])) &&
            !isNaN(Number(dataRow[col2])),
        )

        if (validPairs.length < 2) {
          row.push(0)
          continue
        }

        const x = validPairs.map((dataRow) => Number(dataRow[col1]))
        const y = validPairs.map((dataRow) => Number(dataRow[col2]))

        const n = validPairs.length
        const sumX = x.reduce((acc, val) => acc + val, 0)
        const sumY = y.reduce((acc, val) => acc + val, 0)
        const sumXY = x.reduce((acc, val, idx) => acc + val * y[idx], 0)
        const sumXSquare = x.reduce((acc, val) => acc + val * val, 0)
        const sumYSquare = y.reduce((acc, val) => acc + val * val, 0)

        const numerator = n * sumXY - sumX * sumY
        const denominator = Math.sqrt((n * sumXSquare - sumX * sumX) * (n * sumYSquare - sumY * sumY))

        if (denominator === 0) {
          row.push(0)
        } else {
          row.push(numerator / denominator)
        }
      }
      matrix.push(row)
    }

    return matrix
  }, [processedData, numericColumns])

  // Get color for correlation value
  const getCorrelationColor = (value) => {
    if (value === 1) return "#ffffff" // White for self-correlation
    if (value > 0.7) return "#1a9641" // Strong positive - green
    if (value > 0.3) return "#a6d96a" // Moderate positive - light green
    if (value > -0.3) return "#ffffbf" // Weak correlation - yellow
    if (value > -0.7) return "#fdae61" // Moderate negative - orange
    return "#d7191c" // Strong negative - red
  }

  // Calculate outliers for selected column
  const outlierData = useMemo(() => {
    if (!selectedColumn || !processedData.length || columnTypes[selectedColumn] !== "number") {
      return { outliers: [], thresholds: { lower: 0, upper: 0 }, data: [] }
    }

    const values = processedData
      .map((row) => ({ value: Number(row[selectedColumn]), original: row }))
      .filter((item) => !isNaN(item.value))

    if (values.length === 0) return { outliers: [], thresholds: { lower: 0, upper: 0 }, data: [] }

    // Calculate mean and standard deviation
    const sum = values.reduce((acc, item) => acc + item.value, 0)
    const mean = sum / values.length
    const squaredDiffs = values.map((item) => Math.pow(item.value - mean, 2))
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length
    const stdDev = Math.sqrt(variance)

    // Z-score method
    const lowerThreshold = mean - outlierThreshold * stdDev
    const upperThreshold = mean + outlierThreshold * stdDev

    const outliers = values.filter((item) => item.value < lowerThreshold || item.value > upperThreshold)

    // Prepare data for visualization
    const histogramData = []
    const min = Math.min(...values.map((item) => item.value))
    const max = Math.max(...values.map((item) => item.value))
    const range = max - min
    const binWidth = range / 20

    // Create bins
    for (let i = 0; i < 20; i++) {
      const binStart = min + i * binWidth
      const binEnd = min + (i + 1) * binWidth
      const binCount = values.filter((item) => item.value >= binStart && item.value < binEnd).length

      histogramData.push({
        bin: `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`,
        count: binCount,
        isOutlierBin: binStart < lowerThreshold || binStart > upperThreshold,
      })
    }

    return {
      outliers,
      thresholds: { lower: lowerThreshold, upper: upperThreshold },
      data: histogramData,
      stats: {
        mean,
        stdDev,
        outlierCount: outliers.length,
        outlierPercent: ((outliers.length / values.length) * 100).toFixed(2),
      },
    }
  }, [processedData, selectedColumn, outlierThreshold, columnTypes])

  // Time series analysis
  const timeSeriesData = useMemo(() => {
    if (!selectedTimeColumn || !selectedValueColumn || !processedData.length) {
      return { data: [], stats: {} }
    }

    // Extract and sort time series data
    const data = processedData
      .filter(
        (row) =>
          row[selectedTimeColumn] !== null &&
          row[selectedTimeColumn] !== undefined &&
          row[selectedValueColumn] !== null &&
          row[selectedValueColumn] !== undefined,
      )
      .map((row) => ({
        time: new Date(row[selectedTimeColumn]),
        value: Number(row[selectedValueColumn]),
      }))
      .filter((item) => !isNaN(item.value) && !isNaN(item.time.getTime()))
      .sort((a, b) => a.time.getTime() - b.time.getTime())

    if (data.length < 2) return { data: [], stats: {} }

    // Format for chart
    const chartData = data.map((item) => ({
      time: item.time.toISOString().split("T")[0],
      value: item.value,
    }))

    // Calculate basic time series statistics
    const values = data.map((item) => item.value)
    const sum = values.reduce((acc, val) => acc + val, 0)
    const mean = sum / values.length

    // Calculate trend (simple linear regression)
    const n = data.length
    const xValues = Array.from({ length: n }, (_, i) => i)
    const sumX = xValues.reduce((acc, val) => acc + val, 0)
    const sumY = values.reduce((acc, val) => acc + val, 0)
    const sumXY = xValues.reduce((acc, val, idx) => acc + val * values[idx], 0)
    const sumXSquare = xValues.reduce((acc, val) => acc + val * val, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXSquare - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    // Add trend line to chart data
    const trendData = chartData.map((item, idx) => ({
      ...item,
      trend: intercept + slope * idx,
    }))

    // Calculate seasonality (simple moving average)
    const windowSize = Math.min(7, Math.floor(data.length / 3))
    const movingAvg = []

    for (let i = 0; i < values.length; i++) {
      if (i < windowSize - 1) {
        movingAvg.push(null)
      } else {
        const windowSum = values.slice(i - windowSize + 1, i + 1).reduce((acc, val) => acc + val, 0)
        movingAvg.push(windowSum / windowSize)
      }
    }

    // Add moving average to chart data
    const finalData = trendData.map((item, idx) => ({
      ...item,
      movingAvg: movingAvg[idx],
    }))

    return {
      data: finalData,
      stats: {
        mean: mean.toFixed(2),
        trend: slope.toFixed(4),
        trendDirection: slope > 0 ? "Increasing" : slope < 0 ? "Decreasing" : "Stable",
        firstDate: data[0].time.toISOString().split("T")[0],
        lastDate: data[data.length - 1].time.toISOString().split("T")[0],
        dataPoints: data.length,
      },
    }
  }, [processedData, selectedTimeColumn, selectedValueColumn])

  // Feature importance (based on correlation with other features)
  const featureImportance = useMemo(() => {
    if (!numericColumns.length || numericColumns.length < 2) {
      return []
    }

    // Calculate absolute correlation of each feature with all other features
    const importanceScores = numericColumns.map((column) => {
      const otherColumns = numericColumns.filter((col) => col !== column)
      let totalAbsCorrelation = 0
      let validCorrelations = 0

      otherColumns.forEach((otherCol) => {
        const validPairs = processedData.filter(
          (row) =>
            row[column] !== null &&
            row[column] !== undefined &&
            row[otherCol] !== null &&
            row[otherCol] !== undefined &&
            !isNaN(Number(row[column])) &&
            !isNaN(Number(row[otherCol])),
        )

        if (validPairs.length < 2) return

        const x = validPairs.map((row) => Number(row[column]))
        const y = validPairs.map((row) => Number(row[otherCol]))

        const n = validPairs.length
        const sumX = x.reduce((acc, val) => acc + val, 0)
        const sumY = y.reduce((acc, val) => acc + val, 0)
        const sumXY = x.reduce((acc, val, idx) => acc + val * y[idx], 0)
        const sumXSquare = x.reduce((acc, val) => acc + val * val, 0)
        const sumYSquare = y.reduce((acc, val) => acc + val * val, 0)

        const numerator = n * sumXY - sumX * sumY
        const denominator = Math.sqrt((n * sumXSquare - sumX * sumX) * (n * sumYSquare - sumY * sumY))

        if (denominator !== 0) {
          const correlation = numerator / denominator
          totalAbsCorrelation += Math.abs(correlation)
          validCorrelations++
        }
      })

      const avgAbsCorrelation = validCorrelations > 0 ? totalAbsCorrelation / validCorrelations : 0

      return {
        feature: column,
        importance: avgAbsCorrelation,
      }
    })

    // Sort by importance
    return importanceScores.sort((a, b) => b.importance - a.importance)
  }, [processedData, numericColumns])

  // Data quality assessment
  const dataQuality = useMemo(() => {
    if (!processedData.length || !columns.length) return { overall: 0, metrics: [] }

    const metrics = columns.map((column) => {
      // Count total, missing, and unique values
      const totalCount = processedData.length
      let missingCount = 0
      const uniqueValues = new Set()
      let outOfRangeCount = 0
      let zeroCount = 0
      let negativeCount = 0

      processedData.forEach((row) => {
        const value = row[column]

        if (value === null || value === undefined || value === "") {
          missingCount++
        } else {
          uniqueValues.add(value)

          if (columnTypes[column] === "number") {
            const numValue = Number(value)
            if (numValue === 0) zeroCount++
            if (numValue < 0) negativeCount++

            // Check for potential outliers (very simple check)
            if (Math.abs(numValue) > 1e6) outOfRangeCount++
          }
        }
      })

      const uniqueCount = uniqueValues.size
      const completeness = ((totalCount - missingCount) / totalCount) * 100
      const uniqueness = (uniqueCount / (totalCount - missingCount)) * 100 || 0

      // Calculate validity based on column type
      let validity = 100
      if (columnTypes[column] === "number") {
        validity = ((totalCount - missingCount - outOfRangeCount) / totalCount) * 100
      }

      // Overall quality score (weighted average)
      const qualityScore = completeness * 0.5 + uniqueness * 0.3 + validity * 0.2

      return {
        column,
        type: columnTypes[column],
        completeness: completeness.toFixed(1),
        uniqueness: uniqueness.toFixed(1),
        validity: validity.toFixed(1),
        qualityScore: qualityScore.toFixed(1),
        missingCount,
        uniqueCount,
        zeroCount,
        negativeCount,
        outOfRangeCount,
      }
    })

    // Calculate overall data quality
    const overallQuality = metrics.reduce((acc, metric) => acc + Number(metric.qualityScore), 0) / metrics.length

    return {
      overall: overallQuality.toFixed(1),
      metrics: metrics.sort((a, b) => Number(b.qualityScore) - Number(a.qualityScore)),
    }
  }, [processedData, columns, columnTypes])

  // Distribution analysis
  const distributionAnalysis = useMemo(() => {
    if (!selectedDistColumn || !processedData.length || columnTypes[selectedDistColumn] !== "number") {
      return { histogramData: [], stats: {} }
    }

    const values = processedData.map((row) => Number(row[selectedDistColumn])).filter((val) => !isNaN(val))

    if (values.length === 0) return { histogramData: [], stats: {} }

    // Calculate basic statistics
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min
    const sum = values.reduce((acc, val) => acc + val, 0)
    const mean = sum / values.length
    const sortedValues = [...values].sort((a, b) => a - b)
    const median = sortedValues[Math.floor(values.length / 2)]

    // Calculate standard deviation
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2))
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length
    const stdDev = Math.sqrt(variance)

    // Create histogram data
    const histogramData = []
    const binWidth = range / binCount

    for (let i = 0; i < binCount; i++) {
      const binStart = min + i * binWidth
      const binEnd = min + (i + 1) * binWidth
      const binValues = values.filter((val) => val >= binStart && val < binEnd)

      histogramData.push({
        bin: `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`,
        count: binValues.length,
        frequency: (binValues.length / values.length) * 100,
      })
    }

    // Check for normality (simple skewness and kurtosis check)
    const cubedDiffs = values.map((val) => Math.pow((val - mean) / stdDev, 3))
    const skewness = cubedDiffs.reduce((acc, val) => acc + val, 0) / values.length

    const fourthDiffs = values.map((val) => Math.pow((val - mean) / stdDev, 4))
    const kurtosis = fourthDiffs.reduce((acc, val) => acc + val, 0) / values.length - 3 // Excess kurtosis

    const isNormalDistribution = Math.abs(skewness) < 0.5 && Math.abs(kurtosis) < 0.5

    return {
      histogramData,
      stats: {
        min: min.toFixed(2),
        max: max.toFixed(2),
        mean: mean.toFixed(2),
        median: median.toFixed(2),
        stdDev: stdDev.toFixed(2),
        skewness: skewness.toFixed(2),
        kurtosis: kurtosis.toFixed(2),
        isNormalDistribution,
      },
    }
  }, [processedData, selectedDistColumn, columnTypes, binCount])

  // Statistical tests
  const statisticalTests = useMemo(() => {
    if (!selectedTestColumn1 || !selectedTestColumn2 || !processedData.length) {
      return { result: null, data: [] }
    }

    // Extract data for the test
    const data1 = processedData.map((row) => Number(row[selectedTestColumn1])).filter((val) => !isNaN(val))

    let data2 = []
    let groups = []

    if (selectedTestType === "ttest" || selectedTestType === "anova") {
      // For t-test, we need two numerical columns
      data2 = processedData.map((row) => Number(row[selectedTestColumn2])).filter((val) => !isNaN(val))
    } else if (selectedTestType === "chisquare") {
      // For chi-square, we need a categorical column and a numerical column
      const categoricalData = processedData
        .filter(
          (row) =>
            row[selectedGroupColumn] !== null &&
            row[selectedGroupColumn] !== undefined &&
            row[selectedTestColumn1] !== null &&
            row[selectedTestColumn1] !== undefined,
        )
        .map((row) => ({
          group: String(row[selectedGroupColumn]),
          value: Number(row[selectedTestColumn1]),
        }))
        .filter((item) => !isNaN(item.value))

      // Get unique groups
      groups = [...new Set(categoricalData.map((item) => item.group))]

      // Group data by category
      groups.forEach((group) => {
        const groupData = categoricalData.filter((item) => item.group === group).map((item) => item.value)

        data2.push({
          group,
          data: groupData,
        })
      })
    }

    // Perform the statistical test
    let result = null

    if (selectedTestType === "ttest" && data1.length > 0 && data2.length > 0) {
      // Perform t-test
      const n1 = data1.length
      const n2 = data2.length
      const mean1 = data1.reduce((acc, val) => acc + val, 0) / n1
      const mean2 = data2.reduce((acc, val) => acc + val, 0) / n2

      const squaredDiffs1 = data1.map((val) => Math.pow(val - mean1, 2))
      const variance1 = squaredDiffs1.reduce((acc, val) => acc + val, 0) / (n1 - 1)

      const squaredDiffs2 = data2.map((val) => Math.pow(val - mean2, 2))
      const variance2 = squaredDiffs2.reduce((acc, val) => acc + val, 0) / (n2 - 1)

      // Pooled variance for t-test
      const pooledVariance = ((n1 - 1) * variance1 + (n2 - 1) * variance2) / (n1 + n2 - 2)
      const standardError = Math.sqrt(pooledVariance * (1 / n1 + 1 / n2))

      const tStat = (mean1 - mean2) / standardError
      const degreesOfFreedom = n1 + n2 - 2

      // Simple p-value approximation (not accurate but gives a sense)
      const pValue = 2 * (1 - Math.min(0.9999, Math.abs(tStat) / Math.sqrt(degreesOfFreedom)))

      result = {
        testType: "Independent Samples T-Test",
        tStat: tStat.toFixed(4),
        degreesOfFreedom,
        pValue: pValue.toFixed(4),
        significant: pValue < 0.05,
        mean1: mean1.toFixed(2),
        mean2: mean2.toFixed(2),
        n1,
        n2,
      }

      // Prepare data for visualization
      const visualizationData = [
        { group: selectedTestColumn1, mean: mean1, stderr: Math.sqrt(variance1 / n1) },
        { group: selectedTestColumn2, mean: mean2, stderr: Math.sqrt(variance2 / n2) },
      ]

      return { result, data: visualizationData }
    }

    // For other test types, return placeholder
    return {
      result: {
        testType:
          selectedTestType === "ttest" ? "T-Test" : selectedTestType === "chisquare" ? "Chi-Square Test" : "ANOVA",
        message: "Insufficient data for test",
      },
      data: [],
    }
  }, [processedData, selectedTestType, selectedTestColumn1, selectedTestColumn2, selectedGroupColumn])

  // Bivariate analysis
  const bivariateAnalysis = useMemo(() => {
    if (!selectedColumn || !selectedValueColumn || !processedData.length) {
      return { data: [] }
    }

    // Check if we're doing categorical-numerical or numerical-numerical analysis
    const isCategoricalAnalysis = columnTypes[selectedColumn] === "string" || columnTypes[selectedColumn] === "boolean"

    if (isCategoricalAnalysis) {
      // Categorical-numerical analysis
      const categories = {}

      processedData.forEach((row) => {
        const category =
          row[selectedColumn] !== null && row[selectedColumn] !== undefined ? String(row[selectedColumn]) : "N/A"

        const value = Number(row[selectedValueColumn])

        if (isNaN(value)) return

        if (!categories[category]) {
          categories[category] = {
            values: [],
            sum: 0,
            count: 0,
          }
        }

        categories[category].values.push(value)
        categories[category].sum += value
        categories[category].count++
      })

      // Calculate statistics for each category
      const categoryStats = Object.entries(categories).map(([category, data]) => {
        const { values, sum, count } = data

        if (count === 0) return { category, mean: 0, median: 0, min: 0, max: 0 }

        const mean = sum / count
        const sortedValues = [...values].sort((a, b) => a - b)
        const median = sortedValues[Math.floor(values.length / 2)]
        const min = Math.min(...values)
        const max = Math.max(...values)

        return {
          category,
          mean,
          median,
          min,
          max,
          count,
        }
      })

      // Sort by mean value
      categoryStats.sort((a, b) => b.mean - a.mean)

      // Prepare data for visualization
      const chartData = categoryStats.map((stat) => ({
        category: stat.category,
        mean: stat.mean,
        median: stat.median,
        min: stat.min,
        max: stat.max,
      }))

      return {
        data: chartData,
        type: "categorical-numerical",
      }
    } else {
      // Numerical-numerical analysis (similar to scatter plot)
      return {
        data: scatterData,
        type: "numerical-numerical",
        correlation: correlationCoefficient,
      }
    }
  }, [processedData, selectedColumn, selectedValueColumn, columnTypes, scatterData, correlationCoefficient])

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="hidden lg:block">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 xl:grid-cols-10 h-auto p-1">
            <TabsTrigger value="summary" className="flex items-center gap-1 text-xs px-2 py-2 min-w-0">
              <TableIcon className="h-3 w-3 flex-shrink-0" />
              <span className="hidden sm:inline truncate">Summary</span>
            </TabsTrigger>
            <TabsTrigger value="distribution" className="flex items-center gap-1 text-xs px-2 py-2 min-w-0">
              <BarChart3 className="h-3 w-3 flex-shrink-0" />
              <span className="hidden sm:inline truncate">Distributions</span>
            </TabsTrigger>
            <TabsTrigger value="correlation" className="flex items-center gap-1 text-xs px-2 py-2 min-w-0">
              <ScatterIcon className="h-3 w-3 flex-shrink-0" />
              <span className="hidden sm:inline truncate">Correlations</span>
            </TabsTrigger>
            <TabsTrigger value="boxplot" className="flex items-center gap-1 text-xs px-2 py-2 min-w-0">
              <BoxSelect className="h-3 w-3 flex-shrink-0" />
              <span className="hidden sm:inline truncate">Box Plot</span>
            </TabsTrigger>
            <TabsTrigger value="outliers" className="flex items-center gap-1 text-xs px-2 py-2 min-w-0">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              <span className="hidden sm:inline truncate">Outliers</span>
            </TabsTrigger>
            <TabsTrigger value="timeseries" className="flex items-center gap-1 text-xs px-2 py-2 min-w-0">
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span className="hidden sm:inline truncate">Time Series</span>
            </TabsTrigger>
            <TabsTrigger value="importance" className="flex items-center gap-1 text-xs px-2 py-2 min-w-0">
              <Gauge className="h-3 w-3 flex-shrink-0" />
              <span className="hidden sm:inline truncate">Importance</span>
            </TabsTrigger>
            <TabsTrigger value="quality" className="flex items-center gap-1 text-xs px-2 py-2 min-w-0">
              <Fingerprint className="h-3 w-3 flex-shrink-0" />
              <span className="hidden sm:inline truncate">Quality</span>
            </TabsTrigger>
            <TabsTrigger value="distributions" className="flex items-center gap-1 text-xs px-2 py-2 min-w-0">
              <BarChart2 className="h-3 w-3 flex-shrink-0" />
              <span className="hidden sm:inline truncate">Dist. Fitting</span>
            </TabsTrigger>
            <TabsTrigger value="tests" className="flex items-center gap-1 text-xs px-2 py-2 min-w-0">
              <Activity className="h-3 w-3 flex-shrink-0" />
              <span className="hidden sm:inline truncate">Tests</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Mobile Navigation Dropdown */}
        <div className="block lg:hidden mb-4">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full h-12">
              <SelectValue placeholder="Select analysis type" />
            </SelectTrigger>
            <SelectContent className="max-h-[400px]">
              <SelectItem value="summary">
                <div className="flex items-center gap-3 py-1">
                  <TableIcon className="h-4 w-4 flex-shrink-0" />
                  <div className="flex flex-col items-start min-w-0">
                    <span className="font-medium">Summary Statistics</span>
                    <span className="text-xs text-muted-foreground truncate">Basic stats for numerical columns</span>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="distribution">
                <div className="flex items-center gap-3 py-1">
                  <BarChart3 className="h-4 w-4 flex-shrink-0" />
                  <div className="flex flex-col items-start min-w-0">
                    <span className="font-medium">Frequency Distributions</span>
                    <span className="text-xs text-muted-foreground truncate">Value frequency analysis</span>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="correlation">
                <div className="flex items-center gap-3 py-1">
                  <ScatterIcon className="h-4 w-4 flex-shrink-0" />
                  <div className="flex flex-col items-start min-w-0">
                    <span className="font-medium">Correlation Analysis</span>
                    <span className="text-xs text-muted-foreground truncate">Variable relationships</span>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="boxplot">
                <div className="flex items-center gap-3 py-1">
                  <BoxSelect className="h-4 w-4 flex-shrink-0" />
                  <div className="flex flex-col items-start min-w-0">
                    <span className="font-medium">Box Plot Analysis</span>
                    <span className="text-xs text-muted-foreground truncate">Distribution visualization</span>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="outliers">
                <div className="flex items-center gap-3 py-1">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <div className="flex flex-col items-start min-w-0">
                    <span className="font-medium">Outlier Detection</span>
                    <span className="text-xs text-muted-foreground truncate">Identify unusual values</span>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="timeseries">
                <div className="flex items-center gap-3 py-1">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <div className="flex flex-col items-start min-w-0">
                    <span className="font-medium">Time Series Analysis</span>
                    <span className="text-xs text-muted-foreground truncate">Temporal data patterns</span>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="importance">
                <div className="flex items-center gap-3 py-1">
                  <Gauge className="h-4 w-4 flex-shrink-0" />
                  <div className="flex flex-col items-start min-w-0">
                    <span className="font-medium">Feature Importance</span>
                    <span className="text-xs text-muted-foreground truncate">Variable significance</span>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="quality">
                <div className="flex items-center gap-3 py-1">
                  <Fingerprint className="h-4 w-4 flex-shrink-0" />
                  <div className="flex flex-col items-start min-w-0">
                    <span className="font-medium">Data Quality Assessment</span>
                    <span className="text-xs text-muted-foreground truncate">Completeness and validity</span>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="distributions">
                <div className="flex items-center gap-3 py-1">
                  <BarChart2 className="h-4 w-4 flex-shrink-0" />
                  <div className="flex flex-col items-start min-w-0">
                    <span className="font-medium">Distribution Fitting</span>
                    <span className="text-xs text-muted-foreground truncate">Statistical distribution analysis</span>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="tests">
                <div className="flex items-center gap-3 py-1">
                  <Activity className="h-4 w-4 flex-shrink-0" />
                  <div className="flex flex-col items-start min-w-0">
                    <span className="font-medium">Statistical Tests</span>
                    <span className="text-xs text-muted-foreground truncate">Hypothesis testing</span>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Summary Statistics</CardTitle>
              <CardDescription>Key statistics for numerical columns in your dataset</CardDescription>
            </CardHeader>
            <CardContent>
              {numericColumns.length > 0 ? (
                <div className="overflow-x-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background border-r min-w-[100px]">Column</TableHead>
                        <TableHead className="text-center min-w-[60px]">Count</TableHead>
                        <TableHead className="text-center min-w-[70px]">Mean</TableHead>
                        <TableHead className="text-center min-w-[70px]">Median</TableHead>
                        <TableHead className="text-center min-w-[60px]">Min</TableHead>
                        <TableHead className="text-center min-w-[60px]">Max</TableHead>
                        <TableHead className="text-center min-w-[70px]">Range</TableHead>
                        <TableHead className="text-center min-w-[70px]">Std Dev</TableHead>
                        <TableHead className="text-center min-w-[80px]">Skewness</TableHead>
                        <TableHead className="text-center min-w-[80px]">Missing %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {numericColumns.map((column) => (
                        <TableRow key={column}>
                          <TableCell className="sticky left-0 bg-background border-r font-medium">
                            <div className="truncate max-w-[100px]" title={column}>
                              {column}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{summaryStats[column]?.count || "N/A"}</TableCell>
                          <TableCell className="text-center">{summaryStats[column]?.mean || "N/A"}</TableCell>
                          <TableCell className="text-center">{summaryStats[column]?.median || "N/A"}</TableCell>
                          <TableCell className="text-center">{summaryStats[column]?.min || "N/A"}</TableCell>
                          <TableCell className="text-center">{summaryStats[column]?.max || "N/A"}</TableCell>
                          <TableCell className="text-center">{summaryStats[column]?.range || "N/A"}</TableCell>
                          <TableCell className="text-center">{summaryStats[column]?.stdDev || "N/A"}</TableCell>
                          <TableCell className="text-center">{summaryStats[column]?.skewness || "N/A"}</TableCell>
                          <TableCell className="text-center">
                            {summaryStats[column]?.missingPercent || "N/A"}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground">No numerical columns found in the dataset.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Categorical Data Summary</CardTitle>
              <CardDescription>Frequency analysis of categorical columns</CardDescription>
            </CardHeader>
            <CardContent>
              {categoricalColumns.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {categoricalColumns.map((column) => (
                    <div key={column} className="border rounded-lg p-4">
                      <h3 className="text-lg font-medium mb-2">{column}</h3>
                      <div className="flex justify-between text-sm text-muted-foreground mb-2">
                        <span>Unique values: {distributions[column]?.uniqueCount || 0}</span>
                        <span>Missing: {distributions[column]?.missingPercent || 0}%</span>
                      </div>
                      <div className="space-y-2 mt-4">
                        {distributions[column]?.distribution.slice(0, 5).map((item, index) => (
                          <div key={index} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="truncate max-w-[200px]">{item.name}</span>
                              <span>
                                {item.value} ({item.percentage}%)
                              </span>
                            </div>
                            <Progress value={Number(item.percentage)} className="h-2" />
                          </div>
                        ))}
                        {distributions[column]?.distribution.length > 5 && (
                          <p className="text-xs text-muted-foreground text-right mt-2">
                            +{distributions[column].distribution.length - 5} more categories
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No categorical columns found in the dataset.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Frequency Distribution</CardTitle>
              <CardDescription>Analyze the distribution of values in categorical columns</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {categoricalColumns.length > 0 ? (
                <>
                  <div className="space-y-2">
                    <Label>Select Column</Label>
                    <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select column" />
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

                  {selectedColumn && distributions[selectedColumn] && (
                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={distributions[selectedColumn].distribution.slice(0, 20)} // Limit to top 20 categories
                          margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={70}
                            interval={0}
                            label={{ value: selectedColumn, position: "insideBottom", offset: -10 }}
                          />
                          <YAxis label={{ value: "Frequency", angle: -90, position: "insideLeft" }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="value" fill="#8884d8" name="Frequency">
                            {distributions[selectedColumn].distribution.slice(0, 20).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={`hsl(${(index * 15) % 360}, 70%, 60%)`} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">No categorical columns found in the dataset.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correlation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Correlation Analysis</CardTitle>
              <CardDescription>Analyze relationships between numerical variables</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {numericColumns.length >= 2 ? (
                <>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>X-Axis</Label>
                      <Select value={scatterX} onValueChange={setScatterX}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select X-Axis" />
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

                    <div className="space-y-2">
                      <Label>Y-Axis</Label>
                      <Select value={scatterY} onValueChange={setScatterY}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Y-Axis" />
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

                  {scatterX && scatterY && (
                    <>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              type="number"
                              dataKey="x"
                              name={scatterX}
                              label={{ value: scatterX, position: "bottom", offset: 0 }}
                            />
                            <YAxis
                              type="number"
                              dataKey="y"
                              name={scatterY}
                              label={{ value: scatterY, angle: -90, position: "insideLeft" }}
                            />
                            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                            <Scatter name={`${scatterX} vs ${scatterY}`} data={scatterData} fill="#8884d8" />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="mt-4 p-4 border rounded-md bg-muted/50">
                        <p className="font-medium">
                          Correlation Coefficient: {correlationCoefficient !== null ? correlationCoefficient : "N/A"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {correlationCoefficient !== null && (
                            <>
                              {Math.abs(Number(correlationCoefficient)) > 0.7
                                ? "Strong"
                                : Math.abs(Number(correlationCoefficient)) > 0.3
                                  ? "Moderate"
                                  : "Weak"}{" "}
                              {Number(correlationCoefficient) > 0 ? "positive" : "negative"} correlation.
                            </>
                          )}
                        </p>
                      </div>
                    </>
                  )}

                  <div className="mt-8">
                    <h3 className="text-lg font-medium mb-4">Correlation Matrix</h3>
                    {numericColumns.length > 0 && (
                      <div className="overflow-x-auto border rounded-md">
                        <div className="min-w-max">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="sticky left-0 bg-background border-r min-w-[120px]">
                                  Variable
                                </TableHead>
                                {numericColumns.map((column) => (
                                  <TableHead key={column} className="text-center min-w-[80px] text-xs">
                                    <div className="truncate" title={column}>
                                      {column.length > 8 ? `${column.substring(0, 8)}...` : column}
                                    </div>
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {numericColumns.map((rowColumn, rowIndex) => (
                                <TableRow key={rowColumn}>
                                  <TableCell className="sticky left-0 bg-background border-r font-medium min-w-[120px]">
                                    <div className="truncate" title={rowColumn}>
                                      {rowColumn}
                                    </div>
                                  </TableCell>
                                  {correlationMatrix[rowIndex]?.map((value, colIndex) => (
                                    <TableCell
                                      key={colIndex}
                                      className="text-center text-xs p-2"
                                      style={{
                                        backgroundColor: getCorrelationColor(value),
                                        color: Math.abs(value) > 0.7 ? "white" : "black",
                                      }}
                                      title={`${numericColumns[rowIndex]} vs ${numericColumns[colIndex]}: ${value.toFixed(3)}`}
                                    >
                                      {value.toFixed(2)}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">
                  At least two numerical columns are required for correlation analysis.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="boxplot" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Box Plot Analysis</CardTitle>
              <CardDescription>Visualize the distribution of numerical variables</CardDescription>
            </CardHeader>
            <CardContent>
              {numericColumns.length > 0 ? (
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={boxPlotData}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={80} />
                      <Tooltip
                        formatter={(value, name) => [value.toFixed(2), name]}
                        labelFormatter={(label) => `Column: ${label}`}
                      />
                      <Legend />
                      {/* Min to Q1 */}
                      <Bar
                        dataKey="min"
                        fill="#8884d8"
                        name="Min"
                        stackId="stack"
                        barSize={20}
                        isAnimationActive={false}
                      />
                      {/* Q1 to Median */}
                      <Bar
                        dataKey={(data) => data.q1 - data.min}
                        fill="#82ca9d"
                        name="Q1"
                        stackId="stack"
                        barSize={20}
                        isAnimationActive={false}
                      />
                      {/* Median to Q3 */}
                      <Bar
                        dataKey={(data) => data.median - data.q1}
                        fill="#ffc658"
                        name="Median"
                        stackId="stack"
                        barSize={20}
                        isAnimationActive={false}
                      />
                      {/* Q3 to Max */}
                      <Bar
                        dataKey={(data) => data.q3 - data.median}
                        fill="#ff8042"
                        name="Q3"
                        stackId="stack"
                        barSize={20}
                        isAnimationActive={false}
                      />
                      <Bar
                        dataKey={(data) => data.max - data.q3}
                        fill="#0088FE"
                        name="Max"
                        stackId="stack"
                        barSize={20}
                        isAnimationActive={false}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-muted-foreground">No numerical columns found in the dataset.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Outlier Detection</CardTitle>
              <CardDescription>Identify and analyze outliers in your numerical data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {numericColumns.length > 0 ? (
                <>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Select Column</Label>
                      <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select column" />
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

                    <div className="space-y-2">
                      <Label>Z-Score Threshold: {outlierThreshold}</Label>
                      <Slider
                        value={[outlierThreshold]}
                        min={1}
                        max={5}
                        step={0.1}
                        onValueChange={(value) => setOutlierThreshold(value[0])}
                      />
                      <div className="flex items-center space-x-2 mt-2">
                        <Switch id="show-outliers" checked={showOutliers} onCheckedChange={setShowOutliers} />
                        <Label htmlFor="show-outliers">Highlight Outliers</Label>
                      </div>
                    </div>
                  </div>

                  {selectedColumn && outlierData.data.length > 0 && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="p-4 border rounded-md bg-muted/30">
                          <h3 className="font-medium mb-2">Outlier Summary</h3>
                          <p className="text-sm">Mean: {outlierData.stats.mean.toFixed(2)}</p>
                          <p className="text-sm">Std Dev: {outlierData.stats.stdDev.toFixed(2)}</p>
                          <p className="text-sm">
                            Outliers: {outlierData.outliers.length} ({outlierData.stats.outlierPercent}%)
                          </p>
                        </div>
                        <div className="p-4 border rounded-md bg-muted/30">
                          <h3 className="font-medium mb-2">Lower Threshold</h3>
                          <p className="text-lg">{outlierData.thresholds.lower.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">Values below this are outliers</p>
                        </div>
                        <div className="p-4 border rounded-md bg-muted/30">
                          <h3 className="font-medium mb-2">Upper Threshold</h3>
                          <p className="text-lg">{outlierData.thresholds.upper.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">Values above this are outliers</p>
                        </div>
                      </div>

                      <div className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={outlierData.data} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="bin"
                              angle={-45}
                              textAnchor="end"
                              height={60}
                              interval={0}
                              tick={{ fontSize: 10 }}
                            />
                            <YAxis label={{ value: "Frequency", angle: -90, position: "insideLeft" }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" name="Frequency">
                              {outlierData.data.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.isOutlierBin && showOutliers ? "#ff0000" : "#8884d8"}
                                />
                              ))}
                            </Bar>
                            <ReferenceLine
                              x={outlierData.data.findIndex(
                                (d) => Number.parseFloat(d.bin.split("-")[0]) >= outlierData.thresholds.lower,
                              )}
                              stroke="green"
                              label="Lower"
                              strokeDasharray="3 3"
                            />
                            <ReferenceLine
                              x={outlierData.data.findIndex(
                                (d) => Number.parseFloat(d.bin.split("-")[0]) >= outlierData.thresholds.upper,
                              )}
                              stroke="red"
                              label="Upper"
                              strokeDasharray="3 3"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {outlierData.outliers.length > 0 && (
                        <div className="mt-4">
                          <h3 className="font-medium mb-2">Top Outliers</h3>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Value</TableHead>
                                  <TableHead>Z-Score</TableHead>
                                  <TableHead>Direction</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {outlierData.outliers.slice(0, 5).map((outlier, index) => {
                                  const zScore = (outlier.value - outlierData.stats.mean) / outlierData.stats.stdDev
                                  return (
                                    <TableRow key={index}>
                                      <TableCell>{outlier.value.toFixed(2)}</TableCell>
                                      <TableCell>{zScore.toFixed(2)}</TableCell>
                                      <TableCell>
                                        <Badge variant={zScore > 0 ? "destructive" : "default"}>
                                          {zScore > 0 ? "Above" : "Below"}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">No numerical columns found in the dataset.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeseries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Time Series Analysis</CardTitle>
              <CardDescription>Analyze trends and patterns in time-based data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dateColumns.length > 0 && numericColumns.length > 0 ? (
                <>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Time Column</Label>
                      <Select value={selectedTimeColumn} onValueChange={setSelectedTimeColumn}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select time column" />
                        </SelectTrigger>
                        <SelectContent>
                          {dateColumns.map((column) => (
                            <SelectItem key={column} value={column}>
                              {column}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Value Column</Label>
                      <Select value={selectedValueColumn} onValueChange={setSelectedValueColumn}>
                        <SelectTrigger className="w-full">
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

                  {selectedTimeColumn && selectedValueColumn && timeSeriesData.data.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="p-4 border rounded-md bg-muted/30">
                          <h3 className="font-medium mb-2">Time Range</h3>
                          <p className="text-sm">From: {timeSeriesData.stats.firstDate}</p>
                          <p className="text-sm">To: {timeSeriesData.stats.lastDate}</p>
                          <p className="text-sm">Data Points: {timeSeriesData.stats.dataPoints}</p>
                        </div>
                        <div className="p-4 border rounded-md bg-muted/30">
                          <h3 className="font-medium mb-2">Trend</h3>
                          <p className="text-sm">Direction: {timeSeriesData.stats.trendDirection}</p>
                          <p className="text-sm">Slope: {timeSeriesData.stats.trend}</p>
                        </div>
                        <div className="p-4 border rounded-md bg-muted/30">
                          <h3 className="font-medium mb-2">Statistics</h3>
                          <p className="text-sm">Mean: {timeSeriesData.stats.mean}</p>
                        </div>
                      </div>

                      <div className="h-[400px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart
                            data={timeSeriesData.data}
                            margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="time"
                              angle={-45}
                              textAnchor="end"
                              height={70}
                              interval="preserveStartEnd"
                              label={{ value: selectedTimeColumn, position: "insideBottom", offset: -10 }}
                            />
                            <YAxis label={{ value: selectedValueColumn, angle: -90, position: "insideLeft" }} />
                            <Tooltip />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke="#8884d8"
                              name={selectedValueColumn}
                              dot={{ r: 2 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="trend"
                              stroke="#ff7300"
                              name="Trend"
                              dot={false}
                              strokeWidth={2}
                            />
                            <Line
                              type="monotone"
                              dataKey="movingAvg"
                              stroke="#82ca9d"
                              name="Moving Average"
                              dot={false}
                              strokeDasharray="5 5"
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  ) : (
                    <Alert className="mt-4">
                      <AlertDescription>Select time and value columns to analyze time series data.</AlertDescription>
                    </Alert>
                  )}
                </>
              ) : (
                <Alert>
                  <AlertDescription>
                    {dateColumns.length === 0
                      ? "No date/time columns found in the dataset. Time series analysis requires at least one date column."
                      : "No numerical columns found in the dataset. Time series analysis requires at least one numerical column."}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="importance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Importance</CardTitle>
              <CardDescription>
                Analyze which features have the strongest relationships with other variables
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {numericColumns.length >= 2 ? (
                <>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={featureImportance}
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          type="number"
                          domain={[0, 1]}
                          label={{ value: "Importance Score", position: "bottom" }}
                        />
                        <YAxis type="category" dataKey="feature" width={100} />
                        <Tooltip formatter={(value) => [value.toFixed(3), "Importance"]} />
                        <Legend />
                        <Bar dataKey="importance" name="Correlation-based Importance" fill="#8884d8">
                          {featureImportance.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`hsl(${240 - index * 10}, 70%, 60%)`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4 p-4 border rounded-md bg-muted/30">
                    <h3 className="font-medium mb-2">About Feature Importance</h3>
                    <p className="text-sm text-muted-foreground">
                      This chart shows the average absolute correlation of each feature with all other numerical
                      features. Features with higher scores have stronger relationships with other variables in the
                      dataset. This is a simple measure of feature importance based on correlation analysis.
                    </p>
                  </div>

                  <div className="mt-4">
                    <h3 className="font-medium mb-2">Feature Details</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Feature</TableHead>
                          <TableHead>Importance Score</TableHead>
                          <TableHead>Relative Importance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {featureImportance.map((feature, index) => {
                          const maxImportance = featureImportance[0].importance
                          const relativeImportance = (feature.importance / maxImportance) * 100

                          return (
                            <TableRow key={feature.feature}>
                              <TableCell className="font-medium">{feature.feature}</TableCell>
                              <TableCell>{feature.importance.toFixed(3)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Progress value={relativeImportance} className="h-2 w-24" />
                                  <span>{relativeImportance.toFixed(1)}%</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">
                  At least two numerical columns are required for feature importance analysis.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Quality Assessment</CardTitle>
              <CardDescription>Evaluate the quality and completeness of your dataset</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-md bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Overall Data Quality Score</h3>
                  <Badge variant={Number(dataQuality.overall) > 80 ? "default" : "destructive"}>
                    {dataQuality.overall}%
                  </Badge>
                </div>
                <Progress
                  value={Number(dataQuality.overall)}
                  className="h-2"
                  indicatorClassName={Number(dataQuality.overall) > 80 ? "bg-green-500" : "bg-amber-500"}
                />
              </div>

              <div className="mt-4">
                <h3 className="font-medium mb-2">Column Quality Metrics</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Column</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Completeness</TableHead>
                        <TableHead>Uniqueness</TableHead>
                        <TableHead>Validity</TableHead>
                        <TableHead>Quality Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dataQuality.metrics.map((metric) => (
                        <TableRow key={metric.column}>
                          <TableCell className="font-medium">{metric.column}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{metric.type}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={Number(metric.completeness)} className="h-2 w-16" />
                              <span>{metric.completeness}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={Number(metric.uniqueness)} className="h-2 w-16" />
                              <span>{metric.uniqueness}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={Number(metric.validity)} className="h-2 w-16" />
                              <span>{metric.validity}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={Number(metric.qualityScore) > 80 ? "default" : "destructive"}>
                              {metric.qualityScore}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="mt-4 p-4 border rounded-md bg-muted/30">
                <h3 className="font-medium mb-2">Data Quality Metrics Explained</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <strong>Completeness:</strong> Percentage of non-missing values in the column
                  </li>
                  <li>
                    <strong>Uniqueness:</strong> Percentage of unique values among non-missing values
                  </li>
                  <li>
                    <strong>Validity:</strong> Percentage of values that are valid for the column's data type
                  </li>
                  <li>
                    <strong>Quality Score:</strong> Weighted average of completeness (50%), uniqueness (30%), and
                    validity (20%)
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distributions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribution Fitting</CardTitle>
              <CardDescription>
                Analyze the distribution of numerical variables and fit statistical distributions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {numericColumns.length > 0 ? (
                <>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Select Column</Label>
                      <Select value={selectedDistColumn} onValueChange={setSelectedDistColumn}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select column" />
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

                    <div className="space-y-2">
                      <Label>Number of Bins: {binCount}</Label>
                      <Slider
                        value={[binCount]}
                        min={5}
                        max={30}
                        step={1}
                        onValueChange={(value) => setBinCount(value[0])}
                      />
                    </div>
                  </div>

                  {selectedDistColumn && distributionAnalysis.histogramData.length > 0 && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="p-4 border rounded-md bg-muted/30">
                          <h3 className="font-medium mb-2">Basic Statistics</h3>
                          <p className="text-sm">Min: {distributionAnalysis.stats.min}</p>
                          <p className="text-sm">Max: {distributionAnalysis.stats.max}</p>
                          <p className="text-sm">Mean: {distributionAnalysis.stats.mean}</p>
                          <p className="text-sm">Median: {distributionAnalysis.stats.median}</p>
                        </div>
                        <div className="p-4 border rounded-md bg-muted/30">
                          <h3 className="font-medium mb-2">Distribution Shape</h3>
                          <p className="text-sm">Std Dev: {distributionAnalysis.stats.stdDev}</p>
                          <p className="text-sm">Skewness: {distributionAnalysis.stats.skewness}</p>
                          <p className="text-sm">Kurtosis: {distributionAnalysis.stats.kurtosis}</p>
                        </div>
                        <div className="p-4 border rounded-md bg-muted/30">
                          <h3 className="font-medium mb-2">Distribution Type</h3>
                          <Badge variant={distributionAnalysis.stats.isNormalDistribution ? "default" : "secondary"}>
                            {distributionAnalysis.stats.isNormalDistribution
                              ? "Normal Distribution"
                              : "Non-Normal Distribution"}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-2">
                            {distributionAnalysis.stats.isNormalDistribution
                              ? "Data appears to follow a normal distribution"
                              : "Data does not follow a normal distribution"}
                          </p>
                        </div>
                      </div>

                      <div className="h-[400px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={distributionAnalysis.histogramData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="bin"
                              angle={-45}
                              textAnchor="end"
                              height={70}
                              interval={0}
                              tick={{ fontSize: 10 }}
                              label={{ value: selectedDistColumn, position: "insideBottom", offset: -10 }}
                            />
                            <YAxis yAxisId="left" label={{ value: "Frequency", angle: -90, position: "insideLeft" }} />
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              label={{ value: "Percentage (%)", angle: 90, position: "insideRight" }}
                            />
                            <Tooltip />
                            <Legend />
                            <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Frequency" />
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey="frequency"
                              stroke="#ff7300"
                              name="Percentage (%)"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="mt-4 p-4 border rounded-md bg-muted/30">
                        <h3 className="font-medium mb-2">Distribution Interpretation</h3>
                        <p className="text-sm text-muted-foreground">
                          {Math.abs(Number(distributionAnalysis.stats.skewness)) < 0.5
                            ? "The distribution is approximately symmetric."
                            : Number(distributionAnalysis.stats.skewness) > 0
                              ? "The distribution is positively skewed (right-tailed)."
                              : "The distribution is negatively skewed (left-tailed)."}{" "}
                          {Math.abs(Number(distributionAnalysis.stats.kurtosis)) < 0.5
                            ? "The distribution has a normal peak and tail thickness."
                            : Number(distributionAnalysis.stats.kurtosis) > 0
                              ? "The distribution is leptokurtic (heavy-tailed)."
                              : "The distribution is platykurtic (light-tailed)."}
                        </p>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">No numerical columns found in the dataset.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Statistical Tests</CardTitle>
              <CardDescription>Perform statistical tests to validate hypotheses about your data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Test Type</Label>
                  <Select value={selectedTestType} onValueChange={setSelectedTestType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select test type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ttest">T-Test (Compare Means)</SelectItem>
                      <SelectItem value="chisquare">Chi-Square Test</SelectItem>
                      <SelectItem value="anova">ANOVA (Analysis of Variance)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Column 1</Label>
                  <Select value={selectedTestColumn1} onValueChange={setSelectedTestColumn1}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select first column" />
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

                {selectedTestType === "ttest" ? (
                  <div className="space-y-2">
                    <Label>Column 2</Label>
                    <Select value={selectedTestColumn2} onValueChange={setSelectedTestColumn2}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select second column" />
                      </SelectTrigger>
                      <SelectContent>
                        {numericColumns
                          .filter((col) => col !== selectedTestColumn1)
                          .map((column) => (
                            <SelectItem key={column} value={column}>
                              {column}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Group Column</Label>
                    <Select value={selectedGroupColumn} onValueChange={setSelectedGroupColumn}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select group column" />
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
                )}
              </div>

              {statisticalTests.result && (
                <div className="mt-6">
                  <div className="p-4 border rounded-md bg-muted/30 mb-4">
                    <h3 className="font-medium mb-2">{statisticalTests.result.testType} Results</h3>
                    {statisticalTests.result.message ? (
                      <p className="text-sm text-muted-foreground">{statisticalTests.result.message}</p>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm">t-statistic: {statisticalTests.result.tStat}</p>
                            <p className="text-sm">Degrees of freedom: {statisticalTests.result.degreesOfFreedom}</p>
                            <p className="text-sm">p-value: {statisticalTests.result.pValue}</p>
                          </div>
                          <div>
                            <p className="text-sm">
                              Mean of {selectedTestColumn1}: {statisticalTests.result.mean1}
                            </p>
                            <p className="text-sm">
                              Mean of {selectedTestColumn2}: {statisticalTests.result.mean2}
                            </p>
                            <p className="text-sm">
                              <Badge variant={statisticalTests.result.significant ? "destructive" : "default"}>
                                {statisticalTests.result.significant
                                  ? "Statistically Significant Difference"
                                  : "No Significant Difference"}
                              </Badge>
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          {statisticalTests.result.significant
                            ? `There is a statistically significant difference between the means of ${selectedTestColumn1} and ${selectedTestColumn2} (p < 0.05).`
                            : `There is no statistically significant difference between the means of ${selectedTestColumn1} and ${selectedTestColumn2} (p > 0.05).`}
                        </p>
                      </>
                    )}
                  </div>

                  {statisticalTests.data.length > 0 && (
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statisticalTests.data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="group" />
                          <YAxis label={{ value: "Mean Value", angle: -90, position: "insideLeft" }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="mean" fill="#8884d8" name="Mean" />
                          <ErrorBar dataKey="stderr" width={4} strokeWidth={2} stroke="#ff7300" direction="y" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
