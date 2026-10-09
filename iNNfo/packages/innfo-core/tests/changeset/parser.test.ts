import { describe, it, expect } from 'vitest'
import { parseChangeset } from '../../src/changeset/parser.js'
import { serializeChangeset } from '../../src/changeset/serializer.js'
import { computeProposalSha } from '../../src/changeset/hasher.js'
import type { ChangesetDocument } from '../../src/changeset/types.js'

describe('Changeset Parser & Serializer', () => {
  const sampleMarkdown = `---
spec_version: "V_0-4-0"
parent_spec: "changes"
blueprint_version: "0.1.0"
status: proposed
proposal_sha: "1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff"
title: "Sample Changeset"
author: "agent-writer"
workspace_id: "ws-1"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/).

# NN index

* [[Change]]

# NN Change

## NN Change: c-01
op:: update_field
target:: strategy@vision&statement
from:: "Old statement"
to:: "New statement"
author:: agent-writer
notes:: Update statement for 2026

## NN Change: c-02
op:: add_element
target:: strategy@Stakeholders
concept:: Stakeholders
name:: "Community Advocates"
slug:: community_advocates
fields:: {"importance": "high"}
author:: agent-writer

## NN Change: c-03
op:: update_matrix_cell
target:: strategy@positions-roles&Engineer&Lead
from:: "Consulted"
to:: "Accountable"
author:: agent-writer

## NN Change: c-04
op:: comment
target:: strategy@vision&statement
author:: human-reviewer
notes:: Looks good, pending executive review
`

  it('parses frontmatter and change items correctly', () => {
    const doc = parseChangeset(sampleMarkdown)

    expect(doc.frontmatter.spec_version).toBe('V_0-4-0')
    expect(doc.frontmatter.parent_spec).toBe('changes')
    expect(doc.frontmatter.blueprint_version).toBe('0.1.0')
    expect(doc.frontmatter.status).toBe('proposed')
    expect(doc.frontmatter.title).toBe('Sample Changeset')
    expect(doc.frontmatter.author).toBe('agent-writer')
    expect(doc.frontmatter.workspace_id).toBe('ws-1')

    expect(doc.changes).toHaveLength(4)

    // c-01: update_field
    expect(doc.changes[0]).toEqual({
      id: 'c-01',
      op: 'update_field',
      target: 'strategy@vision&statement',
      from: 'Old statement',
      to: 'New statement',
      author: 'agent-writer',
      notes: 'Update statement for 2026',
    })

    // c-02: add_element
    expect(doc.changes[1]).toEqual({
      id: 'c-02',
      op: 'add_element',
      target: 'strategy@Stakeholders',
      concept: 'Stakeholders',
      name: 'Community Advocates',
      slug: 'community_advocates',
      fields: { importance: 'high' },
      author: 'agent-writer',
    })

    // c-03: update_matrix_cell
    expect(doc.changes[2]).toEqual({
      id: 'c-03',
      op: 'update_matrix_cell',
      target: 'strategy@positions-roles&Engineer&Lead',
      from: 'Consulted',
      to: 'Accountable',
      author: 'agent-writer',
    })

    // c-04: comment (no to/from per D15)
    expect(doc.changes[3]).toEqual({
      id: 'c-04',
      op: 'comment',
      target: 'strategy@vision&statement',
      author: 'human-reviewer',
      notes: 'Looks good, pending executive review',
    })
  })

  it('serializes changeset document preserving structure and resolution annotations', () => {
    const doc = parseChangeset(sampleMarkdown)

    // Annotate execution resolution
    doc.frontmatter.status = 'applied'
    doc.frontmatter.applied_at = '2026-10-07T12:00:00Z'
    doc.frontmatter.models = {
      strategy: {
        base_version: 'V_0-1-0',
        result_version: 'V_0-1-1',
      },
    }

    doc.changes[0].status = 'applied'
    doc.changes[0].resolution = 'Field updated successfully'

    doc.changes[1].status = 'applied'
    doc.changes[1].resolution = 'Element inserted'
    doc.changes[1].resolved_slug = 'community_advocates'

    doc.changes[2].status = 'applied'
    doc.changes[2].resolution = 'Cell updated'

    doc.changes[3].status = 'applied'
    doc.changes[3].resolution = 'Recorded review comment'

    const serialized = serializeChangeset(doc)

    expect(serialized).toContain('status: applied')
    expect(serialized).toMatch(/applied_at:\s*"?2026-10-07T12:00:00Z"?/)
    expect(serialized).toContain('## NN Change: c-01')
    expect(serialized).toContain('status:: applied')
    expect(serialized).toContain('resolution:: Field updated successfully')
    expect(serialized).toContain('resolved_slug:: community_advocates')

    // Round-trip parse check
    const reparsed = parseChangeset(serialized)
    expect(reparsed.frontmatter.status).toBe('applied')
    expect(reparsed.frontmatter.models?.strategy).toEqual({
      base_version: 'V_0-1-0',
      result_version: 'V_0-1-1',
    })
    expect(reparsed.changes[0].status).toBe('applied')
    expect(reparsed.changes[0].resolution).toBe('Field updated successfully')
    expect(reparsed.changes[1].resolved_slug).toBe('community_advocates')
    expect(reparsed.changes[3].op).toBe('comment')
  })

  it('guarantees round-trip fidelity between parsing and serialization', () => {
    const doc = parseChangeset(sampleMarkdown)
    const serialized = serializeChangeset(doc)
    const reparsed = parseChangeset(serialized)

    expect(computeProposalSha(reparsed.changes)).toBe(computeProposalSha(doc.changes))
    expect(reparsed.changes).toEqual(doc.changes)
  })
})
