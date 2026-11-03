import { describe, it, expect } from 'vitest'
import {
  parseCitation,
  parseCitationResult,
  resolveUnitPath,
  resolveUnitPathResult,
  parseSourceRef,
  slugifyHeading,
  extractHeadings,
  resolveHeadingSection,
  splitSourceFieldValue,
  levenshteinDistance,
  SOURCE_FIELD_NAMES,
  CONFLICT_FIELD_NAMES,
} from './sourceRef.js'

describe('parseSourceRef', () => {
  it('resolves a bare path as written, with no implicit folder', () => {
    expect(parseSourceRef('clientA/report.md#market-overview')).toEqual({
      filePath: 'clientA/report.md',
      fileName: 'report.md',
      slug: 'market-overview',
      kind: 'source',
      raw: 'clientA/report.md#market-overview',
    })
  })

  it('accepts any domaiNN-relative path and gives retired prefixes no special meaning', () => {
    const r = parseSourceRef('sources/import/report.md#intro')
    expect(r?.filePath).toBe('sources/import/report.md')
    expect(r?.kind).toBe('source')
    expect(parseSourceRef('sources/import/report.md#intro')?.filePath).toBe('sources/import/report.md')
    expect(parseSourceRef('artifacts/report.md#intro')?.filePath).toBe('artifacts/report.md')
  })

  it('no longer recognises a kNNowledge/ file path (model-by-path is a removed form)', () => {
    expect(parseSourceRef('kNNowledge/Business_Plan_V_1-0-0_NN.md#stakeholders')).toBeNull()
  })

  it('parses a reference with no slug', () => {
    const r = parseSourceRef('notes.md')
    expect(r).toEqual({
      filePath: 'notes.md',
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

  it('transliterates accented letters (NFD)', () => {
    expect(slugifyHeading('Visión Estratégica')).toBe('vision-estrategica')
    expect(slugifyHeading('Café résumé')).toBe('cafe-resume')
    expect(slugifyHeading('métricas Q3 — año 2026')).toBe('metricas-q3-ano-2026')
  })

  it('still drops characters that have no ASCII transliteration', () => {
    expect(slugifyHeading('Q3 → Q4 (100%)')).toBe('q3-q4-100')
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

  it('handles bracketed list with quoted item containing commas', () => {
    expect(
      splitSourceFieldValue('["report, final (2026).md#intro", "notes.md#overview"]'),
    ).toEqual(['report, final (2026).md#intro', 'notes.md#overview'])
  })

  it('handles array input with quoted strings', () => {
    expect(splitSourceFieldValue(['"nested/data, part 1.md#sec"', 'notes.md'])).toEqual([
      'nested/data, part 1.md#sec',
      'notes.md',
    ])
  })

  it('handles single-quoted list items', () => {
    expect(
      splitSourceFieldValue("['report, final (2026).md#intro', 'notes.md#overview']"),
    ).toEqual(['report, final (2026).md#intro', 'notes.md#overview'])
  })

  it('handles escaped commas in unquoted list items', () => {
    expect(
      splitSourceFieldValue('[quarterly\\, report.md#summary, annex.md#data]'),
    ).toEqual(['quarterly, report.md#summary', 'annex.md#data'])
  })

  it('handles mixed quotes and escaped characters', () => {
    expect(
      splitSourceFieldValue('["item1\\, with quotes.md", item2\\, unquoted.md]'),
    ).toEqual(['item1, with quotes.md', 'item2, unquoted.md'])
  })

  it('treats a bare scalar as a one-element list and unquotes/unescapes if needed', () => {
    expect(splitSourceFieldValue('report.md#q3')).toEqual(['report.md#q3'])
    expect(splitSourceFieldValue('"report, final.md#q3"')).toEqual(['report, final.md#q3'])
    expect(splitSourceFieldValue('quarterly\\, report.md#q3')).toEqual(['quarterly, report.md#q3'])
  })

  it('returns [] for empty input', () => {
    expect(splitSourceFieldValue('')).toEqual([])
    expect(splitSourceFieldValue([])).toEqual([])
    expect(splitSourceFieldValue(null)).toEqual([])
    expect(splitSourceFieldValue(undefined)).toEqual([])
  })
})

describe('levenshteinDistance', () => {
  it('computes edit distance accurately (case-insensitive)', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3)
    expect(levenshteinDistance('annual_repots.md', 'annual_reports.md')).toBe(1)
    expect(levenshteinDistance('SAME', 'same')).toBe(0)
    expect(levenshteinDistance('', 'abc')).toBe(3)
    expect(levenshteinDistance('abc', '')).toBe(3)
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

describe('citations on the unified address grammar', () => {
  it('parses a hierarchical model id with an element as a kNNowledge unit address, not a path', () => {
    const cit = parseCitation('villabotijos-today/pepper-mapache@00-gancho')
    expect(cit).toMatchObject({
      kind: 'model',
      filePath: 'villabotijos-today/pepper-mapache',
      unit: { kind: 'element', slug: '00-gancho' },
      subunits: [],
    })
  })

  it('keeps the field and the body marker as subunits of an element address', () => {
    expect(parseCitation('villabotijos-today/intro@00-gancho&voice')?.subunits).toEqual(['voice'])
    expect(parseCitation('villabotijos-today/intro@00-gancho&#body')?.subunits).toEqual(['#body'])
  })

  it('parses a matrix cell, a matrix and a concept address', () => {
    expect(parseCitation('strategy@swot&r1&c1')).toMatchObject({
      kind: 'model',
      filePath: 'strategy',
      unit: { kind: 'matrix', matrixSlug: 'swot', rowSlug: 'r1', colSlug: 'c1' },
    })
    expect(parseCitation('strategy@matrix:swot')?.unit).toMatchObject({ kind: 'matrix', matrixSlug: 'swot' })
    expect(parseCitation('strategy@concept:goal&owner')).toMatchObject({
      kind: 'model',
      unit: { kind: 'header', slug: 'goal' },
      subunits: ['owner'],
    })
  })

  it('parses a bare hierarchical id as a file-level model citation', () => {
    expect(parseCitation('villabotijos-today/intro')).toMatchObject({
      kind: 'model',
      filePath: 'villabotijos-today/intro',
    })
  })

  it('keeps raw-file citations exactly as they parsed before', () => {
    expect(parseCitation('sources/import/a.md@## Intro')).toMatchObject({
      kind: 'source',
      filePath: 'sources/import/a.md',
      unit: { kind: 'header', level: 2, text: 'Intro', slug: 'intro' },
    })
    expect(parseCitation('sources/import/report.pdf_sidecar_NN.md@## Findings')).toMatchObject({
      kind: 'source',
      filePath: 'sources/import/report.pdf_sidecar_NN.md',
      unit: { kind: 'header', text: 'Findings' },
    })
    expect(parseCitation('sources/import/prices.csv@R12&price')).toMatchObject({
      kind: 'source',
      unit: { kind: 'row', id: 'R12' },
      subunits: ['price'],
    })
    expect(parseCitation('sources/import/data.json@/items/0/name')?.unit).toEqual({
      kind: 'pointer',
      pointer: '/items/0/name',
    })
  })

  it('parses a mixed sources:: list into a header unit and an element address', () => {
    const items = splitSourceFieldValue('[sources/import/a.md@## Intro, villabotijos-today/intro@00-gancho]')
    const parsed = items.map((item) => parseCitation(item))
    expect(parsed[0]?.unit?.kind).toBe('header')
    expect(parsed[1]?.unit?.kind).toBe('element')
    expect(parsed[1]?.kind).toBe('model')
  })

  it('fails (without throwing) on a model file path and names the unified grammar', () => {
    expect(parseCitation('kNNowledge/Client_business_NN.md')).toBeNull()
    const result = parseCitationResult('kNNowledge/Client_business_NN.md')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('MODEL_CITED_BY_PATH')
      expect(result.error.message).toContain('<hierarchical-id>@<slug>')
    }
  })

  it('fails on a model path carrying a heading anchor', () => {
    const raw = 'kNNowledge/Client_business_NN.md@## NN Stakeholders: Enterprise Clients'
    expect(parseCitation(raw)).toBeNull()
    const result = parseCitationResult(raw)
    expect(!result.ok && result.error.code).toBe('MODEL_CITED_BY_PATH')
  })

  it('fails on a change-heading citation and names the removed form', () => {
    const raw = 'changes/lc_tutorias_20261012T173127Z_changes_NN.md@## NN Change: c-09'
    expect(parseCitation(raw)).toBeNull()
    const result = parseCitationResult(raw)
    expect(!result.ok && result.error.code).toBe('NN_DOCUMENT_CITED_BY_HEADING')
    expect(!result.ok && result.error.message).toMatch(/removed/)
  })

  it('returns the parsed citation from parseCitationResult on success', () => {
    const result = parseCitationResult('villabotijos-today/intro@00-gancho')
    expect(result.ok && result.citation.filePath).toBe('villabotijos-today/intro')
  })

  it('gives a generic malformed failure for a value that is not a citation at all', () => {
    const result = parseCitationResult('sources/import/a.md@L10-L20')
    expect(!result.ok && result.error.code).toBe('ADDRESS_MALFORMED')
  })
})

describe('resolveUnitPath on the unified address grammar', () => {
  it('returns a diagnostic naming the removed form for a model path with an anchor', () => {
    const raw = 'kNNowledge/Client_business_NN.md@## NN Stakeholders: Enterprise Clients'
    expect(resolveUnitPath(raw)).toBeNull()
    const result = resolveUnitPathResult(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('MODEL_CITED_BY_PATH')
      expect(result.error.message).toContain('<hierarchical-id>@<slug>')
    }
  })

  it('resolves a raw-file path with or without a unit part', () => {
    expect(resolveUnitPath('sources/import/a.md@## Intro')).toEqual({
      filePath: 'sources/import/a.md',
      kind: 'source',
    })
    expect(resolveUnitPath('sources/archive/metrics/V1/metrics.md@## Totals')).toEqual({
      filePath: 'sources/archive/metrics/V1/metrics.md',
      kind: 'source',
    })
  })

  it('gives retired prefixes no special meaning: they resolve as plain paths and dangle later', () => {
    expect(resolveUnitPath('sources/nn/a.md@## Intro')?.filePath).toBe('sources/nn/a.md')
    expect(resolveUnitPath('models/Client_NN.md@## NN Stakeholders: X')?.filePath).toBe('models/Client_NN.md')
  })

  it('accepts a hierarchical model id as a model target', () => {
    expect(resolveUnitPath('villabotijos-today/intro')).toEqual({
      filePath: 'villabotijos-today/intro',
      kind: 'model',
    })
  })

  it('does not resolve a binary raw target', () => {
    expect(resolveUnitPath('sources/import/report.pdf')).toBeNull()
  })
})
