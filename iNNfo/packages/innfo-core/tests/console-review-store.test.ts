// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const req = createRequire(import.meta.url)
const consoleDir = join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts', 'console')

type DraftStore = {
  persistent: boolean
  drafts: () => any[]
  reviewed: () => Record<string, string>
  addDraft: (input: any) => any
  removeDraft: (id: string) => any[]
  markReviewed: (id: string, hash: string) => void
  unmarkReviewed: (id: string) => void
}

function loadReview(): any {
  delete req.cache[req.resolve(join(consoleDir, 'review.js'))]
  ;(globalThis as any).InnfoUI = req(join(consoleDir, 'ui-kit.js'))
  ;(globalThis as any).InnfoReview = undefined
  delete (globalThis as any).InnfoReview
  return req(join(consoleDir, 'review.js'))
}

function memoryStorage(seed?: Record<string, string>) {
  const map = new Map<string, string>(Object.entries(seed || {}))
  return {
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    _map: map,
  }
}

describe('console-review-store (draft store v3)', () => {
  beforeEach(() => {
    ;(globalThis as any).InnfoUI = undefined
  })

  afterEach(() => {
    delete (globalThis as any).InnfoReview
  })

  it('keys drafts on innfo-console:v3:<modelId>, the stable store key only', () => {
    const Review = loadReview()
    const storage = memoryStorage()
    const store = Review.createDraftStore(storage, 'ghostbusters-model') as DraftStore

    store.addDraft({
      element_id: 'e1',
      concept: 'C',
      element: 'E1',
      base_hash: 'abcdef0123456789',
      kind: 'comment',
      comment: 'hi',
    })

    expect(storage._map.has('innfo-console:v3:ghostbusters-model')).toBe(true)
    const raw = JSON.parse(storage.getItem('innfo-console:v3:ghostbusters-model') as string)
    expect(raw.v).toBe(4)
    expect(raw.modelId).toBe('ghostbusters-model')
    expect(raw.drafts).toHaveLength(1)
  })

  it('records no store-level version (neither field nor API)', () => {
    const Review = loadReview()
    const storage = memoryStorage()
    const store = Review.createDraftStore(storage, 'm1') as DraftStore
    expect('modelVersion' in store).toBe(false)
    store.addDraft({
      element_id: 'e1',
      concept: 'C',
      element: 'E1',
      base_hash: 'abcdef0123456789',
      kind: 'comment',
      comment: 'hi',
    })
    const raw = JSON.parse(storage.getItem('innfo-console:v3:m1') as string)
    expect('modelVersion' in raw).toBe(false)
  })

  it('preserves drafts across sessions with an identical modelId', () => {
    const Review = loadReview()
    const storage = memoryStorage()
    const s1 = Review.createDraftStore(storage, 'm1') as DraftStore
    s1.addDraft({
      element_id: 'e1',
      concept: 'C',
      element: 'E1',
      base_hash: 'abcdef0123456789',
      kind: 'comment',
      comment: 'hi',
    })

    const s2 = Review.createDraftStore(storage, 'm1') as DraftStore
    expect(s2.drafts()).toHaveLength(1)
    expect(s2.drafts()[0].element_id).toBe('e1')
  })

  it('reads as empty a store persisted with the previous STORE_VERSION', () => {
    const Review = loadReview()
    const storage = memoryStorage({
      'innfo-console:v3:m1': JSON.stringify({
        v: 2,
        modelId: 'm1',
        modelVersion: 'V_0-1-0',
        drafts: [{ id: 'fb-001', element_id: 'e1' }],
      }),
    })
    const store = Review.createDraftStore(storage, 'm1') as DraftStore
    expect(store.drafts()).toEqual([])
    expect(store.reviewed()).toEqual({})
  })

  it('discards a persisted v3 store whose drafts carry the old model_id key', () => {
    const Review = loadReview()
    const storage = memoryStorage({
      'innfo-console:v3:m1': JSON.stringify({
        v: 3,
        modelId: 'm1',
        drafts: [{ id: 'fb-001', element_id: 'e1', model_id: 'old-doc', base_hash: 'abcdef0123456789' }],
        reviewed: { e1: 'reviewed' },
      }),
    })
    const store = Review.createDraftStore(storage, 'm1') as DraftStore
    expect(Review.STORE_VERSION).toBe(4)
    expect(store.drafts()).toEqual([])
    expect(store.reviewed()).toEqual({})
  })

  it('never reads the previous-version key namespace innfo-console:v2:*', () => {
    const Review = loadReview()
    const old = JSON.stringify({
      v: 2,
      modelId: 'm1',
      modelVersion: 'V_0-1-0',
      drafts: [{ id: 'fb-001', element_id: 'e1', concept: 'C', element: 'E1', base_hash: 'abcdef0123456789' }],
    })
    const storage = memoryStorage({ 'innfo-console:v2:m1': old })

    const store = Review.createDraftStore(storage, 'm1') as DraftStore
    store.addDraft({
      element_id: 'e2',
      concept: 'C',
      element: 'E2',
      base_hash: 'abcdef0123456789',
      kind: 'comment',
      comment: 'hi',
    })

    // The old store is untouched (not migrated, not cleared) and never read.
    expect(storage.getItem('innfo-console:v2:m1')).toBe(old)
    expect(store.drafts().map((d) => d.element_id)).toEqual(['e2'])
  })

  it('returns empty drafts and reviewed for corrupted JSON', () => {
    const Review = loadReview()
    const storage = memoryStorage({ 'innfo-console:v3:m1': '{not json' })
    const store = Review.createDraftStore(storage, 'm1') as DraftStore
    expect(store.drafts()).toEqual([])
    expect(store.reviewed()).toEqual({})
  })

  it('returns empty when the stored modelId does not match', () => {
    const Review = loadReview()
    const storage = memoryStorage({
      'innfo-console:v3:m1': JSON.stringify({ v: 4, modelId: 'other', drafts: [{ id: 'fb-001' }] }),
    })
    const store = Review.createDraftStore(storage, 'm1') as DraftStore
    expect(store.drafts()).toEqual([])
  })

  it('drops unknown fields on read', () => {
    const Review = loadReview()
    const storage = memoryStorage({
      'innfo-console:v3:m1': JSON.stringify({
        v: 4,
        modelId: 'm1',
        drafts: [
          {
            id: 'fb-001',
            element_id: 'e1',
            concept: 'C',
            element: 'E1',
            base_hash: 'abcdef0123456789',
            kind: 'comment',
            comment: 'hi',
            created_at: '2026-01-01T00:00:00Z',
            bogus: 'nope',
          },
        ],
        reviewed: { e1: 'abcdef0123456789' },
      }),
    })
    const store = Review.createDraftStore(storage, 'm1') as DraftStore
    const d = store.drafts()[0]
    expect(d.bogus).toBeUndefined()
    expect(d.element_id).toBe('e1')
  })

  it('addDraft throws TypeError when element_id or base_hash is missing', () => {
    const Review = loadReview()
    const store = Review.createDraftStore(memoryStorage(), 'm1') as DraftStore
    expect(() => store.addDraft({ concept: 'C', kind: 'comment', comment: 'x' })).toThrow(TypeError)
    expect(() =>
      store.addDraft({ element_id: 'e1', concept: 'C', kind: 'comment', comment: 'x' }),
    ).toThrow(TypeError)
  })

  it('falls back to a memory store with persistent:false when storage is null', () => {
    const Review = loadReview()
    const store = Review.createDraftStore(null, 'm1') as DraftStore
    expect(store.persistent).toBe(false)
    store.addDraft({
      element_id: 'e1',
      concept: 'C',
      element: 'E1',
      base_hash: 'abcdef0123456789',
      kind: 'comment',
      comment: 'hi',
    })
    expect(store.drafts()).toHaveLength(1)
  })

  it('falls back to a memory store with persistent:false when storage throws', () => {
    const Review = loadReview()
    const throwing = {
      getItem: () => {
        throw new Error('nope')
      },
      setItem: () => {
        throw new Error('nope')
      },
      removeItem: () => {
        throw new Error('nope')
      },
    }
    const store = Review.createDraftStore(throwing, 'm1') as DraftStore
    expect(store.persistent).toBe(false)
    store.addDraft({
      element_id: 'e1',
      concept: 'C',
      element: 'E1',
      base_hash: 'abcdef0123456789',
      kind: 'comment',
      comment: 'hi',
    })
    expect(store.drafts()).toHaveLength(1)
  })

  it('markReviewed and unmarkReviewed persist atomically', () => {
    const Review = loadReview()
    const storage = memoryStorage()
    const store = Review.createDraftStore(storage, 'm1') as DraftStore
    store.markReviewed('e1', 'abcdef0123456789')
    expect(store.reviewed()).toEqual({ e1: 'abcdef0123456789' })

    const reread = Review.createDraftStore(storage, 'm1') as DraftStore
    expect(reread.reviewed()).toEqual({ e1: 'abcdef0123456789' })

    reread.unmarkReviewed('e1')
    expect(reread.reviewed()).toEqual({})
    const cleared = Review.createDraftStore(storage, 'm1') as DraftStore
    expect(cleared.reviewed()).toEqual({})
  })

  const draftInput = (id: string) => ({
    element_id: id,
    concept: 'C',
    element: id,
    base_hash: 'abcdef0123456789',
    kind: 'comment',
    comment: 'hi',
  })

  it('merges drafts written by another tab instead of overwriting them', () => {
    const Review = loadReview()
    const storage = memoryStorage()
    const tabA = Review.createDraftStore(storage, 'm1') as DraftStore
    const tabB = Review.createDraftStore(storage, 'm1') as DraftStore

    const a = tabA.addDraft(draftInput('e1'))
    const b = tabB.addDraft(draftInput('e2'))
    tabA.addDraft(draftInput('e3'))

    const ids = JSON.parse(storage.getItem('innfo-console:v3:m1') as string).drafts.map(
      (d: any) => d.element_id,
    )
    expect(ids).toEqual(['e1', 'e2', 'e3'])
    // Ids are allocated after the re-read, so two tabs never mint the same one.
    expect(a.id).not.toBe(b.id)
  })

  it('removing a draft in one tab keeps the other tab drafts', () => {
    const Review = loadReview()
    const storage = memoryStorage()
    const tabA = Review.createDraftStore(storage, 'm1') as DraftStore
    const tabB = Review.createDraftStore(storage, 'm1') as DraftStore
    const a = tabA.addDraft(draftInput('e1'))
    tabB.addDraft(draftInput('e2'))

    tabA.removeDraft(a.id)
    expect(tabA.drafts().map((d) => d.element_id)).toEqual(['e2'])
  })

  it('refreshes in-memory state and notifies on a storage event from another tab', () => {
    const Review = loadReview()
    const storage = memoryStorage()
    let notified = 0
    const tabA = Review.createDraftStore(storage, 'm1', {
      onRemoteChange: () => void notified++,
    }) as DraftStore & { destroy: () => void }
    const tabB = Review.createDraftStore(storage, 'm1') as DraftStore
    tabB.addDraft(draftInput('e9'))

    expect(tabA.drafts()).toHaveLength(0)
    window.dispatchEvent(new StorageEvent('storage', { key: 'innfo-console:v3:m1' }))
    expect(tabA.drafts().map((d) => d.element_id)).toEqual(['e9'])
    expect(notified).toBe(1)

    // Other keys are ignored, and a destroyed store stops listening.
    window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }))
    expect(notified).toBe(1)
    tabA.destroy()
    window.dispatchEvent(new StorageEvent('storage', { key: 'innfo-console:v3:m1' }))
    expect(notified).toBe(1)
  })

  it('reports a failed write through onError and keeps the draft in memory', () => {
    const Review = loadReview()
    const quota = Object.assign(new Error('full'), { name: 'QuotaExceededError' })
    const storage = {
      ...memoryStorage(),
      setItem: () => {
        throw quota
      },
    }
    const errors: unknown[] = []
    const store = Review.createDraftStore(storage, 'm1', {
      onError: (err: unknown) => void errors.push(err),
    }) as DraftStore

    store.addDraft(draftInput('e1'))
    expect(errors).toEqual([quota])
    expect(store.drafts().map((d) => d.element_id)).toEqual(['e1'])
    // A later mutation builds on memory, not on a re-read that would drop the unsaved draft.
    store.addDraft(draftInput('e2'))
    expect(store.drafts().map((d) => d.element_id)).toEqual(['e1', 'e2'])
  })

  it('clearDrafts removes only the given ids, or everything without arguments', () => {
    const Review = loadReview()
    const storage = memoryStorage()
    const store = Review.createDraftStore(storage, 'm1') as DraftStore & {
      clearDrafts: (ids?: string[]) => void
    }
    const a = store.addDraft(draftInput('e1'))
    store.addDraft(draftInput('e2'))
    store.addDraft(draftInput('e3'))

    store.clearDrafts([a.id])
    expect(store.drafts().map((d) => d.element_id)).toEqual(['e2', 'e3'])
    store.clearDrafts()
    expect(store.drafts()).toEqual([])
    expect(JSON.parse(storage.getItem('innfo-console:v3:m1') as string).drafts).toEqual([])
  })

  describe('new element drafts', () => {
    it('accepts kind "new" with knowledge_id, concept and element and no element_id or base_hash', () => {
      const Review = loadReview()
      const store = Review.createDraftStore(memoryStorage(), 'm1') as DraftStore
      const saved = store.addDraft({
        kind: 'new',
        knowledge_id: 'strategy',
        concept: 'Goal',
        element: 'Grow revenue',
        proposed: { owner: 'CFO' },
      })
      expect(saved).toMatchObject({
        kind: 'new',
        knowledge_id: 'strategy',
        concept: 'Goal',
        element: 'Grow revenue',
        proposed: { owner: 'CFO' },
      })
      expect(store.drafts()).toHaveLength(1)
    })

    it.each(['knowledge_id', 'concept', 'element'])('rejects a new draft missing %s, naming the key', (key) => {
      const Review = loadReview()
      const store = Review.createDraftStore(memoryStorage(), 'm1') as DraftStore
      const input: Record<string, unknown> = { kind: 'new', knowledge_id: 'strategy', concept: 'Goal', element: 'X' }
      delete input[key]
      expect(() => store.addDraft(input)).toThrow(new RegExp(key))
      expect(store.drafts()).toEqual([])
    })

    it('does not accept the retired model_id key as the target of a new draft', () => {
      const Review = loadReview()
      const store = Review.createDraftStore(memoryStorage(), 'm1') as DraftStore
      expect(() =>
        store.addDraft({ kind: 'new', model_id: 'strategy', concept: 'Goal', element: 'X' }),
      ).toThrow(/knowledge_id/)
      const saved = store.addDraft({ kind: 'new', knowledge_id: 'strategy', concept: 'Goal', element: 'X', model_id: 'stale' })
      expect(saved).not.toHaveProperty('model_id')
    })

    it('still requires base_hash for a correction', () => {
      const Review = loadReview()
      const store = Review.createDraftStore(memoryStorage(), 'm1') as DraftStore
      expect(() =>
        store.addDraft({ kind: 'correction', element_id: 'e1', concept: 'C', field: 'f', proposed: 'x' }),
      ).toThrow(TypeError)
    })
  })
})
