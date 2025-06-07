// Real Python execution service
import { spawn } from "child_process"
import { writeFile, readFile, unlink, mkdir } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"

export interface PythonExecutionResult {
  success: boolean
  output?: string
  error?: string
  result?: any
  executionTime: number
  packages?: string[]
}

export interface PackageInfo {
  name: string
  version: string
  description?: string
  installed: boolean
}

export class PythonExecutor {
  private workingDir: string
  private pythonPath: string
  private installedPackages: Set<string> = new Set()

  constructor(workingDir = "/tmp/sentient-python", pythonPath = "python3") {
    this.workingDir = workingDir
    this.pythonPath = pythonPath
    this.initializeEnvironment()
  }

  private async initializeEnvironment() {
    try {
      await mkdir(this.workingDir, { recursive: true })

      // Install essential data science packages
      const essentialPackages = [
        "numpy",
        "pandas",
        "scikit-learn",
        "matplotlib",
        "seaborn",
        "scipy",
        "tensorflow",
        "torch",
        "plotly",
        "jupyter",
        "ipython",
      ]

      for (const pkg of essentialPackages) {
        await this.installPackage(pkg)
      }
    } catch (error) {
      console.error("Failed to initialize Python environment:", error)
    }
  }

  async executeCode(code: string, dataContext?: any): Promise<PythonExecutionResult> {
    const startTime = Date.now()
    const sessionId = randomUUID()
    const scriptPath = join(this.workingDir, `script_${sessionId}.py`)
    const dataPath = join(this.workingDir, `data_${sessionId}.json`)
    const outputPath = join(this.workingDir, `output_${sessionId}.json`)

    try {
      // Prepare data context
      let enhancedCode = code
      if (dataContext) {
        await writeFile(dataPath, JSON.stringify(dataContext))
        enhancedCode = `
import json
import sys
import traceback
import numpy as np
import pandas as pd
from sklearn import *
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
warnings.filterwarnings('ignore')

# Load data context
try:
    with open('${dataPath}', 'r') as f:
        context = json.load(f)
    
    # Convert data to pandas DataFrame if available
    if 'data' in context and context['data']:
        data = pd.DataFrame(context['data'])
        columns = context.get('columns', [])
        print(f"Loaded dataset: {len(data)} rows, {len(columns)} columns")
    else:
        data = pd.DataFrame()
        columns = []
        
except Exception as e:
    print(f"Warning: Could not load data context: {e}")
    data = pd.DataFrame()
    columns = []

# Capture output
import io
from contextlib import redirect_stdout, redirect_stderr

output_buffer = io.StringIO()
error_buffer = io.StringIO()
result = None

try:
    with redirect_stdout(output_buffer), redirect_stderr(error_buffer):
        # Execute user code
        ${enhancedCode}
        
        # If the last line is an expression, capture its result
        lines = """${code.replace(/"/g, '\\"')}""".strip().split('\\n')
        last_line = lines[-1].strip() if lines else ""
        
        if last_line and not any(last_line.startswith(kw) for kw in ['print', 'plt.', 'import', 'from', 'def', 'class', 'if', 'for', 'while', 'try', 'with']):
            try:
                result = eval(last_line)
                if hasattr(result, 'tolist'):
                    result = result.tolist()
                elif hasattr(result, 'to_dict'):
                    result = result.to_dict()
            except:
                pass
    
    # Save output
    output_data = {
        'success': True,
        'output': output_buffer.getvalue(),
        'error': error_buffer.getvalue(),
        'result': result
    }
    
except Exception as e:
    output_data = {
        'success': False,
        'output': output_buffer.getvalue(),
        'error': str(e) + '\\n' + traceback.format_exc(),
        'result': None
    }

with open('${outputPath}', 'w') as f:
    json.dump(output_data, f, default=str)
`
      }

      // Write script to file
      await writeFile(scriptPath, enhancedCode)

      // Execute Python script
      const result = await this.runPythonScript(scriptPath, this.workingDir)

      // Read output if available
      let executionResult: any = {
        success: false,
        output: result.stdout,
        error: result.stderr,
        result: null,
      }

      try {
        const outputData = await readFile(outputPath, "utf-8")
        executionResult = JSON.parse(outputData)
      } catch (error) {
        // Fallback to basic result
        executionResult = {
          success: result.exitCode === 0,
          output: result.stdout,
          error: result.stderr,
          result: null,
        }
      }

      return {
        ...executionResult,
        executionTime: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        executionTime: Date.now() - startTime,
      }
    } finally {
      // Cleanup
      try {
        await unlink(scriptPath).catch(() => {})
        await unlink(dataPath).catch(() => {})
        await unlink(outputPath).catch(() => {})
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  private runPythonScript(
    scriptPath: string,
    cwd: string,
  ): Promise<{
    stdout: string
    stderr: string
    exitCode: number
  }> {
    return new Promise((resolve) => {
      const process = spawn(this.pythonPath, [scriptPath], {
        cwd,
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 30000, // 30 second timeout
      })

      let stdout = ""
      let stderr = ""

      process.stdout.on("data", (data) => {
        stdout += data.toString()
      })

      process.stderr.on("data", (data) => {
        stderr += data.toString()
      })

      process.on("close", (code) => {
        resolve({
          stdout,
          stderr,
          exitCode: code || 0,
        })
      })

      process.on("error", (error) => {
        resolve({
          stdout,
          stderr: error.message,
          exitCode: 1,
        })
      })
    })
  }

  async installPackage(packageName: string): Promise<boolean> {
    try {
      const result = await this.runPythonScript(join(this.workingDir, "install.py"), this.workingDir)

      // Create install script
      const installScript = `
import subprocess
import sys

try:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '${packageName}'])
    print(f"Successfully installed {packageName}")
except Exception as e:
    print(f"Failed to install {packageName}: {e}")
    sys.exit(1)
`
      await writeFile(join(this.workingDir, "install.py"), installScript)

      const installResult = await this.runPythonScript(join(this.workingDir, "install.py"), this.workingDir)

      if (installResult.exitCode === 0) {
        this.installedPackages.add(packageName)
        return true
      }
      return false
    } catch (error) {
      console.error(`Failed to install package ${packageName}:`, error)
      return false
    }
  }

  async getInstalledPackages(): Promise<PackageInfo[]> {
    try {
      const listScript = `
import pkg_resources
import json

packages = []
for dist in pkg_resources.working_set:
    packages.append({
        'name': dist.project_name,
        'version': dist.version,
        'installed': True
    })

print(json.dumps(packages))
`

      const scriptPath = join(this.workingDir, "list_packages.py")
      await writeFile(scriptPath, listScript)

      const result = await this.runPythonScript(scriptPath, this.workingDir)

      if (result.exitCode === 0) {
        try {
          return JSON.parse(result.stdout)
        } catch (error) {
          return []
        }
      }
      return []
    } catch (error) {
      console.error("Failed to get installed packages:", error)
      return []
    }
  }

  async getCodeCompletion(code: string, position: number): Promise<string[]> {
    try {
      const completionScript = `
import jedi
import json

code = """${code.replace(/"/g, '\\"')}"""
script = jedi.Script(code=code, line=${Math.floor(position / 80) + 1}, column=${position % 80})
completions = script.completions()

suggestions = []
for completion in completions[:20]:  # Limit to 20 suggestions
    suggestions.append({
        'name': completion.name,
        'complete': completion.complete,
        'type': completion.type.name if completion.type else 'unknown'
    })

print(json.dumps(suggestions))
`

      const scriptPath = join(this.workingDir, "completion.py")
      await writeFile(scriptPath, completionScript)

      const result = await this.runPythonScript(scriptPath, this.workingDir)

      if (result.exitCode === 0) {
        try {
          const suggestions = JSON.parse(result.stdout)
          return suggestions.map((s: any) => s.name)
        } catch (error) {
          return []
        }
      }
      return []
    } catch (error) {
      console.error("Failed to get code completion:", error)
      return []
    }
  }
}

// Singleton instance
export const pythonExecutor = new PythonExecutor()
