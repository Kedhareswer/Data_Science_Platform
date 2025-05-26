"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Plus,
  Search,
  X,
  Database,
  BarChart3,
  Settings,
  FileText,
  Code2,
  Brain,
  Target,
  TrendingUp,
  AlertTriangle,
  Sparkles,
} from "lucide-react"
import { useData, type CellType } from "@/lib/data-context"
import { cn } from "@/lib/utils"

interface CellTypeDefinition {
  type: CellType
  label: string
  description: string
  icon: React.ReactNode
  category: "data" | "analysis" | "ml" | "utility"
  requiresData: boolean
  tags: string[]
  color: string
}

const cellTypes: CellTypeDefinition[] = [
  {
    type: "data",
    label: "Data Table",
    description: "Display and explore your dataset with sorting, filtering, and pagination",
    icon: <Database className="h-4 w-4" />,
    category: "data",
    requiresData: true,
    tags: ["table", "view", "explore"],
    color: "bg-blue-50 border-blue-200 text-blue-700",
  },
  {
    type: "profile",
    label: "Data Profile",
    description: "Statistical analysis and comprehensive data quality insights",
    icon: <BarChart3 className="h-4 w-4" />,
    category: "analysis",
    requiresData: true,
    tags: ["statistics", "quality", "summary"],
    color: "bg-green-50 border-green-200 text-green-700",
  },
  {
    type: "missing-data",
    label: "Missing Data Analysis",
    description: "Comprehensive missing data exploration and visualization patterns",
    icon: <AlertTriangle className="h-4 w-4" />,
    category: "analysis",
    requiresData: true,
    tags: ["missing", "quality", "patterns"],
    color: "bg-orange-50 border-orange-200 text-orange-700",
  },
  {
    type: "visualization",
    label: "Interactive Visualizer",
    description: "Create interactive charts, plots, and data visualizations",
    icon: <TrendingUp className="h-4 w-4" />,
    category: "analysis",
    requiresData: true,
    tags: ["charts", "plots", "visual"],
    color: "bg-purple-50 border-purple-200 text-purple-700",
  },
  {
    type: "preprocessing",
    label: "Data Preprocessing",
    description: "Clean, transform, and prepare your data for analysis",
    icon: <Settings className="h-4 w-4" />,
    category: "data",
    requiresData: true,
    tags: ["clean", "transform", "prepare"],
    color: "bg-yellow-50 border-yellow-200 text-yellow-700",
  },
  {
    type: "text",
    label: "Text Note",
    description: "Add markdown notes, documentation, and rich text content",
    icon: <FileText className="h-4 w-4" />,
    category: "utility",
    requiresData: false,
    tags: ["notes", "markdown", "documentation"],
    color: "bg-gray-50 border-gray-200 text-gray-700",
  },
  {
    type: "code",
    label: "Python Code",
    description: "Execute Python code with full data access and visualization support",
    icon: <Code2 className="h-4 w-4" />,
    category: "utility",
    requiresData: false,
    tags: ["python", "code", "script"],
    color: "bg-indigo-50 border-indigo-200 text-indigo-700",
  },
  {
    type: "ml-trainer",
    label: "ML Model Trainer",
    description: "Train machine learning models with automated feature selection",
    icon: <Brain className="h-4 w-4" />,
    category: "ml",
    requiresData: true,
    tags: ["machine learning", "training", "models"],
    color: "bg-red-50 border-red-200 text-red-700",
  },
  {
    type: "ml-predictor",
    label: "ML Predictor",
    description: "Make predictions using trained machine learning models",
    icon: <Target className="h-4 w-4" />,
    category: "ml",
    requiresData: true,
    tags: ["prediction", "inference", "models"],
    color: "bg-pink-50 border-pink-200 text-pink-700",
  },
  {
    type: "ml-insights",
    label: "ML Model Comparison",
    description: "Compare and analyze machine learning model performance",
    icon: <Sparkles className="h-4 w-4" />,
    category: "ml",
    requiresData: true,
    tags: ["comparison", "analysis", "performance"],
    color: "bg-cyan-50 border-cyan-200 text-cyan-700",
  },
]

const categories = [
  { id: "all", label: "All", icon: <Plus className="h-4 w-4" /> },
  { id: "data", label: "Data", icon: <Database className="h-4 w-4" /> },
  { id: "analysis", label: "Analysis", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "ml", label: "ML", icon: <Brain className="h-4 w-4" /> },
  { id: "utility", label: "Utility", icon: <Settings className="h-4 w-4" /> },
]

interface CellAdditionPanelProps {
  isOpen: boolean
  onClose: () => void
  insertIndex?: number
}

export function CellAdditionPanel({ isOpen, onClose, insertIndex }: CellAdditionPanelProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)
  const { addCell, processedData } = useData()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const hasData = processedData.length > 0

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  const filteredCellTypes = cellTypes.filter((cellType) => {
    const matchesSearch =
      cellType.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cellType.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cellType.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesCategory = selectedCategory === "all" || cellType.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const handleAddCell = (type: CellType) => {
    addCell(type)
    onClose()
    setSearchQuery("")
    setSelectedCategory("all")
  }

  const getCellRequirementStatus = (cellType: CellTypeDefinition) => {
    if (!cellType.requiresData) return "available"
    return hasData ? "available" : "requires-data"
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] flex flex-col">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold">Add New Cell</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search cell types..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="gap-2"
                >
                  {category.icon}
                  {category.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            {!hasData && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">No data loaded</span>
                </div>
                <p className="text-sm text-amber-600 mt-1">
                  Some cell types require data to be uploaded first. Upload a CSV or Excel file to unlock all features.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCellTypes.map((cellType) => {
                const status = getCellRequirementStatus(cellType)
                const isDisabled = status === "requires-data"

                return (
                  <Card
                    key={cellType.type}
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:shadow-md",
                      cellType.color,
                      isDisabled && "opacity-50 cursor-not-allowed",
                      hoveredCell === cellType.type && !isDisabled && "scale-[1.02] shadow-lg",
                    )}
                    onMouseEnter={() => !isDisabled && setHoveredCell(cellType.type)}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => !isDisabled && handleAddCell(cellType.type)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 p-2 bg-white/50 rounded-lg">{cellType.icon}</div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-sm">{cellType.label}</h3>
                            {isDisabled && (
                              <Badge variant="secondary" className="text-xs">
                                Requires Data
                              </Badge>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{cellType.description}</p>

                          <div className="flex flex-wrap gap-1">
                            {cellType.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {filteredCellTypes.length === 0 && (
              <div className="text-center py-12">
                <div className="text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2" />
                  <p>No cell types found matching your search.</p>
                  <p className="text-sm mt-1">Try adjusting your search terms or category filter.</p>
                </div>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

// Quick Add Button Component
interface QuickAddButtonProps {
  insertIndex?: number
  className?: string
}

export function QuickAddButton({ insertIndex, className }: QuickAddButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showPanel, setShowPanel] = useState(false)

  return (
    <>
      <div
        className={cn(
          "flex justify-center py-2 opacity-0 hover:opacity-100 transition-opacity duration-200",
          isHovered && "opacity-100",
          className,
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPanel(true)}
          className="gap-2 border-dashed hover:border-solid hover:bg-primary hover:text-primary-foreground"
        >
          <Plus className="h-3 w-3" />
          Add Cell
        </Button>
      </div>

      <CellAdditionPanel isOpen={showPanel} onClose={() => setShowPanel(false)} insertIndex={insertIndex} />
    </>
  )
}

// Floating Add Button Component
export function FloatingAddButton() {
  const [showPanel, setShowPanel] = useState(false)

  return (
    <>
      <Button
        onClick={() => setShowPanel(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-40"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <CellAdditionPanel isOpen={showPanel} onClose={() => setShowPanel(false)} />
    </>
  )
}
