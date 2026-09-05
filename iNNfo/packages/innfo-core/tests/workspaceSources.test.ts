import { describe, it, expect } from 'vitest'
import { validateWorkspaceSources, type SourceResolver } from '../src/validator/workspaceSources'
import type { RecursiveParseResult } from '../src/recursiveParser/types'
import type { ModelNode } from '../src/types'

function field(value: unknown): ModelNode['fields'][string] {
  return { value, provenance: { author: { kind: 'system', id: 'test' }, timestamp: '' } }
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
  it('is silent for a resolvable file + heading', () => {
    const diags = validateWorkspaceSources(
      resultWith('report.md#q3-milestones'),
      resolver({ 'sources/nn/report.md': ['q3-milestones', 'intro'] }),
    )
    expect(diags).toEqual([])
  })

  it('errors on a dangling source file', () => {
    const diags = validateWorkspaceSources(resultWith('missing.md#intro'), resolver({}))
    expect(diags).toHaveLength(1)
    expect(diags[0].severity).toBe('error')
    expect(diags[0].message).toContain('sources/nn/missing.md')
    expect(diags[0].path).toBe('models/Plan_V_1-0-0_NN.md#Enterprise Clients.sources')
  })

  it('warns when the heading slug is absent', () => {
    const diags = validateWorkspaceSources(
      resultWith('report.md#nope'),
      resolver({ 'sources/nn/report.md': ['intro'] }),
    )
    expect(diags).toHaveLength(1)
    expect(diags[0].severity).toBe('warning')
    expect(diags[0].message).toContain('#nope')
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

  it('checks each entry of a list', () => {
    const diags = validateWorkspaceSources(
      resultWith(['ok.md#intro', 'gone.md#x', 'ok.md#missing']),
      resolver({ 'sources/nn/ok.md': ['intro'] }),
    )
    expect(diags.map((d) => d.severity).sort()).toEqual(['error', 'warning'])
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
