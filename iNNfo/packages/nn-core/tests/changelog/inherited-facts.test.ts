import { describe, it, expect } from 'vitest'
import { buildChangeLog } from '../../src/changelog/load.js'
import { compareChanges } from '../../src/changelog/order.js'
import { compactExecutionFacts } from '../../src/changeset/execution-facts.js'
import { computeProposalSha, verifyProposalSha } from '../../src/changeset/hasher.js'
import { parseChangeset } from '../../src/changeset/parser.js'
import { serializeChangeset } from '../../src/changeset/serializer.js'
import type { ChangeItem, ChangesetDocument } from '../../src/changeset/types.js'

/**
 * change-provenance: batch-wide execution facts are written once in the changeset
 * frontmatter; a change carries only the facts that differ, and the change log
 * resolves each fact as the change's own value, else the changeset's.
 */

const SHA = 'a'.repeat(64)
const OTHER_SHA = 'b'.repeat(64)
const AT = '2026-10-23T10:00:00.123Z'
const STEM = 'dom_juan_20261023T100000Z_changes'

function text(frontmatterFacts: string, body: string): string {
  return `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: changes
  url: "https://example.test/changes/spec_NN.md"
blueprint_version: "V_0-9-0"
author: juan
${frontmatterFacts}
---

# NN Change

${body}
`
}

const INHERITED = text(
  `status: applied\napplied_at: ${AT}\nbatch: ${STEM}\nevidence_sha256:\n  sources/r.csv: ${SHA}`,
  ['c-01', 'c-02', 'c-03']
    .map((id, i) => `## NN Change: ${id}\nop:: update_field\ntarget:: m@goal&f${i}\nto:: v${i}\nevidence:: sources/r.csv@${i + 1}`)
    .join('\n\n'),
)

const PER_CHANGE = text(
  `status: applied\napplied_at: ${AT}`,
  ['c-01', 'c-02', 'c-03']
    .map(
      (id, i) =>
        `## NN Change: ${id}\nop:: update_field\ntarget:: m@goal&f${i}\nto:: v${i}\nevidence:: sources/r.csv@${i + 1}\n` +
        `status:: applied\nresolved_target:: m@goal&f${i}\nevidence_sha256:: [${SHA}]\napplied_at:: ${AT}\nbatch:: ${STEM}`,
    )
    .join('\n\n'),
)

describe('the change log resolves inherited execution facts', () => {
  it('resolves every change to the changeset facts', () => {
    const log = buildChangeLog([{ path: `changes/${STEM}_NN.md`, content: INHERITED }])
    expect(log.all).toHaveLength(3)
    for (const [i, change] of log.all.entries()) {
      expect(change).toMatchObject({
        appliedAt: AT,
        batch: STEM,
        status: 'applied',
        applied: true,
        author: 'juan',
        resolvedTarget: `m@goal&f${i}`,
        evidenceSha256: [SHA],
      })
    }
    expect(log.origin('m@goal&f1')?.id).toBe('c-02')
  })

  it('resolves a pre-existing per-change changeset to the values it carries', () => {
    const own = PER_CHANGE.replace(`## NN Change: c-01\n`, `## NN Change: c-01\nauthor:: ana\n`).replace(
      `evidence_sha256:: [${SHA}]\napplied_at:: ${AT}\nbatch:: ${STEM}`,
      `evidence_sha256:: [${OTHER_SHA}]\napplied_at:: ${AT}\nbatch:: other`,
    )
    const log = buildChangeLog([{ path: `changes/${STEM}_NN.md`, content: own }])
    expect(log.all[0]).toMatchObject({ author: 'ana', batch: 'other', evidenceSha256: [OTHER_SHA] })
    expect(log.all[1]).toMatchObject({ author: 'juan', batch: STEM, evidenceSha256: [SHA] })
  })

  it('keeps a change without resolved_target in an old changeset unresolved', () => {
    const old = text('status: applied', '## NN Change: c-01\nop:: add_element\ntarget:: m@Grow\nconcept:: Goal\nname:: Grow\nevidence:: decision')
    const log = buildChangeLog([{ path: 'changes/old_a_20261001T000000Z_changes_NN.md', content: old }])
    expect(log.all[0]!.resolvedTarget).toBeUndefined()
    expect(log.all[0]!.batch).toBeUndefined()
  })

  it('orders inherited and per-change changesets the same way', () => {
    const inherited = buildChangeLog([
      { path: `changes/${STEM}_NN.md`, content: INHERITED },
      { path: 'changes/dom_juan_20261023T090000Z_changes_NN.md', content: INHERITED.replace(AT, '2026-10-23T09:00:00.000Z') },
    ])
    const perChange = buildChangeLog([
      { path: `changes/${STEM}_NN.md`, content: PER_CHANGE },
      { path: 'changes/dom_juan_20261023T090000Z_changes_NN.md', content: PER_CHANGE.replaceAll(AT, '2026-10-23T09:00:00.000Z') },
    ])
    const key = (c: { changeset: string; id: string }) => `${c.changeset}#${c.id}`
    expect(inherited.all.map(key)).toEqual(perChange.all.map(key))
    expect([...inherited.all].sort(compareChanges).map(key)).toEqual(perChange.all.map(key))
  })
})

describe('compactExecutionFacts', () => {
  const base = (status: ChangesetDocument['frontmatter']['status'], changes: ChangeItem[]): ChangesetDocument => ({
    frontmatter: {
      spec_version: 'V_0-4-0',
      level: 3,
      parent_spec: { name: 'changes', url: 'https://example.test/changes/spec_NN.md' },
      blueprint_version: 'V_0-9-0',
      status,
      applied_at: AT,
      batch: STEM,
      evidence_sha256: { 'sources/r.csv': SHA },
      author: 'juan',
    },
    changes,
  })
  const facts = { applied_at: AT, batch: STEM, evidence_sha256: [SHA], evidence: 'sources/r.csv@1' }

  it('drops every fact a change inherits', () => {
    const doc = base('applied', [
      { id: 'c-01', op: 'update_field', target: 'm@g&f', to: 'x', status: 'applied', resolution: 'Applied successfully', resolved_target: 'm@g&f', ...facts },
    ])
    const [change] = compactExecutionFacts(doc, new Map([['c-01', 'm@g&f']])).changes
    for (const key of ['applied_at', 'batch', 'status', 'resolution', 'resolved_target', 'evidence_sha256'] as const) {
      expect(change![key], key).toBeUndefined()
    }
  })

  it('keeps the facts that differ in a partially applied changeset', () => {
    const doc = base('partially_applied', [
      { id: 'c-01', op: 'update_field', target: 'm@g&f', to: 'x', status: 'conflict', resolution: 'PRECONDITION_FAILED: x', ...facts },
      { id: 'c-02', op: 'update_field', target: 'm@Goal Name&f', to: 'y', status: 'applied', resolution: 'Applied successfully', resolved_target: 'm@goal-name&f', ...facts },
    ])
    const [conflicted, resolved] = compactExecutionFacts(doc, new Map([['c-01', 'm@g&f'], ['c-02', 'm@Goal Name&f']])).changes
    expect(conflicted).toMatchObject({ status: 'conflict', resolution: 'PRECONDITION_FAILED: x' })
    expect(resolved).toMatchObject({ status: 'applied', resolved_target: 'm@goal-name&f' })
    expect(resolved!.resolution).toBeUndefined()
    expect(resolved!.applied_at).toBeUndefined()
  })

  it('keeps a per-change sha for a cited path the frontmatter map does not carry', () => {
    const doc = base('applied', [
      { id: 'c-01', op: 'update_field', target: 'm@g&f', to: 'x', status: 'applied', ...facts, evidence: 'sources/other.md', evidence_sha256: [OTHER_SHA] },
    ])
    expect(compactExecutionFacts(doc, new Map()).changes[0]!.evidence_sha256).toEqual([OTHER_SHA])
  })
})

describe('frontmatter execution facts and the seal', () => {
  it('writes applied_at, batch and the evidence map without breaking the seal', () => {
    const change: ChangeItem = { id: 'c-01', op: 'update_field', target: 'm@g&f', to: 'x', evidence: 'sources/r.csv@1' }
    const proposed = text(`status: proposed\nproposal_sha: ${computeProposalSha([change])}`, '## NN Change: c-01\nop:: update_field\ntarget:: m@g&f\nto:: x\nevidence:: sources/r.csv@1\n')
    const doc = parseChangeset(proposed)
    doc.frontmatter.status = 'applied'
    doc.frontmatter.applied_at = AT
    doc.frontmatter.batch = STEM
    doc.frontmatter.evidence_sha256 = { 'sources/r.csv': SHA }
    const written = serializeChangeset(doc)
    expect(written).toContain(`batch: ${STEM}`)
    expect(written).toContain(`  sources/r.csv: ${SHA}`)
    const reparsed = parseChangeset(written)
    expect(reparsed.frontmatter.evidence_sha256).toEqual({ 'sources/r.csv': SHA })
    expect(verifyProposalSha(reparsed)).toBe(true)
  })
})
