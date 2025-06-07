"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { useData } from "@/lib/data-context"
import { DataUploadPrompt } from "@/components/data-upload-prompt"
import {
  SimpleLinearRegression,
  SimpleLogisticRegression,
  KMeansClustering,
  SimpleDecisionTree,
  calculateAccuracy,
  calculateRMSE,
  calculateR2Score,
  calculatePrecisionRecallF1,
  type MLModel,
} from "@/lib/ml-models"
import { Brain, Target, AlertCircle, CheckCircle, Play, Settings } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { EnhancedMLTrainer } from "@/components/enhanced-ml-trainer"

export function MLModelTrainer() {
  const { processedData, columns, columnTypes, addTrainedModel } = useData()
  const [modelType, setModelType] = useState<"classification" | "regression" | "clustering">("regression")
  const [algorithm, setAlgorithm] = useState<string>("linear_regression")
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [targetColumn, setTargetColumn] = useState<string>("")
  const [modelName, setModelName] = useState<string>("")
  const [isTraining, setIsTraining] = useState(false)
  const [trainingProgress, setTrainingProgress] = useState(0)
  const [trainedModel, setTrainedModel] = useState<MLModel | null>(null)

  const numericColumns = columns.filter((col) => columnTypes[col] === "number")
  const categoricalColumns = columns.filter((col) => columnTypes[col] === "string" || columnTypes[col] === "boolean")
  const hasData = processedData.length > 0

  // Algorithm options based on model type
  const algorithmOptions = {
    regression: [
      { value: "linear_regression", label: "Linear Regression" },
      { value: "decision_tree", label: "Decision Tree Regression" },
    ],
    classification: [
      { value: "logistic_regression", label: "Logistic Regression" },
      { value: "decision_tree", label: "Decision Tree Classification" },
    ],
    clustering: [{ value: "kmeans", label: "K-Means Clustering" }],
  }

  // Reset selections when model type changes
  useEffect(() => {
    setAlgorithm(algorithmOptions[modelType][0].value)
    setSelectedFeatures([])
    setTargetColumn("")
  }, [modelType])

  // Auto-generate model name
  useEffect(() => {
    if (algorithm && targetColumn) {
      const algName = algorithmOptions[modelType].find((alg) => alg.value === algorithm)?.label || algorithm
      setModelName(`${algName} - ${targetColumn}`)
    } else if (algorithm && modelType === "clustering") {
      const algName = algorithmOptions[modelType].find((alg) => alg.value === algorithm)?.label || algorithm
      setModelName(`${algName} - ${selectedFeatures.length} features`)
    }
  }, [algorithm, targetColumn, selectedFeatures, modelType])

  const handleFeatureToggle = (feature: string) => {
    setSelectedFeatures((prev) => (prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]))
  }

  const validateTrainingInputs = (): string | null => {
    if (selectedFeatures.length === 0) {
      return "Please select at least one feature"
    }

    if (modelType !== "clustering" && !targetColumn) {
      return "Please select a target column"
    }

    if (modelType !== "clustering" && selectedFeatures.includes(targetColumn)) {
      return "Target column cannot be included in features"
    }

    if (processedData.length < 10) {
      return "Need at least 10 rows of data for training"
    }

    return null
  }

  const prepareTrainingData = () => {
    // Filter out rows with missing values in selected features and target
    const cleanData = processedData.filter((row) => {
      const featuresValid = selectedFeatures.every((feature) => {
        const value = row[feature]
        return value !== null && value !== undefined && value !== "" && !isNaN(Number(value))
      })

      if (modelType === "clustering") {
        return featuresValid
      }

      const targetValid = row[targetColumn] !== null && row[targetColumn] !== undefined && row[targetColumn] !== ""
      return featuresValid && targetValid
    })

    if (cleanData.length === 0) {
      throw new Error("No valid data rows after cleaning")
    }

    // Prepare feature matrix
    const X = cleanData.map((row) => selectedFeatures.map((feature) => Number(row[feature])))

    // Prepare target vector (if not clustering)
    let y: any[] = []
    if (modelType !== "clustering") {
      if (modelType === "classification") {
        // For classification, encode string targets to numbers
        const uniqueTargets = [...new Set(cleanData.map((row) => row[targetColumn]))]
        const targetMap = Object.fromEntries(uniqueTargets.map((target, index) => [target, index]))
        y = cleanData.map((row) => targetMap[row[targetColumn]])
      } else {
        // For regression, use numeric targets
        y = cleanData.map((row) => Number(row[targetColumn]))
      }
    }

    return { X, y, cleanData }
  }

  const trainModel = async () => {
    const validationError = validateTrainingInputs()
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      })
      return
    }

    setIsTraining(true)
    setTrainingProgress(0)

    try {
      // Simulate training progress
      const progressInterval = setInterval(() => {
        setTrainingProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const { X, y, cleanData } = prepareTrainingData()

      let model: any
      let predictions: any[] = []
      let performance: any = {}

      // Train based on algorithm
      switch (algorithm) {
        case "linear_regression":
          if (selectedFeatures.length !== 1) {
            throw new Error("Linear regression currently supports only single feature")
          }
          model = new SimpleLinearRegression()
          model.fit(
            X.map((row) => row[0]),
            y,
          )
          predictions = model.predict(X.map((row) => row[0]))
          performance = {
            rmse: calculateRMSE(y, predictions),
            r2Score: calculateR2Score(y, predictions),
          }
          break

        case "logistic_regression":
          model = new SimpleLogisticRegression()
          model.fit(X, y)
          predictions = model.predict(X)
          performance = {
            accuracy: calculateAccuracy(y, predictions),
            ...calculatePrecisionRecallF1(y, predictions),
          }
          break

        case "decision_tree":
          model = new SimpleDecisionTree()
          model.fit(X, y)
          predictions = model.predict(X)
          if (modelType === "classification") {
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

        case "kmeans":
          const k = Math.min(5, Math.floor(Math.sqrt(cleanData.length / 2)))
          model = new KMeansClustering(k)
          model.fit(X)
          predictions = model.predict(X)
          performance = {
            clusters: k,
            dataPoints: cleanData.length,
          }
          break

        default:
          throw new Error(`Unsupported algorithm: ${algorithm}`)
      }

      clearInterval(progressInterval)
      setTrainingProgress(100)

      // Create trained model object
      const trainedModelObj: MLModel = {
        id: `model_${Date.now()}`,
        name: modelName,
        type: modelType,
        algorithm,
        features: selectedFeatures,
        target: modelType !== "clustering" ? targetColumn : undefined,
        hyperparameters: {},
        performance,
        trainedAt: new Date(),
        isTraining: false,
      }

      setTrainedModel(trainedModelObj)
      addTrainedModel(trainedModelObj)

      toast({
        title: "Training Complete",
        description: `Model "${modelName}" has been trained successfully`,
      })
    } catch (error) {
      toast({
        title: "Training Failed",
        description: error instanceof Error ? error.message : "An error occurred during training",
        variant: "destructive",
      })
    } finally {
      setIsTraining(false)
      setTrainingProgress(0)
    }
  }

  if (!hasData) {
    return (
      <DataUploadPrompt
        title="Upload Data for ML Training"
        description="Machine learning model training requires data to be uploaded. Please upload a CSV or Excel file to begin training models."
        showBackButton={false}
      />
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manual">Manual Training</TabsTrigger>
          <TabsTrigger value="automl">Enhanced ML</TabsTrigger>
          <TabsTrigger value="results">Training Results</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Configure ML Model
              </CardTitle>
              <CardDescription>Set up your machine learning model parameters and features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Model Type Selection */}
              <div className="space-y-2">
                <Label>Model Type</Label>
                <Select value={modelType} onValueChange={(value: any) => setModelType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regression">Regression</SelectItem>
                    <SelectItem value="classification">Classification</SelectItem>
                    <SelectItem value="clustering">Clustering</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Algorithm Selection */}
              <div className="space-y-2">
                <Label>Algorithm</Label>
                <Select value={algorithm} onValueChange={setAlgorithm}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {algorithmOptions[modelType].map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Feature Selection */}
              <div className="space-y-2">
                <Label>Features ({selectedFeatures.length} selected)</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded p-2">
                  {numericColumns.map((feature) => (
                    <div key={feature} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={feature}
                        checked={selectedFeatures.includes(feature)}
                        onChange={() => handleFeatureToggle(feature)}
                        className="rounded"
                      />
                      <label htmlFor={feature} className="text-sm cursor-pointer">
                        {feature}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Target Selection (not for clustering) */}
              {modelType !== "clustering" && (
                <div className="space-y-2">
                  <Label>Target Column</Label>
                  <Select value={targetColumn} onValueChange={setTargetColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target column" />
                    </SelectTrigger>
                    <SelectContent>
                      {(modelType === "regression" ? numericColumns : [...numericColumns, ...categoricalColumns])
                        .filter((col) => !selectedFeatures.includes(col))
                        .map((col) => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Model Name */}
              <div className="space-y-2">
                <Label>Model Name</Label>
                <Input
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="Enter model name"
                />
              </div>

              {/* Training Progress */}
              {isTraining && (
                <div className="space-y-2">
                  <Label>Training Progress</Label>
                  <Progress value={trainingProgress} className="w-full" />
                  <p className="text-sm text-muted-foreground">Training model... {trainingProgress}%</p>
                </div>
              )}

              {/* Train Button */}
              <Button onClick={trainModel} disabled={isTraining} className="w-full">
                {isTraining ? (
                  <>
                    <Settings className="h-4 w-4 mr-2 animate-spin" />
                    Training...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Train Model
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automl" className="space-y-4">
          <EnhancedMLTrainer />
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Training Results
              </CardTitle>
              <CardDescription>View the performance metrics of your trained model</CardDescription>
            </CardHeader>
            <CardContent>
              {trainedModel ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Model trained successfully!</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Model Name</Label>
                      <p className="text-sm text-muted-foreground">{trainedModel.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Algorithm</Label>
                      <p className="text-sm text-muted-foreground">
                        {trainedModel.algorithm.replace("_", " ").toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Type</Label>
                      <p className="text-sm text-muted-foreground capitalize">{trainedModel.type}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Features</Label>
                      <p className="text-sm text-muted-foreground">{trainedModel.features.join(", ")}</p>
                    </div>
                    {trainedModel.target && (
                      <div>
                        <Label className="text-sm font-medium">Target</Label>
                        <p className="text-sm text-muted-foreground">{trainedModel.target}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm font-medium">Trained At</Label>
                      <p className="text-sm text-muted-foreground">{trainedModel.trainedAt?.toLocaleString()}</p>
                    </div>
                  </div>

                  {trainedModel.performance && (
                    <div>
                      <Label className="text-sm font-medium">Performance Metrics</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {trainedModel.performance.accuracy && (
                          <Badge variant="outline">
                            Accuracy: {(trainedModel.performance.accuracy * 100).toFixed(1)}%
                          </Badge>
                        )}
                        {trainedModel.performance.r2Score && (
                          <Badge variant="outline">R²: {trainedModel.performance.r2Score.toFixed(3)}</Badge>
                        )}
                        {trainedModel.performance.rmse && (
                          <Badge variant="outline">RMSE: {trainedModel.performance.rmse.toFixed(3)}</Badge>
                        )}
                        {trainedModel.performance.precision && (
                          <Badge variant="outline">
                            Precision: {(trainedModel.performance.precision * 100).toFixed(1)}%
                          </Badge>
                        )}
                        {trainedModel.performance.recall && (
                          <Badge variant="outline">Recall: {(trainedModel.performance.recall * 100).toFixed(1)}%</Badge>
                        )}
                        {trainedModel.performance.f1Score && (
                          <Badge variant="outline">F1: {(trainedModel.performance.f1Score * 100).toFixed(1)}%</Badge>
                        )}
                        {trainedModel.performance.clusters && (
                          <Badge variant="outline">Clusters: {trainedModel.performance.clusters}</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No model has been trained yet. Configure and train a model in the setup tab.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
