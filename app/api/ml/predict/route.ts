import { type NextRequest, NextResponse } from "next/server"
import { mlService } from "@/lib/ml-service"

export async function POST(request: NextRequest) {
  try {
    const { modelId, data } = await request.json()

    if (!modelId || !data) {
      return NextResponse.json({ error: "Model ID and data are required" }, { status: 400 })
    }

    const predictions = await mlService.predictWithModel(modelId, data)

    return NextResponse.json({
      success: true,
      predictions,
    })
  } catch (error) {
    console.error("ML prediction error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
