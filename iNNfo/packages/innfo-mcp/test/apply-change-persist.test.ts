import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { computeProposalSha, serializeChangeset } from '@cognnitive/innfo-core'
import type { ChangeItem } from '@cognnitive/innfo-core'

// Failure injection: `renameFailure` makes the staging -> live rename throw, which is the
// instant a crash would hit between "archive the old file" and "install the new one".
const injected = vi.hoisted(() => ({ renameFailure: null as Error | null }))

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...actual,
    rename: async (src: string, dest: string) => {
      if (injected.renameFailure && String(src).endsWith('.tmp')) throw injected.renameFailure
      return actual.rename(src, dest)
    },
  }
})

import { applyChange } from '../src/tools/apply-change.js'

const root = join(import.meta.dirname!, '..', 'temp-test-apply-persist')
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

async function writeChangeset(): Promise<void> {
  const changes: ChangeItem[] = [
    {
      id: 'c-01',
      op: 'update_field',
      target: 'strategy@Vision&statement',
      from: 'Accelerate green energy',
      to: 'Accelerate clean energy',
    },
  ]
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
  await writeFile(join(changesDir, 'persist_changes_NN.md'), serializeChangeset(doc), 'utf-8')
}

describe('apply persist is crash safe', () => {
  beforeEach(async () => {
    injected.renameFailure = null
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
    await writeChangeset()
  })

  afterEach(async () => {
    injected.renameFailure = null
    await rm(root, { recursive: true, force: true })
  })

  it('installs the new model and archives the previous snapshot on success', async () => {
    const result = await applyChange(root, 'changes/persist_changes_NN.md')
    expect(result.success).toBe(true)
    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toContain('Accelerate clean energy')
    const archived = await readdir(join(knowledgeDir, 'archive'))
    expect(archived).toHaveLength(1)
    expect(await readFile(join(knowledgeDir, 'archive', archived[0]), 'utf-8')).toBe(LIVE_MODEL)
    expect(existsSync(join(knowledgeDir, 'strategy.tmp'))).toBe(false)
  })

  it('keeps the live model complete when the install step fails after archiving', async () => {
    injected.renameFailure = new Error('simulated crash before install')

    await expect(applyChange(root, 'changes/persist_changes_NN.md')).rejects.toThrow(/simulated crash/)

    // The live path was never moved away: the old model is still there, byte for byte.
    expect(existsSync(join(knowledgeDir, 'strategy_NN.md'))).toBe(true)
    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toBe(LIVE_MODEL)
    // The snapshot was taken by copy, and no staging file is left behind.
    const archived = await readdir(join(knowledgeDir, 'archive'))
    expect(await readFile(join(knowledgeDir, 'archive', archived[0]), 'utf-8')).toBe(LIVE_MODEL)
    expect(existsSync(join(knowledgeDir, 'strategy.tmp'))).toBe(false)
  })
})
