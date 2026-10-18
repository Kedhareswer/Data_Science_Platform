import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Build an interactive dashboard of metrics, charts, tables and notes from your data.",
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
