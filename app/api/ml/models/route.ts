import { type NextRequest, NextResponse } from "next/server"
import { mlService } from "@/lib/ml-service"

export async function GET() {
  try {
    const models = mlService.getAllModels()
    return NextResponse.json({ models })
  } catch (error) {
    console.error("Failed to get models:", error)
    return NextResponse.json({ error: "Failed to get models" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { modelId } = await request.json()

    if (!modelId) {
      return NextResponse.json({ error: "Model ID is required" }, { status: 400 })
    }

    const success = mlService.deleteModel(modelId)

    return NextResponse.json({
      success,
      message: success ? "Model deleted successfully" : "Model not found",
    })
  } catch (error) {
    console.error("Model deletion error:", error)
    return NextResponse.json({ error: "Failed to delete model" }, { status: 500 })
  }
}
