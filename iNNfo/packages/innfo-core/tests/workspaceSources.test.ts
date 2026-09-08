import { describe, it, expect } from 'vitest'
import { validateWorkspaceSources, type SourceResolver } from '../src/validator/workspaceSources'
import { extractHeadings } from '../src/sourceRef'
import type { RecursiveParseResult } from '../src/recursiveParser/types'
import type { ModelNode } from '../src/types'

function field(value: unknown): ModelNode['fields'][string] {
  return { value, editAttribution: { author: { kind: 'system', id: 'test' }, timestamp: '' } }
}

function resultWith(sources: unknown, fieldName = 'sources'): RecursiveParseResult {
  const root: ModelNode = {
    id: 'root-1',
    name: 'root_01',
    parentId: null,
    childIds: ['elem-1'],
    type: 'document',
    kind: 'root',
    fields: {},
    markers: {},
    relationships: [],
    rawSections: {},
    source: { path: 'models/Plan_V_1-0-0_NN.md' },
  }
  const element: ModelNode = {
    id: 'elem-1',
    name: 'Enterprise Clients',
    parentId: 'root-1',
    childIds: [],
    type: 'Stakeholders',
    kind: 'element',
    fields: { [fieldName]: field(sources) },
    markers: {},
    relationships: [],
    rawSections: {},
    source: { path: 'models/Plan_V_1-0-0_NN.md' },
  }
  return { nodes: { 'root-1': root, 'elem-1': element }, rootIds: ['root-1'], issues: [] }
}

const resolver =
  (files: Record<string, string[] | true>): SourceResolver =>
  (refPath) => {
    const entry = files[refPath]
    if (entry === undefined) return { exists: false }
    return { exists: true, headings: entry === true ? undefined : entry }
  }

describe('validateWorkspaceSources', () => {
  it('warns (not errors) on a resolvable legacy file + heading: dual-accept with deprecation', () => {
    const diags = validateWorkspaceSources(
      resultWith('report.md#q3-milestones'),
      resolver({ 'sources/nn/report.md': ['q3-milestones', 'intro'] }),
    )
    expect(diags).toHaveLength(1)
    expect(diags[0].severity).toBe('warning')
    expect(diags[0].code).toBe('KU_DEPRECATED_HASH')
    expect(diags[0].message).toContain('@')
  })

  it('errors on a dangling source file', () => {
    const diags = validateWorkspaceSources(resultWith('missing.md#intro'), resolver({}))
    expect(diags).toHaveLength(1)
    expect(diags[0].severity).toBe('error')
    expect(diags[0].message).toContain('sources/nn/missing.md')
    expect(diags[0].path).toBe('models/Plan_V_1-0-0_NN.md#Enterprise Clients.sources')
  })

  it('warns when the heading slug is absent (plus the legacy deprecation warning)', () => {
    const diags = validateWorkspaceSources(
      resultWith('report.md#nope'),
      resolver({ 'sources/nn/report.md': ['intro'] }),
    )
    expect(diags).toHaveLength(2)
    expect(diags[0].severity).toBe('warning')
    expect(diags[0].code).toBe('KU_UNKNOWN_SLUG')
    expect(diags[0].message).toContain('#nope')
    expect(diags[1].code).toBe('KU_DEPRECATED_HASH')
  })

  it('errors on a malformed (line-range) reference', () => {
    const diags = validateWorkspaceSources(
      resultWith('report.md#L10-L20'),
      resolver({ 'sources/nn/report.md': true }),
    )
    expect(diags).toHaveLength(1)
    expect(diags[0].severity).toBe('error')
    expect(diags[0].message).toContain('line ranges')
  })

  it('checks each entry of a list (legacy entries also carry deprecation warnings)', () => {
    const diags = validateWorkspaceSources(
      resultWith(['ok.md#intro', 'gone.md#x', 'ok.md#missing']),
      resolver({ 'sources/nn/ok.md': ['intro'] }),
    )
    expect(diags.map((d) => d.severity).sort()).toEqual(['error', 'warning', 'warning', 'warning'])
  })

  it('skips non-source fields and non-element nodes', () => {
    const diags = validateWorkspaceSources(
      resultWith('missing.md#x', 'relationship_model'),
      resolver({}),
    )
    expect(diags).toEqual([])
  })

  it('treats a null resolver return as not-found', () => {
    const diags = validateWorkspaceSources(resultWith('a.md'), () => null)
    expect(diags[0].severity).toBe('error')
  })
})

const MD_FIXTURE = [
  '# Overview',
  '',
  '## NN Person: Dr. Egon Spengler',
  'compensation:: Equal partner share.',
  '',
  '# NN matrices: journey map',
  '',
  '| Journey | Relief |',
  '| :--- | :---: |',
  '| First Contact | Slightly High |',
  '',
].join('\n')

const CSV_FIXTURE = [
  'cliente_id,segmento,mrr_usd',
  '101,Enterprise,45000',
  '104,Enterprise,78000',
  '',
].join('\n')

const contentResolver =
  (files: Record<string, string>): SourceResolver =>
  (refPath) => {
    const content = files[refPath]
    if (content === undefined) return { exists: false }
    return { exists: true, headings: extractHeadings(content).map((h) => h.slug), content }
  }

describe('validateWorkspaceSources knowledge-unit pointers', () => {
  const md = { 'sources/nn/g.md': MD_FIXTURE }
  const csv = { 'sources/nn/m.csv': CSV_FIXTURE }

  it('is silent for valid header, field, row, cell, and matrix pointers', () => {
    const diags = validateWorkspaceSources(
      resultWith([
        'g.md@## NN Person: Dr. Egon Spengler',
        'g.md@## NN Person: Dr. Egon Spengler&compensation',
        'g.md@# NN matrices: journey map&First Contact&Relief',
      ]),
      contentResolver(md),
    )
    expect(diags).toEqual([])
    const csvDiags = validateWorkspaceSources(
      resultWith(['m.csv@104', 'm.csv@104&mrr_usd']),
      contentResolver(csv),
    )
    expect(csvDiags).toEqual([])
  })

  it('errors unknown row-id, unknown column, and duplicate/empty keys with stable codes', () => {
    const row = validateWorkspaceSources(resultWith('m.csv@999'), contentResolver(csv))
    expect(row).toHaveLength(1)
    expect(row[0]).toMatchObject({ severity: 'error', code: 'KU_UNKNOWN_ROW' })

    const col = validateWorkspaceSources(resultWith('m.csv@104&nope'), contentResolver(csv))
    expect(col).toHaveLength(1)
    expect(col[0]).toMatchObject({ severity: 'error', code: 'KU_UNKNOWN_COLUMN' })

    const dup = validateWorkspaceSources(
      resultWith('m.csv@1'),
      contentResolver({ 'sources/nn/m.csv': 'id,v\n1,a\n1,b\n,empty\n' }),
    )
    expect(dup.map((d) => d.code).sort()).toEqual(['KU_DUPLICATE_KEY', 'KU_EMPTY_KEY'])
  })

  it('errors a field outside its section and an unresolvable matrix cell', () => {
    const field = validateWorkspaceSources(
      resultWith('g.md@## NN Person: Dr. Egon Spengler&nope'),
      contentResolver(md),
    )
    expect(field).toHaveLength(1)
    expect(field[0]).toMatchObject({ severity: 'error', code: 'KU_FIELD_OUTSIDE_SECTION' })

    const cell = validateWorkspaceSources(
      resultWith('g.md@# NN matrices: journey map&Nobody&Relief'),
      contentResolver(md),
    )
    expect(cell).toHaveLength(1)
    expect(cell[0]).toMatchObject({ severity: 'error', code: 'KU_UNKNOWN_MATRIX_CELL' })
  })

  it('degrades to existence-only without content (no false positives)', () => {
    const diags = validateWorkspaceSources(
      resultWith(['g.md@## NN Person: Dr. Egon Spengler&compensation', 'm.csv@104&mrr_usd']),
      resolver({ 'sources/nn/g.md': true, 'sources/nn/m.csv': true }),
    )
    expect(diags).toEqual([])
  })

  it('suggests the level-precise canonical form for legacy refs when content is available', () => {
    const diags = validateWorkspaceSources(resultWith('g.md#overview'), contentResolver(md))
    const deprecation = diags.find((d) => d.code === 'KU_DEPRECATED_HASH')
    expect(deprecation?.message).toContain('@#overview')
  })

  it('rejects query-shaped values in provenance with the dedicated error', () => {
    const diags = validateWorkspaceSources(
      resultWith('metricas_q3.csv?segmento=Enterprise'),
      resolver({}),
    )
    expect(diags).toHaveLength(1)
    expect(diags[0]).toMatchObject({ severity: 'error', code: 'QU_NOT_PROVENANCE' })
  })

  it('keeps the generic malformed code for non-query garbage', () => {
    const diags = validateWorkspaceSources(resultWith('just some prose'), resolver({}))
    expect(diags).toHaveLength(1)
    expect(diags[0]).toMatchObject({ severity: 'error', code: 'KU_MALFORMED' })
  })
})
