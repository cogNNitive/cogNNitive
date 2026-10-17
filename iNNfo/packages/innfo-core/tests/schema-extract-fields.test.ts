import { describe, it, expect } from 'vitest'
import { parseKnowledge } from '../src/parser/index.js'
import { extractBlueprintSchema } from '../src/schema/extract.js'

describe('extractBlueprintSchema Field Targets and Attributes (Task 1.6)', () => {
  it('extracts concept:: * as scope="*" and populates globalFields', () => {
    const content = `---
title: "Test"
---
# NN Concept Definition
## NN Concept Definition: Goal
  type:: text

# NN Field Definition
## NN Field Definition: complexity
  concept:: *
  type:: number
  widget:: scale
  widget_config:: {"min":0,"max":100,"step":5}
`
    const schema = extractBlueprintSchema(parseKnowledge(content))
    expect(schema.globalFields).toBeDefined()
    expect(schema.globalFields).toHaveLength(1)
    const gf = schema.globalFields![0]
    expect(gf.field.name).toBe('complexity')
    expect(gf.field.type).toBe('number')
    expect(gf.field.scope).toBe('*')
    expect(gf.field.widget).toBe('scale')
    expect(gf.field.widgetConfig).toEqual({ min: 0, max: 100, step: 5 })
    expect(gf.scope).toBe('*')
  })

  it('extracts concept:: [Goal, Risk] as scope="list" and populates globalFields with targets', () => {
    const content = `---
title: "Test"
---
# NN Concept Definition
## NN Concept Definition: Goal
  type:: list
## NN Concept Definition: Risk
  type:: list

# NN Field Definition
## NN Field Definition: priority
  concept:: [Goal, Risk]
  type:: select
  multiple:: true
  options:: [low, high]
`
    const schema = extractBlueprintSchema(parseKnowledge(content))
    expect(schema.globalFields).toBeDefined()
    expect(schema.globalFields).toHaveLength(1)
    const gf = schema.globalFields![0]
    expect(gf.field.name).toBe('priority')
    expect(gf.field.scope).toBe('list')
    expect(gf.field.multiple).toBe(true)
    expect(gf.scope).toBe('list')
    expect(gf.targets).toEqual(['Goal', 'Risk'])
  })

  it('extracts single concept as scope="concept" directly on concept.fields', () => {
    const content = `---
title: "Test"
---
# NN Concept Definition
## NN Concept Definition: Goal
  type:: list

# NN Field Definition
## NN Field Definition: statement
  concept:: Goal
  type:: string
`
    const schema = extractBlueprintSchema(parseKnowledge(content))
    const goal = schema.concepts.find((c) => c.name === 'Goal')
    expect(goal).toBeDefined()
    expect(goal?.fields).toHaveLength(1)
    expect(goal?.fields![0].name).toBe('statement')
    expect(goal?.fields![0].scope).toBe('concept')
  })
})
