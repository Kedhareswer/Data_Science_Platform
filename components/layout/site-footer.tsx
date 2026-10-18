import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="text-muted-foreground mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm sm:flex-row sm:px-6">
        <p>DataNotebook · MIT licensed · your data never leaves your browser</p>
        <nav aria-label="Footer" className="flex gap-4">
          <Link href="/docs" className="underline-offset-4 hover:underline">
            Docs
          </Link>
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            Privacy
          </Link>
          <Link href="/terms" className="underline-offset-4 hover:underline">
            Terms
          </Link>
          <a
            href="https://github.com/Kedhareswer/Data_Science_Platform"
            className="underline-offset-4 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  )
}
