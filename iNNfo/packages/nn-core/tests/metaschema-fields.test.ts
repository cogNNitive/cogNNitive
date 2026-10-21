import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { validateBlueprintAgainstMetaschema } from '../src/index'

const specsRoot = join(import.meta.dirname!, '..', '..', '..', 'specs')
const readSpec = (p: string): string => readFileSync(join(specsRoot, p), 'utf-8')

describe('Metaschema Field and Widget Validation (Task 1.4)', () => {
  const iNNfo = readSpec('iNNfo_V_0-3-0_NN.md')

  it('rejects multiple:: true on non-select Field as ERROR', () => {
    const blueprint = `---
title: "Test"
---
# NN Field Definition
## NN Field Definition: owner
  concept:: Task
  type:: string
  multiple:: true
`
    const diags = validateBlueprintAgainstMetaschema(blueprint, iNNfo)
    const err = diags.find((d) => d.severity === 'error' && d.message.includes('multiple'))
    expect(err).toBeDefined()
    expect(err?.message).toContain('select')
  })

  it('enforces widget/type compatibility as ERROR', () => {
    // scale on string
    const bpScale = `---
title: "Test"
---
# NN Field Definition
## NN Field Definition: score
  concept:: Task
  type:: string
  widget:: scale
`
    const diagsScale = validateBlueprintAgainstMetaschema(bpScale, iNNfo)
    expect(
      diagsScale.some(
        (d) => d.severity === 'error' && d.message.includes('scale') && d.message.includes('number'),
      ),
    ).toBe(true)

    // boolean on string
    const bpBool = `---
title: "Test"
---
# NN Field Definition
## NN Field Definition: flag
  concept:: Task
  type:: string
  widget:: boolean
`
    const diagsBool = validateBlueprintAgainstMetaschema(bpBool, iNNfo)
    expect(
      diagsBool.some(
        (d) => d.severity === 'error' && d.message.includes('boolean'),
      ),
    ).toBe(true)

    // cycle on non-select or multi-valued or no options
    const bpCycle = `---
title: "Test"
---
# NN Field Definition
## NN Field Definition: state
  concept:: Task
  type:: select
  multiple:: true
  widget:: cycle
  options:: [a, b]
`
    const diagsCycle = validateBlueprintAgainstMetaschema(bpCycle, iNNfo)
    expect(
      diagsCycle.some(
        (d) => d.severity === 'error' && d.message.includes('cycle'),
      ),
    ).toBe(true)

    // set on non-multi select
    const bpSet = `---
title: "Test"
---
# NN Field Definition
## NN Field Definition: tags
  concept:: Task
  type:: select
  multiple:: false
  widget:: set
`
    const diagsSet = validateBlueprintAgainstMetaschema(bpSet, iNNfo)
    expect(
      diagsSet.some(
        (d) => d.severity === 'error' && d.message.includes('set'),
      ),
    ).toBe(true)
  })

  it('reports unknown widget_config key as ERROR', () => {
    const blueprint = `---
title: "Test"
---
# NN Field Definition
## NN Field Definition: complexity
  concept:: Task
  type:: number
  widget:: scale
  widget_config:: {"min":0,"max":100,"step":5,"unknown_key":"bad"}
`
    const diags = validateBlueprintAgainstMetaschema(blueprint, iNNfo)
    const err = diags.find(
      (d) => d.severity === 'error' && d.message.includes('unknown_key'),
    )
    expect(err).toBeDefined()
  })

  it('validates scale bounds on widget_config', () => {
    const bpMissingMin = `---
title: "Test"
---
# NN Field Definition
## NN Field Definition: score
  concept:: Task
  type:: number
  widget:: scale
  widget_config:: {"max":100}
`
    const diagsMin = validateBlueprintAgainstMetaschema(bpMissingMin, iNNfo)
    expect(
      diagsMin.some(
        (d) => d.severity === 'error' && d.message.includes('min'),
      ),
    ).toBe(true)

    const bpBadRange = `---
title: "Test"
---
# NN Field Definition
## NN Field Definition: score
  concept:: Task
  type:: number
  widget:: scale
  widget_config:: {"min":100,"max":50}
`
    const diagsRange = validateBlueprintAgainstMetaschema(bpBadRange, iNNfo)
    expect(
      diagsRange.some(
        (d) => d.severity === 'error' && d.message.includes('min') && d.message.includes('max'),
      ),
    ).toBe(true)
  })
})
