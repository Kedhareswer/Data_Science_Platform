import { type NextRequest, NextResponse } from "next/server"
import { mlService } from "@/lib/ml-service"

export async function POST(request: NextRequest) {
  try {
    const autoMLRequest = await request.json()

    // Validate request
    if (!autoMLRequest.data || !Array.isArray(autoMLRequest.data)) {
      return NextResponse.json({ error: "Data is required and must be an array" }, { status: 400 })
    }

    if (!autoMLRequest.targetColumn) {
      return NextResponse.json({ error: "Target column is required" }, { status: 400 })
    }

    if (!autoMLRequest.taskType) {
      return NextResponse.json({ error: "Task type is required" }, { status: 400 })
    }

    const result = await mlService.runAutoML(autoMLRequest)

    return NextResponse.json(result)
  } catch (error) {
    console.error("AutoML error:", error)
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
