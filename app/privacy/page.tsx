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
  Shield,
  Eye,
  Lock,
  Users,
  Globe,
  Settings,
  Trash2,
  Clock,
  Mail,
  Cookie,
  Database,
} from "lucide-react"
import { NavigationBreadcrumb } from "@/components/navigation-breadcrumb"
import { NavigationSidebar } from "@/components/navigation-sidebar"
import { useNavigation } from "@/lib/navigation-context"

interface PrivacySection {
  id: string
  title: string
  icon: React.ReactNode
  description: string
  subsections?: PrivacySubsection[]
}

interface PrivacySubsection {
  id: string
  title: string
  description: string
}

const PrivacyPage = () => {
  const { navigateTo } = useNavigation()
  const [activeSection, setActiveSection] = useState("overview")
  const [activeSubsection, setActiveSubsection] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [navSidebarOpen, setNavSidebarOpen] = useState(false)

  // Privacy sections structure
  const privacySections: PrivacySection[] = [
    {
      id: "overview",
      title: "Privacy Overview",
      icon: <Home className="h-4 w-4" />,
      description: "Introduction to our privacy practices",
      subsections: [
        { id: "commitment", title: "Our Commitment", description: "Our privacy philosophy" },
        { id: "scope", title: "Policy Scope", description: "What this policy covers" },
        { id: "updates", title: "Policy Updates", description: "How we handle changes" },
      ],
    },
    {
      id: "collection",
      title: "Data Collection",
      icon: <Database className="h-4 w-4" />,
      description: "What information we collect and how",
      subsections: [
        { id: "personal", title: "Personal Information", description: "Account and profile data" },
        { id: "usage", title: "Usage Data", description: "How you interact with our platform" },
        { id: "technical", title: "Technical Data", description: "Device and browser information" },
        { id: "uploaded", title: "Uploaded Data", description: "Data you upload for analysis" },
      ],
    },
    {
      id: "usage",
      title: "Data Usage",
      icon: <Eye className="h-4 w-4" />,
      description: "How we use your information",
      subsections: [
        { id: "service", title: "Service Provision", description: "Providing and improving our service" },
        { id: "communication", title: "Communications", description: "How we contact you" },
        { id: "analytics", title: "Analytics", description: "Understanding platform usage" },
        { id: "legal", title: "Legal Compliance", description: "Meeting legal obligations" },
      ],
    },
    {
      id: "sharing",
      title: "Data Sharing",
      icon: <Users className="h-4 w-4" />,
      description: "When and how we share information",
      subsections: [
        { id: "third-parties", title: "Third Parties", description: "Service providers and partners" },
        { id: "legal-requests", title: "Legal Requests", description: "Law enforcement and compliance" },
        { id: "business-transfers", title: "Business Transfers", description: "Mergers and acquisitions" },
      ],
    },
    {
      id: "security",
      title: "Data Security",
      icon: <Lock className="h-4 w-4" />,
      description: "How we protect your information",
      subsections: [
        { id: "measures", title: "Security Measures", description: "Technical and organizational safeguards" },
        { id: "encryption", title: "Encryption", description: "Data protection in transit and at rest" },
        { id: "access-controls", title: "Access Controls", description: "Who can access your data" },
        { id: "incidents", title: "Security Incidents", description: "Breach notification procedures" },
      ],
    },
    {
      id: "rights",
      title: "Your Rights",
      icon: <Settings className="h-4 w-4" />,
      description: "Your privacy rights and controls",
      subsections: [
        { id: "access", title: "Access Rights", description: "Viewing your data" },
        { id: "correction", title: "Correction Rights", description: "Updating your information" },
        { id: "deletion", title: "Deletion Rights", description: "Removing your data" },
        { id: "portability", title: "Data Portability", description: "Exporting your data" },
      ],
    },
    {
      id: "cookies",
      title: "Cookies & Tracking",
      icon: <Cookie className="h-4 w-4" />,
      description: "How we use cookies and similar technologies",
      subsections: [
        { id: "types", title: "Cookie Types", description: "Essential, functional, and analytics cookies" },
        { id: "management", title: "Cookie Management", description: "How to control cookies" },
        { id: "tracking", title: "Tracking Technologies", description: "Other tracking methods we use" },
      ],
    },
    {
      id: "international",
      title: "International Transfers",
      icon: <Globe className="h-4 w-4" />,
      description: "Cross-border data transfers",
      subsections: [
        { id: "transfers", title: "Data Transfers", description: "When we transfer data internationally" },
        { id: "safeguards", title: "Transfer Safeguards", description: "Protections for international transfers" },
      ],
    },
  ]

  // Navigate to section/subsection
  const navigateToSection = (sectionId: string, subsectionId?: string) => {
    const section = privacySections.find((s) => s.id === sectionId)
    const subsection = section?.subsections?.find((sub) => sub.id === subsectionId)

    const title = subsection?.title || section?.title || "Privacy Policy"
    const subtitle = subsection ? section?.title : undefined

    navigateTo("/privacy", title, {
      sectionId,
      subsectionId,
      section: "privacy",
      subsection: subsectionId || sectionId,
      subtitle
    })

    setActiveSection(sectionId)
    setActiveSubsection(subsectionId || null)
  }

  // Filter sections based on search
  const filteredSections = privacySections.filter(
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
  const currentSection = privacySections.find((s) => s.id === activeSection)
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
        Privacy
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
                <CardTitle className="text-lg">Privacy Policy</CardTitle>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search privacy..."
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
                {(!activeSubsection || activeSubsection === "commitment") && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Shield className="h-5 w-5 mr-2" />
                        Privacy Policy
                      </CardTitle>
                      <CardDescription>
                        Last updated: {new Date().toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Alert>
                        <Shield className="h-4 w-4" />
                        <AlertTitle>Our Privacy Commitment</AlertTitle>
                        <AlertDescription>
                          We are committed to protecting your privacy and being transparent about how we collect, use, and share your information.
                        </AlertDescription>
                      </Alert>
                      
                      <p>
                        At DataNotebook, we understand that privacy is fundamental to trust. This Privacy Policy explains how we collect, 
                        use, disclose, and safeguard your information when you use our data analysis platform and related services.
                      </p>
                      
                      <p>
                        We believe in giving you control over your data. This policy describes your privacy rights and how you can 
                        exercise them. We encourage you to read this policy carefully and contact us if you have any questions.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center">
                              <Lock className="h-4 w-4 mr-2" />
                              Data Protection
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">
                              We use industry-standard security measures to protect your personal information and uploaded data.
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center">
                              <Eye className="h-4 w-4 mr-2" />
                              Transparency
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">
                              We are transparent about what data we collect, how we use it, and who we share it with.
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center">
                              <Settings className="h-4 w-4 mr-2" />
                              Your Control
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">
                              You have control over your data with rights to access, correct, delete, and export your information.
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center">
                              <Globe className="h-4 w-4 mr-2" />
                              Global Compliance
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">
                              We comply with privacy laws including GDPR, CCPA, and other applicable data protection regulations.
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activeSubsection === "scope" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Eye className="h-5 w-5 mr-2" />
                        Policy Scope
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p>
                        This Privacy Policy applies to all information collected through our DataNotebook platform, 
                        including our website, web application, and any related services or features.
                      </p>

                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-green-600 mb-2">✓ Covered by this Policy</h4>
                          <ul className="space-y-1 text-sm ml-4">
                            <li>• DataNotebook web platform and services</li>
                            <li>• Account registration and profile information</li>
                            <li>• Data uploaded for analysis</li>
                            <li>• Usage analytics and platform interactions</li>
                            <li>• Communications with our support team</li>
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-medium text-orange-600 mb-2">⚠ Not Covered by this Policy</h4>
                          <ul className="space-y-1 text-sm ml-4">
                            <li>• Third-party websites linked from our platform</li>
                            <li>• External integrations you choose to connect</li>
                            <li>• Data processing by third-party tools you use independently</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Data Collection Section */}
            {activeSection === "collection" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Database className="h-5 w-5 mr-2" />
                      Information We Collect
                    </CardTitle>
                    <CardDescription>
                      Types of data we collect and how we collect it
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Personal Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="text-sm space-y-1">
                            <li>• Name and email address</li>
                            <li>• Account credentials</li>
                            <li>• Profile preferences</li>
                            <li>• Communication preferences</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Usage Data</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="text-sm space-y-1">
                            <li>• Platform interactions and clicks</li>
                            <li>• Feature usage patterns</li>
                            <li>• Session duration and frequency</li>
                            <li>• Error logs and performance data</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Technical Data</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="text-sm space-y-1">
                            <li>• IP address and location</li>
                            <li>• Browser type and version</li>
                            <li>• Device information</li>
                            <li>• Operating system</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Uploaded Data</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="text-sm space-y-1">
                            <li>• Files you upload for analysis</li>
                            <li>• Notebook content and code</li>
                            <li>• Visualizations and outputs</li>
                            <li>• Analysis results and models</li>
                          </ul>
                        </CardContent>
                      </Card>
                    </div>

                    <Alert>
                      <Lock className="h-4 w-4" />
                      <AlertTitle>Data Minimization</AlertTitle>
                      <AlertDescription>
                        We only collect information that is necessary to provide and improve our services. 
                        You can use DataNotebook without providing optional information.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Data Security Section */}
            {activeSection === "security" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Lock className="h-5 w-5 mr-2" />
                      Data Security
                    </CardTitle>
                    <CardDescription>
                      How we protect your information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p>
                      We implement comprehensive security measures to protect your personal information and uploaded data 
                      against unauthorized access, alteration, disclosure, or destruction.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Encryption</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="text-sm space-y-1">
                            <li>• TLS 1.3 for data in transit</li>
                            <li>• AES-256 encryption at rest</li>
                            <li>• Encrypted database storage</li>
                            <li>• Secure key management</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Access Controls</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="text-sm space-y-1">
                            <li>• Multi-factor authentication</li>
                            <li>• Role-based access control</li>
                            <li>• Regular access reviews</li>
                            <li>• Principle of least privilege</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Infrastructure</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="text-sm space-y-1">
                            <li>• SOC 2 compliant hosting</li>
                            <li>• Regular security audits</li>
                            <li>• Vulnerability scanning</li>
                            <li>• Incident response procedures</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Monitoring</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="text-sm space-y-1">
                            <li>• 24/7 security monitoring</li>
                            <li>• Automated threat detection</li>
                            <li>• Activity logging and auditing</li>
                            <li>• Real-time alerting</li>
                          </ul>
                        </CardContent>
                      </Card>
                    </div>

                    <Alert className="border-blue-200 bg-blue-50">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <AlertTitle className="text-blue-800">Security Certifications</AlertTitle>
                      <AlertDescription className="text-blue-700">
                        Our infrastructure meets industry standards including SOC 2 Type II, ISO 27001, and follows OWASP security guidelines.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Your Rights Section */}
            {activeSection === "rights" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Settings className="h-5 w-5 mr-2" />
                      Your Privacy Rights
                    </CardTitle>
                    <CardDescription>
                      Control over your personal information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p>
                      You have several rights regarding your personal information. These rights may vary depending on your location 
                      and applicable privacy laws such as GDPR or CCPA.
                    </p>

                    <div className="space-y-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center">
                            <Eye className="h-4 w-4 mr-2" />
                            Right to Access
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-2">
                            You can request a copy of the personal information we hold about you.
                          </p>
                          <Button variant="outline" size="sm">Request Data Export</Button>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center">
                            <Settings className="h-4 w-4 mr-2" />
                            Right to Correction
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-2">
                            You can update or correct inaccurate personal information in your account settings.
                          </p>
                          <Button variant="outline" size="sm">Update Profile</Button>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Right to Deletion
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-2">
                            You can request deletion of your personal information, subject to certain legal limitations.
                          </p>
                          <Button variant="outline" size="sm">Request Deletion</Button>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center">
                            <Database className="h-4 w-4 mr-2" />
                            Right to Portability
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-2">
                            You can export your data in a structured, machine-readable format.
                          </p>
                          <Button variant="outline" size="sm">Export Data</Button>
                        </CardContent>
                      </Card>
                    </div>

                    <Alert>
                      <Mail className="h-4 w-4" />
                      <AlertTitle>Exercise Your Rights</AlertTitle>
                      <AlertDescription>
                        To exercise any of these rights, contact us at{" "}
                        <a href="mailto:privacy@datanotebook.com" className="text-primary hover:underline">
                          privacy@datanotebook.com
                        </a>
                        {" "}or use the buttons above.
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
                  Privacy Contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  If you have any questions about this Privacy Policy or our privacy practices, please contact us:
                </p>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Email:</strong>{" "}
                    <a href="mailto:privacy@datanotebook.com" className="text-primary hover:underline">
                      privacy@datanotebook.com
                    </a>
                  </p>
                  <p>
                    <strong>Data Protection Officer:</strong>{" "}
                    <a href="mailto:dpo@datanotebook.com" className="text-primary hover:underline">
                      dpo@datanotebook.com
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPage
