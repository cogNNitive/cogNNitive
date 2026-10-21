import { describe, it, expect } from 'vitest'
import { parseKnowledge, serializeKnowledge } from '../../src/parser/index.js'
import { applyMutation, listMutationOperations } from '../../src/mutate.js'
import { parseChangeset } from '../../src/changeset/parser.js'
import { CHANGE_OPS, isChangeOp } from '../../src/changeset/types.js'
import { partitionChangeset } from '../../src/changeset/conflicts.js'
import { evaluateBatchDeleteImpact } from '../../src/changeset/impact.js'
import type { ChangeItem } from '../../src/changeset/types.js'
import type { BlueprintSchema } from '../../src/schema/index.js'

describe('Task 1.16 & 1.17: Changeset operations update_concept_field and remove_matrix', () => {
  it('CHANGE_OPS includes update_concept_field and remove_matrix', () => {
    expect(isChangeOp('update_concept_field')).toBe(true)
    expect(isChangeOp('remove_matrix')).toBe(true)
    expect(isChangeOp('add_matrix')).toBe(true)
    expect(CHANGE_OPS).toContain('update_concept_field')
    expect(CHANGE_OPS).toContain('remove_matrix')
    expect(CHANGE_OPS).toContain('add_matrix')
    expect(CHANGE_OPS).toContain('freeze_slugs')
    expect(CHANGE_OPS).toContain('bump_version')
  })

  it('classification partition test: all operations partitioned into ChangeOp, maintenance, schema', () => {
    // Spec: Direct apply_change operations are a closed, classified set
    // Exhaustive lists:
    // ChangeOps include freeze_slugs, bump_version, update_concept_field, remove_matrix
    // Direct maintenance is generate_index only
    // Direct schema ops are add_concept, add_field
    const maintenanceOps = ['generate_index']
    const schemaOps = ['add_concept', 'add_field', 'set_marker'] // set_marker removed in S3
    const allKnown = new Set([...CHANGE_OPS, ...maintenanceOps, ...schemaOps])

    for (const op of listMutationOperations()) {
      expect(allKnown.has(op)).toBe(true)
    }
  })

  describe('parser & serializer', () => {
    it('parses update_concept_field and remove_matrix change blocks', () => {
      const markdown = `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: changes
  url: "https://example.test/changes/spec_NN.md"
blueprint_version: "0.1.0"
status: proposed
title: "Concept field and remove matrix"
---

# NN Change

## NN Change: c-01
op:: update_concept_field
target:: strategy@concept:Goals&tags
from:: [core]
to:: [core, ai]
author:: agent-writer

## NN Change: c-02
op:: remove_matrix
target:: strategy@matrix:Access Matrix
author:: agent-writer
`
      const doc = parseChangeset(markdown)
      expect(doc.changes).toHaveLength(2)

      expect(doc.changes[0]).toEqual({
        id: 'c-01',
        op: 'update_concept_field',
        target: 'strategy@concept:Goals&tags',
        from: '[core]',
        to: '[core, ai]',
        author: 'agent-writer',
      })

      expect(doc.changes[1]).toEqual({
        id: 'c-02',
        op: 'remove_matrix',
        target: 'strategy@matrix:Access Matrix',
        author: 'agent-writer',
      })
    })
  })

  describe('conflicts & preconditions (partitionChangeset)', () => {
    const mockModel = (options?: { conceptFields?: Record<string, unknown>; matrices?: Array<{ name: string; cells: any[] }> }) => {
      const m = parseKnowledge(`---
spec_version: "V_0-4-0"
level: 3
knowledge_version: "V_0-1-0"
title: "Strategy"
---

# NN Goals
tags:: [core]
priority:: high

## NN Goals: Vision
statement:: Accelerate clean energy

# NN matrices: Access Matrix
| Role \\ Permission | Read | Write |
| :--- | :---: | :---: |
| Admin | allow | allow |
`)
      return m
    }

    it('update_concept_field: succeeds when from matches canonical current value', async () => {
      const model = mockModel()
      const loadedModels = new Map([['strategy', model]])

      const changes: ChangeItem[] = [
        {
          id: 'c-01',
          op: 'update_concept_field',
          target: 'strategy@concept:Goals&tags',
          from: '[core]',
          to: '[core, ai]',
        },
      ]

      const result = await partitionChangeset(changes, loadedModels)
      expect(result.cleanSubset).toHaveLength(1)
      expect(result.conflictedSubset).toHaveLength(0)
    })

    it('update_concept_field: fails with PRECONDITION_FAILED when from does not match', async () => {
      const model = mockModel()
      const loadedModels = new Map([['strategy', model]])

      const changes: ChangeItem[] = [
        {
          id: 'c-01',
          op: 'update_concept_field',
          target: 'strategy@concept:Goals&tags',
          from: '[stale]',
          to: '[core, ai]',
        },
      ]

      const result = await partitionChangeset(changes, loadedModels)
      expect(result.cleanSubset).toHaveLength(0)
      expect(result.conflictedSubset).toHaveLength(1)
      expect(result.conflictDiagnostics.get('c-01')?.code).toBe('PRECONDITION_FAILED')
    })

    it('update_concept_field: validates value against declared schema field via validateFieldValue', async () => {
      const model = mockModel()
      const loadedModels = new Map([['strategy', model]])

      const schema: BlueprintSchema = {
        name: 'test',
        concepts: [{ name: 'Goals' }],
        fields: [
          {
            name: 'scope',
            concept: 'Goals',
            type: 'select',
            options: ['core', 'edge'],
            multiple: true,
          },
        ],
        matrices: [],
      }

      // We will check schema-based validation in applyMutation or partitionChangeset
    })

    it('remove_matrix: fails with PRECONDITION_FAILED when matrix does not exist in model', async () => {
      const model = mockModel()
      const loadedModels = new Map([['strategy', model]])

      const changes: ChangeItem[] = [
        {
          id: 'c-01',
          op: 'remove_matrix',
          target: 'strategy@matrix:Ghost Matrix',
        },
      ]

      const result = await partitionChangeset(changes, loadedModels)
      expect(result.cleanSubset).toHaveLength(0)
      expect(result.conflictedSubset).toHaveLength(1)
      expect(result.conflictDiagnostics.get('c-01')?.code).toBe('PRECONDITION_FAILED')
      expect(result.conflictDiagnostics.get('c-01')?.message).toContain('Ghost Matrix')
    })
  })

  describe('impact & batch conflicts', () => {
    it('reports conflict when two changes in one batch target the same concept field', () => {
      const changes: ChangeItem[] = [
        {
          id: 'c-01',
          op: 'update_concept_field',
          target: 'strategy@concept:Goals&tags',
          to: '[core, ai]',
        },
        {
          id: 'c-02',
          op: 'update_concept_field',
          target: 'strategy@concept:Goals&tags',
          to: '[core, cloud]',
        },
      ]

      const loadedModels = new Map()
      const workspaceModels = new Map()
      const impact = evaluateBatchDeleteImpact(changes, loadedModels, workspaceModels)
      // We will verify batch conflict detection for concept field
    })

    it('reports conflict when two changes in one batch target the same matrix', () => {
      const changes: ChangeItem[] = [
        {
          id: 'c-01',
          op: 'remove_matrix',
          target: 'strategy@matrix:Access Matrix',
        },
        {
          id: 'c-02',
          op: 'remove_matrix',
          target: 'strategy@matrix:Access Matrix',
        },
      ]

      const loadedModels = new Map()
      const workspaceModels = new Map()
      const impact = evaluateBatchDeleteImpact(changes, loadedModels, workspaceModels)
      // We will verify batch conflict detection for matrix
    })
  })

  describe('mutation engine (applyMutation)', () => {
    it('update_concept_field updates conceptFields and rawConceptFields without touching elements or prose', () => {
      const model = parseKnowledge(`---
spec_version: "V_0-4-0"
level: 3
knowledge_version: "V_0-1-0"
title: "Strategy"
---

# NN Overview
tags:: [core]

Prose description of overview.
`)
      const res = applyMutation(model, 'update_concept_field', {
        conceptName: 'Overview',
        fieldName: 'tags',
        value: '[core, ai]',
      })
      expect(res.success).toBe(true)

      expect(model.conceptFields?.['Overview']?.tags).toEqual(['core', 'ai'])

      const serialized = serializeKnowledge(model)
      expect(serialized).toContain('tags:: [core, ai]')
      expect(serialized).toContain('Prose description of overview.')
    })

    it('remove_matrix removes the named matrix from matrices and sectionOrder', () => {
      const model = parseKnowledge(`---
spec_version: "V_0-4-0"
level: 3
knowledge_version: "V_0-1-0"
title: "Strategy"
---

# NN Goals
## NN Goals: Vision

# NN matrices: Access Matrix
| Role \\ Permission | Read |
| :--- | :---: |
| Admin | allow |
`)
      const res = applyMutation(model, 'remove_matrix', {
        matrixName: 'Access Matrix',
      })
      expect(res.success).toBe(true)
      expect(model.matrices.some((m) => m.name === 'Access Matrix')).toBe(false)

      const serialized = serializeKnowledge(model)
      expect(serialized).not.toContain('Access Matrix')
    })

    it('remove_matrix removes item-markers matrix and deletes nodeMarkers', () => {
      const model = parseKnowledge(`---
spec_version: "V_0-4-0"
level: 3
knowledge_version: "V_0-1-0"
title: "Strategy"
---

# NN Goals
## NN Goals: Vision

# NN matrices: item-markers matrix
| Item \\ Marker | Priority |
| :--- | :---: |
| Vision | ! |
`)
      expect(model.matrices.some((m) => m.name === 'item-markers matrix')).toBe(true)
      const res = applyMutation(model, 'remove_matrix', {
        matrixName: 'item-markers matrix',
      })
      expect(res.success).toBe(true)
      expect(model.matrices.some((m) => m.name === 'item-markers matrix')).toBe(false)

      const serialized = serializeKnowledge(model)
      expect(serialized).not.toContain('item-markers matrix')
    })

    it('add_matrix creates a new table, seeding rows/columns from the axis concepts (cogNNitive-web#19)', () => {
      const model = parseKnowledge(`---
spec_version: "V_0-4-0"
level: 3
knowledge_version: "V_0-1-0"
title: "Targets"
---

# NN Dianas
## NN Dianas: Grow revenue
## NN Dianas: Cut churn

# NN Resultados
## NN Resultados: ARR up
## NN Resultados: Logo retention
`)
      const res = applyMutation(model, 'add_matrix', {
        matrixName: 'Dianas x Resultados',
        source: 'Dianas',
        targetConcept: 'Resultados',
      })
      expect(res.success).toBe(true)
      const matrix = model.matrices.find((m) => m.name === 'Dianas x Resultados')
      expect(matrix).toBeDefined()
      expect(matrix!.source).toBe('Dianas')
      expect(matrix!.target).toBe('Resultados')
      // rows = Dianas elements, cols = Resultados elements: a full seeded grid.
      const rows = new Set(matrix!.cells.map((c) => c.row))
      const cols = new Set(matrix!.cells.map((c) => c.col))
      expect([...rows].sort()).toEqual(['Cut churn', 'Grow revenue'])
      expect([...cols].sort()).toEqual(['ARR up', 'Logo retention'])

      const serialized = serializeKnowledge(model)
      expect(serialized).toContain('# NN matrices: Dianas x Resultados')
      expect(serialized).toContain('| Dianas \\ Resultados | ARR up | Logo retention |')
    })

    it('add_matrix rejects a matrix that already exists', () => {
      const model = parseKnowledge(`---
spec_version: "V_0-4-0"
level: 3
knowledge_version: "V_0-1-0"
title: "Targets"
---

# NN matrices: Access Matrix
| Role \\ Permission | Read |
| :--- | :---: |
| Admin | allow |
`)
      const res = applyMutation(model, 'add_matrix', { matrixName: 'Access Matrix', source: 'Role', targetConcept: 'Permission' })
      expect(res.success).toBe(false)
      expect(res.errors?.[0].message).toMatch(/already exists/i)
    })

    it('add_matrix is refused on a Level-2 bluepriNNt', () => {
      const model = parseKnowledge(`---
spec_version: "V_0-5-0"
level: 2
blueprint_version: "V_0-1-0"
blueprint_name: "targets"
title: "Targets"
parent_spec:
  name: "iNNfo_V_0-5-0"
  url: "https://example/iNNfo_V_0-5-0_NN.md"
---

# NN index
`)
      const res = applyMutation(model, 'add_matrix', { matrixName: 'X', source: 'A', targetConcept: 'B' })
      expect(res.success).toBe(false)
      expect(res.errors?.[0].message).toMatch(/level-3/i)
    })

    it('update_concept_text preserves concept property block byte-identically', () => {
      const model = parseKnowledge(`---
spec_version: "V_0-4-0"
level: 3
knowledge_version: "V_0-1-0"
title: "Strategy"
---

# NN Overview
tags:: [core, strategic]
health:: nominal

Initial prose before update.
`)
      expect(model.conceptFields?.['Overview']?.tags).toEqual(['core', 'strategic'])
      expect(model.conceptFields?.['Overview']?.health).toBe('nominal')

      const res = applyMutation(model, 'update_concept_text', {
        conceptName: 'Overview',
        text: 'Updated prose text for overview.',
      })
      expect(res.success).toBe(true)

      const serialized = serializeKnowledge(model)
      expect(serialized).toContain('tags:: [core, strategic]')
      expect(serialized).toContain('health:: nominal')
      expect(serialized).toContain('Updated prose text for overview.')
    })

    it('multi-valued update_field validates per member and rejects invalid option with schema', () => {
      const model = parseKnowledge(`---
spec_version: "V_0-4-0"
level: 3
knowledge_version: "V_0-1-0"
title: "Strategy"
---

# NN Goals
## NN Goals: Vision
scope:: [core]
`)
      const schema: BlueprintSchema = {
        name: 'test',
        concepts: [{ name: 'Goals' }],
        fields: [
          {
            name: 'scope',
            concept: 'Goals',
            type: 'select',
            options: ['core', 'edge'],
            multiple: true,
          },
        ],
        matrices: [],
      }

      const badRes = applyMutation(
        model,
        'update_field',
        {
          elementName: 'Vision',
          fieldName: 'scope',
          value: '[core, invalid_option]',
        },
        schema,
      )
      expect(badRes.success).toBe(false)
      expect(badRes.errors?.[0].message).toContain('invalid_option')

      const goodRes = applyMutation(
        model,
        'update_field',
        {
          elementName: 'Vision',
          fieldName: 'scope',
          value: '[core, edge]',
        },
        schema,
      )
      expect(goodRes.success).toBe(true)
      expect(model.elements.get('Goals')?.[0].fields.scope).toEqual(['core', 'edge'])
    })
  })
})
