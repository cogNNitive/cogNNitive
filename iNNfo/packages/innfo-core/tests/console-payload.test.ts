import { describe, it, expect } from 'vitest'
import {
  buildConsolePayload,
  computeSha256,
} from '../src/index.js'

describe('Console Payload Builder', () => {
  const modelWithRelationsAndMatrices = `---
title: "Ghostbusters Business Model"
target_blueprint: "business_V_0-2-1"
knowledge_version: "V_1-0-0"
---

# NN Problems
## NN Problems: Paranormal Infestation
slug:: paranormal-infestation
severity:: high
description:: Uncontrolled supernatural events in NYC.
sources:: sources/import/brief.md#intro
next:: [[Paranormal Infestation]]

## NN Problems: Paranormal Infestation
slug:: paranormal-infestation-critical
severity:: critical
description:: Second same-named element; distinct slug keeps the ids unambiguous.

## NN Services
## NN Services: Ghost Capture
slug:: ghost-capture
target_problem:: [[Paranormal Infestation]]
lead:: [[NonExistentElement]]

# NN matrices: problems-services
| Problems \\ Services | Ghost Capture |
| :--- | :---: |
| Paranormal Infestation | High |
`

  it('does not read the retired target_template key', () => {
    const payload = buildConsolePayload({
      content: modelWithRelationsAndMatrices.replace('target_blueprint:', 'target_template:'),
      path: 'kNNowledge/old_NN.md',
    })
    expect(payload.model.meta.template).toBeUndefined()
  })

  it('builds canonical console payload with frozen slug element ids', () => {
    const payload = buildConsolePayload({
      content: modelWithRelationsAndMatrices,
      path: 'kNNowledge/business/Ghostbusters_V_1-0-0_NN.md',
    })

    expect(payload.model.meta.modelId).toBe('kNNowledge/business/Ghostbusters_V_1-0-0')
    expect(payload.model.meta.sources).toEqual(['kNNowledge/business/Ghostbusters_V_1-0-0_NN.md'])
    expect(payload.model.meta.title).toBe('Ghostbusters Business Model')
    expect(payload.model.meta.template).toBe('business_V_0-2-1')
    expect(payload.model.meta.modelVersion).toBe('V_1-0-0')
    expect(payload.model.meta.sha256).toBe(computeSha256(modelWithRelationsAndMatrices))

    const elements = payload.model.elements
    expect(elements).toHaveLength(3)

    expect(elements[0].id).toBe('paranormal-infestation')
    expect(elements[0].concept).toBe('Problems')
    expect(elements[0].name).toBe('Paranormal Infestation')

    // Two same-named elements get distinct ids from their frozen slugs.
    expect(elements[1].id).toBe('paranormal-infestation-critical')
    expect(elements[1].name).toBe('Paranormal Infestation')
  })

  it('emits per-element intra-model relations only and no model-level relations', () => {
    const payload = buildConsolePayload({
      content: modelWithRelationsAndMatrices,
      path: 'kNNowledge/business/Ghostbusters_NN.md',
    })

    expect((payload.model as any).relations).toBeUndefined()

    const ghostCapture = payload.model.elements.find((e) => e.name === 'Ghost Capture')!
    expect(ghostCapture.relations).toBeDefined()
    expect(Array.isArray(ghostCapture.relations)).toBe(true)
    expect(ghostCapture.relations).toEqual([
      {
        field: 'target_problem',
        target: 'paranormal-infestation',
        targetLabel: 'Paranormal Infestation',
      },
    ])
  })

  it('emits matrix with rows, cols, and cells', () => {
    const payload = buildConsolePayload({
      content: modelWithRelationsAndMatrices,
    })

    expect(payload.model.matrices).toHaveLength(1)
    const mx = payload.model.matrices[0]
    expect(mx.name).toBe('problems-services')
    expect(mx.rows).toEqual(['Paranormal Infestation'])
    expect(mx.cols).toEqual(['Ghost Capture'])
    expect(mx.head!.rows['Paranormal Infestation']).toEqual({
      label: 'Paranormal Infestation',
      concept: mx.source || undefined,
      kind: 'element',
    })
    expect(mx.head!.cols['Ghost Capture'].kind).toBe('element')
    expect(mx.cells).toEqual({
      'Paranormal Infestation': {
        'Ghost Capture': 'High',
      },
    })
  })

  it('marks item-markers matrix column headers as marker units', () => {
    const md = modelWithRelationsAndMatrices.replace('Problems \\ Services', 'Problems \\ Markers')
    const payload = buildConsolePayload({ content: md })
    const mx = payload.model.matrices[0]
    expect(mx.target).toBe('Markers')
    expect(mx.head!.cols['Ghost Capture'].kind).toBe('marker')
    expect(mx.head!.rows['Paranormal Infestation'].kind).toBe('element')
  })

  it('emits schema slot as array shape', () => {
    const payload = buildConsolePayload({
      content: modelWithRelationsAndMatrices,
    })

    expect(Array.isArray(payload.schema.concepts)).toBe(true)
    expect(Array.isArray(payload.schema.fields)).toBe(true)
    expect(Array.isArray(payload.schema.markers)).toBe(true)
    expect(Array.isArray(payload.schema.matrices)).toBe(true)
  })

  it('omits citations property on elements when no resolver is provided', () => {
    const payload = buildConsolePayload({
      content: modelWithRelationsAndMatrices,
    })

    const el = payload.model.elements[0]
    expect(el.citations).toBeUndefined()
    expect(payload.model.meta.citationsResolvedAt).toBeUndefined()
  })
})
