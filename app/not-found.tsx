import Link from "next/link"
import { SiteHeader } from "@/components/layout/site-header"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main id="main-content" className="flex flex-col items-center gap-4 px-4 py-24 text-center">
        <p className="font-handwritten-bold text-6xl">404</p>
        <p className="text-xl text-muted-foreground">This page wandered off the notebook.</p>
        <Button asChild>
          <Link href="/">Go home</Link>
        </Button>
      </main>
    </div>
  )
}
