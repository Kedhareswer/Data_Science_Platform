import type { Metadata } from "next"
import { ProsePage } from "@/components/layout/prose-page"

export const metadata: Metadata = { title: "Terms" }

const TOC = [
  { id: "acceptance", title: "Acceptance" },
  { id: "service", title: "The service" },
  { id: "use", title: "Acceptable use" },
  { id: "your-content", title: "Your content" },
  { id: "warranty", title: "No warranty" },
  { id: "license", title: "Open-source license" },
  { id: "changes", title: "Changes" },
]

export default function TermsPage() {
  return (
    <ProsePage title="Terms of use" lead="The short version: use it freely, at your own risk." toc={TOC}>
      <p>
        <em>
          These terms describe the open-source DataNotebook project. If you operate a public deployment, adapt them to
          your situation — this is not legal advice.
        </em>
      </p>

      <h2 id="acceptance">Acceptance</h2>
      <p>By using DataNotebook you agree to these terms. If you do not agree, please do not use the application.</p>

      <h2 id="service">The service</h2>
      <p>
        DataNotebook is a browser-based tool for exploring, visualising and modelling tabular data. It is provided free
        of charge, without accounts, and may change or be unavailable at any time.
      </p>

      <h2 id="use">Acceptable use</h2>
      <ul>
        <li>Only load data you have the right to process.</li>
        <li>Do not use the application to break the law or to harm others.</li>
        <li>Do not attempt to disrupt the hosting infrastructure.</li>
      </ul>

      <h2 id="your-content">Your content</h2>
      <p>
        Your files stay on your device and remain yours. You are responsible for backing up anything important — use
        notebook export, since browser storage can be cleared at any time.
      </p>

      <h2 id="warranty">No warranty</h2>
      <p>
        The software is provided &quot;as is&quot;, without warranty of any kind. Statistical results and machine-
        learning predictions may be wrong; verify them before making decisions. To the maximum extent permitted by law,
        the authors are not liable for any damages arising from its use.
      </p>

      <h2 id="license">Open-source license</h2>
      <p>
        The source code is available under the{" "}
        <a href="https://github.com/Kedhareswer/Data_Science_Platform/blob/main/LICENSE">MIT License</a>, which governs
        your use, modification and redistribution of the code.
      </p>

      <h2 id="changes">Changes</h2>
      <p>These terms may be updated with new releases; the version in the repository is authoritative.</p>
    </ProsePage>
  )
}
