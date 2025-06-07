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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { useData } from "@/lib/data-context"
import { DataUploadPrompt } from "@/components/data-upload-prompt"
import { Brain, Target, AlertCircle, CheckCircle, Play, Settings, Download, Trash2, BarChart3, Zap } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface MLModel {
  id: string
  name: string
  algorithm: string
  taskType: string
  features: string[]
  target?: string
  performance: Record<string, any>
  createdAt: Date
  version: number
}

interface TrainingResult {
  modelId: string
  success: boolean
  performance: Record<string, any>
  featureImportance?: Array<{ feature: string; importance: number }>
  predictions?: any[]
  error?: string
  executionTime: number
}

export function EnhancedMLTrainer() {
  const { processedData, columns, columnTypes } = useData()
  const [taskType, setTaskType] = useState<"classification" | "regression" | "clustering">("classification")
  const [algorithm, setAlgorithm] = useState<string>("random_forest")
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [targetColumn, setTargetColumn] = useState<string>("")
  const [modelName, setModelName] = useState<string>("")
  const [isTraining, setIsTraining] = useState(false)
  const [trainingProgress, setTrainingProgress] = useState(0)
  const [trainedModels, setTrainedModels] = useState<MLModel[]>([])
  const [currentResult, setCurrentResult] = useState<TrainingResult | null>(null)
  const [hyperparameters, setHyperparameters] = useState<Record<string, any>>({})
  const [crossValidation, setCrossValidation] = useState(true)
  const [testSize, setTestSize] = useState(0.2)

  const numericColumns = columns.filter((col) => columnTypes[col] === "number")
  const categoricalColumns = columns.filter((col) => columnTypes[col] === "string" || columnTypes[col] === "boolean")
  const hasData = processedData.length > 0

  // Enhanced algorithm options with real ML algorithms
  const algorithmOptions = {
    classification: [
      { value: "random_forest", label: "Random Forest Classifier", description: "Ensemble method with high accuracy" },
      { value: "logistic_regression", label: "Logistic Regression", description: "Linear model for binary/multiclass" },
      { value: "svm", label: "Support Vector Machine", description: "Powerful for complex boundaries" },
      { value: "gradient_boosting", label: "Gradient Boosting", description: "Sequential ensemble method" },
      { value: "decision_tree", label: "Decision Tree", description: "Interpretable tree-based model" },
      { value: "neural_network", label: "Neural Network", description: "Multi-layer perceptron" },
    ],
    regression: [
      { value: "random_forest", label: "Random Forest Regressor", description: "Ensemble method for regression" },
      { value: "linear_regression", label: "Linear Regression", description: "Simple linear relationship" },
      { value: "svm", label: "Support Vector Regression", description: "Non-linear regression" },
      { value: "gradient_boosting", label: "Gradient Boosting Regressor", description: "Sequential boosting" },
      { value: "decision_tree", label: "Decision Tree Regressor", description: "Tree-based regression" },
      { value: "neural_network", label: "Neural Network Regressor", description: "Multi-layer perceptron" },
    ],
    clustering: [
      { value: "kmeans", label: "K-Means Clustering", description: "Centroid-based clustering" },
      { value: "dbscan", label: "DBSCAN", description: "Density-based clustering" },
      { value: "hierarchical", label: "Hierarchical Clustering", description: "Tree-based clustering" },
    ],
  }

  // Load saved models on component mount
  useEffect(() => {
    loadSavedModels()
  }, [])

  // Reset selections when model type changes
  useEffect(() => {
    setAlgorithm(algorithmOptions[taskType][0].value)
    setSelectedFeatures([])
    setTargetColumn("")
    setHyperparameters({})
  }, [taskType])

  // Auto-generate model name
  useEffect(() => {
    if (algorithm && (targetColumn || taskType === "clustering")) {
      const algName = algorithmOptions[taskType].find((alg) => alg.value === algorithm)?.label || algorithm
      const timestamp = new Date().toLocaleTimeString()
      if (taskType === "clustering") {
        setModelName(`${algName} - ${selectedFeatures.length} features - ${timestamp}`)
      } else {
        setModelName(`${algName} - ${targetColumn} - ${timestamp}`)
      }
    }
  }, [algorithm, targetColumn, selectedFeatures, taskType])

  const loadSavedModels = async () => {
    try {
      const response = await fetch("/api/ml/models")
      const data = await response.json()
      setTrainedModels(data.models || [])
    } catch (error) {
      console.error("Failed to load models:", error)
    }
  }

  const handleFeatureToggle = (feature: string) => {
    setSelectedFeatures((prev) => (prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]))
  }

  const validateTrainingInputs = (): string | null => {
    if (selectedFeatures.length === 0) {
      return "Please select at least one feature"
    }

    if (taskType !== "clustering" && !targetColumn) {
      return "Please select a target column"
    }

    if (taskType !== "clustering" && selectedFeatures.includes(targetColumn)) {
      return "Target column cannot be included in features"
    }

    if (processedData.length < 10) {
      return "Need at least 10 rows of data for training"
    }

    return null
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
    setCurrentResult(null)

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setTrainingProgress((prev) => Math.min(prev + 10, 90))
    }, 500)

    try {
      const trainingRequest = {
        data: processedData,
        features: selectedFeatures,
        target: taskType !== "clustering" ? targetColumn : undefined,
        taskType,
        algorithm,
        hyperparameters,
        crossValidation,
        testSize,
      }

      const response = await fetch("/api/ml/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trainingRequest),
      })

      const result = await response.json()

      clearInterval(progressInterval)
      setTrainingProgress(100)

      if (result.success) {
        setCurrentResult(result)

        // Add to trained models list
        const newModel: MLModel = {
          id: result.modelId,
          name: modelName,
          algorithm,
          taskType,
          features: selectedFeatures,
          target: taskType !== "clustering" ? targetColumn : undefined,
          performance: result.performance,
          createdAt: new Date(),
          version: 1,
        }

        setTrainedModels((prev) => [newModel, ...prev])

        toast({
          title: "Training Complete",
          description: `Model "${modelName}" has been trained successfully`,
        })
      } else {
        setCurrentResult(result)
        toast({
          title: "Training Failed",
          description: result.error || "An error occurred during training",
          variant: "destructive",
        })
      }
    } catch (error) {
      clearInterval(progressInterval)
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

  const deleteModel = async (modelId: string) => {
    try {
      const response = await fetch("/api/ml/models", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId }),
      })

      const result = await response.json()

      if (result.success) {
        setTrainedModels((prev) => prev.filter((model) => model.id !== modelId))
        toast({
          title: "Model Deleted",
          description: "Model has been deleted successfully",
        })
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete model",
        variant: "destructive",
      })
    }
  }

  const exportModel = async (modelId: string) => {
    try {
      const model = trainedModels.find((m) => m.id === modelId)
      if (!model) return

      const modelData = JSON.stringify(model, null, 2)
      const blob = new Blob([modelData], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${model.name.replace(/[^a-z0-9]/gi, "_")}.json`
      a.click()
      URL.revokeObjectURL(url)

      toast({
        title: "Model Exported",
        description: "Model has been exported successfully",
      })
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export model",
        variant: "destructive",
      })
    }
  }

  if (!hasData) {
    return (
      <DataUploadPrompt
        title="Upload Data for Enhanced ML Training"
        description="Enhanced machine learning training with real algorithms requires data to be uploaded. Please upload a CSV or Excel file to begin training models with scikit-learn and TensorFlow."
        showBackButton={false}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Zap className="h-6 w-6 text-blue-500" />
        <h2 className="text-2xl font-bold">Enhanced ML Trainer</h2>
        <Badge variant="secondary">Real Algorithms</Badge>
      </div>

      <Tabs defaultValue="configure" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="configure">Configure</TabsTrigger>
          <TabsTrigger value="train">Train Model</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="models">Saved Models</TabsTrigger>
        </TabsList>

        <TabsContent value="configure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Model Configuration
              </CardTitle>
              <CardDescription>Configure your machine learning model with real algorithms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Task Type Selection */}
              <div className="space-y-2">
                <Label>Task Type</Label>
                <Select value={taskType} onValueChange={(value: any) => setTaskType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classification">Classification</SelectItem>
                    <SelectItem value="regression">Regression</SelectItem>
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
                    {algorithmOptions[taskType].map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Feature Selection */}
              <div className="space-y-2">
                <Label>Features ({selectedFeatures.length} selected)</Label>
                <ScrollArea className="h-32 border rounded-md p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {numericColumns.map((feature) => (
                      <div key={feature} className="flex items-center space-x-2">
                        <Checkbox
                          id={feature}
                          checked={selectedFeatures.includes(feature)}
                          onCheckedChange={() => handleFeatureToggle(feature)}
                        />
                        <label htmlFor={feature} className="text-sm cursor-pointer">
                          {feature}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Target Selection (not for clustering) */}
              {taskType !== "clustering" && (
                <div className="space-y-2">
                  <Label>Target Column</Label>
                  <Select value={targetColumn} onValueChange={setTargetColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target column" />
                    </SelectTrigger>
                    <SelectContent>
                      {(taskType === "regression" ? numericColumns : [...numericColumns, ...categoricalColumns])
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

              {/* Advanced Options */}
              <div className="space-y-4 border-t pt-4">
                <Label className="text-base font-medium">Advanced Options</Label>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Test Size</Label>
                    <Input
                      type="number"
                      min="0.1"
                      max="0.5"
                      step="0.05"
                      value={testSize}
                      onChange={(e) => setTestSize(Number(e.target.value))}
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox id="crossValidation" checked={crossValidation} onCheckedChange={setCrossValidation} />
                    <label htmlFor="crossValidation" className="text-sm">
                      Cross Validation
                    </label>
                  </div>
                </div>
              </div>

              {/* Model Name */}
              <div className="space-y-2">
                <Label>Model Name</Label>
                <Input
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="Enter model name"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="train" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Train Model
              </CardTitle>
              <CardDescription>Train your model with real machine learning algorithms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Training Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Algorithm</Label>
                  <p className="font-medium">{algorithmOptions[taskType].find((a) => a.value === algorithm)?.label}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Features</Label>
                  <p className="font-medium">{selectedFeatures.length}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data Points</Label>
                  <p className="font-medium">{processedData.length}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Task Type</Label>
                  <p className="font-medium capitalize">{taskType}</p>
                </div>
              </div>

              {/* Training Progress */}
              {isTraining && (
                <div className="space-y-2">
                  <Label>Training Progress</Label>
                  <Progress value={trainingProgress} className="w-full" />
                  <p className="text-sm text-muted-foreground">
                    Training model with {algorithm}... {trainingProgress}%
                  </p>
                </div>
              )}

              {/* Train Button */}
              <Button
                onClick={trainModel}
                disabled={isTraining || !selectedFeatures.length || (taskType !== "clustering" && !targetColumn)}
                className="w-full"
                size="lg"
              >
                {isTraining ? (
                  <>
                    <Settings className="h-4 w-4 mr-2 animate-spin" />
                    Training Model...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Train Model with {algorithmOptions[taskType].find((a) => a.value === algorithm)?.label}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
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
              {currentResult ? (
                <div className="space-y-4">
                  {currentResult.success ? (
                    <>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Model trained successfully!</span>
                        <Badge variant="outline">{currentResult.executionTime}ms</Badge>
                      </div>

                      {/* Performance Metrics */}
                      {currentResult.performance && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Performance Metrics</Label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {Object.entries(currentResult.performance).map(([key, value]) => (
                              <Badge key={key} variant="outline" className="justify-center">
                                {key}: {typeof value === "number" ? value.toFixed(3) : value}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Feature Importance */}
                      {currentResult.featureImportance && currentResult.featureImportance.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Feature Importance</Label>
                          <div className="space-y-1">
                            {currentResult.featureImportance.slice(0, 5).map((item, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                                <span className="text-sm">{item.feature}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-20 bg-background rounded-full h-2">
                                    <div
                                      className="bg-primary h-2 rounded-full"
                                      style={{ width: `${item.importance * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {(item.importance * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <span className="font-medium">Training failed: {currentResult.error}</span>
                    </div>
                  )}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No training results yet. Configure and train a model to see results here.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Saved Models ({trainedModels.length})
              </CardTitle>
              <CardDescription>Manage your trained machine learning models</CardDescription>
            </CardHeader>
            <CardContent>
              {trainedModels.length > 0 ? (
                <div className="space-y-3">
                  {trainedModels.map((model) => (
                    <div key={model.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium">{model.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {model.algorithm.replace("_", " ").toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {model.taskType}
                            </Badge>
                            <span>{model.features.length} features</span>
                            <span>v{model.version}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => exportModel(model.id)} className="gap-1">
                            <Download className="h-3 w-3" />
                            Export
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteModel(model.id)}
                            className="gap-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </div>

                      {/* Performance Summary */}
                      {model.performance && Object.keys(model.performance).length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(model.performance)
                              .slice(0, 3)
                              .map(([key, value]) => (
                                <Badge key={key} variant="secondary" className="text-xs">
                                  {key}: {typeof value === "number" ? value.toFixed(3) : value}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-8 w-8 mx-auto mb-2" />
                  <p>No trained models yet</p>
                  <p className="text-sm">Train your first model to see it here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
