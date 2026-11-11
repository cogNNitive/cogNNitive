/**
 * #614: an element slug the address grammar rejects (e.g. a dotted domain name) is
 * refused by propose_changeset and apply_change before any write.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises'
import { parseChangeset, verifyProposalSha } from '@cognnitive/nn-core'
import { proposeChangeset } from './propose-changeset'
import { applyChange } from './apply-change'
import type { ConsoleWriter } from './console-regeneration'
import { resolvedFacts } from '../../test/helpers/resolved-facts'

const root = join(import.meta.dirname!, '..', '..', 'temp-test-element-slug')
const knowledgeDir = join(root, 'kNNowledge')
const changesDir = join(root, 'changes')
const specsDir = join(root, 'specs')
const artifactsDir = join(root, 'artifacts')
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
slug:: vision
statement:: Accelerate green energy
`

const writer: ConsoleWriter = async () => ({ path: consolePath, status: 'written', opened: false })
const propose = (operations: unknown[]) =>
  proposeChangeset(root, { operations, open: false }, { writer })
const files = () => readdir(changesDir).catch(() => [] as string[])

beforeEach(async () => {
  process.env.INNFO_CACHE_DIR = join(root, '.cache')
  vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
  await rm(root, { recursive: true, force: true })
  for (const dir of [knowledgeDir, specsDir, artifactsDir, changesDir]) {
    await mkdir(dir, { recursive: true })
  }
  await writeFile(
    join(specsDir, 'iNNfo_V_0-3-0_NN.md'),
    '---\nspec_version: "V_0-3-0"\nlevel: 1\ntitle: "iNNfo"\nparent_spec:\n  name: "defiNNition_V_0-1-0"\n  url: "specs/defiNNition_V_0-1-0_NN.md"\n---\n',
    'utf-8',
  )
  await writeFile(
    join(specsDir, 'defiNNition_V_0-1-0_NN.md'),
    '---\nspec_version: "V_0-1-0"\nlevel: 0\ntitle: "defiNNition"\n---\n',
    'utf-8',
  )
  await writeFile(join(specsDir, 'strategy_V_0-2-0_NN.md'), BLUEPRINT, 'utf-8')
  await writeFile(join(knowledgeDir, 'strategy_NN.md'), MODEL, 'utf-8')
  await writeFile(join(artifactsDir, 'report_20261002T101500Z.md'), '# Report\n', 'utf-8')
})

afterEach(async () => {
  delete process.env.INNFO_CACHE_DIR
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})


describe('T6 e2e', () => {
  it('dotted slug: propose rejects, nothing written', async () => {
    const r = await propose([{ op: 'add_element', target: 'strategy@Work', concept: 'Work', name: 'Pipeline Partners', slug: 'pipelinepartners.co' }])
    console.log('PROPOSE', JSON.stringify(r.errors ?? r.success))
    expect(r.success).toBe(false)
    expect(r.errors?.[0].code).toBe('INVALID_ELEMENT_SLUG')
    expect(await files()).toEqual([])
  })
  it('dotted slug: apply of a hand-written changeset rejects, model unchanged', async () => {
    const ok = await propose([{ op: 'add_element', target: 'strategy@Work', concept: 'Work', name: 'Pipeline Partners', slug: 'pipeline-partners' }])
    expect(ok.success).toBe(true)
    const p = join(root, ok.changeset!)
    const text = (await readFile(p, 'utf-8')).replace('slug:: pipeline-partners', 'slug:: pipelinepartners.co').replace(/^proposal_sha:.*\r?\n/m, '')
    await writeFile(p, text, 'utf-8')
    const before = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    const a = await applyChange(root, ok.changeset!)
    console.log('APPLY', JSON.stringify({ s: a.status, e: a.errors }))
    expect(a.success).toBe(false)
    expect(a.errors?.[0].code ?? a.errors?.[0].message).toContain('INVALID_ELEMENT_SLUG')
    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toBe(before)
  })
  it('directory artifact', async () => {
    await mkdir(join(root, 'artifacts', 'bundle'), { recursive: true })
    const r = await propose([{ op: 'produce_artifact', target: 'artifacts/bundle', evidence: 'decision', author: 'x' }])
    console.log('DIR', JSON.stringify(r.errors))
  })
})
