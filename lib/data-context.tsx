"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { describeRows } from "@/lib/data/infer"
import { parseDelimitedText, parseFile } from "@/lib/data/parse"
import { type DataProfile, generateProfile } from "@/lib/data/stats"
import type { ColumnTypes, DataRow, Dataset } from "@/lib/data/types"
import type { TrainedModel } from "@/lib/ml/types"
import { type CellType, CELL_META, type NotebookCell, type NotebookFile, newCellId } from "@/lib/notebook"
import type { DashboardState } from "@/lib/dashboard"
import { EMPTY_DASHBOARD } from "@/lib/dashboard"
import * as storage from "@/lib/storage"

export type { CellType, NotebookCell } from "@/lib/notebook"
export type { ColumnProfile, DataProfile, DataQualityIssue } from "@/lib/data/stats"

/** A cell's "run" handler, registered while the cell is mounted (used by Run all). */
export type CellRunner = () => Promise<void> | void

export interface DataContextValue {
  /** Original rows as loaded from the file. */
  data: DataRow[]
  /** Current working rows (after preprocessing / Python export). Everything else reads this. */
  processedData: DataRow[]
  columns: string[]
  columnTypes: ColumnTypes
  /** Changes whenever `processedData` changes (used to resync the Python `df`). */
  datasetVersion: string
  fileName?: string
  isLoading: boolean
  /** True once the persisted workspace has been restored from IndexedDB. */
  isHydrated: boolean
  error: string | null
  dataProfile: DataProfile | null
  isProfileLoading: boolean

  processFile: (file: File) => Promise<void>
  loadDataset: (dataset: Dataset, fileName: string) => void
  loadSample: (name: SampleName) => Promise<void>
  setProcessedData: (rows: DataRow[]) => void
  resetProcessedData: () => void
  generateDataProfile: () => Promise<void>
  setError: (error: string | null) => void
  clearData: () => void
  resetData: () => void

  notebookCells: NotebookCell[]
  addCell: (type: CellType, insertIndex?: number) => string
  updateCell: (id: string, patch: Partial<Omit<NotebookCell, "id">>) => void
  updateCellTitle: (id: string, title: string) => void
  updateCellContent: (id: string, content: unknown) => void
  removeCell: (id: string) => void
  duplicateCell: (id: string) => void
  reorderCells: (sourceIndex: number, destinationIndex: number) => void
  registerRunner: (cellId: string, runner: CellRunner) => () => void
  runCell: (cellId: string) => Promise<void>
  runAllCells: (onProgress?: (cell: NotebookCell, index: number, total: number) => void) => Promise<number>
  exportNotebook: (options?: { includeData?: boolean }) => NotebookFile
  importNotebook: (file: NotebookFile) => void

  trainedModels: TrainedModel[]
  addTrainedModel: (model: TrainedModel) => void
  removeTrainedModel: (modelId: string) => void
  downloadModel: (modelId: string) => void
  importModel: (model: TrainedModel) => void

  dashboard: DashboardState
  setDashboard: (updater: DashboardState | ((prev: DashboardState) => DashboardState)) => void
}

export const SAMPLE_DATASETS = {
  iris: { file: "/samples/iris.csv", label: "Iris flowers", description: "150 rows · classification" },
} as const
export type SampleName = keyof typeof SAMPLE_DATASETS

const DataContext = createContext<DataContextValue | null>(null)

export function useData(): DataContextValue {
  const context = useContext(DataContext)
  if (!context) throw new Error("useData must be used within a DataProvider")
  return context
}

const WORKSPACE_KEY = "workspace:v2"

interface PersistedWorkspace {
  fileName?: string
  data: DataRow[]
  processedData: DataRow[]
  cells: NotebookCell[]
  models: TrainedModel[]
  dashboard: DashboardState
}

function versionKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DataRow[]>([])
  const [processedData, setProcessedRows] = useState<DataRow[]>([])
  const [shape, setShape] = useState<{ columns: string[]; columnTypes: ColumnTypes }>({ columns: [], columnTypes: {} })
  const [datasetVersion, setDatasetVersion] = useState("empty")
  const [fileName, setFileName] = useState<string | undefined>()
  const [isLoading, setIsLoading] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dataProfile, setDataProfile] = useState<DataProfile | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [notebookCells, setNotebookCells] = useState<NotebookCell[]>([])
  const [trainedModels, setTrainedModels] = useState<TrainedModel[]>([])
  const [dashboard, setDashboard] = useState<DashboardState>(EMPTY_DASHBOARD)
  const runners = useRef(new Map<string, CellRunner>())
  const cellsRef = useRef(notebookCells)
  cellsRef.current = notebookCells

  const applyRows = useCallback((rows: DataRow[], known?: Pick<Dataset, "columns" | "columnTypes">) => {
    setProcessedRows(rows)
    setShape(known ?? describeRows(rows))
    setDatasetVersion(versionKey())
    setDataProfile(null)
  }, [])

  // Restore the last workspace.
  useEffect(() => {
    let cancelled = false
    storage
      .getItem<PersistedWorkspace>(WORKSPACE_KEY)
      .then((saved) => {
        if (cancelled || !saved) return
        setData(saved.data ?? [])
        applyRows(saved.processedData ?? saved.data ?? [])
        setFileName(saved.fileName)
        setNotebookCells(saved.cells ?? [])
        setTrainedModels(saved.models ?? [])
        setDashboard(saved.dashboard ?? EMPTY_DASHBOARD)
      })
      .catch(() => {
        // Private mode / storage disabled: run without persistence.
      })
      .finally(() => !cancelled && setIsHydrated(true))
    return () => {
      cancelled = true
    }
  }, [applyRows])

  // Persist (debounced) after hydration.
  useEffect(() => {
    if (!isHydrated) return
    const handle = setTimeout(() => {
      const workspace: PersistedWorkspace = {
        fileName,
        data,
        processedData,
        cells: notebookCells,
        models: trainedModels,
        dashboard,
      }
      storage.setItem(WORKSPACE_KEY, workspace).catch((err) => console.warn("Could not save workspace", err))
    }, 400)
    return () => clearTimeout(handle)
  }, [isHydrated, fileName, data, processedData, notebookCells, trainedModels, dashboard])

  const addCell = useCallback((type: CellType, insertIndex?: number): string => {
    const cell: NotebookCell = { id: newCellId(), type, title: CELL_META[type].title, createdAt: new Date().toISOString() }
    setNotebookCells((prev) => {
      if (insertIndex === undefined || insertIndex < 0 || insertIndex > prev.length) return [...prev, cell]
      const next = [...prev]
      next.splice(insertIndex, 0, cell)
      return next
    })
    return cell.id
  }, [])

  const loadDataset = useCallback(
    (dataset: Dataset, name: string) => {
      setData(dataset.rows)
      applyRows(dataset.rows, dataset)
      setFileName(name)
      setError(null)
      setNotebookCells((prev) => (prev.some((c) => c.type === "data") ? prev : [{ id: newCellId(), type: "data", title: CELL_META.data.title, createdAt: new Date().toISOString() }, ...prev]))
    },
    [applyRows],
  )

  const processFile = useCallback(
    async (file: File) => {
      setIsLoading(true)
      setError(null)
      try {
        loadDataset(await parseFile(file), file.name)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to process file")
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [loadDataset],
  )

  const loadSample = useCallback(
    async (name: SampleName) => {
      setIsLoading(true)
      try {
        const sample = SAMPLE_DATASETS[name]
        const res = await fetch(sample.file)
        if (!res.ok) throw new Error(`Could not download sample (${res.status})`)
        loadDataset(parseDelimitedText(await res.text()), sample.file.split("/").pop()!)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sample")
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [loadDataset],
  )

  const setProcessedData = useCallback((rows: DataRow[]) => applyRows(rows), [applyRows])
  const resetProcessedData = useCallback(() => applyRows(data), [applyRows, data])

  const generateDataProfile = useCallback(async () => {
    if (processedData.length === 0) return
    setIsProfileLoading(true)
    // Yield so the loading state paints before the (synchronous) computation.
    await new Promise((resolve) => setTimeout(resolve, 0))
    try {
      setDataProfile(generateProfile(processedData, shape.columns, shape.columnTypes))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate data profile")
    } finally {
      setIsProfileLoading(false)
    }
  }, [processedData, shape])

  const clearData = useCallback(() => {
    setData([])
    applyRows([], { columns: [], columnTypes: {} })
    setFileName(undefined)
    setError(null)
  }, [applyRows])

  const resetData = useCallback(() => {
    clearData()
    setNotebookCells([])
    setTrainedModels([])
    setDashboard(EMPTY_DASHBOARD)
  }, [clearData])

  const updateCell = useCallback((id: string, patch: Partial<Omit<NotebookCell, "id">>) => {
    setNotebookCells((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }, [])
  const updateCellTitle = useCallback((id: string, title: string) => updateCell(id, { title }), [updateCell])
  const updateCellContent = useCallback((id: string, content: unknown) => updateCell(id, { content }), [updateCell])

  const removeCell = useCallback((id: string) => {
    runners.current.delete(id)
    setNotebookCells((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const duplicateCell = useCallback((id: string) => {
    setNotebookCells((prev) => {
      const index = prev.findIndex((c) => c.id === id)
      if (index === -1) return prev
      const copy: NotebookCell = {
        ...structuredClone(prev[index]),
        id: newCellId(),
        title: `${prev[index].title} (copy)`,
        createdAt: new Date().toISOString(),
      }
      return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)]
    })
  }, [])

  const reorderCells = useCallback((from: number, to: number) => {
    setNotebookCells((prev) => {
      if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }, [])

  const registerRunner = useCallback((cellId: string, runner: CellRunner) => {
    runners.current.set(cellId, runner)
    return () => {
      if (runners.current.get(cellId) === runner) runners.current.delete(cellId)
    }
  }, [])

  const runCell = useCallback(async (cellId: string) => {
    await runners.current.get(cellId)?.()
  }, [])

  const runAllCells = useCallback(async (onProgress?: (cell: NotebookCell, index: number, total: number) => void) => {
    const runnable = cellsRef.current.filter((c) => runners.current.has(c.id))
    for (let i = 0; i < runnable.length; i++) {
      onProgress?.(runnable[i], i, runnable.length)
      await runners.current.get(runnable[i].id)?.()
      // Let state updates from the previous cell (e.g. new processedData) commit before the next one runs.
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
    return runnable.length
  }, [])

  const exportNotebook = useCallback(
    (options?: { includeData?: boolean }): NotebookFile => ({
      format: "datanotebook",
      version: 2,
      exportedAt: new Date().toISOString(),
      fileName,
      cells: notebookCells,
      models: trainedModels.filter((m) => m.backend === "typescript"),
      dataset: options?.includeData ? { rows: data, columns: shape.columns } : undefined,
    }),
    [fileName, notebookCells, trainedModels, data, shape.columns],
  )

  const importNotebook = useCallback(
    (file: NotebookFile) => {
      setNotebookCells(file.cells.map((c) => ({ ...c, id: c.id || newCellId() })))
      setTrainedModels(file.models ?? [])
      if (file.dataset?.rows?.length) {
        setData(file.dataset.rows)
        applyRows(file.dataset.rows)
        setFileName(file.fileName)
      }
    },
    [applyRows],
  )

  const addTrainedModel = useCallback((model: TrainedModel) => setTrainedModels((prev) => [...prev, model]), [])
  const removeTrainedModel = useCallback((id: string) => setTrainedModels((prev) => prev.filter((m) => m.id !== id)), [])
  const importModel = useCallback(
    (model: TrainedModel) => setTrainedModels((prev) => [...prev.filter((m) => m.id !== model.id), model]),
    [],
  )
  const downloadModel = useCallback(
    (id: string) => {
      const model = trainedModels.find((m) => m.id === id)
      if (!model) throw new Error("Model not found")
      import("@/lib/notebook").then(({ downloadJSON, baseName }) =>
        downloadJSON(model, `${baseName(model.name).toLowerCase()}.model.json`),
      )
    },
    [trainedModels],
  )

  const value = useMemo<DataContextValue>(
    () => ({
      data,
      processedData,
      columns: shape.columns,
      columnTypes: shape.columnTypes,
      datasetVersion,
      fileName,
      isLoading,
      isHydrated,
      error,
      dataProfile,
      isProfileLoading,
      processFile,
      loadDataset,
      loadSample,
      setProcessedData,
      resetProcessedData,
      generateDataProfile,
      setError,
      clearData,
      resetData,
      notebookCells,
      addCell,
      updateCell,
      updateCellTitle,
      updateCellContent,
      removeCell,
      duplicateCell,
      reorderCells,
      registerRunner,
      runCell,
      runAllCells,
      exportNotebook,
      importNotebook,
      trainedModels,
      addTrainedModel,
      removeTrainedModel,
      downloadModel,
      importModel,
      dashboard,
      setDashboard,
    }),
    [
      data,
      processedData,
      shape,
      datasetVersion,
      fileName,
      isLoading,
      isHydrated,
      error,
      dataProfile,
      isProfileLoading,
      processFile,
      loadDataset,
      loadSample,
      setProcessedData,
      resetProcessedData,
      generateDataProfile,
      clearData,
      resetData,
      notebookCells,
      addCell,
      updateCell,
      updateCellTitle,
      updateCellContent,
      removeCell,
      duplicateCell,
      reorderCells,
      registerRunner,
      runCell,
      runAllCells,
      exportNotebook,
      importNotebook,
      trainedModels,
      addTrainedModel,
      removeTrainedModel,
      downloadModel,
      importModel,
      dashboard,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

/** Convenience hook for cells: typed content with a setter bound to the cell. */
export function useCellContent<T>(cellId: string, fallback: T): [T, (next: T | ((prev: T) => T)) => void] {
  const { notebookCells, updateCellContent } = useData()
  const content = (notebookCells.find((c) => c.id === cellId)?.content as T | undefined) ?? fallback
  const ref = useRef(content)
  ref.current = content
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const value = typeof next === "function" ? (next as (prev: T) => T)(ref.current) : next
      ref.current = value
      updateCellContent(cellId, value)
    },
    [cellId, updateCellContent],
  )
  return [content, set]
}

/** Register a "run" handler for a cell so Run all / the cell's ▶ button can trigger it. */
export function useCellRunner(cellId: string | undefined, runner: CellRunner) {
  const { registerRunner } = useData()
  const ref = useRef(runner)
  ref.current = runner
  useEffect(() => {
    if (!cellId) return
    return registerRunner(cellId, () => ref.current())
  }, [cellId, registerRunner])
}
