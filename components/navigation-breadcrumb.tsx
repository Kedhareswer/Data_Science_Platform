"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, ArrowLeft, ArrowRight, Bookmark, BookmarkPlus, History, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useNavigation } from "@/lib/navigation-context"
import { cn } from "@/lib/utils"

interface NavigationBreadcrumbProps {
  className?: string
  showBackButton?: boolean
  showBookmarkButton?: boolean
  showHistoryButton?: boolean
}

export function NavigationBreadcrumb({
  className,
  showBackButton = true,
  showBookmarkButton = true,
  showHistoryButton = true,
}: NavigationBreadcrumbProps) {
  const pathname = usePathname()
  const { canGoBack, canGoForward, goBack, goForward, addBookmark, bookmarks, removeBookmark, getRecentPages } =
    useNavigation()

  const pathSegments = pathname.split("/").filter(Boolean)
  const recentPages = getRecentPages(5)
  const isBookmarked = bookmarks.some((b) => b.path === pathname)

  const getSegmentTitle = (segment: string, index: number): string => {
    const titleMap: Record<string, string> = {
      notebook: "Notebook",
      docs: "Documentation",
      dashboard: "Dashboard",
      "dashboard-creator": "Dashboard Creator",
    }

    return titleMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
  }

  const getSegmentPath = (index: number): string => {
    return "/" + pathSegments.slice(0, index + 1).join("/")
  }

  const handleBookmarkToggle = () => {
    if (isBookmarked) {
      const bookmark = bookmarks.find((b) => b.path === pathname)
      if (bookmark) {
        removeBookmark(bookmark.id)
      }
    } else {
      const title =
        pathSegments.length > 0
          ? getSegmentTitle(pathSegments[pathSegments.length - 1], pathSegments.length - 1)
          : "Home"

      addBookmark({
        path: pathname,
        title,
        description: `Bookmarked from ${title}`,
      })
    }
  }

  return (
    <div className={cn("flex items-center gap-2 p-4 bg-background border-b", className)}>
      {/* Back/Forward Navigation */}
      {showBackButton && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            disabled={!canGoBack}
            className="h-8 w-8 p-0"
            title="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goForward}
            disabled={!canGoForward}
            className="h-8 w-8 p-0"
            title="Go forward"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6 mx-2" />
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-1 flex-1 min-w-0">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="h-4 w-4" />
          <span className="hidden sm:inline">Home</span>
        </Link>

        {pathSegments.map((segment, index) => (
          <React.Fragment key={index}>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Link
              href={getSegmentPath(index)}
              className={cn(
                "text-sm transition-colors truncate",
                index === pathSegments.length - 1
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {getSegmentTitle(segment, index)}
            </Link>
          </React.Fragment>
        ))}
      </nav>

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        {/* Bookmark Button */}
        {showBookmarkButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBookmarkToggle}
            className="h-8 w-8 p-0"
            title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
          >
            {isBookmarked ? <Bookmark className="h-4 w-4 fill-current" /> : <BookmarkPlus className="h-4 w-4" />}
          </Button>
        )}

        {/* History Dropdown */}
        {showHistoryButton && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Navigation history">
                <History className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              {/* Recent Pages */}
              {recentPages.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">Recent Pages</div>
                  {recentPages.map((page) => (
                    <DropdownMenuItem key={page.id} asChild>
                      <Link href={page.path} className="flex items-center justify-between">
                        <span className="truncate">{page.title}</span>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {new Date(page.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Badge>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}

              {/* Bookmarks */}
              {bookmarks.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">Bookmarks</div>
                  {bookmarks.slice(0, 5).map((bookmark) => (
                    <DropdownMenuItem key={bookmark.id} asChild>
                      <Link href={bookmark.path} className="flex items-center justify-between">
                        <span className="truncate">{bookmark.title}</span>
                        <Bookmark className="h-3 w-3 ml-2 flex-shrink-0" />
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </>
              )}

              {recentPages.length === 0 && bookmarks.length === 0 && (
                <div className="px-2 py-4 text-sm text-muted-foreground text-center">No navigation history yet</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}
