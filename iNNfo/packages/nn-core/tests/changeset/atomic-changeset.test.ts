import { describe, it, expect } from 'vitest'
import { applyAtomicity } from '../../src/changeset/conflicts.js'
import type { PartitionResult } from '../../src/changeset/conflicts.js'
import { computeProposalSha } from '../../src/changeset/hasher.js'
import { parseChangeset, CHANGESET_FRONTMATTER_INVALID } from '../../src/changeset/parser.js'
import type { ChangeItem } from '../../src/changeset/types.js'

function change(id: string, to: string): ChangeItem {
  return {
    id,
    op: 'update_field',
    target: `run@${id}&state`,
    from: 'open',
    to,
    evidence: 'decision',
  }
}

function partitionOf(conflicted: string[]): PartitionResult {
  const clean = [change('c-clean', 'paused')]
  const conflicts = [change('c-a', 'completed'), change('c-b', 'failed')]
  return {
    cleanSubset: clean.filter((c) => !conflicted.includes(c.id)),
    conflictedSubset: conflicts.filter((c) => conflicted.includes(c.id)),
    conflictDiagnostics: new Map(
      conflicts
        .filter((c) => conflicted.includes(c.id))
        .map((c) => [c.id, { code: 'PRECONDITION_FAILED', message: 'from mismatch' }] as const),
    ),
  }
}

/**
 * A partition as the engine produces it: every change lands in exactly one subset.
 */
function fullPartition(conflicted: string[]): PartitionResult {
  const all = [change('c-clean', 'paused'), change('c-a', 'completed'), change('c-b', 'failed')]
  return {
    cleanSubset: all.filter((c) => !conflicted.includes(c.id)),
    conflictedSubset: all.filter((c) => conflicted.includes(c.id)),
    conflictDiagnostics: new Map(
      conflicted.map(
        (id) => [id, { code: 'PRECONDITION_FAILED', message: 'from mismatch' }] as const,
      ),
    ),
  }
}

describe('applyAtomicity (design D8)', () => {
  it('leaves a non-atomic partition untouched', () => {
    const input = fullPartition(['c-a'])
    const out = applyAtomicity(input, undefined)
    expect(out).toBe(input)
    expect(out.cleanSubset.map((c) => c.id)).toEqual(['c-clean', 'c-b'])
    expect(out.conflictedSubset.map((c) => c.id)).toEqual(['c-a'])
  })

  it('leaves an explicitly non-atomic partition untouched', () => {
    const input = fullPartition(['c-a'])
    expect(applyAtomicity(input, false)).toBe(input)
  })

  it('leaves a conflict-free atomic partition untouched', () => {
    const input = fullPartition([])
    const out = applyAtomicity(input, true)
    expect(out).toBe(input)
    expect(out.cleanSubset.map((c) => c.id)).toEqual(['c-clean', 'c-a', 'c-b'])
    expect(out.conflictedSubset).toEqual([])
  })

  it('one conflicted change conflicts every change and nothing stays clean', () => {
    const out = applyAtomicity(fullPartition(['c-a']), true)
    expect(out.cleanSubset).toEqual([])
    expect(out.conflictedSubset.map((c) => c.id).sort()).toEqual(['c-a', 'c-b', 'c-clean'])
    for (const c of out.conflictedSubset) {
      expect(c.status).toBe('conflict')
      expect(c.resolution).toContain('ATOMIC_CHANGESET_CONFLICT')
    }
  })

  it('reports the first conflict as the reason on every change', () => {
    const out = applyAtomicity(fullPartition(['c-b']), true)
    const diag = out.conflictDiagnostics.get('c-clean')
    expect(diag?.code).toBe('ATOMIC_CHANGESET_CONFLICT')
    // The original conflict is named inside the message, so the fix-and-retry loop
    // still tells the author what actually failed.
    expect(diag?.message).toContain('PRECONDITION_FAILED')
    expect(out.conflictDiagnostics.get('c-b')).toEqual(diag)
    expect(out.conflictDiagnostics.get('c-a')).toEqual(diag)
  })
})

describe('sealed atomicity', () => {
  const changes = [change('c-a', 'paused'), change('c-b', 'completed')]

  it('changing atomic changes the seal', () => {
    const partial = computeProposalSha(changes, {})
    const atomic = computeProposalSha(changes, { atomic: true })
    expect(atomic).not.toBe(partial)
  })

  it('an explicit false seals like an absent marker, so a draft is not re-sealed by noise', () => {
    expect(computeProposalSha(changes, { atomic: false })).toBe(computeProposalSha(changes, {}))
  })

  it('atomic coexists with the provenance markers', () => {
    const sha = computeProposalSha(changes, { author_kind: 'agent', atomic: true })
    expect(sha).toMatch(/^[0-9a-f]{64}$/)
    expect(sha).not.toBe(computeProposalSha(changes, { atomic: true }))
  })
})

const HEADER = `---
spec_version: "V_0-5-0"
level: 3
parent_spec:
  name: changes
  url: "https://example.test/changes/spec_NN.md"
blueprint_version: "V_0-13-0"
status: proposed
%s
---

# NN Change

## NN Change: c-a
op:: update_field
target:: run@c-a&state
to:: paused
evidence:: decision
`

describe('atomic frontmatter parsing', () => {
  it('accepts atomic: true', () => {
    const doc = parseChangeset(HEADER.replace('%s', 'atomic: true'))
    expect(doc.frontmatter.atomic).toBe(true)
  })

  it('accepts atomic: false', () => {
    const doc = parseChangeset(HEADER.replace('%s', 'atomic: false'))
    expect(doc.frontmatter.atomic).toBe(false)
  })

  it('leaves atomic undefined when the key is absent', () => {
    const doc = parseChangeset(HEADER.replace('%s', ''))
    expect(doc.frontmatter.atomic).toBeUndefined()
  })

  it('rejects a non-boolean atomic', () => {
    expect(() => parseChangeset(HEADER.replace('%s', 'atomic: "true"'))).toThrow(
      CHANGESET_FRONTMATTER_INVALID,
    )
  })
})
