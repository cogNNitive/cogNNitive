import { describe, it, expect } from 'vitest'
import { parseKnowledge, serializeKnowledge } from '../../src/parser/index.js'
import { applyMutation } from '../../src/mutate.js'
import { CHANGE_OPS } from '../../src/changeset/types.js'

/**
 * `changeset-document-model`: the prose body is not a field.
 *
 * `update_element_text` writes `ElementNode.description` and never emits a
 * `description::` line; `update_field` on `description` is rejected with
 * `USE_UPDATE_ELEMENT_TEXT`; `add_element` no longer accepts inline `fields`.
 */

const MODEL = `---
spec_version: "V_0-4-0"
level: 3
knowledge_version: "V_0-1-0"
title: "Strategy"
---

# NN Work
## NN Work: Vision
statement:: Accelerate green energy
`

describe('the prose body is a unit, not a field', () => {
  it('update_element_text is a changeset operation', () => {
    expect(CHANGE_OPS).toContain('update_element_text')
  })

  it('update_element_text writes ElementNode.description and no description:: line', () => {
    const model = parseKnowledge(MODEL)
    const res = applyMutation(model, 'update_element_text', {
      elementName: 'Vision',
      to: 'Our north star',
    })
    expect(res.success).toBe(true)

    const serialized = serializeKnowledge(model)
    expect(serialized).toContain('Our north star')
    expect(serialized).not.toContain('description::')
    const reparsed = parseKnowledge(serialized)
    expect(reparsed.elements.get('Work')?.[0].description).toBe('Our north star')
  })

  it('update_element_text resolves the element from the change target', () => {
    const model = parseKnowledge(MODEL)
    const res = applyMutation(model, 'update_element_text', {
      target: 'strategy@Vision',
      text: 'From the target',
    })
    expect(res.success).toBe(true)
    expect(model.elements.get('Work')?.[0].description).toBe('From the target')
  })

  it('update_element_text on a missing element fails and writes nothing', () => {
    const model = parseKnowledge(MODEL)
    const res = applyMutation(model, 'update_element_text', {
      elementName: 'Ghost',
      to: 'Nope',
    })
    expect(res.success).toBe(false)
    expect(model.elements.get('Work')?.[0].description).toBe('')
  })

  it('update_field on description is rejected with USE_UPDATE_ELEMENT_TEXT', () => {
    const model = parseKnowledge(MODEL)
    const res = applyMutation(model, 'update_field', {
      target: 'strategy@Vision&description',
      to: 'Sneaking prose into a field',
    })
    expect(res.success).toBe(false)
    expect(res.errors?.[0].message).toContain('USE_UPDATE_ELEMENT_TEXT')
    expect(model.elements.get('Work')?.[0].description).toBe('')
    expect(model.elements.get('Work')?.[0].fields.description).toBeUndefined()
  })

  it('add_element rejects a fields key, pointing at "to"', () => {
    const model = parseKnowledge(MODEL)
    const res = applyMutation(model, 'add_element', {
      conceptName: 'Work',
      elementName: 'Mission',
      fields: { statement: 'Inline' },
    })
    expect(res.success).toBe(false)
    expect(res.errors?.[0].message).toContain('"to"')
    expect(model.elements.get('Work')?.some((e) => e.name === 'Mission')).toBe(false)
  })

  it('add_element still sets explicit root-level args on the direct mutation API', () => {
    const model = parseKnowledge(MODEL)
    const res = applyMutation(model, 'add_element', {
      conceptName: 'Work',
      elementName: 'Mission',
      statement: 'Set directly',
    })
    expect(res.success).toBe(true)
    expect(model.elements.get('Work')?.find((e) => e.name === 'Mission')?.fields.statement).toBe(
      'Set directly',
    )
  })
})
