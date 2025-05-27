export interface NotebookCellType {
  id: string
  type: string
  title: string
  createdAt: Date
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
