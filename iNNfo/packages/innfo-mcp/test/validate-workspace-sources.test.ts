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
  name: business
  url: "business"
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

  it('reports a dangling sources:: file as an error; a resolvable legacy ref warns deprecation only', async () => {
    const result = await validateModel(rootDir, 'Plan_V_1-0-0_NN', undefined, undefined, true)

    const dangling = [...result.errors, ...result.warnings].find(
      (d) => d.message.includes('missing.md') && /dangling/i.test(d.message),
    )
    expect(dangling).toBeDefined()
    expect(dangling!.severity).toBe('error')

    const legacy = [...result.errors, ...result.warnings].filter((d) =>
      d.message.includes('present.md'),
    )
    expect(legacy).toHaveLength(1)
    expect(legacy[0].severity).toBe('warning')
  })

  it('does not run source validation in single-file (non-workspace) mode', async () => {
    const result = await validateModel(rootDir, 'Plan_V_1-0-0_NN', undefined, undefined, false)
    const anySource = [...result.errors, ...result.warnings].find((d) =>
      d.message.includes('missing.md'),
    )
    expect(anySource).toBeUndefined()
  })

  it('resolves local sub-workspace sources from nested models', async () => {
    const subprojectDir = join(rootDir, 'subproject')
    await mkdir(join(subprojectDir, 'models'), { recursive: true })
    await mkdir(join(subprojectDir, 'sources', 'nn'), { recursive: true })

    const nestedModel = `---
specification_version: "V_0-1-0"
level: 3
parent_spec:
  name: business
  url: "business"
model_version: "V_0-1-0"
title: "Finance Plan"
---

# NN index

* [[Stakeholders]]

# NN Stakeholders

## NN Stakeholders: Budget Reviewers
sources:: [budget.md@## Budget Summary]
`
    const budgetSource = `---
source_file: "sources/original/budget.txt"
sha256: "0"
---

# Budget Summary
Budget details.
`
    await writeFile(join(subprojectDir, 'models', 'finance_NN.md'), nestedModel, 'utf-8')
    await writeFile(join(subprojectDir, 'sources', 'nn', 'budget.md'), budgetSource, 'utf-8')
    await writeFile(
      join(rootDir, 'index.md'),
      INDEX + '\n* [Finance](./subproject/models/finance_NN.md)\n',
      'utf-8',
    )

    const result = await validateModel(rootDir, 'finance_NN', undefined, undefined, true)
    const dangling = result.errors.filter((e) => e.code === 'KU_DANGLING_FILE')
    expect(dangling).toHaveLength(0)
  })

  it('falls back to root workspace sources when subproject has no local sources', async () => {
    const subprojectDir = join(rootDir, 'subproject_fallback')
    await mkdir(join(subprojectDir, 'models'), { recursive: true })

    const nestedModel = `---
specification_version: "V_0-1-0"
level: 3
parent_spec:
  name: business
  url: "business"
model_version: "V_0-1-0"
title: "Fallback Plan"
---

# NN index

* [[Stakeholders]]

# NN Stakeholders

## NN Stakeholders: Policy Reviewers
sources:: [shared_policy.md@## Policy Overview]
`
    const rootPolicySource = `---
source_file: "sources/original/shared_policy.txt"
sha256: "0"
---

# Policy Overview
Root policy details.
`
    await writeFile(join(subprojectDir, 'models', 'fallback_NN.md'), nestedModel, 'utf-8')
    await writeFile(join(rootDir, 'sources', 'nn', 'shared_policy.md'), rootPolicySource, 'utf-8')
    await writeFile(
      join(rootDir, 'index.md'),
      INDEX + '\n* [Fallback](./subproject_fallback/models/fallback_NN.md)\n',
      'utf-8',
    )

    const result = await validateModel(rootDir, 'fallback_NN', undefined, undefined, true)
    const dangling = result.errors.filter((e) => e.code === 'KU_DANGLING_FILE')
    expect(dangling).toHaveLength(0)
  })

  it('emits missing parent directory and fuzzy suggestions in diagnostics', async () => {
    const modelWithErrors = `---
specification_version: "V_0-1-0"
level: 3
parent_spec:
  name: business
  url: "business"
model_version: "V_0-1-0"
title: "Error Plan"
---

# NN index

* [[Stakeholders]]

# NN Stakeholders

## NN Stakeholders: Error Reviewers
sources:: [missing_folder/report.md#summary, annual_repots.md#intro]
`
    await writeFile(join(rootDir, 'models', 'Error_V_1-0-0_NN.md'), modelWithErrors, 'utf-8')
    await writeFile(
      join(rootDir, 'sources', 'nn', 'annual_reports.md'),
      '# Annual Reports\nData\n',
      'utf-8',
    )
    await writeFile(
      join(rootDir, 'index.md'),
      INDEX + '\n* [Error](./models/Error_V_1-0-0_NN.md)\n',
      'utf-8',
    )

    const result = await validateModel(rootDir, 'Error_V_1-0-0_NN', undefined, undefined, true)
    const danglingErrors = result.errors.filter((e) => /dangling/i.test(e.message))
    expect(danglingErrors.length).toBeGreaterThanOrEqual(2)

    const parentMissing = danglingErrors.find((e) => e.message.includes('missing_folder/report.md'))
    expect(parentMissing).toBeDefined()
    expect(parentMissing!.message).toContain('parent directory does not exist')

    const fuzzyMatch = danglingErrors.find((e) => e.message.includes('annual_repots.md'))
    expect(fuzzyMatch).toBeDefined()
    expect(fuzzyMatch!.message).toContain("did you mean 'annual_reports.md'?")
  })
})
