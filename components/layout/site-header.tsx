"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, LayoutDashboard, NotebookPen, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ModeToggle } from "./mode-toggle"

const NAV = [
  { href: "/notebook", label: "Notebook", icon: NotebookPen },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/docs", label: "Docs", icon: BookOpen },
] as const

function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className={className}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

export const REPO_URL = "https://github.com/Kedhareswer/Data_Science_Platform"

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:px-6">
        <Link href="/" className="mr-2 flex items-center gap-2 font-handwritten-bold text-lg" aria-label="DataNotebook home">
          <Sparkles className="h-5 w-5 -rotate-12" aria-hidden />
          <span className="hidden sm:inline">DataNotebook</span>
        </Link>

        <nav aria-label="Main" className="flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Button key={href} asChild variant={active ? "secondary" : "ghost"} size="sm">
                <Link href={href} aria-current={active ? "page" : undefined}>
                  <Icon className="h-4 w-4" aria-hidden />
                  <span className={cn("hidden sm:inline", active && "inline")}>{label}</span>
                </Link>
              </Button>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          {children}
          <Button asChild variant="ghost" size="icon" aria-label="Source code on GitHub">
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              <GithubMark className="h-4 w-4" />
            </a>
          </Button>
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
