import type { NextConfig } from "next"
import { DEFAULT_PYODIDE_INDEX_URL } from "./lib/python/protocol"

const isDev = process.env.NODE_ENV !== "production"
const pyodideIndexUrl = process.env.NEXT_PUBLIC_PYODIDE_INDEX_URL || DEFAULT_PYODIDE_INDEX_URL
// A relative URL (e.g. "/pyodide/") means Pyodide is self-hosted on this origin.
const pyodideOrigin = pyodideIndexUrl.startsWith("/") ? "" : new URL(pyodideIndexUrl).origin

/**
 * Content-Security-Policy. Everything is same-origin except the Pyodide runtime
 * (script + wasm + package downloads) and PyPI (micropip installs). Because the
 * Python worker inherits this policy, code in an imported notebook cannot send
 * data to arbitrary hosts.
 */
const csp = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; Pyodide compiles WebAssembly.
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' ${isDev ? "'unsafe-eval'" : ""} ${pyodideOrigin}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${pyodideOrigin} https://pypi.org https://files.pythonhosted.org ${isDev ? "ws:" : ""}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
]
  .map((d) => d.replace(/\s+/g, " ").trim())
  .join("; ")

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
}

export default nextConfig
