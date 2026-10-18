"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main id="main-content" className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-handwritten-bold text-3xl">Oops — something went wrong.</p>
      <p className="text-muted-foreground max-w-md">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </main>
  )
}
