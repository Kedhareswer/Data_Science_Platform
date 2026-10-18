"use client"

import { memo } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import type { TextWidget } from "@/lib/dashboard"
import { WidgetMessage } from "@/components/dashboard/widget-message"

const components: Components = {
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
}

function TextWidgetViewImpl({ widget }: { widget: TextWidget }) {
  if (!widget.markdown.trim()) return <WidgetMessage>Empty note — edit the widget to add some Markdown.</WidgetMessage>
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert font-handwritten prose-headings:font-handwritten-bold">
      {/* No rehype-raw: raw HTML in the Markdown is never rendered. */}
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={components}>
        {widget.markdown}
      </ReactMarkdown>
    </div>
  )
}

export const TextWidgetView = memo(TextWidgetViewImpl)
