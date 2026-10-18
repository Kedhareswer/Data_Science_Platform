import { redirect } from "next/navigation"

/** Legacy route — the dashboard builder now lives at /dashboard. */
export default function DashboardCreatorPage() {
  redirect("/dashboard")
}
