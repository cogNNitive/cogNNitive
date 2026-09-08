import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  parseKnowledgeUnitRef,
  serializeKnowledgeUnitRef,
  slugifyHeading,
  slugifyUnitHeading,
  normalizeName,
} from './sourceRef'
import { parseCsvTable } from './csvTable'
import { resolveUnit } from './unitResolve'

const ghost = readFileSync(new URL('../tests/fixtures/ku-ghostbusters.md', import.meta.url), 'utf8')
const metrics = readFileSync(new URL('../tests/fixtures/metricas_q3.csv', import.meta.url), 'utf8')

describe('parseKnowledgeUnitRef grammar', () => {
  it('parses a level-2 element header with concept-aware slug', () => {
    const r = parseKnowledgeUnitRef(
      'models/Ghostbusters_V_0-2-3_business_NN.md@## NN Person: Dr. Egon Spengler',
    )
    expect(r).toMatchObject({
      filePath: 'models/Ghostbusters_V_0-2-3_business_NN.md',
      fileName: 'Ghostbusters_V_0-2-3_business_NN.md',
      kind: 'model',
      unit: { kind: 'header', level: 2, slug: 'nn-person--dr-egon-spengler' },
      subunits: [],
    })
  })

  it('parses level-1 and level-3 headers', () => {
    expect(parseKnowledgeUnitRef('sources/nn/notes.md@# Overview')?.unit).toMatchObject({
      kind: 'header',
      level: 1,
      slug: 'overview',
    })
    expect(parseKnowledgeUnitRef('sources/nn/notes.md@### Deep Dive')?.unit).toMatchObject({
      kind: 'header',
      level: 3,
      slug: 'deep-dive',
    })
  })

  it('resolves unqualified markdown under sources/nn', () => {
    const r = parseKnowledgeUnitRef('notes.md@## Background')
    expect(r).toMatchObject({ filePath: 'sources/nn/notes.md', kind: 'source' })
  })

  it('parses a CSV row by explicit key value', () => {
    const r = parseKnowledgeUnitRef('sources/nn/metricas_q3.csv@104')
    expect(r).toMatchObject({
      filePath: 'sources/nn/metricas_q3.csv',
      kind: 'source',
      unit: { kind: 'row', id: '104' },
      subunits: [],
    })
  })

  it('keeps row-ids case-sensitive and verbatim', () => {
    expect(parseKnowledgeUnitRef('m.csv@Lucas')?.unit).toMatchObject({ kind: 'row', id: 'Lucas' })
  })

  it('parses field and column subunits (names only, never values)', () => {
    const md = parseKnowledgeUnitRef(
      'models/G_V_0-2-3_business_NN.md@## NN Person: Dr. Egon Spengler&compensation',
    )
    expect(md?.subunits).toEqual(['compensation'])
    const csv = parseKnowledgeUnitRef('sources/nn/metricas_q3.csv@104&mrr_usd')
    expect(csv?.subunits).toEqual(['mrr_usd'])
  })

  it('parses a matrix cell as unit + row + column subunits', () => {
    const r = parseKnowledgeUnitRef(
      'models/G_V_0-2-3_business_NN.md@# NN matrices: journey map&First Contact&Relief',
    )
    expect(r?.subunits).toEqual(['First Contact', 'Relief'])
  })

  it('decodes percent-escaped names split-safely', () => {
    const r = parseKnowledgeUnitRef('sources/nn/notes.md@## R%26D Results')
    expect(r?.unit).toMatchObject({ kind: 'header', text: 'R&D Results' })
  })

  it.each([
    'sources/nn/report.md',
    'models/x.md@',
    'models/x.md@## ',
    'models/x.md@## Title&',
    'C:\\temp\\file.md@## Title',
    'https://example.com/a.md@## Title',
    '../outside.md@## Title',
    'sources/original/a.csv@104',
    'models/x.md#L12-L45',
  ])('rejects %s', (input) => {
    expect(parseKnowledgeUnitRef(input)).toBeNull()
  })

  it('rejects a lone percent sign (must be authored as %25)', () => {
    expect(parseKnowledgeUnitRef('sources/nn/notes.md@## 100%')).toBeNull()
  })
})

describe('slugifyHeading flat cases (mirrored by the trannsform parity test)', () => {
  it.each([
    ['さくら 桜', 'さくら-桜'],
    ['NN Person: Dr. Egon Spengler', 'nn-person-dr-egon-spengler'],
    ['a--b', 'a--b'],
  ])('slugs %s to %s', (input, expected) => {
    expect(slugifyHeading(input)).toBe(expected)
  })
})

describe('slugifyUnitHeading', () => {
  it('keeps the Concept/Element boundary as --', () => {
    expect(slugifyUnitHeading(2, 'NN Person: Dr. Egon Spengler')).toMatchObject({
      level: 2,
      slug: 'nn-person--dr-egon-spengler',
    })
  })

  it('only the boundary colon becomes --, inner colons slugify away', () => {
    expect(slugifyUnitHeading(2, 'NN Messages: "We\'re ready: believe you."')).toMatchObject({
      slug: 'nn-messages--were-ready-believe-you',
    })
  })

  it('slugs generic headers flat', () => {
    expect(slugifyUnitHeading(1, 'Summary Statistics')).toMatchObject({
      slug: 'summary-statistics',
    })
  })
})

describe('normalizeName', () => {
  it('trims, lowercases, maps whitespace to underscore, preserves underscore', () => {
    expect(normalizeName('mrr_usd')).toBe('mrr_usd')
    expect(normalizeName('  Relationship Model ')).toBe('relationship_model')
    expect(normalizeName('MRR USD')).toBe('mrr_usd')
  })
})

describe('serializeKnowledgeUnitRef', () => {
  it('round-trips canonical pointers', () => {
    const inputs = [
      'models/G_V_0-2-3_business_NN.md@## NN Person: Dr. Egon Spengler&compensation',
      'sources/nn/metricas_q3.csv@104&mrr_usd',
    ]
    for (const input of inputs) {
      const ref = parseKnowledgeUnitRef(input)
      expect(ref).not.toBeNull()
      // Canonical form is lossy on display text by design (like GitHub anchors);
      // the invariant is resolution-relevant equality: path + kind + level + slug.
      const canonical = serializeKnowledgeUnitRef(ref!.filePath, ref!.unit!, ref!.subunits)
      const again = parseKnowledgeUnitRef(canonical)
      expect(again).toMatchObject({
        filePath: ref!.filePath,
        unit: { kind: ref!.unit!.kind },
      })
      expect(again?.subunits?.map(normalizeName)).toEqual(ref!.subunits?.map(normalizeName))
      if (ref!.unit!.kind === 'header') {
        expect(again?.unit).toMatchObject({ level: ref!.unit!.level, slug: ref!.unit!.slug })
        // Canonical output is a fixed point: re-serializing changes nothing.
        expect(serializeKnowledgeUnitRef(again!.filePath, again!.unit!, again!.subunits)).toBe(
          canonical,
        )
      } else {
        expect(again?.unit).toMatchObject({ id: ref!.unit!.id })
      }
    }
  })
})

describe('parseCsvTable', () => {
  it('reads headers normalized and rows raw', () => {
    const t = parseCsvTable(metrics)
    expect(t.headers).toEqual([
      'cliente_id',
      'segmento',
      'unidades_activas',
      'mrr_usd',
      'fecha_alta',
    ])
    expect(t.rows).toHaveLength(5)
    expect(t.rows[3]).toEqual(['104', 'Enterprise', '210', '78000', '2025-04-05'])
    expect(t.malformed).toBe(false)
  })

  it('handles quoted commas and escaped quotes', () => {
    const t = parseCsvTable('a,b\n"1,2","x""y"\n')
    expect(t.rows).toEqual([['1,2', 'x"y']])
  })

  it('flags unbalanced quotes without throwing', () => {
    const t = parseCsvTable('a,b\n"oops,1\n')
    expect(t.malformed).toBe(true)
    expect(t.rows).toEqual([])
  })
})

describe('resolveUnit over fixtures', () => {
  it('resolves an element section', () => {
    const ref = parseKnowledgeUnitRef('models/G.md@## NN Person: Dr. Egon Spengler')!
    const resolved = resolveUnit(ghost, ref)
    expect(resolved).toMatchObject({ kind: 'section', startLine: 7, endLine: 13 })
  })

  it('resolves a field line inside its section', () => {
    const ref = parseKnowledgeUnitRef('models/G.md@## NN Person: Dr. Egon Spengler&compensation')!
    const resolved = resolveUnit(ghost, ref)
    expect(resolved?.kind).toBe('field')
    if (resolved?.kind === 'field') {
      expect(resolved.lines).toEqual([9])
      expect(ghost.split('\n')[resolved.lines[0]]).toContain('compensation:: Equal partner')
    }
  })

  it('resolves a quoted header', () => {
    const ref = parseKnowledgeUnitRef('models/G.md@## NN Messages: "We\'re ready to believe you."')!
    expect(resolveUnit(ghost, ref)).toMatchObject({ kind: 'section', startLine: 15 })
  })

  it('resolves a CSV row and cell', () => {
    const row = resolveUnit(metrics, parseKnowledgeUnitRef('s.csv@104')!)
    expect(row).toMatchObject({ kind: 'row', index: 3 })
    const cell = resolveUnit(metrics, parseKnowledgeUnitRef('s.csv@104&mrr_usd')!)
    expect(cell).toMatchObject({ kind: 'cell', row: 3, column: 'mrr_usd', value: '78000' })
  })

  it('resolves a matrix cell', () => {
    const ref = parseKnowledgeUnitRef(
      'models/G.md@# NN matrices: journey map&First Contact&Relief',
    )!
    expect(resolveUnit(ghost, ref)).toMatchObject({ kind: 'cell', value: 'Slightly High' })
  })

  it('returns null for unknown row, column, and field', () => {
    expect(resolveUnit(metrics, parseKnowledgeUnitRef('s.csv@999')!)).toBeNull()
    expect(resolveUnit(metrics, parseKnowledgeUnitRef('s.csv@104&nope')!)).toBeNull()
    expect(
      resolveUnit(
        ghost,
        parseKnowledgeUnitRef('models/G.md@## NN Person: Dr. Egon Spengler&nope')!,
      ),
    ).toBeNull()
  })
})
