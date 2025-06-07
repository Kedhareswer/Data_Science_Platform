import { type NextRequest, NextResponse } from "next/server"
import { pythonExecutor } from "@/lib/python-executor"

export async function POST(request: NextRequest) {
  try {
    const { code, position } = await request.json()

    if (!code || typeof code !== "string" || typeof position !== "number") {
      return NextResponse.json({ error: "Code and position are required" }, { status: 400 })
    }

    const suggestions = await pythonExecutor.getCodeCompletion(code, position)

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error("Code completion error:", error)
    return NextResponse.json({ suggestions: [] }, { status: 200 })
  }
}
