import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { DataProvider } from "@/lib/data-context"
import { NavigationProvider } from "@/lib/navigation-context"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Data Analysis Platform",
  description: "A comprehensive platform for data analysis and visualization with a soothing handwritten aesthetic",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} font-handwritten`}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <NavigationProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <DataProvider>
              {children}
              <Toaster />
            </DataProvider>
          </ThemeProvider>
        </NavigationProvider>
      </body>
    </html>
  )
}
