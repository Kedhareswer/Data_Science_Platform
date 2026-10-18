import { SiteFooter } from "./site-footer"
import { SiteHeader } from "./site-header"

export interface TocEntry {
  id: string
  title: string
}

interface ProsePageProps {
  title: string
  lead?: React.ReactNode
  toc: TocEntry[]
  children: React.ReactNode
}

/** Long-form page (docs, legal) with a sticky table of contents. Server component. */
export function ProsePage({ title, lead, toc, children }: ProsePageProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main-content" className="mx-auto grid w-full max-w-7xl flex-1 gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label="On this page" className="lg:sticky lg:top-20 lg:self-start">
          <p className="mb-2 font-handwritten-bold text-sm text-muted-foreground">On this page</p>
          <ol className="flex flex-wrap gap-x-4 gap-y-1 text-sm lg:block lg:space-y-1">
            {toc.map((entry) => (
              <li key={entry.id}>
                <a href={`#${entry.id}`} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                  {entry.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <article className="prose prose-neutral max-w-3xl dark:prose-invert prose-headings:font-handwritten-bold prose-h2:scroll-mt-20 prose-code:before:content-none prose-code:after:content-none">
          <h1>{title}</h1>
          {lead && <p className="lead">{lead}</p>}
          {children}
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}
