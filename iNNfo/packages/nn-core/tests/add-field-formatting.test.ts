import { describe, it, expect } from 'vitest'
import { parseKnowledge, serializeKnowledge } from '../src/parser/index.js'
import { applyMutation } from '../src/mutate.js'
import type { ElementNode } from '../src/types/index.js'

/**
 * Regression: `add_field` appended a Field Definition whose block (a) was glued
 * to the previous one with no blank line, and (b) duplicated its description —
 * once as the `description::` field, once as element prose.
 */
const TEMPLATE = `---
spec_version: "V_0-5-0"
level: 2
parent_spec:
  name: "iNNfo_V_0-5-0"
  url: "https://example.com/iNNfo_V_0-5-0_NN.md"
title: "Custom App"
blueprint_name: "custom"
blueprint_version: "V_0-1-0"
---

# NN index

* [[Thing]]

# NN Concept Definition

## NN Concept Definition: Thing
slug:: thing
type:: list
color:: blue
weight:: 90

# NN Field Definition

## NN Field Definition: kind
slug:: thingkind
concept:: Thing
type:: select
options:: [a, b]
description:: Role of the thing.

# NN Matrix Definition

## NN Matrix Definition: M
source:: Thing
target:: Thing
widget:: text
description:: Una matriz.
`

function fieldOf(model: ReturnType<typeof parseKnowledge>, name: string): ElementNode {
  const el = model.elements.get('Field Definition')?.find((e) => e.name === name)
  if (!el) throw new Error(`field "${name}" not found`)
  return el
}

describe('add_field emits a canonical Field Definition block', () => {
  it('does not duplicate the description into element prose', () => {
    const model = parseKnowledge(TEMPLATE)
    const res = applyMutation(model, 'add_field', {
      conceptName: 'Thing',
      fieldName: 'status',
      fieldType: 'select',
      options: ['active', 'inactive'],
      description: 'Estado de la cosa.',
    })
    expect(res.success).toBe(true)

    const status = fieldOf(model, 'status')
    expect(status.fields['description']).toBe('Estado de la cosa.')
    expect(status.description).toBe('')

    const out = serializeKnowledge(model)
    expect(out.match(/Estado de la cosa\./g)).toHaveLength(1)
  })

  it('separates the new block from the previous one with a blank line', () => {
    const model = parseKnowledge(TEMPLATE)
    applyMutation(model, 'add_field', {
      conceptName: 'Thing',
      fieldName: 'status',
      fieldType: 'select',
      options: ['active', 'inactive'],
      description: 'Estado de la cosa.',
    })

    const out = serializeKnowledge(model)
    const headingIdx = out.indexOf('## NN Field Definition: status')
    expect(headingIdx).toBeGreaterThan(-1)
    // The block before it must end with a blank line, not be glued to the heading.
    expect(out.slice(0, headingIdx).endsWith('\n\n')).toBe(true)
    expect(out).not.toContain('description:: Role of the thing.\n## NN')
  })

  it('still parses back to a valid Field Definition', () => {
    const model = parseKnowledge(TEMPLATE)
    applyMutation(model, 'add_field', {
      conceptName: 'Thing',
      fieldName: 'status',
      fieldType: 'select',
      options: ['active', 'inactive'],
      description: 'Estado de la cosa.',
    })

    const reparsed = parseKnowledge(serializeKnowledge(model))
    const status = reparsed.elements.get('Field Definition')?.find((e) => e.name === 'status')
    expect(status).toBeDefined()
    expect(status?.fields['concept']).toBe('Thing')
    expect(status?.fields['type']).toBe('select')
  })
})
