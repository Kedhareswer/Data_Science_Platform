"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  ChevronRight,
  ChevronLeft,
  Home,
  Search,
  Code,
  Layers,
  Database,
  BarChart3,
  Settings,
  Zap,
  FileText,
  Package,
  Terminal,
  HelpCircle,
  ExternalLink,
  ArrowLeft,
  Navigation,
  Bookmark,
  Copy,
  Check,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { NavigationBreadcrumb } from "@/components/navigation-breadcrumb"
import { NavigationSidebar } from "@/components/navigation-sidebar"
import { useNavigation } from "@/lib/navigation-context"

interface DocSection {
  id: string
  title: string
  icon: React.ReactNode
  description: string
  subsections?: DocSubsection[]
}

interface DocSubsection {
  id: string
  title: string
  description: string
}

interface NavigationHistory {
  sectionId: string
  subsectionId?: string
  title: string
  timestamp: number
}

const DocsPage = () => {
  const router = useRouter()
  const { navigateTo } = useNavigation()
  const [activeSection, setActiveSection] = useState("overview")
  const [activeSubsection, setActiveSubsection] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [navigationHistory, setNavigationHistory] = useState<NavigationHistory[]>([])
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [navSidebarOpen, setNavSidebarOpen] = useState(false)

  // Documentation sections structure
  const docSections: DocSection[] = [
    {
      id: "overview",
      title: "Overview",
      icon: <Home className="h-4 w-4" />,
      description: "Introduction to the Next.js Data Platform",
      subsections: [
        { id: "introduction", title: "Introduction", description: "What is the Data Platform" },
        { id: "features", title: "Key Features", description: "Core capabilities and features" },
        { id: "architecture", title: "Architecture", description: "System design and structure" },
        { id: "getting-started", title: "Getting Started", description: "Quick start guide" },
      ],
    },
    {
      id: "installation",
      title: "Installation & Setup",
      icon: <Package className="h-4 w-4" />,
      description: "Setup instructions and dependencies",
      subsections: [
        { id: "requirements", title: "Requirements", description: "System requirements and prerequisites" },
        { id: "installation-steps", title: "Installation", description: "Step-by-step installation guide" },
        { id: "configuration", title: "Configuration", description: "Environment and configuration setup" },
        { id: "verification", title: "Verification", description: "Verify your installation" },
      ],
    },
    {
      id: "components",
      title: "Components",
      icon: <Layers className="h-4 w-4" />,
      description: "Detailed component documentation",
      subsections: [
        { id: "data-visualizer", title: "Data Visualizer", description: "Chart creation and visualization" },
        { id: "data-explorer", title: "Data Explorer", description: "Data browsing and exploration" },
        { id: "data-preprocessor", title: "Data Preprocessor", description: "Data cleaning and transformation" },
        { id: "ml-components", title: "ML Components", description: "Machine learning tools" },
        { id: "dashboard-components", title: "Dashboard Components", description: "Dashboard creation tools" },
      ],
    },
    {
      id: "data-context",
      title: "Data Context",
      icon: <Database className="h-4 w-4" />,
      description: "Data management and state",
      subsections: [
        { id: "context-overview", title: "Context Overview", description: "Data context architecture" },
        { id: "data-processing", title: "Data Processing", description: "File processing and parsing" },
        { id: "preprocessing", title: "Preprocessing", description: "Data cleaning operations" },
        { id: "profiling", title: "Data Profiling", description: "Statistical analysis and insights" },
      ],
    },
    {
      id: "visualization",
      title: "Visualization",
      icon: <BarChart3 className="h-4 w-4" />,
      description: "Chart types and visualization options",
      subsections: [
        { id: "chart-types", title: "Chart Types", description: "Available chart types and usage" },
        { id: "customization", title: "Customization", description: "Styling and appearance options" },
        { id: "interactivity", title: "Interactivity", description: "Interactive features and controls" },
        { id: "export", title: "Export Options", description: "Exporting charts and data" },
      ],
    },
    {
      id: "machine-learning",
      title: "Machine Learning",
      icon: <Zap className="h-4 w-4" />,
      description: "ML models and algorithms",
      subsections: [
        { id: "ml-overview", title: "ML Overview", description: "Machine learning capabilities" },
        { id: "model-training", title: "Model Training", description: "Training ML models" },
        { id: "predictions", title: "Predictions", description: "Making predictions with models" },
        { id: "model-comparison", title: "Model Comparison", description: "Comparing model performance" },
      ],
    },
    {
      id: "api-reference",
      title: "API Reference",
      icon: <Code className="h-4 w-4" />,
      description: "Function and method documentation",
      subsections: [
        { id: "data-functions", title: "Data Functions", description: "Data manipulation functions" },
        { id: "visualization-api", title: "Visualization API", description: "Chart and visualization methods" },
        { id: "ml-api", title: "ML API", description: "Machine learning functions" },
        { id: "utility-functions", title: "Utility Functions", description: "Helper and utility methods" },
      ],
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      icon: <HelpCircle className="h-4 w-4" />,
      description: "Common issues and solutions",
      subsections: [
        { id: "common-issues", title: "Common Issues", description: "Frequently encountered problems" },
        { id: "performance", title: "Performance optimization tips" },
        { id: "debugging", title: "Debugging techniques and tools" },
        { id: "faq", title: "FAQ", description: "Frequently asked questions" },
      ],
    },
  ]

  // Add to navigation history
  const addToHistory = (sectionId: string, subsectionId?: string, title?: string) => {
    const historyItem: NavigationHistory = {
      sectionId,
      subsectionId,
      title: title || docSections.find((s) => s.id === sectionId)?.title || "Unknown",
      timestamp: Date.now(),
    }

    setNavigationHistory((prev) => {
      // Remove duplicate entries and limit history to 10 items
      const filtered = prev.filter((item) => !(item.sectionId === sectionId && item.subsectionId === subsectionId))
      return [historyItem, ...filtered].slice(0, 10)
    })
  }

  // Navigate to section/subsection
  const navigateToSection = (sectionId: string, subsectionId?: string) => {
    const section = docSections.find((s) => s.id === sectionId)
    const subsection = section?.subsections?.find((sub) => sub.id === subsectionId)

    const title = subsection?.title || section?.title || "Documentation"
    const subtitle = subsection ? section?.title : undefined

    navigateTo('/docs', title, subtitle, {
      sectionId,
      subsectionId,
      section: 'docs',
      subsection: subsectionId || sectionId
    })

    setActiveSection(sectionId)
    setActiveSubsection(subsectionId || null)
  }

  // Go back in navigation history
  const goBack = () => {
    if (navigationHistory.length > 1) {
      const previous = navigationHistory[1] // Skip current (index 0)
      navigateToSection(previous.sectionId, previous.subsectionId)
    }
  }

  // Copy code to clipboard
  const copyCode = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(id)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      console.error("Failed to copy code:", err)
    }
  }

  // Filter sections based on search
  const filteredSections = docSections.filter(
    (section) =>
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.subsections?.some(
        (sub) =>
          sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sub.description.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
  )

  // Get current section and subsection
  const currentSection = docSections.find((s) => s.id === activeSection)
  const currentSubsection = currentSection?.subsections?.find((sub) => sub.id === activeSubsection)

  // Breadcrumb component
  const Breadcrumb = () => (
    <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
      <Button variant="ghost" size="sm" onClick={() => navigateToSection("overview")} className="p-0 h-auto font-normal">
        <Home className="h-3 w-3 mr-1" />
        Docs
      </Button>
      {currentSection && (
        <>
          <ChevronRight className="h-3 w-3" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateToSection(currentSection.id)}
            className="p-0 h-auto font-normal"
          >
            {currentSection.title}
          </Button>
        </>
      )}
      {currentSubsection && (
        <>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-foreground">{currentSubsection.title}</span>
        </>
      )}
    </div>
  )

  // Code block component
  const CodeBlock = ({ code, language = "typescript", id }: { code: string; language?: string; id: string }) => (
    <div className="relative">
      <div className="flex items-center justify-between bg-muted px-4 py-2 rounded-t-lg">
        <span className="text-sm font-medium">{language}</span>
        <Button variant="ghost" size="sm" onClick={() => copyCode(code, id)} className="h-6 px-2">
          {copiedCode === id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <pre className="bg-muted/50 p-4 rounded-b-lg overflow-x-auto">
        <code className="text-sm">{code}</code>
      </pre>
    </div>
  )

  return (
    <div className="container mx-auto py-6">
      <NavigationSidebar isOpen={navSidebarOpen} onToggle={() => setNavSidebarOpen(!navSidebarOpen)} />
      
      <div className={`transition-all duration-200 ${navSidebarOpen ? 'ml-80' : ''}`}>
        <NavigationBreadcrumb />
        
        {/* Rest of the existing content remains the same, but update navigation calls */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Documentation</CardTitle>
                {navigationHistory.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={goBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search docs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {filteredSections.map((section) => (
                    <div key={section.id}>
                      <Button
                        variant={activeSection === section.id ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => navigateToSection(section.id)}
                      >
                        {section.icon}
                        <span className="ml-2">{section.title}</span>
                      </Button>
                      {activeSection === section.id && section.subsections && (
                        <div className="ml-6 mt-1 space-y-1">
                          {section.subsections.map((subsection) => (
                            <Button
                              key={subsection.id}
                              variant={activeSubsection === subsection.id ? "secondary" : "ghost"}
                              size="sm"
                              className="w-full justify-start text-sm"
                              onClick={() => navigateToSection(section.id, subsection.id)}
                            >
                              {subsection.title}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Navigation History */}
          {navigationHistory.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center">
                  <Navigation className="h-4 w-4 mr-2" />
                  Recent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {navigationHistory.slice(0, 5).map((item, index) => (
                    <Button
                      key={`${item.sectionId}-${item.subsectionId}-${item.timestamp}`}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs"
                      onClick={() => navigateToSection(item.sectionId, item.subsectionId)}
                    >
                      <Bookmark className="h-3 w-3 mr-2" />
                      {item.title}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <Breadcrumb />

          {/* Overview Section */}
          {activeSection === "overview" && (
            <div className="space-y-6">
              {(!activeSubsection || activeSubsection === "introduction") && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Home className="h-5 w-5 mr-2" />
                      Next.js Data Platform
                    </CardTitle>
                    <CardDescription>
                      A comprehensive data analysis and visualization platform built with Next.js
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p>
                      The Next.js Data Platform is a powerful, web-based application designed for data scientists,
                      analysts, and developers who need to process, analyze, and visualize data efficiently. Built with
                      modern web technologies, it provides a seamless experience for working with various data formats
                      and creating insightful visualizations.
                    </p>

                    <Alert>
                      <Zap className="h-4 w-4" />
                      <AlertTitle>Key Highlights</AlertTitle>
                      <AlertDescription>
                        Interactive data exploration, machine learning capabilities, and real-time visualization with
                        support for multiple data formats including CSV, Excel, and JSON.
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Built With</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">Next.js 14</Badge>
                            <Badge variant="secondary">TypeScript</Badge>
                            <Badge variant="secondary">Tailwind CSS</Badge>
                            <Badge variant="secondary">Recharts</Badge>
                            <Badge variant="secondary">shadcn/ui</Badge>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Supported Formats</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">CSV</Badge>
                            <Badge variant="outline">Excel (.xlsx)</Badge>
                            <Badge variant="outline">JSON</Badge>
                            <Badge variant="outline">TSV</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSubsection === "features" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Key Features</CardTitle>
                    <CardDescription>Comprehensive data analysis and visualization capabilities</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="font-semibold flex items-center">
                          <Database className="h-4 w-4 mr-2" />
                          Data Management
                        </h3>
                        <ul className="space-y-2 text-sm">
                          <li>• File upload and parsing (CSV, Excel, JSON)</li>
                          <li>• Automatic data type detection</li>
                          <li>• Data profiling and quality assessment</li>
                          <li>• Missing data analysis and handling</li>
                          <li>• Data preprocessing and cleaning</li>
                        </ul>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold flex items-center">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Visualization
                        </h3>
                        <ul className="space-y-2 text-sm">
                          <li>• 12+ chart types (Bar, Line, Pie, Scatter, etc.)</li>
                          <li>• Interactive charts with zoom and pan</li>
                          <li>• Customizable colors and styling</li>
                          <li>• Export charts as PNG/SVG</li>
                          <li>• Real-time chart updates</li>
                        </ul>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold flex items-center">
                          <Zap className="h-4 w-4 mr-2" />
                          Machine Learning
                        </h3>
                        <ul className="space-y-2 text-sm">
                          <li>• Linear and logistic regression</li>
                          <li>• K-means clustering</li>
                          <li>• Decision trees</li>
                          <li>• Model comparison and evaluation</li>
                          <li>• Prediction and inference</li>
                        </ul>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold flex items-center">
                          <Settings className="h-4 w-4 mr-2" />
                          Advanced Features
                        </h3>
                        <ul className="space-y-2 text-sm">
                          <li>• Notebook-style interface</li>
                          <li>• Custom code execution</li>
                          <li>• Dashboard creation</li>
                          <li>• Data export capabilities</li>
                          <li>• Responsive design</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSubsection === "architecture" && (
                <Card>
                  <CardHeader>
                    <CardTitle>System Architecture</CardTitle>
                    <CardDescription>Understanding the platform's structure and design patterns</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold">Frontend Architecture</h3>
                      <p className="text-sm text-muted-foreground">
                        The platform follows a modern React architecture with Next.js App Router, providing server-side
                        rendering and optimal performance.
                      </p>

                      <div className="bg-muted p-4 rounded-lg">
                        <pre className="text-sm">
                          {`app/
├── layout.tsx          # Root layout
├── page.tsx           # Home page
├── docs/              # Documentation
├── dashboard/         # Dashboard pages
├── notebook/          # Notebook interface
└── dashboard-creator/ # Dashboard builder

components/
├── ui/                # shadcn/ui components
├── data-visualizer.tsx
├── data-explorer.tsx
├── ml-components/
└── dashboard-components/

lib/
├── data-context.tsx   # Global data state
├── ml-models.ts       # ML algorithms
└── utils.ts           # Utility functions`}
                        </pre>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Data Flow</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">1. Data Input</CardTitle>
                          </CardHeader>
                          <CardContent className="text-xs">
                            File upload → Parsing → Type detection → Validation
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">2. Processing</CardTitle>
                          </CardHeader>
                          <CardContent className="text-xs">
                            Cleaning → Transformation → Feature engineering → Analysis
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">3. Output</CardTitle>
                          </CardHeader>
                          <CardContent className="text-xs">Visualization → ML models → Dashboards → Export</CardContent>
                        </Card>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSubsection === "getting-started" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Getting Started</CardTitle>
                    <CardDescription>Quick start guide to begin using the platform</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold">1. Upload Your Data</h3>
                      <p className="text-sm text-muted-foreground">
                        Start by uploading a CSV or Excel file. The platform will automatically detect data types and
                        provide a preview.
                      </p>

                      <CodeBlock
                        id="upload-example"
                        code={`// Supported file formats
const supportedFormats = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]

// File size limit: 50MB
const maxFileSize = 50 * 1024 * 1024`}
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">2. Explore Your Data</h3>
                      <p className="text-sm text-muted-foreground">
                        Use the data explorer to understand your dataset structure, check for missing values, and
                        identify patterns.
                      </p>

                      <Alert>
                        <FileText className="h-4 w-4" />
                        <AlertTitle>Pro Tip</AlertTitle>
                        <AlertDescription>
                          The data profiling feature automatically generates statistical insights and quality
                          assessments for your dataset.
                        </AlertDescription>
                      </Alert>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">3. Create Visualizations</h3>
                      <p className="text-sm text-muted-foreground">
                        Select columns and chart types to create interactive visualizations. The platform suggests
                        optimal chart types based on your data.
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <Badge variant="outline">Bar Charts</Badge>
                        <Badge variant="outline">Line Charts</Badge>
                        <Badge variant="outline">Scatter Plots</Badge>
                        <Badge variant="outline">Pie Charts</Badge>
                        <Badge variant="outline">Heatmaps</Badge>
                        <Badge variant="outline">Box Plots</Badge>
                        <Badge variant="outline">Histograms</Badge>
                        <Badge variant="outline">Treemaps</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Installation Section */}
          {activeSection === "installation" && (
            <div className="space-y-6">
              {(!activeSubsection || activeSubsection === "requirements") && (
                <Card>
                  <CardHeader>
                    <CardTitle>System Requirements</CardTitle>
                    <CardDescription>Prerequisites for running the Data Platform</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-3">Development Environment</h3>
                        <ul className="space-y-2 text-sm">
                          <li>• Node.js 18.0 or higher</li>
                          <li>• npm 9.0 or yarn 1.22+</li>
                          <li>• Git for version control</li>
                          <li>• Modern web browser (Chrome, Firefox, Safari, Edge)</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-3">System Specifications</h3>
                        <ul className="space-y-2 text-sm">
                          <li>• RAM: 4GB minimum, 8GB recommended</li>
                          <li>• Storage: 1GB free space</li>
                          <li>• Network: Internet connection for dependencies</li>
                          <li>• OS: Windows 10+, macOS 10.15+, Linux</li>
                        </ul>
                      </div>
                    </div>

                    <Alert>
                      <Terminal className="h-4 w-4" />
                      <AlertTitle>Version Check</AlertTitle>
                      <AlertDescription>
                        Run <code>node --version</code> and <code>npm --version</code> to verify your installation.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}

              {activeSubsection === "installation-steps" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Installation Steps</CardTitle>
                    <CardDescription>Step-by-step guide to set up the platform</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold">1. Clone the Repository</h3>
                      <CodeBlock
                        id="clone-repo"
                        language="bash"
                        code={`git clone https://github.com/your-username/nextjs-data-platform.git
cd nextjs-data-platform`}
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">2. Install Dependencies</h3>
                      <CodeBlock
                        id="install-deps"
                        language="bash"
                        code={`# Using npm
npm install

# Using yarn
yarn install

# Using pnpm
pnpm install`}
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">3. Environment Setup</h3>
                      <CodeBlock
                        id="env-setup"
                        language="bash"
                        code={`# Copy environment template
cp .env.example .env.local

# Edit environment variables
nano .env.local`}
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">4. Start Development Server</h3>
                      <CodeBlock
                        id="start-dev"
                        language="bash"
                        code={`npm run dev
# or
yarn dev
# or
pnpm dev`}
                      />
                      <p className="text-sm text-muted-foreground">
                        Open{" "}
                        <a href="http://localhost:3000" className="text-blue-600 hover:underline">
                          http://localhost:3000
                        </a>{" "}
                        in your browser.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSubsection === "configuration" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Configuration</CardTitle>
                    <CardDescription>Environment variables and configuration options</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold">Environment Variables</h3>
                      <CodeBlock
                        id="env-vars"
                        language="bash"
                        code={`# .env.local
NEXT_PUBLIC_APP_NAME="Data Platform"
NEXT_PUBLIC_MAX_FILE_SIZE=52428800  # 50MB
NEXT_PUBLIC_SUPPORTED_FORMATS="csv,xlsx,xls,json"

# Optional: Analytics
NEXT_PUBLIC_GA_ID="your-google-analytics-id"

# Optional: Error Tracking
SENTRY_DSN="your-sentry-dsn"`}
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Next.js Configuration</h3>
                      <CodeBlock
                        id="nextjs-config"
                        language="typescript"
                        code={`// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['localhost'],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    }
    return config
  },
}

module.exports = nextConfig`}
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Tailwind Configuration</h3>
                      <CodeBlock
                        id="tailwind-config"
                        language="typescript"
                        code={`// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'handwritten': [
          '"Comic Sans MS"',
          '"Brush Script MT"',
          '"Lucida Handwriting"',
          '"Bradley Hand"',
          '"Segoe Print"',
          'cursive'
        ],
        'handwritten-bold': [
          '"Comic Sans MS"',
          '"Brush Script MT"',
          'cursive'
        ]
      }
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config`}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Components Section */}
          {activeSection === "components" && (
            <div className="space-y-6">
              {(!activeSubsection || activeSubsection === "data-visualizer") && (
                <Card>
                  <CardHeader>
                    <CardTitle>Data Visualizer Component</CardTitle>
                    <CardDescription>Interactive chart creation and customization</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold">Overview</h3>
                      <p className="text-sm text-muted-foreground">
                        The DataVisualizer component is the core visualization engine that provides 12+ chart types with
                        extensive customization options and real-time updates.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Usage Example</h3>
                      <CodeBlock
                        id="data-visualizer-usage"
                        code={`import { DataVisualizer } from '@/components/data-visualizer'
import { DataProvider } from '@/lib/data-context'

export default function VisualizationPage() {
  return (
    <DataProvider>
      <div className="container mx-auto py-6">
        <DataVisualizer />
      </div>
    </DataProvider>
  )
}`}
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Supported Chart Types</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                          { name: "Bar Chart", desc: "Compare categories" },
                          { name: "Line Chart", desc: "Show trends over time" },
                          { name: "Area Chart", desc: "Emphasize volume" },
                          { name: "Pie Chart", desc: "Show proportions" },
                          { name: "Scatter Plot", desc: "Correlation analysis" },
                          { name: "Bubble Chart", desc: "3D relationships" },
                          { name: "Radar Chart", desc: "Multi-variable comparison" },
                          { name: "Treemap", desc: "Hierarchical data" },
                          { name: "Heatmap", desc: "Data intensity" },
                          { name: "Funnel Chart", desc: "Process stages" },
                          { name: "Composed Chart", desc: "Multiple chart types" },
                          { name: "Box Plot", desc: "Statistical distribution" },
                        ].map((chart, index) => (
                          <Card key={index}>
                            <CardContent className="p-3">
                              <h4 className="font-medium text-sm">{chart.name}</h4>
                              <p className="text-xs text-muted-foreground">{chart.desc}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Key Features</h3>
                      <ul className="space-y-2 text-sm">
                        <li>
                          • <strong>Smart Chart Suggestions:</strong> Automatically recommends chart types based on data
                        </li>
                        <li>
                          • <strong>Real-time Preview:</strong> Live updates as you modify settings
                        </li>
                        <li>
                          • <strong>Data Sampling:</strong> Handle large datasets with intelligent sampling
                        </li>
                        <li>
                          • <strong>Export Options:</strong> Save charts as PNG, SVG, or PDF
                        </li>
                        <li>
                          • <strong>Responsive Design:</strong> Works on all screen sizes
                        </li>
                        <li>
                          • <strong>Accessibility:</strong> WCAG compliant with keyboard navigation
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSubsection === "data-explorer" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Data Explorer Component</CardTitle>
                    <CardDescription>Browse and understand your dataset structure</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold">Features</h3>
                      <ul className="space-y-2 text-sm">
                        <li>
                          • <strong>Data Table View:</strong> Paginated table with sorting and filtering
                        </li>
                        <li>
                          • <strong>Column Statistics:</strong> Summary statistics for each column
                        </li>
                        <li>
                          • <strong>Data Types:</strong> Automatic type detection and validation
                        </li>
                        <li>
                          • <strong>Search & Filter:</strong> Find specific data points quickly
                        </li>
                        <li>
                          • <strong>Export Functionality:</strong> Export filtered data
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Implementation</h3>
                      <CodeBlock
                        id="data-explorer-impl"
                        code={`import { DataExplorer } from '@/components/data-explorer'
import { useData } from '@/lib/data-context'

export function ExplorerPage() {
  const { processedData, columns, columnTypes } = useData()
  
  return (
    <div className="space-y-6">
      <DataExplorer 
        data={processedData}
        columns={columns}
        columnTypes={columnTypes}
        pageSize={50}
        enableSearch={true}
        enableExport={true}
      />
    </div>
  )
}`}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSubsection === "ml-components" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Machine Learning Components</CardTitle>
                    <CardDescription>ML model training, prediction, and analysis tools</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold">Available Components</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">ML Model Trainer</CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm">
                            Train various ML models including linear regression, logistic regression, decision trees,
                            and k-means clustering.
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">ML Predictor</CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm">
                            Make predictions using trained models with new data inputs and confidence intervals.
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Model Comparison</CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm">
                            Compare multiple models side-by-side with performance metrics and cross-validation results.
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">ML Insights</CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm">
                            Generate insights about model performance, feature importance, and prediction accuracy.
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Supported Algorithms</h3>
                      <CodeBlock
                        id="ml-algorithms"
                        code={`// Available ML algorithms
const algorithms = {
  regression: [
    'linear_regression',
    'logistic_regression',
    'polynomial_regression'
  ],
  classification: [
    'decision_tree',
    'random_forest',
    'naive_bayes'
  ],
  clustering: [
    'kmeans',
    'hierarchical',
    'dbscan'
  ],
  dimensionality_reduction: [
    'pca',
    'tsne'
  ]
}`}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* API Reference Section */}
          {activeSection === "api-reference" && (
            <div className="space-y-6">
              {(!activeSubsection || activeSubsection === "data-functions") && (
                <Card>
                  <CardHeader>
                    <CardTitle>Data Functions API</CardTitle>
                    <CardDescription>Core data manipulation and processing functions</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold">useData Hook</h3>
                      <p className="text-sm text-muted-foreground">
                        The primary hook for accessing and manipulating data throughout the application.
                      </p>

                      <CodeBlock
                        id="use-data-hook"
                        code={`import { useData } from '@/lib/data-context'

function MyComponent() {
  const {
    // Data state
    rawData,
    processedData,
    columns,
    columnTypes,
    isLoading,
    fileName,
    error,
    
    // Data operations
    processFile,
    applyPreprocessing,
    exportData,
    resetData,
    
    // Analysis functions
    generateDataProfile,
    detectOutliers,
    handleOutliers,
    
    // Feature engineering
    createFeature,
    binColumn,
    
    // ML functions
    trainedModels,
    saveTrainedModel,
    getTrainedModels
  } = useData()
  
  return (
    // Your component JSX
  )
}`}
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Key Functions</h3>

                      <div className="space-y-6">
                        <div>
                          <h4 className="font-medium mb-2">processFile(file: File)</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            Process uploaded files (CSV, Excel, JSON) and populate the data context.
                          </p>
                          <CodeBlock
                            id="process-file"
                            code={`// Process a CSV file
const handleFileUpload = async (file: File) => {
  try {
    await processFile(file)
    console.log('File processed successfully')
  } catch (error) {
    console.error('Error processing file:', error)
  }
}`}
                          />
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">applyPreprocessing(type, options)</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            Apply various preprocessing operations to clean and transform data.
                          </p>
                          <CodeBlock
                            id="apply-preprocessing"
                            code={`// Handle missing values
await applyPreprocessing('missing', {
  columns: ['age', 'income'],
  strategy: 'mean'
})

// Normalize data
await applyPreprocessing('normalize', {
  columns: ['price', 'quantity'],
  method: 'minmax'
})

// Drop columns
await applyPreprocessing('transform', {
  columns: ['unnecessary_column'],
  action: 'drop'
})`}
                          />
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">detectOutliers(columns, method)</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            Detect outliers in numerical columns using various statistical methods.
                          </p>
                          <CodeBlock
                            id="detect-outliers"
                            code={`// Detect outliers using IQR method
const outliers = detectOutliers(['price', 'age'], 'iqr')

// Detect outliers using Z-score method
const zScoreOutliers = detectOutliers(['income'], 'zscore')

// Handle outliers
await handleOutliers(['price'], 'iqr', 'remove')
await handleOutliers(['income'], 'zscore', 'cap')`}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSubsection === "visualization-api" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Visualization API</CardTitle>
                    <CardDescription>Chart creation and customization methods</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold">Chart Configuration</h3>
                      <CodeBlock
                        id="chart-config"
                        code={`interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'bubble' | 'radar' | 'treemap'
  xAxis: string
  yAxis: string
  secondYAxis?: string
  colorPalette: 'default' | 'pastel' | 'vibrant' | 'monochrome'
  showGrid: boolean
  showLegend: boolean
  chartTitle?: string
  xAxisLabel?: string
  yAxisLabel?: string
  animation: boolean
  responsive: boolean
}

// Example usage
const chartConfig: ChartConfig = {
  type: 'bar',
  xAxis: 'category',
  yAxis: 'value',
  colorPalette: 'vibrant',
  showGrid: true,
  showLegend: true,
  chartTitle: 'Sales by Category',
  animation: true,
  responsive: true
}`}
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Chart Export Functions</h3>
                      <CodeBlock
                        id="chart-export"
                        code={`// Export chart as PNG
const exportChartAsPNG = (chartRef: RefObject<any>, filename: string) => {
  const svgElement = chartRef.current?.container?.children[0]
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  // Convert SVG to canvas and download
  // Implementation details...
}

// Export data as CSV
const exportDataAsCSV = (data: any[], filename: string) => {
  const csv = Papa.unparse(data)
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
}`}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSubsection === "ml-api" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Machine Learning API</CardTitle>
                    <CardDescription>ML model training and prediction functions</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold">Model Training</h3>
                      <CodeBlock
                        id="ml-training"
                        code={`import { 
  SimpleLinearRegression,
  SimpleLogisticRegression,
  KMeansClustering,
  SimpleDecisionTree 
} from '@/lib/ml-models'

// Train a linear regression model
const trainLinearRegression = (features: number[][], target: number[]) => {
  const model = new SimpleLinearRegression()
  model.fit(features, target)
  
  return {
    model,
    predictions: model.predict(features),
    score: model.score(features, target)
  }
}

// Train a classification model
const trainLogisticRegression = (features: number[][], target: number[]) => {
  const model = new SimpleLogisticRegression()
  model.fit(features, target)
  
  return {
    model,
    predictions: model.predict(features),
    accuracy: model.accuracy(features, target)
  }
}`}
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Model Evaluation</h3>
                      <CodeBlock
                        id="ml-evaluation"
                        code={`// Calculate regression metrics
const calculateRegressionMetrics = (actual: number[], predicted: number[]) => {
  const n = actual.length
  const mse = actual.reduce((sum, val, i) => 
    sum + Math.pow(val - predicted[i], 2), 0) / n
  
  const rmse = Math.sqrt(mse)
  
  const actualMean = actual.reduce((sum, val) => sum + val, 0) / n
  const totalSumSquares = actual.reduce((sum, val) => 
    sum + Math.pow(val - actualMean, 2), 0)
  const residualSumSquares = actual.reduce((sum, val, i) => 
    sum + Math.pow(val - predicted[i], 2), 0)
  
  const r2 = 1 - (residualSumSquares / totalSumSquares)
  
  return { mse, rmse, r2 }
}

// Calculate classification metrics
const calculateClassificationMetrics = (actual: number[], predicted: number[]) => {
  const correct = actual.filter((val, i) => val === predicted[i]).length
  const accuracy = correct / actual.length
  
  // Calculate confusion matrix
  const classes = [...new Set([...actual, ...predicted])]
  const confusionMatrix = classes.map(actualClass =>
    classes.map(predictedClass =>
      actual.filter((val, i) => 
        val === actualClass && predicted[i] === predictedClass
      ).length
    )
  )
  
  return { accuracy, confusionMatrix, classes }
}`}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Troubleshooting Section */}
          {activeSection === "troubleshooting" && (
            <div className="space-y-6">
              {(!activeSubsection || activeSubsection === "common-issues") && (
                <Card>
                  <CardHeader>
                    <CardTitle>Common Issues & Solutions</CardTitle>
                    <CardDescription>Frequently encountered problems and their solutions</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-semibold mb-3">File Upload Issues</h3>
                        <div className="space-y-4">
                          <Alert>
                            <HelpCircle className="h-4 w-4" />
                            <AlertTitle>File too large error</AlertTitle>
                            <AlertDescription>
                              <strong>Problem:</strong> "File size exceeds maximum limit"
                              <br />
                              <strong>Solution:</strong> The platform supports files up to 50MB. For larger files,
                              consider splitting the data or using data sampling.
                            </AlertDescription>
                          </Alert>

                          <Alert>
                            <HelpCircle className="h-4 w-4" />
                            <AlertTitle>Unsupported file format</AlertTitle>
                            <AlertDescription>
                              <strong>Problem:</strong> "File format not supported"
                              <br />
                              <strong>Solution:</strong> Ensure your file is in CSV, Excel (.xlsx, .xls), or JSON
                              format. Convert other formats using spreadsheet software.
                            </AlertDescription>
                          </Alert>

                          <Alert>
                            <HelpCircle className="h-4 w-4" />
                            <AlertTitle>Parsing errors</AlertTitle>
                            <AlertDescription>
                              <strong>Problem:</strong> "Failed to parse file"
                              <br />
                              <strong>Solution:</strong> Check for special characters, encoding issues, or malformed
                              data. Ensure CSV files use proper delimiters.
                            </AlertDescription>
                          </Alert>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="font-semibold mb-3">Visualization Issues</h3>
                        <div className="space-y-4">
                          <Alert>
                            <HelpCircle className="h-4 w-4" />
                            <AlertTitle>Chart not rendering</AlertTitle>
                            <AlertDescription>
                              <strong>Problem:</strong> Chart appears blank or shows error
                              <br />
                              <strong>Solution:</strong> Verify that you've selected appropriate columns for X and Y
                              axes. Ensure data types are compatible with the chart type.
                            </AlertDescription>
                          </Alert>

                          <Alert>
                            <HelpCircle className="h-4 w-4" />
                            <AlertTitle>Performance issues with large datasets</AlertTitle>
                            <AlertDescription>
                              <strong>Problem:</strong> Slow rendering or browser freezing
                              <br />
                              <strong>Solution:</strong> Use data sampling options to limit the number of data points.
                              Adjust the "Data Percentage" and "Maximum Data Points" settings.
                            </AlertDescription>
                          </Alert>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="font-semibold mb-3">Machine Learning Issues</h3>
                        <div className="space-y-4">
                          <Alert>
                            <HelpCircle className="h-4 w-4" />
                            <AlertTitle>Model training fails</AlertTitle>
                            <AlertDescription>
                              <strong>Problem:</strong> "Training failed" or poor model performance
                              <br />
                              <strong>Solution:</strong> Ensure you have sufficient data (minimum 10 samples), check for
                              missing values, and verify feature-target relationships.
                            </AlertDescription>
                          </Alert>

                          <Alert>
                            <HelpCircle className="h-4 w-4" />
                            <AlertTitle>Prediction errors</AlertTitle>
                            <AlertDescription>
                              <strong>Problem:</strong> Unexpected prediction results
                              <br />
                              <strong>Solution:</strong> Verify input data format matches training data. Check for data
                              scaling and preprocessing consistency.
                            </AlertDescription>
                          </Alert>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSubsection === "performance" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Optimization</CardTitle>
                    <CardDescription>Tips and techniques for optimal performance</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold">Data Handling Best Practices</h3>
                      <ul className="space-y-2 text-sm">
                        <li>
                          • <strong>File Size:</strong> Keep files under 50MB for optimal performance
                        </li>
                        <li>
                          • <strong>Data Sampling:</strong> Use sampling for datasets with {">"}10,000 rows
                        </li>
                        <li>
                          • <strong>Column Selection:</strong> Remove unnecessary columns before processing
                        </li>
                        <li>
                          • <strong>Data Types:</strong> Ensure proper data type detection for efficiency
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Visualization Performance</h3>
                      <CodeBlock
                        id="viz-performance"
                        code={`// Optimize chart rendering
const optimizeChartData = (data: any[], maxPoints: number = 1000) => {
  if (data.length <= maxPoints) return data
  
  // Use intelligent sampling
  const step = Math.floor(data.length / maxPoints)
  return data.filter((_, index) => index % step === 0)
}

// Debounce chart updates
const debouncedUpdate = useMemo(
  () => debounce((config) => updateChart(config), 300),
  []
)`}
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Memory Management</h3>
                      <ul className="space-y-2 text-sm">
                        <li>• Clear unused data from memory when switching datasets</li>
                        <li>• Use pagination for large data tables</li>
                        <li>• Implement virtual scrolling for long lists</li>
                        <li>• Monitor browser memory usage in DevTools</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSubsection === "faq" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Frequently Asked Questions</CardTitle>
                    <CardDescription>Common questions and answers about the platform</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-semibold mb-2">What file formats are supported?</h3>
                        <p className="text-sm text-muted-foreground">
                          The platform supports CSV, Excel (.xlsx, .xls), and JSON files. Files should be under 50MB for
                          optimal performance.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Can I save my work?</h3>
                        <p className="text-sm text-muted-foreground">
                          Currently, the platform stores data in browser memory. You can export processed data, trained
                          models, and charts. Future versions will include cloud storage and project saving
                          capabilities.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Is my data secure?</h3>
                        <p className="text-sm text-muted-foreground">
                          All data processing happens locally in your browser. No data is sent to external servers
                          unless you explicitly choose to export or share it.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">What browsers are supported?</h3>
                        <p className="text-sm text-muted-foreground">
                          The platform works best on modern browsers: Chrome 90+, Firefox 88+, Safari 14+, and Edge 90+.
                          JavaScript must be enabled.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">How accurate are the ML models?</h3>
                        <p className="text-sm text-muted-foreground">
                          Model accuracy depends on your data quality and size. The platform provides simplified
                          implementations suitable for educational purposes and basic analysis. For production use,
                          consider more sophisticated ML libraries.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Can I customize the interface?</h3>
                        <p className="text-sm text-muted-foreground">
                          The platform uses Tailwind CSS and shadcn/ui components, making it highly customizable. You
                          can modify colors, fonts, and layouts by editing the configuration files. The design system
                          supports both light and dark themes.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">How do I report bugs or request features?</h3>
                        <p className="text-sm text-muted-foreground">
                          Please use the GitHub repository's issue tracker to report bugs or request new features.
                          Include detailed steps to reproduce any issues and your browser/system information.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Is there an API for programmatic access?</h3>
                        <p className="text-sm text-muted-foreground">
                          Currently, the platform is designed as a web application. However, the core data processing
                          and ML functions can be extracted and used as standalone modules in your own projects.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Navigation Footer */}
          <div className="flex justify-between items-center pt-8 border-t">
            <div>
              {navigationHistory.length > 1 && (
                <Button variant="outline" onClick={goBack}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
              <Button variant="ghost" size="sm" onClick={() => window.open("https://github.com/your-repo", "_blank")}>
                <ExternalLink className="h-4 w-4 mr-2" />
                GitHub
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
\
export default DocsPage
