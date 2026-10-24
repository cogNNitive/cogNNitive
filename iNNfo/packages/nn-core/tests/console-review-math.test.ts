// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const req = createRequire(import.meta.url)
const consoleDir = join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts', 'console')

function loadReview(): any {
  delete req.cache[req.resolve(join(consoleDir, 'review.js'))]
  ;(globalThis as any).nnUI = req(join(consoleDir, 'ui-kit.js'))
  delete (globalThis as any).nnReview
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
    delete (globalThis as any).nnReview
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

  it('isAlreadyApplied is true for a stale draft whose value now matches, including a clear', () => {
    const Review = loadReview()
    const byId = {
      a: { id: 'a', hash: 'aaaaaaaaaaaaaaaa', fields: { statement: 'New value' } },
      b: { id: 'b', hash: 'bbbbbbbbbbbbbbbb', fields: {} },
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

    // An empty proposed value on a field the element no longer has is the applied clear.
    const staleClear = { element_id: 'b', field: 'owner', proposed: '', base_hash: 'stale____________' }
    expect(Review.isAlreadyApplied(staleClear, byId)).toBe(true)
    const clearStillPresent = { element_id: 'a', field: 'statement', proposed: '', base_hash: 'stale____________' }
    expect(Review.isAlreadyApplied(clearStillPresent, byId)).toBe(false)
  })

  it('no longer exports the payload-derived counting helpers', () => {
    const Review = loadReview()
    expect(Review.badgesByElement).toBeUndefined()
    expect(Review.changeCountsByElement).toBeUndefined()
    expect(Review.changeStateOf).toBeUndefined()
    expect(Review.changeTooltip).toBeUndefined()
  })

  it('STORE_PREFIX is nn-console:v4:', () => {
    const Review = loadReview()
    expect(Review.STORE_PREFIX).toBe('nn-console:v4:')
  })
})
