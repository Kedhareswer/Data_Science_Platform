"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useData } from "@/lib/data-context"
import { DashboardChart } from "@/components/dashboard-chart"
import { DashboardTable } from "@/components/dashboard-table"
import { DashboardMetric } from "@/components/dashboard-metric"
import { DashboardFilter } from "@/components/dashboard-filter"
import { BarChart3, Table, Gauge, Settings, Plus, LayoutDashboard, Save, Download } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import Link from "next/link"

// Dashboard widget types
type WidgetType = "chart" | "table" | "metric" | "filter"

interface DashboardWidget {
  id: string
  type: WidgetType
  title: string
  config: any
  position: {
    x: number
    y: number
    w: number
    h: number
  }
}

export function DashboardCreator() {
  const { processedData, columns, columnTypes } = useData()
  const [widgets, setWidgets] = useState<DashboardWidget[]>([])
  const [addWidgetDialogOpen, setAddWidgetDialogOpen] = useState(false)
  const [newWidgetType, setNewWidgetType] = useState<WidgetType>("chart")
  const [dashboardTitle, setDashboardTitle] = useState("My Dashboard")
  const [saveDashboardDialogOpen, setSaveDashboardDialogOpen] = useState(false)
  const [dashboardNameInput, setDashboardNameInput] = useState("")

  const hasData = processedData.length > 0
  const numericColumns = columns.filter((col) => columnTypes[col] === "number")
  const categoricalColumns = columns.filter((col) => columnTypes[col] === "string" || columnTypes[col] === "boolean")

  // Generate a unique ID
  const generateId = () => {
    return Math.random().toString(36).substring(2, 11)
  }

  // Add a new widget to the dashboard
  const addWidget = (type: WidgetType) => {
    const newWidget: DashboardWidget = {
      id: generateId(),
      type,
      title: getDefaultWidgetTitle(type),
      config: getDefaultWidgetConfig(type),
      position: getDefaultWidgetPosition(type, widgets.length),
    }

    setWidgets((prev) => [...prev, newWidget])
    setAddWidgetDialogOpen(false)

    toast({
      title: "Widget added",
      description: `A new ${type} widget has been added to your dashboard.`,
    })
  }

  // Get default title for a widget type
  const getDefaultWidgetTitle = (type: WidgetType): string => {
    switch (type) {
      case "chart":
        return "Chart"
      case "table":
        return "Data Table"
      case "metric":
        return "Key Metric"
      case "filter":
        return "Data Filter"
      default:
        return "New Widget"
    }
  }

  // Get default config for a widget type
  const getDefaultWidgetConfig = (type: WidgetType) => {
    switch (type) {
      case "chart":
        return {
          chartType: "bar",
          xAxis: categoricalColumns[0] || "",
          yAxis: numericColumns[0] || "",
          colorScheme: "default",
        }
      case "table":
        return {
          columns: columns.slice(0, 5),
          pageSize: 5,
        }
      case "metric":
        return {
          column: numericColumns[0] || "",
          aggregation: "mean",
          format: "number",
          prefix: "",
          suffix: "",
        }
      case "filter":
        return {
          columns: [],
        }
      default:
        return {}
    }
  }

  // Get default position for a widget type
  const getDefaultWidgetPosition = (type: WidgetType, index: number) => {
    // Calculate grid position based on index
    const row = Math.floor(index / 2)
    const col = index % 2

    switch (type) {
      case "chart":
        return {
          x: col * 6,
          y: row * 6,
          w: 6,
          h: 6,
        }
      case "table":
        return {
          x: col * 6,
          y: row * 6,
          w: 6,
          h: 6,
        }
      case "metric":
        return {
          x: col * 3,
          y: row * 3,
          w: 3,
          h: 3,
        }
      case "filter":
        return {
          x: col * 6,
          y: row * 3,
          w: 6,
          h: 3,
        }
      default:
        return {
          x: 0,
          y: 0,
          w: 6,
          h: 6,
        }
    }
  }

  // Save dashboard
  const saveDashboard = () => {
    if (!dashboardNameInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a dashboard name",
        variant: "destructive",
      })
      return
    }

    setDashboardTitle(dashboardNameInput)
    setSaveDashboardDialogOpen(false)
    setDashboardNameInput("")

    toast({
      title: "Dashboard saved",
      description: "Your dashboard has been saved successfully.",
    })
  }

  return (
    <div className="space-y-6">
      <Card className="sketch-card">
        <CardHeader>
          <CardTitle>Create Dashboard</CardTitle>
          <CardDescription>
            Create a custom dashboard to visualize your data. Add charts, tables, metrics, and filters.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="dashboard-title">Dashboard Title</Label>
              <Input
                id="dashboard-title"
                value={dashboardTitle}
                onChange={(e) => setDashboardTitle(e.target.value)}
                className="w-[300px] sketch-input"
                placeholder="My Dashboard"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="sketch-button" onClick={() => setSaveDashboardDialogOpen(true)}>
                <Save className="mr-2 h-4 w-4" />
                Save Dashboard
              </Button>
              <Button
                variant="outline"
                className="sketch-button"
                onClick={() => setAddWidgetDialogOpen(true)}
                disabled={!hasData}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Widget
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4">
            {widgets.map((widget) => (
              <div key={widget.id} className="col-span-12 md:col-span-6 notebook-cell sketch-card">
                <div className="notebook-cell-header">
                  <div className="flex items-center gap-2">
                    {widget.type === "chart" && <BarChart3 className="h-4 w-4" />}
                    {widget.type === "table" && <Table className="h-4 w-4" />}
                    {widget.type === "metric" && <Gauge className="h-4 w-4" />}
                    {widget.type === "filter" && <Settings className="h-4 w-4" />}
                    <h3 className="text-sm font-medium">{widget.title}</h3>
                  </div>
                </div>
                <div className="notebook-cell-content">
                  {widget.type === "chart" && <DashboardChart config={widget.config} />}
                  {widget.type === "table" && <DashboardTable config={widget.config} />}
                  {widget.type === "metric" && <DashboardMetric config={widget.config} />}
                  {widget.type === "filter" && <DashboardFilter config={widget.config} />}
                </div>
              </div>
            ))}

            {widgets.length === 0 && (
              <div className="col-span-12 flex flex-col items-center justify-center py-12 text-center">
                <LayoutDashboard className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-bold mb-2">Your Dashboard is Empty</h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Add widgets to create a custom dashboard for your data. You can add charts, tables, metrics, and
                  filters.
                </p>
                <Button onClick={() => setAddWidgetDialogOpen(true)} className="sketch-button" disabled={!hasData}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Widget
                </Button>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" className="sketch-button" asChild>
            <Link href="/dashboard-creator">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Open Full Dashboard Creator
            </Link>
          </Button>
          <Button variant="outline" className="sketch-button">
            <Download className="mr-2 h-4 w-4" />
            Export Dashboard
          </Button>
        </CardFooter>
      </Card>

      {/* Add Widget Dialog */}
      <Dialog open={addWidgetDialogOpen} onOpenChange={setAddWidgetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Widget</DialogTitle>
            <DialogDescription>Choose the type of widget you want to add to your dashboard.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="widget-type">Widget Type</Label>
              <Select value={newWidgetType} onValueChange={(value: WidgetType) => setNewWidgetType(value)}>
                <SelectTrigger id="widget-type" className="sketch-input">
                  <SelectValue placeholder="Select widget type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chart">
                    <div className="flex items-center">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      <span>Chart</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="table">
                    <div className="flex items-center">
                      <Table className="mr-2 h-4 w-4" />
                      <span>Data Table</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="metric">
                    <div className="flex items-center">
                      <Gauge className="mr-2 h-4 w-4" />
                      <span>Key Metric</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="filter">
                    <div className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Data Filter</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={() => addWidget(newWidgetType)}>Add Widget</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Dashboard Dialog */}
      <Dialog open={saveDashboardDialogOpen} onOpenChange={setSaveDashboardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Dashboard</DialogTitle>
            <DialogDescription>Enter a name for your dashboard to save it for later use.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dashboard-name">Dashboard Name</Label>
              <Input
                id="dashboard-name"
                placeholder="My Dashboard"
                value={dashboardNameInput}
                onChange={(e) => setDashboardNameInput(e.target.value)}
                className="sketch-input"
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={saveDashboard}>Save Dashboard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
