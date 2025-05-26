"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  History,
  Bookmark,
  Clock,
  Home,
  FileText,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react"
import { useNavigation } from "@/lib/navigation-context"
import { formatDistanceToNow } from "date-fns"

interface NavigationSidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export function NavigationSidebar({ isOpen, onToggle }: NavigationSidebarProps) {
  const navigation = useNavigation()
  const { history = [], bookmarks = [], removeBookmark, clearHistory, currentPage, addToHistory } = navigation || {}

  const [activeTab, setActiveTab] = useState<"history" | "bookmarks" | "recent">("recent")

  // Get recent pages with null check
  const recentPages =
    history.length > 0
      ? history
          .slice(-10)
          .reverse()
          .filter((item, index, arr) => arr.findIndex((other) => other.path === item.path) === index)
          .slice(0, 10)
      : []

  const getPageIcon = (path: string) => {
    if (path === "/") return <Home className="h-4 w-4" />
    if (path.startsWith("/docs")) return <FileText className="h-4 w-4" />
    if (path.startsWith("/dashboard")) return <BarChart3 className="h-4 w-4" />
    if (path.startsWith("/notebook")) return <Settings className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  const formatTimestamp = (timestamp: number | Date) => {
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
      return formatDistanceToNow(date, { addSuffix: true })
    } catch {
      return "Unknown time"
    }
  }

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="fixed left-4 top-1/2 -translate-y-1/2 z-50 h-12 w-8 p-0 bg-background border shadow-md"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <div className="fixed left-0 top-0 h-full w-80 bg-background border-r shadow-lg z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Navigation</h2>
        <Button variant="ghost" size="sm" onClick={onToggle}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <Button
          variant={activeTab === "recent" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("recent")}
          className="flex-1 rounded-none"
        >
          <Clock className="h-4 w-4 mr-2" />
          Recent
        </Button>
        <Button
          variant={activeTab === "bookmarks" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("bookmarks")}
          className="flex-1 rounded-none"
        >
          <Bookmark className="h-4 w-4 mr-2" />
          Bookmarks
        </Button>
        <Button
          variant={activeTab === "history" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("history")}
          className="flex-1 rounded-none"
        >
          <History className="h-4 w-4 mr-2" />
          History
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        {activeTab === "recent" && (
          <div className="space-y-2">
            {recentPages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No recent pages</p>
            ) : (
              recentPages.map((page) => (
                <Card
                  key={page.id}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    currentPage?.path === page.path ? "bg-muted" : ""
                  }`}
                  onClick={() => addToHistory({ path: page.path, title: page.title, metadata: page.metadata })}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      {getPageIcon(page.path)}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{page.title}</h4>
                        {page.subtitle && <p className="text-xs text-muted-foreground truncate">{page.subtitle}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{formatTimestamp(page.timestamp)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === "bookmarks" && (
          <div className="space-y-2">
            {bookmarks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No bookmarks yet</p>
            ) : (
              bookmarks.map((bookmark) => (
                <Card
                  key={bookmark.id}
                  className="cursor-pointer transition-colors hover:bg-muted/50 group"
                  onClick={() =>
                    addToHistory({ path: bookmark.path, title: bookmark.title, metadata: bookmark.metadata })
                  }
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      {getPageIcon(bookmark.path)}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{bookmark.title}</h4>
                        {bookmark.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">{bookmark.subtitle}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{formatTimestamp(bookmark.timestamp)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeBookmark(bookmark.id)
                        }}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium">Navigation History</span>
              {history.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearHistory} className="text-xs">
                  Clear All
                </Button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No navigation history</p>
            ) : (
              history
                .slice()
                .reverse()
                .map((item, index) => (
                  <Card
                    key={item.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      currentPage?.path === item.path ? "bg-muted" : ""
                    }`}
                    onClick={() => addToHistory({ path: item.path, title: item.title, metadata: item.metadata })}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        {getPageIcon(item.path)}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{item.title}</h4>
                          {item.subtitle && <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>}
                          <p className="text-xs text-muted-foreground mt-1">{formatTimestamp(item.timestamp)}</p>
                        </div>
                        {index === 0 && (
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
