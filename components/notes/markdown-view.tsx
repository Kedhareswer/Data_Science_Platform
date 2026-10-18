"use client"

import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

const components: Components = {
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
  code: ({ node: _node, className, ...props }) => <code {...props} className={`${className ?? ""} font-mono`} />,
}

/** Render user markdown safely: raw HTML is not allowed (react-markdown escapes it by default). */
export function MarkdownView({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-sm font-handwritten dark:prose-invert prose-headings:font-handwritten-bold prose-pre:bg-muted prose-pre:text-foreground prose-code:before:content-none prose-code:after:content-none max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
