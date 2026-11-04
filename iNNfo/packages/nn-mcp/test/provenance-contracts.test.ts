/**
 * Provenance tool contracts (change-provenance: `check_domain` reports
 * provenance; drift in `validate_knowledge`).
 *
 * `check_domain` carries a `ProvenanceReport` (the old `lineage` field stays
 * until S4b, replacement before deletion). `validate_knowledge` reports drift
 * only when it can see the workspace root; a document validated in isolation
 * emits none. A domain whose applied changes carry `unknown` evidence is visible
 * (130 `EVIDENCE_UNKNOWN`), as the LC_programas-like corpus was.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises'
import { computeProposalSha, serializeChangeset } from '@cognnitive/nn-core'
import type { ChangeItem } from '@cognnitive/nn-core'
import { applyChange } from '../src/tools/apply-change.js'
import { checkDomain } from '../src/tools/check-workspace.js'
import { validateKnowledge } from '../src/tools/validate.js'

const root = join(import.meta.dirname!, '..', 'temp-test-provenance-contracts')
const knowledgeDir = join(root, 'kNNowledge')
const changesDir = join(root, 'changes')
const specsDir = join(root, 'specs')

const BLUEPRINT_NAME = 'strategy_V_0-2-0'
const BLUEPRINT_URL = 'specs/strategy_V_0-2-0_NN.md'
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

# NN Field Definition
## NN Field Definition: owner
concept:: Work
type:: string
`

const ADD_MODEL: ChangeItem = {
  id: 'c-00',
  op: 'add_model',
  target: 'acme_strategy',
  blueprint_name: BLUEPRINT_NAME,
  blueprint_url: BLUEPRINT_URL,
  name: 'ACME Strategy',
  evidence: 'decision',
}

async function writeCs(changes: ChangeItem[], name = 'acme_changes_NN.md'): Promise<string> {
  const withEvidence = changes.map((c) => (c.evidence === undefined ? { ...c, evidence: 'decision' } : c))
  const doc = {
    frontmatter: {
      spec_version: 'V_0-4-0',
      level: 3 as const,
      parent_spec: { name: 'changes' as const, url: 'https://example.test/changes/spec_NN.md' },
      blueprint_version: 'V_0-6-0',
      status: 'proposed' as const,
      proposal_sha: computeProposalSha(withEvidence),
    },
    changes: withEvidence,
  }
  await writeFile(join(changesDir, name), serializeChangeset(doc), 'utf-8')
  return 'changes/' + name
}

async function modelPath(): Promise<string> {
  const names = (await readdir(knowledgeDir)).filter((n) => n.endsWith('_NN.md'))
  return join(knowledgeDir, names.sort()[0])
}

async function applyBaseline(): Promise<void> {
  const result = await applyChange(
    root,
    await writeCs([
      ADD_MODEL,
      { id: 'c-01', op: 'add_element', target: 'acme_strategy@Work', concept: 'Work', name: 'Pillar One' },
      { id: 'c-02', op: 'update_field', target: 'acme_strategy@pillar-one&statement', to: 'Own the market' },
      { id: 'c-03', op: 'update_field', target: 'acme_strategy@pillar-one&owner', to: 'Ana' },
    ]),
  )
  expect(result.success).toBe(true)
}

beforeEach(async () => {
  process.env.INNFO_CACHE_DIR = join(root, '.cache')
  vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
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
})

afterEach(async () => {
  delete process.env.INNFO_CACHE_DIR
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})

describe('check_domain.provenance', () => {
  it('reports a ProvenanceReport and no lineage field', async () => {
    await applyBaseline()
    const report = await checkDomain(root, { offline: true })

    expect(report.provenance).toBeDefined()
    expect(report.provenance.mode).toBe('fold')
    expect(Array.isArray(report.provenance.diagnostics)).toBe(true)
    expect(report.provenance.ok).toBe(true)
    // S4b: the lineage record is gone; `provenance` is the replacement.
    expect(report).not.toHaveProperty('lineage')
    // The flat `evidence` list is carried by `provenance.diagnostics` now.
    expect(report).not.toHaveProperty('evidence')
  })

  it('reports drift in the provenance report after a hand edit', async () => {
    await applyBaseline()
    const path = await modelPath()
    const content = await readFile(path, 'utf-8')
    await writeFile(path, content.replace('Own the market', 'Edited by hand'), 'utf-8')

    const report = await checkDomain(root, { offline: true })
    const drift = report.provenance.diagnostics.filter((d) => d.code === 'EDITED_WITHOUT_RECORD')
    expect(drift).toHaveLength(1)
    expect(drift[0].severity).toBe('warning')
  })

  it('surfaces MODEL_WITHOUT_FILE when a touched model has no file entry (distributed-storage S6c)', async () => {
    await applyBaseline()
    await rm(await modelPath())

    const report = await checkDomain(root, { offline: true })
    const missing = report.provenance.diagnostics.filter((d) => d.code === 'MODEL_WITHOUT_FILE')
    expect(missing).toHaveLength(1)
    expect(missing[0]!.severity).toBe('warning')
    expect(missing[0]!.message).toContain('acme_strategy')
    expect(missing[0]!.changeId).toBeTruthy()
  })

  it('surfaces 130 EVIDENCE_UNKNOWN diagnostics for an unknown-evidence corpus', async () => {
    const changes: ChangeItem[] = [
      ADD_MODEL,
      {
        id: 'c-element',
        op: 'add_element',
        target: 'acme_strategy@Work',
        concept: 'Work',
        name: 'Pillar One',
        evidence: 'decision',
      },
    ]
    for (let i = 0; i < 130; i++) {
      changes.push({
        id: `c-${String(i + 1).padStart(3, '0')}`,
        op: 'update_field',
        target: `acme_strategy@pillar-one&${i % 2 === 0 ? 'statement' : 'owner'}`,
        to: `value ${i}`,
        evidence: 'unknown',
      })
    }
    const result = await applyChange(root, await writeCs(changes))
    expect(result.errors ?? []).toEqual([])
    expect(result.success).toBe(true)

    const report = await checkDomain(root, { offline: true })
    const unknown = report.provenance.diagnostics.filter((d) => d.code === 'EVIDENCE_UNKNOWN')
    expect(unknown).toHaveLength(130)
  })
})

describe('validate_knowledge drift', () => {
  it('reports drift when the workspace root is available', async () => {
    await applyBaseline()
    const path = await modelPath()
    const content = await readFile(path, 'utf-8')
    await writeFile(path, content.replace('Own the market', 'Edited by hand'), 'utf-8')

    const result = await validateKnowledge(root, 'acme_strategy', undefined, undefined, true, {
      checkFreshness: false,
    })
    const drift = result.warnings.filter((w) => w.message.includes('[EDITED_WITHOUT_RECORD]'))
    expect(drift).toHaveLength(1)
  })

  it('omits drift without a workspace root', async () => {
    await applyBaseline()
    const path = await modelPath()
    const content = await readFile(path, 'utf-8')
    await writeFile(path, content.replace('Own the market', 'Edited by hand'), 'utf-8')

    const result = await validateKnowledge(root, 'acme_strategy', undefined, undefined, false, {
      checkFreshness: false,
    })
    expect(result.warnings.filter((w) => w.code === 'EDITED_WITHOUT_RECORD')).toEqual([])
  })
})
