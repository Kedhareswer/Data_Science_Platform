"use client"

import Link from "next/link"
import { BookOpen, FileSpreadsheet, Home } from "lucide-react"

interface SidebarProps {
  isOpen: boolean
}

export function Sidebar({ isOpen }: SidebarProps) {
  return (
    <div
      className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-sidebar border-r transition-transform duration-200 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
    >
      <div className="flex h-14 items-center border-b px-4">
        <div className="flex items-center space-x-2">
          <BookOpen className="h-6 w-6" />
          <h2 className="text-xl font-bold">DataNotebook</h2>
        </div>
      </div>

      <nav className="p-4 space-y-2">
        <Link
          href="/"
          className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-sidebar-accent transition-colors"
        >
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>

        <Link
          href="/notebook"
          className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-sidebar-accent transition-colors"
        >
          <FileSpreadsheet className="h-5 w-5" />
          <span>Notebook</span>
        </Link>

        <Link
          href="/docs"
          className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-sidebar-accent transition-colors"
        >
          <BookOpen className="h-5 w-5" />
          <span>Documentation</span>
        </Link>
      </nav>
    </div>
  )
}
