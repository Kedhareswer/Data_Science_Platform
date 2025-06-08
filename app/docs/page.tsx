"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  ChevronRight,
  ChevronLeft,
  Home,
  Search,
  Database,
  Zap,
  FileText,
  HelpCircle,
  ExternalLink,
  ArrowLeft,
  Navigation,
  Bookmark,
  Copy,
  Check,
  Brain,
  Clock,
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
  const [activeSection, setActiveSection] = useState("getting-started")
  const [activeSubsection, setActiveSubsection] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [navigationHistory, setNavigationHistory] = useState<NavigationHistory[]>([])
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [navSidebarOpen, setNavSidebarOpen] = useState(false)

  // Documentation sections structure - focused on DataNotebook
  const docSections: DocSection[] = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: <Home className="h-4 w-4" />,
      description: "Introduction to DataNotebook and quick start guide",
      subsections: [
        { id: "overview", title: "What is DataNotebook?", description: "Introduction to the notebook interface" },
        { id: "interface", title: "Interface Overview", description: "Understanding the notebook layout" },
        { id: "first-steps", title: "Your First Analysis", description: "Step-by-step tutorial" },
        { id: "best-practices", title: "Best Practices", description: "Tips for effective data analysis" },
      ],
    },
    {
      id: "data-import",
      title: "Data Import & Loading",
      icon: <Database className="h-4 w-4" />,
      description: "Import data from various sources and formats",
      subsections: [
        { id: "file-upload", title: "File Upload", description: "Upload CSV, Excel, and JSON files" },
        { id: "data-formats", title: "Supported Formats", description: "File types and data structures" },
        { id: "data-preview", title: "Data Preview", description: "Inspect and validate imported data" },
        { id: "large-datasets", title: "Large Datasets", description: "Handling big data efficiently" },
      ],
    },
    {
      id: "ml-features",
      title: "Machine Learning Features",
      icon: <Brain className="h-4 w-4" />,
      description: "Information about upcoming machine learning capabilities",
      subsections: [
        { id: "ml-roadmap", title: "ML Feature Roadmap", description: "Planned ML features and timeline" },
        { id: "ml-status", title: "Development Status", description: "Current status of ML implementation" },
      ],
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      icon: <HelpCircle className="h-4 w-4" />,
      description: "Common issues and solutions",
      subsections: [
        { id: "common-errors", title: "Common Errors", description: "Frequently encountered issues" },
        { id: "performance-tips", title: "Performance Tips", description: "Optimize notebook performance" },
        { id: "faq", title: "FAQ", description: "Frequently asked questions" },
      ],
    },
  ]

  // Navigate to section/subsection
  const navigateToSection = (sectionId: string, subsectionId?: string) => {
    const section = docSections.find((s) => s.id === sectionId)
    const subsection = section?.subsections?.find((sub) => sub.id === subsectionId)

    const title = subsection?.title || section?.title || "Documentation"
    const subtitle = subsection ? section?.title : undefined

    navigateTo("/docs", title, {
      sectionId,
      subsectionId,
      section: "docs",
      subsection: subsectionId || sectionId,
      subtitle
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
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigateToSection("getting-started")}
        className="p-0 h-auto font-normal"
      >
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

      <div className={`transition-all duration-200 ${navSidebarOpen ? "ml-80" : ""}`}>
        <NavigationBreadcrumb />

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
            
            {/* ML Features Section */}
            {activeSection === "ml-features" && (
              <div className="space-y-6">
                {(!activeSubsection || activeSubsection === "ml-roadmap") && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Brain className="h-5 w-5 mr-2" />
                        ML Feature Roadmap
                      </CardTitle>
                      <CardDescription>
                        Planned machine learning capabilities and development timeline
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Alert className="bg-yellow-50 border-yellow-200">
                        <Zap className="h-4 w-4 text-yellow-600" />
                        <AlertTitle>Coming Soon</AlertTitle>
                        <AlertDescription className="text-yellow-700">
                          Machine learning features are currently under active development and will be available in an upcoming release.
                        </AlertDescription>
                      </Alert>
                      
                      <p>
                        We're working hard to bring powerful machine learning capabilities to DataNotebook. Our ML features
                        are designed to make advanced analytics accessible to users of all skill levels.
                      </p>
                      
                      <h3 className="font-semibold text-lg mt-6">Planned ML Features</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">ML Model Training</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">
                              Train various machine learning models on your data with customizable parameters and evaluation metrics.
                            </p>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">AutoML</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">
                              Automatically train and compare multiple ML models to find the best performer for your specific dataset.
                            </p>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">ML Prediction</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">
                              Make predictions on new data using your trained models with easy-to-use interfaces.
                            </p>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Model Insights</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">
                              Understand your models with feature importance, partial dependence plots, and other interpretability tools.
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {activeSubsection === "ml-status" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <HelpCircle className="h-5 w-5 mr-2" />
                        Development Status
                      </CardTitle>
                      <CardDescription>
                        Current status of machine learning implementation
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Alert className="bg-yellow-50 border-yellow-200">
                        <Zap className="h-4 w-4 text-yellow-600" />
                        <AlertTitle>Under Development</AlertTitle>
                        <AlertDescription className="text-yellow-700">
                          Our ML features are currently under active development and temporarily unavailable.
                        </AlertDescription>
                      </Alert>
                      
                      <p>
                        We're working on implementing robust machine learning capabilities that will allow you to train models,
                        make predictions, and gain insights from your data. These features will be available in an upcoming release.
                      </p>
                      
                      <h3 className="font-semibold text-lg mt-6">Development Timeline</h3>
                      <div className="space-y-4 mt-3">
                        <div className="flex items-start gap-3 p-3 border rounded-lg">
                          <div className="bg-green-100 text-green-700 p-2 rounded-full">
                            <Check className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="font-medium">Phase 1: Architecture Design</h4>
                            <p className="text-sm text-muted-foreground mt-1">Completed</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3 p-3 border rounded-lg">
                          <div className="bg-blue-100 text-blue-700 p-2 rounded-full">
                            <ArrowLeft className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="font-medium">Phase 2: Core Implementation</h4>
                            <p className="text-sm text-muted-foreground mt-1">In Progress</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3 p-3 border rounded-lg opacity-60">
                          <div className="bg-gray-100 text-gray-700 p-2 rounded-full">
                            <Clock className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="font-medium">Phase 3: Testing & Optimization</h4>
                            <p className="text-sm text-muted-foreground mt-1">Upcoming</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3 p-3 border rounded-lg opacity-60">
                          <div className="bg-gray-100 text-gray-700 p-2 rounded-full">
                            <Clock className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="font-medium">Phase 4: Release</h4>
                            <p className="text-sm text-muted-foreground mt-1">Upcoming</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Getting Started Section */}
            {activeSection === "getting-started" && (
              <div className="space-y-6">
                {(!activeSubsection || activeSubsection === "overview") && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Home className="h-5 w-5 mr-2" />
                        What is DataNotebook?
                      </CardTitle>
                      <CardDescription>
                        A powerful, interactive data analysis environment for exploring, visualizing, and modeling data
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p>
                        DataNotebook is an intuitive, web-based data analysis platform that combines the flexibility of
                        Jupyter notebooks with the power of modern web technologies. It provides a seamless environment
                        for data scientists, analysts, and researchers to import, explore, visualize, and model data
                        without any setup or installation requirements.
                      </p>

                      <Alert>
                        <Zap className="h-4 w-4" />
                        <AlertTitle>Key Capabilities</AlertTitle>
                        <AlertDescription>
                          Import data from multiple formats, perform advanced data manipulation, create interactive
                          visualizations, train machine learning models, and document your analysis - all in one place.
                        </AlertDescription>
                      </Alert>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">No Setup Required</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">
                              Start analyzing data immediately in your browser. No software installation, environment
                              setup, or configuration needed.
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Interactive Analysis</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">
                              Combine code, visualizations, and documentation in a single, interactive notebook
                              interface.
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Built-in ML</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">
                              Train and evaluate machine learning models with built-in algorithms and automated model
                              comparison.
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Rich Visualizations</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">
                              Create professional charts and graphs with 12+ visualization types and extensive
                              customization options.
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold">Perfect For</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-4 border rounded-lg">
                            <div className="text-2xl mb-2">📊</div>
                            <h4 className="font-medium">Data Analysis</h4>
                            <p className="text-sm text-muted-foreground">Explore and understand your data</p>
                          </div>
                          <div className="text-center p-4 border rounded-lg">
                            <div className="text-2xl mb-2">🤖</div>
                            <h4 className="font-medium">Machine Learning</h4>
                            <p className="text-sm text-muted-foreground">Build predictive models</p>
                          </div>
                          <div className="text-center p-4 border rounded-lg">
                            <div className="text-2xl mb-2">📈</div>
                            <h4 className="font-medium">Business Intelligence</h4>
                            <p className="text-sm text-muted-foreground">Generate insights and reports</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activeSubsection === "interface" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Interface Overview</CardTitle>
                      <CardDescription>Understanding the DataNotebook layout and components</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="font-semibold">Main Components</h3>

                        <div className="grid grid-cols-1 gap-6">
                          <div className="border rounded-lg p-4">
                            <h4 className="font-medium mb-2">📋 Notebook Canvas</h4>
                            <p className="text-sm text-muted-foreground mb-3">
                              The main workspace where you create and organize cells containing code, text, and
                              visualizations.
                            </p>
                            <ul className="text-sm space-y-1">
                              <li>• Add cells with the + button</li>
                              <li>• Drag and drop to reorder cells</li>
                              <li>• Execute cells with Shift+Enter</li>
                              <li>• Delete cells with the trash icon</li>
                            </ul>
                          </div>

                          <div className="border rounded-lg p-4">
                            <h4 className="font-medium mb-2">🗂️ Data Panel</h4>
                            <p className="text-sm text-muted-foreground mb-3">
                              Upload and manage your datasets. View data previews and column information.
                            </p>
                            <ul className="text-sm space-y-1">
                              <li>• Drag files to upload or click to browse</li>
                              <li>• Preview data structure and types</li>
                              <li>• Access data profiling information</li>
                              <li>• Switch between multiple datasets</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold">Navigation Tips</h3>
                        <div className="bg-muted p-4 rounded-lg">
                          <ul className="space-y-2 text-sm">
                            <li>• Use the sidebar to switch between different tools and panels</li>
                            <li>• The breadcrumb navigation shows your current location</li>
                            <li>• Access help and documentation from the top navigation bar</li>
                            <li>• Use keyboard shortcuts for faster navigation</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activeSubsection === "first-steps" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Your First Analysis</CardTitle>
                      <CardDescription>Step-by-step tutorial to get started with DataNotebook</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <Alert>
                        <FileText className="h-4 w-4" />
                        <AlertTitle>Tutorial Overview</AlertTitle>
                        <AlertDescription>
                          This tutorial will guide you through importing data, creating visualizations, and training a
                          simple machine learning model.
                        </AlertDescription>
                      </Alert>

                      <div className="space-y-6">
                        <div className="border-l-4 border-blue-500 pl-4">
                          <h4 className="font-medium mb-2">Step 1: Import Your Data</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            Start by uploading a dataset. For this tutorial, we'll use a sample sales dataset.
                          </p>
                          <CodeBlock
                            id="step1-import"
                            code={`# Sample data structure
Date,Product,Sales,Region
2024-01-01,Widget A,1200,North
2024-01-01,Widget B,800,South
2024-01-02,Widget A,1100,North
...`}
                            language="csv"
                          />
                          <div className="mt-2 text-sm">
                            <strong>Action:</strong> Click "Upload Data" and select your CSV file, or use our sample
                            dataset.
                          </div>
                        </div>

                        <div className="border-l-4 border-green-500 pl-4">
                          <h4 className="font-medium mb-2">Step 2: Explore Your Data</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            Once uploaded, examine the data structure and basic statistics.
                          </p>
                          <ul className="text-sm space-y-1">
                            <li>• Check the data preview table</li>
                            <li>• Review column types and missing values</li>
                            <li>• Look at the data profiling summary</li>
                            <li>• Identify potential data quality issues</li>
                          </ul>
                        </div>
                      </div>

                      <Alert>
                        <Zap className="h-4 w-4" />
                        <AlertTitle>Congratulations!</AlertTitle>
                        <AlertDescription>
                          You've completed your first data analysis in DataNotebook. Explore the other sections to learn
                          about advanced features and capabilities.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Troubleshooting Section */}
            {activeSection === "troubleshooting" && (
              <div className="space-y-6">
                {(!activeSubsection || activeSubsection === "common-errors") && (
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
                                <strong>Problem:</strong> File size exceeds maximum limit
                                <br />
                                <strong>Solution:</strong> The platform supports files up to 50MB. For larger files,
                                consider splitting the data or using data sampling.
                              </AlertDescription>
                            </Alert>

                            <Alert>
                              <HelpCircle className="h-4 w-4" />
                              <AlertTitle>Unsupported file format</AlertTitle>
                              <AlertDescription>
                                <strong>Problem:</strong> File format not supported
                                <br />
                                <strong>Solution:</strong> Ensure your file is in CSV, Excel (.xlsx, .xls), or JSON
                                format. Convert other formats using spreadsheet software.
                              </AlertDescription>
                            </Alert>
                          </div>
                        </div>
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
                            The platform supports CSV, Excel (.xlsx, .xls), and JSON files. Files should be under 50MB
                            for optimal performance.
                          </p>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">Can I save my work?</h3>
                          <p className="text-sm text-muted-foreground">
                            Currently, the platform stores data in browser memory. You can export processed data,
                            trained models, and charts. Future versions will include cloud storage and project saving
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
    </div>
  )
}

export default DocsPage
