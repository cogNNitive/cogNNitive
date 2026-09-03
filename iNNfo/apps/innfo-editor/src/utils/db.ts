/**
 * IndexedDB wrapper for the format-editor application.
 *
 * Schema v2 (backward-compatible with v1):
 *   - `handles` (v1): stores directory handles, no keyPath (uses explicit key)
 *   - `session` (v2): key → value session state (lastFile, lastOpenedAt, etc.)
 *   - `treeState` (v2): nodeId → collapsed state for tree expansion
 *   - `sidebarWidths` (v2): panelId → width for resizable panels
 *
 * All functions degrade gracefully — if IndexedDB is unavailable (private
 * browsing, quota exceeded), they return undefined / false instead of throwing.
 */

const DB_NAME = 'format-editor'
const DB_VERSION = 2

// ── Internal helpers ────────────────────────────────────────────────────

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('handles')) {
        db.createObjectStore('handles')
      }
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
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// ── Generic CRUD operations ─────────────────────────────────────────────

/**
 * Retrieves a value from an object store by key.
 * Returns `undefined` if the key is not found or if IndexedDB is unavailable.
 */
export async function dbGet<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  try {
    const db = await openDb()
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const req = tx.objectStore(storeName).get(key)
      req.onsuccess = () => resolve(req.result ?? undefined)
      req.onerror = () => reject(req.error)
      tx.oncomplete = () => db.close()
    })
  } catch {
    return undefined
  }
}

/**
 * Stores a value in an object store under the given key.
 * If the key already exists, the value is overwritten.
 */
export async function dbSet(storeName: string, key: IDBValidKey, value: unknown): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      // For keyPath stores, the key is embedded in the value — omit explicit key.
      // For non-keyPath stores (e.g. handles), pass the explicit key.
      if (store.keyPath) {
        store.put(value)
      } else {
        store.put(value, key)
      }
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // silent degradation
  }
}

/**
 * Deletes a value from an object store by key.
 */
export async function dbDelete(storeName: string, key: IDBValidKey): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      tx.objectStore(storeName).delete(key)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // silent
  }
}

/**
 * Retrieves all entries from an object store.
 */
export async function dbGetAll<T>(storeName: string): Promise<T[]> {
  try {
    const db = await openDb()
    return await new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const req = tx.objectStore(storeName).getAll()
      req.onsuccess = () => resolve(req.result as T[])
      req.onerror = () => reject(req.error)
      tx.oncomplete = () => db.close()
    })
  } catch {
    return []
  }
}

/**
 * Clears all entries from an object store.
 */
export async function dbClear(storeName: string): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      tx.objectStore(storeName).clear()
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // silent
  }
}

// ── Session state convenience functions ─────────────────────────────────

interface SessionEntry {
  key: string
  value: unknown
}

/**
 * Retrieves all session state as a flat key-value record.
 */
export async function getSessionState(): Promise<Record<string, unknown>> {
  try {
    const items = await dbGetAll<SessionEntry>('session')
    const result: Record<string, unknown> = {}
    for (const item of items) {
      result[item.key] = item.value
    }
    return result
  } catch {
    return {}
  }
}

/**
 * Stores a single session key-value pair.
 */
export async function setSessionState(key: string, value: unknown): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('session', 'readwrite')
      tx.objectStore('session').put({ key, value } satisfies SessionEntry)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // silent
  }
}

// ── Tree state convenience functions ────────────────────────────────────

interface TreeStateEntry {
  nodeId: string
  collapsed: boolean
}

/**
 * Retrieves all tree state entries as a Map of nodeId → collapsed.
 */
export async function getTreeState(): Promise<Map<string, boolean>> {
  try {
    const items = await dbGetAll<TreeStateEntry>('treeState')
    const map = new Map<string, boolean>()
    for (const item of items) {
      map.set(item.nodeId, item.collapsed)
    }
    return map
  } catch {
    return new Map()
  }
}

/**
 * Stores a single tree state entry (nodeId → collapsed).
 */
export async function setTreeState(nodeId: string, collapsed: boolean): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('treeState', 'readwrite')
      tx.objectStore('treeState').put({ nodeId, collapsed } satisfies TreeStateEntry)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // silent
  }
}

// ── Sidebar width convenience functions ─────────────────────────────────

interface SidebarWidthEntry {
  panelId: string
  width: number
}

/**
 * Retrieves a stored panel width by its panelId.
 * Returns `undefined` when no stored value exists or IndexedDB is unavailable.
 */
export async function getSidebarWidth(panelId: string): Promise<number | undefined> {
  try {
    const entry = await dbGet<SidebarWidthEntry>('sidebarWidths', panelId)
    return entry?.width
  } catch {
    return undefined
  }
}

/**
 * Stores a panel width for the given panelId.
 */
export async function setSidebarWidth(panelId: string, width: number): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('sidebarWidths', 'readwrite')
      tx.objectStore('sidebarWidths').put({ panelId, width } satisfies SidebarWidthEntry)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // silent
  }
}
