# CLAUDE.md

Guidance for AI coding agents (and humans) working in this repository.

## What this is

**DataNotebook** — a browser-only, notebook-style data-analysis app with a whimsical handwritten look.
Users load CSV/TSV/JSON/XLSX files, stack cells (table, profile, missing data, charts, preprocessing,
Markdown notes, Python, ML trainer/AutoML/predictor/insights) and build a filterable dashboard.
**Everything runs client-side**: there are no API routes and no server-side processing of user data.

Stack: Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 6 (strict) · Tailwind CSS 4 (CSS-first config) ·
Radix/shadcn-style UI in `components/ui` · Recharts 3 · Pyodide (Python in a Web Worker) · Vitest · ESLint 9 flat config.

## Commands

```bash
npm install            # Node >= 20.9 (CI uses 22)
npm run dev            # http://localhost:3000
npm run build          # production build (type errors and lint are NOT ignored)
npm run lint           # eslint .
npm run typecheck      # tsc --noEmit
npm test               # vitest run (lib/**/*.test.ts, node environment)
npm run check          # lint + typecheck + test
npm run check:python   # runs the Pyodide Python helpers under CPython (needs pandas, scikit-learn, matplotlib)
npm run format         # prettier (semi: false, printWidth 120, tailwind class sorting)
```

Run `npm run check` before committing. CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests, build and the
Python helper check.

## Layout

```
app/                      routes: / (landing), /notebook, /dashboard, /docs, /privacy, /terms
  layout.tsx              fonts (Kalam + Fira Code via next/font), ThemeProvider, DataProvider, Sonner Toaster
  globals.css             Tailwind v4 entry: design tokens (:root/.dark HSL vars) + @theme inline mapping, utilities
components/
  ui/                     shadcn-style primitives (Radix). Prefer these over new primitives.
  layout/                 SiteHeader, SiteFooter, ModeToggle, ProsePage (docs/legal)
  notebook/               notebook shell: view, toolbar, cell frame, cell registry, add-cell dialog, outline
  cells/                  one component per cell type; each takes `{ cellId }` (see cells/types.ts)
  ml/ charts/ python/ dashboard/ …   helpers used by cells and the dashboard
lib/
  data/                   PURE data layer (no React): types, parse (CSV/JSON/XLSX), infer (types), stats
                          (pandas-compatible statistics + profiling), transform (serializable preprocessing steps)
  ml/                     PURE in-browser ML engine: algorithms, pipeline (impute/scale/one-hot), metrics,
                          random (seeded RNG, stratified split), engine (train/predict/AutoML), sklearn.ts (bridge)
  python/                 Pyodide runtime: worker.ts (Web Worker), client.ts (singleton + usePythonStatus),
                          protocol.ts (messages), bootstrap-py.ts & sklearn-py.ts (Python helper source)
  data-context.tsx        DataProvider/useData: dataset, notebook cells, models, dashboard, persistence, run-all
  notebook.ts             cell types/metadata (CELL_META), notebook file format, download helpers
  dashboard.ts            dashboard state types; dashboard-data.ts holds the pure aggregation logic
  storage.ts              tiny IndexedDB key-value wrapper
public/samples/iris.csv   bundled sample dataset (also used by tests)
docs/images/              README screenshots
scripts/                  check-python-helpers.mjs
```

## Architecture & conventions

- **State**: one `DataProvider` (`lib/data-context.tsx`). `data` = rows as loaded, `processedData` = current working
  rows that every cell reads. `columns`/`columnTypes` are derived from `processedData`; `datasetVersion` changes on
  every change (used to resync the Python `df`). The whole workspace is persisted to IndexedDB (debounced) and
  restored on load — wait for `isHydrated` before showing empty states.
- **Rows** are `Record<string, string | number | boolean | null>`; dates are ISO strings tagged `"date"`. Keep
  everything JSON-serializable (it is persisted, exported and posted to the worker).
- **Cells**: add a new type by (1) extending `CellType` + `CELL_META` in `lib/notebook.ts`, (2) creating
  `components/cells/<name>-cell.tsx` exporting a component that takes `CellProps`, (3) registering it with an icon in
  `components/notebook/cell-registry.tsx`. Persist per-cell UI state with `useCellContent(cellId, fallback)` (never
  local-only state for things users expect to keep). Make a cell runnable with `useCellRunner(cellId, fn)` and
  `runnable: true` in `CELL_META` — it then participates in **Run all**.
- **Preprocessing** is a list of `TransformStep`s applied with `applyPipeline(data, steps)` from the _original_ data,
  so re-applying is idempotent. Add new step types in `lib/data/transform.ts` (+ `describeStep`, tests, UI).
- **ML**: `trainModel(rows, config)` returns a serializable `TrainedModel` with held-out `metrics`, `evaluation`
  (real test-set predictions used by insight charts) and permutation `featureImportance`. Never fabricate metrics or
  chart data. New TypeScript algorithms go in `lib/ml/algorithms.ts` (`ALGORITHMS`, `createEstimator`,
  `restoreEstimator`). scikit-learn-only algorithms set `backends: ["sklearn"]` and are implemented in
  `lib/python/sklearn-py.ts`.
- **Python/Pyodide**: user code runs via `getPythonRuntime().run(code, dataset)`. Never interpolate user code, column
  names or data into Python source — pass data as JSON through `globals` (see `worker.ts`/`bootstrap-py.ts`). Helper
  functions callable from TS must be named `_dn_*` and listed in `PythonHelper` in `client.ts`. "Stop" = terminate
  the worker (`restart()`). Pyodide URL: `NEXT_PUBLIC_PYODIDE_INDEX_URL` (default jsDelivr, see `protocol.ts`).
  Before running a cell the worker loads bundled packages from the code's imports and tries `micropip` for any
  remaining missing imports (e.g. seaborn); Pyodide's loader chatter is silenced via `QUIET` in `worker.ts`.
- **UI**: keep the handwritten aesthetic (`font-handwritten*`, `sketch-card`, Kalam everywhere; `font-mono` for code
  and numbers in editors). Use theme tokens (`bg-card`, `text-muted-foreground`, `text-destructive`, `text-success`,
  `var(--color-chart-N)`) — never raw `bg-white`/`text-gray-*` without dark variants. Toasts: `import { toast } from
"sonner"`. Icons: `lucide-react` (brand icons were removed from lucide — inline an SVG if needed). Icon-only buttons
  need `aria-label`.
- **Markdown** is rendered with `react-markdown` + `remark-gfm` without raw HTML. Never use `dangerouslySetInnerHTML`
  with user content.
- **Tailwind v4**: config lives in `app/globals.css` (`@theme inline`, `@utility`, `@custom-variant dark`). There is
  no `tailwind.config.ts`. v4 renames: `shadow-sm`→`shadow-xs`, `outline-none`→`outline-hidden`, bare `ring`→`ring-3`.
- **Code style**: TypeScript strict, avoid `any` (lint warns), no semicolons, double quotes, 120 columns. Pure logic
  belongs in `lib/` with Vitest tests next to it (`*.test.ts`); components stay thin.
- **Dependencies** are pinned to exact versions. TypeScript stays on 6.x until `typescript-eslint` supports 7.
  ESLint stays on 9.x until `eslint-plugin-react`/`import` support 10.

## Gotchas

- `components/notebook/cell-registry.tsx` loads cells with `next/dynamic({ ssr: false })`; cells may assume `window`.
- Pyodide can't run in Vitest/Node here — test Python helpers with `npm run check:python`, and keep Python logic in
  the `*-py.ts` string modules so that script can extract it.
- Large datasets: memoize derived data, render only the visible page of tables, and sample for scatter/heatmaps.
- `next/font/google` downloads fonts at build time (network needed for `npm run build`).
- `<Analytics />` (Vercel Web Analytics) only renders when `process.env.VERCEL` is set, to avoid 404s elsewhere.
- `NEXT_PUBLIC_*` variables are inlined at build time — rebuild after changing them.
- **Security headers / CSP** are set in `next.config.ts`. `connect-src` only allows this origin, the Pyodide origin
  and PyPI, so Python code (which runs in a worker that inherits the CSP) cannot send data elsewhere. If you add a
  feature that talks to a new host, add it there deliberately. `NEXT_PUBLIC_PYODIDE_INDEX_URL` may be relative
  (e.g. `/pyodide/` served from `public/pyodide`, which is git-ignored).
- CSV exports must neutralise spreadsheet formulas (`escapeFormulae` for Papa, `csvField` in `components/charts/export.ts`).
- `npm audit` reports `braces` (via `eslint-config-next` → `fast-glob` → `micromatch`) — dev-only lint tooling with no
  patched release yet; production dependencies audit clean (`npm audit --omit=dev`). `postcss-selector-parser` is
  pinned to a patched version through `overrides` in `package.json`.
