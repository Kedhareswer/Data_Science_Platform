"use client"

import type React from "react"
import { createContext, useState, useEffect, useCallback, useMemo, useContext } from "react"
import type { MLModel } from "@/lib/ml-models"

export type CellType =
  | "data"
  | "profile"
  | "missing-data"
  | "visualization"
  | "preprocessing"
  | "text"
  | "code"
  | "ml-trainer"
  | "ml-predictor"
  | "ml-insights"

export interface NotebookCell {
  id: string
  type: CellType
  title: string
  createdAt: Date
  content?: any
  config?: any
}

export interface DataProfile {
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

export interface ColumnProfile {
  name: string
  type: "string" | "number" | "date" | "boolean"
  count: number
  missing: number
  missingPercentage: number
  unique: number
  uniquePercentage: number
  duplicates: number
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
  avgLength?: number
  minLength?: number
  maxLength?: number
  topValues?: Array<{ value: any; count: number; percentage: number }>
  outliers?: number[]
  patterns?: string[]
  anomalies?: string[]
}

export interface DataQualityIssue {
  type: "missing_values" | "duplicates" | "outliers" | "inconsistent_format" | "data_type_mismatch" | "unusual_patterns"
  severity: "low" | "medium" | "high"
  column?: string
  description: string
  count: number
  suggestion: string
}

export interface DataContextProps {
  data: any[]
  columns: string[]
  columnTypes: { [key: string]: string }
  processedData: any[]
  dataProfile: DataProfile | null
  error: string | null
  isLoading: boolean
  isProfileLoading: boolean
  fileName?: string
  notebookCells: NotebookCell[]
  trainedModels: MLModel[]
  setData: (data: any[]) => void
  setProcessedData: (data: any[]) => void
  processFile: (file: File) => Promise<void>
  processColumnTypes: (data: any[]) => void
  generateDataProfile: () => Promise<void | undefined>
  setError: (error: string | null) => void
  clearData: () => void
  resetData: () => void
  addCell: (type: CellType, insertIndex?: number) => string
  updateCellTitle: (id: string, title: string) => void
  updateCellContent: (id: string, content: any) => void
  updateCellConfig: (id: string, config: any) => void
  removeCell: (id: string) => void
  reorderCells: (sourceIndex: number, destinationIndex: number) => void
  addTrainedModel: (model: MLModel) => void
  removeTrainedModel: (modelId: string) => void
  downloadModel: (modelId: string) => void
}

const defaultContext: DataContextProps = {
  data: [],
  columns: [],
  columnTypes: {},
  processedData: [],
  dataProfile: null,
  error: null,
  isLoading: false,
  isProfileLoading: false,
  fileName: undefined,
  notebookCells: [],
  trainedModels: [],
  setData: () => {},
  setProcessedData: () => {},
  processFile: async () => {},
  processColumnTypes: () => {},
  generateDataProfile: async () => {},
  setError: () => {},
  clearData: () => {},
  resetData: () => {},
  addCell: () => "",
  updateCellTitle: () => {},
  updateCellContent: () => {},
  updateCellConfig: () => {},
  removeCell: () => {},
  reorderCells: () => {},
  addTrainedModel: () => {},
  removeTrainedModel: () => {},
  downloadModel: () => {},
}

export const DataContext = createContext(defaultContext)

// Custom hook to use the DataContext
export const useData = () => {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}

const parseCSV = (text: string): any[] => {
  const lines = text.split("\n").filter((line) => line.trim())
  if (lines.length === 0) throw new Error("Empty CSV file")

  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/"/g, ""))
    const row: any = {}
    headers.forEach((header, index) => {
      const value = values[index] || ""
      // Try to parse as number
      const numValue = Number.parseFloat(value)
      row[header] = !isNaN(numValue) && value !== "" ? numValue : value
    })
    return row
  })

  return rows
}

const parseExcel = async (file: File): Promise<any[]> => {
  // For demo purposes, we'll simulate Excel parsing
  // In a real implementation, you'd use a library like xlsx
  const text = await file.text()
  throw new Error("Excel parsing not implemented. Please convert to CSV format.")
}

const parseJSON = (text: string): any[] => {
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) {
      return parsed
    } else if (typeof parsed === "object" && parsed !== null) {
      return [parsed]
    } else {
      throw new Error("JSON must be an array or object")
    }
  } catch (err) {
    throw new Error("Invalid JSON format")
  }
}

const generateCellId = (): string => {
  return `cell_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

const getCellTitle = (type: CellType): string => {
  const titles: Record<CellType, string> = {
    data: "Data Table",
    profile: "Data Profile",
    "missing-data": "Missing Data Analysis",
    visualization: "Data Visualization",
    preprocessing: "Data Preprocessing",
    text: "Text Note",
    code: "Python Code",
    "ml-trainer": "ML Model Trainer",
    "ml-predictor": "ML Predictor",
    "ml-insights": "ML Model Comparison",
  }
  return titles[type] || "Untitled Cell"
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<any[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [columnTypes, setColumnTypes] = useState<{ [key: string]: string }>({})
  const [processedData, setProcessedData] = useState<any[]>([])
  const [dataProfile, setDataProfile] = useState<DataProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false)
  const [fileName, setFileName] = useState<string | undefined>(undefined)
  const [notebookCells, setNotebookCells] = useState<NotebookCell[]>([])
  const [trainedModels, setTrainedModels] = useState<MLModel[]>([])

  const processColumnTypes = useCallback((data: any[]) => {
    if (!data || data.length === 0) {
      return
    }

    const firstRow = data[0]
    const detectedTypes: { [key: string]: string } = {}

    for (const column in firstRow) {
      const value = firstRow[column]
      if (typeof value === "number" && !isNaN(value)) {
        detectedTypes[column] = "number"
      } else if (typeof value === "boolean") {
        detectedTypes[column] = "boolean"
      } else if (value instanceof Date) {
        detectedTypes[column] = "date"
      } else {
        detectedTypes[column] = "string"
      }
    }

    setColumnTypes(detectedTypes)
  }, [])

  useEffect(() => {
    if (data.length > 0) {
      setColumns(Object.keys(data[0]))
      setProcessedData(data)
      processColumnTypes(data)
    }
  }, [data, processColumnTypes])

  const generateOverviewProfile = () => {
    return {
      totalRows: processedData.length,
      totalColumns: columns.length,
      memoryUsage: `${Math.round(JSON.stringify(processedData).length / 1024)} KB`,
      duplicateRows: 0, // Simplified for demo
      completeness: 100, // Simplified for demo
    }
  }

  const analyzeColumn = async (column: string, processedData: any[], columnType: string): Promise<ColumnProfile> => {
    await new Promise((resolve) => setTimeout(resolve, 50))

    const values = processedData.map((row) => row[column])
    const nonNullValues = values.filter((v) => v !== null && v !== undefined && v !== "")
    const missing = values.length - nonNullValues.length
    const unique = new Set(nonNullValues).size

    const baseProfile: ColumnProfile = {
      name: column,
      type: columnType as any,
      count: values.length,
      missing,
      missingPercentage: Math.round((missing / values.length) * 100),
      unique,
      uniquePercentage: Math.round((unique / nonNullValues.length) * 100),
      duplicates: nonNullValues.length - unique,
    }

    if (columnType === "number") {
      const numericValues = nonNullValues.filter((v: any) => typeof v === "number")
      if (numericValues.length > 0) {
        const sum = numericValues.reduce((a: any, b: any) => a + b, 0)
        const mean = sum / numericValues.length
        const sortedValues = [...numericValues].sort((a, b) => a - b)
        const median = sortedValues[Math.floor(sortedValues.length / 2)]
        const min = Math.min(...numericValues)
        const max = Math.max(...numericValues)

        return {
          ...baseProfile,
          mean,
          median,
          min,
          max,
          std: Math.sqrt(numericValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numericValues.length),
        }
      }
    } else if (columnType === "string") {
      const stringValues = nonNullValues.filter((v: any) => typeof v === "string")
      if (stringValues.length > 0) {
        const lengths = stringValues.map((v: string) => v.length)
        return {
          ...baseProfile,
          avgLength: Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length),
          minLength: Math.min(...lengths),
          maxLength: Math.max(...lengths),
        }
      }
    }

    return baseProfile
  }

  const calculateCorrelations = (numericColumns: string[], processedData: any[]) => {
    const correlations: Record<string, Record<string, number>> = {}

    for (let i = 0; i < numericColumns.length; i++) {
      const col1 = numericColumns[i]
      correlations[col1] = {}

      for (let j = 0; j < numericColumns.length; j++) {
        const col2 = numericColumns[j]

        if (i === j) {
          correlations[col1][col2] = 1.0
          continue
        }

        const values1 = processedData.map((row) => row[col1]).filter((v) => typeof v === "number")
        const values2 = processedData.map((row) => row[col2]).filter((v) => typeof v === "number")

        if (values1.length === 0 || values2.length === 0) {
          correlations[col1][col2] = 0
          continue
        }

        const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length
        const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length

        let numerator = 0
        let sum1 = 0
        let sum2 = 0

        for (let k = 0; k < Math.min(values1.length, values2.length); k++) {
          const diff1 = values1[k] - mean1
          const diff2 = values2[k] - mean2
          numerator += diff1 * diff2
          sum1 += diff1 * diff1
          sum2 += diff2 * diff2
        }

        const denominator = Math.sqrt(sum1 * sum2)
        correlations[col1][col2] = denominator === 0 ? 0 : numerator / denominator
      }
    }

    return correlations
  }

  const generateDataQualityIssues = (columnProfiles: Record<string, ColumnProfile>): DataQualityIssue[] => {
    const issues: DataQualityIssue[] = []

    for (const column in columnProfiles) {
      const profile = columnProfiles[column]

      if (profile.missingPercentage > 10) {
        issues.push({
          type: "missing_values",
          severity: profile.missingPercentage > 50 ? "high" : "medium",
          column,
          description: `High percentage of missing values in column "${column}"`,
          count: profile.missing,
          suggestion: "Consider data imputation or removing this column if too many values are missing.",
        })
      }

      if (profile.type === "string" && profile.uniquePercentage > 95) {
        issues.push({
          type: "unusual_patterns",
          severity: "low",
          column,
          description: `Column "${column}" has very high cardinality`,
          count: profile.unique,
          suggestion: "This column may be an identifier. Consider if it's needed for analysis.",
        })
      }
    }

    return issues
  }

  const generateDataProfile = useCallback(async (): Promise<void> => {
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
          profile.columns[column] = await analyzeColumn(column, processedData, columnTypes[column])
        } catch (err) {
          console.warn(`Failed to profile column ${column}:`, err)
        }
      }

      // Generate correlations for numeric columns
      const numericColumns = columns.filter((col) => columnTypes[col] === "number")
      if (numericColumns.length > 1) {
        try {
          profile.correlations = calculateCorrelations(numericColumns, processedData)
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
  }, [processedData, columns, columnTypes])

  const clearData = useCallback(() => {
    setData([])
    setColumns([])
    setColumnTypes({})
    setProcessedData([])
    setDataProfile(null)
    setError(null)
    setFileName(undefined)
  }, [])

  const resetData = useCallback(() => {
    clearData()
    setNotebookCells([])
    setTrainedModels([])
  }, [clearData])

  const addCell = useCallback((type: CellType, insertIndex?: number): string => {
    const newCell: NotebookCell = {
      id: generateCellId(),
      type,
      title: getCellTitle(type),
      createdAt: new Date(),
      content: null,
      config: {},
    }

    setNotebookCells((prev) => {
      if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= prev.length) {
        const newCells = [...prev]
        newCells.splice(insertIndex, 0, newCell)
        return newCells
      } else {
        return [...prev, newCell]
      }
    })

    return newCell.id
  }, [])

  const updateCellTitle = useCallback((id: string, title: string) => {
    setNotebookCells((prev) => prev.map((cell) => (cell.id === id ? { ...cell, title } : cell)))
  }, [])

  const updateCellContent = useCallback((id: string, content: any) => {
    setNotebookCells((prev) => prev.map((cell) => (cell.id === id ? { ...cell, content } : cell)))
  }, [])

  const updateCellConfig = useCallback((id: string, config: any) => {
    setNotebookCells((prev) => prev.map((cell) => (cell.id === id ? { ...cell, config } : cell)))
  }, [])

  const removeCell = useCallback((id: string) => {
    setNotebookCells((prev) => prev.filter((cell) => cell.id !== id))
  }, [])

  const reorderCells = useCallback((sourceIndex: number, destinationIndex: number) => {
    setNotebookCells((prev) => {
      const result = Array.from(prev)
      const [removed] = result.splice(sourceIndex, 1)
      result.splice(destinationIndex, 0, removed)
      return result
    })
  }, [])

  const addTrainedModel = useCallback((model: MLModel) => {
    setTrainedModels((prev) => [...prev, model])
  }, [])

  const removeTrainedModel = useCallback((modelId: string) => {
    setTrainedModels((prev) => prev.filter((model) => model.id !== modelId))
  }, [])

  const downloadModel = useCallback(
    (modelId: string) => {
      const model = trainedModels.find((m) => m.id === modelId)
      if (!model) {
        throw new Error("Model not found")
      }

      // Create a downloadable model package
      const modelPackage = {
        id: model.id,
        name: model.name,
        type: model.type,
        algorithm: model.algorithm,
        features: model.features,
        target: model.target,
        hyperparameters: model.hyperparameters,
        performance: model.performance,
        trainedAt: model.trainedAt,
        version: "1.0.0",
        framework: "custom-js-ml",
      }

      const blob = new Blob([JSON.stringify(modelPackage, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${model.name.replace(/\s+/g, "_").toLowerCase()}_model.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    },
    [trainedModels],
  )

  const processFile = useCallback(
    async (file: File): Promise<void> => {
      setIsLoading(true)
      setError(null)

      try {
        const fileExtension = file.name.split(".").pop()?.toLowerCase()
        let parsedData: any[] = []

        if (fileExtension === "csv") {
          const text = await file.text()
          parsedData = parseCSV(text)
        } else if (fileExtension === "json") {
          const text = await file.text()
          parsedData = parseJSON(text)
        } else if (fileExtension === "xlsx" || fileExtension === "xls") {
          parsedData = await parseExcel(file)
        } else {
          throw new Error("Unsupported file format")
        }

        if (parsedData.length === 0) {
          throw new Error("No data found in file")
        }

        setData(parsedData)
        setFileName(file.name)
        setError(null)

        // Auto-add a data table cell when data is uploaded
        if (parsedData.length > 0) {
          setTimeout(() => {
            addCell("data")
          }, 100)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to process file"
        setError(errorMessage)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [addCell],
  )

  const value = useMemo(
    () => ({
      data,
      columns,
      columnTypes,
      processedData,
      dataProfile,
      error,
      isLoading,
      isProfileLoading,
      fileName,
      notebookCells,
      trainedModels,
      setData,
      setProcessedData,
      processFile,
      processColumnTypes,
      generateDataProfile,
      setError,
      clearData,
      resetData,
      addCell,
      updateCellTitle,
      updateCellContent,
      updateCellConfig,
      removeCell,
      reorderCells,
      addTrainedModel,
      removeTrainedModel,
      downloadModel,
    }),
    [
      data,
      columns,
      columnTypes,
      processedData,
      dataProfile,
      error,
      isLoading,
      isProfileLoading,
      fileName,
      notebookCells,
      trainedModels,
      processFile,
      generateDataProfile,
      clearData,
      resetData,
      addCell,
      updateCellTitle,
      updateCellContent,
      updateCellConfig,
      removeCell,
      reorderCells,
      addTrainedModel,
      removeTrainedModel,
      downloadModel,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
