import { type NextRequest, NextResponse } from "next/server"
import { mlService, type MLTrainingRequest } from "@/lib/ml-service"

export async function POST(request: NextRequest) {
  try {
    const trainingRequest: MLTrainingRequest = await request.json()

    // Validate request
    if (!trainingRequest.data || !Array.isArray(trainingRequest.data)) {
      return NextResponse.json({ error: "Data is required and must be an array" }, { status: 400 })
    }

    if (!trainingRequest.features || !Array.isArray(trainingRequest.features)) {
      return NextResponse.json({ error: "Features are required and must be an array" }, { status: 400 })
    }

    if (!trainingRequest.taskType || !trainingRequest.algorithm) {
      return NextResponse.json({ error: "Task type and algorithm are required" }, { status: 400 })
    }

    const result = await mlService.trainModel(trainingRequest)

    return NextResponse.json(result)
  } catch (error) {
    console.error("ML training error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        executionTime: 0,
      },
      { status: 500 },
    )
  }
}
