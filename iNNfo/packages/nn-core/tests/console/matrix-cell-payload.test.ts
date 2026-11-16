/**
 * Matrix cells in the console payload (console-matrix-provenance-payload).
 *
 * The builder used to emit `matrix.provenance` — a per row/column map of
 * `{history, origin}` built with `deriveValueHistory` and `deriveFieldOrigin` for
 * every non-empty cell. No browser-side console source read it: nn-runtime.js,
 * review.js, ui-kit.js, studio.js, the render-* modules and the per-blueprint view
 * modules all render the cell VALUE only, and the size-budget degrade ladder never
 * walked matrices either. The export paid the derivation on every cell for a map
 * nothing displayed, so it is gone: a matrix ships its definition and its cells.
 */
import { describe, it, expect } from 'vitest'
import { buildConsolePayload } from '../../src/index.js'

const MODEL = `---
title: "Impact Model"
knowledge_version: "V_0-1-0"
parent_spec:
  name: "TestLab_V_0-1-0"
  url: "specs/TestLab_NN.md"
---

# NN Concept 1
## NN Concept 1: Element 1A
slug:: element-1a

## NN Concept 1: Element 2A
slug:: element-2a

# NN matrices: Impact Matrix
| - | Element 2A |
| :--- | :---: |
| Element 1A | high |
`

const CHANGESET = {
  path: 'changes/dom_lucas_20261010T120000Z_changes_NN.md',
  status: 'applied',
  author: 'lucas',
  appliedAt: '2026-10-10T12:00:00.000Z',
  changes: [
    {
      id: 'c-01',
      op: 'update_matrix_cell',
      target: 'Impact Model@Impact Matrix&element-1a&element-2a',
      resolved_target: 'impact@impact-matrix&element-1a&element-2a',
      to: 'high',
      evidence: 'sources/a.md@## Impact',
      status: 'applied',
    },
    {
      id: 'c-02',
      op: 'update_matrix_cell',
      target: 'Impact Model@Impact Matrix&element-1a&element-2a',
      resolved_target: 'impact@impact-matrix&element-1a&element-2a',
      to: 'critical',
      evidence: 'sources/b.md@## Revised',
      status: 'applied',
    },
  ],
}

describe('console matrix cells ship their values, not their provenance', () => {
  it('emits no per-cell provenance map for a cell two applied changes set', () => {
    const payload = buildConsolePayload({
      content: MODEL,
      path: 'kNNowledge/Impact_NN.md',
      modelId: 'impact',
      changesets: [CHANGESET],
    })

    const matrix = payload.model.matrices[0]
    // The derived map: the change log is read for the element history, never for a
    // matrix, so the matrix must not advertise one.
    expect(matrix).not.toHaveProperty('provenance')
    expect(matrix).not.toHaveProperty('history')
    // The cell itself still ships, which is what the Matrices view renders.
    expect(matrix.cells['Element 1A']?.['Element 2A']).toBe('high')
  })

  it('emits no provenance map when no changeset exists either', () => {
    const payload = buildConsolePayload({
      content: MODEL,
      path: 'kNNowledge/Impact_NN.md',
      changesets: [],
    })

    expect(payload.model.matrices[0]).not.toHaveProperty('provenance')
    expect(payload.model.matrices[0].cells['Element 1A']?.['Element 2A']).toBe('high')
  })
})
