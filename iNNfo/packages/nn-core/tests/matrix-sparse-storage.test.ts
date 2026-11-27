/**
 * RED test for openspec/changes/matrix-sparse-storage.
 *
 * These three expectations describe the behaviour the change specifies and do
 * NOT hold on the current main: `add_matrix` still seeds the full cartesian
 * product with empty values, `columns`/`rows` are still accepted as seeds, and
 * emptying a cell still persists `-`.
 *
 * Not committed on purpose: a failing test would red CI before the change lands.
 * The real output is captured in the change's delta spec.
 */
import { describe, expect, it } from 'vitest'
import { parseKnowledge, serializeKnowledge } from '../src/parser/index.js'
import { applyMutation } from '../src/mutate.js'

const TWO_AXES = `---
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
`

describe('matrix-sparse-storage (RED)', () => {
  it('D1: add_matrix declares the matrix without seeding a cell for any pair', () => {
    const model = parseKnowledge(TWO_AXES)
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
    expect(matrix!.cells).toEqual([])

    const serialized = serializeKnowledge(model)
    expect(serialized).toContain('# NN matrices: Dianas x Resultados')
    expect(serialized).not.toMatch(/\|\s*-\s*\|/)
  })

  it('D5: add_matrix refuses columns and rows as seeds', () => {
    const model = parseKnowledge(TWO_AXES)
    const res = applyMutation(model, 'add_matrix', {
      matrixName: 'Dianas x Resultados',
      source: 'Dianas',
      targetConcept: 'Resultados',
      columns: ['ARR up'],
      rows: ['Grow revenue'],
    })

    expect(res.success).toBe(false)
    expect(res.errors?.[0]?.message ?? '').toMatch(/columns|rows/i)
  })

  it('D4: emptying a matrix cell deletes the pair instead of persisting a dash', () => {
    const model = parseKnowledge(`---
level: 3
knowledge_version: "V_0-1-0"
title: "Access"
---

# NN matrices: Access

| Role \\ Permission | Read |
| :--- | :---: |
| Admin | allow |
`)
    const before = model.matrices.find((m) => m.name === 'Access')
    expect(before?.cells).toHaveLength(1)

    const res = applyMutation(model, 'update_matrix_cell', {
      matrixName: 'Access',
      row: 'Admin',
      col: 'Read',
      value: '',
    })

    expect(res.success).toBe(true)
    const after = model.matrices.find((m) => m.name === 'Access')
    expect(after?.cells).toEqual([])

    const serialized = serializeKnowledge(model)
    expect(serialized).not.toMatch(/\|\s*-\s*\|/)
  })

  it('D3: lazy pruning on untouched vs touched dense matrix', () => {
    const denseWithHoles = `---
level: 3
knowledge_version: "V_0-1-0"
title: "Access"
---

# NN matrices: Access

| Role \\ Permission | Read | Write |
| :--- | :---: | :---: |
| Admin | allow | - |
| User | - | - |
`
    // Untouched: round-trips without changes
    const model = parseKnowledge(denseWithHoles)
    const serializedUntouched = serializeKnowledge(model)
    expect(serializedUntouched).toContain('| Admin | allow | - |')
    expect(serializedUntouched).toContain('| User | - | - |')

    // Touched: lazy pruning cleans up cells with no value
    const res = applyMutation(model, 'update_matrix_cell', {
      matrixName: 'Access',
      row: 'Admin',
      col: 'Write',
      value: 'allow',
    })
    expect(res.success).toBe(true)
    const after = model.matrices.find((m) => m.name === 'Access')
    expect(after?.cells).toEqual([
      { row: 'Admin', col: 'Read', value: 'allow' },
      { row: 'Admin', col: 'Write', value: 'allow' },
    ])
    const serializedTouched = serializeKnowledge(model)
    expect(serializedTouched).not.toMatch(/\|\s*-\s*\|/)
  })

  it('reports PERSISTED_EMPTY_MATRIX_CELLS warning for persisted cells with no value', async () => {
    const { buildDomainIndex } = await import('../src/domain/index.js')
    const input = {
      path: 'targets_NN.md',
      frontmatter: {
        level: 3,
        parent_spec: { name: 'targets' },
      },
      elements: [],
      matrices: [
        {
          name: 'Targets',
          cells: [
            { row: 'A', col: '1', value: '' },
            { row: 'A', col: '2', value: '-' },
            { row: 'B', col: '1', value: '-' },
            { row: 'B', col: '2', value: '' },
          ],
        },
      ],
    }

    const index = buildDomainIndex([input], () => new Map())
    const diag = index.diagnostics.find((d) => d.code === 'PERSISTED_EMPTY_MATRIX_CELLS')
    expect(diag).toBeDefined()
    expect(diag?.severity).toBe('warning')
    expect(diag?.message).toContain('targets_NN.md')
    expect(diag?.message).toContain('Targets')
    expect(diag?.message).toContain('persists four cells with no value')
  })
})
