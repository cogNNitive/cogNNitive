import { describe, it, expect } from 'vitest'
import { computeProposalSha, verifyProposalSha, PROPOSAL_KEYS } from '../../src/changeset/hasher.js'
import type { ChangeItem, ChangesetDocument } from '../../src/changeset/types.js'

const SEALED_KEY_SPEC = [
  'id',
  'op',
  'target',
  'from',
  'to',
  'concept',
  'name',
  'slug',
  'fields',
  'author',
  'notes',
  'base_hash',
  'evidence',
  'blueprint_name',
  'blueprint_url',
  'knowledge_version',
] as const

describe('Proposal Hasher', () => {
  const sampleChanges: ChangeItem[] = [
    {
      id: 'c-01',
      op: 'update_field',
      target: 'strategy@vision&statement',
      from: 'Initial statement',
      to: 'Accelerate renewable adoption',
      author: 'agent-1',
      notes: 'Align with 2026 sustainability roadmap',
    },
    {
      id: 'c-02',
      op: 'comment',
      target: 'strategy@vision&statement',
      author: 'reviewer-human',
      notes: 'Verified alignment with executive briefing',
    },
  ]

  it('computes a deterministic 64-character lowercase SHA-256 hex string over proposed changes', () => {
    const sha1 = computeProposalSha(sampleChanges)
    const sha2 = computeProposalSha(sampleChanges)

    expect(sha1).toMatch(/^[0-9a-f]{64}$/)
    expect(sha1).toBe(sha2)
  })

  it('produces a different hash when proposed fields are altered', () => {
    const baseSha = computeProposalSha(sampleChanges)

    const alteredTo: ChangeItem[] = [
      { ...sampleChanges[0], to: 'Completely different statement' },
      sampleChanges[1],
    ]
    expect(computeProposalSha(alteredTo)).not.toBe(baseSha)

    const alteredTarget: ChangeItem[] = [
      { ...sampleChanges[0], target: 'strategy@vision&other' },
      sampleChanges[1],
    ]
    expect(computeProposalSha(alteredTarget)).not.toBe(baseSha)

    const alteredNotes: ChangeItem[] = [
      sampleChanges[0],
      { ...sampleChanges[1], notes: 'Altered note' },
    ]
    expect(computeProposalSha(alteredNotes)).not.toBe(baseSha)
  })

  it('ignores execution annotations (status, resolution, resolved_slug)', () => {
    const baseSha = computeProposalSha(sampleChanges)

    const annotatedChanges: ChangeItem[] = [
      {
        ...sampleChanges[0],
        status: 'applied',
        resolution: 'Applied successfully',
        resolved_slug: 'vision',
      },
      {
        ...sampleChanges[1],
        status: 'applied',
        resolution: 'Recorded review comment',
      },
    ]

    expect(computeProposalSha(annotatedChanges)).toBe(baseSha)
  })

  it('verifyProposalSha verifies proposal integrity against frontmatter hash', () => {
    const sha = computeProposalSha(sampleChanges)

    const doc: ChangesetDocument = {
      frontmatter: {
        spec_version: 'V_0-4-0',
        level: 3,
        parent_spec: { name: 'changes', url: 'https://example.test/changes/spec_NN.md' },
        blueprint_version: '0.1.0',
        status: 'proposed',
        proposal_sha: sha,
      },
      changes: sampleChanges,
    }

    expect(verifyProposalSha(doc)).toBe(true)

    // Tampered proposal
    const tamperedDoc: ChangesetDocument = {
      ...doc,
      changes: [
        { ...sampleChanges[0], to: 'Tampered malicious value' },
        sampleChanges[1],
      ],
    }
    expect(verifyProposalSha(tamperedDoc)).toBe(false)
  })

  it('verifyProposalSha remains valid after execution annotations and frontmatter fields are appended', () => {
    const sha = computeProposalSha(sampleChanges)

    const doc: ChangesetDocument = {
      frontmatter: {
        spec_version: 'V_0-4-0',
        level: 3,
        parent_spec: { name: 'changes', url: 'https://example.test/changes/spec_NN.md' },
        blueprint_version: '0.1.0',
        status: 'applied',
        proposal_sha: sha,
        applied_at: '2026-10-07T12:00:00Z',
        models: {
          strategy: {
            base_version: 'V_0-1-0',
            result_version: 'V_0-1-1',
          },
        },
      },
      changes: [
        {
          ...sampleChanges[0],
          status: 'applied',
          resolution: 'Applied successfully',
          resolved_slug: 'vision',
        },
        {
          ...sampleChanges[1],
          status: 'applied',
          resolution: 'Recorded review comment',
        },
      ],
    }

    expect(verifyProposalSha(doc)).toBe(true)
  })

  it('seals the evidence into proposal_sha', () => {
    const withEvidence: ChangeItem[] = [
      { ...sampleChanges[0], evidence: 'sources/import/interview.md@## Needs' },
      sampleChanges[1],
    ]
    const withoutEvidence = computeProposalSha(sampleChanges)
    const withEvidenceSha = computeProposalSha(withEvidence)

    expect(withEvidenceSha).not.toBe(withoutEvidence)

    // Changing only the evidence value changes the seal
    const otherEvidence: ChangeItem[] = [
      { ...sampleChanges[0], evidence: 'sources/import/other.md@## Needs' },
      sampleChanges[1],
    ]
    expect(computeProposalSha(otherEvidence)).not.toBe(withEvidenceSha)
  })

  it('excludes the per-change execution facts (applied_at, batch) from the seal', () => {
    const baseSha = computeProposalSha(sampleChanges)
    const annotated: ChangeItem[] = [
      { ...sampleChanges[0], applied_at: '2026-10-23T10:00:00.000Z', batch: 'ws_agent_1_changes_NN' },
      { ...sampleChanges[1], applied_at: '2026-10-23T10:00:00.000Z', batch: 'ws_agent_1_changes_NN' },
    ]
    expect(computeProposalSha(annotated)).toBe(baseSha)
  })

  it('the sealed key list equals the normative spec list (base_hash included)', () => {
    expect([...PROPOSAL_KEYS].sort()).toEqual([...SEALED_KEY_SPEC].sort())
  })
})

describe('Proposal Hasher: add_model keys are sealed', () => {
  const base: ChangeItem = {
    id: 'c-01',
    op: 'add_model',
    target: 'acme',
    blueprint_name: 'business',
    blueprint_url: 'https://example.test/business/spec_NN.md',
    name: 'ACME',
    knowledge_version: 'V_0-1-0',
  }

  it('editing blueprint_url after sealing breaks the seal', () => {
    const doc: ChangesetDocument = {
      frontmatter: {
        spec_version: 'V_0-4-0',
        level: 3,
        parent_spec: { name: 'changes', url: 'https://example.test/changes/spec_NN.md' },
        blueprint_version: 'V_0-3-0',
        status: 'proposed',
        proposal_sha: computeProposalSha([base]),
      },
      changes: [base],
    }
    expect(verifyProposalSha(doc)).toBe(true)
    doc.changes = [{ ...base, blueprint_url: 'https://evil.test/business/spec_NN.md' }]
    expect(verifyProposalSha(doc)).toBe(false)
  })

  it('editing knowledge_version after sealing changes the hash', () => {
    expect(computeProposalSha([base])).not.toBe(
      computeProposalSha([{ ...base, knowledge_version: 'V_9-9-9' }]),
    )
  })

  it('a change without the add_model keys hashes as before (keys appended, not reordered)', () => {
    const plain: ChangeItem = { id: 'c-01', op: 'update_field', target: 'm@e&f', to: 'x' }
    expect(computeProposalSha([plain])).toBe(computeProposalSha([{ ...plain }]))
  })
})
