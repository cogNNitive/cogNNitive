import { describe, it, expect } from 'vitest'
import { parseChangeset } from '../../src/changeset/parser.js'
import { serializeChangeset } from '../../src/changeset/serializer.js'
import { computeProposalSha } from '../../src/changeset/hasher.js'
import type { ChangesetDocument } from '../../src/changeset/types.js'

describe('Changeset Parser & Serializer', () => {
  const sampleMarkdown = `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: changes
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/changes/spec_NN.md"
blueprint_version: "0.1.0"
status: proposed
proposal_sha: "1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff"
title: "Sample Changeset"
author: "agent-writer"
workspace_id: "ws-1"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor; [cogNNitive](https://cognnitive.com/innfo/) shows it in the domain console.

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
    expect(doc.frontmatter.level).toBe(3)
    expect(doc.frontmatter.parent_spec).toEqual({
      name: 'changes',
      url: 'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/changes/spec_NN.md',
    })
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

  it('round-trips free-form notes/resolution with newlines, quotes and ::', () => {
    const doc = parseChangeset(sampleMarkdown)
    doc.changes[0].notes = 'Line one\nLine two with "quotes" and :: colons'
    doc.changes[0].resolution = 'resolved "value" with :: marker'

    // Normative lines are only re-rendered for an in-memory document (no rawContent);
    // a parsed document preserves its normative bytes verbatim.
    const serialized = serializeChangeset({ frontmatter: doc.frontmatter, changes: doc.changes })
    const reparsed = parseChangeset(serialized)

    expect(reparsed.changes[0].notes).toBe('Line one\nLine two with "quotes" and :: colons')
    expect(reparsed.changes[0].resolution).toBe('resolved "value" with :: marker')
  })

  it('round-trips an optional base_hash and seals it into proposal_sha', () => {
    const doc = parseChangeset(sampleMarkdown)
    expect(doc.changes[0].base_hash).toBeUndefined()
    const before = computeProposalSha(doc.changes)

    doc.changes[0].base_hash = '0123456789abcdef'
    const reparsed = parseChangeset(
      serializeChangeset({ frontmatter: doc.frontmatter, changes: doc.changes }),
    )
    expect(reparsed.changes[0].base_hash).toBe('0123456789abcdef')
    // Tampering with the precondition must break the seal; its absence leaves old seals valid.
    expect(computeProposalSha(doc.changes)).not.toBe(before)
  })

  it('rejects a file without a frontmatter block, naming the missing key', () => {
    const body = `# NN Change\n\n## NN Change: c-01\nop:: comment\ntarget:: strategy@vision&statement\n`
    expect(() => parseChangeset(body)).toThrow(/CHANGESET_FRONTMATTER_INVALID[\s\S]*frontmatter/)
  })

  it('rejects a scalar parent_spec, naming parent_spec', () => {
    const md = sampleMarkdown.replace(
      'parent_spec:\n  name: changes\n  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/changes/spec_NN.md"',
      'parent_spec: "changes"',
    )
    expect(() => parseChangeset(md)).toThrow(/CHANGESET_FRONTMATTER_INVALID[\s\S]*parent_spec/)
  })

  it('rejects a missing level, naming level', () => {
    const md = sampleMarkdown.replace('level: 3\n', '')
    expect(() => parseChangeset(md)).toThrow(/CHANGESET_FRONTMATTER_INVALID[\s\S]*level/)
  })

  it('rejects a missing parent_spec.url, naming parent_spec.url', () => {
    const md = sampleMarkdown.replace(
      '  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/changes/spec_NN.md"\n',
      '',
    )
    expect(() => parseChangeset(md)).toThrow(/CHANGESET_FRONTMATTER_INVALID[\s\S]*parent_spec\.url/)
  })

  it('parses an L3 file without proposal_sha (unsealed proposal)', () => {
    const md = sampleMarkdown.replace(/proposal_sha: "[0-9a-f]+"\n/, '')
    const doc = parseChangeset(md)
    expect(doc.frontmatter.proposal_sha).toBeFalsy()
    expect(doc.frontmatter.level).toBe(3)
  })

  it('round-trips sources:: and replaced_sources:: through parse and structural serialize', () => {
    const withSources = sampleMarkdown.replace(
      'op:: update_field\ntarget:: strategy@vision&statement',
      'op:: update_field\ntarget:: strategy@vision&statement\nsources:: sources/import/interview.md@## Needs',
    )
    const doc = parseChangeset(withSources)
    expect(doc.changes[0].sources).toBe('sources/import/interview.md@## Needs')

    // Structural serialization (document built in memory, no rawContent)
    const structural = serializeChangeset({ frontmatter: doc.frontmatter, changes: doc.changes })
    expect(structural).toContain('sources:: sources/import/interview.md@## Needs')

    doc.changes[0].replaced_sources = 'sources/old.md@## Needs'
    const structural2 = serializeChangeset({ frontmatter: doc.frontmatter, changes: doc.changes })
    expect(structural2).toContain('replaced_sources:: sources/old.md@## Needs')

    const reparsed = parseChangeset(structural2)
    expect(reparsed.changes[0].sources).toBe('sources/import/interview.md@## Needs')
    expect(reparsed.changes[0].replaced_sources).toBe('sources/old.md@## Needs')
  })
})

describe('Changeset Parser & Serializer: add_model', () => {
  const header = `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: changes
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/changes/spec_NN.md"
blueprint_version: "V_0-3-0"
status: proposed
---

# NN Change

`

  const addModel = `## NN Change: c-01
op:: add_model
target:: acme_strategy
blueprint_name:: business
blueprint_url:: https://example.test/bluepriNNts/business/spec_NN.md
name:: ACME Strategy
knowledge_version:: V_0-1-0
sources:: sources/import/old/kNNowledge/strategy_NN.md@## NN Vision: Vision
author:: agent
notes:: Migrated from the old domain
`

  it('parses an add_model change and round-trips it byte-for-byte', () => {
    const raw = header + addModel
    const doc = parseChangeset(raw)
    expect(doc.changes).toHaveLength(1)
    expect(doc.changes[0]).toMatchObject({
      op: 'add_model',
      target: 'acme_strategy',
      blueprint_name: 'business',
      blueprint_url: 'https://example.test/bluepriNNts/business/spec_NN.md',
      name: 'ACME Strategy',
      knowledge_version: 'V_0-1-0',
      sources: 'sources/import/old/kNNowledge/strategy_NN.md@## NN Vision: Vision',
    })
    expect(serializeChangeset(doc)).toBe(raw)
  })

  it('the structural serializer renders the add_model keys and parses back to the same change', () => {
    const parsed = parseChangeset(header + addModel)
    const fresh: ChangesetDocument = { frontmatter: parsed.frontmatter, changes: parsed.changes }
    const text = serializeChangeset(fresh)
    expect(text).toContain('blueprint_name:: business')
    expect(text).toContain('blueprint_url:: https://example.test/bluepriNNts/business/spec_NN.md')
    expect(text).toContain('knowledge_version:: V_0-1-0')
    expect(parseChangeset(text).changes).toEqual(parsed.changes)
  })

  it.each(['from:: x', 'to:: y', 'base_hash:: abc123'])(
    'rejects an add_model change carrying "%s", naming the change id',
    (line) => {
      expect(() => parseChangeset(header + addModel + line + '\n')).toThrow(/c-01/)
    },
  )

  it('rejects an add_model without blueprint_url and a target with "@"', () => {
    const noUrl = header + addModel.replace(/^blueprint_url::.*\n/m, '')
    expect(() => parseChangeset(noUrl)).toThrow(/blueprint_url/)
    const badTarget = header + addModel.replace('target:: acme_strategy', 'target:: acme@strategy')
    expect(() => parseChangeset(badTarget)).toThrow(/plain model id/)
  })
})
