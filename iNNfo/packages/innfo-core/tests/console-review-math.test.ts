// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const req = createRequire(import.meta.url)
const consoleDir = join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts', 'console')

function loadReview(): any {
  delete req.cache[req.resolve(join(consoleDir, 'review.js'))]
  ;(globalThis as any).InnfoUI = req(join(consoleDir, 'ui-kit.js'))
  delete (globalThis as any).InnfoReview
  return req(join(consoleDir, 'review.js'))
}

const elements = [
  { id: 'a', concept: 'C1', name: 'A', hash: 'aaaaaaaaaaaaaaaa' },
  { id: 'b', concept: 'C1', name: 'B', hash: 'bbbbbbbbbbbbbbbb' },
  { id: 'c', concept: 'C1', name: 'C', hash: 'cccccccccccccccc' },
  { id: 'd', concept: 'C2', name: 'D', hash: 'dddddddddddddddd' },
]

describe('console-review-math', () => {
  afterEach(() => {
    delete (globalThis as any).InnfoReview
  })

  it('progressByConcept counts total elements and pending (unsent) changes per concept', () => {
    const Review = loadReview()
    const drafts = [
      { id: 'fb-001', concept: 'C1', element_id: 'b' },
      { id: 'fb-002', concept: 'C1', element_id: 'c' },
    ]
    const progress = Review.progressByConcept(elements, drafts)
    expect(progress.C1).toEqual({ total: 3, pending: 2 })
    expect(progress.C2).toEqual({ total: 1, pending: 0 })
  })

  it('has no reviewed-mark math any more', () => {
    const Review = loadReview()
    expect(Review.reviewState).toBeUndefined()
    expect(Review.changedIds).toBeUndefined()
  })

  it('isTargetChanged is true if element is missing or hash drift', () => {
    const Review = loadReview()
    const byId = { a: { id: 'a', hash: 'aaaaaaaaaaaaaaaa' } }
    expect(Review.isTargetChanged({ element_id: 'a', base_hash: 'aaaaaaaaaaaaaaaa' }, byId)).toBe(false)
    expect(Review.isTargetChanged({ element_id: 'a', base_hash: 'stale____________' }, byId)).toBe(true)
    expect(Review.isTargetChanged({ element_id: 'zz', base_hash: 'aaaaaaaaaaaaaaaa' }, byId)).toBe(true)
  })

  it('isAlreadyApplied is true only for stale drafts whose proposed equals current', () => {
    const Review = loadReview()
    const byId = {
      a: { id: 'a', hash: 'aaaaaaaaaaaaaaaa', fields: { statement: 'New value' } },
    }
    const staleApplied = { element_id: 'a', field: 'statement', proposed: 'New value', base_hash: 'stale____________' }
    const staleDiverged = { element_id: 'a', field: 'statement', proposed: 'Other value', base_hash: 'stale____________' }
    const fresh = { element_id: 'a', field: 'statement', proposed: 'New value', base_hash: 'aaaaaaaaaaaaaaaa' }
    const noProposed = { element_id: 'a', field: 'statement', base_hash: 'stale____________' }
    expect(Review.isAlreadyApplied(staleApplied, byId)).toBe(true)
    expect(Review.isAlreadyApplied(staleDiverged, byId)).toBe(false)
    expect(Review.isAlreadyApplied(fresh, byId)).toBe(false)
    expect(Review.isAlreadyApplied(noProposed, byId)).toBe(false)
    expect(Review.isAlreadyApplied(staleApplied, {})).toBe(false)
  })

  it('badgesByElement maps {status: count} from history + proposed changes, skipping orphans', () => {
    const Review = loadReview()
    const list = [
      { id: 'a', history: [{ status: 'applied' }, { status: 'conflict' }, { status: 'proposed' }] },
      { id: 'b' },
    ]
    const changes = [
      { status: 'proposed', changes: [{ target: 'm@a&f' }, { target: 'm@ghost&f' }] },
      { status: 'applied', changes: [{ target: 'm@b&f' }] },
    ]
    const badges = Review.badgesByElement(list, changes)
    expect(badges.a).toEqual({ applied: 1, conflict: 1, proposed: 1 })
    expect(badges.b).toBeUndefined()
    expect(badges.ghost).toBeUndefined()
  })

  it('changeCountsByElement folds local drafts into the changeset counts', () => {
    const Review = loadReview()
    const list = [
      { id: 'a', history: [{ status: 'applied' }] },
      { id: 'b' },
    ]
    const changes = [
      { status: 'proposed', changes: [{ target: 'm@a&f' }] },
    ]
    const drafts = [
      { id: 'fb-001', element_id: 'b', kind: 'comment' },
      { id: 'fb-002', element_id: 'b', kind: 'correction', field: 'x', proposed: 'y' },
    ]
    const counts = Review.changeCountsByElement(list, changes, drafts)
    expect(counts.a).toEqual({ applied: 1, proposed: 1 })
    expect(counts.b).toEqual({ local: 2 })
  })

  it('changeStateOf picks one state: conflict > local > proposed > applied', () => {
    const Review = loadReview()
    expect(Review.changeStateOf({ applied: 2, proposed: 1 })).toBe('proposed')
    expect(Review.changeStateOf({ applied: 2, proposed: 1, local: 1 })).toBe('local')
    expect(Review.changeStateOf({ applied: 2, conflict: 1, local: 1 })).toBe('conflict')
    expect(Review.changeStateOf({ applied: 1 })).toBe('applied')
    expect(Review.changeStateOf({})).toBeNull()
  })

  it('changeTooltip enumerates every state that is present', () => {
    const Review = loadReview()
    expect(Review.changeTooltip('proposed', { applied: 2, proposed: 1, local: 3 })).toBe(
      '3 unsent, 1 proposed, 2 applied',
    )
    expect(Review.changeTooltip('conflict', { conflict: 1 })).toBe('1 in conflict')
  })

  it('STORE_PREFIX is innfo-console:v3:', () => {
    const Review = loadReview()
    expect(Review.STORE_PREFIX).toBe('innfo-console:v3:')
  })
})
