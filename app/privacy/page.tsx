import type { Metadata } from "next"
import { ProsePage } from "@/components/layout/prose-page"

export const metadata: Metadata = { title: "Privacy" }

const TOC = [
  { id: "summary", title: "Summary" },
  { id: "your-data", title: "Your data" },
  { id: "storage", title: "Browser storage" },
  { id: "third-parties", title: "Third-party services" },
  { id: "control", title: "Your control" },
  { id: "contact", title: "Contact" },
]

export default function PrivacyPage() {
  return (
    <ProsePage
      title="Privacy"
      lead="DataNotebook is designed so that the data you analyse never leaves your device."
      toc={TOC}
    >
      <p>
        <em>
          This page describes how the open-source DataNotebook application works. If you deploy your own instance,
          review and adapt it to your deployment — it is not legal advice.
        </em>
      </p>

      <h2 id="summary">Summary</h2>
      <ul>
        <li>No accounts, no sign-up and no server-side processing of your files.</li>
        <li>Files you load are parsed, analysed and modelled entirely in your browser.</li>
        <li>Your workspace is stored only in your browser (IndexedDB) so it survives a reload.</li>
      </ul>

      <h2 id="your-data">Your data</h2>
      <p>
        When you open a CSV, JSON or Excel file it is read with the browser&apos;s File API. Statistics, charts,
        preprocessing, machine-learning training and Python code (via Pyodide/WebAssembly) all execute locally. The
        application has no API endpoint that receives your data.
      </p>

      <h2 id="storage">Browser storage</h2>
      <p>
        The dataset, notebook cells, trained models and dashboard are saved in your browser&apos;s IndexedDB under this
        site&apos;s origin. The theme preference is stored in <code>localStorage</code>. No cookies are set by the
        application itself.
      </p>

      <h2 id="third-parties">Third-party services</h2>
      <ul>
        <li>
          <strong>Pyodide CDN</strong> — the first time you run Python or use the scikit-learn engine your browser
          downloads the Python runtime and packages from a public CDN (jsDelivr by default). These requests contain no
          dataset contents. Operators can self-host via <code>NEXT_PUBLIC_PYODIDE_INDEX_URL</code>.
        </li>
        <li>
          <strong>PyPI</strong> — if Python code imports a pure-Python package that Pyodide doesn&apos;t bundle (for
          example seaborn), it is downloaded from pypi.org. A Content-Security-Policy restricts the app and its Python
          worker to this site, the Pyodide CDN and PyPI, so code cannot send your data to other servers.
        </li>
        <li>
          <strong>Vercel Web Analytics</strong> — when deployed on Vercel with analytics enabled, anonymous, cookie-less
          page-view metrics are collected. No dataset contents are sent.
        </li>
        <li>
          <strong>Fonts</strong> are bundled with the site at build time; no requests are made to font providers at
          runtime.
        </li>
      </ul>

      <h2 id="control">Your control</h2>
      <p>
        Use <strong>Reset workspace</strong> in the notebook menu, or clear this site&apos;s data in your browser
        settings, to delete everything stored locally. Export your notebook first if you want to keep a copy.
      </p>

      <h2 id="contact">Contact</h2>
      <p>
        Questions or concerns? Open an issue on the{" "}
        <a href="https://github.com/Kedhareswer/Data_Science_Platform/issues">GitHub repository</a>.
      </p>
    </ProsePage>
  )
}
