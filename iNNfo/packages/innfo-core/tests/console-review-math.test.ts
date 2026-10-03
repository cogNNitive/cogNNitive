// @vitest-environment happy-dom
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

  it('verdictsByElement maps {status: count} per element and skips orphans', () => {
    const Review = loadReview()
    const byId = { a: { id: 'a' }, b: { id: 'b' } }
    const feedbackState = [
      { id: 'fb-001', element_id: 'a', status: 'applied' },
      { id: 'fb-002', element_id: 'a', status: 'stale' },
      { id: 'fb-003', element_id: 'b', status: 'applied' },
      { id: 'fb-004', element_id: 'ghost', status: 'applied' },
    ]
    const verdicts = Review.verdictsByElement(feedbackState, byId)
    expect(verdicts.a).toEqual({ applied: 1, stale: 1 })
    expect(verdicts.b).toEqual({ applied: 1 })
    expect(verdicts.ghost).toBeUndefined()
  })

  it('changedIds returns reviewed ids whose hash drifted', () => {
    const Review = loadReview()
    const reviewed = { a: 'aaaaaaaaaaaaaaaa', b: 'stale____________' }
    expect(Review.changedIds(elements, reviewed)).toEqual(['b'])
  })

  it('draftToItem converts a Draft to a schema feedback item with target.field', () => {
    const Review = loadReview()
    const draft = {
      id: 'fb-001',
      element_id: 'e1',
      concept: 'C1',
      element: 'E1',
      base_hash: 'abcdef0123456789',
      kind: 'correction',
      field: 'owner',
      original: 'A',
      proposed: 'B',
      comment: 'change it',
      created_at: '2026-01-01T00:00:00Z',
    }
    const item = Review.draftToItem(draft)
    expect(item.id).toBe('fb-001')
    expect(item.kind).toBe('correction')
    expect(item.target.element_id).toBe('e1')
    expect(item.target.concept).toBe('C1')
    expect(item.target.element).toBe('E1')
    expect(item.target.field).toBe('owner')
    expect(item.original).toBe('A')
    expect(item.proposed).toBe('B')
    expect(item.base_hash).toBe('abcdef0123456789')
    expect((item as any).status).toBeUndefined()
  })

  it('draftToItem omits target.field for a card comment', () => {
    const Review = loadReview()
    const item = Review.draftToItem({
      id: 'fb-001',
      element_id: 'e1',
      concept: 'C1',
      element: 'E1',
      base_hash: 'abcdef0123456789',
      kind: 'comment',
      comment: 'hi',
    })
    expect(item.target.field).toBeUndefined()
  })

  it('STORE_PREFIX is innfo-console:v2:', () => {
    const Review = loadReview()
    expect(Review.STORE_PREFIX).toBe('innfo-console:v2:')
  })
})
