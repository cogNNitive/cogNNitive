import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { rm, mkdir, writeFile } from 'node:fs/promises'
import { validateModel } from '../src/tools/validate.js'

const rootDir = join(import.meta.dirname!, '..', 'temp-test-workspace-sources')

const INDEX = `---
spec_version: "V_0-1-2"
level: 0
title: "Workspace Index"
---

# NN index

* [Plan](./models/Plan_V_1-0-0_NN.md)
`

const MODEL = `---
specification_version: "V_0-1-0"
level: 3
parent_spec:
  name: Template
  url: "https://example.com/template.md"
model_version: "V_0-1-0"
title: "Plan"
---

# NN index

* [[Stakeholders]]

# NN Stakeholders

## NN Stakeholders: Enterprise Clients
sources:: [present.md#overview, missing.md#intro]
relationship_model:: B2B
`

const PRESENT_SOURCE = `---
source_file: "sources/original/present.txt"
sha256: "0"
---

# Overview

Some normalised text.
`

describe('validate_model workspace mode — sources:: Citations', () => {
  beforeEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
    await mkdir(join(rootDir, 'models'), { recursive: true })
    await mkdir(join(rootDir, 'sources', 'nn'), { recursive: true })
    await writeFile(join(rootDir, 'index.md'), INDEX, 'utf-8')
    await writeFile(join(rootDir, 'models', 'Plan_V_1-0-0_NN.md'), MODEL, 'utf-8')
    await writeFile(join(rootDir, 'sources', 'nn', 'present.md'), PRESENT_SOURCE, 'utf-8')
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  it('reports a dangling sources:: file as an error and leaves a resolvable one clean', async () => {
    const result = await validateModel(rootDir, 'Plan_V_1-0-0_NN', undefined, undefined, true)

    const dangling = [...result.errors, ...result.warnings].find(
      (d) => d.message.includes('missing.md') && /dangling/i.test(d.message),
    )
    expect(dangling).toBeDefined()
    expect(dangling!.severity).toBe('error')

    const falsePositive = [...result.errors, ...result.warnings].find((d) =>
      d.message.includes('present.md'),
    )
    expect(falsePositive).toBeUndefined()
  })

  it('does not run source validation in single-file (non-workspace) mode', async () => {
    const result = await validateModel(rootDir, 'Plan_V_1-0-0_NN', undefined, undefined, false)
    const anySource = [...result.errors, ...result.warnings].find((d) =>
      d.message.includes('missing.md'),
    )
    expect(anySource).toBeUndefined()
  })
})
