import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseKnowledgeQuery, runQuery, type FileSnapshot } from './queryUnits'

const ghost = readFileSync(new URL('../tests/fixtures/ku-ghostbusters.md', import.meta.url), 'utf8')
const metrics = readFileSync(new URL('../tests/fixtures/metricas_q3.csv', import.meta.url), 'utf8')

const files: FileSnapshot[] = [
  { path: 'sources/nn/g.md', content: ghost },
  { path: 'sources/nn/metricas_q3.csv', content: metrics },
]

describe('parseKnowledgeQuery grammar', () => {
  it('parses filters and an optional trailing projection', () => {
    expect(parseKnowledgeQuery('sources/nn/m.csv?segmento=Enterprise')).toMatchObject({
      path: 'sources/nn/m.csv',
      filters: [{ name: 'segmento', value: 'Enterprise' }],
      projection: undefined,
    })
    expect(parseKnowledgeQuery('sources/nn/m.csv?segmento=Enterprise&mrr_usd')).toMatchObject({
      filters: [{ name: 'segmento', value: 'Enterprise' }],
      projection: 'mrr_usd',
    })
    expect(parseKnowledgeQuery('f.csv?a=1&b=2')?.filters).toEqual([
      { name: 'a', value: '1' },
      { name: 'b', value: '2' },
    ])
  })

  it('keeps = inside values (splits on the first only)', () => {
    expect(parseKnowledgeQuery('f.csv?formula=a=b')?.filters).toEqual([
      { name: 'formula', value: 'a=b' },
    ])
  })

  it.each([
    'sources/nn/m.csv',
    'sources/nn/m.csv?',
    'sources/nn/m.csv@104?segmento=Enterprise',
    'sources/nn/m.csv?=Enterprise',
    'sources/nn/m.csv?segmento=',
    'sources/nn/m.csv?a=1&proj&b=2',
    'https://example.com/m.csv?a=1',
  ])('rejects %s', (input) => {
    expect(parseKnowledgeQuery(input)).toBeNull()
  })
})

describe('runQuery over CSV', () => {
  it('returns matching row URIs in document order', () => {
    const q = parseKnowledgeQuery('sources/nn/metricas_q3.csv?segmento=Enterprise')!
    const result = runQuery(q, files)
    expect(result.diagnostics).toEqual([])
    expect(result.uris).toEqual([
      'sources/nn/metricas_q3.csv@101',
      'sources/nn/metricas_q3.csv@102',
      'sources/nn/metricas_q3.csv@104',
    ])
  })

  it('projects one column over the matched set', () => {
    const q = parseKnowledgeQuery('sources/nn/metricas_q3.csv?segmento=Enterprise&mrr_usd')!
    const result = runQuery(q, files)
    expect(result.values).toEqual(['45000', '32000', '78000'])
    expect(result.uris).toHaveLength(3)
  })

  it('matches case-insensitively with surrounding whitespace', () => {
    const q = parseKnowledgeQuery('sources/nn/metricas_q3.csv?segmento= enterprise ')!
    expect(runQuery(q, files).uris).toHaveLength(3)
  })

  it('returns an empty set (not an error) on no match', () => {
    const q = parseKnowledgeQuery('sources/nn/metricas_q3.csv?segmento=Nonexistent')!
    const result = runQuery(q, files)
    expect(result.uris).toEqual([])
    expect(result.diagnostics).toEqual([])
  })

  it('errors on an unknown column', () => {
    const q = parseKnowledgeQuery('sources/nn/metricas_q3.csv?nope=x')!
    const result = runQuery(q, files)
    expect(result.uris).toEqual([])
    expect(result.diagnostics).toHaveLength(1)
    expect(result.diagnostics[0].severity).toBe('error')
  })

  it('is deterministic across reruns', () => {
    const q = parseKnowledgeQuery('sources/nn/metricas_q3.csv?segmento=Enterprise')!
    expect(runQuery(q, files)).toEqual(runQuery(q, files))
  })
})

describe('runQuery over Markdown sections', () => {
  it('matches list membership', () => {
    const q = parseKnowledgeQuery('sources/nn/g.md?tags=vip')!
    const result = runQuery(q, files)
    expect(result.uris).toEqual(['sources/nn/g.md@##nn-stakeholders--dana-barrett'])
  })

  it('matches scalars case-insensitively', () => {
    const q = parseKnowledgeQuery('sources/nn/g.md?relationship_model=anchor commercial client')!
    const result = runQuery(q, files)
    expect(result.uris).toEqual(['sources/nn/g.md@##nn-stakeholders--dana-barrett'])
  })

  it('projects a field value over the matched sections', () => {
    const q = parseKnowledgeQuery('sources/nn/g.md?tags=vip&relationship_model')!
    const result = runQuery(q, files)
    expect(result.values).toEqual(['Anchor Commercial Client'])
  })

  it('never matches prose outside key:: fields', () => {
    const q = parseKnowledgeQuery('sources/nn/g.md?catalyst=whatever')!
    const result = runQuery(q, files)
    expect(result.uris).toEqual([])
  })
})

describe('runQuery file handling', () => {
  it('errors when the queried file is absent from the snapshot set', () => {
    const q = parseKnowledgeQuery('sources/nn/gone.csv?a=1')!
    const result = runQuery(q, [])
    expect(result.uris).toEqual([])
    expect(result.diagnostics).toHaveLength(1)
    expect(result.diagnostics[0].severity).toBe('error')
  })
})
