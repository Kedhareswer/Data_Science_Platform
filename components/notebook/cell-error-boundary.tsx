"use client"

import { Component, type ReactNode } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/** Keeps one broken cell from taking down the whole notebook. */
export class CellErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error("Cell crashed:", error)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div
        role="alert"
        className="border-destructive/50 flex flex-col items-center gap-3 rounded-md border border-dashed p-6 text-center"
      >
        <AlertTriangle className="text-destructive h-6 w-6" aria-hidden />
        <p className="font-handwritten-bold">This cell hit a snag.</p>
        <pre className="text-muted-foreground max-w-full overflow-auto text-xs">{this.state.error.message}</pre>
        <Button size="sm" variant="outline" onClick={() => this.setState({ error: null })}>
          <RotateCcw aria-hidden /> Try again
        </Button>
      </div>
    )
  }
}
