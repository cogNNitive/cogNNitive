import { describe, it, expect } from 'vitest'
import { partitionChangeset } from '../../src/changeset/conflicts.js'
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
})
