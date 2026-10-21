import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { computeProposalSha, serializeChangeset } from '@cognnitive/nn-core'
import type { ChangeItem } from '@cognnitive/nn-core'
import { applyChange } from '../src/tools/apply-change.js'
import { applyWithConsole, type ConsoleOutcome, type ConsoleWriter } from '../src/tools/console-regeneration.js'

const root = join(import.meta.dirname!, '..', 'temp-test-apply-console')
const knowledgeDir = join(root, 'kNNowledge')
const changesDir = join(root, 'changes')
const specsDir = join(root, 'specs')

const BLUEPRINT = `---
spec_version: "V_0-4-0"
level: 2
blueprint_version: "0.2.0"
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

async function writeChangeset(changes: ChangeItem[]): Promise<string> {
  const name = 'console_changes_NN.md'
  const doc = {
    frontmatter: {
      spec_version: 'V_0-4-0',
      level: 3 as const,
      parent_spec: { name: 'changes' as const, url: 'https://example.test/changes/spec_NN.md' },
      blueprint_version: '0.1.0',
      status: 'proposed' as const,
      proposal_sha: computeProposalSha(changes),
    },
    changes,
  }
  await writeFile(join(changesDir, name), serializeChangeset(doc), 'utf-8')
  return 'changes/' + name
}

const CLEAN: ChangeItem = {
  id: 'c-01',
  op: 'update_field',
  target: 'strategy@Vision&statement',
  from: 'Accelerate green energy',
  to: 'Accelerate clean energy',
}
const STALE: ChangeItem = {
  id: 'c-02',
  op: 'update_field',
  target: 'strategy@Vision&statement',
  from: 'This is not the live value',
  to: 'Never applied',
}

const NOOP_WRITER: ConsoleWriter = async () => ({
  path: join(root, 'domaiNN_console.html'),
  status: 'written',
  opened: false,
})

describe('apply_change regenerates the console after commit', () => {
  beforeEach(async () => {
    await rm(root, { recursive: true, force: true })
    for (const dir of [knowledgeDir, changesDir, specsDir]) await mkdir(dir, { recursive: true })
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
    await writeFile(join(knowledgeDir, 'strategy_NN.md'), LIVE_MODEL, 'utf-8')
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('runs the writer after the model is committed and the lock is released', async () => {
    const changeset = await writeChangeset([CLEAN])
    const observed: { lockPresent?: boolean; modelHasNewValue?: boolean } = {}
    const writer: ConsoleWriter = async (options) => {
      observed.lockPresent = existsSync(join(changesDir, '.lock'))
      const live = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
      observed.modelHasNewValue = live.includes('Accelerate clean energy')
      return NOOP_WRITER(options)
    }
    const payload = await applyWithConsole(root, () => applyChange(root, changeset), { writer, open: false })

    expect(payload.status).toBe('applied')
    expect(observed).toEqual({ lockPresent: false, modelHasNewValue: true })
    expect((payload.console as ConsoleOutcome).status).toBe('written')
    const steps = payload.next_steps as { notice: string; approve?: unknown }
    expect(steps.notice).toContain(changeset)
    expect(steps.approve).toBeUndefined()
  })

  it('regenerates for partially_applied and names the conflicted change ids', async () => {
    const changeset = await writeChangeset([CLEAN, STALE])
    const payload = await applyWithConsole(root, () => applyChange(root, changeset), {
      writer: NOOP_WRITER,
      open: false,
    })

    expect(payload.status).toBe('partially_applied')
    expect((payload.console as ConsoleOutcome).status).toBe('written')
    expect((payload.next_steps as { notice: string }).notice).toContain('c-02')
  })

  it('keeps status applied and the applied content when the writer fails', async () => {
    const changeset = await writeChangeset([CLEAN])
    const writer: ConsoleWriter = async () => {
      throw new Error('console assets unavailable')
    }
    const payload = await applyWithConsole(root, () => applyChange(root, changeset), { writer, open: false })

    expect(payload.success).toBe(true)
    expect(payload.status).toBe('applied')
    expect((payload.console as ConsoleOutcome).status).toBe('failed')
    const live = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    expect(live).toContain('Accelerate clean energy')
    expect((payload.next_steps as { notice: string }).notice).toContain('could not be regenerated')
  })

  it('adds no console field when every change conflicts', async () => {
    const changeset = await writeChangeset([STALE])
    let called = false
    const writer: ConsoleWriter = async (options) => {
      called = true
      return NOOP_WRITER(options)
    }
    const payload = await applyWithConsole(root, () => applyChange(root, changeset), { writer, open: false })

    expect(payload.status).toBe('conflict')
    expect(payload.console).toBeUndefined()
    expect(called).toBe(false)
  })

  it('adds no console field when the changeset is rejected', async () => {
    const writer: ConsoleWriter = async () => {
      throw new Error('must not run')
    }
    const payload = await applyWithConsole(root, () => applyChange(root, 'changes/missing_changes_NN.md'), { writer })
    expect(payload.status).toBe('rejected')
    expect(payload.console).toBeUndefined()
  })
})
