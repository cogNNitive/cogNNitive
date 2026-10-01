import { describe, it, expect } from 'vitest'
import {
  buildConsolePayload,
  computeSha256,
  computeElementHash,
  canonicalJsonStringify,
  parseFeedbackLedger,
  serializeFeedbackLedgerEntry,
  effectiveStatusFor,
  feedbackStateFor,
} from '../src/index.js'
import type { FeedbackVerdictEntry } from '../src/index.js'

describe('Console Payload Builder & Feedback Ledger', () => {
  const sampleMarkdown = `---
title: "Ghostbusters Business Model"
knowledge_version: "V_1-0-0"
parent_spec:
  name: "business"
  url: "https://example.com/business.md"
---

# NN Mission
## NN Mission: Ghostbusters Mission
description:: Rid New York City of supernatural threats.
sources:: sources/nn/initial-brief.md#mission

# NN Service
## NN Service: Ghost Capture
description:: Professional containment of spectral entities.
price:: 5000
`

  it('builds canonical console payload with schema and model slots', () => {
    const payload = buildConsolePayload({
      content: sampleMarkdown,
      path: 'kNNowledge/biz/Ghostbusters_NN.md',
    })

    expect(payload.schema).toBeDefined()
    expect(payload.model).toBeDefined()
    expect(payload.model.meta).toBeDefined()
    expect(payload.model.meta.modelId).toBe('kNNowledge/biz/Ghostbusters')
    expect(payload.model.meta.modelVersion).toBe('V_1-0-0')
    expect(payload.model.meta.sha256).toBe(computeSha256(sampleMarkdown))
    expect(Array.isArray(payload.model.elements)).toBe(true)
    expect(payload.model.elements.length).toBe(2)

    const mission = payload.model.elements[0]
    expect(mission.id).toBe('mission-ghostbusters-mission')
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
      if (filePath === 'sources/nn/initial-brief.md') {
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
    expect(mission.citations!.sources![0].path).toBe('sources/nn/initial-brief.md')
  })

  it('parses and computes effective status from feedback verdict ledger', () => {
    const entry1: FeedbackVerdictEntry = {
      v: 1,
      at: '2026-10-01T10:00:00Z',
      source: { kind: 'console-json', path: 'sources/import/feedback/round1.json', sha256: 'abc1' },
      item: 'fb-001',
      model_id: 'kNNowledge/biz/Ghostbusters',
      knowledge_version: 'V_1-0-0',
      element_id: 'mission-ghostbusters-mission',
      status: 'rejected',
      by: 'lead-reviewer',
    }

    const entry2: FeedbackVerdictEntry = {
      v: 1,
      at: '2026-10-01T12:00:00Z',
      source: { kind: 'console-json', path: 'sources/import/feedback/round1.json', sha256: 'abc1' },
      item: 'fb-001',
      model_id: 'kNNowledge/biz/Ghostbusters',
      knowledge_version: 'V_1-0-0',
      element_id: 'mission-ghostbusters-mission',
      status: 'applied',
      by: 'lead-reviewer',
    }

    const rawJsonl = serializeFeedbackLedgerEntry(entry1) + serializeFeedbackLedgerEntry(entry2)
    const { entries, errors } = parseFeedbackLedger(rawJsonl)

    expect(errors).toHaveLength(0)
    expect(entries).toHaveLength(2)

    const effective = effectiveStatusFor(entries)
    expect(effective.get('abc1#fb-001')?.status).toBe('applied')

    const state = feedbackStateFor(entries, 'kNNowledge/biz/Ghostbusters')
    expect(state).toHaveLength(1)
    expect(state[0].status).toBe('applied')
    expect(state[0].element_id).toBe('mission-ghostbusters-mission')
  })
})
