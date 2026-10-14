import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises'
import { parseChangeset, verifyProposalSha } from '@cognnitive/innfo-core'
import { proposeChangeset, writeProposedChangeset } from './propose-changeset'
import { applyChange } from './apply-change'
import type { ConsoleWriter } from './console-regeneration'

const root = join(import.meta.dirname!, '..', '..', 'temp-test-propose')
const knowledgeDir = join(root, 'kNNowledge')
const changesDir = join(root, 'changes')
const specsDir = join(root, 'specs')
const consolePath = join(root, 'domaiNN_console.html')

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

const LIVE_MODEL = `---
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

const writer: ConsoleWriter = async () => ({ path: consolePath, status: 'written', opened: false })
const propose = (operations: unknown, extra: Record<string, unknown> = {}) =>
  proposeChangeset(root, { operations, open: false, ...extra }, { writer })

const UPDATE = {
  op: 'update_field',
  target: 'strategy@Vision&statement',
  from: 'Accelerate green energy',
  to: 'Accelerate clean energy',
}

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
  await writeFile(join(knowledgeDir, 'strategy_NN.md'), LIVE_MODEL, 'utf-8')
})

afterEach(async () => {
  delete process.env.INNFO_CACHE_DIR
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})

describe('propose_changeset writes a sealed proposed changeset', () => {
  it('writes status: proposed, sealed, leaves the model untouched and points at both files', async () => {
    const before = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    const result = await propose([UPDATE], { title: 'Clean energy' })

    expect(result.success).toBe(true)
    expect(result.status).toBe('proposed')
    const files = await readdir(changesDir)
    expect(files).toHaveLength(1)
    expect(files[0]).toMatch(/^temp-test-propose_agent_\d{8}T\d{6}Z_changes_NN\.md$/)
    expect(result.changeset).toBe(`changes/${files[0]}`)

    const doc = parseChangeset(await readFile(join(changesDir, files[0]), 'utf-8'))
    expect(doc.frontmatter.status).toBe('proposed')
    expect(doc.frontmatter.level).toBe(3)
    expect(doc.frontmatter.parent_spec.name).toBe('changes')
    expect(doc.frontmatter.title).toBe('Clean energy')
    expect(verifyProposalSha(doc)).toBe(true)
    expect(doc.changes.map((c) => c.id)).toEqual(['c-01'])

    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toBe(before)
    expect(result.console?.path).toBe(consolePath)
    expect(result.next_steps?.approve).toEqual({ reply: 'OK', tool: 'apply_change', changeset: result.changeset })
  })

  it('the written proposal applies and is never PROPOSAL_TAMPERED', async () => {
    const result = await propose([UPDATE])
    const applied = await applyChange(root, result.changeset!)
    expect(applied.errors?.some((e) => e.code === 'PROPOSAL_TAMPERED') ?? false).toBe(false)
    expect(applied.success).toBe(true)
    expect(applied.status).toBe('applied')
    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toContain('Accelerate clean energy')
  })

  it('names the file after the manifest workspace_id when the manifest declares one', async () => {
    await writeFile(join(root, 'domaiNN_NN.md'), '---\nlevel: 3\nworkspace_id: "acme-ws"\n---\n', 'utf-8')
    const result = await propose([UPDATE], { author: 'planner' })
    expect(result.changeset).toMatch(/^changes\/acme-ws_planner_/)
  })

  it('assigns ids in order and keeps the author', async () => {
    const result = await propose([UPDATE, { op: 'comment', target: 'strategy@Vision', notes: 'check', author: 'reviewer' }])
    const doc = parseChangeset(await readFile(join(root, result.changeset!), 'utf-8'))
    expect(doc.changes.map((c) => [c.id, c.author])).toEqual([
      ['c-01', 'agent'],
      ['c-02', 'reviewer'],
    ])
  })
})

describe('proposal validation before write', () => {
  const nothingWritten = async () => {
    const files = await readdir(changesDir).catch(() => [] as string[])
    expect(files).toEqual([])
  }

  it('an unknown target model returns an error naming it and writes nothing', async () => {
    const result = await propose([{ op: 'update_field', target: 'ghost@vision&statement', to: 'x' }])
    expect(result.success).toBe(false)
    expect(result.errors?.[0].code).toBe('MODEL_NOT_FOUND')
    expect(result.errors?.[0].message).toContain('ghost')
    await nothingWritten()
  })

  it('add_model on an existing model returns MODEL_EXISTS and writes nothing', async () => {
    const result = await propose([
      { op: 'add_model', target: 'strategy', blueprint_name: 'strategy_V_0-2-0', blueprint_url: 'specs/strategy_V_0-2-0_NN.md' },
    ])
    expect(result.success).toBe(false)
    expect(result.errors?.[0].code).toBe('MODEL_EXISTS')
    await nothingWritten()
  })

  it('a duplicate add_model returns an error and writes nothing', async () => {
    const add = { op: 'add_model', target: 'acme', blueprint_name: 'strategy_V_0-2-0', blueprint_url: 'specs/strategy_V_0-2-0_NN.md' }
    const result = await propose([add, add])
    expect(result.success).toBe(false)
    expect(result.errors?.some((e) => e.code === 'ADD_MODEL_DUPLICATE')).toBe(true)
    await nothingWritten()
  })

  it('operations missing required keys are rejected', async () => {
    const result = await propose([
      { op: 'update_field', target: 'strategy@Vision&statement' },
      { op: 'add_model', target: 'acme' },
      { op: 'add_element', target: 'strategy@Work', concept: 'Work' },
      { op: 'explode', target: 'strategy' },
    ])
    expect(result.success).toBe(false)
    const codes = result.errors!.map((e) => e.code)
    expect(codes).toContain('INVALID_OPERATION')
    expect(codes).toContain('UNKNOWN_OPERATION')
    expect(result.errors!.some((e) => /requires "to"/.test(e.message))).toBe(true)
    expect(result.errors!.some((e) => /blueprint_url/.test(e.message))).toBe(true)
    expect(result.errors!.some((e) => /requires "name"/.test(e.message))).toBe(true)
    await nothingWritten()
  })

  it('an empty or non-array operations list is rejected', async () => {
    expect((await propose([])).errors?.[0].code).toBe('EMPTY_PROPOSAL')
    expect((await propose('nope')).success).toBe(false)
  })

  it('add_model then add_element on the new id is written, and a later add_model is ordered', async () => {
    const add = { op: 'add_model', target: 'acme', blueprint_name: 'strategy_V_0-2-0', blueprint_url: 'specs/strategy_V_0-2-0_NN.md' }
    const element = { op: 'add_element', target: 'acme@Work', concept: 'Work', name: 'Pillar' }

    const early = await propose([element, add])
    expect(early.success).toBe(false)
    expect(early.errors?.[0].code).toBe('ADD_MODEL_ORDER')

    const ok = await propose([add, element])
    expect(ok.success).toBe(true)
    const applied = await applyChange(root, ok.changeset!)
    expect(applied.status).toBe('applied')
    expect(await readFile(join(knowledgeDir, 'acme_NN.md'), 'utf-8')).toContain('## NN Work: Pillar')
  })
})

describe('single proposed-changeset writer', () => {
  it('the bare intent path writes its changeset through the shared writer (L3, sealed)', async () => {
    const res = await applyChange(root, 'strategy', 'update_field', {
      elementName: 'Vision',
      fieldName: 'statement',
      value: 'Accelerate clean energy',
    })
    expect(res.success).toBe(true)
    const files = await readdir(changesDir)
    expect(files).toHaveLength(1)
    expect(files[0]).toMatch(/^temp-test-propose_agent_\d{8}T\d{6}Z_changes_NN\.md$/)
    const doc = parseChangeset(await readFile(join(changesDir, files[0]), 'utf-8'))
    expect(doc.frontmatter.level).toBe(3)
    expect(doc.frontmatter.parent_spec.name).toBe('changes')
    expect(doc.frontmatter.workspace_id).toBe('temp-test-propose')
    expect(verifyProposalSha(doc)).toBe(true)
  })

  it('two proposals in the same second get distinct files', async () => {
    const now = new Date('2026-10-14T12:00:00Z')
    const input = { changes: [{ id: 'x', op: 'comment' as const, target: 'strategy@Vision', notes: 'n' }], now }
    const a = await writeProposedChangeset(root, input)
    const b = await writeProposedChangeset(root, input)
    expect(a.path).not.toBe(b.path)
  })
})

describe('proposal next_steps', () => {
  it('carries the four steps in order and the OK shortcut', async () => {
    const result = await propose([UPDATE])
    const lines = result.next_steps!.notice.split('\n')
    expect(lines).toHaveLength(4)
    expect(lines[0]).toMatch(/^1\. The changeset was generated: changes\//)
    expect(lines[1]).toMatch(/^2\. The domain console was regenerated/)
    expect(lines[2]).toMatch(/^3\. /)
    expect(lines[3]).toMatch(/^4\. .*reply OK/)
  })

  it('with the console failed it points at the changeset file', async () => {
    const failing: ConsoleWriter = async () => {
      throw new Error('disk full')
    }
    const result = await proposeChangeset(root, { operations: [UPDATE], open: false }, { writer: failing })
    expect(result.success).toBe(true)
    expect(result.console?.status).toBe('failed')
    expect(result.next_steps!.notice).toContain('could not be regenerated')
    expect(result.next_steps!.notice).toContain(result.changeset!)
  })
})
