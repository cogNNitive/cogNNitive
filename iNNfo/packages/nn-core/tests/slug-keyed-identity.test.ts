import { describe, it, expect } from 'vitest'
import { normalizeSingleKnowledge } from '../src/recursiveParser/knowledge.js'

const FRONT = `---
spec_version: "V_0-3-0"
level: 3
parent_spec:
  name: video-script_V_0-15-0
  url: https://example.com/video-script_V_0-15-0_NN.md
---
`

const elementsOf = (r: ReturnType<typeof normalizeSingleKnowledge>) =>
  Object.values(r.nodes).filter((n) => n.kind === 'element')

describe('slug-keyed graph identity (stable-element-identity, hierarchical-identity)', () => {
  it('two elements with the same name and distinct slugs are both in the graph, with no diagnostic', () => {
    const md = `${FRONT}
# NN Layer
## NN Layer: Gancho Presenter
slug:: gancho-presenter-a
## NN Layer: Gancho Presenter
slug:: gancho-presenter-b
`
    const r = normalizeSingleKnowledge(md, 'intro_video-script_NN.md', 'intro_video-script')
    expect(elementsOf(r).map((n) => n.slug).sort()).toEqual(['gancho-presenter-a', 'gancho-presenter-b'])
    expect(r.issues.filter((i) => i.severity === 'error' || i.severity === undefined)).toEqual([])
  })

  it('a repeated slug is DUPLICATE_SLUG, an error, and keeps one element', () => {
    const md = `${FRONT}
# NN Layer
## NN Layer: One
slug:: same
## NN Layer: Two
slug:: same
`
    const r = normalizeSingleKnowledge(md, 'intro_video-script_NN.md', 'intro_video-script', undefined, {
      modelId: 'villa/intro',
    })
    const errors = r.issues.filter((i) => i.severity === 'error')
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toContain('DUPLICATE_SLUG')
    expect(errors[0].message).toContain('villa/intro')
    expect(elementsOf(r)).toHaveLength(1)
  })

  it('node ids are <model-id>@<slug>; the same slug in two models is not a duplicate', () => {
    const md = `${FRONT}
# NN Scene
## NN Scene: Gancho
slug:: 00-gancho
`
    const a = normalizeSingleKnowledge(md, 'a_NN.md', 'a', undefined, { modelId: 'villabotijos-today/pepper-mapache' })
    const b = normalizeSingleKnowledge(md, 'b_NN.md', 'b', undefined, { modelId: 'innteresante/intro' })
    expect(elementsOf(a).map((n) => n.id)).toEqual(['villabotijos-today/pepper-mapache@00-gancho'])
    expect(elementsOf(b).map((n) => n.id)).toEqual(['innteresante/intro@00-gancho'])
  })

  it('a single-file parse without a model id uses the relative @<slug> form', () => {
    const md = `${FRONT}
# NN Scene
## NN Scene: Gancho
slug:: 00-gancho
`
    const r = normalizeSingleKnowledge(md, 'a_NN.md', 'a')
    expect(elementsOf(r).map((n) => n.id)).toEqual(['@00-gancho'])
  })

  it('prefixed slugs stay valid', () => {
    const md = `${FRONT}
# NN Scene
## NN Scene: Gancho
slug:: scene-1-gancho
`
    const r = normalizeSingleKnowledge(md, 'a_NN.md', 'a', undefined, { modelId: 'x/y' })
    expect(elementsOf(r).map((n) => n.id)).toEqual(['x/y@scene-1-gancho'])
  })
})
