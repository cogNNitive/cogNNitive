import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { parseChangeset } from '@cognnitive/nn-core'
import { applyChange } from '../src/tools/apply-change.js'
import { resolvedFacts } from './helpers/resolved-facts'

/**
 * changeset-review-gate: applying a verdict requires a human console changeset, and
 * the gate must be declared by the target model's bluepriNNt. The policy applies to
 * the changeset as a whole: a refused verdict writes nothing.
 */

const root = join(import.meta.dirname!, '..', 'temp-test-review-gate')
const knowledgeDir = join(root, 'kNNowledge')
const specsDir = join(root, 'specs')
const changesDir = join(root, 'changes')

const BLUEPRINT = `---
spec_version: "V_0-4-0"
level: 2
blueprint_version: "V_0-2-0"
blueprint_name: "strategy"
title: "Strategy Template"
parent_spec:
  name: "iNNfo_V_0-3-0"
  url: "specs/iNNfo_V_0-3-0_NN.md"
gates:
  sign-off: model
  script: element
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

const HASH = 'a'.repeat(64)

interface DocOptions {
  author_kind?: string
  origin?: string
  reviewer?: string
  extraChange?: string
}

/** A changeset file with one verdict change (plus an optional second change). */
function verdictDoc({
  author_kind = 'human',
  origin = 'console',
  reviewer = 'Ana',
  extraChange = '',
}: DocOptions = {}): string {
  const marker = (key: string, value: string) =>
    value === '' ? `${key}: ""\n` : `${key}: ${value}\n`
  return `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: changes
  url: "https://example.invalid/changes/spec_NN.md"
blueprint_version: "0.1.0"
status: proposed
title: "Verdicts"
author_kind: ${author_kind}
origin: ${origin}
${marker('reviewer', reviewer)}workspace_id: "ws-1"
---

# NN index

* [[Change]]

# NN Change

## NN Change: c-01
op:: review_gate
target:: strategy@Vision
gate:: script
verdict:: approved
reviewed_hash:: ${HASH}
${extraChange}`.replace(/\n{3,}/g, '\n\n')
}

async function writeChangeset(text: string, name = 'verdict'): Promise<string> {
  const rel = `changes/${name}_changes_NN.md`
  await writeFile(join(root, rel), text, 'utf-8')
  return rel
}

beforeEach(async () => {
  process.env.INNFO_CACHE_DIR = join(root, '.cache')
  vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
  await rm(root, { recursive: true, force: true })
  for (const dir of [knowledgeDir, specsDir, changesDir]) await mkdir(dir, { recursive: true })
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
})

afterEach(async () => {
  delete process.env.INNFO_CACHE_DIR
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})

/** Asserts the model is byte-identical and the verdict changeset is persisted as rejected. */
async function expectRefused(ref: string, code: string): Promise<void> {
  const res = await applyChange(root, ref)
  expect(res.success).toBe(false)
  expect(res.status).toBe('rejected')
  expect(res.errors?.map((e) => e.code)).toContain(code)
  expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toBe(MODEL)
  const doc = parseChangeset(await readFile(join(root, ref), 'utf-8'))
  expect(doc.frontmatter.status).toBe('rejected')
}

describe('a verdict is applied only from a human console changeset', () => {
  it('an agent-authored verdict is refused with GATE_NOT_HUMAN', async () => {
    await expectRefused(await writeChangeset(verdictDoc({ author_kind: 'agent' })), 'GATE_NOT_HUMAN')
  })

  it('an engine-authored verdict is refused with GATE_NOT_HUMAN', async () => {
    await expectRefused(await writeChangeset(verdictDoc({ author_kind: 'engine' })), 'GATE_NOT_HUMAN')
  })

  it('a human changeset from another origin is refused with GATE_NOT_HUMAN', async () => {
    await expectRefused(await writeChangeset(verdictDoc({ origin: 'mcp' })), 'GATE_NOT_HUMAN')
  })

  it('an empty reviewer is refused with GATE_REVIEWER_REQUIRED', async () => {
    await expectRefused(await writeChangeset(verdictDoc({ reviewer: '' })), 'GATE_REVIEWER_REQUIRED')
  })

  it('the default pseudonym reviewer is refused with GATE_REVIEWER_REQUIRED', async () => {
    await expectRefused(await writeChangeset(verdictDoc({ reviewer: 'reviewer' })), 'GATE_REVIEWER_REQUIRED')
  })

  it('a mixed agent changeset is refused whole: the content change is not applied', async () => {
    const extra = `
## NN Change: c-02
op:: update_field
target:: strategy@Vision&statement
to:: Tampered
evidence:: decision
`
    await expectRefused(
      await writeChangeset(verdictDoc({ author_kind: 'agent', extraChange: extra }), 'mixed'),
      'GATE_NOT_HUMAN',
    )
  })
})

describe('a gate must be declared by the target bluepriNNt', () => {
  it('an undeclared gate is refused with GATE_UNDECLARED', async () => {
    const doc = verdictDoc().replace('gate:: script', 'gate:: publish')
    await expectRefused(await writeChangeset(doc, 'undeclared'), 'GATE_UNDECLARED')
  })

  it('an element gate aimed at the model target is GATE_TARGET_INVALID', async () => {
    const doc = verdictDoc().replace('target:: strategy@Vision', 'target:: strategy')
    await expectRefused(await writeChangeset(doc, 'bad-unit'), 'GATE_TARGET_INVALID')
  })
})

describe('a human console verdict applies without touching the model', () => {
  it('the change is annotated applied, the model and its version are unchanged', async () => {
    const ref = await writeChangeset(verdictDoc())
    const res = await applyChange(root, ref)
    expect(res.success).toBe(true)
    expect(res.status).toBe('applied')
    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toBe(MODEL)

    const doc = parseChangeset(await readFile(join(root, ref), 'utf-8'))
    expect(doc.frontmatter.status).toBe('applied')
    expect(resolvedFacts(doc).status).toBe('applied')
    expect(doc.frontmatter.models ?? {}).toEqual({})
  })

  it('replaying the applied verdict changes nothing', async () => {
    const ref = await writeChangeset(verdictDoc())
    await applyChange(root, ref)
    const before = await readFile(join(root, ref), 'utf-8')
    const replay = await applyChange(root, ref)
    expect(replay.success).toBe(true)
    expect(await readFile(join(root, ref), 'utf-8')).toBe(before)
    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toBe(MODEL)
  })
})
