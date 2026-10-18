import type { Metadata } from "next"
import Link from "next/link"
import { ProsePage } from "@/components/layout/prose-page"

export const metadata: Metadata = {
  title: "Documentation",
  description: "How to use DataNotebook: data import, cells, Python, machine learning and dashboards.",
}

const TOC = [
  { id: "getting-started", title: "Getting started" },
  { id: "data", title: "Loading data" },
  { id: "cells", title: "Notebook cells" },
  { id: "python", title: "Python cells" },
  { id: "ml", title: "Machine learning" },
  { id: "dashboard", title: "Dashboards" },
  { id: "saving", title: "Saving & sharing" },
  { id: "privacy", title: "Privacy & limits" },
  { id: "shortcuts", title: "Keyboard shortcuts" },
]

export default function DocsPage() {
  return (
    <ProsePage
      title="Documentation"
      lead="DataNotebook is a notebook for exploring tabular data that runs entirely in your browser."
      toc={TOC}
    >
      <h2 id="getting-started">Getting started</h2>
      <ol>
        <li>
          Open the <Link href="/notebook">notebook</Link> and drop a file (or load the Iris sample).
        </li>
        <li>
          A <strong>Data Table</strong> cell is added automatically. Use <strong>Add cell</strong> to stack profile,
          chart, preprocessing, Python and ML cells.
        </li>
        <li>
          Drag cells by their handle to reorder them, rename them by clicking the title and use <strong>Run all</strong>{" "}
          to re-execute runnable cells (preprocessing, Python, profiles and model training) from top to bottom.
        </li>
      </ol>

      <h2 id="data">Loading data</h2>
      <ul>
        <li>
          <strong>CSV / TSV / TXT</strong> — delimiter auto-detected, quoted fields and embedded newlines supported.
        </li>
        <li>
          <strong>JSON</strong> — an array of records, an object wrapping one (e.g. <code>{'{ "data": [...] }'}</code>
          ), column-oriented objects, or a single record. Nested objects are flattened to dotted column names.
        </li>
        <li>
          <strong>Excel</strong> — <code>.xlsx</code> (first sheet). Legacy <code>.xls</code> must be re-saved as .xlsx
          or CSV.
        </li>
      </ul>
      <p>
        Column types (number, boolean, date, text) are inferred from <em>every</em> value in a column. Common missing
        markers such as <code>NA</code>, <code>N/A</code>, <code>null</code> and empty cells become missing values.
        Files up to 50&nbsp;MB are accepted.
      </p>

      <h2 id="cells">Notebook cells</h2>
      <dl>
        <dt>Data Table</dt>
        <dd>Search, sort and page through the current data; download it as CSV or JSON.</dd>
        <dt>Data Profile</dt>
        <dd>
          Per-column statistics (mean, median, quartiles, standard deviation, skewness, kurtosis), top values, outliers
          (IQR rule), duplicate rows, completeness, data-quality warnings and a correlation heatmap.
        </dd>
        <dt>Missing Data</dt>
        <dd>Missing-value counts and patterns with one-click imputation or row removal.</dd>
        <dt>Visualization</dt>
        <dd>Bar, line, area, scatter, pie, histogram and box plots with aggregation and PNG export.</dd>
        <dt>Preprocessing</dt>
        <dd>
          A replayable pipeline of steps (filter, impute, de-duplicate, drop/rename/cast columns, scale, encode, remove
          outliers). Applying it always starts from the original file, so it is safe to re-run; the pipeline can be
          exported as pandas code.
        </dd>
        <dt>Notes</dt>
        <dd>Markdown (GitHub-flavoured) for documenting your analysis.</dd>
      </dl>

      <h2 id="python">Python cells</h2>
      <p>
        Python runs locally through <a href="https://pyodide.org">Pyodide</a> (CPython compiled to WebAssembly) in a
        background worker. The first run downloads the runtime (roughly 10&nbsp;MB, then cached). The current dataset is
        available as a pandas DataFrame named <code>df</code>.
      </p>
      <ul>
        <li>
          Imported packages that ship with Pyodide (numpy, pandas, scikit-learn, scipy, matplotlib, seaborn, …) load
          automatically; other pure-Python packages can be installed from PyPI with the install button (micropip).
        </li>
        <li>matplotlib figures are captured and shown below the cell. The value of the last line is displayed.</li>
        <li>
          <strong>Use df as notebook data</strong> sends your modified DataFrame back to the notebook so the other cells
          use it.
        </li>
        <li>
          <strong>Stop</strong> terminates the interpreter; variables are lost and the runtime restarts on the next run.
        </li>
      </ul>
      <p>
        To self-host the runtime, set <code>NEXT_PUBLIC_PYODIDE_INDEX_URL</code> to a folder containing a Pyodide
        distribution.
      </p>

      <h2 id="ml">Machine learning</h2>
      <p>Two engines are available:</p>
      <ul>
        <li>
          <strong>TypeScript</strong> (instant, no download): linear/ridge regression, logistic regression, k-nearest
          neighbours, decision tree, random forest, Gaussian naive Bayes and k-means.
        </li>
        <li>
          <strong>scikit-learn</strong> (via Pyodide): the same algorithms plus gradient boosting and support vector
          machines.
        </li>
      </ul>
      <p>
        Numeric features are median-imputed and standardised; text features are one-hot encoded. Every model is
        evaluated on a stratified held-out test split (20% by default), so the reported accuracy, F1, ROC AUC, RMSE and
        R² are honest estimates. Feature importance is computed by permutation on the test set.
      </p>
      <ul>
        <li>
          <strong>Model Trainer</strong> — configure and train one model.
        </li>
        <li>
          <strong>AutoML</strong> — trains every applicable algorithm and ranks them by F1 (classification), R²
          (regression) or silhouette (clustering).
        </li>
        <li>
          <strong>Predictor</strong> — predict a single row or the whole dataset and download the predictions.
        </li>
        <li>
          <strong>Model Insights</strong> — compare models and inspect confusion matrices, ROC/PR curves, residuals and
          feature importance.
        </li>
      </ul>
      <p>
        TypeScript models can be downloaded as JSON and imported again later. scikit-learn models live in the Python
        runtime for the current session only.
      </p>

      <h2 id="dashboard">Dashboards</h2>
      <p>
        The <Link href="/dashboard">dashboard</Link> turns the current data into metric tiles, charts, tables and notes.
        Use <strong>Auto-generate</strong> for a starting point, <strong>Edit</strong> to add, resize and reorder
        widgets, and the filter bar to slice every widget at once. Dashboards can be exported and imported as JSON.
      </p>

      <h2 id="saving">Saving &amp; sharing</h2>
      <p>
        Your workspace (data, cells, models and dashboard) is saved automatically in this browser&apos;s IndexedDB
        storage. To move it elsewhere use <strong>Export notebook</strong> (optionally with the data embedded) and{" "}
        <strong>Import notebook</strong>. Clearing site data or using a private window removes the saved workspace.
      </p>

      <h2 id="privacy">Privacy &amp; limits</h2>
      <p>
        Files are never uploaded: parsing, statistics, charts, Python and model training all happen on your device. The
        browser downloads the Python runtime from a CDN on first use. Very large datasets (hundreds of thousands of
        rows) work but some cells sample data for charts and the in-browser models are designed for small to medium
        data. See the <Link href="/privacy">privacy policy</Link> for details.
      </p>

      <h2 id="shortcuts">Keyboard shortcuts</h2>
      <table>
        <thead>
          <tr>
            <th>Where</th>
            <th>Shortcut</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Python cell</td>
            <td>
              <kbd>Shift</kbd>+<kbd>Enter</kbd> or <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>Enter</kbd>
            </td>
            <td>Run the cell</td>
          </tr>
          <tr>
            <td>Python cell</td>
            <td>
              <kbd>Tab</kbd>
            </td>
            <td>Indent with four spaces</td>
          </tr>
          <tr>
            <td>Notes cell</td>
            <td>
              <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>Enter</kbd> or <kbd>Esc</kbd>
            </td>
            <td>Finish editing</td>
          </tr>
          <tr>
            <td>Cell title</td>
            <td>
              <kbd>Enter</kbd> / <kbd>Esc</kbd>
            </td>
            <td>Save / cancel rename</td>
          </tr>
        </tbody>
      </table>
    </ProsePage>
  )
}
