import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  buildConsolePayload,
  parseFrontmatter,
  computeSha256,
  computeElementHash,
  canonicalJsonStringify,
  parseKnowledge,
  hashParsedElement,
} from '../src/index.js'

describe('Console Payload Builder', () => {
  const sampleMarkdown = `---
title: "Ghostbusters Business Model"
knowledge_version: "V_1-0-0"
parent_spec:
  name: "business"
  url: "https://example.com/business.md"
---

# NN Mission
## NN Mission: Ghostbusters Mission
slug:: ghostbusters-mission
description:: Rid New York City of supernatural threats.
sources:: sources/import/initial-brief.md#mission

# NN Service
## NN Service: Ghost Capture
slug:: ghost-capture
description:: Professional containment of spectral entities.
price:: 5000
`

  it('carries the current changes bluepriNNt version in the payload meta', () => {
    const payload = buildConsolePayload({
      content: sampleMarkdown,
      path: 'kNNowledge/biz/Ghostbusters_NN.md',
    })
    const spec = readFileSync(
      join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts', 'changes', 'spec_NN.md'),
      'utf8',
    )
    const shipped = parseFrontmatter(spec)?.blueprint_version
    expect(typeof shipped).toBe('string')
    expect(payload.model.meta.changesBlueprintVersion).toBe(shipped)
  })

  it('builds canonical console payload with schema and model slots', () => {
    const payload = buildConsolePayload({
      content: sampleMarkdown,
      path: 'kNNowledge/biz/Ghostbusters_NN.md',
    })

    expect(payload.schema).toBeDefined()
    expect(payload.model).toBeDefined()
    expect(payload.model.meta).toBeDefined()
    expect(payload.model.meta.modelId).toBe('kNNowledge/biz/Ghostbusters')
    expect(payload.model.meta.sources).toEqual(['kNNowledge/biz/Ghostbusters_NN.md'])
    expect(payload.model.meta.modelVersion).toBe('V_1-0-0')
    expect(payload.model.meta.sha256).toBe(computeSha256(sampleMarkdown))
    expect(Array.isArray(payload.model.elements)).toBe(true)
    expect(payload.model.elements.length).toBe(2)

    const mission = payload.model.elements[0]
    expect(mission.id).toBe('ghostbusters-mission')
    expect(mission.concept).toBe('Mission')
    expect(mission.name).toBe('Ghostbusters Mission')
    expect(mission.hash).toHaveLength(16)
    expect(mission.markers).toEqual({})
  })

  it('preserves stable modelId and element hashes across version bumps when content is otherwise unchanged', () => {
    const version1 = sampleMarkdown
    const version2 = sampleMarkdown.replace('knowledge_version: "V_1-0-0"', 'knowledge_version: "V_1-0-1"')

    const payload1 = buildConsolePayload({
      content: version1,
      path: 'kNNowledge/biz/Ghostbusters_NN.md',
    })
    const payload2 = buildConsolePayload({
      content: version2,
      path: 'kNNowledge/biz/Ghostbusters_NN.md',
    })

    expect(payload1.model.meta.modelId).toBe(payload2.model.meta.modelId)
    expect(payload1.model.meta.sha256).not.toBe(payload2.model.meta.sha256)
    expect(payload1.model.elements[0].hash).toBe(payload2.model.elements[0].hash)
  })

  it('changes element hash when an element field changes', () => {
    const modified = sampleMarkdown.replace('price:: 5000', 'price:: 6000')
    const payload1 = buildConsolePayload({ content: sampleMarkdown })
    const payload2 = buildConsolePayload({ content: modified })

    const elem1 = payload1.model.elements.find((e) => e.name === 'Ghost Capture')!
    const elem2 = payload2.model.elements.find((e) => e.name === 'Ghost Capture')!

    expect(elem1.hash).not.toBe(elem2.hash)
  })

  it('handles citation resolution when resolver is injected', () => {
    const mockResolver = (filePath: string) => {
      if (filePath === 'sources/import/initial-brief.md') {
        return {
          exists: true,
          content: '## Mission\nWe eliminate ghosts.\n',
        }
      }
      return { exists: false }
    }

    const payload = buildConsolePayload({
      content: sampleMarkdown,
      path: 'kNNowledge/biz/Ghostbusters_NN.md',
      resolver: mockResolver,
    })

    const mission = payload.model.elements[0]
    expect(mission.citations).toBeDefined()
    expect(mission.citations!.sources).toBeDefined()
    expect(mission.citations!.sources!.length).toBe(1)
    expect(mission.citations!.sources![0].exists).toBe(true)
    expect(mission.citations!.sources![0].path).toBe('sources/import/initial-brief.md')
  })

  it('payload meta carries no feedbackState verdicts', () => {
    const payload = buildConsolePayload({
      content: sampleMarkdown,
      path: 'kNNowledge/biz/Ghostbusters_NN.md',
    })
    expect(payload.model.meta).not.toHaveProperty('feedbackState')
  })
})

describe('Console Payload Builder: element tags', () => {
  const doc = (tagLines: { concept?: string; element?: string }) => `---
title: "Tags Lab"
knowledge_version: "V_1-0-0"
---

# NN Service
${tagLines.concept ? `tags:: ${tagLines.concept}
` : ''}
## NN Service: Ghost Capture
slug:: ghost-capture
${tagLines.element ? `tags:: ${tagLines.element}
` : ''}price:: 5000
`

  it('carries the element tags in fields', () => {
    const p = buildConsolePayload({ content: doc({ element: '[pricing, ai]' }) })
    expect(p.model.elements[0].fields.tags).toEqual(['pricing', 'ai'])
    expect((p.model.elements[0] as any).tags).toBeUndefined()
  })

  it('keeps hash equal to hashParsedElement', () => {
    const tagged = buildConsolePayload({ content: doc({ concept: '[core]', element: '[ai]' }) }).model.elements[0]
    const node = parseKnowledge(doc({ concept: '[core]', element: '[ai]' })).elements.get('Service')![0]
    expect(tagged.hash).toBe(hashParsedElement('Service', node))
  })
})

describe('Task 1.14: Declared Field Definitions in the Schema Slot', () => {
  it('schema.fields entries carry multiple, widget, widgetConfig, description, scope', () => {
    const mockSchema = {
      concepts: [
        {
          name: 'Initiative',
          fields: [
            {
              name: 'stage',
              type: 'select',
              multiple: true,
              options: ['idea', 'build'],
              widget: 'pills',
              widgetConfig: { color: 'blue' },
              description: 'Current development stage',
              scope: 'concept',
            },
          ],
        },
      ],
    }

    const { schema } = buildConsolePayload({
      content: `---
title: "Initiatives"
knowledge_version: "V_1-0-0"
---
# NN Initiative
## NN Initiative: Project X
slug:: project-x
`,
      schema: mockSchema,
    })

    expect(schema.fields).toHaveLength(1)
    const f = schema.fields[0]
    expect(f.concept).toBe('Initiative')
    expect(f.name).toBe('stage')
    expect(f.type).toBe('select')
    expect(f.multiple).toBe(true)
    expect(f.options).toEqual(['idea', 'build'])
    expect(f.widget).toBe('pills')
    expect(f.widgetConfig).toEqual({ color: 'blue' })
    expect(f.description).toBe('Current development stage')
    expect(f.scope).toBe('concept')
  })

  it('star Field is flattened per concept in schema.fields', () => {
    const mockSchema = {
      concepts: [
        {
          name: 'Goal',
          fields: [
            {
              name: 'tags',
              type: 'select',
              multiple: true,
              scope: '*',
            },
          ],
        },
        {
          name: 'Risk',
          fields: [
            {
              name: 'tags',
              type: 'select',
              multiple: true,
              scope: '*',
            },
          ],
        },
      ],
    }

    const { schema } = buildConsolePayload({
      content: `---
title: "Strategic Model"
knowledge_version: "V_1-0-0"
---
# NN Goal
## NN Goal: Win
slug:: win
`,
      schema: mockSchema,
    })

    const tagFields = schema.fields.filter((f) => f.name === 'tags')
    expect(tagFields).toHaveLength(2)
    expect(tagFields.map((f) => f.concept)).toEqual(['Goal', 'Risk'])
    expect(tagFields[0].multiple).toBe(true)
    expect(tagFields[0].scope).toBe('*')
  })
})

describe('Task 1.14: Element Field Values and Inheritance in the Payload', () => {
  const schemaWithTagsAndHealth = {
    concepts: [
      {
        name: 'Goals',
        fields: [
          { name: 'tags', type: 'select', multiple: true },
          { name: 'health', type: 'select', multiple: false },
        ],
      },
    ],
  }

  it('element fields carries own values; inherited carries delta with provenance', () => {
    const doc = `---
title: "Goals Doc"
knowledge_version: "V_1-0-0"
---

# NN Goals
tags:: [core]
health:: warning

## NN Goals: Expand
slug:: expand
tags:: [ai]

## NN Goals: Maintain
slug:: maintain
health:: nominal
`
    const payload = buildConsolePayload({
      content: doc,
      schema: schemaWithTagsAndHealth,
    })

    const expand = payload.model.elements.find((e) => e.slug === 'expand')!
    expect(expand.fields.tags).toEqual(['ai'])
    expect(expand.fields.health).toBeUndefined()
    expect(expand.inherited).toBeDefined()
    expect(expand.inherited?.tags).toEqual({ value: ['core'], from: 'Goals' })
    expect(expand.inherited?.health).toEqual({ value: 'warning', from: 'Goals' })

    const maintain = payload.model.elements.find((e) => e.slug === 'maintain')!
    expect(maintain.fields.health).toBe('nominal')
    expect(maintain.inherited?.health).toBeUndefined()
    expect(maintain.inherited?.tags).toEqual({ value: ['core'], from: 'Goals' })
  })

  it('concept entry in schema.concepts exposes its own concept-level fields', () => {
    const doc = `---
title: "Goals Doc"
knowledge_version: "V_1-0-0"
---

# NN Goals
tags:: [core]
health:: warning

## NN Goals: Expand
slug:: expand
`
    const payload = buildConsolePayload({
      content: doc,
      schema: schemaWithTagsAndHealth,
    })

    const goalsConcept = payload.schema.concepts.find((c) => c.name === 'Goals')
    expect(goalsConcept).toBeDefined()
    expect(goalsConcept?.conceptFields).toEqual({
      tags: ['core'],
      health: 'warning',
    })
  })
})

