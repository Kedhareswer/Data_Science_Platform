"use client"

import { NavigationBreadcrumb } from "@/components/navigation-breadcrumb"
import { NavigationSidebar } from "@/components/navigation-sidebar"
import { useNavigation } from "@/lib/navigation-context"
import { useState } from "react"

export default function DashboardCreatorPage() {
  const { navigateTo } = useNavigation()
  const [navSidebarOpen, setNavSidebarOpen] = useState(false)

  return (
    <div className="container mx-auto py-6">
      <NavigationSidebar isOpen={navSidebarOpen} onToggle={() => setNavSidebarOpen(!navSidebarOpen)} />

      <div className={`transition-all duration-200 ${navSidebarOpen ? "ml-80" : ""}`}>
        <NavigationBreadcrumb />
        {/* Rest of the existing content */}
      </div>
    </div>
  )
}
