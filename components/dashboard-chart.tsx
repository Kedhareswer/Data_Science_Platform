"use client"

import { useState, useEffect } from "react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useData } from "@/lib/data-context"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// Color palettes
const COLOR_PALETTES = {
  default: ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE", "#00C49F", "#FFBB28", "#FF8042"],
  pastel: ["#a1c9f4", "#ffb482", "#8de5a1", "#ff9f9b", "#d0bbff", "#debb9b", "#cfcfcf", "#fffea3"],
  vibrant: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f"],
  monochrome: ["#0000FF", "#4D4DFF", "#7373FF", "#9999FF", "#BFBFFF", "#E5E5FF"],
  rainbow: ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#4B0082", "#9400D3"],
}

interface DashboardChartProps {
  config: {
    chartType: string
    xAxis: string
    yAxis: string
    colorScheme: string
  }
}

export function DashboardChart({ config }: DashboardChartProps) {
  const { processedData, columns, columnTypes } = useData()
  const [chartType, setChartType] = useState(config.chartType || "bar")
  const [xAxis, setXAxis] = useState(config.xAxis || "")
  const [yAxis, setYAxis] = useState(config.yAxis || "")
  const [colorScheme, setColorScheme] = useState(config.colorScheme || "default")
  const [showSettings, setShowSettings] = useState(false)

  // Get numeric and categorical columns
  const numericColumns = columns.filter((col) => columnTypes[col] === "number")
  const categoricalColumns = columns.filter((col) => columnTypes[col] === "string" || columnTypes[col] === "boolean")

  // Set default axes when columns change
  useEffect(() => {
    if (columns.length > 0) {
      if (!xAxis && categoricalColumns.length > 0) {
        setXAxis(categoricalColumns[0])
      }
      if (!yAxis && numericColumns.length > 0) {
        setYAxis(numericColumns[0])
      }
    }
  }, [columns, categoricalColumns, numericColumns, xAxis, yAxis])

  // Prepare data for visualization
  const prepareChartData = () => {
    try {
      if (!xAxis || !yAxis || !processedData || processedData.length === 0) {
        return []
      }

      // Validate that the selected columns exist in the data
      const sampleRow = processedData[0]
      if (!sampleRow || !(xAxis in sampleRow) || !(yAxis in sampleRow)) {
        console.warn(`Selected columns ${xAxis} or ${yAxis} not found in data`)
        return []
      }

      if (chartType === "pie") {
        const aggregatedData = processedData.reduce(
          (acc, row) => {
            if (!row || typeof row !== "object") return acc

            const key = String(row[xAxis] ?? "Unknown")
            if (!acc[key]) {
              acc[key] = 0
            }
            const value = Number(row[yAxis])
            acc[key] += isNaN(value) ? 0 : value
            return acc
          },
          {} as Record<string, number>,
        )

        return Object.entries(aggregatedData)
          .map(([name, value]) => ({ name, value }))
          .filter((item) => item.value > 0)
          .slice(0, 10) // Limit to top 10 for better readability
      } else {
        return processedData
          .map((row, index) => {
            if (!row || typeof row !== "object") return null

            const xValue = row[xAxis]
            const yValue = Number(row[yAxis])

            // Skip invalid data points
            if (xValue === null || xValue === undefined || isNaN(yValue)) {
              return null
            }

            return {
              name: String(xValue),
              value: yValue,
              originalIndex: index,
            }
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
          .slice(0, 1000) // Limit data points for performance
      }
    } catch (error) {
      console.error("Error preparing chart data:", error)
      return []
    }
  }

  const chartData = prepareChartData()

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Popover open={showSettings} onOpenChange={setShowSettings}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="sketch-button">
              <Settings className="h-4 w-4 mr-2" />
              Chart Settings
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Chart Type</Label>
                <Select value={chartType} onValueChange={setChartType}>
                  <SelectTrigger className="sketch-input">
                    <SelectValue placeholder="Select chart type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                    <SelectItem value="line">Line Chart</SelectItem>
                    <SelectItem value="pie">Pie Chart</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>X-Axis</Label>
                <Select value={xAxis} onValueChange={setXAxis}>
                  <SelectTrigger className="sketch-input">
                    <SelectValue placeholder="Select X-Axis" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((column) => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Y-Axis</Label>
                <Select value={yAxis} onValueChange={setYAxis}>
                  <SelectTrigger className="sketch-input">
                    <SelectValue placeholder="Select Y-Axis" />
                  </SelectTrigger>
                  <SelectContent>
                    {numericColumns.map((column) => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Color Scheme</Label>
                <Select value={colorScheme} onValueChange={setColorScheme}>
                  <SelectTrigger className="sketch-input">
                    <SelectValue placeholder="Select color scheme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="pastel">Pastel</SelectItem>
                    <SelectItem value="vibrant">Vibrant</SelectItem>
                    <SelectItem value="monochrome">Monochrome</SelectItem>
                    <SelectItem value="rainbow">Rainbow</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="h-[300px] w-full">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <div className="text-lg mb-2">No data to display</div>
              <div className="text-sm">
                {!xAxis || !yAxis
                  ? "Please select both X and Y axes"
                  : "No valid data points found for the selected columns"}
              </div>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" && (
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={0}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) =>
                    String(value).length > 15 ? `${String(value).substring(0, 12)}...` : String(value)
                  }
                />
                <YAxis tickFormatter={(value) => Number(value).toLocaleString()} />
                <Tooltip
                  formatter={(value, name) => [Number(value).toLocaleString(), name]}
                  labelFormatter={(label) => `Category: ${label}`}
                />
                <Legend />
                <Bar
                  dataKey="value"
                  fill={COLOR_PALETTES[colorScheme]?.[0] || "#8884d8"}
                  name={yAxis}
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            )}

            {chartType === "line" && (
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={0}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) =>
                    String(value).length > 15 ? `${String(value).substring(0, 12)}...` : String(value)
                  }
                />
                <YAxis tickFormatter={(value) => Number(value).toLocaleString()} />
                <Tooltip
                  formatter={(value, name) => [Number(value).toLocaleString(), name]}
                  labelFormatter={(label) => `X: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={COLOR_PALETTES[colorScheme]?.[0] || "#8884d8"}
                  activeDot={{ r: 6 }}
                  name={yAxis}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            )}

            {chartType === "pie" && (
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent, value }) => (percent > 5 ? `${name}: ${(percent * 100).toFixed(1)}%` : "")}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        COLOR_PALETTES[colorScheme]?.[index % COLOR_PALETTES[colorScheme].length] ||
                        `hsl(${index * 45}, 70%, 60%)`
                      }
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [Number(value).toLocaleString(), name]} />
                <Legend />
              </PieChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
