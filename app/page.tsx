import Link from "next/link"
import {
  BarChart3,
  Brain,
  ChevronRight,
  Code2,
  LayoutDashboard,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react"
import { HomeGetStarted } from "@/components/home-get-started"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { Button } from "@/components/ui/button"

const FEATURES = [
  {
    icon: ScanSearch,
    title: "Profile in a click",
    text: "Column statistics, quartiles, skew, outliers, correlations and data-quality warnings for CSV, TSV, JSON and Excel files.",
  },
  {
    icon: Wand2,
    title: "Replayable cleaning",
    text: "Build a preprocessing pipeline — filters, imputation, encoding, scaling — and export it as pandas code.",
  },
  {
    icon: BarChart3,
    title: "Interactive charts",
    text: "Bar, line, area, scatter, pie, histogram and box plots with aggregation, grouping and PNG export.",
  },
  {
    icon: Code2,
    title: "Real Python",
    text: "pandas, numpy, scikit-learn and matplotlib run in your browser via Pyodide — your dataset is ready as df.",
  },
  {
    icon: Brain,
    title: "Machine learning",
    text: "Train, compare and use models with honest held-out metrics, feature importance and AutoML.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboards",
    text: "Turn your analysis into a filterable dashboard of metrics, charts and tables.",
  },
] as const

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <section className="border-b bg-gradient-to-b from-background to-muted/40">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1fr_480px]">
            <div className="space-y-6">
              <p className="inline-flex items-center gap-2 rounded-full border border-dashed px-3 py-1 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" aria-hidden /> Runs 100% in your browser
              </p>
              <h1 className="font-handwritten-bold text-4xl tracking-tight sm:text-5xl xl:text-6xl">
                Where data meets creativity <span className="text-muted-foreground">(and a little laziness)</span>
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground">
                A whimsical, handwritten-style notebook for exploring data. Upload a file, then stack cells to profile,
                clean, chart, code in Python and train models — no server, no sign-up.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/notebook" className="group">
                    Open the notebook
                    <ChevronRight className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/docs">Read the docs</Link>
                </Button>
              </div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4" aria-hidden /> Files are parsed locally and saved only in this
                browser&apos;s storage.
              </p>
            </div>
            <div className="sketch-card p-4 shadow-sm">
              <HomeGetStarted />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6" aria-labelledby="features-heading">
          <h2 id="features-heading" className="font-handwritten-bold text-center text-3xl">
            Everything in one notebook
          </h2>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="sketch-card p-6 transition-transform hover:-rotate-[0.4deg]">
                <Icon className="mb-3 h-7 w-7" aria-hidden />
                <h3 className="text-xl">{title}</h3>
                <p className="mt-2 text-muted-foreground">{text}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
