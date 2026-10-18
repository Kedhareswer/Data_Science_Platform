import { downloadText } from "@/lib/notebook"

const STYLE_PROPS = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-dasharray",
  "opacity",
  "font-family",
  "font-size",
  "font-weight",
  "text-anchor",
  "dominant-baseline",
  "visibility",
  "display",
] as const

export interface LegendEntry {
  label: string
  color: string
}

/** Resolve any CSS colour (including `var(--x)` / `color-mix`) to a concrete rgb() string. */
function resolveColor(color: string, host: HTMLElement): string {
  const probe = document.createElement("span")
  probe.style.color = color
  probe.style.display = "none"
  host.appendChild(probe)
  const resolved = getComputedStyle(probe).color
  probe.remove()
  return resolved || color
}

/** Pick the main chart surface (the largest SVG; legend icons are tiny SVGs too). */
function findChartSvg(container: HTMLElement): SVGSVGElement | null {
  let best: SVGSVGElement | null = null
  let bestArea = 0
  for (const svg of container.querySelectorAll("svg")) {
    const { width, height } = svg.getBoundingClientRect()
    if (width * height > bestArea) {
      best = svg
      bestArea = width * height
    }
  }
  return best
}

/** Clone an SVG with all computed presentation styles inlined (CSS variables resolved). */
function inlineSvg(svg: SVGSVGElement): { markup: string; width: number; height: number } {
  const { width, height } = svg.getBoundingClientRect()
  const clone = svg.cloneNode(true) as SVGSVGElement
  const sources = [svg, ...svg.querySelectorAll<SVGElement>("*")]
  const targets = [clone, ...clone.querySelectorAll<SVGElement>("*")]
  sources.forEach((source, i) => {
    const target = targets[i]
    if (!target) return
    const computed = getComputedStyle(source)
    for (const prop of STYLE_PROPS) {
      const value = computed.getPropertyValue(prop)
      if (value) target.style.setProperty(prop, value)
    }
  })
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  clone.setAttribute("width", String(width))
  clone.setAttribute("height", String(height))
  return { markup: new XMLSerializer().serializeToString(clone), width, height }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Could not render chart image"))
    image.src = src
  })
}

/**
 * Export the chart rendered inside `container` as a PNG download. The SVG is
 * serialized with resolved styles, painted onto a canvas over the card
 * background, and an optional legend / title is drawn alongside.
 */
export async function exportChartPng(
  container: HTMLElement,
  fileName: string,
  options: { title?: string; legend?: LegendEntry[]; scale?: number } = {},
): Promise<void> {
  const svg = findChartSvg(container)
  if (!svg) throw new Error("No chart to export")
  const { markup, width, height } = inlineSvg(svg)
  const scale = options.scale ?? Math.max(2, window.devicePixelRatio || 1)
  const legend = options.legend ?? []
  const titleHeight = options.title ? 36 : 0
  const legendHeight = legend.length ? 16 + Math.ceil(legend.length / 4) * 22 : 0
  const padding = 16

  const canvas = document.createElement("canvas")
  canvas.width = Math.ceil((width + padding * 2) * scale)
  canvas.height = Math.ceil((height + titleHeight + legendHeight + padding * 2) * scale)
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas is not available")
  ctx.scale(scale, scale)

  const background = resolveColor("var(--color-card)", container)
  const foreground = resolveColor("var(--color-card-foreground)", container)
  const font = getComputedStyle(container).fontFamily || "sans-serif"
  ctx.fillStyle = background
  ctx.fillRect(0, 0, width + padding * 2, height + titleHeight + legendHeight + padding * 2)

  if (options.title) {
    ctx.fillStyle = foreground
    ctx.font = `700 18px ${font}`
    ctx.textBaseline = "top"
    ctx.fillText(options.title, padding, padding)
  }

  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }))
  try {
    const image = await loadImage(url)
    ctx.drawImage(image, padding, padding + titleHeight, width, height)
  } finally {
    URL.revokeObjectURL(url)
  }

  if (legend.length) {
    ctx.font = `13px ${font}`
    ctx.textBaseline = "middle"
    const columnWidth = width / 4
    legend.forEach((entry, i) => {
      const x = padding + (i % 4) * columnWidth
      const y = padding + titleHeight + height + 16 + Math.floor(i / 4) * 22
      ctx.fillStyle = resolveColor(entry.color, container)
      ctx.fillRect(x, y - 6, 12, 12)
      ctx.fillStyle = foreground
      ctx.fillText(entry.label.length > 28 ? `${entry.label.slice(0, 27)}…` : entry.label, x + 18, y, columnWidth - 24)
    })
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
  if (!blob) throw new Error("Could not encode PNG")
  const href = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = href
  link.download = fileName.endsWith(".png") ? fileName : `${fileName}.png`
  link.click()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}

function csvField(value: unknown): string {
  if (value === null || value === undefined) return ""
  let text = typeof value === "number" && !Number.isFinite(value) ? "" : String(value)
  // Neutralise spreadsheet formulas (CSV injection) in text cells.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Serialize records to RFC 4180 CSV with the given header order. */
export function toCsv(headers: readonly string[], rows: ReadonlyArray<ReadonlyArray<unknown>>): string {
  return [headers.map(csvField).join(","), ...rows.map((row) => row.map(csvField).join(","))].join("\n")
}

export function downloadCsv(headers: readonly string[], rows: ReadonlyArray<ReadonlyArray<unknown>>, fileName: string) {
  downloadText(toCsv(headers, rows), fileName.endsWith(".csv") ? fileName : `${fileName}.csv`, "text/csv;charset=utf-8")
}
