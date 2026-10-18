# Contributing to DataNotebook

Thanks for helping! DataNotebook is a browser-only data notebook with a handwritten soul — contributions that keep it
**private (client-side), honest (no fake numbers) and delightful** are very welcome.

## Setup

```bash
git clone https://github.com/Kedhareswer/Data_Science_Platform.git
cd Data_Science_Platform
npm install          # Node >= 20.9 (see .nvmrc)
npm run dev          # http://localhost:3000
```

Optional, to test the Pyodide Python helpers locally:

```bash
python3 -m venv .venv && .venv/bin/pip install pandas scikit-learn matplotlib
node scripts/check-python-helpers.mjs .venv/bin/python
```

## Workflow

1. Create a branch: `git checkout -b feat/short-description`.
2. Make your change. Put pure logic in `lib/` with Vitest tests next to it (`*.test.ts`); keep components thin.
3. Run `npm run check` (lint + typecheck + tests) and `npm run build`.
4. Open a pull request describing **what** changed and **why**, with screenshots for UI changes (light and dark).

Commit messages: imperative mood (“Add box plot to visualization cell”), one logical change per commit.

## Guidelines

- Read [`CLAUDE.md`](./CLAUDE.md) — it documents the architecture, how to add a cell type, ML algorithm or
  preprocessing step, and the project conventions.
- No server-side processing of user data and no new network calls with user data.
- Never generate fake/simulated results (random metrics, timer-driven progress bars). Show real computations or
  nothing.
- Use the design tokens and `components/ui` primitives; check light and dark mode and keyboard accessibility.
- Don't interpolate user input into Python source; pass data through Pyodide globals as JSON.
- Pin new dependencies to exact versions and justify them in the PR.

## Reporting bugs

Open an issue with steps to reproduce, the expected vs actual behaviour, your browser, and (if possible) a small
sample file.
