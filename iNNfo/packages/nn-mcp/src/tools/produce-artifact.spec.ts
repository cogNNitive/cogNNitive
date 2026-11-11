import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises'
import { parseChangeset, verifyProposalSha } from '@cognnitive/nn-core'
import { proposeChangeset } from './propose-changeset'
import { applyChange } from './apply-change'
import type { ConsoleWriter } from './console-regeneration'
import { resolvedFacts } from '../../test/helpers/resolved-facts'

const root = join(import.meta.dirname!, '..', '..', 'temp-test-artifact')
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

describe('produce_artifact', () => {
  const artifactChange = {
    op: 'produce_artifact',
    target: 'artifacts/report_20261002T101500Z.md',
    evidence: 'decision',
    author: 'curate-csv',
  }

  it('records an existing artifact path without loading a model or bumping a version', async () => {
    const before = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    const proposed = await propose([artifactChange])
    expect(proposed.success).toBe(true)

    const applied = await applyChange(root, proposed.changeset!)
    expect(applied.success).toBe(true)
    expect(applied.models).toEqual({})
    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toBe(before)

    const doc = parseChangeset(await readFile(join(root, proposed.changeset!), 'utf-8'))
    expect(resolvedFacts(doc).status).toBe('applied')
    expect(resolvedFacts(doc).resolvedTarget).toBe('artifacts/report_20261002T101500Z.md')
    expect(doc.changes[0].author).toBe('curate-csv')
    expect(verifyProposalSha(doc)).toBe(true)
  })

  it('a missing artifact rejects the proposal and writes no changeset', async () => {
    const result = await propose([{ ...artifactChange, target: 'artifacts/ghost.md' }])
    expect(result.success).toBe(false)
    expect(result.errors?.[0].code).toBe('ARTIFACT_NOT_FOUND')
    expect(result.errors?.[0].message).toContain('"artifacts/ghost.md" does not exist in this domain')
    expect(result.errors?.[0].message).toContain('no artifact registry')
    expect(result.errors?.[0].message).toContain('Write the file first')
    expect(await files()).toEqual([])
  })

  it('a directory target names the directory case and writes no changeset', async () => {
    await mkdir(join(artifactsDir, 'bundle'), { recursive: true })
    const result = await propose([{ ...artifactChange, target: 'artifacts/bundle' }])
    expect(result.success).toBe(false)
    expect(result.errors?.[0].code).toBe('ARTIFACT_NOT_A_FILE')
    expect(result.errors?.[0].message).toContain('"artifacts/bundle" is a directory; produce_artifact records one file')
    expect(await files()).toEqual([])
  })

  it('apply rejects an artifact removed after the proposal, with the same actionable message', async () => {
    const proposed = await propose([artifactChange])
    const written = await readFile(join(root, proposed.changeset!), 'utf-8')
    await rm(join(artifactsDir, 'report_20261002T101500Z.md'))
    const applied = await applyChange(root, proposed.changeset!)
    expect(applied.success).toBe(false)
    expect(applied.errors?.[0].code).toBe('ARTIFACT_NOT_FOUND')
    expect(applied.errors?.[0].message).toContain('does not exist in this domain')
    expect(await readFile(join(root, proposed.changeset!), 'utf-8')).toBe(written)
  })

  it('rejects an unsafe path and a model changeset or sidecar', async () => {
    const unsafe = await propose([{ ...artifactChange, target: '../outside.md' }])
    expect(unsafe.errors?.[0].code).toBe('ARTIFACT_INVALID_PATH')

    const model = await propose([{ ...artifactChange, target: 'kNNowledge/strategy_NN.md' }])
    expect(model.errors?.[0].code).toBe('ARTIFACT_INVALID_PATH')

    const sidecar = await propose([{ ...artifactChange, target: 'artifacts/a.pdf_sidecar_NN.md' }])
    expect(sidecar.errors?.[0].code).toBe('ARTIFACT_INVALID_PATH')
  })

  it('a second applied record for the same path is a conflict', async () => {
    const first = await propose([artifactChange])
    await applyChange(root, first.changeset!)
    const second = await propose([artifactChange])
    const applied = await applyChange(root, second.changeset!)
    expect(applied.success).toBe(false)
    expect(applied.status).toBe('conflict')
    const doc = parseChangeset(await readFile(join(root, second.changeset!), 'utf-8'))
    expect(resolvedFacts(doc).status).toBe('conflict')
    expect(doc.changes[0].resolution).toContain('ARTIFACT_ALREADY_RECORDED')
  })
})

describe('matrix seed', () => {
  it('seeds headers and empty cells and seals the seed', async () => {
    const result = await propose([
      {
        op: 'add_matrix',
        target: 'strategy@matrix:SWOT',
        name: 'SWOT',
        concept: 'Work',
        to: 'Work',
        seed: { columns: ['Q1', 'Q2'], rows: ['Vision'] },
        evidence: 'decision',
      },
    ])
    expect(result.success).toBe(true)
    const doc = parseChangeset(await readFile(join(root, result.changeset!), 'utf-8'))
    expect(doc.changes[0].seed).toEqual({ columns: ['Q1', 'Q2'], rows: ['Vision'] })

    const applied = await applyChange(root, result.changeset!)
    expect(applied.success).toBe(true)
    const content = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    expect(content).toContain('SWOT')
    expect(content).toContain('Q2')
  })

  it('rejects seed on any other op', async () => {
    const result = await propose([
      {
        op: 'update_field',
        target: 'strategy@vision&statement',
        to: 'x',
        evidence: 'decision',
        seed: { columns: ['a'] },
      },
    ])
    expect(result.success).toBe(false)
    expect(result.errors?.some((e) => e.code === 'INVALID_OPERATION' && /seed/.test(e.message))).toBe(true)
  })
})
