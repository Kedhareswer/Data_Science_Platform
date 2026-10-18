export type MarkdownAction = "bold" | "italic" | "heading" | "list" | "code" | "link"

export interface TextEdit {
  text: string
  selectionStart: number
  selectionEnd: number
}

const WRAP: Partial<Record<MarkdownAction, { before: string; after: string; placeholder: string }>> = {
  bold: { before: "**", after: "**", placeholder: "bold text" },
  italic: { before: "_", after: "_", placeholder: "italic text" },
  code: { before: "`", after: "`", placeholder: "code" },
}

const LINE_PREFIX: Partial<Record<MarkdownAction, string>> = {
  heading: "## ",
  list: "- ",
}

/** Apply a formatting action to `text` at the given selection; returns the new text and selection. */
export function applyMarkdown(text: string, start: number, end: number, action: MarkdownAction): TextEdit {
  const selected = text.slice(start, end)

  const wrap = WRAP[action]
  if (wrap) {
    // Multi-line code selections become a fenced block.
    if (action === "code" && selected.includes("\n")) {
      const block = `\n\`\`\`python\n${selected}\n\`\`\`\n`
      return { text: text.slice(0, start) + block + text.slice(end), selectionStart: start + 11, selectionEnd: start + 11 + selected.length }
    }
    const inner = selected || wrap.placeholder
    const insert = `${wrap.before}${inner}${wrap.after}`
    const innerStart = start + wrap.before.length
    return { text: text.slice(0, start) + insert + text.slice(end), selectionStart: innerStart, selectionEnd: innerStart + inner.length }
  }

  const prefix = LINE_PREFIX[action]
  if (prefix) {
    const lineStart = text.lastIndexOf("\n", start - 1) + 1
    const block = text.slice(lineStart, end)
    const lines = block.split("\n")
    const allPrefixed = lines.every((line) => line.startsWith(prefix))
    const next = lines.map((line) => (allPrefixed ? line.slice(prefix.length) : prefix + line)).join("\n")
    const delta = next.length - block.length
    const firstDelta = allPrefixed ? -prefix.length : prefix.length
    return {
      text: text.slice(0, lineStart) + next + text.slice(end),
      selectionStart: Math.max(lineStart, start + firstDelta),
      selectionEnd: end + delta,
    }
  }

  // link
  const label = selected || "link text"
  const insert = `[${label}](https://)`
  const urlStart = start + label.length + 3
  return {
    text: text.slice(0, start) + insert + text.slice(end),
    selectionStart: selected ? urlStart : start + 1,
    selectionEnd: selected ? urlStart + 8 : start + 1 + label.length,
  }
}
