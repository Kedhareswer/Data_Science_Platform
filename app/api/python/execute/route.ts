import { type NextRequest, NextResponse } from "next/server"
import { pythonExecutor } from "@/lib/python-executor"

export async function POST(request: NextRequest) {
  try {
    const { code, dataContext } = await request.json()

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Code is required and must be a string" }, { status: 400 })
    }

    const result = await pythonExecutor.executeCode(code, dataContext)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Python execution error:", error)
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
