import { describe, it, expect } from 'vitest'
import { parseChangeset } from '../../src/changeset/parser.js'
import { serializeChangeset } from '../../src/changeset/serializer.js'

const L3 = [
  '---',
  'spec_version: "V_0-4-0"',
  'level: 3',
  'parent_spec:',
  '  name: changes',
  '  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/bluepriNNts/changes/spec_NN.md"',
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
  'sources:: sources/import/interview.md@## Needs',
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
    /^replaced_sources::/.test(t)
  )
}

describe('Changeset Serializer — raw-text preservation', () => {
  it('preserves CRLF, quoted values, trailing whitespace and unknown lines; rewrites only execution keys/annotations', () => {
    const doc = parseChangeset(INPUT)
    doc.frontmatter.status = 'applied'
    doc.changes[0].status = 'applied'
    doc.changes[0].resolution = 'Applied cleanly'
    doc.changes[0].resolved_slug = 'customer-vision'
    doc.changes[0].replaced_sources = 'sources/old.md@## Needs'
    doc.changes[1].status = 'applied'

    const out = serializeChangeset(doc)

    // Line endings survive verbatim.
    expect(out).toContain('\r\n')

    // The only differing lines are the execution keys / annotation lines.
    const inputRest = INPUT.split('\n').filter((l) => !isVolatile(l))
    const outputRest = out.split('\n').filter((l) => !isVolatile(l))
    expect(outputRest).toEqual(inputRest)

    // The normative citation line is byte-identical.
    expect(out).toContain('sources:: sources/import/interview.md@## Needs')
    // Trailing whitespace and an unrecognized line are copied verbatim.
    expect(out).toContain('from:: "Old statement"   ')
    expect(out).toContain('custom_unknown:: keep me')

    // The annotations were written.
    expect(out).toContain('status: applied')
    expect(out).toContain('status:: applied')
    expect(out).toContain('resolution:: Applied cleanly')
    expect(out).toContain('resolved_slug:: customer-vision')
    expect(out).toContain('replaced_sources:: sources/old.md@## Needs')
  })

  it('renders sources:: and replaced_sources:: structurally for an in-memory document', () => {
    const doc = parseChangeset(INPUT)
    const structural = serializeChangeset({
      frontmatter: doc.frontmatter,
      changes: doc.changes,
    })
    expect(structural).toContain('sources:: sources/import/interview.md@## Needs')
    expect(structural).toContain('level: 3')
    expect(structural).toContain('parent_spec:')
  })
})
