import { describe, it, expect } from 'vitest'
import { parseChangeset, reviewGateProblems } from '../../src/changeset/parser.js'
import { serializeChangeset } from '../../src/changeset/serializer.js'
import { computeProposalSha } from '../../src/changeset/hasher.js'
import type { ChangesetDocument } from '../../src/changeset/types.js'

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