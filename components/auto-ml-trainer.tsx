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
import { 
  Brain, 
  Target, 
  AlertCircle, 
  CheckCircle, 
  Play, 
  Settings, 
  Download, 
  Trash2, 
  BarChart3, 
  Zap,
  Sparkles
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface AutoMLResult {
  modelId: string
  success: boolean
  bestAlgorithm: string
  bestScore: number
  allModels: Array<{
    algorithm: string
    score: number
    hyperparameters: Record<string, any>
    performance: Record<string, any>
  }>
  featureImportance?: Array<{ feature: string; importance: number }>
  executionTime: number
  error?: string
}

export function AutoMLTrainer() {
  const { processedData, columns, columnTypes } = useData()
  const [taskType, setTaskType] = useState<"classification" | "regression">("classification")
  const [targetColumn, setTargetColumn] = useState<string>("")
  const [modelName, setModelName] = useState<string>("")
  const [isTraining, setIsTraining] = useState(false)
  const [trainingProgress, setTrainingProgress] = useState(0)
  const [autoMLResult, setAutoMLResult] = useState<AutoMLResult | null>(null)
  const [maxModels, setMaxModels] = useState(5)
  const [maxTime, setMaxTime] = useState(120)
  const [optimizeFor, setOptimizeFor] = useState<"accuracy" | "speed" | "balanced">("balanced")

  const numericColumns = columns.filter((col) => columnTypes[col] === "number")
  const categoricalColumns = columns.filter((col) => columnTypes[col] === "string" || columnTypes[col] === "boolean")
  const hasData = processedData.length > 0

  // Auto-generate model name
  useEffect(() => {
    if (targetColumn) {
      const timestamp = new Date().toLocaleTimeString()
      setModelName(`AutoML - ${taskType} - ${targetColumn} - ${timestamp}`)
    }
  }, [targetColumn, taskType])

  const validateTrainingInputs = (): string | null => {
    if (!targetColumn) {
      return "Please select a target column"
    }

    if (processedData.length < 10) {
      return "Need at least 10 rows of data for training"
    }

    return null
  }

  const trainModels = async () => {
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
    setAutoMLResult(null)

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setTrainingProgress((prev) => Math.min(prev + 5, 95))
    }, 1000)

    try {
      const autoMLRequest = {
        data: processedData,
        targetColumn,
        taskType,
        maxModels,
        maxTime,
        optimizeFor,
      }

      const response = await fetch("/api/ml/automl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(autoMLRequest),
      })

      const result = await response.json()

      clearInterval(progressInterval)
      setTrainingProgress(100)

      if (result.success) {
        setAutoMLResult(result)
        toast({
          title: "AutoML Complete",
          description: `Best model: ${result.bestAlgorithm} with score: ${result.bestScore.toFixed(4)}`,
        })
      } else {
        toast({
          title: "AutoML Failed",
          description: result.error || "An error occurred during AutoML process",
          variant: "destructive",
        })
      }
    } catch (error) {
      clearInterval(progressInterval)
      toast({
        title: "AutoML Failed",
        description: error instanceof Error ? error.message : "An error occurred during AutoML process",
        variant: "destructive",
      })
    } finally {
      setIsTraining(false)
      setTrainingProgress(0)
    }
  }

  const saveModel = async () => {
    if (!autoMLResult) return

    try {
      const response = await fetch("/api/ml/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: autoMLResult.modelId,
          name: modelName,
          saveAs: "best", // or "all" to save all models
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Model Saved",
          description: `Model "${modelName}" has been saved to your collection`,
        })
      } else {
        toast({
          title: "Save Failed",
          description: result.error || "Failed to save model",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "An error occurred while saving the model",
        variant: "destructive",
      })
    }
  }

  if (!hasData) {
    return <DataUploadPrompt />
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Auto ML Trainer
              </CardTitle>
              <CardDescription>
                Automatically train and compare multiple ML models to find the best one
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="task-type">Task Type</Label>
                <Select value={taskType} onValueChange={(value) => setTaskType(value as any)}>
                  <SelectTrigger id="task-type">
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classification">Classification</SelectItem>
                    <SelectItem value="regression">Regression</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="target-column">Target Column</Label>
                <Select value={targetColumn} onValueChange={setTargetColumn}>
                  <SelectTrigger id="target-column">
                    <SelectValue placeholder="Select target column" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((column) => (
                      <SelectItem key={column} value={column}>
                        {column} {columnTypes[column] ? `(${columnTypes[column]})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="model-name">Model Name</Label>
                <Input
                  id="model-name"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="Enter model name"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="max-models">Max Models to Try</Label>
                <Input
                  id="max-models"
                  type="number"
                  min="1"
                  max="20"
                  value={maxModels}
                  onChange={(e) => setMaxModels(parseInt(e.target.value))}
                />
              </div>

              <div>
                <Label htmlFor="max-time">Max Training Time (seconds)</Label>
                <Input
                  id="max-time"
                  type="number"
                  min="30"
                  max="600"
                  value={maxTime}
                  onChange={(e) => setMaxTime(parseInt(e.target.value))}
                />
              </div>

              <div>
                <Label htmlFor="optimize-for">Optimize For</Label>
                <Select value={optimizeFor} onValueChange={(value) => setOptimizeFor(value as any)}>
                  <SelectTrigger id="optimize-for">
                    <SelectValue placeholder="Select optimization goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accuracy">Accuracy</SelectItem>
                    <SelectItem value="speed">Speed</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <Button
              onClick={trainModels}
              disabled={isTraining}
              className="w-full md:w-auto"
              size="lg"
            >
              {isTraining ? (
                <>
                  <Brain className="mr-2 h-4 w-4 animate-pulse" /> Training Models...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> Start AutoML Training
                </>
              )}
            </Button>
          </div>

          {isTraining && (
            <div className="space-y-2">
              <Progress value={trainingProgress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">
                Training and evaluating multiple models... {trainingProgress}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {autoMLResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              AutoML Results
            </CardTitle>
            <CardDescription>
              Completed in {(autoMLResult.executionTime / 1000).toFixed(2)} seconds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted rounded-lg p-4">
              <h3 className="text-lg font-medium mb-2">Best Model</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium">Algorithm</p>
                  <p className="text-lg">{autoMLResult.bestAlgorithm}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Score</p>
                  <p className="text-lg">{autoMLResult.bestScore.toFixed(4)}</p>
                </div>
                <div>
                  <Button onClick={saveModel} size="sm">
                    <Download className="mr-2 h-4 w-4" /> Save Best Model
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">All Models Compared</h3>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {autoMLResult.allModels
                    .sort((a, b) => b.score - a.score)
                    .map((model, index) => (
                      <Card key={index} className={index === 0 ? "border-green-500" : ""}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">
                                {model.algorithm}
                                {index === 0 && (
                                  <Badge className="ml-2 bg-green-500" variant="secondary">
                                    Best
                                  </Badge>
                                )}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Score: {model.score.toFixed(4)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm">
                                {taskType === "classification"
                                  ? `Accuracy: ${(model.performance.accuracy || 0).toFixed(4)}`
                                  : `R²: ${(model.performance.r2 || 0).toFixed(4)}`}
                              </p>
                              {taskType === "classification" && (
                                <p className="text-xs text-muted-foreground">
                                  F1: {(model.performance.f1 || 0).toFixed(4)}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </ScrollArea>
            </div>

            {autoMLResult.featureImportance && (
              <div>
                <h3 className="text-lg font-medium mb-4">Feature Importance</h3>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {autoMLResult.featureImportance
                      .sort((a, b) => b.importance - a.importance)
                      .map((feature, index) => (
                        <div key={index} className="flex items-center">
                          <div className="w-1/3 text-sm truncate">{feature.feature}</div>
                          <div className="w-2/3">
                            <div className="flex items-center">
                              <div
                                className="bg-primary h-4 rounded"
                                style={{
                                  width: `${Math.max(
                                    feature.importance * 100,
                                    2
                                  )}%`,
                                }}
                              />
                              <span className="ml-2 text-sm">
                                {(feature.importance * 100).toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
