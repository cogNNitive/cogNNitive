/**
 * Clearing a field removes it (issue #560 item A).
 *
 * `update_field` with `to:: ""` (and a `set_fields` entry whose value is "")
 * deletes the key, so the written file no longer carries the line. This is the
 * only way a legacy L3 `sources::` field, banned from iNNfo V_0-6-0 on, can be
 * repaired through the change log: `apply_change` validates the whole model, so
 * until the field is gone every other changeset on that model is rejected.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { applyChange } from '../src/tools/apply-change.js'
import {
  checkProvenance,
  computeProposalSha,
  loadChangeLog,
  parseKnowledge,
  serializeChangeset,
} from '@cognnitive/nn-core'
import type { ChangeItem } from '@cognnitive/nn-core'

const root = join(import.meta.dirname!, '..', 'temp-test-clear-field-removes')
const specsDir = join(root, 'specs')
const knowledgeDir = join(root, 'kNNowledge')
const changesDir = join(root, 'changes')
const modelPath = join(knowledgeDir, 'strategy_NN.md')

const BLUEPRINT = `---
spec_version: "V_0-6-0"
level: 2
blueprint_version: "0.2.0"
blueprint_name: "strategy"
title: "Strategy Template"
parent_spec:
  name: "iNNfo_V_0-6-0"
  url: "specs/iNNfo_V_0-6-0_NN.md"
---

# NN Concept Definition
## NN Concept Definition: Work
type:: list

# NN Field Definition
## NN Field Definition: statement
concept:: Work
type:: string

## NN Field Definition: target_year
concept:: Work
type:: string
`

const MODEL = (extra: string) => `---
spec_version: "V_0-6-0"
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
target_year:: 2030
${extra}`

const LEGACY_SOURCES = 'sources/import/interview.md@## Vision'

async function writeChangeset(file: string, changes: ChangeItem[]): Promise<string> {
  const withEvidence = changes.map((c) => ({ ...c, evidence: c.evidence ?? 'decision' }))
  const doc = serializeChangeset({
    frontmatter: {
      spec_version: 'V_0-4-0',
      level: 3,
      parent_spec: { name: 'changes', url: 'https://example.test/changes/spec_NN.md' },
      blueprint_version: '0.1.0',
      status: 'proposed',
      proposal_sha: computeProposalSha(withEvidence),
      title: 'Test Changeset',
      author: 'agent-writer',
      workspace_id: 'ws-1',
    },
    changes: withEvidence,
  })
  await writeFile(join(changesDir, file), doc, 'utf-8')
  return `changes/${file}`
}

beforeEach(async () => {
  vi.stubEnv('NN_AUTHOR', 'tester')
  await rm(root, { recursive: true, force: true })
  await mkdir(specsDir, { recursive: true })
  await mkdir(knowledgeDir, { recursive: true })
  await mkdir(changesDir, { recursive: true })
  await writeFile(
    join(specsDir, 'iNNfo_V_0-6-0_NN.md'),
    '---\nspec_version: "V_0-6-0"\nlevel: 1\ntitle: "iNNfo"\nparent_spec:\n  name: "defiNNition_V_0-1-0"\n  url: "specs/defiNNition_V_0-1-0_NN.md"\n---\n',
    'utf-8',
  )
  await writeFile(
    join(specsDir, 'defiNNition_V_0-1-0_NN.md'),
    '---\nspec_version: "V_0-1-0"\nlevel: 0\ntitle: "defiNNition"\n---\n',
    'utf-8',
  )
  await writeFile(join(specsDir, 'strategy_V_0-2-0_NN.md'), BLUEPRINT, 'utf-8')
})

afterEach(async () => {
  vi.unstubAllEnvs()
  await rm(root, { recursive: true, force: true })
})

describe('clearing a field removes it', () => {
  it('update_field with to "" removes the line from the written file', async () => {
    await writeFile(modelPath, MODEL(''), 'utf-8')
    const cs = await writeChangeset('clear_changes_NN.md', [
      {
        id: 'c-01',
        op: 'update_field',
        target: 'strategy@vision&target_year',
        from: '2030',
        to: '',
      },
    ])

    const res = await applyChange(root, cs)
    expect(res.success).toBe(true)

    const live = await readFile(modelPath, 'utf-8')
    expect(live).not.toMatch(/^target_year::/m)
    expect(live).toContain('statement:: Accelerate green energy')
  })

  it('set_fields with an empty entry removes that line and writes the others', async () => {
    await writeFile(modelPath, MODEL(''), 'utf-8')
    const cs = await writeChangeset('set_changes_NN.md', [
      {
        id: 'c-01',
        op: 'set_fields',
        target: 'strategy@vision',
        to: JSON.stringify({ target_year: '', statement: 'Accelerate clean energy' }),
      },
    ])

    const res = await applyChange(root, cs)
    expect(res.success).toBe(true)

    const live = await readFile(modelPath, 'utf-8')
    expect(live).not.toMatch(/^target_year::/m)
    expect(live).toContain('statement:: Accelerate clean energy')
  })

  it('update_field with a non-empty value still writes the line', async () => {
    await writeFile(modelPath, MODEL(''), 'utf-8')
    const cs = await writeChangeset('write_changes_NN.md', [
      {
        id: 'c-01',
        op: 'update_field',
        target: 'strategy@vision&target_year',
        from: '2030',
        to: 'Q4 2035',
      },
    ])

    const res = await applyChange(root, cs)
    expect(res.success).toBe(true)
    expect(await readFile(modelPath, 'utf-8')).toMatch(/^target_year:: Q4 2035$/m)
  })

  it('repairs a legacy sources:: field: the ban is gone, further changes apply, the fold reports no drift', async () => {
    await writeFile(modelPath, MODEL(`sources:: ${LEGACY_SOURCES}\n`), 'utf-8')

    // The banned field blocks every changeset on the model, even one that does not touch it.
    const blocked = await writeChangeset('blocked_changes_NN.md', [
      {
        id: 'c-01',
        op: 'update_field',
        target: 'strategy@vision&target_year',
        from: '2030',
        to: 'Q4 2031',
      },
    ])
    const rejected = await applyChange(root, blocked)
    expect(rejected.success).toBe(false)
    expect(rejected.errors?.some((e) => e.message.includes('"sources::" is banned on L3'))).toBe(
      true,
    )

    // One changeset that clears it repairs the model.
    const repair = await writeChangeset('repair_changes_NN.md', [
      {
        id: 'c-01',
        op: 'update_field',
        target: 'strategy@vision&sources',
        from: LEGACY_SOURCES,
        to: '',
      },
    ])
    const repaired = await applyChange(root, repair)
    expect(repaired.errors ?? []).toEqual([])
    expect(repaired.success).toBe(true)
    expect(await readFile(modelPath, 'utf-8')).not.toMatch(/^sources::/m)

    // Afterwards the model accepts further changes.
    const next = await writeChangeset('next_changes_NN.md', [
      {
        id: 'c-01',
        op: 'update_field',
        target: 'strategy@vision&target_year',
        from: '2030',
        to: 'Q4 2031',
      },
    ])
    const accepted = await applyChange(root, next)
    expect(accepted.success).toBe(true)
    const live = await readFile(modelPath, 'utf-8')
    expect(live).toMatch(/^target_year:: Q4 2031$/m)

    // The fold expects the cleared unit absent, and the file agrees.
    const report = checkProvenance(loadChangeLog(root), [
      { modelId: 'strategy', model: parseKnowledge(live), path: 'kNNowledge/strategy_NN.md' },
    ])
    expect(report.diagnostics.filter((d) => d.unit === 'strategy@vision&sources')).toEqual([])
  })
})
