import { type NextRequest, NextResponse } from "next/server"
import { pythonExecutor } from "@/lib/python-executor"

export async function GET() {
  try {
    const packages = await pythonExecutor.getInstalledPackages()
    return NextResponse.json({ packages })
  } catch (error) {
    console.error("Failed to get packages:", error)
    return NextResponse.json({ error: "Failed to get installed packages" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { packageName } = await request.json()

    if (!packageName || typeof packageName !== "string") {
      return NextResponse.json({ error: "Package name is required" }, { status: 400 })
    }

    const success = await pythonExecutor.installPackage(packageName)

    return NextResponse.json({
      success,
      message: success ? `Package ${packageName} installed successfully` : `Failed to install ${packageName}`,
    })
  } catch (error) {
    console.error("Package installation error:", error)
    return NextResponse.json({ error: "Failed to install package" }, { status: 500 })
  }
}
