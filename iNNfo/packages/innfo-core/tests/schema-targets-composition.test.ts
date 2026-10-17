import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { resolveBlueprintSchema } from '../src/schema/compose.js'
import type { IncludedBlueprintRef } from '../src/types/parser.js'

const specsRoot = join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts')

describe('Field Definition Concept Targets and Includes Composition (Task 1.8)', () => {
  it('expands * on a template without includes to all concepts except type:: text', () => {
    const template = `---
title: "Solo Template"
---
# NN Concept Definition
## NN Concept Definition: Goal
  type:: list
## NN Concept Definition: Summary
  type:: text

# NN Field Definition
## NN Field Definition: complexity
  concept:: *
  type:: number
`
    const { schema, errors } = resolveBlueprintSchema(template)
    expect(errors).toEqual([])

    const goal = schema.concepts.find((c) => c.name === 'Goal')
    const summary = schema.concepts.find((c) => c.name === 'Summary')

    expect(goal?.fields?.some((f) => f.name === 'complexity')).toBe(true)
    expect(summary?.fields?.some((f) => f.name === 'complexity') ?? false).toBe(false)
  })

  it('root * reaches included concepts, but included * does not reach sibling includes', () => {
    const PROJECTS = `---
title: "Projects"
---
# NN Concept Definition
## NN Concept Definition: Project
  type:: list

# NN Field Definition
## NN Field Definition: health
  concept:: *
  type:: select
  options:: [nominal, warning, critical]
`

    const METRICS = `---
title: "Metrics"
---
# NN Concept Definition
## NN Concept Definition: Metric
  type:: list
`

    const BUSINESS = `---
title: "Business"
includes:
  - name: "projects"
  - name: "metrics"
---
# NN Concept Definition
## NN Concept Definition: Venture
  type:: list

# NN Field Definition
## NN Field Definition: tags
  concept:: *
  type:: select
  multiple:: true
`

    const resolver = (ref: IncludedBlueprintRef) => {
      if (ref.name === 'projects') return PROJECTS
      if (ref.name === 'metrics') return METRICS
      return null
    }

    const { schema, errors } = resolveBlueprintSchema(BUSINESS, resolver)
    expect(errors).toEqual([])

    const project = schema.concepts.find((c) => c.name === 'Project')
    const metric = schema.concepts.find((c) => c.name === 'Metric')
    const venture = schema.concepts.find((c) => c.name === 'Venture')

    // Root * (tags) reaches Project, Metric, and Venture
    expect(project?.fields?.some((f) => f.name === 'tags')).toBe(true)
    expect(metric?.fields?.some((f) => f.name === 'tags')).toBe(true)
    expect(venture?.fields?.some((f) => f.name === 'tags')).toBe(true)

    // Included * (health) reaches Project only, NOT Metric or Venture
    expect(project?.fields?.some((f) => f.name === 'health')).toBe(true)
    expect(metric?.fields?.some((f) => f.name === 'health')).toBe(false)
    expect(venture?.fields?.some((f) => f.name === 'health')).toBe(false)
  })

  it('concept-specific Field beats * Field of the same name silently', () => {
    const template = `---
title: "Override Test"
---
# NN Concept Definition
## NN Concept Definition: Task
  type:: list
## NN Concept Definition: Goal
  type:: list

# NN Field Definition
## NN Field Definition: priority
  concept:: *
  type:: select
  options:: [low, normal, high]

## NN Field Definition: priority
  concept:: Task
  type:: select
  options:: [urgent, defer]
`
    const { schema, errors } = resolveBlueprintSchema(template)
    expect(errors).toEqual([])

    const task = schema.concepts.find((c) => c.name === 'Task')
    const goal = schema.concepts.find((c) => c.name === 'Goal')

    const taskPriority = task?.fields?.find((f) => f.name === 'priority')
    const goalPriority = goal?.fields?.find((f) => f.name === 'priority')

    expect(taskPriority?.options).toEqual(['urgent', 'defer'])
    expect(goalPriority?.options).toEqual(['low', 'normal', 'high'])
  })

  it('reports ERROR when list target names an unknown concept', () => {
    const template = `---
title: "Unknown Target"
---
# NN Concept Definition
## NN Concept Definition: Goal
  type:: list

# NN Field Definition
## NN Field Definition: priority
  concept:: [Goal, Ghost]
  type:: select
`
    const { errors } = resolveBlueprintSchema(template)
    expect(errors.some((e) => e.severity === 'error' && e.message.includes('Ghost'))).toBe(true)
  })

  it('reports COMPOSITION_COLLISION when two included blueprints declare differing same-name * fields', () => {
    const BP_A = `---
title: "A"
---
# NN Concept Definition
## NN Concept Definition: ConceptA
  type:: list

# NN Field Definition
## NN Field Definition: tags
  concept:: *
  type:: select
  options:: [tagA]
`

    const BP_B = `---
title: "B"
---
# NN Concept Definition
## NN Concept Definition: ConceptB
  type:: list

# NN Field Definition
## NN Field Definition: tags
  concept:: *
  type:: select
  options:: [tagB]
`

    const ROOT = `---
title: "Root"
includes:
  - name: "a"
  - name: "b"
---
`

    const resolver = (ref: IncludedBlueprintRef) => {
      if (ref.name === 'a') return BP_A
      if (ref.name === 'b') return BP_B
      return null
    }

    const { errors } = resolveBlueprintSchema(ROOT, resolver)
    expect(
      errors.some(
        (e) => e.severity === 'error' && e.message.includes('COMPOSITION_COLLISION') && e.message.includes('tags'),
      ),
    ).toBe(true)
  })

  it('deduplicates identical * Fields across included blueprints silently', () => {
    const BP_A = `---
title: "A"
---
# NN Concept Definition
## NN Concept Definition: ConceptA
  type:: list

# NN Field Definition
## NN Field Definition: tags
  concept:: *
  type:: select
  multiple:: true
`

    const BP_B = `---
title: "B"
---
# NN Concept Definition
## NN Concept Definition: ConceptB
  type:: list

# NN Field Definition
## NN Field Definition: tags
  concept:: *
  type:: select
  multiple:: true
`

    const ROOT = `---
title: "Root"
includes:
  - name: "a"
  - name: "b"
---
`

    const resolver = (ref: IncludedBlueprintRef) => {
      if (ref.name === 'a') return BP_A
      if (ref.name === 'b') return BP_B
      return null
    }

    const { schema, errors } = resolveBlueprintSchema(ROOT, resolver)
    expect(errors).toEqual([])
    const conceptA = schema.concepts.find((c) => c.name === 'ConceptA')
    const conceptB = schema.concepts.find((c) => c.name === 'ConceptB')

    expect(conceptA?.fields?.filter((f) => f.name === 'tags')).toHaveLength(1)
    expect(conceptB?.fields?.filter((f) => f.name === 'tags')).toHaveLength(1)
  })

  it('golden test: resolves business blueprint and snapshots each concept fields', () => {
    const businessPath = join(specsRoot, 'business', 'spec_NN.md')
    const businessContent = readFileSync(businessPath, 'utf-8')
    const diskResolver = (ref: IncludedBlueprintRef) => {
      const filePath = join(specsRoot, ref.name, 'spec_NN.md')
      if (existsSync(filePath)) {
        return readFileSync(filePath, 'utf-8')
      }
      return null
    }

    const { schema, errors } = resolveBlueprintSchema(businessContent, diskResolver)
    expect(errors).toEqual([])
    expect(schema.concepts.length).toBeGreaterThan(0)

    const conceptFieldMap = Object.fromEntries(
      schema.concepts.map((c) => [c.name, (c.fields ?? []).map((f) => f.name).sort()]),
    )
    expect(conceptFieldMap).toMatchSnapshot()
  })
})
