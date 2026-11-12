import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { hydrateBlueprint, listBlueprintSkills, listBlueprintProcedures } from '../src/tools/spec.js'

// Issue #611: after a bluepriNNt package was hydrated into a domaiNN,
// list_blueprint_skills returned [] although the package ships skills/<name>/,
// and list_blueprint_procedures only knew the procedures of the copied spec.
// Hydration copied spec_NN.md alone; the hydrated workspace package then wins
// resolution over the global install and has no skills/ or procedures/.

const SPEC = `---
spec_version: "V_0-5-0"
level: 2
blueprint_version: "V_1-2-0"
title: "Fixture App"
procedures:
  - id: "create-thing"
    name: "Create a Thing"
    path: "procedures/create_thing_procedures_NN.md"
---

# NN concept: Thing
* name:: text
`

const PROCEDURE = `---
title: "Create a Thing"
---

# Create a Thing
`

const SKILL = `---
name: nn-fixture
version: 1.0.0
description: Fixture skill shipped inside the package.
---

# nn-fixture
`

// Bytes that are not valid UTF-8: a text-only copy would corrupt them.
const BINARY = Buffer.from([0x00, 0xff, 0xfe, 0x80, 0x81, 0x10, 0x00, 0xc3])

describe('hydrateBlueprint copies the whole bluepriNNt package (#611)', () => {
  let scratch: string
  let rootDir: string
  let globalDir: string
  let skillsDir: string

  beforeEach(async () => {
    scratch = await mkdtemp(join(tmpdir(), 'nn-hydrate-pkg-'))
    rootDir = join(scratch, 'domain')
    globalDir = join(scratch, 'global')
    skillsDir = join(scratch, 'skills')
    const pkg = join(globalDir, 'fixturebp')
    await mkdir(join(pkg, 'procedures'), { recursive: true })
    await mkdir(join(pkg, 'skills', 'nn-fixture', 'scripts'), { recursive: true })
    await mkdir(join(pkg, 'skills', 'nn-fixture', 'node_modules', 'dep'), { recursive: true })
    await mkdir(join(pkg, 'assets'), { recursive: true })
    await mkdir(join(rootDir, 'specs'), { recursive: true })
    await mkdir(skillsDir, { recursive: true })
    await writeFile(join(pkg, 'spec_NN.md'), SPEC)
    await writeFile(join(pkg, 'procedures', 'create_thing_procedures_NN.md'), PROCEDURE)
    await writeFile(join(pkg, 'procedures', 'usage_procedures_NN.md'), '# Usage\n')
    await writeFile(join(pkg, 'skills', 'nn-fixture', 'SKILL.md'), SKILL)
    await writeFile(join(pkg, 'skills', 'nn-fixture', 'scripts', 'run.mjs'), 'export {}\n')
    await writeFile(join(pkg, 'skills', 'nn-fixture', 'node_modules', 'dep', 'index.js'), '')
    await writeFile(join(pkg, 'assets', 'clip.mp4'), BINARY)
  })

  afterEach(async () => {
    await rm(scratch, { recursive: true, force: true })
  })

  it('a hydrated package lists the skills it ships under skills/<name>/SKILL.md', async () => {
    const res = await hydrateBlueprint(rootDir, 'fixturebp', { globalDir, skillsDir })
    expect(res.success).toBe(true)

    const { skills } = await listBlueprintSkills(rootDir, { blueprint_name: 'fixturebp' })
    const names = skills.map((s) => s.name)
    expect(names).toEqual(['nn-fixture'])
    const skill = skills[0] as { embedded?: boolean; path: string; version?: string }
    expect(skill.embedded).toBe(true)
    expect(skill.version).toBe('1.0.0')
    // The listed skill is the hydrated copy inside the domaiNN, not the global install.
    expect(skill.path.startsWith(join(rootDir, 'specs', 'bluepriNNts', 'fixturebp'))).toBe(true)
    expect(existsSync(join(skill.path, 'scripts', 'run.mjs'))).toBe(true)
  })

  it('a hydrated package lists its frontmatter procedures and its procedures/ documents', async () => {
    await hydrateBlueprint(rootDir, 'fixturebp', { globalDir, skillsDir })

    const { procedures } = await listBlueprintProcedures(rootDir, { blueprint_name: 'fixturebp' })
    const ids = procedures.filter((p) => p.status === 'selected').map((p) => p.id).sort()
    expect(ids).toEqual(['create-thing', 'usage'])
  })

  it('copies binary assets byte for byte and leaves node_modules behind', async () => {
    const res = await hydrateBlueprint(rootDir, 'fixturebp', { globalDir, skillsDir })
    const pkgDir = res.targetPath

    expect(await readFile(join(pkgDir, 'assets', 'clip.mp4'))).toEqual(BINARY)
    expect(existsSync(join(pkgDir, 'skills', 'nn-fixture', 'node_modules'))).toBe(false)
  })

  it('keeps the existing package layout and write-once immutability', async () => {
    const first = await hydrateBlueprint(rootDir, 'fixturebp', { globalDir, skillsDir })
    // The package folder is named by blueprint_version, not spec_version.
    expect(first.targetPath).toBe(join(rootDir, 'specs', 'bluepriNNts', 'fixturebp', 'V_1-2-0'))
    expect(await readFile(join(first.targetPath, 'spec_NN.md'), 'utf-8')).toBe(SPEC)
    expect(existsSync(join(first.targetPath, 'fixturebp_V_1-2-0_NN.md'))).toBe(true)

    await writeFile(join(globalDir, 'fixturebp', 'skills', 'nn-fixture', 'SKILL.md'), 'changed')
    const second = await hydrateBlueprint(rootDir, 'fixturebp', { globalDir, skillsDir })
    expect(second.targetPath).toBe(first.targetPath)
    expect(await readFile(join(first.targetPath, 'skills', 'nn-fixture', 'SKILL.md'), 'utf-8')).toBe(SKILL)
  })
})
