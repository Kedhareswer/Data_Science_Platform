/**
 * Tiny promise wrapper around IndexedDB for persisting the workspace locally.
 * IndexedDB (unlike localStorage) handles multi-megabyte datasets.
 */
const DB_NAME = "datanotebook"
const STORE = "kv"

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB unavailable"))
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      dbPromise = null
      reject(req.error)
    }
  })
  return dbPromise
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const req = fn(t.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

export function getItem<T>(key: string): Promise<T | undefined> {
  return tx<T | undefined>("readonly", (s) => s.get(key) as IDBRequest<T | undefined>)
}

export function setItem(key: string, value: unknown): Promise<void> {
  return tx("readwrite", (s) => s.put(value, key)).then(() => undefined)
}

export function removeItem(key: string): Promise<void> {
  return tx("readwrite", (s) => s.delete(key)).then(() => undefined)
}
