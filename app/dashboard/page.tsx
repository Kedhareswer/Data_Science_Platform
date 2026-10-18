"use client"

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { Check, Download, LayoutDashboard, MoreHorizontal, Pencil, Plus, Trash2, Upload, Wand2 } from "lucide-react"
import { toast } from "sonner"
import { SiteHeader } from "@/components/layout/site-header"
import { DataUploadPrompt } from "@/components/data-upload-prompt"
import { ConfirmDialog, type ConfirmRequest } from "@/components/dashboard/confirm-dialog"
import { DashboardView } from "@/components/dashboard/dashboard-view"
import { FilterBar } from "@/components/dashboard/filter-bar"
import type { WidgetAction } from "@/components/dashboard/widget-card"
import { WidgetEditor } from "@/components/dashboard/widget-editor"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import type { DashboardFilter, DashboardState, DashboardWidget, WidgetSize } from "@/lib/dashboard"
import { applyFilters, newWidgetId, parseDashboardFile, suggestWidgets, toDashboardFile } from "@/lib/dashboard-data"
import { useData } from "@/lib/data-context"

function referencedColumns(widget: DashboardWidget): string[] {
  switch (widget.type) {
    case "metric":
      return widget.column ? [widget.column] : []
    case "chart":
      return [widget.x, widget.y].filter((c): c is string => Boolean(c))
    case "table":
      return widget.columns
    case "text":
      return []
  }
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "dashboard"
  )
}

function move<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export default function DashboardPage() {
  const { processedData, columns, columnTypes, fileName, isHydrated, dashboard, setDashboard } = useData()
  const [editMode, setEditMode] = useState(false)
  const [editor, setEditor] = useState<{ open: boolean; widgetId?: string }>({ open: false })
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const importInput = useRef<HTMLInputElement>(null)

  // Latest dashboard for callbacks that need to read it without re-creating themselves.
  const dashboardRef = useRef(dashboard)
  useEffect(() => {
    dashboardRef.current = dashboard
  }, [dashboard])

  const columnSet = useMemo(() => new Set(columns), [columns])
  const activeFilters = useMemo(
    () => dashboard.filters.filter((f) => columnSet.has(f.column)),
    [dashboard.filters, columnSet],
  )
  // Keep typing in filter inputs responsive on big datasets.
  const deferredFilters = useDeferredValue(activeFilters)
  const filteredRows = useMemo(() => applyFilters(processedData, deferredFilters), [processedData, deferredFilters])

  const hasData = processedData.length > 0
  const widgets = dashboard.widgets
  const editingWidget = editor.widgetId ? widgets.find((w) => w.id === editor.widgetId) : undefined

  const setFilters = useCallback(
    (filters: DashboardFilter[]) => setDashboard((prev) => ({ ...prev, filters })),
    [setDashboard],
  )

  const replaceDashboard = useCallback(
    (next: DashboardState, message: string) => {
      const previous = dashboardRef.current
      setDashboard(next)
      toast.success(message, {
        action: { label: "Undo", onClick: () => setDashboard(previous) },
      })
    },
    [setDashboard],
  )

  const handleAction = useCallback(
    (id: string, action: WidgetAction) => {
      const current = dashboardRef.current
      const index = current.widgets.findIndex((w) => w.id === id)
      if (index < 0) return
      const widget = current.widgets[index]

      if (action === "edit") {
        setEditor({ open: true, widgetId: id })
      } else if (action === "duplicate") {
        const copy: DashboardWidget = { ...widget, id: newWidgetId(), title: `${widget.title} (copy)` }
        setDashboard((prev) => {
          const i = prev.widgets.findIndex((w) => w.id === id)
          const next = [...prev.widgets]
          next.splice(i + 1, 0, copy)
          return { ...prev, widgets: next }
        })
      } else if (action === "delete") {
        setDashboard((prev) => ({ ...prev, widgets: prev.widgets.filter((w) => w.id !== id) }))
        toast(`Deleted “${widget.title}”`, {
          action: {
            label: "Undo",
            onClick: () =>
              setDashboard((prev) => {
                if (prev.widgets.some((w) => w.id === id)) return prev
                const next = [...prev.widgets]
                next.splice(Math.min(index, next.length), 0, widget)
                return { ...prev, widgets: next }
              }),
          },
        })
      } else if (action === "move-up" || action === "move-down") {
        const to = action === "move-up" ? index - 1 : index + 1
        if (to < 0 || to >= current.widgets.length) return
        setDashboard((prev) => ({ ...prev, widgets: move(prev.widgets, index, to) }))
      } else {
        const size = action.slice("size:".length) as WidgetSize
        setDashboard((prev) => ({
          ...prev,
          widgets: prev.widgets.map((w) => (w.id === id ? { ...w, size } : w)),
        }))
      }
    },
    [setDashboard],
  )

  const handleReorder = useCallback(
    (from: number, to: number) => setDashboard((prev) => ({ ...prev, widgets: move(prev.widgets, from, to) })),
    [setDashboard],
  )

  const handleSave = useCallback(
    (widget: DashboardWidget) => {
      const exists = dashboardRef.current.widgets.some((w) => w.id === widget.id)
      setDashboard((prev) => ({
        ...prev,
        widgets: exists ? prev.widgets.map((w) => (w.id === widget.id ? widget : w)) : [...prev.widgets, widget],
      }))
      toast.success(exists ? "Widget updated" : `Added “${widget.title}”`)
    },
    [setDashboard],
  )

  const autoGenerate = () => {
    const run = () => {
      const generated = suggestWidgets(columns, columnTypes, processedData)
      replaceDashboard({ ...dashboardRef.current, widgets: generated }, `Generated ${generated.length} widgets`)
    }
    if (widgets.length === 0) run()
    else
      setConfirm({
        title: "Replace your widgets?",
        description: `Auto-generate replaces the ${widgets.length} widget${widgets.length === 1 ? "" : "s"} on this dashboard with a fresh starter set. Filters are kept.`,
        confirmLabel: "Replace widgets",
        onConfirm: run,
      })
  }

  const clearDashboard = () =>
    setConfirm({
      title: "Clear the dashboard?",
      description: "Removes every widget and filter. The title is kept.",
      confirmLabel: "Clear",
      destructive: true,
      onConfirm: () => replaceDashboard({ ...dashboardRef.current, widgets: [], filters: [] }, "Dashboard cleared"),
    })

  const exportDashboard = () => {
    const json = JSON.stringify(toDashboardFile(dashboard), null, 2)
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `${slugify(dashboard.title)}.dashboard.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast.success("Dashboard exported")
  }

  const handleImportFile = async (file: File) => {
    let imported: DashboardState
    try {
      imported = parseDashboardFile(JSON.parse(await file.text()) as unknown)
    } catch (error) {
      toast.error("Couldn't import that file", {
        description: error instanceof SyntaxError ? "It isn't valid JSON." : error instanceof Error ? error.message : undefined,
      })
      return
    }
    const apply = () => {
      replaceDashboard(imported, `Imported “${imported.title}”`)
      const missing = [...new Set(imported.widgets.flatMap(referencedColumns))].filter((c) => !columnSet.has(c))
      if (hasData && missing.length > 0) {
        toast.warning(`${missing.length} column${missing.length === 1 ? "" : "s"} not in the current data`, {
          description: missing.slice(0, 5).join(", ") + (missing.length > 5 ? "…" : ""),
        })
      }
    }
    if (widgets.length === 0) apply()
    else
      setConfirm({
        title: "Replace this dashboard?",
        description: `“${imported.title}” has ${imported.widgets.length} widgets and will replace the current dashboard.`,
        confirmLabel: "Import",
        onConfirm: apply,
      })
  }

  const openNewWidget = () => setEditor({ open: true })

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6">
        <input
          ref={importInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ""
            if (file) void handleImportFile(file)
          }}
        />

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            {editMode && hasData ? (
              <Input
                aria-label="Dashboard title"
                value={dashboard.title}
                maxLength={120}
                onChange={(e) => {
                  const title = e.target.value
                  setDashboard((prev) => ({ ...prev, title }))
                }}
                onBlur={(e) => {
                  if (!e.target.value.trim()) setDashboard((prev) => ({ ...prev, title: "My dashboard" }))
                }}
                className="h-auto max-w-xl border-dashed bg-transparent px-2 py-1 font-handwritten-bold text-3xl md:text-3xl"
              />
            ) : (
              <h1 className="flex items-center gap-2 truncate font-handwritten-bold text-3xl">
                <LayoutDashboard className="size-7 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate">{dashboard.title}</span>
              </h1>
            )}
            {hasData && (
              <p className="text-sm text-muted-foreground">
                {fileName ? `${fileName} · ` : ""}
                {processedData.length.toLocaleString()} rows · {columns.length} columns
              </p>
            )}
          </div>

          {hasData && (
            <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Dashboard actions">
              <Button variant={editMode ? "default" : "outline"} aria-pressed={editMode} onClick={() => setEditMode((v) => !v)}>
                {editMode ? <Check aria-hidden /> : <Pencil aria-hidden />}
                {editMode ? "Done" : "Edit"}
              </Button>
              <Button variant="outline" onClick={openNewWidget}>
                <Plus aria-hidden /> Add widget
              </Button>
              <Button variant="outline" onClick={autoGenerate}>
                <Wand2 aria-hidden /> Auto-generate
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="More dashboard actions">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onSelect={exportDashboard}>
                    <Download aria-hidden /> Export JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => importInput.current?.click()}>
                    <Upload aria-hidden /> Import JSON…
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    disabled={widgets.length === 0 && dashboard.filters.length === 0}
                    onSelect={clearDashboard}
                  >
                    <Trash2 aria-hidden /> Clear dashboard
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {!isHydrated ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Loading dashboard">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="sketch-card h-36 animate-pulse bg-muted/40" />
            ))}
            <div className="sketch-card h-80 animate-pulse bg-muted/40 md:col-span-2" />
            <div className="sketch-card h-80 animate-pulse bg-muted/40 md:col-span-2" />
          </div>
        ) : !hasData ? (
          <div className="py-8">
            <DataUploadPrompt
              title="No data for your dashboard yet"
              description="Load a CSV, Excel or JSON file (or the Iris sample) and your metrics, charts and tables will appear here."
            />
          </div>
        ) : (
          <>
            <FilterBar
              filters={dashboard.filters}
              rows={processedData}
              columns={columns}
              columnTypes={columnTypes}
              filteredCount={filteredRows.length}
              onChange={setFilters}
            />

            {widgets.length === 0 ? (
              <section className="sketch-card mx-auto max-w-2xl space-y-4 p-8 text-center" aria-labelledby="empty-dashboard-title">
                <Wand2 className="mx-auto size-10 text-muted-foreground" aria-hidden />
                <h2 id="empty-dashboard-title" className="font-handwritten-bold text-2xl">
                  A blank page, full of possibilities
                </h2>
                <p className="text-muted-foreground">
                  Let us sketch a starter dashboard from your columns, or build one widget at a time.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={autoGenerate}>
                    <Wand2 aria-hidden /> Auto-generate
                  </Button>
                  <Button variant="outline" onClick={openNewWidget}>
                    <Plus aria-hidden /> Add a widget
                  </Button>
                  <Button variant="ghost" onClick={() => importInput.current?.click()}>
                    <Upload aria-hidden /> Import
                  </Button>
                </div>
              </section>
            ) : (
              <>
                {editMode && (
                  <p className="text-sm text-muted-foreground font-handwritten">
                    Editing: drag the handle (or focus it and press space, then the arrow keys) to reorder; use each widget’s menu
                    to edit, resize, duplicate or delete.
                  </p>
                )}
                <DashboardView
                  widgets={widgets}
                  rows={filteredRows}
                  allRows={processedData}
                  columns={columns}
                  columnTypes={columnTypes}
                  editMode={editMode}
                  onAction={handleAction}
                  onReorder={handleReorder}
                />
              </>
            )}
          </>
        )}
      </main>

      <WidgetEditor
        open={editor.open}
        onOpenChange={(open) => setEditor((prev) => (open ? prev : { open: false }))}
        widget={editingWidget}
        columns={columns}
        columnTypes={columnTypes}
        onSave={handleSave}
      />
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </>
  )
}
