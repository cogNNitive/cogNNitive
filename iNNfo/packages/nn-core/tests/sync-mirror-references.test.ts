import { describe, it, expect } from 'vitest'
import { validateWorkspaceReferences } from '../src/validator/workspaceReferences.js'
import { validateElementFieldReferences } from '../src/validator/references.js'
import { buildWorkspaceIndex } from '../src/recursiveParser/workspaceIndex.js'
import { buildDomainIndex } from '../src/domain/index.js'
import type { MirrorLookup } from '../src/sync/address.js'
import type { RecursiveParseResult } from '../src/recursiveParser/types.js'
import type { KnowledgeNode, Concept, ParsedKnowledge } from '../src/types/index.js'
import { ElementsMap } from '../src/types/index.js'

const MIRROR_ADDRESS = 'sources/sync/org/organization_NN.md@gerente'

const field = (value: unknown): KnowledgeNode['fields'][string] => ({
  value,
  editAttribution: { author: { kind: 'system', id: 'test' }, timestamp: '' },
})

/** The mirrored origin model: `organization_NN.md` holding a Role element `gerente`. */
const orgMirror = buildDomainIndex(
  [
    {
      path: 'organization_NN.md',
      frontmatter: { level: 3, parent_spec: { name: 'organization_V_0-1-0' } },
      elements: [{ concept: 'Role', slug: 'gerente' }],
    },
  ],
  () => new Map(),
)
const lookup: MirrorLookup = (alias) => (alias === 'org' ? orgMirror : undefined)

/** A consumer model whose Procedure `responsable` is a `reference` field holding `value`. */
function consumer(value: string, targetConcepts?: string[]) {
  const schema = {
    concepts: [
      {
        name: 'Procedure',
        type: 'text',
        fields: [{ name: 'responsable', type: 'reference', ...(targetConcepts ? { target_concepts: targetConcepts } : {}) }],
      },
    ] as Concept[],
    markers: [],
    matrices: [],
    taxonomy: [],
  }
  const root: KnowledgeNode = {
    id: 'procedures',
    name: 'procedures',
    parentId: null,
    childIds: ['proc'],
    type: 'document',
    kind: 'root',
    fields: { parent_spec: field({ name: 'procedures_V_0-1-0' }) },
    markers: {},
    relationships: [],
    rawSections: {},
    source: { path: 'procedures_NN.md' },
    templateSchema: schema,
  }
  const proc: KnowledgeNode = {
    id: 'proc',
    name: 'Approve',
    parentId: 'procedures',
    childIds: [],
    type: 'Procedure',
    kind: 'element',
    fields: { responsable: field(value) },
    markers: {},
    relationships: [],
    rawSections: {},
    source: { path: 'procedures_NN.md' },
  }
  const result: RecursiveParseResult = { nodes: { procedures: root, proc }, rootIds: ['procedures'], issues: [] }
  return { result, index: buildWorkspaceIndex(result) }
}

describe('workspace pass: references to a mirrored model', () => {
  it('resolves an element of the mirror', () => {
    const { result, index } = consumer(MIRROR_ADDRESS)
    expect(validateWorkspaceReferences(result, index, undefined, undefined, lookup)).toEqual([])
  })

  it('reports a missing slug as REF_ELEMENT_NOT_FOUND', () => {
    const { result, index } = consumer('sources/sync/org/organization_NN.md@nobody')
    const diagnostics = validateWorkspaceReferences(result, index, undefined, undefined, lookup)
    expect(diagnostics.map((d) => d.code)).toEqual(['REF_ELEMENT_NOT_FOUND'])
    expect(diagnostics[0].severity).toBe('error')
  })

  it('reports a missing alias as REF_MODEL_NOT_FOUND', () => {
    const { result, index } = consumer('sources/sync/ghost/organization_NN.md@gerente')
    const diagnostics = validateWorkspaceReferences(result, index, undefined, undefined, lookup)
    expect(diagnostics.map((d) => d.code)).toEqual(['REF_MODEL_NOT_FOUND'])
  })

  it('reports a missing mirrored file as REF_MODEL_NOT_FOUND', () => {
    const { result, index } = consumer('sources/sync/org/other_NN.md@gerente')
    const diagnostics = validateWorkspaceReferences(result, index, undefined, undefined, lookup)
    expect(diagnostics.map((d) => d.code)).toEqual(['REF_MODEL_NOT_FOUND'])
  })

  it('reports REF_MODEL_NOT_FOUND when the host passes no mirror lookup', () => {
    const { result, index } = consumer(MIRROR_ADDRESS)
    expect(validateWorkspaceReferences(result, index).map((d) => d.code)).toEqual(['REF_MODEL_NOT_FOUND'])
  })

  it('warns REF_CONCEPT_MISMATCH when the element is not a target concept', () => {
    const { result, index } = consumer(MIRROR_ADDRESS, ['Person'])
    const diagnostics = validateWorkspaceReferences(result, index, undefined, undefined, lookup)
    expect(diagnostics.map((d) => [d.code, d.severity])).toEqual([['REF_CONCEPT_MISMATCH', 'warning']])
  })
})

describe('per-file pass: a mirror address', () => {
  it('emits no ADDRESS_MALFORMED (the workspace pass resolves it)', () => {
    const elements = new ElementsMap()
    elements.set('Procedure', [
      {
        type: 'Procedure',
        name: 'Approve',
        slug: 'approve',
        slugExplicit: true,
        description: '',
        fields: { responsable: MIRROR_ADDRESS },
        markers: {},
      },
    ])
    const model: ParsedKnowledge = {
      frontmatter: { spec_version: 'V_0-3-0', spec_url: '', level: 3, knowledge_version: 'V_0-1-0' } as ParsedKnowledge['frontmatter'],
      taxonomy: [],
      elements,
      matrices: [],
      nodeMarkers: {},
      rawContent: '',
    }
    const concepts: Concept[] = [{ name: 'Procedure', type: 'list', fields: [{ name: 'responsable', type: 'reference' }] }]
    expect(validateElementFieldReferences(model, concepts).map((d) => d.code)).not.toContain('ADDRESS_MALFORMED')
  })
})
