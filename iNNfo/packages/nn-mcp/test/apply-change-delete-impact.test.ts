import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { computeProposalSha, serializeChangeset, parseChangeset } from '@cognnitive/nn-core'
import type { ChangeItem } from '@cognnitive/nn-core'

/**
 * Delete impact must be computed over every discovered workspace model, and a
 * candidate that cannot be read cannot be skipped: `remove_element` used to apply
 * against the peers that happened to load, leaving a dangling reference
 * (delete-impact-completeness, cross-review-sol C3).
 *
 * A read failure cannot be provoked portably with real files (permissions differ per
 * OS), so reads of a name in `injected.unreadable` fail with EACCES, the errno the
 * recorded reproduction injected.
 */
const injected = vi.hoisted(() => ({ unreadable: new Set<string>() }))

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...actual,
    readFile: (async (path: unknown, ...rest: unknown[]) => {
      const filePath = String(path)
      const name = filePath.split(/[\\/]/).pop() ?? filePath
      if (injected.unreadable.has(name)) {
        const err = new Error(`EACCES: permission denied, open '${filePath}'`) as NodeJS.ErrnoException
        err.code = 'EACCES'
        throw err
      }
      return (actual.readFile as (...args: unknown[]) => unknown)(path, ...rest)
    }) as typeof actual.readFile,
  }
})

import { applyChange } from '../src/tools/apply-change.js'

const root = join(import.meta.dirname!, '..', 'temp-test-delete-impact')
const specsDir = join(root, 'specs')
const knowledgeDir = join(root, 'kNNowledge')
const changesDir = join(root, 'changes')

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

const STRATEGY_MODEL = `---
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

/** A peer model that references `strategy@Vision` when it is readable. */
const PEER_MODEL = `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: "strategy_V_0-2-0"
  url: "specs/strategy_V_0-2-0_NN.md"
knowledge_version: "V_0-1-0"
title: "Hidden"
---

# NN index
* [[Work]]

# NN Work
## NN Work: Launch
statement:: Depends on [[strategy@vision]]
`

async function writeChangeset(name: string, changes: ChangeItem[]): Promise<string> {
  // A change's evidence is mandatory; default it for the fixture changes.
  const withEvidence = changes.map((c) => (c.evidence === undefined ? { ...c, evidence: 'decision' } : c))
  const doc = {
    frontmatter: {
      spec_version: 'V_0-4-0',
      level: 3 as const,
      parent_spec: { name: 'changes' as const, url: 'https://example.test/changes/spec_NN.md' },
      blueprint_version: '0.1.0',
      status: 'proposed' as const,
      proposal_sha: computeProposalSha(withEvidence),
      title: 'Delete impact',
      author: 'agent-writer',
      workspace_id: 'ws-1',
    },
    changes: withEvidence,
  }
  const rel = `changes/${name}`
  await writeFile(join(root, rel), serializeChangeset(doc), 'utf-8')
  return rel
}

const REMOVE_VISION: ChangeItem = { id: 'del-1', op: 'remove_element', target: 'strategy@Vision' }
const UPDATE_STATEMENT: ChangeItem = {
  id: 'upd-1',
  op: 'update_field',
  target: 'strategy@Vision&statement',
  from: 'Accelerate green energy',
  to: 'Accelerate clean energy',
}

describe('delete impact covers every discovered candidate', () => {
  beforeEach(async () => {
    injected.unreadable.clear()
    await rm(root, { recursive: true, force: true })
    for (const dir of [specsDir, knowledgeDir, changesDir]) await mkdir(dir, { recursive: true })
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
    await writeFile(join(knowledgeDir, 'strategy_NN.md'), STRATEGY_MODEL, 'utf-8')
    await writeFile(join(knowledgeDir, 'hidden_NN.md'), PEER_MODEL, 'utf-8')
  })

  afterEach(async () => {
    injected.unreadable.clear()
    await rm(root, { recursive: true, force: true })
  })

  it('blocks remove_element when a discovered candidate cannot be read, naming the path and the failure', async () => {
    const before = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    injected.unreadable.add('hidden_NN.md')

    const rel = await writeChangeset('safe_delete_blocked_changes_NN.md', [REMOVE_VISION])
    const res = await applyChange(root, rel)

    // The removal did not proceed.
    expect(res.success).toBe(false)
    expect(res.status).toBe('conflict')
    expect(res.appliedCount).toBe(0)

    // The diagnostic names the unreadable candidate's workspace path and its failure.
    const diagnostic = res.errors?.find((e) => e.code === 'DELETE_IMPACT_INCOMPLETE')
    expect(diagnostic).toBeDefined()
    expect(diagnostic!.message).toContain(
      'DELETE_IMPACT_INCOMPLETE: the incoming references to "strategy@Vision" could not be scanned',
    )
    expect(diagnostic!.message).toContain('"kNNowledge/hidden_NN.md" (EACCES: permission denied')
    expect(diagnostic!.message).toMatch(/The remove_element was not applied$/)

    // Zero target persistence: no byte of the model moved, and no version was bumped.
    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toBe(before)

    // The conflict is recorded on the change itself, not only in the result.
    const annotated = parseChangeset(await readFile(join(root, rel), 'utf-8'))
    expect(annotated.frontmatter.status).toBe('conflict')
    expect(annotated.changes[0]!.resolution).toContain('DELETE_IMPACT_INCOMPLETE')
  })

  it('does not block a change that removes nothing', async () => {
    injected.unreadable.add('hidden_NN.md')

    const rel = await writeChangeset('safe_delete_non_destructive_changes_NN.md', [UPDATE_STATEMENT])
    const res = await applyChange(root, rel)

    expect(res.success).toBe(true)
    expect(res.status).toBe('applied')
    const live = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    expect(live).toContain('statement:: Accelerate clean energy')
  })

  it('still conflicts when a readable candidate holds an incoming reference', async () => {
    const rel = await writeChangeset('safe_delete_referenced_changes_NN.md', [REMOVE_VISION])
    const res = await applyChange(root, rel)

    expect(res.success).toBe(false)
    expect(res.status).toBe('conflict')
    const live = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    expect(live).toContain('## NN Work: Vision')
    const annotated = parseChangeset(await readFile(join(root, rel), 'utf-8'))
    expect(annotated.changes[0]!.resolution).toContain('REFERENCED_BY')
    expect(annotated.changes[0]!.resolution).not.toContain('DELETE_IMPACT_INCOMPLETE')
  })

  it('applies the rest of the batch and leaves only the removal in conflict', async () => {
    injected.unreadable.add('hidden_NN.md')

    const rel = await writeChangeset('safe_delete_partial_changes_NN.md', [
      REMOVE_VISION,
      UPDATE_STATEMENT,
    ])
    const res = await applyChange(root, rel)

    expect(res.success).toBe(true)
    expect(res.status).toBe('partially_applied')
    expect(res.appliedCount).toBe(1)
    expect(res.conflictedCount).toBe(1)

    // The companion update applied; the removal did not.
    const live = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    expect(live).toContain('statement:: Accelerate clean energy')
    expect(live).toContain('## NN Work: Vision')

    const annotated = parseChangeset(await readFile(join(root, rel), 'utf-8'))
    const removal = annotated.changes.find((c) => c.id === 'del-1')
    const update = annotated.changes.find((c) => c.id === 'upd-1')
    expect(removal!.status).toBe('conflict')
    expect(removal!.resolution).toContain('DELETE_IMPACT_INCOMPLETE')
    expect(removal!.resolution).toContain('kNNowledge/hidden_NN.md')
    expect(update!.status).toBe('applied')
  })
})
