import { describe, it, expect } from 'vitest'
import { resolveBlueprintSchema } from '../src/index'

// Spec: console-payload-builder "Single Payload Builder" — schema definitions carry
// `declaredBy: { family, version, location }`, the identity of the bluepriNNt that declared them.
const PARENT = `---
level: 2
title: "Business App"
blueprint_name: "business"
blueprint_version: "V_0-5-0"
---

# NN Concept Definition
## NN Concept Definition: Goal
type:: list

# NN Field Definition
## NN Field Definition: owner
concept:: Goal
type:: reference
`

describe('declaredBy provenance', () => {
  it('concepts and fields carry their declaring blueprint family and version', () => {
    const { schema } = resolveBlueprintSchema(PARENT)
    const goal = schema.concepts.find((c) => c.name === 'Goal')!
    expect((goal as any).declaredBy).toMatchObject({ family: 'business', version: 'V_0-5-0' })
    const owner = goal.fields!.find((f) => f.name === 'owner')!
    expect((owner as any).declaredBy.family).toBe('business')
  })
})
