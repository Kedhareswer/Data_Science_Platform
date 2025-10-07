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
  Home,
  Search,
  FileText,
  Shield,
  Users,
  AlertTriangle,
  Scale,
  Clock,
  Mail,
  ArrowLeft,
} from "lucide-react"
import { NavigationBreadcrumb } from "@/components/navigation-breadcrumb"
import { NavigationSidebar } from "@/components/navigation-sidebar"
import { useNavigation } from "@/lib/navigation-context"

interface TermsSection {
  id: string
  title: string
  icon: React.ReactNode
  description: string
  subsections?: TermsSubsection[]
}

interface TermsSubsection {
  id: string
  title: string
  description: string
}

const TermsPage = () => {
  const { navigateTo } = useNavigation()
  const [activeSection, setActiveSection] = useState("overview")
  const [activeSubsection, setActiveSubsection] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [navSidebarOpen, setNavSidebarOpen] = useState(false)

  // Terms sections structure
  const termsSections: TermsSection[] = [
    {
      id: "overview",
      title: "Overview",
      icon: <Home className="h-4 w-4" />,
      description: "Introduction and acceptance of terms",
      subsections: [
        { id: "acceptance", title: "Acceptance of Terms", description: "Agreement to these terms" },
        { id: "changes", title: "Changes to Terms", description: "How we update these terms" },
        { id: "definitions", title: "Definitions", description: "Key terms and meanings" },
      ],
    },
    {
      id: "service",
      title: "Service Description",
      icon: <FileText className="h-4 w-4" />,
      description: "What DataNotebook provides and service scope",
      subsections: [
        { id: "platform", title: "Platform Description", description: "Overview of our services" },
        { id: "features", title: "Features & Functionality", description: "Available tools and capabilities" },
        { id: "availability", title: "Service Availability", description: "Uptime and maintenance" },
      ],
    },
    {
      id: "usage",
      title: "Acceptable Use",
      icon: <Users className="h-4 w-4" />,
      description: "Guidelines for proper use of the platform",
      subsections: [
        { id: "permitted", title: "Permitted Uses", description: "Allowed activities and use cases" },
        { id: "prohibited", title: "Prohibited Activities", description: "Forbidden uses and violations" },
        { id: "compliance", title: "Compliance Requirements", description: "Legal and regulatory compliance" },
      ],
    },
    {
      id: "data",
      title: "Data & Privacy",
      icon: <Shield className="h-4 w-4" />,
      description: "How we handle your data and protect privacy",
      subsections: [
        { id: "collection", title: "Data Collection", description: "What data we collect" },
        { id: "processing", title: "Data Processing", description: "How we use your data" },
        { id: "security", title: "Data Security", description: "Protection measures" },
      ],
    },
    {
      id: "liability",
      title: "Liability & Disclaimers",
      icon: <AlertTriangle className="h-4 w-4" />,
      description: "Limitations of liability and disclaimers",
      subsections: [
        { id: "warranties", title: "Warranties", description: "Service warranties and disclaimers" },
        { id: "limitations", title: "Liability Limitations", description: "Limits on our liability" },
        { id: "indemnification", title: "Indemnification", description: "User responsibilities" },
      ],
    },
    {
      id: "legal",
      title: "Legal Terms",
      icon: <Scale className="h-4 w-4" />,
      description: "Governing law and dispute resolution",
      subsections: [
        { id: "governing-law", title: "Governing Law", description: "Applicable jurisdiction" },
        { id: "disputes", title: "Dispute Resolution", description: "How disputes are handled" },
        { id: "termination", title: "Termination", description: "Account termination conditions" },
      ],
    },
  ]

  // Navigate to section/subsection
  const navigateToSection = (sectionId: string, subsectionId?: string) => {
    const section = termsSections.find((s) => s.id === sectionId)
    const subsection = section?.subsections?.find((sub) => sub.id === subsectionId)

    const title = subsection?.title || section?.title || "Terms of Service"
    const subtitle = subsection ? section?.title : undefined

    navigateTo("/terms", title, {
      sectionId,
      subsectionId,
      section: "terms",
      subsection: subsectionId || sectionId,
      subtitle
    })

    setActiveSection(sectionId)
    setActiveSubsection(subsectionId || null)
  }

  // Filter sections based on search
  const filteredSections = termsSections.filter(
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
  const currentSection = termsSections.find((s) => s.id === activeSection)
  const currentSubsection = currentSection?.subsections?.find((sub) => sub.id === activeSubsection)

  // Breadcrumb component
  const Breadcrumb = () => (
    <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigateToSection("overview")}
        className="p-0 h-auto font-normal"
      >
        <Home className="h-3 w-3 mr-1" />
        Terms
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
                <CardTitle className="text-lg">Terms of Service</CardTitle>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search terms..."
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
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Breadcrumb />
            
            {/* Overview Section */}
            {activeSection === "overview" && (
              <div className="space-y-6">
                {(!activeSubsection || activeSubsection === "acceptance") && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Home className="h-5 w-5 mr-2" />
                        Terms of Service
                      </CardTitle>
                      <CardDescription>
                        Last updated: {new Date().toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Alert>
                        <FileText className="h-4 w-4" />
                        <AlertTitle>Agreement to Terms</AlertTitle>
                        <AlertDescription>
                          By accessing and using DataNotebook, you accept and agree to be bound by the terms and provision of this agreement.
                        </AlertDescription>
                      </Alert>
                      
                      <p>
                        Welcome to DataNotebook. These Terms of Service ("Terms") govern your use of our web-based data analysis platform 
                        and related services (collectively, the "Service") operated by DataNotebook ("us", "we", or "our").
                      </p>
                      
                      <p>
                        Please read these Terms carefully before using our Service. Your access to and use of the Service is conditioned 
                        on your acceptance of and compliance with these Terms. These Terms apply to all visitors, users and others who 
                        access or use the Service.
                      </p>

                      <div className="bg-muted p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">Key Points</h3>
                        <ul className="space-y-1 text-sm">
                          <li>• You must be at least 18 years old to use our Service</li>
                          <li>• You are responsible for maintaining the confidentiality of your account</li>
                          <li>• You agree to use the Service in compliance with all applicable laws</li>
                          <li>• We reserve the right to terminate accounts that violate these terms</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activeSubsection === "changes" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Clock className="h-5 w-5 mr-2" />
                        Changes to Terms
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p>
                        We reserve the right, at our sole discretion, to modify or replace these Terms at any time. 
                        If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect.
                      </p>
                      
                      <Alert>
                        <Mail className="h-4 w-4" />
                        <AlertTitle>Notification Process</AlertTitle>
                        <AlertDescription>
                          We will notify users of significant changes via email and through prominent notices on our platform.
                        </AlertDescription>
                      </Alert>

                      <p>
                        What constitutes a material change will be determined at our sole discretion. Your continued use of the Service 
                        after we post any modifications to the Terms on this page will constitute your acknowledgment of the modifications 
                        and your consent to abide and be bound by the modified Terms.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Service Description Section */}
            {activeSection === "service" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Service Description
                    </CardTitle>
                    <CardDescription>
                      Understanding what DataNotebook provides
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p>
                      DataNotebook is a web-based data analysis platform that provides tools for data import, exploration, 
                      visualization, and machine learning. Our Service includes:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Data Processing</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            Upload, clean, and transform data from various sources including CSV, Excel, and JSON files.
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Interactive Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            Create interactive notebooks with code cells, visualizations, and documentation.
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Visualization Tools</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            Generate charts, graphs, and interactive visualizations to explore your data.
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Machine Learning</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            Train and deploy machine learning models with built-in algorithms and evaluation tools.
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    <Alert>
                      <Shield className="h-4 w-4" />
                      <AlertTitle>Service Availability</AlertTitle>
                      <AlertDescription>
                        We strive to maintain 99.9% uptime but cannot guarantee uninterrupted service. 
                        Scheduled maintenance will be announced in advance.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Acceptable Use Section */}
            {activeSection === "usage" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Acceptable Use Policy
                    </CardTitle>
                    <CardDescription>
                      Guidelines for proper use of DataNotebook
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-green-600 mb-3">✓ Permitted Uses</h3>
                      <ul className="space-y-2 text-sm">
                        <li>• Legitimate data analysis and research activities</li>
                        <li>• Educational and academic purposes</li>
                        <li>• Business intelligence and reporting</li>
                        <li>• Machine learning model development and testing</li>
                        <li>• Collaborative data science projects</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold text-red-600 mb-3">✗ Prohibited Activities</h3>
                      <ul className="space-y-2 text-sm">
                        <li>• Processing illegal, harmful, or malicious content</li>
                        <li>• Attempting to gain unauthorized access to our systems</li>
                        <li>• Uploading viruses, malware, or other harmful code</li>
                        <li>• Violating intellectual property rights</li>
                        <li>• Using the service for cryptocurrency mining</li>
                        <li>• Excessive resource consumption that impacts other users</li>
                      </ul>
                    </div>

                    <Alert className="border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertTitle className="text-red-800">Violation Consequences</AlertTitle>
                      <AlertDescription className="text-red-700">
                        Violations may result in immediate account suspension or termination without notice.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Contact Information */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="h-5 w-5 mr-2" />
                  Contact Us
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  If you have any questions about these Terms of Service, please contact us at{" "}
                  <a href="mailto:legal@datanotebook.com" className="text-primary hover:underline">
                    legal@datanotebook.com
                  </a>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TermsPage
