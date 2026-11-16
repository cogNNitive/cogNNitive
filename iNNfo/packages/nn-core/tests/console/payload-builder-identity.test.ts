/**
 * Console payload identity and the collections slot (distributed-storage S5b:
 * hierarchical-identity; distributed-collection-resolution).
 *
 * `buildConsolePayload` stays pure and browser-safe: it never reads a domaiNN, so
 * the caller that HAS the domain index passes the id in. The standalone fallback
 * is the compact stem of the file name, never a path.
 *
 * The exact `<model-id>@<matrix-slug>&<row-slug>&<col-slug>` cell key this file
 * used to pin went with `matrix.provenance` (batch b17): no browser-side console
 * source reads per-cell history, so the payload no longer derives one.
 */
import { describe, it, expect } from 'vitest'
import { buildConsolePayload } from '../../src/index.js'

const MODEL = (title: string) => `---
title: "${title}"
knowledge_version: "V_0-1-0"
---

# NN Concept 1
## NN Concept 1: Element 1A
slug:: element-1a

## NN Concept 1: Element 2A
slug:: element-2a

# NN matrices: Impact Matrix
| - | Element 2A |
| :--- | :---: |
| Element 1A | high |
`

const PLACEMENT_PATH = 'series/villabotijos-today/assets/pepper-mapache/pepper-mapache_coNNtent_NN.md'

describe('payload modelId is the domain index id', () => {
  it('uses the id the caller passes, not a path', () => {
    const payload = buildConsolePayload({
      content: MODEL('El mapache fuera de la ley'),
      path: PLACEMENT_PATH,
      modelId: 'villabotijos-today/pepper-mapache',
    })
    expect(payload.model.meta.modelId).toBe('villabotijos-today/pepper-mapache')
  })

  it('falls back to the file stem when the caller has no index', () => {
    // A placed instance model's id is its container chain (`villabotijos-today/pepper-mapache`),
    // which no file name can express, so a caller WITHOUT an index gets the display stem and
    // nothing more. This is the documented standalone fallback, not an id producer.
    const payload = buildConsolePayload({ content: MODEL('Intro'), path: PLACEMENT_PATH })
    expect(payload.model.meta.modelId).toBe('pepper-mapache_coNNtent')
    expect(payload.model.meta.modelId).not.toContain('/')
  })

  it('falls back to the title slug when there is no path either', () => {
    const payload = buildConsolePayload({ content: MODEL('Ghostbusters Business Model') })
    expect(payload.model.meta.modelId).toBe('ghostbusters-business-model')
  })
})

describe('the collections slot', () => {
  it('carries the collection members the caller resolved from the index', () => {
    const collections = {
      Video: ['innteresante/intro', 'villabotijos-today/intro', 'villabotijos-today/pepper-mapache'],
      Series: ['innteresante', 'villabotijos-today'],
    }
    const payload = buildConsolePayload({
      content: MODEL('El mapache fuera de la ley'),
      modelId: 'villabotijos-today/pepper-mapache',
      collections,
    })
    expect(payload.model.collections).toEqual(collections)
  })

  it('omits the slot when the caller passes no collections', () => {
    const payload = buildConsolePayload({ content: MODEL('Intro'), modelId: 'innteresante/intro' })
    expect(payload.model.collections).toBeUndefined()
  })

  it('renders the same titles and field values for a compact and a distributed copy', () => {
    const videos = [
      { title: 'Intro', fields: { status: 'draft' } },
      { title: 'El mapache fuera de la ley', fields: { status: 'published' } },
    ]
    const element = (v: { title: string; fields: Record<string, string> }, slug: string) =>
      `## NN Video: ${v.title}\nslug:: ${slug}\nstatus:: ${v.fields.status}\n`
    const distributed = `---
title: "Intro"
knowledge_version: "V_0-1-0"
---

# NN Video
${element(videos[0], 'intro')}`
    const compact = `---
title: "Video Registry"
knowledge_version: "V_0-1-0"
---

# NN Video
${element(videos[0], 'intro')}
${element(videos[1], 'pepper-mapache')}`

    const a = buildConsolePayload({ content: distributed, modelId: 'villabotijos-today/intro' })
    const b = buildConsolePayload({ content: compact, modelId: 'villabotijos-today/registry' })

    const view = (payload: ReturnType<typeof buildConsolePayload>) =>
      payload.model.elements.map((e) => ({ name: e.name, status: e.fields.status })).sort((x, y) => x.name.localeCompare(y.name))

    expect(view(a)[0]).toEqual({ name: 'Intro', status: 'draft' })
    expect(view(b)).toContainEqual(view(a)[0])
  })
})
