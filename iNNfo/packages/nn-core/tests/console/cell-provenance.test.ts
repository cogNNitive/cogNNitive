/**
 * Matrix cell provenance in the console payload (change-provenance: consumers
 * read the log; console-payload-builder: every non-empty cell carries history and
 * origin).
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

const cell = (payload: ReturnType<typeof buildConsolePayload>) => {
  const matrix = payload.model.matrices[0]
  return matrix.provenance?.['Element 1A']?.['Element 2A']
}

describe('console matrix cell provenance', () => {
  it('derives the cell origin from the last applied change', () => {
    const payload = buildConsolePayload({
      content: MODEL,
      path: 'kNNowledge/Impact_NN.md',
      modelId: 'impact',
      changesets: [CHANGESET],
    })

    const provenance = cell(payload)
    expect(provenance).toBeDefined()
    expect(provenance?.origin?.changeId).toBe('c-02')
    expect(provenance?.origin?.evidence).toBe('sources/b.md@## Revised')
    expect(provenance?.history.map((hop) => hop.changeId)).toEqual(['c-01', 'c-02'])
  })

  it('carries no provenance for a cell no applied change touched', () => {
    const payload = buildConsolePayload({
      content: MODEL.replace('| Element 1A | high |', '| Element 1A | high |\n| - | - |'),
      path: 'kNNowledge/Impact_NN.md',
      changesets: [],
    })
    expect(payload.model.matrices[0].provenance).toBeUndefined()
  })
})
