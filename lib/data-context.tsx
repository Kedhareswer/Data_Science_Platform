"use client"

import { createContext, useState, useEffect, type ReactNode, useContext } from "react"
import Papa from "papaparse"
import * as XLSX from "xlsx"

type DataRow = Record<string, any>
type ColumnType = "string" | "number" | "date" | "boolean"

interface DataProfile {
  overview: {
    totalRows: number
    totalColumns: number
    memoryUsage: string
    duplicateRows: number
    completeness: number
  }
  columns: Record<string, ColumnProfile>
  dataQuality: DataQualityIssue[]
  correlations: Record<string, Record<string, number>>
  generatedAt: Date
}

interface ColumnProfile {
  name: string
  type: ColumnType
  count: number
  missing: number
  missingPercentage: number
  unique: number
  uniquePercentage: number
  duplicates: number
  // Numeric statistics
  mean?: number
  median?: number
  mode?: any
  std?: number
  min?: number
  max?: number
  q1?: number
  q3?: number
  skewness?: number
  kurtosis?: number
  // String statistics
  avgLength?: number
  minLength?: number
  maxLength?: number
  // Categorical statistics
  topValues?: Array<{ value: any; count: number; percentage: number }>
  // Data quality
  outliers?: number[]
  patterns?: string[]
  anomalies?: string[]
}

interface DataQualityIssue {
  type: "missing_values" | "duplicates" | "outliers" | "inconsistent_format" | "data_type_mismatch" | "unusual_patterns"
  severity: "low" | "medium" | "high"
  column?: string
  description: string
  count: number
  suggestion: string
}

interface MLModel {
  id: string
  name: string
  type: string
  createdAt: Date
  // Add other model properties as needed
}

interface ModelComparison {
  id: string
  name: string
  models: MLModel[]
  comparisonMetrics: ComparisonMetrics
  createdAt: Date
}

interface ComparisonMetrics {
  bestModel: string
  rankings: Array<{
    modelId: string
    rank: number
    score: number
    strengths: string[]
    weaknesses: string[]
  }>
  crossValidationResults: Record<string, any>
}

interface DataContextType {
  rawData: DataRow[]
  processedData: DataRow[]
  columns: string[]
  columnTypes: Record<string, ColumnType>
  isLoading: boolean
  fileName: string | null
  error: string | null
  dataProfile: DataProfile | null
  isProfileLoading: boolean
  setRawData: (data: DataRow[]) => void
  setProcessedData: (data: DataRow[]) => void
  processFile: (file: File) => Promise<void>
  applyPreprocessing: (
    type: string,
    options: {
      columns: string[]
      strategy?: string
      value?: any
      method?: string
      action?: string
    },
  ) => Promise<void>
  exportData: (format: "csv" | "xlsx") => void
  resetData: () => void
  notebookCells: NotebookCell[]
  addCell: (type: CellType, title?: string) => void
  updateCellTitle: (id: string, title: string) => void
  removeCell: (id: string) => void
  reorderCells: (startIndex: number, endIndex: number) => void
  detectOutliers: (columns: string[], method: string) => { column: string; outliers: number[] }[]
  handleOutliers: (columns: string[], method: string, action: string) => Promise<void>
  createFeature: (name: string, expression: string, type: string) => void
  binColumn: (column: string, bins: number, labels?: string[]) => void
  executeCustomCode: (code: string) => Promise<{ success: boolean; result?: any; error?: string; output?: string }>
  getDataSample: (sampleSize: number) => DataRow[]
  generateDataProfile: () => Promise<void>
  refreshDataProfile: () => Promise<void>
  trainedModels: MLModel[]
  saveTrainedModel: (model: MLModel) => void
  getTrainedModels: () => MLModel[]
  removeTrainedModel: (modelId: string) => void
  modelComparisons: ModelComparison[]
  saveModelComparison: (comparison: ModelComparison) => void
  getModelComparisons: () => ModelComparison[]
  removeModelComparison: (comparisonId: string) => void
  downloadModel: (modelId: string) => void
}

export type CellType =
  | "data"
  | "visualization"
  | "preprocessing"
  | "exploration"
  | "text"
  | "code"
  | "profile"
  | "ml-trainer"
  | "ml-predictor"
  | "ml-insights"
  | "missing-data"

export interface NotebookCell {
  id: string
  type: CellType
  title: string
  createdAt: Date
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const [rawData, setRawData] = useState<DataRow[]>([])
  const [processedData, setProcessedData] = useState<DataRow[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [columnTypes, setColumnTypes] = useState<Record<string, ColumnType>>({})
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notebookCells, setNotebookCells] = useState<NotebookCell[]>([])
  const [dataProfile, setDataProfile] = useState<DataProfile | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false)
  const [trainedModels, setTrainedModels] = useState<MLModel[]>([])
  const [modelComparisons, setModelComparisons] = useState<ModelComparison[]>([])

  // Load trained models from localStorage on initialization
  useEffect(() => {
    const storedModels = localStorage.getItem("trainedModels")
    if (storedModels) {
      try {
        const models = JSON.parse(storedModels)
        setTrainedModels(models)
      } catch (error) {
        console.error("Failed to load trained models:", error)
      }
    }
  }, [])

  // Save trained models to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("trainedModels", JSON.stringify(trainedModels))
  }, [trainedModels])

  // Load model comparisons from localStorage on initialization
  useEffect(() => {
    const storedComparisons = localStorage.getItem("modelComparisons")
    if (storedComparisons) {
      try {
        const comparisons = JSON.parse(storedComparisons)
        setModelComparisons(comparisons)
      } catch (error) {
        console.error("Failed to load model comparisons:", error)
      }
    }
  }, [])

  // Save model comparisons to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("modelComparisons", JSON.stringify(modelComparisons))
  }, [modelComparisons])

  const saveTrainedModel = (model: MLModel) => {
    setTrainedModels((prev) => {
      const existing = prev.findIndex((m) => m.id === model.id)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = model
        return updated
      } else {
        return [...prev, model]
      }
    })
  }

  const getTrainedModels = () => trainedModels

  const removeTrainedModel = (modelId: string) => {
    setTrainedModels((prev) => prev.filter((m) => m.id !== modelId))
  }

  const saveModelComparison = (comparison: ModelComparison) => {
    setModelComparisons((prev) => {
      const existing = prev.findIndex((c) => c.id === comparison.id)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = comparison
        return updated
      } else {
        return [...prev, comparison]
      }
    })
  }

  const getModelComparisons = () => modelComparisons

  const removeModelComparison = (comparisonId: string) => {
    setModelComparisons((prev) => prev.filter((c) => c.id !== comparisonId))
  }

  const downloadModel = (modelId: string) => {
    const model = trainedModels.find((m) => m.id === modelId)
    if (!model) {
      throw new Error("Model not found")
    }

    // Create a comprehensive model package
    const modelPackage = {
      model: model,
      metadata: {
        exportedAt: new Date().toISOString(),
        dataColumns: columns,
        columnTypes: columnTypes,
        dataShape: {
          rows: processedData.length,
          columns: columns.length,
        },
        version: "1.0.0",
      },
      implementation: {
        algorithm: model.algorithm,
        features: model.features,
        target: model.target,
        hyperparameters: model.hyperparameters,
      },
      usage: {
        description: "This model package contains a trained ML model ready for integration",
        requirements: ["Node.js", "TypeScript", "ML Models library"],
        example: `
// Import and use the model
import { ${
          model.algorithm === "linear_regression"
            ? "SimpleLinearRegression"
            : model.algorithm === "logistic_regression"
              ? "SimpleLogisticRegression"
              : model.algorithm === "kmeans"
                ? "KMeansClustering"
                : "SimpleDecisionTree"
        } } from './ml-models'

// Load model configuration
const modelConfig = ${JSON.stringify(model.hyperparameters, null, 2)}

// Create and configure model instance
const model = new ${
          model.algorithm === "linear_regression"
            ? "SimpleLinearRegression"
            : model.algorithm === "logistic_regression"
              ? "SimpleLogisticRegression"
              : model.algorithm === "kmeans"
                ? "KMeansClustering"
                : "SimpleDecisionTree"
        }()

// Use for predictions
const prediction = model.predict(inputData)
      `,
      },
    }

    // Create downloadable file
    const blob = new Blob([JSON.stringify(modelPackage, null, 2)], {
      type: "application/json;charset=utf-8;",
    })
    const link = document.createElement("a")
    const fileName = `${model.name.replace(/\s+/g, "_")}_${model.id}.json`

    link.href = URL.createObjectURL(blob)
    link.download = fileName
    link.click()
  }

  // Detect column types from data
  const detectColumnTypes = (data: DataRow[]): Record<string, ColumnType> => {
    if (!data.length) return {}

    const firstRow = data[0]
    const types: Record<string, ColumnType> = {}

    Object.keys(firstRow).forEach((key) => {
      const values = data.slice(0, 100).map((row) => row[key]) // Sample first 100 rows
      const nonEmptyValues = values.filter((v) => v !== null && v !== undefined && v !== "")

      if (nonEmptyValues.length === 0) {
        types[key] = "string"
        return
      }

      // Check if all values are numbers
      const allNumbers = nonEmptyValues.every((v) => !isNaN(Number(v)))
      if (allNumbers) {
        types[key] = "number"
        return
      }

      // Check if all values are dates
      const allDates = nonEmptyValues.every((v) => !isNaN(Date.parse(String(v))))
      if (allDates) {
        types[key] = "date"
        return
      }

      // Check if all values are booleans
      const allBooleans = nonEmptyValues.every(
        (v) => v === true || v === false || v === "true" || v === "false" || v === 0 || v === 1,
      )
      if (allBooleans) {
        types[key] = "boolean"
        return
      }

      // Default to string
      types[key] = "string"
    })

    return types
  }

  // Generate comprehensive data profile
  const generateDataProfile = async (): Promise<void> => {
    if (!processedData.length) return

    setIsProfileLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 100))

      const profile: DataProfile = {
        overview: generateOverviewProfile(),
        columns: {},
        dataQuality: [],
        correlations: {},
        generatedAt: new Date(),
      }

      // Generate column profiles
      for (const column of columns) {
        try {
          profile.columns[column] = await generateColumnProfile(column)
        } catch (err) {
          console.warn(`Failed to profile column ${column}:`, err)
          // Continue with other columns
        }
      }

      // Generate correlations for numeric columns
      const numericColumns = columns.filter((col) => columnTypes[col] === "number")
      if (numericColumns.length > 1) {
        try {
          profile.correlations = calculateCorrelations(numericColumns)
        } catch (err) {
          console.warn("Failed to calculate correlations:", err)
          profile.correlations = {}
        }
      }

      // Generate data quality issues
      try {
        profile.dataQuality = generateDataQualityIssues(profile.columns)
      } catch (err) {
        console.warn("Failed to generate data quality issues:", err)
        profile.dataQuality = []
      }

      setDataProfile(profile)
    } catch (err) {
      console.error("Error generating data profile:", err)
      setError(err instanceof Error ? err.message : "Failed to generate data profile")
    } finally {
      setIsProfileLoading(false)
    }
  }

  // Generate overview statistics
  const generateOverviewProfile = () => {
    const totalRows = processedData.length
    const totalColumns = columns.length

    // Calculate memory usage estimate
    const avgRowSize = JSON.stringify(processedData[0] || {}).length
    const memoryUsage = `${((totalRows * avgRowSize) / 1024 / 1024).toFixed(2)} MB`

    // Find duplicate rows
    const uniqueRows = new Set(processedData.map((row) => JSON.stringify(row)))
    const duplicateRows = totalRows - uniqueRows.size

    // Calculate overall completeness
    let totalCells = 0
    let filledCells = 0

    processedData.forEach((row) => {
      columns.forEach((col) => {
        totalCells++
        if (row[col] !== null && row[col] !== undefined && row[col] !== "") {
          filledCells++
        }
      })
    })

    const completeness = totalCells > 0 ? (filledCells / totalCells) * 100 : 0

    return {
      totalRows,
      totalColumns,
      memoryUsage,
      duplicateRows,
      completeness: Math.round(completeness * 100) / 100,
    }
  }

  // Generate detailed column profile
  const generateColumnProfile = async (columnName: string): Promise<ColumnProfile> => {
    const values = processedData.map((row) => row[columnName])
    const nonNullValues = values.filter((v) => v !== null && v !== undefined && v !== "")
    const type = columnTypes[columnName]

    const profile: ColumnProfile = {
      name: columnName,
      type,
      count: values.length,
      missing: values.length - nonNullValues.length,
      missingPercentage: Math.round(((values.length - nonNullValues.length) / values.length) * 10000) / 100,
      unique: new Set(nonNullValues).size,
      uniquePercentage: Math.round((new Set(nonNullValues).size / nonNullValues.length) * 10000) / 100,
      duplicates: nonNullValues.length - new Set(nonNullValues).size,
      topValues: getTopValues(nonNullValues),
      patterns: detectPatterns(nonNullValues, type),
      anomalies: detectAnomalies(nonNullValues, type),
    }

    // Add type-specific statistics
    if (type === "number") {
      const numericValues = nonNullValues.map((v) => Number(v)).filter((v) => !isNaN(v))
      if (numericValues.length > 0) {
        const sorted = [...numericValues].sort((a, b) => a - b)
        const mean = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length

        profile.mean = Math.round(mean * 1000) / 1000
        profile.median = getMedian(sorted)
        profile.std =
          Math.round(
            Math.sqrt(numericValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / numericValues.length) *
              1000,
          ) / 1000
        profile.min = Math.min(...numericValues)
        profile.max = Math.max(...numericValues)
        profile.q1 = getPercentile(sorted, 25)
        profile.q3 = getPercentile(sorted, 75)
        profile.skewness = calculateSkewness(numericValues, mean, profile.std)
        profile.kurtosis = calculateKurtosis(numericValues, mean, profile.std)
        profile.outliers = detectNumericOutliers(numericValues)
      }
    } else if (type === "string") {
      const stringValues = nonNullValues.map((v) => String(v))
      profile.avgLength =
        Math.round((stringValues.reduce((sum, val) => sum + val.length, 0) / stringValues.length) * 100) / 100
      profile.minLength = Math.min(...stringValues.map((v) => v.length))
      profile.maxLength = Math.max(...stringValues.map((v) => v.length))
    }

    // Calculate mode for all types
    profile.mode = getMode(nonNullValues)

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

  const calculateSkewness = (values: number[], mean: number, std: number): number => {
    if (std === 0) return 0
    const n = values.length
    const skew = values.reduce((sum, val) => sum + Math.pow((val - mean) / std, 3), 0) / n
    return Math.round(skew * 1000) / 1000
  }

  const calculateKurtosis = (values: number[], mean: number, std: number): number => {
    if (std === 0) return 0
    const n = values.length
    const kurt = values.reduce((sum, val) => sum + Math.pow((val - mean) / std, 4), 0) / n - 3
    return Math.round(kurt * 1000) / 1000
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
      .slice(0, 10)
      .map(([value, count]) => ({
        value,
        count,
        percentage: Math.round((count / values.length) * 10000) / 100,
      }))
  }

  const detectNumericOutliers = (values: number[]): number[] => {
    const sorted = [...values].sort((a, b) => a - b)
    const q1 = getPercentile(sorted, 25)
    const q3 = getPercentile(sorted, 75)
    const iqr = q3 - q1
    const lowerBound = q1 - 1.5 * iqr
    const upperBound = q3 + 1.5 * iqr

    return values.filter((val) => val < lowerBound || val > upperBound)
  }

  const detectPatterns = (values: any[], type: ColumnType): string[] => {
    const patterns: string[] = []

    if (type === "string") {
      const stringValues = values.map((v) => String(v))

      // Email pattern
      if (stringValues.some((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))) {
        patterns.push("Email addresses detected")
      }

      // Phone pattern
      if (stringValues.some((v) => /^\+?[\d\s\-$$$$]{10,}$/.test(v))) {
        patterns.push("Phone numbers detected")
      }

      // URL pattern
      if (stringValues.some((v) => /^https?:\/\//.test(v))) {
        patterns.push("URLs detected")
      }

      // Date-like strings
      if (stringValues.some((v) => /^\d{4}-\d{2}-\d{2}/.test(v) || /^\d{2}\/\d{2}\/\d{4}/.test(v))) {
        patterns.push("Date-like strings detected")
      }
    }

    return patterns
  }

  const detectAnomalies = (values: any[], type: ColumnType): string[] => {
    const anomalies: string[] = []

    if (type === "string") {
      const stringValues = values.map((v) => String(v))
      const lengths = stringValues.map((v) => v.length)
      const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length

      // Unusually long or short strings
      const veryLong = stringValues.filter((v) => v.length > avgLength * 3).length
      const veryShort = stringValues.filter((v) => v.length < avgLength / 3 && v.length > 0).length

      if (veryLong > 0) anomalies.push(`${veryLong} unusually long values`)
      if (veryShort > 0) anomalies.push(`${veryShort} unusually short values`)
    }

    return anomalies
  }

  const calculateCorrelations = (numericColumns: string[]): Record<string, Record<string, number>> => {
    const correlations: Record<string, Record<string, number>> = {}

    numericColumns.forEach((col1) => {
      correlations[col1] = {}
      numericColumns.forEach((col2) => {
        if (col1 === col2) {
          correlations[col1][col2] = 1
        } else {
          const values1 = processedData.map((row) => Number(row[col1])).filter((v) => !isNaN(v))
          const values2 = processedData.map((row) => Number(row[col2])).filter((v) => !isNaN(v))

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
    return Math.round((numerator / denominator) * 1000) / 1000
  }

  const generateDataQualityIssues = (columnProfiles: Record<string, ColumnProfile>): DataQualityIssue[] => {
    const issues: DataQualityIssue[] = []

    // Check for high missing value percentages
    Object.values(columnProfiles).forEach((profile) => {
      if (profile.missingPercentage > 50) {
        issues.push({
          type: "missing_values",
          severity: "high",
          column: profile.name,
          description: `Column "${profile.name}" has ${profile.missingPercentage}% missing values`,
          count: profile.missing,
          suggestion: "Consider dropping this column or using advanced imputation techniques",
        })
      } else if (profile.missingPercentage > 20) {
        issues.push({
          type: "missing_values",
          severity: "medium",
          column: profile.name,
          description: `Column "${profile.name}" has ${profile.missingPercentage}% missing values`,
          count: profile.missing,
          suggestion: "Consider imputation strategies like mean, median, or mode replacement",
        })
      }

      // Check for low uniqueness in non-categorical columns
      if (profile.type === "number" && profile.uniquePercentage < 10) {
        issues.push({
          type: "unusual_patterns",
          severity: "medium",
          column: profile.name,
          description: `Numeric column "${profile.name}" has only ${profile.uniquePercentage}% unique values`,
          count: profile.unique,
          suggestion: "This might be a categorical variable disguised as numeric",
        })
      }

      // Check for outliers
      if (profile.outliers && profile.outliers.length > 0) {
        const outlierPercentage = (profile.outliers.length / profile.count) * 100
        if (outlierPercentage > 5) {
          issues.push({
            type: "outliers",
            severity: outlierPercentage > 15 ? "high" : "medium",
            column: profile.name,
            description: `Column "${profile.name}" has ${profile.outliers.length} outliers (${outlierPercentage.toFixed(1)}%)`,
            count: profile.outliers.length,
            suggestion: "Review outliers for data entry errors or consider outlier treatment methods",
          })
        }
      }
    })

    // Check for duplicate rows
    const overview = generateOverviewProfile()
    if (overview.duplicateRows > 0) {
      const duplicatePercentage = (overview.duplicateRows / overview.totalRows) * 100
      issues.push({
        type: "duplicates",
        severity: duplicatePercentage > 10 ? "high" : "medium",
        description: `Dataset contains ${overview.duplicateRows} duplicate rows (${duplicatePercentage.toFixed(1)}%)`,
        count: overview.duplicateRows,
        suggestion: "Consider removing duplicate rows or investigating the cause of duplication",
      })
    }

    return issues.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    })
  }

  // Refresh data profile
  const refreshDataProfile = async (): Promise<void> => {
    await generateDataProfile()
  }

  // Process CSV file
  const processCSV = (file: File): Promise<DataRow[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length) {
            reject(results.errors[0].message)
            return
          }
          resolve(results.data as DataRow[])
        },
        error: (error) => {
          reject(error.message)
        },
      })
    })
  }

  // Process Excel file
  const processExcel = async (file: File): Promise<DataRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: "binary" })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)
          resolve(jsonData as DataRow[])
        } catch (error) {
          reject("Failed to parse Excel file")
        }
      }
      reader.onerror = () => {
        reject("Failed to read file")
      }
      reader.readAsBinaryString(file)
    })
  }

  // Process uploaded file
  const processFile = async (file: File) => {
    setIsLoading(true)
    setError(null)
    try {
      const fileExtension = file.name.split(".").pop()?.toLowerCase()
      let data: DataRow[] = []

      if (fileExtension === "csv") {
        data = await processCSV(file)
      } else if (fileExtension === "xlsx" || fileExtension === "xls") {
        data = await processExcel(file)
      } else {
        throw new Error("Unsupported file format")
      }

      if (data.length === 0) {
        throw new Error("No data found in file")
      }

      setFileName(file.name)
      setRawData(data)
      setProcessedData(data)
      setColumns(Object.keys(data[0]))
      setColumnTypes(detectColumnTypes(data))

      // Add initial cells to the notebook
      if (notebookCells.length === 0) {
        setNotebookCells([
          {
            id: generateId(),
            type: "data",
            title: "Data Overview",
            createdAt: new Date(),
          },
          {
            id: generateId(),
            type: "profile",
            title: "Data Profile",
            createdAt: new Date(),
          },
          {
            id: generateId(),
            type: "missing-data",
            title: "Missing Data Analysis",
            createdAt: new Date(),
          },
        ])
      }

      // Auto-generate data profile
      setTimeout(() => {
        generateDataProfile()
      }, 500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file")
    } finally {
      setIsLoading(false)
    }
  }

  // Apply preprocessing to data
  const applyPreprocessing = async (
    type: string,
    options: {
      columns: string[]
      strategy?: string
      value?: any
      method?: string
      action?: string
    },
  ) => {
    return new Promise<void>((resolve, reject) => {
      setIsLoading(true)
      const { columns: selectedColumns, strategy, value, method, action } = options

      try {
        let newData = [...processedData]

        if (type === "missing") {
          newData = handleMissingValues(newData, selectedColumns, strategy || "mean", value)
        } else if (type === "normalize") {
          newData = normalizeData(newData, selectedColumns, method || "minmax")
        } else if (type === "transform") {
          if (action === "drop") {
            newData = dropColumns(newData, selectedColumns)
            const remainingColumns = columns.filter((col) => !selectedColumns.includes(col))
            setColumns(remainingColumns)
            const newColumnTypes = { ...columnTypes }
            selectedColumns.forEach((col) => {
              delete newColumnTypes[col]
            })
            setColumnTypes(newColumnTypes)
          }
        }

        setProcessedData(newData)

        // Refresh data profile after preprocessing
        setTimeout(() => {
          generateDataProfile().finally(() => {
            setIsLoading(false)
            resolve()
          })
        }, 100)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to process data")
        setIsLoading(false)
        reject(err)
      }
    })
  }

  // Drop columns
  const dropColumns = (data: DataRow[], columnsToRemove: string[]): DataRow[] => {
    return data.map((row) => {
      const newRow = { ...row }
      columnsToRemove.forEach((col) => {
        delete newRow[col]
      })
      return newRow
    })
  }

  // Handle missing values
  const handleMissingValues = (
    data: DataRow[],
    columns: string[],
    strategy: string,
    constantValue?: any,
  ): DataRow[] => {
    if (!columns.length) return data

    const newData = [...data]
    const types = columnTypes

    columns.forEach((column) => {
      if (strategy === "drop") {
        // Filter out rows with missing values in the selected columns
        return newData.filter((row) => row[column] !== null && row[column] !== undefined && row[column] !== "")
      }

      // For other strategies, calculate replacement value
      let replacementValue: any = null

      if (strategy === "constant") {
        replacementValue = constantValue
      } else if (types[column] === "number") {
        const values = newData.map((row) => row[column]).filter((v) => v !== null && v !== undefined && v !== "")

        if (strategy === "mean") {
          const sum = values.reduce((acc, val) => acc + Number(val), 0)
          replacementValue = values.length ? sum / values.length : 0
        } else if (strategy === "median") {
          const sorted = [...values].sort((a, b) => Number(a) - Number(b))
          const mid = Math.floor(sorted.length / 2)
          replacementValue = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
        } else if (strategy === "mode") {
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

          replacementValue = mode !== null ? Number(mode) : 0
        }
      } else {
        // For non-numeric columns, use mode or empty string
        if (strategy === "mode") {
          const values = newData.map((row) => row[column]).filter((v) => v !== null && v !== undefined && v !== "")
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

          replacementValue = mode !== null ? mode : ""
        } else {
          replacementValue = ""
        }
      }

      // Replace missing values
      newData.forEach((row) => {
        if (row[column] === null || row[column] === undefined || row[column] === "") {
          row[column] = replacementValue
        }
      })
    })

    return newData
  }

  // Normalize data
  const normalizeData = (data: DataRow[], columns: string[], method: string): DataRow[] => {
    if (!columns.length) return data

    const newData = [...data]

    columns.forEach((column) => {
      if (columnTypes[column] !== "number") return

      const values = newData.map((row) => Number(row[column]))

      if (method === "minmax") {
        const min = Math.min(...values)
        const max = Math.max(...values)
        const range = max - min

        if (range === 0) return // Avoid division by zero

        newData.forEach((row) => {
          row[column] = (Number(row[column]) - min) / range
        })
      } else if (method === "zscore") {
        const mean = values.reduce((acc, val) => acc + val, 0) / values.length
        const squaredDiffs = values.map((val) => Math.pow(val - mean, 2))
        const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length
        const stdDev = Math.sqrt(variance)

        if (stdDev === 0) return // Avoid division by zero

        newData.forEach((row) => {
          row[column] = (Number(row[column]) - mean) / stdDev
        })
      } else if (method === "robust") {
        const sorted = [...values].sort((a, b) => a - b)
        const q1Index = Math.floor(sorted.length * 0.25)
        const q3Index = Math.floor(sorted.length * 0.75)
        const q1 = sorted[q1Index]
        const q3 = sorted[q3Index]
        const iqr = q3 - q1

        if (iqr === 0) return // Avoid division by zero

        newData.forEach((row) => {
          row[column] = (Number(row[column]) - q1) / iqr
        })
      }
    })

    return newData
  }

  // Export data
  const exportData = (format: "csv" | "xlsx") => {
    if (!processedData.length) return

    if (format === "csv") {
      const csv = Papa.unparse(processedData)
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const exportFileName = fileName ? `${fileName.split(".")[0]}_processed.csv` : "processed_data.csv"

      link.href = URL.createObjectURL(blob)
      link.download = exportFileName
      link.click()
    } else if (format === "xlsx") {
      const worksheet = XLSX.utils.json_to_sheet(processedData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data")

      const exportFileName = fileName ? `${fileName.split(".")[0]}_processed.xlsx` : "processed_data.xlsx"
      XLSX.writeFile(workbook, exportFileName)
    }
  }

  // Reset data
  const resetData = () => {
    setRawData([])
    setProcessedData([])
    setColumns([])
    setColumnTypes({})
    setFileName(null)
    setError(null)
    setNotebookCells([])
    setDataProfile(null)
  }

  // Generate a unique ID for notebook cells
  const generateId = () => {
    return Math.random().toString(36).substring(2, 11)
  }

  // Add a new cell to the notebook
  const addCell = (type: CellType, title?: string) => {
    const newCell: NotebookCell = {
      id: generateId(),
      type,
      title: title || getCellDefaultTitle(type),
      createdAt: new Date(),
    }
    setNotebookCells((prev) => [...prev, newCell])
  }

  // Get default title for a cell type
  const getCellDefaultTitle = (type: CellType): string => {
    switch (type) {
      case "data":
        return "Data Overview"
      case "visualization":
        return "Data Visualization"
      case "preprocessing":
        return "Data Preprocessing"
      case "exploration":
        return "Data Exploration"
      case "profile":
        return "Data Profile"
      case "missing-data":
        return "Missing Data Analysis"
      case "text":
        return "Notes"
      case "code":
        return "Code"
      case "ml-trainer":
        return "ML Model Trainer"
      case "ml-predictor":
        return "ML Predictor"
      case "ml-insights":
        return "ML Insights"
      default:
        return "New Cell"
    }
  }

  // Update a cell's title
  const updateCellTitle = (id: string, title: string) => {
    setNotebookCells((prev) => prev.map((cell) => (cell.id === id ? { ...cell, title } : cell)))
  }

  // Remove a cell from the notebook
  const removeCell = (id: string) => {
    setNotebookCells((prev) => prev.filter((cell) => cell.id !== id))
  }

  // Reorder cells
  const reorderCells = (startIndex: number, endIndex: number) => {
    if (startIndex === endIndex) return

    const result = Array.from(notebookCells)
    const [removed] = result.splice(startIndex, 1)
    result.splice(endIndex, 0, removed)
    setNotebookCells(result)
  }

  // Update columns when data changes
  useEffect(() => {
    if (rawData.length > 0) {
      setColumns(Object.keys(rawData[0]))
      setColumnTypes(detectColumnTypes(rawData))
    }
  }, [rawData])

  // Detect outliers using different methods
  const detectOutliers = (columns: string[], method: string) => {
    const results: { column: string; outliers: number[] }[] = []

    columns.forEach((column) => {
      if (columnTypes[column] !== "number") return

      const values = processedData
        .map((row, index) => ({ value: Number(row[column]), index }))
        .filter((item) => !isNaN(item.value))

      let outlierIndices: number[] = []

      if (method === "iqr") {
        const sortedValues = values.map((item) => item.value).sort((a, b) => a - b)
        const q1Index = Math.floor(sortedValues.length * 0.25)
        const q3Index = Math.floor(sortedValues.length * 0.75)
        const q1 = sortedValues[q1Index]
        const q3 = sortedValues[q3Index]
        const iqr = q3 - q1
        const lowerBound = q1 - 1.5 * iqr
        const upperBound = q3 + 1.5 * iqr

        outlierIndices = values
          .filter((item) => item.value < lowerBound || item.value > upperBound)
          .map((item) => item.index)
      } else if (method === "zscore") {
        const mean = values.reduce((sum, item) => sum + item.value, 0) / values.length
        const variance = values.reduce((sum, item) => sum + Math.pow(item.value - mean, 2), 0) / values.length
        const stdDev = Math.sqrt(variance)

        outlierIndices = values.filter((item) => Math.abs((item.value - mean) / stdDev) > 3).map((item) => item.index)
      }

      results.push({ column, outliers: outlierIndices })
    })

    return results
  }

  // Handle outliers
  const handleOutliers = async (columns: string[], method: string, action: string) => {
    return new Promise<void>((resolve, reject) => {
      setIsLoading(true)
      try {
        let newData = [...processedData]

        columns.forEach((column) => {
          if (columnTypes[column] !== "number") return

          const outlierResults = detectOutliers([column], method)
          const outlierIndices = outlierResults[0]?.outliers || []

          if (action === "remove") {
            newData = newData.filter((_, index) => !outlierIndices.includes(index))
          } else if (action === "cap") {
            const values = newData
              .map((row) => Number(row[column]))
              .filter((v) => !isNaN(v))
              .sort((a, b) => a - b)
            const p5 = values[Math.floor(values.length * 0.05)] || 0
            const p95 = values[Math.floor(values.length * 0.95)] || 0

            newData.forEach((row) => {
              const value = Number(row[column])
              if (!isNaN(value)) {
                if (value < p5) row[column] = p5
                if (value > p95) row[column] = p95
              }
            })
          } else if (action === "transform") {
            newData.forEach((row) => {
              const value = Number(row[column])
              if (!isNaN(value) && value > 0) {
                row[column] = Math.log(value)
              }
            })
          }
        })

        setProcessedData(newData)

        setTimeout(() => {
          generateDataProfile().finally(() => {
            setIsLoading(false)
            resolve()
          })
        }, 100)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to handle outliers")
        setIsLoading(false)
        reject(err)
      }
    })
  }

  // Create new feature
  const createFeature = (name: string, expression: string, type: string) => {
    setIsLoading(true)
    try {
      const newData = processedData.map((row) => {
        const newRow = { ...row }

        // Simple expression evaluation (can be expanded)
        let result: any

        if (type === "arithmetic") {
          // Replace column names with values in expression
          let evalExpression = expression
          columns.forEach((col) => {
            const regex = new RegExp(`\\b${col}\\b`, "g")
            evalExpression = evalExpression.replace(regex, `(${row[col]} || 0)`)
          })

          try {
            result = Function(`"use strict"; return (${evalExpression})`)()
          } catch {
            result = 0
          }
        } else if (type === "categorical") {
          // Simple categorical feature creation
          result = expression.includes(String(row[columns[0]])) ? "Yes" : "No"
        } else if (type === "datetime") {
          // Extract datetime features
          const date = new Date(row[columns[0]])
          if (expression === "year") result = date.getFullYear()
          else if (expression === "month") result = date.getMonth() + 1
          else if (expression === "day") result = date.getDate()
          else if (expression === "weekday") result = date.getDay()
          else result = date.getTime()
        }

        newRow[name] = result
        return newRow
      })

      setProcessedData(newData)
      setColumns([...columns, name])
      setColumnTypes({ ...columnTypes, [name]: type === "arithmetic" ? "number" : "string" })

      // Refresh data profile after feature creation
      setTimeout(() => {
        generateDataProfile()
      }, 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create feature")
    } finally {
      setIsLoading(false)
    }
  }

  // Bin column into categories
  const binColumn = (column: string, bins: number, labels?: string[]) => {
    setIsLoading(true)
    try {
      if (columnTypes[column] !== "number") {
        throw new Error("Can only bin numerical columns")
      }

      const values = processedData.map((row) => Number(row[column])).filter((v) => !isNaN(v))
      const min = Math.min(...values)
      const max = Math.max(...values)
      const binWidth = (max - min) / bins

      const newData = processedData.map((row) => {
        const value = Number(row[column])
        if (isNaN(value)) return row

        const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1)
        const binLabel = labels && labels[binIndex] ? labels[binIndex] : `Bin ${binIndex + 1}`

        return { ...row, [`${column}_binned`]: binLabel }
      })

      setProcessedData(newData)
      setColumns([...columns, `${column}_binned`])
      setColumnTypes({ ...columnTypes, [`${column}_binned`]: "string" })

      // Refresh data profile after binning
      setTimeout(() => {
        generateDataProfile()
      }, 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to bin column")
    } finally {
      setIsLoading(false)
    }
  }

  // Execute custom Python-like code
  const executeCustomCode = async (
    code: string,
  ): Promise<{ success: boolean; result?: any; error?: string; output?: string }> => {
    try {
      const logs: string[] = []

      // Create a safe execution context with data access
      const context = {
        data: processedData,
        columns: columns,
        Math: Math,
        console: {
          log: (...args: any[]) => {
            logs.push(
              args.map((arg) => (typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg))).join(" "),
            )
          },
        },
        filter: (condition: (row: any) => boolean) => processedData.filter(condition),
        map: (transform: (row: any) => any) => processedData.map(transform),
        reduce: (reducer: (acc: any, row: any) => any, initial: any) => processedData.reduce(reducer, initial),
        groupBy: (key: string) => {
          const groups: Record<string, any[]> = {}
          processedData.forEach((row) => {
            const groupKey = String(row[key] || "undefined")
            if (!groups[groupKey]) groups[groupKey] = []
            groups[groupKey].push(row)
          })
          return groups
        },
        aggregate: (column: string, operation: string) => {
          const values = processedData.map((row) => Number(row[column])).filter((v) => !isNaN(v))
          if (values.length === 0) return 0

          switch (operation) {
            case "sum":
              return values.reduce((a, b) => a + b, 0)
            case "mean":
              return values.reduce((a, b) => a + b, 0) / values.length
            case "min":
              return Math.min(...values)
            case "max":
              return Math.max(...values)
            case "count":
              return values.length
            default:
              return 0
          }
        },
      }

      // Create function with context
      const func = new Function(
        ...Object.keys(context),
        `
        "use strict";
        try {
          ${code}
        } catch (error) {
          throw new Error('Code execution error: ' + error.message);
        }
      `,
      )

      const result = func(...Object.values(context))
      return { success: true, result, output: logs.join("\n") }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Code execution failed",
        output: "",
      }
    }
  }

  // Get data sample
  const getDataSample = (sampleSize: number) => {
    if (sampleSize >= processedData.length) return processedData

    const step = Math.floor(processedData.length / sampleSize)
    return processedData.filter((_, index) => index % step === 0).slice(0, sampleSize)
  }

  const value = {
    rawData,
    processedData,
    columns,
    columnTypes,
    isLoading,
    fileName,
    error,
    dataProfile,
    isProfileLoading,
    setRawData,
    setProcessedData,
    processFile,
    applyPreprocessing,
    exportData,
    resetData,
    notebookCells,
    addCell,
    updateCellTitle,
    removeCell,
    reorderCells,
    detectOutliers,
    handleOutliers,
    createFeature,
    binColumn,
    executeCustomCode,
    getDataSample,
    generateDataProfile,
    refreshDataProfile,
    trainedModels,
    saveTrainedModel,
    getTrainedModels,
    removeTrainedModel,
    modelComparisons,
    saveModelComparison,
    getModelComparisons,
    removeModelComparison,
    downloadModel,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}
