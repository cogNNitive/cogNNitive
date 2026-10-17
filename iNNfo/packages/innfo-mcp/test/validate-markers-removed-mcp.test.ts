import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { validateKnowledge, validateBlueprint } from '../src/tools/validate.js'
import { checkRemovedMarkerConstructs, parseKnowledge } from '@cognnitive/innfo-core'
import { writeFile, rm, mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

describe('validate_knowledge and validate_blueprint MARKERS_REMOVED MCP Parity', () => {
  const tmpDir = resolve('./test-tmp-validate-markers-removed')
  const level1Path = join(tmpDir, 'iNNfo_V_1-0_NN.md')
  const level1Url = pathToFileURL(level1Path).href

  beforeAll(async () => {
    await mkdir(tmpDir, { recursive: true })
    await writeFile(
      level1Path,
      `---
spec_version: V_1-0
level: 1
title: Level 1 Spec
---
# Level 1 Spec
`,
      'utf-8',
    )
  })

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('validate_blueprint emits identical MARKERS_REMOVED diagnostic to core', async () => {
    const content = `---
spec_version: "V_0-5-0"
level: 2
parent_spec:
  name: "iNNfo_V_1-0"
  url: ${level1Url}
title: "Legacy Blueprint"
---
# NN Marker Definition
## NN Marker Definition: priority
symbol:: !
`
    const coreParsed = parseKnowledge(content)
    const coreDiags = checkRemovedMarkerConstructs(coreParsed, 'test_spec_NN.md')
    expect(coreDiags).toHaveLength(1)

    const mcpResult = await validateBlueprint(tmpDir, 'test_spec_NN.md', content)
    expect(mcpResult.valid).toBe(false)
    const mcpDiag = mcpResult.errors.find((e) => e.code === 'MARKERS_REMOVED')
    expect(mcpDiag).toBeDefined()
    expect(mcpDiag?.code).toBe(coreDiags[0].code)
    expect(mcpDiag?.message).toBe(coreDiags[0].message)
    expect(mcpDiag?.promptHint).toBe(coreDiags[0].promptHint)
    expect(mcpDiag?.meta).toEqual(coreDiags[0].meta)
  })

  it('validate_knowledge emits identical MARKERS_REMOVED diagnostic to core', async () => {
    const content = `---
spec_version: "V_0-5-0"
level: 3
parent_spec:
  name: "iNNfo_V_1-0"
  url: ${level1Url}
title: "Legacy Knowledge"
knowledge_version: "V_0-1-0"
---
# NN matrices: item-markers matrix

| Element | priority |
|---|---|
| Item1 | ! |
`
    const coreParsed = parseKnowledge(content)
    const coreDiags = checkRemovedMarkerConstructs(coreParsed, 'model_NN.md')
    expect(coreDiags).toHaveLength(1)

    const mcpResult = await validateKnowledge(tmpDir, 'model_NN.md', content)
    expect(mcpResult.valid).toBe(false)
    const mcpDiag = mcpResult.errors.find((e) => e.code === 'MARKERS_REMOVED')
    expect(mcpDiag).toBeDefined()
    expect(mcpDiag?.code).toBe(coreDiags[0].code)
    expect(mcpDiag?.message).toBe(coreDiags[0].message)
    expect(mcpDiag?.promptHint).toBe(coreDiags[0].promptHint)
    expect(mcpDiag?.meta).toEqual(coreDiags[0].meta)
  })
})
