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

  it('carries the element tags, lowercased', () => {
    const p = buildConsolePayload({ content: doc({ element: 'Pricing, AI' }) })
    expect(p.model.elements[0].tags).toEqual(['pricing', 'ai'])
  })

  it('inherits concept-level tags as a union without duplicates', () => {
    const p = buildConsolePayload({ content: doc({ concept: 'core', element: 'ai, core' }) })
    expect(p.model.elements[0].tags).toEqual(['ai', 'core'])
  })

  it('emits an empty array when there are no tags', () => {
    const p = buildConsolePayload({ content: doc({}) })
    expect(p.model.elements[0].tags).toEqual([])
  })

  it('does not move the hash and keeps it equal to hashParsedElement', () => {
    const bare = buildConsolePayload({ content: doc({}) }).model.elements[0]
    const tagged = buildConsolePayload({ content: doc({ concept: 'core', element: 'ai' }) }).model.elements[0]
    expect(tagged.hash).toBe(bare.hash)
    const node = parseKnowledge(doc({ concept: 'core', element: 'ai' })).elements.get('Service')![0]
    expect(tagged.hash).toBe(hashParsedElement('Service', node))
  })
})
