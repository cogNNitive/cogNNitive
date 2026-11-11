import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import { resolveBlueprintPackage } from '../src/resolver.js'

// A bluepriNNt carries two version axes: `spec_version` (the spec format) and
// `blueprint_version` (the package). A flat global install (<globalDir>/<name>/spec_NN.md,
// no V_x/ dirs) resolved without a requested version must report the package version,
// as the workspace package tier already does; it reported the spec format version, so
// hydration created specs/bluepriNNts/<name>/V_<spec_version>/ (#611).

const SPEC = `---
spec_version: "V_0-5-0"
level: 2
blueprint_version: "V_1-2-0"
title: "Fixture App"
---

# NN concept: Thing
* name:: text
`

describe('resolveBlueprintPackage: flat global install version', () => {
  let tmp: string
  let rootDir: string
  let globalDir: string
  let skillsDir: string

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'nn-core-flat-global-'))
    rootDir = path.join(tmp, 'domain')
    globalDir = path.join(tmp, 'global')
    skillsDir = path.join(tmp, 'skills')
    await fs.mkdir(path.join(globalDir, 'fixturebp'), { recursive: true })
    await fs.mkdir(path.join(rootDir, 'specs'), { recursive: true })
    await fs.mkdir(skillsDir, { recursive: true })
    await fs.writeFile(path.join(globalDir, 'fixturebp', 'spec_NN.md'), SPEC)
  })

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true })
  })

  it('reports blueprint_version when no version is requested', async () => {
    const pkg = await resolveBlueprintPackage(rootDir, 'fixturebp', undefined, { globalDir, skillsDir })
    expect(pkg?.tier).toBe('global-cache')
    expect(pkg?.version).toBe('1.2.0')
  })

  it('still reports the requested version when a request names either axis', async () => {
    const byPackage = await resolveBlueprintPackage(rootDir, 'fixturebp', 'V_1-2-0', { globalDir, skillsDir })
    expect(byPackage?.version).toBe('1.2.0')
    const bySpec = await resolveBlueprintPackage(rootDir, 'fixturebp', 'V_0-5-0', { globalDir, skillsDir })
    expect(bySpec?.version).toBe('0.5.0')
    const other = await resolveBlueprintPackage(rootDir, 'fixturebp', 'V_9-9-9', { globalDir, skillsDir })
    expect(other).toBeNull()
  })
})
