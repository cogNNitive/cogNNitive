import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { computeProposalSha, serializeChangeset } from '@cognnitive/nn-core'
import type { ChangeItem } from '@cognnitive/nn-core'

// Failure injection: `renameFailure` makes the staging -> live rename throw, which is the
// instant a crash would hit between "archive the old file" and "install the new one".
const injected = vi.hoisted(() => ({
  renameFailure: null as Error | null,
  renameFailForPath: null as string | null,
  renameEpermAttempts: 0,
}))

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...actual,
    rename: async (src: string, dest: string) => {
      if (injected.renameEpermAttempts > 0 && String(src).endsWith('.tmp')) {
        injected.renameEpermAttempts--
        const err = new Error('EPERM: operation not permitted') as any
        err.code = 'EPERM'
        throw err
      }
      if (injected.renameFailure && String(src).endsWith('.tmp')) {
        if (!injected.renameFailForPath || String(dest).includes(injected.renameFailForPath)) {
          throw injected.renameFailure
        }
      }
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
  // A change's evidence is mandatory; default it for the fixture changes.
  const withEvidence = changes.map((c) =>
    c.evidence === undefined ? { ...c, evidence: 'decision' } : c,
  )
  const doc = {
    frontmatter: {
      spec_version: 'V_0-4-0',
      level: 3 as const,
      parent_spec: { name: 'changes' as const, url: 'https://example.test/changes/spec_NN.md' },
      blueprint_version: '0.1.0',
      status: 'proposed' as const,
      proposal_sha: computeProposalSha(withEvidence),
    },
    changes: withEvidence,
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
    injected.renameFailForPath = null
    injected.renameEpermAttempts = 0
    await rm(root, { recursive: true, force: true })
  })

  it('installs the new model with no snapshot and no leftover .tmp', async () => {
    const result = await applyChange(root, 'changes/persist_changes_NN.md')
    expect(result.success).toBe(true)
    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toContain('Accelerate clean energy')
    expect(existsSync(join(knowledgeDir, 'archive'))).toBe(false)
    expect(existsSync(join(knowledgeDir, 'strategy.tmp'))).toBe(false)
  })

  it('keeps the live model byte-identical and leaves no .tmp when the rename fails', async () => {
    injected.renameFailure = new Error('simulated crash before install')

    await expect(applyChange(root, 'changes/persist_changes_NN.md')).rejects.toThrow(/simulated crash/)

    // The live path was never moved away: the old model is still there, byte for byte.
    expect(existsSync(join(knowledgeDir, 'strategy_NN.md'))).toBe(true)
    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toBe(LIVE_MODEL)
    // No snapshot and no staging file is left behind.
    expect(existsSync(join(knowledgeDir, 'archive'))).toBe(false)
    expect(existsSync(join(knowledgeDir, 'strategy.tmp'))).toBe(false)
  })

  it('rolls back earlier modified models when a later model fails to persist (#188)', async () => {
    // Write second model: tactics_NN.md
    const TACTICS_MODEL = LIVE_MODEL.replace('Strategy', 'Tactics').replace('Vision', 'Goal').replace('Accelerate green energy', 'Execute sprints')
    await writeFile(join(knowledgeDir, 'tactics_NN.md'), TACTICS_MODEL, 'utf-8')

    // Changeset modifying both strategy and tactics
    const multiChanges: ChangeItem[] = [
      {
        id: 'c-01',
        op: 'update_field',
        target: 'strategy@Vision&statement',
        from: 'Accelerate green energy',
        to: 'Accelerate clean energy',
        evidence: 'decision',
      },
      {
        id: 'c-02',
        op: 'update_field',
        target: 'tactics@Goal&statement',
        from: 'Execute sprints',
        to: 'Execute kanban',
        evidence: 'decision',
      },
    ]
    const multiDoc = {
      frontmatter: {
        spec_version: 'V_0-4-0',
        level: 3 as const,
        parent_spec: { name: 'changes' as const, url: 'https://example.test/changes/spec_NN.md' },
        blueprint_version: '0.1.0',
        status: 'proposed' as const,
        proposal_sha: computeProposalSha(multiChanges),
      },
      changes: multiChanges,
    }
    await writeFile(join(changesDir, 'multi_changes_NN.md'), serializeChangeset(multiDoc), 'utf-8')

    // Inject failure only when persisting tactics
    injected.renameFailForPath = 'tactics'
    injected.renameFailure = new Error('simulated failure on tactics rename')

    await expect(applyChange(root, 'changes/multi_changes_NN.md')).rejects.toThrow(/simulated failure on tactics rename/)

    // strategy must have been rolled back to LIVE_MODEL
    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toBe(LIVE_MODEL)
    // tactics must remain in its original state
    expect(await readFile(join(knowledgeDir, 'tactics_NN.md'), 'utf-8')).toBe(TACTICS_MODEL)
    // No .tmp or .rollback.tmp files remain
    expect(existsSync(join(knowledgeDir, 'strategy.tmp'))).toBe(false)
    expect(existsSync(join(knowledgeDir, 'strategy.rollback.tmp'))).toBe(false)
    expect(existsSync(join(knowledgeDir, 'tactics.tmp'))).toBe(false)
  })

  it('retries on transient Windows EPERM and succeeds when lock clears (#188)', async () => {
    // 2 transient EPERM errors, then success on 3rd attempt
    injected.renameEpermAttempts = 2

    const result = await applyChange(root, 'changes/persist_changes_NN.md')
    expect(result.success).toBe(true)
    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toContain('Accelerate clean energy')
    expect(injected.renameEpermAttempts).toBe(0)
    expect(existsSync(join(knowledgeDir, 'strategy.tmp'))).toBe(false)
  })
})
