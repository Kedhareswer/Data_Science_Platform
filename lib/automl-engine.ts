// AutoML Engine for Automated Machine Learning
import {
  SimpleLinearRegression,
  SimpleLogisticRegression,
  SimpleDecisionTree,
  SimpleRandomForest,
  KMeansClustering,
  calculateAccuracy,
  calculateRMSE,
  calculateR2Score,
  calculatePrecisionRecallF1,
  calculateROCAUC,
  calculateFeatureImportance,
  type MLModel,
  type ModelPerformance,
} from "./ml-models"

export interface AutoMLConfig {
  taskType: "auto" | "classification" | "regression" | "clustering"
  timeLimit?: number // in seconds
  maxModels?: number
  crossValidation?: boolean
  featureEngineering?: boolean
  hyperparameterTuning?: boolean
  customFeatureSelection?: {
    enabled: boolean
    selectedFeatures: string[]
    excludedFeatures: string[]
  }
}

export interface DatasetAnalysis {
  rowCount: number
  columnCount: number
  numericColumns: string[]
  categoricalColumns: string[]
  missingValuePercentage: number
  duplicatePercentage: number
  targetType?: "numeric" | "categorical" | "binary"
  classBalance?: Record<string, number>
  correlations: Record<string, number>
  outlierPercentage: number
  dataQualityScore: number
}

export interface FeatureAnalysis {
  feature: string
  importance: number
  dataType: string
  missingPercentage: number
  uniqueValues: number
  correlation?: number
  recommendation: "required" | "recommended" | "optional" | "discouraged"
  reasoning: string[]
  warnings: string[]
}

export interface ModelRecommendation {
  algorithm: string
  confidence: number
  reasoning: string[]
  expectedPerformance: string
  hyperparameters: Record<string, any>
}

export interface PreprocessingRecommendation {
  step: string
  column?: string
  method?: string
  reasoning: string
  priority: "high" | "medium" | "low"
  expectedImprovement: string
}

export interface FeatureEngineeringResult {
  originalFeatures: string[]
  engineeredFeatures: string[]
  selectedFeatures: string[]
  featureImportance: Array<{ feature: string; importance: number; type: "original" | "engineered" }>
  transformations: Array<{ type: string; features: string[]; description: string }>
}

export interface AutoMLResult {
  bestModel: MLModel
  allModels: MLModel[]
  datasetAnalysis: DatasetAnalysis
  featureAnalysis: FeatureAnalysis[]
  featureEngineering: FeatureEngineeringResult
  modelRecommendations: ModelRecommendation[]
  preprocessingRecommendations: PreprocessingRecommendation[]
  executionTime: number
  insights: string[]
}

export class AutoMLEngine {
  private config: AutoMLConfig
  private startTime = 0

  constructor(config: AutoMLConfig) {
    this.config = {
      timeLimit: 300, // 5 minutes default
      maxModels: 10,
      crossValidation: true,
      featureEngineering: true,
      hyperparameterTuning: true,
      ...config,
    }
  }

  async runAutoML(
    data: any[],
    columns: string[],
    columnTypes: Record<string, string>,
    targetColumn?: string,
  ): Promise<AutoMLResult> {
    this.startTime = Date.now()

    // Step 1: Analyze dataset
    const datasetAnalysis = this.analyzeDataset(data, columns, columnTypes, targetColumn)

    // Step 1.5: Analyze individual features
    const featureAnalysis = this.analyzeFeatures(data, columns, columnTypes, targetColumn)

    // Apply custom feature selection if enabled
    let selectedFeatures = columns.filter((col) => col !== targetColumn)
    if (this.config.customFeatureSelection?.enabled) {
      selectedFeatures = this.config.customFeatureSelection.selectedFeatures.filter(
        (feature) => feature !== targetColumn,
      )

      // Validate feature selection
      if (selectedFeatures.length === 0) {
        throw new Error("At least one feature must be selected for training")
      }

      // Check for warnings
      const discouragedFeatures = selectedFeatures.filter((feature) => {
        const analysis = featureAnalysis.find((f) => f.feature === feature)
        return analysis?.recommendation === "discouraged"
      })

      if (discouragedFeatures.length > 0) {
        console.warn(`Warning: Using discouraged features: ${discouragedFeatures.join(", ")}`)
      }
    }

    // Step 2: Determine task type if auto
    const taskType =
      this.config.taskType === "auto" ? this.determineTaskType(datasetAnalysis, targetColumn) : this.config.taskType

    // Step 3: Generate preprocessing recommendations
    const preprocessingRecommendations = this.generatePreprocessingRecommendations(datasetAnalysis)

    // Step 4: Apply automatic preprocessing
    const preprocessedData = this.applyAutomaticPreprocessing(data, columns, columnTypes, preprocessingRecommendations)

    // Step 5: Feature engineering
    const featureEngineering = this.config.featureEngineering
      ? this.performFeatureEngineering(
          preprocessedData.data,
          preprocessedData.columns,
          preprocessedData.columnTypes,
          targetColumn,
        )
      : {
          originalFeatures: columns.filter((col) => col !== targetColumn),
          engineeredFeatures: [],
          selectedFeatures: columns.filter((col) => col !== targetColumn),
          featureImportance: [],
          transformations: [],
        }

    // Step 6: Generate model recommendations
    const modelRecommendations = this.generateModelRecommendations(datasetAnalysis, taskType)

    // Step 7: Train and evaluate models
    const allModels = await this.trainMultipleModels(
      preprocessedData.data,
      selectedFeatures,
      targetColumn,
      taskType,
      modelRecommendations,
    )

    // Step 8: Select best model
    const bestModel = this.selectBestModel(allModels, taskType)

    // Step 9: Generate insights
    const insights = this.generateInsights(datasetAnalysis, bestModel, featureEngineering, allModels)

    return {
      bestModel,
      allModels,
      datasetAnalysis,
      featureAnalysis,
      featureEngineering,
      modelRecommendations,
      preprocessingRecommendations,
      executionTime: Date.now() - this.startTime,
      insights,
    }
  }

  private analyzeDataset(
    data: any[],
    columns: string[],
    columnTypes: Record<string, string>,
    targetColumn?: string,
  ): DatasetAnalysis {
    const numericColumns = columns.filter((col) => columnTypes[col] === "number")
    const categoricalColumns = columns.filter((col) => columnTypes[col] === "string" || columnTypes[col] === "boolean")

    // Calculate missing values
    let totalMissing = 0
    const totalCells = data.length * columns.length
    data.forEach((row) => {
      columns.forEach((col) => {
        if (row[col] === null || row[col] === undefined || row[col] === "") {
          totalMissing++
        }
      })
    })

    // Calculate duplicates
    const uniqueRows = new Set(data.map((row) => JSON.stringify(row)))
    const duplicatePercentage = ((data.length - uniqueRows.size) / data.length) * 100

    // Analyze target if provided
    let targetType: "numeric" | "categorical" | "binary" | undefined
    let classBalance: Record<string, number> | undefined

    if (targetColumn && data.length > 0) {
      const targetValues = data.map((row) => row[targetColumn]).filter((v) => v !== null && v !== undefined)
      const uniqueTargets = new Set(targetValues)

      if (columnTypes[targetColumn] === "number") {
        targetType = "numeric"
      } else if (uniqueTargets.size === 2) {
        targetType = "binary"
        classBalance = {}
        targetValues.forEach((val) => {
          classBalance![val] = (classBalance![val] || 0) + 1
        })
      } else {
        targetType = "categorical"
        classBalance = {}
        targetValues.forEach((val) => {
          classBalance![val] = (classBalance![val] || 0) + 1
        })
      }
    }

    // Calculate correlations with target
    const correlations: Record<string, number> = {}
    if (targetColumn && targetType === "numeric") {
      const targetValues = data.map((row) => Number(row[targetColumn])).filter((v) => !isNaN(v))
      numericColumns.forEach((col) => {
        if (col !== targetColumn) {
          const colValues = data.map((row) => Number(row[col])).filter((v) => !isNaN(v))
          correlations[col] = this.calculateCorrelation(colValues, targetValues)
        }
      })
    }

    // Calculate outliers (simplified)
    let outlierCount = 0
    numericColumns.forEach((col) => {
      const values = data.map((row) => Number(row[col])).filter((v) => !isNaN(v))
      if (values.length > 0) {
        const q1 = this.percentile(values, 25)
        const q3 = this.percentile(values, 75)
        const iqr = q3 - q1
        const lowerBound = q1 - 1.5 * iqr
        const upperBound = q3 + 1.5 * iqr
        outlierCount += values.filter((v) => v < lowerBound || v > upperBound).length
      }
    })

    const outlierPercentage = (outlierCount / (data.length * numericColumns.length)) * 100

    // Calculate data quality score
    const completeness = ((totalCells - totalMissing) / totalCells) * 100
    const uniqueness = ((data.length - (data.length - uniqueRows.size)) / data.length) * 100
    const outlierScore = Math.max(0, 100 - outlierPercentage)
    const dataQualityScore = (completeness + uniqueness + outlierScore) / 3

    return {
      rowCount: data.length,
      columnCount: columns.length,
      numericColumns,
      categoricalColumns,
      missingValuePercentage: (totalMissing / totalCells) * 100,
      duplicatePercentage,
      targetType,
      classBalance,
      correlations,
      outlierPercentage,
      dataQualityScore,
    }
  }

  private determineTaskType(
    analysis: DatasetAnalysis,
    targetColumn?: string,
  ): "classification" | "regression" | "clustering" {
    if (!targetColumn) {
      return "clustering"
    }

    if (analysis.targetType === "numeric") {
      return "regression"
    } else {
      return "classification"
    }
  }

  private generatePreprocessingRecommendations(analysis: DatasetAnalysis): PreprocessingRecommendation[] {
    const recommendations: PreprocessingRecommendation[] = []

    // Missing values
    if (analysis.missingValuePercentage > 5) {
      recommendations.push({
        step: "handle_missing_values",
        reasoning: `${analysis.missingValuePercentage.toFixed(1)}% of data is missing`,
        priority: analysis.missingValuePercentage > 20 ? "high" : "medium",
        expectedImprovement: "Prevents model training errors and improves accuracy",
        method: "imputation",
      })
    }

    // Duplicates
    if (analysis.duplicatePercentage > 1) {
      recommendations.push({
        step: "remove_duplicates",
        reasoning: `${analysis.duplicatePercentage.toFixed(1)}% duplicate rows found`,
        priority: "medium",
        expectedImprovement: "Reduces overfitting and improves generalization",
      })
    }

    // Outliers
    if (analysis.outlierPercentage > 10) {
      recommendations.push({
        step: "handle_outliers",
        reasoning: `${analysis.outlierPercentage.toFixed(1)}% outliers detected`,
        priority: "medium",
        expectedImprovement: "Improves model robustness and accuracy",
      })
    }

    // Feature scaling
    if (analysis.numericColumns.length > 1) {
      recommendations.push({
        step: "feature_scaling",
        reasoning: "Multiple numeric features with potentially different scales",
        priority: "high",
        expectedImprovement: "Essential for algorithms like logistic regression and neural networks",
        method: "standardization",
      })
    }

    // Categorical encoding
    if (analysis.categoricalColumns.length > 0) {
      recommendations.push({
        step: "encode_categorical",
        reasoning: `${analysis.categoricalColumns.length} categorical columns need encoding`,
        priority: "high",
        expectedImprovement: "Enables ML algorithms to process categorical data",
        method: "automatic",
      })
    }

    return recommendations
  }

  private applyAutomaticPreprocessing(
    data: any[],
    columns: string[],
    columnTypes: Record<string, string>,
    recommendations: PreprocessingRecommendation[],
  ): { data: any[]; columns: string[]; columnTypes: Record<string, string> } {
    let processedData = [...data]
    const processedColumns = [...columns]
    const processedColumnTypes = { ...columnTypes }

    // Apply basic preprocessing automatically
    recommendations.forEach((rec) => {
      switch (rec.step) {
        case "remove_duplicates":
          const seen = new Set()
          processedData = processedData.filter((row) => {
            const key = JSON.stringify(row)
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
          break

        case "handle_missing_values":
          // Simple mean/mode imputation
          processedColumns.forEach((col) => {
            if (processedColumnTypes[col] === "number") {
              const values = processedData.map((row) => Number(row[col])).filter((v) => !isNaN(v))
              const mean = values.reduce((a, b) => a + b, 0) / values.length
              processedData = processedData.map((row) => ({
                ...row,
                [col]: row[col] === null || row[col] === undefined || row[col] === "" ? mean : row[col],
              }))
            } else {
              // Mode for categorical
              const values = processedData
                .map((row) => row[col])
                .filter((v) => v !== null && v !== undefined && v !== "")
              const frequency: Record<any, number> = {}
              values.forEach((v) => (frequency[v] = (frequency[v] || 0) + 1))
              const mode = Object.entries(frequency).reduce((a, b) => (frequency[a[0]] > frequency[b[0]] ? a : b))[0]
              processedData = processedData.map((row) => ({
                ...row,
                [col]: row[col] === null || row[col] === undefined || row[col] === "" ? mode : row[col],
              }))
            }
          })
          break
      }
    })

    return { data: processedData, columns: processedColumns, columnTypes: processedColumnTypes }
  }

  private performFeatureEngineering(
    data: any[],
    columns: string[],
    columnTypes: Record<string, string>,
    targetColumn?: string,
  ): FeatureEngineeringResult {
    const originalFeatures = columns.filter((col) => col !== targetColumn)
    const engineeredFeatures: string[] = []
    const transformations: Array<{ type: string; features: string[]; description: string }> = []
    let processedData = [...data]

    const numericColumns = originalFeatures.filter((col) => columnTypes[col] === "number")
    const categoricalColumns = originalFeatures.filter(
      (col) => columnTypes[col] === "string" || columnTypes[col] === "boolean",
    )

    // 1. Polynomial features for numeric columns (degree 2)
    if (numericColumns.length >= 2 && numericColumns.length <= 5) {
      for (let i = 0; i < numericColumns.length; i++) {
        for (let j = i + 1; j < numericColumns.length; j++) {
          const col1 = numericColumns[i]
          const col2 = numericColumns[j]
          const newFeature = `${col1}_x_${col2}`
          engineeredFeatures.push(newFeature)

          processedData = processedData.map((row) => ({
            ...row,
            [newFeature]: Number(row[col1]) * Number(row[col2]),
          }))
        }
      }

      if (engineeredFeatures.length > 0) {
        transformations.push({
          type: "polynomial_features",
          features: engineeredFeatures,
          description: "Created interaction terms between numeric features",
        })
      }
    }

    // 2. Binning for numeric features with high cardinality
    numericColumns.forEach((col) => {
      const values = processedData.map((row) => Number(row[col])).filter((v) => !isNaN(v))
      const uniqueValues = new Set(values).size

      if (uniqueValues > 20) {
        const newFeature = `${col}_binned`
        engineeredFeatures.push(newFeature)

        const min = Math.min(...values)
        const max = Math.max(...values)
        const binSize = (max - min) / 5

        processedData = processedData.map((row) => {
          const value = Number(row[col])
          const bin = Math.min(4, Math.floor((value - min) / binSize))
          return { ...row, [newFeature]: bin }
        })

        transformations.push({
          type: "binning",
          features: [newFeature],
          description: `Binned ${col} into 5 categories`,
        })
      }
    })

    // 3. Feature selection based on correlation with target
    let selectedFeatures = [...originalFeatures, ...engineeredFeatures]
    let featureImportance: Array<{ feature: string; importance: number; type: "original" | "engineered" }> = []

    if (targetColumn && columnTypes[targetColumn] === "number") {
      const targetValues = processedData.map((row) => Number(row[targetColumn])).filter((v) => !isNaN(v))

      const correlations = selectedFeatures.map((feature) => {
        const featureValues = processedData.map((row) => Number(row[feature])).filter((v) => !isNaN(v))
        const correlation = Math.abs(this.calculateCorrelation(featureValues, targetValues))
        return {
          feature,
          importance: correlation || 0,
          type: originalFeatures.includes(feature) ? ("original" as const) : ("engineered" as const),
        }
      })

      featureImportance = correlations.sort((a, b) => b.importance - a.importance)

      // Select top features (max 15)
      selectedFeatures = featureImportance.slice(0, 15).map((item) => item.feature)
    } else {
      // For classification or when no target, use all features but limit count
      selectedFeatures = selectedFeatures.slice(0, 15)
      featureImportance = selectedFeatures.map((feature) => ({
        feature,
        importance: 1 / selectedFeatures.length,
        type: originalFeatures.includes(feature) ? ("original" as const) : ("engineered" as const),
      }))
    }

    return {
      originalFeatures,
      engineeredFeatures,
      selectedFeatures,
      featureImportance,
      transformations,
    }
  }

  private generateModelRecommendations(analysis: DatasetAnalysis, taskType: string): ModelRecommendation[] {
    const recommendations: ModelRecommendation[] = []

    if (taskType === "regression") {
      // Linear Regression
      recommendations.push({
        algorithm: "linear_regression",
        confidence: analysis.numericColumns.length <= 3 ? 0.8 : 0.6,
        reasoning: [
          "Good baseline for regression tasks",
          analysis.numericColumns.length <= 3
            ? "Simple dataset suitable for linear models"
            : "May struggle with complex relationships",
        ],
        expectedPerformance: analysis.dataQualityScore > 80 ? "Good" : "Moderate",
        hyperparameters: {},
      })

      // Decision Tree
      recommendations.push({
        algorithm: "decision_tree",
        confidence: 0.7,
        reasoning: [
          "Handles non-linear relationships well",
          "Interpretable results",
          analysis.rowCount < 1000 ? "Good for smaller datasets" : "May overfit on large datasets",
        ],
        expectedPerformance: "Good",
        hyperparameters: { maxDepth: analysis.rowCount < 500 ? 3 : 5 },
      })

      // Random Forest
      if (analysis.rowCount > 100) {
        recommendations.push({
          algorithm: "random_forest",
          confidence: 0.9,
          reasoning: ["Excellent for most regression tasks", "Handles overfitting well", "Provides feature importance"],
          expectedPerformance: "Excellent",
          hyperparameters: { numTrees: Math.min(50, Math.max(10, Math.floor(analysis.rowCount / 20))) },
        })
      }
    } else if (taskType === "classification") {
      // Logistic Regression
      recommendations.push({
        algorithm: "logistic_regression",
        confidence: analysis.targetType === "binary" ? 0.8 : 0.6,
        reasoning: [
          "Good baseline for classification",
          analysis.targetType === "binary" ? "Excellent for binary classification" : "May struggle with multi-class",
          "Fast training and prediction",
        ],
        expectedPerformance: analysis.dataQualityScore > 80 ? "Good" : "Moderate",
        hyperparameters: { learningRate: 0.01, iterations: 1000 },
      })

      // Decision Tree
      recommendations.push({
        algorithm: "decision_tree",
        confidence: 0.75,
        reasoning: ["Handles categorical features well", "Interpretable results", "Good for imbalanced datasets"],
        expectedPerformance: "Good",
        hyperparameters: { maxDepth: analysis.rowCount < 500 ? 3 : 5 },
      })

      // Random Forest
      if (analysis.rowCount > 100) {
        recommendations.push({
          algorithm: "random_forest",
          confidence: 0.85,
          reasoning: ["Excellent for most classification tasks", "Robust to outliers", "Handles mixed data types well"],
          expectedPerformance: "Excellent",
          hyperparameters: { numTrees: Math.min(50, Math.max(10, Math.floor(analysis.rowCount / 20))) },
        })
      }
    } else if (taskType === "clustering") {
      recommendations.push({
        algorithm: "kmeans",
        confidence: 0.7,
        reasoning: ["Good for discovering data patterns", "Works well with numeric features"],
        expectedPerformance: "Good",
        hyperparameters: { k: Math.min(10, Math.max(2, Math.floor(Math.sqrt(analysis.rowCount / 2)))) },
      })
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence)
  }

  private async trainMultipleModels(
    data: any[],
    features: string[],
    targetColumn: string | undefined,
    taskType: string,
    recommendations: ModelRecommendation[],
  ): Promise<MLModel[]> {
    const models: MLModel[] = []

    // Prepare data
    const X = data.map((row) => features.map((feature) => Number(row[feature])))
    let y: any[] = []

    if (targetColumn && taskType !== "clustering") {
      if (taskType === "classification") {
        const uniqueTargets = [...new Set(data.map((row) => row[targetColumn]))]
        const targetMap = Object.fromEntries(uniqueTargets.map((target, index) => [target, index]))
        y = data.map((row) => targetMap[row[targetColumn]])
      } else {
        y = data.map((row) => Number(row[targetColumn]))
      }
    }

    // Train models based on recommendations
    for (const rec of recommendations.slice(0, this.config.maxModels || 5)) {
      try {
        const model = await this.trainSingleModel(X, y, features, targetColumn, taskType, rec)
        if (model) {
          models.push(model)
        }
      } catch (error) {
        console.warn(`Failed to train ${rec.algorithm}:`, error)
      }
    }

    return models
  }

  private async trainSingleModel(
    X: number[][],
    y: number[],
    features: string[],
    targetColumn: string | undefined,
    taskType: string,
    recommendation: ModelRecommendation,
  ): Promise<MLModel | null> {
    let modelInstance: any
    let predictions: any[] = []
    let performance: ModelPerformance = {}

    try {
      switch (recommendation.algorithm) {
        case "linear_regression":
          if (features.length === 1) {
            modelInstance = new SimpleLinearRegression()
            modelInstance.fit(
              X.map((row) => row[0]),
              y,
            )
            predictions = modelInstance.predict(X.map((row) => row[0]))
            performance = {
              rmse: calculateRMSE(y, predictions),
              r2Score: calculateR2Score(y, predictions),
            }
          }
          break

        case "logistic_regression":
          modelInstance = new SimpleLogisticRegression()
          modelInstance.fit(
            X,
            y,
            recommendation.hyperparameters.learningRate,
            recommendation.hyperparameters.iterations,
          )
          predictions = modelInstance.predict(X)
          const probabilities = modelInstance.predictProba(X)
          performance = {
            accuracy: calculateAccuracy(y, predictions),
            ...calculatePrecisionRecallF1(y, predictions),
            rocAuc: calculateROCAUC(y, probabilities),
          }
          break

        case "decision_tree":
          modelInstance = new SimpleDecisionTree()
          modelInstance.fit(X, y, recommendation.hyperparameters.maxDepth)
          predictions = modelInstance.predict(X)
          if (taskType === "classification") {
            performance = {
              accuracy: calculateAccuracy(y, predictions),
              ...calculatePrecisionRecallF1(y, predictions),
            }
          } else {
            performance = {
              rmse: calculateRMSE(y, predictions),
              r2Score: calculateR2Score(y, predictions),
            }
          }
          break

        case "random_forest":
          modelInstance = new SimpleRandomForest(recommendation.hyperparameters.numTrees)
          modelInstance.fit(X, y)
          predictions = modelInstance.predict(X)
          if (taskType === "classification") {
            performance = {
              accuracy: calculateAccuracy(y, predictions),
              ...calculatePrecisionRecallF1(y, predictions),
            }
          } else {
            performance = {
              rmse: calculateRMSE(y, predictions),
              r2Score: calculateR2Score(y, predictions),
            }
          }
          // Add feature importance
          performance.featureImportance = calculateFeatureImportance(X, y, features)
          break

        case "kmeans":
          modelInstance = new KMeansClustering(recommendation.hyperparameters.k)
          modelInstance.fit(X)
          predictions = modelInstance.predict(X)
          performance = {
            clusters: recommendation.hyperparameters.k,
            dataPoints: X.length,
          }
          break

        default:
          return null
      }

      return {
        id: `automl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: `AutoML ${recommendation.algorithm.replace("_", " ").toUpperCase()}`,
        type: taskType as any,
        algorithm: recommendation.algorithm,
        features,
        target: targetColumn,
        hyperparameters: recommendation.hyperparameters,
        performance,
        trainedAt: new Date(),
        isTraining: false,
      }
    } catch (error) {
      console.error(`Error training ${recommendation.algorithm}:`, error)
      return null
    }
  }

  private selectBestModel(models: MLModel[], taskType: string): MLModel {
    if (models.length === 0) {
      throw new Error("No models were successfully trained")
    }

    if (models.length === 1) {
      return models[0]
    }

    // Select best model based on task type
    if (taskType === "classification") {
      return models.reduce((best, current) => {
        const bestScore = best.performance?.f1Score || best.performance?.accuracy || 0
        const currentScore = current.performance?.f1Score || current.performance?.accuracy || 0
        return currentScore > bestScore ? current : best
      })
    } else if (taskType === "regression") {
      return models.reduce((best, current) => {
        const bestScore = best.performance?.r2Score || 0
        const currentScore = current.performance?.r2Score || 0
        return currentScore > bestScore ? current : best
      })
    } else {
      // For clustering, return the first successful model
      return models[0]
    }
  }

  private generateInsights(
    analysis: DatasetAnalysis,
    bestModel: MLModel,
    featureEngineering: FeatureEngineeringResult,
    allModels: MLModel[],
  ): string[] {
    const insights: string[] = []

    // Data insights
    insights.push(`Dataset contains ${analysis.rowCount.toLocaleString()} rows and ${analysis.columnCount} columns`)

    if (analysis.dataQualityScore > 90) {
      insights.push("Excellent data quality detected - minimal preprocessing needed")
    } else if (analysis.dataQualityScore > 70) {
      insights.push("Good data quality with some minor issues addressed automatically")
    } else {
      insights.push("Data quality issues detected and automatically handled")
    }

    // Feature engineering insights
    if (featureEngineering.engineeredFeatures.length > 0) {
      insights.push(
        `Created ${featureEngineering.engineeredFeatures.length} new features through automatic feature engineering`,
      )
    }

    if (featureEngineering.selectedFeatures.length < featureEngineering.originalFeatures.length) {
      insights.push(
        `Selected ${featureEngineering.selectedFeatures.length} most important features from ${featureEngineering.originalFeatures.length} original features`,
      )
    }

    // Model insights
    insights.push(`Best performing model: ${bestModel.name} with ${bestModel.algorithm.replace("_", " ")} algorithm`)

    if (bestModel.performance?.accuracy) {
      insights.push(`Achieved ${(bestModel.performance.accuracy * 100).toFixed(1)}% accuracy on training data`)
    }

    if (bestModel.performance?.r2Score) {
      insights.push(
        `Achieved R² score of ${bestModel.performance.r2Score.toFixed(3)} explaining variance in target variable`,
      )
    }

    // Feature importance insights
    if (bestModel.performance?.featureImportance && bestModel.performance.featureImportance.length > 0) {
      const topFeature = bestModel.performance.featureImportance[0]
      insights.push(
        `Most important feature: ${topFeature.feature} (${(topFeature.importance * 100).toFixed(1)}% importance)`,
      )
    }

    // Model comparison insights
    if (allModels.length > 1) {
      insights.push(`Compared ${allModels.length} different algorithms to find the best performing model`)
    }

    return insights
  }

  // Utility methods
  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length)
    if (n < 2) return 0

    const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n
    const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n

    let numerator = 0
    let sumX = 0
    let sumY = 0

    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX
      const diffY = y[i] - meanY
      numerator += diffX * diffY
      sumX += diffX * diffX
      sumY += diffY * diffY
    }

    const denominator = Math.sqrt(sumX * sumY)
    return denominator === 0 ? 0 : numerator / denominator
  }

  private percentile(arr: number[], p: number): number {
    const sorted = [...arr].sort((a, b) => a - b)
    const index = (p / 100) * (sorted.length - 1)
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    const weight = index % 1

    if (upper >= sorted.length) return sorted[sorted.length - 1]
    return sorted[lower] * (1 - weight) + sorted[upper] * weight
  }

  private analyzeFeatures(
    data: any[],
    columns: string[],
    columnTypes: Record<string, string>,
    targetColumn?: string,
  ): FeatureAnalysis[] {
    const features = columns.filter((col) => col !== targetColumn)

    return features.map((feature) => {
      const values = data.map((row) => row[feature]).filter((v) => v !== null && v !== undefined && v !== "")
      const totalValues = data.length
      const missingPercentage = ((totalValues - values.length) / totalValues) * 100
      const uniqueValues = new Set(values).size
      const dataType = columnTypes[feature]

      let correlation = 0
      if (targetColumn && columnTypes[targetColumn] === "number" && dataType === "number") {
        const targetValues = data.map((row) => Number(row[targetColumn])).filter((v) => !isNaN(v))
        const featureValues = data.map((row) => Number(row[feature])).filter((v) => !isNaN(v))
        correlation = Math.abs(this.calculateCorrelation(featureValues, targetValues))
      }

      // Calculate feature importance (simplified)
      let importance = 0
      if (dataType === "number") {
        importance = correlation || uniqueValues / totalValues
      } else {
        importance = Math.min(uniqueValues / totalValues, 0.8)
      }

      // Determine recommendation
      let recommendation: "required" | "recommended" | "optional" | "discouraged" = "optional"
      const reasoning: string[] = []
      const warnings: string[] = []

      if (missingPercentage > 50) {
        recommendation = "discouraged"
        reasoning.push(`High missing data (${missingPercentage.toFixed(1)}%)`)
        warnings.push("High missing data may negatively impact model performance")
      } else if (correlation > 0.7) {
        recommendation = "required"
        reasoning.push(`Strong correlation with target (${(correlation * 100).toFixed(1)}%)`)
      } else if (correlation > 0.3 || importance > 0.5) {
        recommendation = "recommended"
        reasoning.push("Good predictive potential")
      } else if (uniqueValues === 1) {
        recommendation = "discouraged"
        reasoning.push("No variance in values")
        warnings.push("Constant features provide no predictive value")
      } else if (uniqueValues === totalValues && dataType === "string") {
        recommendation = "discouraged"
        reasoning.push("All unique values (likely identifier)")
        warnings.push("Unique identifiers can cause overfitting")
      }

      if (dataType === "string" && uniqueValues > 50) {
        warnings.push("High cardinality categorical feature may slow training")
      }

      return {
        feature,
        importance,
        dataType,
        missingPercentage,
        uniqueValues,
        correlation,
        recommendation,
        reasoning,
        warnings,
      }
    })
  }
}
