import { describe, it, expect } from 'vitest'
import { partitionChangeset } from '../../src/changeset/conflicts.js'
import { hashParsedElement } from '../../src/console/element-hash.js'
import type { ChangeItem } from '../../src/changeset/types.js'
import type { ParsedKnowledge } from '../../src/types/index.js'

function createMockModel(slug: string, elementsMap: Record<string, Record<string, unknown>>): ParsedKnowledge {
  const elements = new Map<string, Array<{ type: string; name: string; slug?: string; fields: Record<string, unknown>; markers: Record<string, unknown>; description?: string }>>()
  const list = Object.entries(elementsMap).map(([name, fields]) => ({
    type: 'concept',
    name,
    slug: name.toLowerCase(),
    fields,
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
    matrices: [],
    rawSections: [],
    footnotes: [],
  }
}

function createMockMultiConceptModel(
  slug: string,
  conceptMap: Record<string, Record<string, Record<string, unknown>>>,
): ParsedKnowledge {
  const elements = new Map<string, Array<{ type: string; name: string; slug?: string; fields: Record<string, unknown>; markers: Record<string, unknown>; description?: string }>>()
  for (const [conceptName, elMap] of Object.entries(conceptMap)) {
    const list = Object.entries(elMap).map(([name, fields]) => ({
      type: conceptName,
      name,
      slug: name.toLowerCase(),
      fields,
      markers: {},
      description: '',
    }))
    elements.set(conceptName, list)
  }
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
    matrices: [],
    rawSections: [],
    footnotes: [],
  }
}

describe('2D: Conflict Partitioning Coordinator (partitionChangeset)', () => {
  it('partitionChangeset isolates from mismatches and preserves clean operations', async () => {
    const model = createMockModel('strategy', {
      Vision: { statement: 'Accelerate clean energy' },
    })
    const loadedModels = new Map<string, ParsedKnowledge>([['strategy', model]])

    const changes: ChangeItem[] = [
      {
        id: 'c1',
        op: 'update_field',
        target: 'strategy@Vision&statement',
        from: 'Accelerate clean energy',
        to: 'Accelerate renewable energy',
      },
      {
        id: 'c2',
        op: 'update_field',
        target: 'strategy@Vision&statement',
        from: 'Wrong statement value',
        to: 'Something else',
      },
    ]

    const result = await partitionChangeset(changes, loadedModels)
    expect(result.cleanSubset).toHaveLength(1)
    expect(result.cleanSubset[0].id).toBe('c1')

    expect(result.conflictedSubset).toHaveLength(1)
    expect(result.conflictedSubset[0].id).toBe('c2')
    expect(result.conflictDiagnostics.get('c2')?.code).toBe('PRECONDITION_FAILED')
    expect(result.conflictDiagnostics.get('c2')?.message).toContain('Precondition failed')
  })

  it('partitionChangeset hints rename_element when update_field targets &name', async () => {
    const model = createMockModel('strategy', {
      Vision: { statement: 'Accelerate clean energy' },
    })
    const loadedModels = new Map<string, ParsedKnowledge>([['strategy', model]])

    const changes: ChangeItem[] = [
      {
        id: 'c1',
        op: 'update_field',
        target: 'strategy@Vision&name',
        from: 'Vision',
        to: 'Mission',
      },
    ]

    const result = await partitionChangeset(changes, loadedModels)
    expect(result.cleanSubset).toHaveLength(0)
    expect(result.conflictedSubset).toHaveLength(1)
    expect(result.conflictDiagnostics.get('c1')?.code).toBe('PRECONDITION_FAILED')
    expect(result.conflictDiagnostics.get('c1')?.message).toContain('rename_element')
  })

  it('partitionChangeset flags missing target element as conflict', async () => {
    const model = createMockModel('strategy', {
      Vision: { statement: 'Accelerate clean energy' },
    })
    const loadedModels = new Map<string, ParsedKnowledge>([['strategy', model]])

    const changes: ChangeItem[] = [
      {
        id: 'c1',
        op: 'update_field',
        target: 'strategy@NonExistent&field',
        to: 'val',
      },
    ]

    const result = await partitionChangeset(changes, loadedModels)
    expect(result.cleanSubset).toHaveLength(0)
    expect(result.conflictedSubset).toHaveLength(1)
    expect(result.conflictDiagnostics.get('c1')?.code).toBe('PRECONDITION_FAILED')
    expect(result.conflictDiagnostics.get('c1')?.message).toContain('Target element')
  })

  it('partitionChangeset integrates reference conflicts from impact analysis', async () => {
    const model = createMockModel('core', {
      Auth: {},
    })
    const loadedModels = new Map<string, ParsedKnowledge>([['core', model]])

    const changes: ChangeItem[] = [
      {
        id: 'del1',
        op: 'remove_element',
        target: 'core@Auth',
      },
    ]

    const refConflicts = new Map<string, string>([
      ['del1', 'REFERENCED_BY: client@app&depends_on'],
    ])

    const result = await partitionChangeset(
      changes,
      loadedModels,
      undefined,
      undefined,
      refConflicts,
    )
    expect(result.cleanSubset).toHaveLength(0)
    expect(result.conflictedSubset).toHaveLength(1)
    expect(result.conflictDiagnostics.get('del1')?.code).toBe('REFERENCED_BY')
    expect(result.conflictDiagnostics.get('del1')?.message).toContain('REFERENCED_BY')
  })

  it('matches correct element across concepts with duplicate names, avoiding false STALE_BASE_HASH (#189)', async () => {
    const model = createMockMultiConceptModel('system', {
      Features: {
        General: { priority: 'high' },
      },
      Modules: {
        General: { weight: 10 },
      },
    })
    const loadedModels = new Map<string, ParsedKnowledge>([['system', model]])

    const moduleGeneralEl = model.elements.get('Modules')![0]
    const moduleGeneralHash = hashParsedElement('Modules', moduleGeneralEl as any)

    // Change with concept explicitly set to 'Modules'
    const changeWithConcept: ChangeItem = {
      id: 'c1',
      op: 'update_field',
      target: 'system@General&weight',
      concept: 'Modules',
      base_hash: moduleGeneralHash,
      to: 20 as any,
    }

    // Change without concept, but base_hash matches the 'Modules' element
    const changeWithoutConcept: ChangeItem = {
      id: 'c2',
      op: 'update_field',
      target: 'system@General&weight',
      base_hash: moduleGeneralHash,
      to: 30 as any,
    }

    const result = await partitionChangeset([changeWithConcept, changeWithoutConcept], loadedModels)
    expect(result.conflictedSubset).toHaveLength(0)
    expect(result.cleanSubset).toHaveLength(2)
    expect(result.cleanSubset.map((c) => c.id)).toEqual(['c1', 'c2'])
  })
})
