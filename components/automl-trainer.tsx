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
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useData } from "@/lib/data-context"
import { DataUploadPrompt } from "@/components/data-upload-prompt"
import { AutoMLEngine, type AutoMLConfig, type AutoMLResult, type FeatureAnalysis } from "@/lib/automl-engine"
import {
  Brain,
  AlertCircle,
  CheckCircle,
  Play,
  Settings,
  Zap,
  TrendingUp,
  BarChart3,
  Lightbulb,
  Clock,
  Award,
  Cog,
  Target,
  AlertTriangle,
  Info,
  Eye,
  EyeOff,
  Filter,
  HelpCircle,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface AutoMLStep {
  name: string
  description: string
  completed: boolean
  duration?: number
}

export function AutoMLTrainer() {
  const { processedData, columns, columnTypes, addTrainedModel } = useData()
  const [config, setConfig] = useState<AutoMLConfig>({
    taskType: "auto",
    timeLimit: 300,
    maxModels: 5,
    crossValidation: true,
    featureEngineering: true,
    hyperparameterTuning: true,
    customFeatureSelection: {
      enabled: false,
      selectedFeatures: [],
      excludedFeatures: [],
    },
  })
  const [targetColumn, setTargetColumn] = useState<string>("")
  const [isRunning, setIsRunning] = useState(false)
  const [currentStep, setCurrentStep] = useState<string>("")
  const [progress, setProgress] = useState(0)
  const [automlResult, setAutomlResult] = useState<AutoMLResult | null>(null)
  const [featureAnalysis, setFeatureAnalysis] = useState<FeatureAnalysis[]>([])
  const [showFeatureDetails, setShowFeatureDetails] = useState(false)
  const [steps, setSteps] = useState<AutoMLStep[]>([
    { name: "Dataset Analysis", description: "Analyzing data characteristics and quality", completed: false },
    { name: "Feature Analysis", description: "Evaluating individual feature importance", completed: false },
    { name: "Preprocessing", description: "Applying automatic data preprocessing", completed: false },
    { name: "Feature Engineering", description: "Creating and selecting optimal features", completed: false },
    { name: "Model Selection", description: "Identifying best algorithms for your data", completed: false },
    { name: "Training & Tuning", description: "Training models with optimized parameters", completed: false },
    { name: "Evaluation", description: "Comparing models and selecting the best one", completed: false },
  ])

  const hasData = processedData.length > 0
  const numericColumns = columns.filter((col) => columnTypes[col] === "number")
  const allColumns = columns
  const availableFeatures = columns.filter((col) => col !== targetColumn)

  // Initialize feature analysis when data changes
  useEffect(() => {
    if (hasData && columns.length > 0) {
      analyzeFeatures()
    }
  }, [hasData, columns, targetColumn])

  // Initialize selected features when feature analysis is complete
  useEffect(() => {
    if (featureAnalysis.length > 0 && config.customFeatureSelection?.selectedFeatures.length === 0) {
      const recommendedFeatures = featureAnalysis
        .filter((f) => f.recommendation === "required" || f.recommendation === "recommended")
        .map((f) => f.feature)

      setConfig((prev) => ({
        ...prev,
        customFeatureSelection: {
          ...prev.customFeatureSelection!,
          selectedFeatures: recommendedFeatures.length > 0 ? recommendedFeatures : availableFeatures.slice(0, 10),
        },
      }))
    }
  }, [featureAnalysis, availableFeatures])

  const analyzeFeatures = async () => {
    if (!hasData) return

    // Simulate feature analysis
    const analysis: FeatureAnalysis[] = availableFeatures.map((feature) => {
      const values = processedData.map((row) => row[feature]).filter((v) => v !== null && v !== undefined && v !== "")
      const totalValues = processedData.length
      const missingPercentage = ((totalValues - values.length) / totalValues) * 100
      const uniqueValues = new Set(values).size
      const dataType = columnTypes[feature]

      // Calculate correlation with target if numeric
      let correlation = 0
      if (targetColumn && columnTypes[targetColumn] === "number" && dataType === "number") {
        const targetValues = processedData.map((row) => Number(row[targetColumn])).filter((v) => !isNaN(v))
        const featureValues = processedData.map((row) => Number(row[feature])).filter((v) => !isNaN(v))
        if (targetValues.length > 0 && featureValues.length > 0) {
          correlation = Math.abs(calculateCorrelation(featureValues, targetValues))
        }
      }

      // Calculate importance
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
        importance: Math.min(importance, 1),
        dataType,
        missingPercentage,
        uniqueValues,
        correlation,
        recommendation,
        reasoning,
        warnings,
      }
    })

    setFeatureAnalysis(analysis)
  }

  const calculateCorrelation = (x: number[], y: number[]): number => {
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

  const updateStepProgress = (stepName: string, completed: boolean, duration?: number) => {
    setSteps((prev) => prev.map((step) => (step.name === stepName ? { ...step, completed, duration } : step)))
  }

  const handleFeatureToggle = (feature: string, checked: boolean) => {
    setConfig((prev) => {
      const currentSelected = prev.customFeatureSelection?.selectedFeatures || []
      const newSelected = checked ? [...currentSelected, feature] : currentSelected.filter((f) => f !== feature)

      return {
        ...prev,
        customFeatureSelection: {
          ...prev.customFeatureSelection!,
          selectedFeatures: newSelected,
          excludedFeatures: availableFeatures.filter((f) => !newSelected.includes(f)),
        },
      }
    })
  }

  const selectFeaturesByRecommendation = (recommendations: string[]) => {
    const selectedFeatures = featureAnalysis
      .filter((f) => recommendations.includes(f.recommendation))
      .map((f) => f.feature)

    setConfig((prev) => ({
      ...prev,
      customFeatureSelection: {
        ...prev.customFeatureSelection!,
        selectedFeatures,
        excludedFeatures: availableFeatures.filter((f) => !selectedFeatures.includes(f)),
      },
    }))
  }

  const getFeatureSelectionWarnings = () => {
    const selectedFeatures = config.customFeatureSelection?.selectedFeatures || []
    const warnings: string[] = []

    if (selectedFeatures.length === 0) {
      warnings.push("No features selected - model training will fail")
    } else if (selectedFeatures.length === 1) {
      warnings.push("Only one feature selected - consider adding more for better performance")
    }

    const discouragedSelected = featureAnalysis.filter(
      (f) => selectedFeatures.includes(f.feature) && f.recommendation === "discouraged",
    )
    if (discouragedSelected.length > 0) {
      warnings.push(`Discouraged features selected: ${discouragedSelected.map((f) => f.feature).join(", ")}`)
    }

    const requiredMissing = featureAnalysis.filter(
      (f) => !selectedFeatures.includes(f.feature) && f.recommendation === "required",
    )
    if (requiredMissing.length > 0) {
      warnings.push(`Important features not selected: ${requiredMissing.map((f) => f.feature).join(", ")}`)
    }

    return warnings
  }

  const runAutoML = async () => {
    if (!hasData) {
      toast({
        title: "No Data",
        description: "Please upload data before running AutoML",
        variant: "destructive",
      })
      return
    }

    if (config.taskType !== "clustering" && !targetColumn) {
      toast({
        title: "Target Required",
        description: "Please select a target column for supervised learning",
        variant: "destructive",
      })
      return
    }

    const warnings = getFeatureSelectionWarnings()
    if (warnings.length > 0 && config.customFeatureSelection?.enabled) {
      const warningMessage = `Feature selection warnings:\n${warnings.join("\n")}\n\nDo you want to proceed anyway?`
      const proceed = window.confirm(warningMessage)
      if (!proceed) return
    }

    setIsRunning(true)
    setProgress(0)
    setAutomlResult(null)

    // Reset steps
    setSteps((prev) => prev.map((step) => ({ ...step, completed: false, duration: undefined })))

    try {
      const engine = new AutoMLEngine(config)

      // Step 1: Dataset Analysis
      setCurrentStep("Analyzing dataset...")
      setProgress(10)
      updateStepProgress("Dataset Analysis", false)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      updateStepProgress("Dataset Analysis", true, 1.2)

      // Step 2: Feature Analysis
      setCurrentStep("Analyzing features...")
      setProgress(20)
      updateStepProgress("Feature Analysis", false)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      updateStepProgress("Feature Analysis", true, 1.5)

      // Step 3: Preprocessing
      setCurrentStep("Applying preprocessing...")
      setProgress(35)
      updateStepProgress("Preprocessing", false)
      await new Promise((resolve) => setTimeout(resolve, 1500))
      updateStepProgress("Preprocessing", true, 2.1)

      // Step 4: Feature Engineering
      setCurrentStep("Engineering features...")
      setProgress(50)
      updateStepProgress("Feature Engineering", false)
      await new Promise((resolve) => setTimeout(resolve, 2000))
      updateStepProgress("Feature Engineering", true, 3.5)

      // Step 5: Model Selection
      setCurrentStep("Selecting optimal models...")
      setProgress(65)
      updateStepProgress("Model Selection", false)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      updateStepProgress("Model Selection", true, 1.8)

      // Step 6: Training & Tuning
      setCurrentStep("Training and tuning models...")
      setProgress(80)
      updateStepProgress("Training & Tuning", false)

      // Run the actual AutoML
      const result = await engine.runAutoML(processedData, columns, columnTypes, targetColumn || undefined)

      updateStepProgress("Training & Tuning", true, result.executionTime / 1000)

      // Step 7: Evaluation
      setCurrentStep("Evaluating and selecting best model...")
      setProgress(95)
      updateStepProgress("Evaluation", false)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      updateStepProgress("Evaluation", true, 1.5)

      setProgress(100)
      setAutomlResult(result)

      // Add the best model to trained models
      addTrainedModel(result.bestModel)

      // Add all other models too
      result.allModels.forEach((model) => {
        if (model.id !== result.bestModel.id) {
          addTrainedModel(model)
        }
      })

      toast({
        title: "AutoML Complete!",
        description: `Successfully trained ${result.allModels.length} models. Best model: ${result.bestModel.name}`,
      })
    } catch (error) {
      toast({
        title: "AutoML Failed",
        description: error instanceof Error ? error.message : "An error occurred during AutoML",
        variant: "destructive",
      })
    } finally {
      setIsRunning(false)
      setCurrentStep("")
    }
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    return `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(0)}s`
  }

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case "required":
        return "bg-red-100 text-red-800 border-red-200"
      case "recommended":
        return "bg-green-100 text-green-800 border-green-200"
      case "optional":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "discouraged":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case "required":
        return <AlertTriangle className="h-3 w-3" />
      case "recommended":
        return <CheckCircle className="h-3 w-3" />
      case "optional":
        return <Info className="h-3 w-3" />
      case "discouraged":
        return <AlertCircle className="h-3 w-3" />
      default:
        return <HelpCircle className="h-3 w-3" />
    }
  }

  if (!hasData) {
    return (
      <DataUploadPrompt
        title="Upload Data for AutoML"
        description="AutoML requires data to automatically build and optimize machine learning models. Please upload a CSV or Excel file to begin."
        showBackButton={false}
      />
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Automated Machine Learning (AutoML)
          </CardTitle>
          <CardDescription>
            Let AI automatically build, optimize, and select the best machine learning model for your data
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="features">Feature Selection</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Basic Configuration
                </CardTitle>
                <CardDescription>Configure the AutoML task and target</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Task Type</Label>
                  <Select
                    value={config.taskType}
                    onValueChange={(value: any) => setConfig({ ...config, taskType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-detect</SelectItem>
                      <SelectItem value="classification">Classification</SelectItem>
                      <SelectItem value="regression">Regression</SelectItem>
                      <SelectItem value="clustering">Clustering</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {config.taskType !== "clustering" && (
                  <div className="space-y-2">
                    <Label>Target Column</Label>
                    <Select value={targetColumn} onValueChange={setTargetColumn}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select target column" />
                      </SelectTrigger>
                      <SelectContent>
                        {allColumns.map((col) => (
                          <SelectItem key={col} value={col}>
                            <div className="flex items-center gap-2">
                              <span>{col}</span>
                              <Badge variant="outline" className="text-xs">
                                {columnTypes[col]}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Time Limit (seconds)</Label>
                  <Input
                    type="number"
                    value={config.timeLimit}
                    onChange={(e) => setConfig({ ...config, timeLimit: Number(e.target.value) })}
                    min={60}
                    max={1800}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Maximum Models to Train</Label>
                  <Input
                    type="number"
                    value={config.maxModels}
                    onChange={(e) => setConfig({ ...config, maxModels: Number(e.target.value) })}
                    min={1}
                    max={20}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Advanced Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cog className="h-5 w-5" />
                  Advanced Options
                </CardTitle>
                <CardDescription>Fine-tune the AutoML process</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Custom Feature Selection</Label>
                    <p className="text-sm text-muted-foreground">Manually select features for training</p>
                  </div>
                  <Switch
                    checked={config.customFeatureSelection?.enabled}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        customFeatureSelection: { ...config.customFeatureSelection!, enabled: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Feature Engineering</Label>
                    <p className="text-sm text-muted-foreground">Automatically create new features</p>
                  </div>
                  <Switch
                    checked={config.featureEngineering}
                    onCheckedChange={(checked) => setConfig({ ...config, featureEngineering: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Hyperparameter Tuning</Label>
                    <p className="text-sm text-muted-foreground">Optimize model parameters</p>
                  </div>
                  <Switch
                    checked={config.hyperparameterTuning}
                    onCheckedChange={(checked) => setConfig({ ...config, hyperparameterTuning: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Cross Validation</Label>
                    <p className="text-sm text-muted-foreground">Validate model performance</p>
                  </div>
                  <Switch
                    checked={config.crossValidation}
                    onCheckedChange={(checked) => setConfig({ ...config, crossValidation: checked })}
                  />
                </div>

                <div className="pt-4">
                  <Button onClick={runAutoML} disabled={isRunning} className="w-full" size="lg">
                    {isRunning ? (
                      <>
                        <Settings className="h-4 w-4 mr-2 animate-spin" />
                        Running AutoML...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Start AutoML
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Feature Selection
                {config.customFeatureSelection?.enabled && (
                  <Badge variant="outline">{config.customFeatureSelection.selectedFeatures.length} selected</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {config.customFeatureSelection?.enabled
                  ? "Select which features to include in model training"
                  : "Enable custom feature selection in configuration to manually choose features"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!config.customFeatureSelection?.enabled ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Custom feature selection is disabled. Enable it in the configuration tab to manually select
                    features.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {/* Feature Selection Warnings */}
                  {getFeatureSelectionWarnings().length > 0 && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          {getFeatureSelectionWarnings().map((warning, idx) => (
                            <div key={idx}>• {warning}</div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Quick Selection Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectFeaturesByRecommendation(["required", "recommended"])}
                    >
                      Select Recommended
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => selectFeaturesByRecommendation(["required"])}>
                      Select Required Only
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          customFeatureSelection: {
                            ...prev.customFeatureSelection!,
                            selectedFeatures: availableFeatures,
                            excludedFeatures: [],
                          },
                        }))
                      }
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          customFeatureSelection: {
                            ...prev.customFeatureSelection!,
                            selectedFeatures: [],
                            excludedFeatures: availableFeatures,
                          },
                        }))
                      }
                    >
                      Clear All
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowFeatureDetails(!showFeatureDetails)}>
                      {showFeatureDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showFeatureDetails ? "Hide" : "Show"} Details
                    </Button>
                  </div>

                  {/* Feature List */}
                  <ScrollArea className="h-[500px] border rounded-lg p-4">
                    <div className="space-y-3">
                      {featureAnalysis.map((feature) => {
                        const isSelected = config.customFeatureSelection?.selectedFeatures.includes(feature.feature)
                        return (
                          <div
                            key={feature.feature}
                            className={`p-3 border rounded-lg transition-colors ${
                              isSelected ? "bg-blue-50 border-blue-200" : "bg-white"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => handleFeatureToggle(feature.feature, checked as boolean)}
                                className="mt-1"
                              />
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{feature.feature}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {feature.dataType}
                                    </Badge>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Badge
                                            className={`text-xs ${getRecommendationColor(feature.recommendation)}`}
                                          >
                                            {getRecommendationIcon(feature.recommendation)}
                                            {feature.recommendation}
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <div className="space-y-1">
                                            {feature.reasoning.map((reason, idx) => (
                                              <div key={idx}>• {reason}</div>
                                            ))}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      Importance: {(feature.importance * 100).toFixed(0)}%
                                    </Badge>
                                    {feature.correlation !== undefined && (
                                      <Badge variant="outline" className="text-xs">
                                        Correlation: {(feature.correlation * 100).toFixed(0)}%
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                {showFeatureDetails && (
                                  <div className="text-sm text-muted-foreground space-y-1">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>Missing: {feature.missingPercentage.toFixed(1)}%</div>
                                      <div>Unique values: {feature.uniqueValues.toLocaleString()}</div>
                                    </div>
                                    {feature.reasoning.length > 0 && (
                                      <div>
                                        <span className="font-medium">Reasoning:</span>
                                        <ul className="ml-4">
                                          {feature.reasoning.map((reason, idx) => (
                                            <li key={idx}>• {reason}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {feature.warnings.length > 0 && (
                                      <div className="text-yellow-600">
                                        <span className="font-medium">Warnings:</span>
                                        <ul className="ml-4">
                                          {feature.warnings.map((warning, idx) => (
                                            <li key={idx}>• {warning}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        {
                          featureAnalysis.filter((f) =>
                            config.customFeatureSelection?.selectedFeatures.includes(f.feature),
                          ).length
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">Selected</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-600">
                        {
                          featureAnalysis.filter(
                            (f) =>
                              config.customFeatureSelection?.selectedFeatures.includes(f.feature) &&
                              f.recommendation === "required",
                          ).length
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">Required</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {
                          featureAnalysis.filter(
                            (f) =>
                              config.customFeatureSelection?.selectedFeatures.includes(f.feature) &&
                              f.recommendation === "recommended",
                          ).length
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">Recommended</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-yellow-600">
                        {
                          featureAnalysis.filter(
                            (f) =>
                              config.customFeatureSelection?.selectedFeatures.includes(f.feature) &&
                              f.recommendation === "discouraged",
                          ).length
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">Discouraged</div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                AutoML Progress
              </CardTitle>
              <CardDescription>{isRunning ? `Currently: ${currentStep}` : "AutoML process status"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isRunning && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={step.name} className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="flex-shrink-0">
                      {step.completed ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : currentStep.includes(step.name.toLowerCase()) ? (
                        <Settings className="h-5 w-5 text-blue-600 animate-spin" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{step.name}</h4>
                        {step.duration && (
                          <Badge variant="outline" className="text-xs">
                            {formatDuration(step.duration)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {automlResult ? (
            <div className="space-y-6">
              {/* Best Model Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-yellow-500" />
                    Best Model Selected
                  </CardTitle>
                  <CardDescription>AutoML has identified the optimal model for your data</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{automlResult.bestModel.name}</div>
                      <div className="text-sm text-muted-foreground">Algorithm</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {automlResult.bestModel.performance?.accuracy
                          ? `${(automlResult.bestModel.performance.accuracy * 100).toFixed(1)}%`
                          : automlResult.bestModel.performance?.r2Score
                            ? automlResult.bestModel.performance.r2Score.toFixed(3)
                            : "N/A"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {automlResult.bestModel.performance?.accuracy ? "Accuracy" : "R² Score"}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {automlResult.featureEngineering.selectedFeatures.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Features Used</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{formatDuration(automlResult.executionTime / 1000)}</div>
                      <div className="text-sm text-muted-foreground">Training Time</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Feature Selection Results */}
              {config.customFeatureSelection?.enabled && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Feature Selection Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Selected Features</Label>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {config.customFeatureSelection.selectedFeatures.map((feature) => {
                            const analysis = featureAnalysis.find((f) => f.feature === feature)
                            return (
                              <Badge
                                key={feature}
                                className={analysis ? getRecommendationColor(analysis.recommendation) : ""}
                              >
                                {feature}
                              </Badge>
                            )
                          })}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Excluded Features</Label>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {config.customFeatureSelection.excludedFeatures.map((feature) => (
                            <Badge key={feature} variant="outline" className="text-xs opacity-60">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Dataset Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Dataset Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-xl font-bold">
                        {automlResult.datasetAnalysis.dataQualityScore.toFixed(1)}
                      </div>
                      <div className="text-sm text-muted-foreground">Data Quality Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold">
                        {automlResult.datasetAnalysis.missingValuePercentage.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Missing Values</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold">
                        {automlResult.datasetAnalysis.outlierPercentage.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Outliers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold">{automlResult.allModels.length}</div>
                      <div className="text-sm text-muted-foreground">Models Trained</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Feature Engineering Results */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Feature Engineering Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Original Features</Label>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {automlResult.featureEngineering.originalFeatures.slice(0, 10).map((feature) => (
                          <Badge key={feature} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                        {automlResult.featureEngineering.originalFeatures.length > 10 && (
                          <Badge variant="outline" className="text-xs">
                            +{automlResult.featureEngineering.originalFeatures.length - 10} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Engineered Features</Label>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {automlResult.featureEngineering.engineeredFeatures.length > 0 ? (
                          automlResult.featureEngineering.engineeredFeatures.slice(0, 10).map((feature) => (
                            <Badge key={feature} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">None created</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Selected Features</Label>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {automlResult.featureEngineering.selectedFeatures.slice(0, 10).map((feature) => (
                          <Badge key={feature} variant="default" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {automlResult.featureEngineering.transformations.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Applied Transformations</Label>
                      <div className="mt-2 space-y-2">
                        {automlResult.featureEngineering.transformations.map((transform, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <Badge variant="outline">{transform.type.replace("_", " ")}</Badge>
                            <span className="text-muted-foreground">{transform.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Model Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Model Recommendations & Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {automlResult.modelRecommendations.map((rec, idx) => (
                        <div key={idx} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{rec.algorithm.replace("_", " ").toUpperCase()}</h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Confidence: {(rec.confidence * 100).toFixed(0)}%</Badge>
                              <Badge variant="secondary">{rec.expectedPerformance}</Badge>
                            </div>
                          </div>
                          <div className="space-y-1">
                            {rec.reasoning.map((reason, reasonIdx) => (
                              <p key={reasonIdx} className="text-sm text-muted-foreground">
                                • {reason}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Preprocessing Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Preprocessing Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {automlResult.preprocessingRecommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                        <Badge
                          variant={
                            rec.priority === "high"
                              ? "destructive"
                              : rec.priority === "medium"
                                ? "default"
                                : "secondary"
                          }
                          className="mt-0.5"
                        >
                          {rec.priority}
                        </Badge>
                        <div className="flex-1">
                          <h4 className="font-medium">{rec.step.replace("_", " ").toUpperCase()}</h4>
                          <p className="text-sm text-muted-foreground">{rec.reasoning}</p>
                          <p className="text-sm text-green-600 mt-1">{rec.expectedImprovement}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    AutoML Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {automlResult.insights.map((insight, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{insight}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Results Yet</CardTitle>
                <CardDescription>Run AutoML to see detailed results and insights</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Configure your AutoML settings and click "Start AutoML" to begin the automated machine learning
                    process.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>View AutoML results and model performance</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Results will appear here after running AutoML. Switch to the Progress tab to view results.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
