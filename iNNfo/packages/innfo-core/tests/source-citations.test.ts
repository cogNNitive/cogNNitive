import { describe, it, expect } from 'vitest'
import { attachSourceCitations } from '../src/recursiveParser/normalize'
import type { ModelNode } from '../src/types'

function field(value: unknown): ModelNode['fields'][string] {
  return { value, provenance: { author: { kind: 'system', id: 'test' }, timestamp: '' } }
}

function elementNode(fields: Record<string, unknown>): ModelNode {
  return {
    id: 'elem-1',
    name: 'Enterprise Clients',
    parentId: 'root-1',
    childIds: [],
    type: 'Stakeholders',
    kind: 'element',
    fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, field(v)])),
    markers: {},
    relationships: [],
    rawSections: {},
    source: { path: 'models/Plan_V_1-0-0_NN.md' },
  }
}

describe('attachSourceCitations', () => {
  it('attaches parsed refs from a list-valued sources field and one edge each', () => {
    const node = elementNode({
      sources: ['interview.md#clients', 'notes/kickoff.md#priorities'],
      relationship_model: 'B2B',
    })
    attachSourceCitations(node)

    expect(node.sources?.map((s) => s.filePath)).toEqual([
      'sources/nn/interview.md',
      'sources/nn/notes/kickoff.md',
    ])
    const sourceEdges = node.relationships.filter((r) => r.origin === 'source')
    expect(sourceEdges).toEqual([
      { targetId: 'sources/nn/interview.md', label: 'sources', origin: 'source' },
      { targetId: 'sources/nn/notes/kickoff.md', label: 'sources', origin: 'source' },
    ])
  })

  it('accepts a scalar single value', () => {
    const node = elementNode({ sources: 'report.md#q3' })
    attachSourceCitations(node)
    expect(node.sources).toHaveLength(1)
    expect(node.sources?.[0].slug).toBe('q3')
  })

  it('is case-insensitive on the field name', () => {
    const node = elementNode({ Source: 'a.md' })
    attachSourceCitations(node)
    expect(node.sources?.[0].filePath).toBe('sources/nn/a.md')
  })

  it('does not populate node.sources when no value parses', () => {
    const node = elementNode({ sources: ['report.md#L1-L9', 'src-3 a.md'] })
    attachSourceCitations(node)
    expect(node.sources).toBeUndefined()
    expect(node.relationships.filter((r) => r.origin === 'source')).toHaveLength(0)
  })

  it('keeps only the parseable subset', () => {
    const node = elementNode({ sources: ['ok.md#intro', 'bad.md#L4'] })
    attachSourceCitations(node)
    expect(node.sources?.map((s) => s.filePath)).toEqual(['sources/nn/ok.md'])
  })

  it('ignores nodes with no source field', () => {
    const node = elementNode({ relationship_model: 'B2B' })
    attachSourceCitations(node)
    expect(node.sources).toBeUndefined()
  })
})
