import { describe, it, expect } from 'vitest'
import { parseModel } from './parser'
import { applyMutation } from './mutate'

const TEMPLATE = `---
spec_version: "V_0-2-0"
spec_url: "https://example.test/iNNfo_V_0-2-0_NN.md"
level: 2
parent_spec:
  name: "iNNfo_V_0-2-0"
  url: "https://example.test/iNNfo_V_0-2-0_NN.md"
title: "Fixture"
---

# NN Concept Definition
## NN Concept Definition: Phase
type:: list

# NN Phase
## NN Phase: First
note:: keep
`

describe('applyMutation transactionality', () => {
  it('commits a successful op onto the caller model in place (same reference)', () => {
    const model = parseModel(TEMPLATE)
    const ref = model
    const result = applyMutation(model, 'add_concept', { conceptName: 'Risk', type: 'list' })
    expect(result.success).toBe(true)
    expect(model).toBe(ref) // not replaced
    const names = (model.elements.get('Concept Definition') ?? []).map((c) => c.name)
    expect(names).toContain('Risk')
  })

  it('leaves the model untouched when the op fails', () => {
    const model = parseModel(TEMPLATE)
    const before = JSON.stringify(model)
    const result = applyMutation(model, 'add_concept', { conceptName: 'Elements', type: 'list' })
    expect(result.success).toBe(false)
    expect(JSON.stringify(model)).toBe(before)
  })

  it('does not partially apply a rename that fails a model-wide uniqueness check', () => {
    const model = parseModel(TEMPLATE)
    applyMutation(model, 'add_concept', { conceptName: 'Task', type: 'list' })
    applyMutation(model, 'add_element', { conceptName: 'Task', elementName: 'Second' })
    const before = JSON.stringify(model)
    // "Second" already exists model-wide -> rename must be rejected whole
    const result = applyMutation(model, 'rename_element', {
      conceptName: 'Phase',
      elementName: 'First',
      newName: 'Second',
    })
    expect(result.success).toBe(false)
    expect(JSON.stringify(model)).toBe(before)
  })

  it('accumulates across sequential successful ops', () => {
    const model = parseModel(TEMPLATE)
    expect(applyMutation(model, 'add_concept', { conceptName: 'A', type: 'list' }).success).toBe(true)
    expect(applyMutation(model, 'add_concept', { conceptName: 'B', type: 'list' }).success).toBe(true)
    const names = (model.elements.get('Concept Definition') ?? []).map((c) => c.name)
    expect(names).toEqual(expect.arrayContaining(['Phase', 'A', 'B']))
  })
})
