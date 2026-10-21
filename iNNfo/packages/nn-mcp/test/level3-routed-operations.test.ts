import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { parseKnowledge, parseChangeset } from '@cognnitive/nn-core'
import { applyChange } from '../src/tools/apply-change.js'
import { proposeChangeset } from '../src/tools/propose-changeset.js'

const root = join(import.meta.dirname!, '..', 'temp-test-l3-routed')
const knowledgeDir = join(root, 'kNNowledge')
const changesDir = join(root, 'changes')
const specsDir = join(root, 'specs')

const BLUEPRINT = `---
spec_version: "V_0-4-0"
level: 2
blueprint_version: "V_0-2-0"
blueprint_name: "strategy"
title: "Strategy Template"
parent_spec:
  name: "iNNfo_V_0-3-0"
  url: "specs/iNNfo_V_0-3-0_NN.md"
---

# NN Concept Definition
## NN Concept Definition: Work
type:: list

# NN Field Definition
## NN Field Definition: statement
concept:: Work
type:: string
`

const MODEL = `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: "strategy_V_0-2-0"
  url: "specs/strategy_V_0-2-0_NN.md"
knowledge_version: "V_0-1-0"
title: "Strategy"
---

# NN index
* [[Work]]

# NN Work
## NN Work: Vision
statement:: Accelerate green energy
`

beforeEach(async () => {
  process.env.INNFO_CACHE_DIR = join(root, '.cache')
  vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
  await rm(root, { recursive: true, force: true })
  for (const dir of [knowledgeDir, specsDir]) await mkdir(dir, { recursive: true })
  await writeFile(
    join(specsDir, 'iNNfo_V_0-3-0_NN.md'),
    '---\nspec_version: "V_0-3-0"\nlevel: 1\ntitle: "iNNfo"\nparent_spec:\n  name: "defiNNition_V_0-1-0"\n  url: "specs/defiNNition_V_0-1-0_NN.md"\n---\n',
    'utf-8',
  )
  await writeFile(join(specsDir, 'defiNNition_V_0-1-0_NN.md'), '---\nspec_version: "V_0-1-0"\nlevel: 0\ntitle: "defiNNition"\n---\n', 'utf-8')
  await writeFile(join(specsDir, 'strategy_V_0-2-0_NN.md'), BLUEPRINT, 'utf-8')
  await writeFile(join(knowledgeDir, 'strategy_NN.md'), MODEL, 'utf-8')
  await writeFile(join(knowledgeDir, 'tpl_NN.md'), BLUEPRINT, 'utf-8')
})

afterEach(async () => {
  delete process.env.INNFO_CACHE_DIR
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})

async function versionOf(id: string): Promise<string> {
  const model = parseKnowledge(await readFile(join(knowledgeDir, `${id}_NN.md`), 'utf-8'))
  return String(model.frontmatter.knowledge_version)
}

describe('Level-3 maintenance operations are changesets', () => {
  it('freeze_slugs writes a changeset, bumps the version once and replays idempotently', async () => {
    const res = await applyChange(root, 'strategy', 'freeze_slugs', {})
    expect(res.errors ?? []).toEqual([])
    expect(res.success).toBe(true)
    expect(res.status).toBe('applied')

    const files = await readdir(changesDir)
    expect(files).toHaveLength(1)
    const doc = parseChangeset(await readFile(join(changesDir, files[0]), 'utf-8'))
    expect(doc.changes[0].op).toBe('freeze_slugs')
    expect(doc.frontmatter.status).toBe('applied')

    expect(await versionOf('strategy')).toBe('V_0-1-1')
    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toContain('slug:: vision')

    const replay = await applyChange(root, `changes/${files[0]}`)
    expect(replay.success).toBe(true)
    expect(replay.appliedCount).toBe(0)
    expect(await versionOf('strategy')).toBe('V_0-1-1')
  })

  it.each([
    ['patch', 'V_0-1-1'],
    ['minor', 'V_0-2-0'],
    ['major', 'V_1-0-0'],
  ])('bump_version %s writes a changeset and bumps to %s exactly once', async (bump, expected) => {
    const res = await applyChange(root, 'strategy', 'bump_version', { bump })
    expect(res.errors ?? []).toEqual([])
    expect(res.success).toBe(true)
    expect(await versionOf('strategy')).toBe(expected)
    expect(await readdir(knowledgeDir)).toEqual(expect.arrayContaining(['strategy_NN.md']))

    const files = await readdir(changesDir)
    expect(files).toHaveLength(1)
    const replay = await applyChange(root, `changes/${files[0]}`)
    expect(replay.success).toBe(true)
    expect(await versionOf('strategy')).toBe(expected)
  })

  it('bump_version defaults to patch', async () => {
    const res = await applyChange(root, 'strategy', 'bump_version', {})
    expect(res.success).toBe(true)
    expect(await versionOf('strategy')).toBe('V_0-1-1')
  })

  it('bump_version rejects an unknown level and leaves the model untouched', async () => {
    const before = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    const res = await applyChange(root, 'strategy', 'bump_version', { bump: 'huge' })
    expect(res.success).toBe(false)
    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toBe(before)
  })

  it('add_matrix creates a Level-3 matrix table through apply_change (cogNNitive-web#19)', async () => {
    const res = await applyChange(root, 'strategy', 'add_matrix', {
      matrixName: 'Work Impact',
      source: 'Work',
      targetConcept: 'Work',
      columns: 'Outcome',
      rows: 'Vision',
    })
    expect(res.errors ?? []).toEqual([])
    expect(res.success).toBe(true)
    const out = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    expect(out).toContain('# NN matrices: Work Impact')
    expect(out).toContain('| Work \\ Work | Outcome |')
    expect(out).toContain('| Vision | - |')
  })

  it('add_matrix is refused on a Level-2 bluepriNNt', async () => {
    const res = await applyChange(root, 'tpl', 'add_matrix', {
      matrixName: 'X',
      source: 'Work',
      targetConcept: 'Work',
    })
    expect(res.success).toBe(false)
  })

  it('propose_changeset accepts the new operations and rejects a bad level', async () => {
    const ok = await proposeChangeset(
      root,
      { operations: [{ op: 'bump_version', target: 'strategy', to: 'minor' }, { op: 'freeze_slugs', target: 'strategy' }], open: false },
      { open: false },
    )
    expect(ok.errors ?? []).toEqual([])
    expect(ok.success).toBe(true)
    const okMatrix = await proposeChangeset(
      root,
      {
        operations: [
          { op: 'add_matrix', target: 'strategy@matrix:Work Impact', name: 'Work Impact', concept: 'Work', to: 'Work' },
        ],
        open: false,
      },
      { open: false },
    )
    expect(okMatrix.errors ?? []).toEqual([])
    expect(okMatrix.success).toBe(true)
    const bad = await proposeChangeset(
      root,
      { operations: [{ op: 'bump_version', target: 'strategy', to: 'huge' }], open: false },
      { open: false },
    )
    expect(bad.success).toBe(false)
  })

  it('a minor bump and other operations in one changeset bump once, to the requested level', async () => {
    const written = await proposeChangeset(
      root,
      {
        operations: [
          { op: 'update_field', target: 'strategy@Vision&statement', to: 'Clean energy' },
          { op: 'bump_version', target: 'strategy', to: 'minor' },
        ],
        open: false,
      },
      { open: false },
    )
    expect(written.errors ?? []).toEqual([])
    expect(written.success).toBe(true)
    const res = await applyChange(root, written.changeset!)
    expect(res.success).toBe(true)
    expect(await versionOf('strategy')).toBe('V_0-2-0')
  })
})

describe('schema authoring on a Level-3 model is refused', () => {
  it.each([
    ['add_concept', { conceptName: 'Risk' }],
    ['add_field', { conceptName: 'Work', fieldName: 'owner' }],
  ])('%s fails SCHEMA_OP_ON_LEVEL3 and writes nothing', async (op, args) => {
    const before = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    const res = await applyChange(root, 'strategy', op, args)
    expect(res.success).toBe(false)
    expect(res.errors![0].code).toBe('SCHEMA_OP_ON_LEVEL3')
    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toBe(before)
    expect(existsSync(changesDir)).toBe(false)
  })

  it('stays direct on a Level-2 blueprint', async () => {
    const res = await applyChange(root, 'tpl', 'add_concept', { conceptName: 'Risk' })
    expect(res.success).toBe(true)
    expect(existsSync(changesDir)).toBe(false)
  })

  it('bump_version on a Level-2 blueprint bumps blueprint_version in place', async () => {
    const res = await applyChange(root, 'tpl', 'bump_version', { bump: 'minor' })
    expect(res.errors ?? []).toEqual([])
    expect(res.success).toBe(true)
    const doc = parseKnowledge(await readFile(join(knowledgeDir, 'tpl_NN.md'), 'utf-8'))
    expect(doc.frontmatter.blueprint_version).toBe('V_0-3-0')
    expect(existsSync(changesDir)).toBe(false)
  })
})

describe('freeze_slugs on an already frozen model', () => {
  it('is an applied no-op: no model write and no version burned', async () => {
    await applyChange(root, 'strategy', 'freeze_slugs', {})
    expect(await versionOf('strategy')).toBe('V_0-1-1')
    const frozen = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')

    const res = await applyChange(root, 'strategy', 'freeze_slugs', {})
    expect(res.success).toBe(true)
    expect(res.status).toBe('applied')
    expect(await versionOf('strategy')).toBe('V_0-1-1')
    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toBe(frozen)
    const files = (await readdir(changesDir)).sort()
    const doc = parseChangeset(await readFile(join(changesDir, files[files.length - 1]), 'utf-8'))
    expect(doc.changes[0].resolution).toMatch(/already frozen/i)
    expect(Object.keys(doc.frontmatter.models ?? {})).toEqual([])
  })
})

describe('Level-2 bump_version validation', () => {
  it('refuses to write a blueprint that does not validate', async () => {
    // A blueprint whose parent cannot be resolved does not validate.
    const file = join(knowledgeDir, 'tpl_NN.md')
    await writeFile(file, BLUEPRINT.replace(/^parent_spec:[^]*?(?=^---$)/m, ''), 'utf-8')
    const before = await readFile(file, 'utf-8')
    const res = await applyChange(root, 'tpl', 'bump_version', { bump: 'patch' })
    expect(res.success).toBe(false)
    expect(res.errors!.length).toBeGreaterThan(0)
    expect(await readFile(file, 'utf-8')).toBe(before)
  })

  it('preserves free-form app/prose sections when it bumps a Level-2 blueprint (cogNNitive-web#20)', async () => {
    const withProse =
      BLUEPRINT +
      `
# Strategy App

## Philosophy

Rigor matters.

## Work

### Summary

A summary.
`
    const file = join(knowledgeDir, 'tpl_NN.md')
    await writeFile(file, withProse, 'utf-8')
    const res = await applyChange(root, 'tpl', 'bump_version', { bump: 'minor' })
    expect(res.success).toBe(true)
    const out = await readFile(file, 'utf-8')
    expect(out).toContain('blueprint_version: "V_0-3-0"')
    expect(out).toContain('# Strategy App')
    expect(out).toContain('## Philosophy')
    expect(out).toContain('Rigor matters.')
    expect(out).toContain('### Summary')
    expect(out).toContain('A summary.')
  })
})
