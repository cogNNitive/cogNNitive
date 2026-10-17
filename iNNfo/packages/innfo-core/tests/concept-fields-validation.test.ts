import { describe, it, expect } from 'vitest'
import { parseKnowledge } from '../src/parser/index.js'
import { validateKnowledge } from '../src/validator/index.js'
import type { SpecDocument } from '../src/types/index.js'

function makeTemplate(content: string): SpecDocument {
  return {
    rawContent: content,
    format: 'markdown',
  }
}

describe('Task 1.13: Concept-level Field value validation', () => {
  const templateWithFields = makeTemplate(`---
name: test-template
level: 2
version: 1.0.0
---

# NN Concept Definition
## NN Concept Definition: Goals
type:: model

### Guidance
Guidance text here.

### Rules
Rules text here.

### Relationships
Relationships text here.

# NN Field Definition
## NN Field Definition: tags
type:: select
multiple:: true
options:: [core, strategic, experimental]
concept:: Goals

## NN Field Definition: health
type:: select
multiple:: false
options:: [nominal, warning, critical]
concept:: Goals

## NN Field Definition: score
type:: number
widget:: scale
widget_config:: {"min": 0, "max": 100, "step": 5}
concept:: Goals
`)

  it('passes when concept-level values satisfy declared field rules', () => {
    const doc = `---
parent_spec: test-template
level: 3
knowledge_version: 1.0.0
version: 1.0.0
---

# NN Goals
tags:: [core, strategic]
health:: nominal
score:: 50

## NN Goals: Expand Market
tags:: [experimental]
`
    const parsed = parseKnowledge(doc)
    const result = validateKnowledge(parsed, templateWithFields, null)
    const fieldErrors = result.errors.filter((e) => e.path?.includes('Goals'))
    expect(fieldErrors).toHaveLength(0)
    expect(result.valid).toBe(true)
  })

  it('reports ERROR naming concept and Field when concept-level select value is invalid', () => {
    const doc = `---
parent_spec: test-template
level: 3
knowledge_version: 1.0.0
version: 1.0.0
---

# NN Goals
tags:: [core, invalid-tag]
health:: disaster

## NN Goals: Expand Market
tags:: [core]
`
    const parsed = parseKnowledge(doc)
    const result = validateKnowledge(parsed, templateWithFields, null)
    expect(result.valid).toBe(false)

    // Check that errors name the concept and Field
    const tagError = result.errors.find((e) => e.path?.includes('Goals') && e.path?.includes('tags'))
    expect(tagError).toBeDefined()
    expect(tagError?.message).toContain('invalid-tag')

    const healthError = result.errors.find((e) => e.path?.includes('Goals') && e.path?.includes('health'))
    expect(healthError).toBeDefined()
    expect(healthError?.message).toContain('disaster')
  })

  it('reports ERROR when number or scale constraints are violated at concept level', () => {
    const doc = `---
parent_spec: test-template
level: 3
knowledge_version: 1.0.0
version: 1.0.0
---

# NN Goals
score:: 105

## NN Goals: Expand Market
`
    const parsed = parseKnowledge(doc)
    const result = validateKnowledge(parsed, templateWithFields, null)
    expect(result.valid).toBe(false)

    const scoreError = result.errors.find((e) => e.path?.includes('Goals') && e.path?.includes('score'))
    expect(scoreError).toBeDefined()
    expect(scoreError?.message).toContain('105')
  })

  it('validates concept-level values only once even if multiple elements exist', () => {
    const doc = `---
parent_spec: test-template
level: 3
knowledge_version: 1.0.0
version: 1.0.0
---

# NN Goals
health:: disaster

## NN Goals: Item 1
## NN Goals: Item 2
## NN Goals: Item 3
`
    const parsed = parseKnowledge(doc)
    const result = validateKnowledge(parsed, templateWithFields, null)
    const healthErrors = result.errors.filter((e) => e.path?.includes('Goals') && e.path?.includes('health'))
    // Exactly one error for the concept-level invalid value, not one per element
    expect(healthErrors).toHaveLength(1)
  })
})
