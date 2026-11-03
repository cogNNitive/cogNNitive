import { describe, it, expect } from 'vitest'
import { parseChangeset } from '../../src/changeset/parser.js'
import { serializeChangeset } from '../../src/changeset/serializer.js'
import { computeProposalSha } from '../../src/changeset/hasher.js'

const L3 = [
  '---',
  'spec_version: "V_0-4-0"',
  'level: 3',
  'parent_spec:',
  '  name: changes',
  '  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/changes/spec_NN.md"',
  'blueprint_version: "0.1.0"',
  'status: proposed',
  'proposal_sha: "1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff"',
  'title: "CRLF Sample"',
  '---',
  '',
].join('\r\n')

const BODY = [
  '> [!NOTE]',
  '> This is an **iNNfo document** — a plain-text Markdown file.',
  '',
  '# NN index',
  '',
  '* [[Change]]',
  '',
  '# NN Change',
  '',
  '## NN Change: c-01',
  'op:: update_field',
  'target:: strategy@vision&statement',
  'evidence:: sources/import/interview.md@## Needs',
  'from:: "Old statement"   ',
  'to:: "New statement"',
  'custom_unknown:: keep me',
  'author:: agent-writer',
  '',
  '## NN Change: c-02',
  'op:: comment',
  'target:: strategy@vision&statement',
  'author:: reviewer',
  '',
].join('\r\n')

const INPUT = L3 + BODY

/** A line the serializer is allowed to rewrite: a frontmatter execution key or an annotation. */
function isVolatile(line: string): boolean {
  const t = line.replace(/\r$/, '').trim()
  return (
    t === 'status: proposed' ||
    t === 'status: applied' ||
    /^proposal_sha:/.test(t) ||
    /^applied_at:/.test(t) ||
    /^status::/.test(t) ||
    /^resolution::/.test(t) ||
    /^resolved_slug::/.test(t) ||
    /^applied_at::/.test(t) ||
    /^batch::/.test(t)
  )
}

describe('Changeset Serializer — raw-text preservation', () => {
  it('preserves CRLF, quoted values, trailing whitespace and unknown lines; rewrites only execution keys/annotations', () => {
    const doc = parseChangeset(INPUT)
    doc.frontmatter.status = 'applied'
    doc.changes[0].status = 'applied'
    doc.changes[0].resolution = 'Applied cleanly'
    doc.changes[0].resolved_slug = 'customer-vision'
    doc.changes[0].applied_at = '2026-10-23T10:00:00.000Z'
    doc.changes[0].batch = 'ws_agent_1_changes_NN'
    doc.changes[1].status = 'applied'

    const out = serializeChangeset(doc)

    // Line endings survive verbatim.
    expect(out).toContain('\r\n')

    // The only differing lines are the execution keys / annotation lines.
    const inputRest = INPUT.split('\n').filter((l) => !isVolatile(l))
    const outputRest = out.split('\n').filter((l) => !isVolatile(l))
    expect(outputRest).toEqual(inputRest)

    // The normative citation line is byte-identical.
    expect(out).toContain('evidence:: sources/import/interview.md@## Needs')
    // Trailing whitespace and an unrecognized line are copied verbatim.
    expect(out).toContain('from:: "Old statement"   ')
    expect(out).toContain('custom_unknown:: keep me')

    // The annotations were written.
    expect(out).toContain('status: applied')
    expect(out).toContain('status:: applied')
    expect(out).toContain('resolution:: Applied cleanly')
    expect(out).toContain('resolved_slug:: customer-vision')
    expect(out).toContain('applied_at:: 2026-10-23T10:00:00.000Z')
  })

  it('renders the evidence:: line structurally for an in-memory document', () => {
    const doc = parseChangeset(INPUT)
    const structural = serializeChangeset({
      frontmatter: doc.frontmatter,
      changes: doc.changes,
    })
    expect(structural).toContain('evidence:: sources/import/interview.md@## Needs')
    expect(structural).toContain('level: 3')
    expect(structural).toContain('parent_spec:')
  })

  it('emits no boilerplate preamble when rendering an in-memory document', () => {
    const doc = parseChangeset(INPUT)
    const structural = serializeChangeset({ frontmatter: doc.frontmatter, changes: doc.changes })
    expect(structural).not.toContain('> [!NOTE]')
    expect(structural).not.toContain('iNNfo document**')
    expect(structural).toContain('# NN index')
  })
})

describe('Changeset Parser & Serializer — add_model of a distributed instance (S6a)', () => {
  const changeset = `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: changes
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/changes/spec_NN.md"
blueprint_version: "V_0-7-0"
status: proposed
title: "Instance creation"
---

# NN index

* [[Change]]

# NN Change

## NN Change: c-01
op:: add_model
target:: villabotijos-today/new-episode
concept:: Video
blueprint_name:: "video-script_V_0-15-0"
blueprint_url:: "specs/bluepriNNts/video-script/spec_NN.md"
name:: "New Episode"
evidence:: decision
`

  it('parses the concept of a distributed add_model and a hierarchical target', () => {
    const doc = parseChangeset(changeset)
    const change = doc.changes[0]!

    expect(change.op).toBe('add_model')
    expect(change.target).toBe('villabotijos-today/new-episode')
    expect(change.concept).toBe('Video')
  })

  it('seals the concept into proposal_sha and re-serializes it byte for byte', () => {
    const doc = parseChangeset(changeset)
    const sealed = computeProposalSha(doc.changes)
    doc.frontmatter.proposal_sha = sealed

    const out = serializeChangeset(doc)
    expect(out).toContain('concept:: Video')
    expect(out).toContain('target:: villabotijos-today/new-episode')

    const reparsed = parseChangeset(out)
    expect(reparsed.changes[0]!.concept).toBe('Video')
    expect(computeProposalSha(reparsed.changes)).toBe(sealed)

    // The concept is proposal input, not an execution annotation.
    expect(computeProposalSha([{ ...doc.changes[0]!, concept: 'Series' }])).not.toBe(sealed)
  })

  it('renders the concept structurally when the document is built in memory', () => {
    const doc = parseChangeset(changeset)
    const structural = serializeChangeset({ frontmatter: doc.frontmatter, changes: doc.changes })
    expect(structural).toContain('concept:: Video')
  })

  it('still rejects a hierarchical add_model target that names no concept', () => {
    expect(() =>
      parseChangeset(changeset.replace('concept:: Video\n', '')),
    ).toThrow(/plain model id/)
  })
})
