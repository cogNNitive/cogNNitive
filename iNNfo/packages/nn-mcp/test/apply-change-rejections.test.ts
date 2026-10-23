import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { applyChange } from '../src/tools/apply-change.js'
import { computeProposalSha, serializeChangeset, parseChangeset, verifyProposalSha } from '@cognnitive/nn-core'
import type { ChangesetDocument, ChangeItem } from '@cognnitive/nn-core'

// Linux-safe rejection paths of the two-phase changeset engine: none of these
// reach blueprint resolution (pre-validation failures, idempotent replay and
// comment-only applies), so they run on every platform — unlike
// test/apply-change.test.ts, which exercises schema validation tiers and is
// Windows-only (see vitest.config.ts WINDOWS_ONLY_SUITES).

const csRoot = join(import.meta.dirname!, '..', 'temp-test-changeset-rejections')
const knowledgeDir = join(csRoot, 'kNNowledge')
const changesDir = join(csRoot, 'changes')

const LIVE_STRATEGY_MODEL = `---
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
target_year:: 2030
`

function makeChangeset(doc: {
  status?: 'proposed' | 'applied'
  models?: Record<string, { base_version: string; result_version: string }>
  changes: ChangeItem[]
}): ChangesetDocument {
  return {
    frontmatter: {
      spec_version: 'V_0-4-0',
      level: 3,
      parent_spec: { name: 'changes', url: 'https://example.test/changes/spec_NN.md' },
      blueprint_version: '0.1.0',
      status: doc.status ?? 'proposed',
      proposal_sha: computeProposalSha(doc.changes),
      title: 'Test Changeset',
      author: 'agent-writer',
      workspace_id: 'ws-1',
      models: doc.models,
    },
    changes: doc.changes,
  }
}

describe('Two-Phase Changeset Rejection Paths (cross-platform)', () => {
  beforeEach(async () => {
    await rm(csRoot, { recursive: true, force: true })
    await mkdir(knowledgeDir, { recursive: true })
    await mkdir(changesDir, { recursive: true })
    await writeFile(join(knowledgeDir, 'strategy_NN.md'), LIVE_STRATEGY_MODEL, 'utf-8')
  })

  afterEach(async () => {
    await rm(csRoot, { recursive: true, force: true })
  })

  it('Missing Changeset File: applying a nonexistent changeset path rejects with zero disk changes', async () => {
    const res = await applyChange(csRoot, 'changes/does_not_exist_changes_NN.md')
    expect(res.success).toBe(false)
    expect(res.status).toBe('rejected')
    expect(res.errors?.some((e) => /Failed to read changeset file/.test(e.message))).toBe(true)
    expect(existsSync(join(knowledgeDir, 'archive'))).toBe(false)
  })

  it('Model Not Found: changeset targeting an unknown model rejects', async () => {
    const csFile = join(changesDir, 'unknown_model_changes_NN.md')
    const csDoc = makeChangeset({
      changes: [
        {
          id: 'c-01',
          op: 'update_field',
          target: 'ghost@Vision&statement',
          from: 'Whatever',
          to: 'Something else',
        },
      ],
    })
    await writeFile(csFile, serializeChangeset(csDoc), 'utf-8')

    const res = await applyChange(csRoot, 'changes/unknown_model_changes_NN.md')
    expect(res.success).toBe(false)
    expect(res.status).toBe('rejected')
    expect(res.errors?.some((e) => /Model not found: ghost/.test(e.message))).toBe(true)
    expect(existsSync(join(knowledgeDir, 'archive'))).toBe(false)
  })

  it('Unsealed Proposed Changeset: sealed at intake, applies with zero archive footprint', async () => {
    const csFile = join(changesDir, 'ws_reviewer_unsealed_changes_NN.md')
    const csDoc = makeChangeset({
      changes: [
        {
          id: 'fb-001',
          op: 'comment',
          target: 'strategy@Vision&statement',
          notes: 'reviewer-note-without-a-seal',
        },
      ],
    })
    // A producer (e.g. the console review export) that never stamped the draft.
    csDoc.frontmatter.proposal_sha = ''
    await writeFile(csFile, serializeChangeset(csDoc), 'utf-8')

    const res = await applyChange(csRoot, 'changes/ws_reviewer_unsealed_changes_NN.md')
    expect(res.success).toBe(true)
    expect(res.appliedCount).toBe(0)

    // The seal is written back and validates against the canonical proposal hash.
    const sealed = await readFile(csFile, 'utf-8')
    expect(verifyProposalSha(parseChangeset(sealed))).toBe(true)
    // The written-back changeset is a valid Level-3 document.
    expect(sealed).toContain('level: 3')
    expect(sealed).toContain('name: changes')

    // Nothing was mutated, so no archive directory is created.
    expect(existsSync(join(knowledgeDir, 'archive'))).toBe(false)
  })

  it('Tamper Detection: mismatched proposal_sha rejects before touching disk', async () => {
    const csFile = join(changesDir, 'tampered_changes_NN.md')
    const csDoc = makeChangeset({
      changes: [
        {
          id: 'c-01',
          op: 'update_field',
          target: 'strategy@Vision&statement',
          from: 'Accelerate green energy',
          to: 'Accelerate clean energy',
        },
      ],
    })
    csDoc.frontmatter.proposal_sha = 'deadbeef'.repeat(8)
    await writeFile(csFile, serializeChangeset(csDoc), 'utf-8')

    const res = await applyChange(csRoot, 'changes/tampered_changes_NN.md')
    expect(res.success).toBe(false)
    expect(
      res.errors?.some((e) => e.code === 'PROPOSAL_TAMPERED' || /PROPOSAL_TAMPERED/.test(e.message)),
    ).toBe(true)
    const live = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    expect(live).toContain('Accelerate green energy')
    expect(existsSync(join(knowledgeDir, 'archive'))).toBe(false)
  })

  it('Re-proposal Loop: conflict-status doc edited after validation is re-sealed, not PROPOSAL_TAMPERED', async () => {
    const csFile = join(changesDir, 'reproposed_changes_NN.md')
    const csDoc = makeChangeset({
      changes: [
        {
          id: 'fb-001',
          op: 'comment',
          target: 'strategy@Vision&statement',
          notes: 'reviewer-note-original',
        },
      ],
    })
    // Simulate the fix-and-retry loop: a previous run annotated the doc as
    // conflict, then the author edited the ops without touching the seal.
    csDoc.frontmatter.status = 'conflict' as ChangesetDocument['frontmatter']['status']
    csDoc.changes[0].notes = 'reviewer-note-fixed-after-conflict'
    await writeFile(csFile, serializeChangeset(csDoc), 'utf-8')

    const res = await applyChange(csRoot, 'changes/reproposed_changes_NN.md')
    expect((res.errors ?? []).some((e) => e.code === 'PROPOSAL_TAMPERED')).toBe(false)
    expect(res.success).toBe(true)

    // The edit re-proposed: the seal was recomputed and validates.
    const resealed = await readFile(csFile, 'utf-8')
    expect(verifyProposalSha(parseChangeset(resealed))).toBe(true)
    expect(existsSync(join(knowledgeDir, 'archive'))).toBe(false)
  })

  it('Idempotent Replay Mismatch: applied changeset whose live version drifted reports no-op without mutating', async () => {
    const csFile = join(changesDir, 'ws_agent_drift_changes_NN.md')
    const csDoc = makeChangeset({
      status: 'applied',
      models: { strategy: { base_version: 'V_0-1-0', result_version: 'V_9-9-9' } },
      changes: [
        {
          id: 'c-01',
          op: 'update_field',
          target: 'strategy@Vision&statement',
          from: 'Accelerate green energy',
          to: 'New Vision Statement',
        },
      ],
    })
    await writeFile(csFile, serializeChangeset(csDoc), 'utf-8')

    const res = await applyChange(csRoot, 'changes/ws_agent_drift_changes_NN.md')
    expect(res.success).toBe(true)
    expect(res.appliedCount).toBe(0)
    expect(res.warnings?.some((w) => /no mutations performed/.test(w.message))).toBe(true)

    const liveContent = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    expect(liveContent).toContain('knowledge_version: "V_0-1-0"')
    expect(existsSync(join(knowledgeDir, 'archive'))).toBe(false)
  })

  it('Comment-Only Changeset: applies cleanly with zero mutations and bumps nothing', async () => {
    const csFile = join(changesDir, 'ws_agent_notes_changes_NN.md')
    const csDoc = makeChangeset({
      changes: [
        {
          id: 'c-01',
          op: 'comment',
          target: 'strategy@Vision&statement',
          notes: 'Reviewer note with no mutation',
        },
      ],
    })
    await writeFile(csFile, serializeChangeset(csDoc), 'utf-8')

    const res = await applyChange(csRoot, 'changes/ws_agent_notes_changes_NN.md')
    expect(res.success).toBe(true)
    expect(res.appliedCount).toBe(0)

    const liveContent = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    expect(liveContent).toContain('knowledge_version: "V_0-1-0"')
  })

  it('Dispatch Without Op: id without op routes to the changeset path and rejects on missing file', async () => {
    const res = await applyChange(csRoot, 'strategy')
    expect(res.success).toBe(false)
    expect(res.errors?.some((e) => /Failed to read changeset file/.test(e.message))).toBe(true)
  })

  it('Idempotent Replay Match: applied changeset with matching live version returns success no-op', async () => {
    await writeFile(
      join(knowledgeDir, 'strategy_NN.md'),
      LIVE_STRATEGY_MODEL.replace('knowledge_version: "V_0-1-0"', 'knowledge_version: "V_0-1-1"'),
      'utf-8',
    )
    const csFile = join(changesDir, 'ws_agent_match_changes_NN.md')
    const csDoc = makeChangeset({
      status: 'applied',
      models: { strategy: { base_version: 'V_0-1-0', result_version: 'V_0-1-1' } },
      changes: [
        {
          id: 'c-01',
          op: 'update_field',
          target: 'strategy@Vision&statement',
          from: 'Accelerate green energy',
          to: 'New Vision Statement',
        },
      ],
    })
    await writeFile(csFile, serializeChangeset(csDoc), 'utf-8')

    const res = await applyChange(csRoot, 'changes/ws_agent_match_changes_NN.md')
    expect(res.success).toBe(true)
    expect(res.appliedCount).toBe(0)
    expect(res.warnings?.some((w) => /already applied with matching model versions/.test(w.message))).toBe(
      true,
    )
    expect(existsSync(join(knowledgeDir, 'archive'))).toBe(false)
  })

  it('Idempotent Replay Without Models Record: applied changeset with no record returns no-op', async () => {
    const csFile = join(changesDir, 'ws_agent_norecord_changes_NN.md')
    const csDoc = makeChangeset({
      status: 'applied',
      changes: [
        {
          id: 'c-01',
          op: 'comment',
          target: 'strategy@Vision&statement',
          notes: 'Already applied elsewhere',
        },
      ],
    })
    await writeFile(csFile, serializeChangeset(csDoc), 'utf-8')

    const res = await applyChange(csRoot, 'changes/ws_agent_norecord_changes_NN.md')
    expect(res.success).toBe(true)
    expect(res.appliedCount).toBe(0)
    expect(existsSync(join(knowledgeDir, 'archive'))).toBe(false)
  })

  it('Modeless Target: change address without model part is skipped without mutating', async () => {
    const csFile = join(changesDir, 'ws_agent_modeless_changes_NN.md')
    const csDoc = makeChangeset({
      changes: [
        {
          id: 'c-01',
          op: 'update_field',
          target: '@Vision&statement',
          from: 'Accelerate green energy',
          to: 'New Vision Statement',
        },
      ],
    })
    await writeFile(csFile, serializeChangeset(csDoc), 'utf-8')

    const res = await applyChange(csRoot, 'changes/ws_agent_modeless_changes_NN.md')
    expect(res.success).toBe(true)
    // NOTE: appliedCount counts non-comment changes even when skipped for lack
    // of a model part — the meaningful invariant is zero disk mutation.
    expect(res.appliedCount).toBe(1)
    const liveContent = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    expect(liveContent).toContain('Accelerate green energy')
  })

  it('Absolute Changeset Path: absolute _changes_NN.md path routes to the changeset engine', async () => {
    const res = await applyChange(csRoot, join(changesDir, 'absent_changes_NN.md'))
    expect(res.success).toBe(false)
    expect(res.errors?.some((e) => /Failed to read changeset file/.test(e.message))).toBe(true)
  })

  it('Path Traversal: changeset path escaping the workspace root is rejected before any read/write', async () => {
    const res = await applyChange(csRoot, '../outside_changes_NN.md')
    expect(res.success).toBe(false)
    expect(res.status).toBe('rejected')
    expect(res.errors?.some((e) => /must resolve inside the workspace root/.test(e.message))).toBe(true)
  })

  it('Unsafe id: bare op with a traversal id is rejected before filename interpolation', async () => {
    const res = await applyChange(csRoot, '../../../escape', 'update_field', {
      elementName: 'Vision',
      fieldName: 'statement',
      value: 'x',
    })
    expect(res.success).toBe(false)
    expect(res.errors?.some((e) => /safe workspace-relative path/.test(e.message))).toBe(true)
  })

  it('Evidence Resolution: an unresolved evidence:: rejects with CITATION_UNRESOLVED, returns the rejection without recording it, writes no model, releases the lock', async () => {
    const csFile = join(changesDir, 'ws_agent_citation_bad_changes_NN.md')
    const csDoc = makeChangeset({
      changes: [
        {
          id: 'c-01',
          op: 'comment',
          target: 'strategy@Vision&statement',
          notes: 'evidence-backed note',
          evidence: 'sources/import/missing.md@## Needs',
        },
      ],
    })
    const serialized = serializeChangeset(csDoc)
    await writeFile(csFile, serialized, 'utf-8')

    const res = await applyChange(csRoot, 'changes/ws_agent_citation_bad_changes_NN.md')
    expect(res.success).toBe(false)
    expect(res.status).toBe('rejected')
    expect(
      res.errors?.some(
        (e) => e.code === 'CITATION_UNRESOLVED' && /c-01/.test(e.message) && /missing\.md/.test(e.message),
      ),
    ).toBe(true)

    // Workspace-dependent: the file stays proposed and byte-identical; the lock was released.
    expect(await readFile(csFile, 'utf-8')).toBe(serialized)
    expect(existsSync(join(changesDir, '.lock'))).toBe(false)
    const live = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    expect(live).toContain('Accelerate green energy')
  })

  it('Evidence Resolution: a resolving evidence:: applies and the evidence:: line is byte-identical after write-back', async () => {
    await mkdir(join(csRoot, 'sources', 'import'), { recursive: true })
    await writeFile(
      join(csRoot, 'sources', 'import', 'interview.md'),
      '# Interview\n\n## Needs\n\nWe need clean energy.\n',
      'utf-8',
    )

    const csFile = join(changesDir, 'ws_agent_citation_ok_changes_NN.md')
    const csDoc = makeChangeset({
      changes: [
        {
          id: 'c-01',
          op: 'comment',
          target: 'strategy@Vision&statement',
          notes: 'evidence-backed note',
          evidence: 'sources/import/interview.md@## Needs',
        },
      ],
    })
    await writeFile(csFile, serializeChangeset(csDoc), 'utf-8')

    const res = await applyChange(csRoot, 'changes/ws_agent_citation_ok_changes_NN.md')
    expect(res.success).toBe(true)

    const written = await readFile(csFile, 'utf-8')
    expect(written).toContain('evidence:: sources/import/interview.md@## Needs')
  })

  it('P0-3 regression: apply_change refuses to mutate a tool-owned lineage record and leaves it byte-identical', async () => {
    const lineageContent = `---
specification_version: "V_0-3-0"
specification_url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/iNNfo_V_0-5-0_NN.md"
level: 3
parent_spec:
  name: "cogNNitive"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/cogNNitive/spec_NN.md"
title: "Provenance"
---

# NN index

* [[Sources]]
* [[ModelRecords]]

# NN ModelRecords

## NN ModelRecords: strategy
model_ref:: kNNowledge/strategy_NN.md
knowledge_version:: V_0-1-0
derived_from:: [ sources/import/interview.md@## Needs ]
`
    const lineageFile = join(csRoot, 'test_cogNNitive_NN.md')
    await writeFile(lineageFile, lineageContent, 'utf-8')

    // Attempting single-op applyChange against the lineage record
    const res = await applyChange(csRoot, 'test_cogNNitive', 'update_field', {
      conceptName: 'ModelRecords',
      elementName: 'strategy',
      fieldName: 'knowledge_version',
      value: 'V_0-2-0',
    })

    expect(res.success).toBe(false)
    expect(res.status).toBe('rejected')
    expect(res.errors?.some((e) => e.code === 'TOOL_OWNED_DOCUMENT' && /tool-owned lineage record/i.test(e.message))).toBe(true)

    // Verify the lineage file was NEVER modified or injected with slug::
    const after = await readFile(lineageFile, 'utf-8')
    expect(after).toBe(lineageContent)
    expect(after).not.toContain('slug::')
  })
})
