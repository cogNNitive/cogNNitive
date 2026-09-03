import { describe, it, expect, beforeEach } from 'vitest'
import {
  dbGet,
  dbSet,
  dbDelete,
  dbGetAll,
  dbClear,
  getSessionState,
  setSessionState,
  getTreeState,
  setTreeState,
  getSidebarWidth,
  setSidebarWidth,
} from '../../src/utils/db'

describe('db.ts — Schema upgrade (R-SP-01)', () => {
  beforeEach(async () => {
    // Start clean: delete any prior database
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase('format-editor')
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  })

  it('creates the handles store at v1 and preserves data through v2 upgrade', async () => {
    // 1. Create v1 database with a handle stored
    const db1 = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('format-editor', 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('handles')) {
          db.createObjectStore('handles')
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    // Store a handle
    await new Promise<void>((resolve, reject) => {
      const tx = db1.transaction('handles', 'readwrite')
      tx.objectStore('handles').put({ name: 'test-workspace' }, 'workspaceRoot')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db1.close()

    // 2. Now use the v2 wrapper (db.ts opens at version 2)
    // This should trigger the upgrade handler, creating session/treeState/sidebarWidths
    // while preserving the handles store
    await setSessionState('testKey', 'testValue')

    // 3. Verify handles store still has the original data
    const handle = await dbGet<any>('handles', 'workspaceRoot')
    expect(handle).toBeDefined()
    expect(handle.name).toBe('test-workspace')

    // 4. Verify new stores work
    const sessionVal = await dbGet<{ key: string; value: unknown }>('session', 'testKey')
    expect(sessionVal).toBeDefined()
    expect(sessionVal?.value).toBe('testValue')

    // 5. Verify all 4 stores exist
    const db2 = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('format-editor')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    expect(db2.objectStoreNames.contains('handles')).toBe(true)
    expect(db2.objectStoreNames.contains('session')).toBe(true)
    expect(db2.objectStoreNames.contains('treeState')).toBe(true)
    expect(db2.objectStoreNames.contains('sidebarWidths')).toBe(true)
    db2.close()
  })
})

describe('db.ts — Generic CRUD operations (R-SP-05)', () => {
  beforeEach(async () => {
    await dbClear('session')
    await dbClear('treeState')
    await dbClear('sidebarWidths')
  })

  it('dbSet stores and dbGet retrieves a value', async () => {
    await dbSet('session', 'testKey', { key: 'testKey', value: 'hello' })
    const result = await dbGet<any>('session', 'testKey')
    expect(result).toBeDefined()
    expect(result.value).toBe('hello')
  })

  it('dbGet returns undefined for missing key', async () => {
    const result = await dbGet('session', 'nonexistent')
    expect(result).toBeUndefined()
  })

  it('dbGetAll returns all entries', async () => {
    await dbSet('session', 'a', { key: 'a', value: 1 })
    await dbSet('session', 'b', { key: 'b', value: 2 })
    const all = await dbGetAll<{ key: string; value: number }>('session')
    expect(all).toHaveLength(2)
    expect(all.find((e) => e.key === 'a')?.value).toBe(1)
    expect(all.find((e) => e.key === 'b')?.value).toBe(2)
  })

  it('dbDelete removes an entry', async () => {
    await dbSet('session', 'deleteMe', { key: 'deleteMe', value: 'gone' })
    await dbDelete('session', 'deleteMe')
    const result = await dbGet('session', 'deleteMe')
    expect(result).toBeUndefined()
  })

  it('dbClear removes all entries', async () => {
    await dbSet('session', 'x', { key: 'x', value: 1 })
    await dbSet('session', 'y', { key: 'y', value: 2 })
    await dbClear('session')
    const all = await dbGetAll('session')
    expect(all).toHaveLength(0)
  })
})

describe('db.ts — Convenience functions', () => {
  beforeEach(async () => {
    await dbClear('session')
    await dbClear('treeState')
    await dbClear('sidebarWidths')
  })

  describe('Session state', () => {
    it('setSessionState and getSessionState round-trip', async () => {
      await setSessionState('lastFile', '/path/to/file.md')
      await setSessionState('lastOpenedAt', '2025-06-15T14:30:00Z')

      const state = await getSessionState()
      expect(state.lastFile).toBe('/path/to/file.md')
      expect(state.lastOpenedAt).toBe('2025-06-15T14:30:00Z')
    })

    it('getSessionState returns empty object when nothing stored', async () => {
      const state = await getSessionState()
      expect(Object.keys(state)).toHaveLength(0)
    })
  })

  describe('Tree state', () => {
    it('setTreeState and getTreeState round-trip', async () => {
      await setTreeState('AILab', true)
      await setTreeState('Process', true)
      await setTreeState('Phase', false)

      const tree = await getTreeState()
      expect(tree.get('AILab')).toBe(true)
      expect(tree.get('Process')).toBe(true)
      expect(tree.get('Phase')).toBe(false)
      expect(tree.get('nonexistent')).toBeUndefined()
    })

    it('getTreeState returns empty map when nothing stored', async () => {
      const tree = await getTreeState()
      expect(tree.size).toBe(0)
    })
  })

  describe('Sidebar widths', () => {
    it('setSidebarWidth and getSidebarWidth round-trip', async () => {
      await setSidebarWidth('leftSidebarWidth', 520)
      const width = await getSidebarWidth('leftSidebarWidth')
      expect(width).toBe(520)
    })

    it('getSidebarWidth returns undefined for unknown panel', async () => {
      const width = await getSidebarWidth('nonexistent')
      expect(width).toBeUndefined()
    })
  })
})

describe('db.ts — Graceful degradation (R-SP-05)', () => {
  it('dbGet on unknown store returns undefined without throwing', async () => {
    const result = await dbGet('nonExistentStore' as any, 'key')
    expect(result).toBeUndefined()
  })

  it('dbSet on unknown store does not throw', async () => {
    await expect(dbSet('nonExistentStore' as any, 'key', 'value')).resolves.toBeUndefined()
  })

  it('dbGetAll on unknown store returns empty array without throwing', async () => {
    const result = await dbGetAll('nonExistentStore' as any)
    expect(result).toEqual([])
  })

  it('dbClear on unknown store does not throw', async () => {
    await expect(dbClear('nonExistentStore' as any)).resolves.toBeUndefined()
  })

  it('dbDelete on unknown store does not throw', async () => {
    await expect(dbDelete('nonExistentStore' as any, 'key')).resolves.toBeUndefined()
  })
})
