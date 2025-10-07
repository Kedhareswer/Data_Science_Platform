"use client"

import Link from "next/link"
import { BookOpen, FileSpreadsheet, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"

interface NavbarProps {
  onToggleSidebar: () => void
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="mr-2" onClick={onToggleSidebar} aria-label="Toggle sidebar">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>

          <Link href="/" className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">DataNotebook</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/docs" className="hidden sm:flex items-center gap-2" prefetch={true}>
              <FileSpreadsheet className="h-4 w-4" />
              Documentation
            </Link>
          </Button>
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
