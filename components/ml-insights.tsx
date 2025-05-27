"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MLModelComparison } from "@/components/ml-model-comparison"
import { useData } from "@/lib/data-context"
import { DataUploadPrompt } from "@/components/data-upload-prompt"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Brain, TrendingUp, AlertCircle } from "lucide-react"

export function MLInsights() {
  const { trainedModels, processedData } = useData()

  const hasData = processedData.length > 0
  const hasModels = trainedModels.length > 0

  // Transform trained models to comparison format
  const comparisonModels = useMemo(() => {
    return trainedModels.map((model) => ({
      name: model.name,
      accuracy: model.performance?.accuracy || 0,
      precision: model.performance?.precision || 0,
      recall: model.performance?.recall || 0,
      f1Score: model.performance?.f1Score || 0,
      description: `${model.algorithm.replace("_", " ")} - ${model.type}`,
    }))
  }, [trainedModels])

  // Calculate insights
  const insights = useMemo(() => {
    if (!hasModels) return []

    const insights = []

    // Best performing model
    const bestAccuracy = Math.max(...comparisonModels.map((m) => m.accuracy))
    const bestModel = comparisonModels.find((m) => m.accuracy === bestAccuracy)
    if (bestModel && bestAccuracy > 0) {
      insights.push({
        title: "Best Performing Model",
        description: `${bestModel.name} achieved the highest accuracy of ${(bestAccuracy * 100).toFixed(1)}%`,
        type: "success" as const,
      })
    }

    // Model diversity
    const uniqueAlgorithms = new Set(trainedModels.map((m) => m.algorithm))
    insights.push({
      title: "Model Diversity",
      description: `You have trained ${trainedModels.length} models using ${uniqueAlgorithms.size} different algorithms`,
      type: "info" as const,
    })

    // Performance distribution
    const avgAccuracy = comparisonModels.reduce((sum, m) => sum + m.accuracy, 0) / comparisonModels.length
    if (avgAccuracy > 0) {
      insights.push({
        title: "Average Performance",
        description: `Your models have an average accuracy of ${(avgAccuracy * 100).toFixed(1)}%`,
        type: avgAccuracy > 0.8 ? "success" : avgAccuracy > 0.6 ? "warning" : "error",
      })
    }

    return insights
  }, [comparisonModels, trainedModels, hasModels])

  if (!hasData) {
    return (
      <DataUploadPrompt
        title="Upload Data for ML Insights"
        description="ML insights require data to be uploaded. Please upload a CSV or Excel file to begin analyzing model performance."
        showBackButton={false}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Insights Cards */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map((insight, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {insight.type === "success" && <TrendingUp className="h-4 w-4 text-green-600" />}
                  {insight.type === "warning" && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                  {insight.type === "error" && <AlertCircle className="h-4 w-4 text-red-600" />}
                  {insight.type === "info" && <Brain className="h-4 w-4 text-blue-600" />}
                  {insight.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Model Comparison */}
      <MLModelComparison models={comparisonModels} />

      {/* No models message */}
      {!hasModels && (
        <Alert>
          <Brain className="h-4 w-4" />
          <AlertDescription>
            No trained models found. Train some machine learning models first to see insights and comparisons here.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
