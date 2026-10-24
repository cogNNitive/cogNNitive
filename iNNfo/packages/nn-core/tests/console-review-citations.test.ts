// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createConsoleEnv } from './helpers/console-review-env'

const env = createConsoleEnv()

describe('console review modal citations', () => {
  beforeEach(() => {
    env.setup('<!doctype html><html><head></head><body></body></html>')
    env.localStorage.clear()
  })
  afterEach(() => env.teardown())

  it('flattenCitations maps field-grouped payload citations to {origin, source, quote}', () => {
    const { Review } = env.loadConsole()
    const flat = Review.flattenCitations({
      sources: [
        { path: 'sources/a.md', anchor: 'findings', exists: true, origin: 'document', excerpt: 'body' },
        {
          path: 'sources/b.csv',
          anchor: 'm-001',
          exists: false,
          origin: 'document',
          error: 'DANGLING_FILE',
        },
      ],
    })
    expect(flat).toEqual([
      {
        field: 'sources',
        origin: 'document',
        source: 'sources/a.md \u2192 findings',
        quote: 'body',
        exists: true,
      },
      {
        field: 'sources',
        origin: 'error',
        source: 'sources/b.csv \u2192 m-001',
        exists: false,
        error: 'DANGLING_FILE',
      },
    ])
  })

  it('flattenCitations passes through arrays and rejects non-objects', () => {
    const { Review } = env.loadConsole()
    const arr = [{ origin: 'human', source: 'x' }]
    expect(Review.flattenCitations(arr)).toBe(arr)
    expect(Review.flattenCitations(undefined)).toEqual([])
    expect(Review.flattenCitations({ sources: 'nope' })).toEqual([])
  })

})
