import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { CHANGE_OPS, listMutationOperations } from '@cognnitive/innfo-core'
import { applyChange, MAINTENANCE_OPS, SCHEMA_OPS } from '../src/tools/apply-change.js'

const SERVER_SRC = join(import.meta.dirname!, '..', 'src', 'server.ts')

const root = join(import.meta.dirname!, '..', 'temp-test-direct-ops')
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
  // A level-2 document for the schema operations (they are level-gated).
  await writeFile(join(knowledgeDir, 'tpl_NN.md'), BLUEPRINT, 'utf-8')
})

afterEach(async () => {
  delete process.env.INNFO_CACHE_DIR
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})

describe('direct apply_change operations are a closed, classified set', () => {
  it('the partition is exhaustive and exclusive', () => {
    const lists: Record<string, readonly string[]> = {
      ChangeOp: CHANGE_OPS,
      MAINTENANCE_OPS,
      SCHEMA_OPS,
    }
    // Every operation the engine implements (plus the apply-owned bump_version) ...
    const implemented = new Set([...listMutationOperations(), 'bump_version'])
    for (const op of implemented) {
      const owners = Object.entries(lists).filter(([, ops]) => ops.includes(op)).map(([name]) => name)
      expect(owners, `operation "${op}"`).toHaveLength(1)
    }
    // ... and every classified operation is real (a ChangeOp may be apply-only).
    const apply_only = new Set(['comment', 'add_model'])
    for (const [name, ops] of Object.entries(lists)) {
      for (const op of ops) {
        expect(implemented.has(op) || (name === 'ChangeOp' && apply_only.has(op)), `${name}.${op}`).toBe(true)
      }
    }
  })

  it('an unclassified operation fails UNKNOWN_OPERATION and writes nothing', async () => {
    const before = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    const res = await applyChange(root, 'strategy', 'set_field', { elementName: 'Vision', value: 'x' })
    expect(res.success).toBe(false)
    expect(res.errors![0].code).toBe('UNKNOWN_OPERATION')
    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toBe(before)
    expect(existsSync(changesDir)).toBe(false)
  })

  it('add_model is refused as a bare operation', async () => {
    const res = await applyChange(root, 'acme', 'add_model', {})
    expect(res.success).toBe(false)
    expect(res.errors![0].code).toBe('ADD_MODEL_REQUIRES_CHANGESET')
    expect(existsSync(join(knowledgeDir, 'acme_NN.md'))).toBe(false)
  })

  it.each([
    ['freeze_slugs', 'strategy', {}],
    ['bump_version', 'strategy', { bump: 'patch' }],
    ['add_concept', 'tpl', { conceptName: 'Risk' }],
    ['add_field', 'tpl', { conceptName: 'Work', fieldName: 'owner' }],
    ['set_marker', 'tpl', { markerName: 'priority' }],
  ])('%s writes the model file and leaves changes/ untouched', async (op, id, args) => {
    const sourceFile = join(knowledgeDir, `${id}_NN.md`)
    const before = await readFile(sourceFile, 'utf-8')
    const res = await applyChange(root, id, op, args)

    expect(res.errors ?? []).toEqual([])
    expect(res.success).toBe(true)
    const files = await readdir(knowledgeDir)
    const written = files.filter((f) => f.startsWith(id))
    expect(written.length).toBeGreaterThan(0)
    if (op !== 'freeze_slugs') {
      const after = await readFile(res.newPath ?? sourceFile, 'utf-8')
      expect(after).not.toBe(before)
    }
    expect(existsSync(changesDir)).toBe(false)
  })

  it('a content operation is synthesized as an applied changeset', async () => {
    const res = await applyChange(root, 'strategy', 'update_field', {
      elementName: 'Vision',
      fieldName: 'statement',
      value: 'Accelerate clean energy',
    })
    expect(res.success).toBe(true)
    expect(await readdir(changesDir)).toHaveLength(1)
  })
})

describe('apply_change API gaps', () => {
  it('the apply_change op enum lists every maintenance and schema operation', async () => {
    const src = await readFile(SERVER_SRC, 'utf-8')
    const start = src.indexOf('Operation to perform')
    const enumBlock = src.slice(start, src.indexOf(']', start))
    for (const op of [...MAINTENANCE_OPS, ...SCHEMA_OPS]) {
      expect(enumBlock, `op enum is missing "${op}"`).toContain(`'${op}'`)
    }
  })

  it('generate_index refuses a level-3 model: the blueprint owns the index', async () => {
    const sourceFile = join(knowledgeDir, 'strategy_NN.md')
    const before = await readFile(sourceFile, 'utf-8')
    const res = await applyChange(root, 'strategy', 'generate_index', {})
    expect(res.success).toBe(false)
    expect(res.errors![0].message).toMatch(/level-3|level 3/i)
    expect(await readFile(sourceFile, 'utf-8')).toBe(before)
  })

  it('bump_version rejects the unversioned lineage record with a clear message', async () => {
    const record = `---
specification_version: "V_0-3-0"
level: 3
parent_spec:
  name: "cogNNitive"
  url: "specs/cogNNitive_NN.md"
title: "Strategy lineage"
---
`
    await writeFile(join(knowledgeDir, 'strategy_cogNNitive_NN.md'), record, 'utf-8')
    const res = await applyChange(root, 'strategy_cogNNitive', 'bump_version', { bump: 'patch' })
    expect(res.success).toBe(false)
    expect(res.errors![0].message).toMatch(/lineage record is unversioned/i)
    expect(await readFile(join(knowledgeDir, 'strategy_cogNNitive_NN.md'), 'utf-8')).toBe(record)
  })
})
