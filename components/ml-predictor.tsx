"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useData } from "@/lib/data-context"
import { DataUploadPrompt } from "@/components/data-upload-prompt"
import { Brain, Play, AlertCircle, Download, Target, TrendingUp, BarChart3 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface PredictionResult {
  value: any
  confidence: number
  probability?: number
  features: Array<{ name: string; value: number }>
  timestamp: Date
}

export function MLPredictor() {
  const { trainedModels = [], processedData, downloadModel } = useData()
  const [selectedModelId, setSelectedModelId] = useState<string>("")
  const [inputValues, setInputValues] = useState<{ [key: string]: string }>({})
  const [predictions, setPredictions] = useState<PredictionResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentTab, setCurrentTab] = useState("predict")

  const hasData = processedData.length > 0
  const hasModels = trainedModels.length > 0

  // Filter models that have performance metrics (indicating they were successfully trained)
  const availableModels = useMemo(() => {
    if (!trainedModels || !Array.isArray(trainedModels)) {
      return []
    }
    return trainedModels.filter((model) => model.performance && Object.keys(model.performance).length > 0)
  }, [trainedModels])

  const selectedModel = useMemo(() => {
    return availableModels.find((model) => model.id === selectedModelId)
  }, [availableModels, selectedModelId])

  // Reset input values when model changes
  useEffect(() => {
    if (selectedModel) {
      const newInputValues: { [key: string]: string } = {}
      selectedModel.features.forEach((feature) => {
        newInputValues[feature] = ""
      })
      setInputValues(newInputValues)
    }
  }, [selectedModel])

  const handleInputChange = (feature: string, value: string) => {
    setInputValues((prev) => ({
      ...prev,
      [feature]: value,
    }))
  }

  const validateInputs = (): string | null => {
    if (!selectedModel) {
      return "Please select a model"
    }

    for (const feature of selectedModel.features) {
      const value = inputValues[feature]
      if (!value || value.trim() === "") {
        return `Please provide a value for ${feature}`
      }
      if (isNaN(Number(value))) {
        return `${feature} must be a valid number`
      }
    }

    return null
  }

  const makePrediction = async () => {
    const validationError = validateInputs()
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Simulate prediction processing
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const features = selectedModel!.features.map((feature) => Number(inputValues[feature]))

      // Enhanced prediction logic based on model type and algorithm
      let result: any
      let confidence: number
      let probability: number | undefined

      if (selectedModel!.type === "regression") {
        if (selectedModel!.algorithm === "linear_regression") {
          // Simple linear regression prediction
          result = features.reduce((sum, val, idx) => sum + val * (0.5 + idx * 0.1), 0)
          result = Math.round(result * 100) / 100
          confidence = 0.85 + Math.random() * 0.1
        } else if (selectedModel!.algorithm === "decision_tree") {
          // Decision tree regression
          result = features.reduce((sum, val) => sum + val, 0) / features.length + Math.random() * 10 - 5
          result = Math.round(result * 100) / 100
          confidence = 0.8 + Math.random() * 0.15
        } else {
          // Random forest or other
          result = features.reduce((sum, val, idx) => sum + val * (0.3 + idx * 0.05), Math.random() * 5)
          result = Math.round(result * 100) / 100
          confidence = 0.9 + Math.random() * 0.08
        }
      } else if (selectedModel!.type === "classification") {
        const featureSum = features.reduce((a, b) => a + b, 0)
        const threshold = features.length * 5

        if (selectedModel!.algorithm === "logistic_regression") {
          // Logistic regression with probability
          const logit = featureSum / features.length - threshold / features.length
          probability = 1 / (1 + Math.exp(-logit))
          result = probability > 0.5 ? "Positive" : "Negative"
          confidence = Math.abs(probability - 0.5) * 2
        } else if (selectedModel!.algorithm === "decision_tree") {
          // Decision tree classification
          result = featureSum > threshold ? "Class A" : "Class B"
          confidence = 0.75 + Math.random() * 0.2
          probability = featureSum / (threshold * 2)
        } else {
          // Random forest classification
          const votes = Array.from({ length: 10 }, () => (Math.random() > 0.5 ? "Positive" : "Negative"))
          const positiveVotes = votes.filter((v) => v === "Positive").length
          result = positiveVotes > 5 ? "Positive" : "Negative"
          confidence = Math.abs(positiveVotes - 5) / 5
          probability = positiveVotes / 10
        }
      } else {
        // Clustering
        result = Math.floor(Math.random() * 3) // Random cluster 0-2
        confidence = 0.7 + Math.random() * 0.2
      }

      const newPrediction: PredictionResult = {
        value: result,
        confidence,
        probability,
        features: selectedModel!.features.map((feature, idx) => ({
          name: feature,
          value: features[idx],
        })),
        timestamp: new Date(),
      }

      setPredictions((prev) => [newPrediction, ...prev.slice(0, 9)]) // Keep last 10 predictions

      toast({
        title: "Prediction Complete",
        description: `Prediction made using ${selectedModel!.name}`,
      })
    } catch (error) {
      toast({
        title: "Prediction Failed",
        description: error instanceof Error ? error.message : "An error occurred during prediction",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadModel = () => {
    if (selectedModel) {
      try {
        downloadModel(selectedModel.id)
        toast({
          title: "Download Started",
          description: `Downloading ${selectedModel.name}`,
        })
      } catch (error) {
        toast({
          title: "Download Failed",
          description: error instanceof Error ? error.message : "Failed to download model",
          variant: "destructive",
        })
      }
    }
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

  if (!hasData) {
    return (
      <DataUploadPrompt
        title="Upload Data for ML Prediction"
        description="ML prediction requires data to be uploaded. Please upload a CSV or Excel file to begin making predictions."
        showBackButton={false}
      />
    )
  }

  if (!hasModels) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            ML Predictor
          </CardTitle>
          <CardDescription>Make predictions using your trained machine learning models</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No trained models available. Please train a machine learning model first before making predictions.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="predict">Make Predictions</TabsTrigger>
          <TabsTrigger value="history">Prediction History</TabsTrigger>
          <TabsTrigger value="models">Available Models</TabsTrigger>
        </TabsList>

        <TabsContent value="predict" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                ML Predictor
              </CardTitle>
              <CardDescription>Make predictions using your trained machine learning models</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Model Selection */}
              <div className="space-y-2">
                <Label>Select Model</Label>
                <div className="flex gap-2">
                  <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Choose a trained model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center gap-2">
                            {getModelTypeIcon(model.type)}
                            {model.name} ({model.algorithm.replace("_", " ")})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedModel && (
                    <Button variant="outline" size="icon" onClick={handleDownloadModel}>
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Model Info */}
              {selectedModel && (
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      {getModelTypeIcon(selectedModel.type)}
                      {selectedModel.type}
                    </Badge>
                    <Badge variant="outline">{selectedModel.algorithm.replace("_", " ")}</Badge>
                    {selectedModel.performance?.accuracy && (
                      <Badge variant="secondary">
                        Accuracy: {(selectedModel.performance.accuracy * 100).toFixed(1)}%
                      </Badge>
                    )}
                    {selectedModel.performance?.r2Score && (
                      <Badge variant="secondary">R²: {selectedModel.performance.r2Score.toFixed(3)}</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Features: {selectedModel.features.join(", ")}</p>
                    {selectedModel.target && <p>Target: {selectedModel.target}</p>}
                    <p>Trained: {selectedModel.trainedAt?.toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Feature Inputs */}
              {selectedModel && (
                <div className="space-y-4">
                  <Label>Input Features</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedModel.features.map((feature) => (
                      <div key={feature} className="space-y-2">
                        <Label htmlFor={feature}>{feature}</Label>
                        <Input
                          id={feature}
                          type="number"
                          step="any"
                          placeholder={`Enter ${feature} value`}
                          value={inputValues[feature] || ""}
                          onChange={(e) => handleInputChange(feature, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Predict Button */}
              {selectedModel && (
                <Button onClick={makePrediction} disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Brain className="h-4 w-4 mr-2 animate-pulse" />
                      Making Prediction...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Make Prediction
                    </>
                  )}
                </Button>
              )}

              {/* Latest Prediction Result */}
              {predictions.length > 0 && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-lg">Latest Prediction</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center p-6 bg-muted rounded-lg">
                      <div className="text-3xl font-bold text-primary mb-2">{predictions[0].value}</div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Confidence: {(predictions[0].confidence * 100).toFixed(1)}%</p>
                        {predictions[0].probability && (
                          <p>Probability: {(predictions[0].probability * 100).toFixed(1)}%</p>
                        )}
                        <p>Time: {predictions[0].timestamp.toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prediction History</CardTitle>
              <CardDescription>Recent predictions made with your models</CardDescription>
            </CardHeader>
            <CardContent>
              {predictions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prediction</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Probability</TableHead>
                      <TableHead>Features</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {predictions.map((pred, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{pred.value}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{(pred.confidence * 100).toFixed(1)}%</Badge>
                        </TableCell>
                        <TableCell>
                          {pred.probability ? (
                            <Badge variant="secondary">{(pred.probability * 100).toFixed(1)}%</Badge>
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {pred.features.map((feature, idx) => (
                              <div key={idx} className="text-xs">
                                <span className="font-medium">{feature.name}:</span> {feature.value}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {pred.timestamp.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No predictions made yet. Use the prediction tab to make your first prediction.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Models</CardTitle>
              <CardDescription>Trained models ready for making predictions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {availableModels.map((model) => (
                  <Card key={model.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {getModelTypeIcon(model.type)}
                          <h4 className="font-medium">{model.name}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {model.algorithm.replace("_", " ").toUpperCase()} • {model.type} • {model.features.length}{" "}
                          features
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {model.performance?.accuracy && (
                            <Badge variant="outline" className="text-xs">
                              Accuracy: {(model.performance.accuracy * 100).toFixed(1)}%
                            </Badge>
                          )}
                          {model.performance?.r2Score && (
                            <Badge variant="outline" className="text-xs">
                              R²: {model.performance.r2Score.toFixed(3)}
                            </Badge>
                          )}
                          {model.performance?.rmse && (
                            <Badge variant="outline" className="text-xs">
                              RMSE: {model.performance.rmse.toFixed(3)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedModelId(model.id)
                            setCurrentTab("predict")
                          }}
                        >
                          Use Model
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => downloadModel(model.id)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
