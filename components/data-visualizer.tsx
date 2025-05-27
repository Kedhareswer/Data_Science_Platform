"use client"

import type React from "react"
import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface DataPoint {
  time: string
  value: number
}

interface DataVisualizerProps {
  data: DataPoint[]
}

const DataVisualizer: React.FC<DataVisualizerProps> = ({ data }) => {
  const [chartData, setChartData] = useState<DataPoint[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [needsUpdate, setNeedsUpdate] = useState<boolean>(true)

  const debounceRef = useRef<NodeJS.Timeout>()

  const prepareChartData = useCallback(() => {
    try {
      setError(null)

      if (!data || data.length === 0) {
        return []
      }

      // Validate data structure
      const validData = data.filter((item) => {
        if (!item || typeof item !== "object") return false
        if (!item.time || typeof item.time !== "string") return false
        if (typeof item.value !== "number" || isNaN(item.value)) return false
        return true
      })

      if (validData.length === 0) {
        setError("No valid data points found. Data must have 'time' (string) and 'value' (number) properties.")
        return []
      }

      // Sort by time for proper line chart display
      const sortedData = validData.sort((a, b) => {
        const timeA = new Date(a.time).getTime()
        const timeB = new Date(b.time).getTime()

        // If dates are invalid, fall back to string comparison
        if (isNaN(timeA) || isNaN(timeB)) {
          return a.time.localeCompare(b.time)
        }

        return timeA - timeB
      })

      // Limit data points for performance (keep last 1000 points)
      const limitedData = sortedData.slice(-1000)

      return limitedData.map((item, index) => ({
        time: item.time,
        value: Number(item.value.toFixed(2)), // Round to 2 decimal places
        originalIndex: index,
      }))
    } catch (error) {
      console.error("Error preparing chart data:", error)
      setError(`Error preparing chart data: ${error instanceof Error ? error.message : "Unknown error"}`)
      return []
    }
  }, [data])

  const debouncedPrepareChartData = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      try {
        const data = prepareChartData()
        setIsLoading(false)
        setNeedsUpdate(false)
        setChartData(data)
        return data
      } catch (error) {
        setIsLoading(false)
        setError(`Error preparing chart data: ${error instanceof Error ? error.message : "Unknown error"}`)
        return []
      }
    }, 300)
  }, [prepareChartData])

  useEffect(() => {
    if (needsUpdate) {
      setIsLoading(true)
      setError(null)
      debouncedPrepareChartData()
    }
  }, [data, needsUpdate, debouncedPrepareChartData])

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const memoizedChart = useMemo(() => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading chart...</span>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full text-red-600">
          <div className="text-center">
            <div className="text-lg font-semibold mb-2">Chart Error</div>
            <div className="text-sm">{error}</div>
          </div>
        </div>
      )
    }

    if (!chartData || chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <div className="text-lg mb-2">No data to display</div>
            <div className="text-sm">Please provide valid data with 'time' and 'value' properties</div>
          </div>
        </div>
      )
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => Number(value).toLocaleString()} />
          <Tooltip
            formatter={(value, name) => [Number(value).toLocaleString(), name]}
            labelFormatter={(label) => `Time: ${label}`}
          />
          <Legend />
          <Line type="monotone" dataKey="value" stroke="#8884d8" activeDot={{ r: 6 }} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    )
  }, [chartData, isLoading, error])

  useEffect(() => {
    setNeedsUpdate(true)
  }, [data])

  return (
    <div>
      <h2>Data Visualizer</h2>
      {memoizedChart}
    </div>
  )
}

export default DataVisualizer
