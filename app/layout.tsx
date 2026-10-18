import type { Metadata, Viewport } from "next"
import { Fira_Code, Kalam } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { DataProvider } from "@/lib/data-context"

const kalam = Kalam({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-kalam",
  display: "swap",
})

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "DataNotebook",
    template: "%s · DataNotebook",
  },
  description:
    "A whimsical, handwritten-style data analysis notebook. Upload data, profile it, visualize it, run Python and train ML models — entirely in your browser.",
  applicationName: "DataNotebook",
  keywords: ["data analysis", "notebook", "visualization", "machine learning", "pyodide", "pandas"],
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfbf8" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f0f" },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${kalam.variable} ${firaCode.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
            <DataProvider>
              {children}
              <Toaster />
            </DataProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
