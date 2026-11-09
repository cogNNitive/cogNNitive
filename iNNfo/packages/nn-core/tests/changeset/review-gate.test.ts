import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseChangeset, reviewGateProblems } from '../../src/changeset/parser.js'
import { parseGateDeclarations, gateDeclarationProblems, reviewGateProvenanceProblems } from '../../src/changeset/gates.js'
import { serializeChangeset } from '../../src/changeset/serializer.js'
import { computeProposalSha } from '../../src/changeset/hasher.js'
import type { ChangeItem, ChangesetDocument } from '../../src/changeset/types.js'

/** A valid human console changeset with one `review_gate` change. */
function gateDoc(reviewedHash = 'a'.repeat(64)): string {
  return `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: changes
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/changes/spec_NN.md"
blueprint_version: "0.1.0"
status: proposed
proposal_sha: "1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff"
title: "Verdicts"
author_kind: human
origin: console
reviewer: Ana
workspace_id: "ws-1"
---

# NN index

* [[Change]]

# NN Change

## NN Change: c-01
op:: review_gate
target:: acme@scene-1
gate:: script
verdict:: approved
reviewed_hash:: ${reviewedHash}
notes:: Approved in the console
`
}

describe('review_gate shape validation', () => {
  /** Structural problems of every change in a doc. */
  const problemsOf = (doc: string) => parseChangeset(doc).changes.flatMap(reviewGateProblems)

  it('a valid verdict change parses with no diagnostic', () => {
    const parsed = parseChangeset(gateDoc())
    expect(parsed.changes.flatMap(reviewGateProblems)).toEqual([])
  })

  it('a missing reviewed_hash fails naming the missing key and the change id', () => {
    const doc = gateDoc().replace(/reviewed_hash:: [a-f0-9]+\n/, '')
    const problems = problemsOf(doc)
    expect(problems.length).toBeGreaterThan(0)
    const hit = problems.find((p) => /reviewed_hash/.test(p))
    expect(hit).toBeTruthy()
    expect(JSON.stringify(problems)).toMatch(/c-01/)
  })

  it('an unknown verdict fails naming the allowed values', () => {
    const doc = gateDoc().replace('verdict:: approved', 'verdict:: maybe')
    const problems = problemsOf(doc)
    const hit = problems.find((p) => /verdict/.test(p))
    expect(hit).toBeTruthy()
    expect(JSON.stringify(problems)).toMatch(/approved/)
    expect(JSON.stringify(problems)).toMatch(/needs-change/)
  })

  it('a malformed hash fails naming reviewed_hash', () => {
    const doc = gateDoc('abc123')
    const hit = problemsOf(doc).find((p) => /reviewed_hash/.test(p))
    expect(hit).toBeTruthy()
  })

  it('a verdict change on a model target is valid', () => {
    const doc = gateDoc().replace('target:: acme@scene-1', 'target:: acme')
    expect(problemsOf(doc)).toEqual([])
  })

  it('an undeclared change key fails naming the key', () => {
    const doc = gateDoc().replace('reviewed_hash::', 'mood:: happy\nreviewed_hash::')
    const hit = problemsOf(doc).find((p) => /mood/.test(p))
    expect(hit).toBeTruthy()
  })

  it('parse and serialize round-trip a review_gate change', () => {
    const parsed = parseChangeset(gateDoc())
    const round = serializeChangeset(parsed)
    const reparsed = parseChangeset(round)
    expect(reparsed.changes.flatMap(reviewGateProblems)).toEqual([])
    expect(reparsed.changes[0].op).toBe('review_gate')
    expect(reparsed.changes[0].gate).toBe('script')
    expect(reparsed.changes[0].verdict).toBe('approved')
    expect(reparsed.changes[0].reviewed_hash).toBe('a'.repeat(64))
  })

  it('the provenance markers and verdict keys are sealed into proposal_sha', () => {
    const sha = (doc: string) => {
      const parsed = parseChangeset(doc)
      return computeProposalSha(parsed.changes, parsed.frontmatter)
    }
    const base = sha(gateDoc())
    // A tampered reviewer changes the seal.
    expect(sha(gateDoc().replace('reviewer: Ana', 'reviewer: Bea'))).not.toBe(base)
    // A tampered verdict changes the seal.
    expect(sha(gateDoc().replace('verdict:: approved', 'verdict:: needs-change'))).not.toBe(base)
  })
})

describe('gate declarations come from the bluepriNNt', () => {
  /** One `review_gate` change aimed at `target`, naming `gate`. */
  const change = (target: string, gate: string): ChangeItem => ({
    id: 'c-01',
    op: 'review_gate',
    target,
    gate,
    verdict: 'approved',
    reviewed_hash: 'a'.repeat(64),
  })

  // Whatever the host blueprint declares is authoritative: no name is built in.
  const gates = { script: 'element', preview: 'element', budget: 'model' }

  it('a declared element gate on an element target is accepted', () => {
    expect(gateDeclarationProblems(change('acme@scene-1', 'script'), gates)).toEqual([])
  })

  it('a declared model gate on a bare model target is accepted', () => {
    expect(gateDeclarationProblems(change('acme', 'budget'), gates)).toEqual([])
  })

  it('a gate the blueprint does not declare is GATE_UNDECLARED', () => {
    const problems = gateDeclarationProblems(change('acme', 'publish'), gates)
    expect(problems.some((p) => p.startsWith('GATE_UNDECLARED'))).toBe(true)
    expect(problems.join(' ')).toMatch(/publish/)
  })

  it('a blueprint that declares no gates rejects every gate', () => {
    const problems = gateDeclarationProblems(change('acme@scene-1', 'script'), undefined)
    expect(problems.some((p) => p.startsWith('GATE_UNDECLARED'))).toBe(true)
  })

  it('an element gate aimed at a bare model target is GATE_TARGET_INVALID', () => {
    const problems = gateDeclarationProblems(change('acme', 'script'), gates)
    expect(problems.some((p) => p.startsWith('GATE_TARGET_INVALID'))).toBe(true)
  })

  it('a model gate aimed at an element target is GATE_TARGET_INVALID', () => {
    const problems = gateDeclarationProblems(change('acme@scene-1', 'budget'), gates)
    expect(problems.some((p) => p.startsWith('GATE_TARGET_INVALID'))).toBe(true)
  })

  it('any declared gate name is honoured, proving no name is built into nn-core', () => {
    const custom = { 'sign-off': 'model' }
    expect(gateDeclarationProblems(change('acme', 'sign-off'), custom)).toEqual([])
  })

  it('parseGateDeclarations keeps the declared names and units', () => {
    expect(parseGateDeclarations(gates)).toEqual([
      { gate: 'script', unit: 'element' },
      { gate: 'preview', unit: 'element' },
      { gate: 'budget', unit: 'model' },
    ])
  })

  it('nn-core holds no built-in gate name literal', () => {
    const dir = fileURLToPath(new URL('../../src/changeset/', import.meta.url))
    const hits: string[] = []
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.ts')) continue
      const text = readFileSync(join(dir, name), 'utf-8')
      for (const literal of ["'script'", '"script"', "'preview'", '"preview"', "'budget'", '"budget"']) {
        if (text.includes(literal)) hits.push(`${name}: ${literal}`)
      }
    }
    expect(hits).toEqual([])
  })
})

describe('applying a verdict requires a human console changeset', () => {
  /** A human console frontmatter plus the given overrides. */
  const fm = (overrides: Record<string, unknown> = {}) => ({
    author_kind: 'human',
    origin: 'console',
    reviewer: 'Ana',
    ...overrides,
  })
  const verdict = (): ChangeItem => ({
    id: 'c-01',
    op: 'review_gate',
    target: 'acme@scene-1',
    gate: 'script',
    verdict: 'approved',
    reviewed_hash: 'a'.repeat(64),
  })
  const content = (): ChangeItem => ({
    id: 'c-02',
    op: 'update_field',
    target: 'acme@scene-1&title',
    to: 'Hello',
  })

  it('a human console changeset is accepted', () => {
    expect(reviewGateProvenanceProblems([verdict()], fm())).toEqual([])
  })

  it('an agent-authored verdict is GATE_NOT_HUMAN', () => {
    const problems = reviewGateProvenanceProblems([verdict()], fm({ author_kind: 'agent' }))
    expect(problems.some((p) => p.startsWith('GATE_NOT_HUMAN'))).toBe(true)
  })

  it('an engine-authored verdict is GATE_NOT_HUMAN', () => {
    const problems = reviewGateProvenanceProblems([verdict()], fm({ author_kind: 'engine' }))
    expect(problems.some((p) => p.startsWith('GATE_NOT_HUMAN'))).toBe(true)
  })

  it('a human changeset that did not come from a console is GATE_NOT_HUMAN', () => {
    const problems = reviewGateProvenanceProblems([verdict()], fm({ origin: 'mcp' }))
    expect(problems.some((p) => p.startsWith('GATE_NOT_HUMAN'))).toBe(true)
  })

  it('a missing origin is GATE_NOT_HUMAN', () => {
    const problems = reviewGateProvenanceProblems([verdict()], fm({ origin: undefined }))
    expect(problems.some((p) => p.startsWith('GATE_NOT_HUMAN'))).toBe(true)
  })

  it('an empty reviewer is GATE_REVIEWER_REQUIRED', () => {
    const problems = reviewGateProvenanceProblems([verdict()], fm({ reviewer: '   ' }))
    expect(problems.some((p) => p.startsWith('GATE_REVIEWER_REQUIRED'))).toBe(true)
  })

  it('the default pseudonym reviewer is refused (Q9)', () => {
    const problems = reviewGateProvenanceProblems([verdict()], fm({ reviewer: 'reviewer' }))
    expect(problems.some((p) => p.startsWith('GATE_REVIEWER_REQUIRED'))).toBe(true)
  })

  it('a changeset without verdicts needs no markers', () => {
    expect(reviewGateProvenanceProblems([content()], {})).toEqual([])
  })

  it('a mixed agent changeset is refused whole by the same policy', () => {
    const problems = reviewGateProvenanceProblems([content(), verdict()], fm({ author_kind: 'agent' }))
    expect(problems.some((p) => p.startsWith('GATE_NOT_HUMAN'))).toBe(true)
  })
})