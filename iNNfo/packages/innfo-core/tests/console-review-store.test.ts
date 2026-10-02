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

describe('console-review-store (draft store v2)', () => {
  beforeEach(() => {
    ;(globalThis as any).InnfoUI = undefined
  })

  afterEach(() => {
    delete (globalThis as any).InnfoReview
  })

  it('keys drafts on innfo-console:v2:<modelId>', () => {
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

    expect(storage._map.has('innfo-console:v2:ghostbusters-model')).toBe(true)
    const raw = JSON.parse(storage.getItem('innfo-console:v2:ghostbusters-model') as string)
    expect(raw.v).toBe(2)
    expect(raw.modelId).toBe('ghostbusters-model')
    expect(raw.drafts).toHaveLength(1)
  })

  it('preserves drafts across sessions with an identical modelId (rebump)', () => {
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

  it('never reads, modifies or deletes old innfo-console:drafts:* keys', () => {
    const Review = loadReview()
    const legacyKey = 'innfo-console:drafts:ghostbusters:V_0-2-1'
    const legacyValue = '[{"id":"fb-001","elementId":"e1"}]'
    const storage = memoryStorage({ [legacyKey]: legacyValue })

    const store = Review.createDraftStore(storage, 'm1') as DraftStore
    store.addDraft({
      element_id: 'e1',
      concept: 'C',
      element: 'E1',
      base_hash: 'abcdef0123456789',
      kind: 'comment',
      comment: 'hi',
    })

    expect(storage.getItem(legacyKey)).toBe(legacyValue)
    expect(store.drafts()).toHaveLength(1)
  })

  it('returns empty drafts and reviewed for corrupted JSON', () => {
    const Review = loadReview()
    const storage = memoryStorage({ 'innfo-console:v2:m1': '{not json' })
    const store = Review.createDraftStore(storage, 'm1') as DraftStore
    expect(store.drafts()).toEqual([])
    expect(store.reviewed()).toEqual({})
  })

  it('returns empty drafts and reviewed when v !== 2', () => {
    const Review = loadReview()
    const storage = memoryStorage({
      'innfo-console:v2:m1': JSON.stringify({ v: 1, modelId: 'm1', drafts: [{ id: 'fb-001' }] }),
    })
    const store = Review.createDraftStore(storage, 'm1') as DraftStore
    expect(store.drafts()).toEqual([])
    expect(store.reviewed()).toEqual({})
  })

  it('returns empty when the stored modelId does not match', () => {
    const Review = loadReview()
    const storage = memoryStorage({
      'innfo-console:v2:m1': JSON.stringify({ v: 2, modelId: 'other', drafts: [{ id: 'fb-001' }] }),
    })
    const store = Review.createDraftStore(storage, 'm1') as DraftStore
    expect(store.drafts()).toEqual([])
  })

  it('drops unknown fields on read', () => {
    const Review = loadReview()
    const storage = memoryStorage({
      'innfo-console:v2:m1': JSON.stringify({
        v: 2,
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
})
