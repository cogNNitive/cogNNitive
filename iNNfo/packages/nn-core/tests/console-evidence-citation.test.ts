import { describe, it, expect } from 'vitest'
import { resolveCitation, resolveEvidenceCitation } from '../src/console/citations.js'
import { attachChangesetHistory } from '../src/console/element-history.js'

describe('resolveCitation — href for "Open original"', () => {
  it('carries the workspace-relative path as href when the file resolves', () => {
    const resolver = (filePath: string) =>
      filePath === 'sources/import/report.md'
        ? { exists: true, content: ['## Findings', 'A finding.', ''].join('\n') }
        : { exists: false }

    const result = resolveCitation('sources/import/report.md@## Findings', 'evidence', resolver)
    expect(result.exists).toBe(true)
    expect(result.href).toBe('sources/import/report.md')
  })
})

describe('resolveEvidenceCitation', () => {
  const resolver = () => ({ exists: false })

  it('treats the literal `decision` as a human-sourced entry, not a dangling file', () => {
    expect(resolveEvidenceCitation('decision', resolver)).toEqual({
      path: 'decision',
      exists: true,
      field: 'evidence',
      origin: 'human',
    })
  })

  it('treats the literal `unknown` as an untraceable document entry', () => {
    expect(resolveEvidenceCitation('unknown', resolver)).toEqual({
      path: 'unknown',
      exists: true,
      field: 'evidence',
      origin: 'document',
    })
  })

  it('resolves anything else through resolveCitation', () => {
    const found = (filePath: string) =>
      filePath === 'sources/a.md'
        ? { exists: true, content: ['## H', 'Body.', ''].join('\n') }
        : { exists: false }

    const result = resolveEvidenceCitation('sources/a.md@## H', found)
    expect(result).toMatchObject({
      path: 'sources/a.md',
      href: 'sources/a.md',
      anchor: expect.any(String),
      field: 'evidence',
      exists: true,
    })
  })
})

describe('attachChangesetHistory — evidenceCitation', () => {
  const elements: any[] = [{ id: 'e-1', name: 'E 1' }]
  const changesets = [
    {
      path: 'changes/dom_changes_NN.md',
      status: 'applied',
      changes: [
        {
          id: 'c-01',
          op: 'update_field',
          target: 'Domain@e-1&summary',
          evidence: 'sources/a.md@## H',
        },
      ],
    },
  ]

  it('attaches the resolved evidence citation when a resolver is provided', () => {
    attachChangesetHistory(elements, changesets as any, (evidence) => ({
      path: evidence.split('@')[0],
      exists: true,
      field: 'evidence',
      origin: 'document',
    }))
    expect(elements[0].history?.[0].evidenceCitation).toMatchObject({
      path: 'sources/a.md',
      origin: 'document',
    })
  })

  it('omits evidenceCitation when no resolver is provided', () => {
    elements[0].history = undefined
    attachChangesetHistory(elements, changesets as any)
    expect(elements[0].history?.[0].evidence).toBe('sources/a.md@## H')
    expect(elements[0].history?.[0].evidenceCitation).toBeUndefined()
  })
})
