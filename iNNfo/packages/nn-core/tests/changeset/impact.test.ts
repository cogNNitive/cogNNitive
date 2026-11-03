import { describe, it, expect } from 'vitest'
import {
  computeMatrixCascade,
  scanIncomingReferences,
  evaluateBatchDeleteImpact,
} from '../../src/changeset/impact.js'
import type { ChangeItem } from '../../src/changeset/types.js'
import type { ParsedKnowledge } from '../../src/types/index.js'

function createMockModelWithMatrix(
  slug: string,
  elementNames: string[],
  matrixCells: Array<{ row: string; col: string; value: string }> = [],
): ParsedKnowledge {
  const elements = new Map<string, Array<{ type: string; name: string; slug?: string; fields: Record<string, unknown>; markers: Record<string, unknown>; description?: string }>>()
  const list = elementNames.map((name) => ({
    type: 'concept',
    name,
    slug: name.toLowerCase(),
    fields: {},
    markers: {},
    description: '',
  }))
  elements.set('concept', list)

  return {
    frontmatter: {
      knowledge_slug: slug,
      knowledge_version: 'V_0-1-0',
      parent_blueprint: 'concept',
      blueprint_version: 'V_0-1-0',
    },
    rawFrontmatter: {},
    elements,
    taxonomy: [],
    matrices: [
      {
        name: 'Access Matrix',
        cells: matrixCells,
      },
    ],
    rawSections: [],
    footnotes: [],
  }
}

/* ── impact keyed by hierarchical id (distributed-storage S6c) ─────────────── */

function instanceModel(id: string, slug: string, elementNames: string[]) {
  const model = createMockModelWithMatrix(slug, elementNames, [{ row: '00-gancho', col: 'read', value: 'yes' }])
  // Instance models carry the root slug, not the model id, in `knowledge_slug`.
  model.frontmatter.knowledge_slug = slug
  return { id, model }
}

describe('impact keyed by hierarchical id (distributed-storage S6c)', () => {
  it('equal-stem instances do not collapse: a reference to one does not block the other', () => {
    const a = instanceModel('villabotijos-today/intro', 'intro', ['00-gancho'])
    const b = instanceModel('innteresante/intro', 'intro', ['00-gancho'])
    const pitch = createMockModelWithMatrix('pitch', ['section'])
    pitch.elements.get('concept')![0].fields['related'] = 'innteresante/intro@00-gancho'

    const loadedModels = new Map<string, ParsedKnowledge>([
      [a.id, a.model],
      [b.id, b.model],
      ['innteresante/pitch', pitch],
    ])
    const workspace = new Map(loadedModels)

    const againstA = evaluateBatchDeleteImpact(
      [{ id: 'del-a', op: 'remove_element', target: 'villabotijos-today/intro@00-gancho' }],
      loadedModels,
      workspace,
    )
    expect(againstA.referenceConflicts.has('del-a')).toBe(false)

    const againstB = evaluateBatchDeleteImpact(
      [{ id: 'del-b', op: 'remove_element', target: 'innteresante/intro@00-gancho' }],
      loadedModels,
      workspace,
    )
    expect(againstB.referenceConflicts.get('del-b')).toContain('REFERENCED_BY: innteresante/pitch@section&related')
  })

  it('a same-model reference is matched on the full address, and cascaded cells stay within the model', () => {
    const intro = instanceModel('villabotijos-today/intro', 'intro', ['00-gancho', 'other'])
    intro.model.elements.get('concept')![1].fields['related'] = '00-gancho'

    const loadedModels = new Map<string, ParsedKnowledge>([[intro.id, intro.model]])
    const result = evaluateBatchDeleteImpact(
      [{ id: 'del', op: 'remove_element', target: 'villabotijos-today/intro@00-gancho' }],
      loadedModels,
      new Map(loadedModels),
    )
    expect(result.referenceConflicts.get('del')).toContain('REFERENCED_BY: villabotijos-today/intro@other&related')
    expect(result.matrixCascades.get('del')).toHaveLength(1)
  })
})

describe('2B: Delete Impact, Matrix Cascade & Reference Scanning', () => {
  it('computeMatrixCascade finds cells matching target element on row or col', () => {
    const model = createMockModelWithMatrix('auth-mod', ['auth', 'billing'], [
      { row: 'auth', col: 'read', value: 'allow' },
      { row: 'auth', col: 'write', value: 'deny' },
      { row: 'billing', col: 'read', value: 'allow' },
    ])

    const cascade = computeMatrixCascade(model, 'auth', 'Auth')
    expect(cascade).toHaveLength(2)
    expect(cascade).toEqual([
      { matrixName: 'Access Matrix', row: 'auth', col: 'read' },
      { matrixName: 'Access Matrix', row: 'auth', col: 'write' },
    ])
  })

  it('scanIncomingReferences detects active reference field in workspace model', () => {
    const modelA = createMockModelWithMatrix('model-a', ['client'])
    // Add reference field pointing to core
    const clientEl = modelA.elements.get('concept')![0]
    clientEl.fields['depends_on'] = 'model-b@core'

    const workspace = new Map<string, ParsedKnowledge>([['model-a', modelA]])

    const hits = scanIncomingReferences(workspace, 'model-b', 'core', 'Core', [])
    expect(hits).toHaveLength(1)
    expect(hits[0].referencingModelSlug).toBe('model-a')
    expect(hits[0].referencingElementIdent).toBe('client')
    expect(hits[0].field).toBe('depends_on')
    expect(hits[0].referenceType).toBe('cross-model')
  })

  it('scanIncomingReferences detects active wikilinks in description', () => {
    const modelA = createMockModelWithMatrix('model-a', ['service'])
    const serviceEl = modelA.elements.get('concept')![0]
    serviceEl.description = 'Communicates with [[core]] component.'

    const workspace = new Map<string, ParsedKnowledge>([['model-a', modelA]])

    const hits = scanIncomingReferences(workspace, 'model-a', 'core', 'Core', [])
    expect(hits).toHaveLength(1)
    expect(hits[0].referencingModelSlug).toBe('model-a')
    expect(hits[0].referencingElementIdent).toBe('service')
    expect(hits[0].field).toBe('description')
    expect(hits[0].referenceType).toBe('wikilink')
  })

  it('scanIncomingReferences allows deletion when companion change updates reference in same batch', () => {
    const modelA = createMockModelWithMatrix('model-a', ['client'])
    const clientEl = modelA.elements.get('concept')![0]
    clientEl.fields['depends_on'] = 'model-b@core'

    const workspace = new Map<string, ParsedKnowledge>([['model-a', modelA]])

    const companionChanges: ChangeItem[] = [
      {
        id: 'c1',
        op: 'remove_element',
        target: 'model-b@core',
      },
      {
        id: 'c2',
        op: 'update_field',
        target: 'model-a@client&depends_on',
        to: 'model-b@other',
      },
    ]

    const hits = scanIncomingReferences(workspace, 'model-b', 'core', 'Core', companionChanges)
    expect(hits).toHaveLength(0)
  })

  it('evaluateBatchDeleteImpact aggregates matrix cascade and flags unresolved reference conflict', () => {
    const modelA = createMockModelWithMatrix('model-a', ['client'])
    const clientEl = modelA.elements.get('concept')![0]
    clientEl.fields['target_service'] = 'model-b@core'

    const modelB = createMockModelWithMatrix('model-b', ['core'], [
      { row: 'core', col: 'read', value: 'yes' },
    ])

    const loadedModels = new Map<string, ParsedKnowledge>([
      ['model-a', modelA],
      ['model-b', modelB],
    ])
    const workspace = loadedModels

    const changes: ChangeItem[] = [
      {
        id: 'del1',
        op: 'remove_element',
        target: 'model-b@core',
      },
    ]

    const result = evaluateBatchDeleteImpact(changes, loadedModels, workspace)
    expect(result.matrixCascades.get('del1')).toHaveLength(1)
    expect(result.referenceConflicts.has('del1')).toBe(true)
    expect(result.referenceConflicts.get('del1')).toContain('REFERENCED_BY')
  })
})
