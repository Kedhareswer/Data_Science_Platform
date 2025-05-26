"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"

export interface NavigationItem {
  id: string
  path: string
  title: string
  timestamp: Date
  metadata?: {
    cellId?: string
    section?: string
    subsection?: string
  }
}

export interface Bookmark {
  id: string
  path: string
  title: string
  description?: string
  timestamp: Date
}

interface NavigationContextType {
  history: NavigationItem[]
  currentIndex: number
  bookmarks: Bookmark[]
  canGoBack: boolean
  canGoForward: boolean
  goBack: () => void
  goForward: () => void
  addToHistory: (item: Omit<NavigationItem, "id" | "timestamp">) => void
  navigateTo: (path: string, title?: string, metadata?: any) => void
  addBookmark: (bookmark: Omit<Bookmark, "id" | "timestamp">) => void
  removeBookmark: (id: string) => void
  clearHistory: () => void
  getRecentPages: (limit?: number) => NavigationItem[]
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<NavigationItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const router = useRouter()
  const pathname = usePathname()

  const getPageTitle = (path: string): string => {
    const segments = path.split("/").filter(Boolean)
    if (segments.length === 0) return "Home"

    const titleMap: Record<string, string> = {
      notebook: "Notebook",
      docs: "Documentation",
      dashboard: "Dashboard",
      "dashboard-creator": "Dashboard Creator",
    }

    return titleMap[segments[0]] || segments[0].charAt(0).toUpperCase() + segments[0].slice(1)
  }

  // Load from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem("navigation-history")
    const savedBookmarks = localStorage.getItem("navigation-bookmarks")

    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory)
        setHistory(
          parsed.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp),
          })),
        )
        setCurrentIndex(parsed.length - 1)
      } catch (error) {
        console.error("Failed to parse navigation history:", error)
      }
    }

    if (savedBookmarks) {
      try {
        const parsed = JSON.parse(savedBookmarks)
        setBookmarks(
          parsed.map((bookmark: any) => ({
            ...bookmark,
            timestamp: new Date(bookmark.timestamp),
          })),
        )
      } catch (error) {
        console.error("Failed to parse bookmarks:", error)
      }
    }
  }, [])

  // Track current page
  useEffect(() => {
    const pageTitle = getPageTitle(pathname)
    addToHistory({
      path: pathname,
      title: pageTitle,
    })
  }, [pathname])

  const addToHistory = useCallback((item: Omit<NavigationItem, "id" | "timestamp">) => {
    const newItem: NavigationItem = {
      ...item,
      id: `nav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    }

    setHistory((prev) => {
      // Don't add duplicate consecutive entries
      if (prev.length > 0 && prev[prev.length - 1].path === item.path) {
        return prev
      }

      // Limit history to 50 items
      const newHistory = [...prev, newItem].slice(-50)
      setCurrentIndex(newHistory.length - 1)
      return newHistory
    })
  }, [])

  const navigateTo = useCallback(
    (path: string, title?: string, metadata?: any) => {
      const pageTitle = title || getPageTitle(path)
      addToHistory({
        path,
        title: pageTitle,
        metadata,
      })
      router.push(path)
    },
    [addToHistory, router],
  )

  const addBookmark = useCallback((bookmark: Omit<Bookmark, "id" | "timestamp">) => {
    const newBookmark: Bookmark = {
      ...bookmark,
      id: `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    }

    setBookmarks((prev) => {
      // Don't add duplicate bookmarks
      if (prev.some((b) => b.path === bookmark.path)) {
        return prev
      }
      return [...prev, newBookmark]
    })
  }, [])

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id))
  }, [])

  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      const targetIndex = currentIndex - 1
      const targetItem = history[targetIndex]
      setCurrentIndex(targetIndex)
      router.push(targetItem.path)
    }
  }, [currentIndex, history, router])

  const goForward = useCallback(() => {
    if (currentIndex < history.length - 1) {
      const targetIndex = currentIndex + 1
      const targetItem = history[targetIndex]
      setCurrentIndex(targetIndex)
      router.push(targetItem.path)
    }
  }, [currentIndex, history, router])

  const clearHistory = useCallback(() => {
    setHistory([])
    setCurrentIndex(-1)
    localStorage.removeItem("navigation-history")
  }, [])

  const getRecentPages = useCallback(
    (limit = 5) => {
      return history
        .slice(-limit - 1, -1) // Exclude current page
        .reverse()
    },
    [history],
  )

  const canGoBack = currentIndex > 0
  const canGoForward = currentIndex < history.length - 1

  // Save to localStorage when history or bookmarks change
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem("navigation-history", JSON.stringify(history))
    }
  }, [history])

  useEffect(() => {
    localStorage.setItem("navigation-bookmarks", JSON.stringify(bookmarks))
  }, [bookmarks])

  const value: NavigationContextType = {
    history,
    currentIndex,
    bookmarks,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    addToHistory,
    navigateTo,
    addBookmark,
    removeBookmark,
    clearHistory,
    getRecentPages,
  }

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider")
  }
  return context
}
