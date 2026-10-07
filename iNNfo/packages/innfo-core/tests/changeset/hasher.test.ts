import { describe, it, expect } from 'vitest'
import { computeProposalSha, verifyProposalSha } from '../../src/changeset/hasher.js'
import type { ChangeItem, ChangesetDocument } from '../../src/changeset/types.js'

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
        parent_spec: 'changes',
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
        parent_spec: 'changes',
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
})
