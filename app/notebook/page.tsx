import type { Metadata } from "next"
import { SiteHeader } from "@/components/layout/site-header"
import { NotebookView } from "@/components/notebook/notebook-view"

export const metadata: Metadata = {
  title: "Notebook",
  description: "Profile, clean, visualise, code and model your data — all in the browser.",
}

export default function NotebookPage() {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main id="main-content">
        <NotebookView />
      </main>
    </div>
  )
}
