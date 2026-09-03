import type { FolderHistoryEntry } from '../shared/validation-types'
import type { DirectoryHandleLike } from '../model/fs-types'

const DB_NAME = 'format-editor'
const DB_VERSION = 2
const STORE_NAME = 'handles'
const HISTORY_KEY = 'folderHistory'
const MAX_ENTRIES = 10

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolveDb, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
      // v2 stores (added by workspaceStore/db.ts — ensure they exist on upgrade)
      if (!db.objectStoreNames.contains('session')) {
        db.createObjectStore('session', { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains('treeState')) {
        db.createObjectStore('treeState', { keyPath: 'nodeId' })
      }
      if (!db.objectStoreNames.contains('sidebarWidths')) {
        db.createObjectStore('sidebarWidths', { keyPath: 'panelId' })
      }
    }
    req.onsuccess = () => resolveDb(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Generates a reasonably unique handle key from the directory name + timestamp.
 * Used to associate a stored handle with a history entry.
 */
function generateHandleKey(name: string): string {
  const ts = Date.now().toString(36)
  const safe = name.replace(/[^a-zA-Z0-9_-]/g, '_')
  return `handle:${safe}_${ts}`
}

/** Loads the history entry list (metadata only — handles stored separately). */
export async function loadHistory(): Promise<FolderHistoryEntry[]> {
  try {
    const db = await openHandleDb()
    const history = await new Promise<FolderHistoryEntry[]>((res, rej) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(HISTORY_KEY)
      req.onsuccess = () => res((req.result as FolderHistoryEntry[]) ?? [])
      req.onerror = () => rej(req.error)
    })
    db.close()
    return history
  } catch {
    return []
  }
}

/** Adds a new entry to the history (dedup by handleKey). Stores the handle separately. */
export async function addToHistory(name: string, handle: DirectoryHandleLike, path?: string): Promise<void> {
  const db = await openHandleDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)

  // Load existing history
  const existing = await new Promise<FolderHistoryEntry[]>((res, rej) => {
    const req = store.get(HISTORY_KEY)
    req.onsuccess = () => res((req.result as FolderHistoryEntry[]) ?? [])
    req.onerror = () => rej(req.error)
  })

  // Dedup by handleKey (drop entries whose handle no longer exists or matches same name)
  const filtered = existing.filter((e) => e.name !== name)
  const handleKey = generateHandleKey(name)
  const resolvedPath = path || (handle as any)?.path || undefined
  const entry: FolderHistoryEntry = { name, handleKey, timestamp: Date.now(), path: resolvedPath }

  // Store the handle itself
  if (handle) {
    store.put(handle, handleKey)
  }

  // Store updated history list
  const updated = [entry, ...filtered].slice(0, MAX_ENTRIES)
  store.put(updated, HISTORY_KEY)

  await new Promise<void>((res, rej) => {
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error)
  })
  db.close()
}

/** Removes a history entry by handleKey and cleans up its stored handle. */
export async function removeFromHistory(handleKey: string): Promise<void> {
  const db = await openHandleDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)

  // Remove the handle entry
  store.delete(handleKey)

  // Update history list
  const existing = await new Promise<FolderHistoryEntry[]>((res, rej) => {
    const req = store.get(HISTORY_KEY)
    req.onsuccess = () => res((req.result as FolderHistoryEntry[]) ?? [])
    req.onerror = () => rej(req.error)
  })
  const updated = existing.filter((e) => e.handleKey !== handleKey)
  store.put(updated, HISTORY_KEY)

  await new Promise<void>((res, rej) => {
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error)
  })
  db.close()
}

/** Removes all history entries and their stored handles. */
export async function clearHistory(): Promise<void> {
  const db = await openHandleDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)

  // Load existing to know which handles to clean up
  const existing = await new Promise<FolderHistoryEntry[]>((res, rej) => {
    const req = store.get(HISTORY_KEY)
    req.onsuccess = () => res((req.result as FolderHistoryEntry[]) ?? [])
    req.onerror = () => rej(req.error)
  })

  for (const entry of existing) {
    store.delete(entry.handleKey)
  }
  store.delete(HISTORY_KEY)

  await new Promise<void>((res, rej) => {
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error)
  })
  db.close()
}

/** Retrieves a stored handle for a given handleKey. */
export async function getStoredHandle(handleKey: string): Promise<DirectoryHandleLike | null> {
  try {
    const db = await openHandleDb()
    const handle = await new Promise<DirectoryHandleLike | null>((res, rej) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(handleKey)
      req.onsuccess = () => res((req.result as DirectoryHandleLike) ?? null)
      req.onerror = () => rej(req.error)
    })
    db.close()
    return handle
  } catch {
    return null
  }
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const hours = Math.floor(diff / 3600000)

  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}
