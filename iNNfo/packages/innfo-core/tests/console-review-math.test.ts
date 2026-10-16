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

  it('progressByConcept computes reviewed/total and pending drafts per concept', () => {
    const Review = loadReview()
    const reviewed = { a: 'aaaaaaaaaaaaaaaa' }
    const drafts = [
      { id: 'fb-001', concept: 'C1', element_id: 'b' },
      { id: 'fb-002', concept: 'C1', element_id: 'c' },
    ]
    const progress = Review.progressByConcept(elements, drafts, reviewed)
    expect(progress.C1).toEqual({ reviewed: 1, total: 3, pending: 2 })
    expect(progress.C2).toEqual({ reviewed: 0, total: 1, pending: 0 })
  })

  it('reviewState returns none / reviewed / changed', () => {
    const Review = loadReview()
    const reviewed = { a: 'aaaaaaaaaaaaaaaa', b: 'stalehash________' }
    expect(Review.reviewState({ id: 'a', hash: 'aaaaaaaaaaaaaaaa' }, reviewed)).toBe('reviewed')
    expect(Review.reviewState({ id: 'b', hash: 'bbbbbbbbbbbbbbbb' }, reviewed)).toBe('changed')
    expect(Review.reviewState({ id: 'c', hash: 'cccccccccccccccc' }, reviewed)).toBe('none')
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

  it('changedIds returns reviewed ids whose hash drifted', () => {
    const Review = loadReview()
    const reviewed = { a: 'aaaaaaaaaaaaaaaa', b: 'stale____________' }
    expect(Review.changedIds(elements, reviewed)).toEqual(['b'])
  })

  it('STORE_PREFIX is innfo-console:v3:', () => {
    const Review = loadReview()
    expect(Review.STORE_PREFIX).toBe('innfo-console:v3:')
  })
})
