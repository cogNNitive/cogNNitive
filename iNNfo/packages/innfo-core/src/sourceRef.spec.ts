import { describe, it, expect } from 'vitest'
import {
  parseSourceRef,
  slugifyHeading,
  extractHeadings,
  resolveHeadingSection,
  splitSourceFieldValue,
} from './sourceRef'

describe('parseSourceRef', () => {
  it('resolves a bare path under sources/nn/', () => {
    expect(parseSourceRef('clientA/report.md#market-overview')).toEqual({
      filePath: 'sources/nn/clientA/report.md',
      fileName: 'report.md',
      slug: 'market-overview',
      kind: 'source',
      raw: 'clientA/report.md#market-overview',
    })
  })

  it('keeps an explicit sources/nn/ prefix', () => {
    const r = parseSourceRef('sources/nn/report.md#intro')
    expect(r?.filePath).toBe('sources/nn/report.md')
    expect(r?.kind).toBe('source')
  })

  it('recognises a models/ cross-domain reference', () => {
    const r = parseSourceRef('models/Business_Plan_V_1-0-0_NN.md#stakeholders')
    expect(r?.filePath).toBe('models/Business_Plan_V_1-0-0_NN.md')
    expect(r?.kind).toBe('model')
    expect(r?.slug).toBe('stakeholders')
  })

  it('parses a reference with no slug', () => {
    const r = parseSourceRef('notes.md')
    expect(r).toEqual({
      filePath: 'sources/nn/notes.md',
      fileName: 'notes.md',
      slug: undefined,
      kind: 'source',
      raw: 'notes.md',
    })
  })

  it('rejects a #L line-range anchor', () => {
    expect(parseSourceRef('report.md#L12-L45')).toBeNull()
    expect(parseSourceRef('report.md#L7')).toBeNull()
  })

  it('rejects a src-NNN wrapper', () => {
    expect(parseSourceRef('src-007 report.md#intro')).toBeNull()
    expect(parseSourceRef('src-12')).toBeNull()
  })

  it('rejects a sources/original/ path', () => {
    expect(parseSourceRef('sources/original/report.pdf')).toBeNull()
    expect(parseSourceRef('sources/original/a.md#x')).toBeNull()
  })

  it('rejects http(s) URLs and parent-relative paths', () => {
    expect(parseSourceRef('https://example.com/a.md')).toBeNull()
    expect(parseSourceRef('../outside.md#x')).toBeNull()
  })

  it('returns null for plain non-reference strings', () => {
    expect(parseSourceRef('just some prose')).toBeNull()
    expect(parseSourceRef('')).toBeNull()
  })
})

describe('slugifyHeading', () => {
  it('lowercases and dashes whitespace', () => {
    expect(slugifyHeading('Market Overview')).toBe('market-overview')
  })

  it('strips markdown emphasis and leading hashes', () => {
    expect(slugifyHeading('## **Q3** _Milestones_')).toBe('q3-milestones')
  })

  it('drops characters outside [a-z0-9-] (no transliteration in PR 1)', () => {
    // PR 1 keeps the current editor behaviour byte-for-byte; PR 10 changes this.
    expect(slugifyHeading('Visión Estratégica')).toBe('visin-estratgica')
  })

  it('collapses and trims dashes', () => {
    expect(slugifyHeading('  a --- b  ')).toBe('a-b')
  })
})

describe('splitSourceFieldValue', () => {
  it('passes an array through, trimming and dropping blanks', () => {
    expect(splitSourceFieldValue(['a.md#x', ' b.md#y ', '', null])).toEqual(['a.md#x', 'b.md#y'])
  })

  it('splits the bracketed-list string form', () => {
    expect(splitSourceFieldValue('[present.md#overview, missing.md#intro]')).toEqual([
      'present.md#overview',
      'missing.md#intro',
    ])
  })

  it('treats a bare scalar as a one-element list', () => {
    expect(splitSourceFieldValue('report.md#q3')).toEqual(['report.md#q3'])
  })

  it('returns [] for empty input', () => {
    expect(splitSourceFieldValue('')).toEqual([])
    expect(splitSourceFieldValue([])).toEqual([])
  })
})

describe('extractHeadings', () => {
  it('numbers duplicate slugs the GitHub way', () => {
    const md = ['# Intro', 'text', '## Intro', 'more', '## Intro'].join('\n')
    const hs = extractHeadings(md)
    expect(hs.map((h) => h.slug)).toEqual(['intro', 'intro-1', 'intro-2'])
    expect(hs[1].level).toBe(2)
  })
})

describe('resolveHeadingSection', () => {
  it('returns the span up to the next same-or-higher heading', () => {
    const md = ['# A', 'a1', '## B', 'b1', 'b2', '# C', 'c1'].join('\n')
    const sec = resolveHeadingSection(md, 'b')
    expect(sec?.startLine).toBe(2)
    expect(sec?.endLine).toBe(5)
  })

  it('returns null for an unknown slug', () => {
    expect(resolveHeadingSection('# A\ntext', 'missing')).toBeNull()
  })
})
