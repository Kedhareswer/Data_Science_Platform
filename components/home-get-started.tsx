"use client"

import { useRouter } from "next/navigation"
import { FileUpload } from "@/components/file-upload"

/** Upload widget on the landing page; opens the notebook once data is loaded. */
export function HomeGetStarted() {
  const router = useRouter()
  return <FileUpload onLoaded={() => router.push("/notebook")} />
}
