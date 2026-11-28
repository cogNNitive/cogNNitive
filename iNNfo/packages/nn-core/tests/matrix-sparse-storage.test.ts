/**
 * Tests for openspec/changes/matrix-sparse-storage: add_matrix seeds no cell,
 * emptying a cell deletes the pair, a touched matrix is pruned lazily, and a
 * `-` in the table is the hole marker for an absent pair, never a cell.
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

describe('matrix-sparse-storage', () => {
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
    expect(diag?.message).toContain('persists four cells in rows or columns with no value')
  })
})

describe('matrix hole marker', () => {
  const ACCESS = `---
level: 3
knowledge_version: "V_0-1-0"
title: "Access"
---

# NN matrices: Access

`

  const sorted = (cells: ReadonlyArray<{ row: string; col: string; value: string }>) =>
    [...cells].sort((a, b) => `${a.row}|${a.col}`.localeCompare(`${b.row}|${b.col}`))

  const hygiene = async (content: string) => {
    const { matrixHygieneDiagnostics } = await import('../src/domain/index.js')
    const model = parseKnowledge(content)
    return matrixHygieneDiagnostics({
      path: 'access_NN.md',
      frontmatter: {},
      elements: [],
      matrices: model.matrices,
    })
  }

  it('a non-rectangular sparse matrix round-trips to the same cells, converges and raises no warning', async () => {
    const model = parseKnowledge(
      `${ACCESS}| Role \\ Permission | Read |\n| :--- | :---: |\n| Admin | allow |\n`,
    )
    const res = applyMutation(model, 'update_matrix_cell', {
      matrixName: 'Access',
      row: 'User',
      col: 'Write',
      value: 'allow',
    })
    expect(res.success).toBe(true)
    const inMemory = sorted(model.matrices[0].cells)
    expect(inMemory).toHaveLength(2)

    const first = serializeKnowledge(model)
    expect(first).toContain('| Admin | allow | - |')
    expect(first).toContain('| User | - | allow |')

    const reparsed = parseKnowledge(first)
    expect(sorted(reparsed.matrices[0].cells)).toEqual(inMemory)

    // Lazy prune converges: a touch of the re-read matrix writes the same bytes.
    const touched = applyMutation(reparsed, 'update_matrix_cell', {
      matrixName: 'Access',
      row: 'Admin',
      col: 'Read',
      value: 'allow',
    })
    expect(touched.success).toBe(true)
    expect(serializeKnowledge(reparsed)).toBe(first)
    expect(serializeKnowledge(parseKnowledge(first))).toBe(first)

    expect(await hygiene(first)).toEqual([])
  })

  it('a rectangular matrix still round-trips byte for byte', async () => {
    const content = `${ACCESS}| Role \\ Permission | Read | Write |\n| :--- | :---: | :---: |\n| Admin | allow | allow |\n| User | allow | deny |\n`
    const model = parseKnowledge(content)
    expect(model.matrices[0].cells).toHaveLength(4)
    expect(serializeKnowledge(model)).toBe(content)
    expect(await hygiene(content)).toEqual([])
  })

  it('keeps the column order of an untouched table whose first row has a hole', () => {
    const content = `${ACCESS}| Role \\ Permission | Read | Write | Delete |\n| :--- | :---: | :---: | :---: |\n| Admin | allow | - | allow |\n| User | - | allow | - |\n`
    const model = parseKnowledge(content)
    expect(model.matrices[0].cells).toHaveLength(3)
    expect(serializeKnowledge(model)).toBe(content)
  })

  it('warns about rows and columns persisted with no value, and the prune removes them', async () => {
    const content = `${ACCESS}| Role \\ Permission | Read | Write |\n| :--- | :---: | :---: |\n| Admin | allow | - |\n| User | - | - |\n`
    const diags = await hygiene(content)
    expect(diags).toHaveLength(1)
    expect(diags[0].code).toBe('PERSISTED_EMPTY_MATRIX_CELLS')
    expect(diags[0].message).toContain('persists three cells in rows or columns with no value')

    const model = parseKnowledge(content)
    applyMutation(model, 'update_matrix_cell', {
      matrixName: 'Access',
      row: 'Admin',
      col: 'Read',
      value: 'allow',
    })
    const pruned = serializeKnowledge(model)
    expect(pruned).toContain('| Role \\ Permission | Read |\n')
    expect(pruned).not.toContain('User')
    expect(await hygiene(pruned)).toEqual([])
  })
})
