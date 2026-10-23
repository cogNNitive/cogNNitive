import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { rm, mkdir, writeFile, readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { applyChange } from '../src/tools/apply-change.js'
import {
  computeProposalSha,
  serializeChangeset,
  parseChangeset,
  verifyProposalSha,
} from '@cognnitive/nn-core'
import type { ChangesetDocument, ChangeItem } from '@cognnitive/nn-core'

describe('Two-Phase Changeset Apply Engine (Phase 5)', () => {
  const csRoot = join(import.meta.dirname!, '..', 'temp-test-changeset-apply')
  const specsDir = join(csRoot, 'specs')
  const knowledgeDir = join(csRoot, 'kNNowledge')
  const changesDir = join(csRoot, 'changes')

  const BLUEPRINT_CONTENT = `---
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

## NN Field Definition: target_year
concept:: Work
type:: string

## NN Field Definition: depends_on
concept:: Work
type:: reference
`

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
price:: 5
statement_source:: sources/interview.md@## Vision
target_year_source:: sources/report.pdf_sidecar_NN.md@## Timeline
sources:: [sources/interview.md@## Vision, sources/report.pdf_sidecar_NN.md@## Timeline]
`

  beforeEach(async () => {
    await rm(csRoot, { recursive: true, force: true })
    await mkdir(specsDir, { recursive: true })
    await mkdir(knowledgeDir, { recursive: true })
    await mkdir(changesDir, { recursive: true })

    // Stub specs chain
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
    await writeFile(join(specsDir, 'strategy_V_0-2-0_NN.md'), BLUEPRINT_CONTENT, 'utf-8')

    // Create live model
    await writeFile(join(knowledgeDir, 'strategy_NN.md'), LIVE_STRATEGY_MODEL, 'utf-8')
  })

  afterEach(async () => {
    await rm(csRoot, { recursive: true, force: true })
  })

  function makeChangeset(doc: {
    status?: 'proposed' | 'applied' | 'partially_applied'
    models?: Record<string, { base_version: string; result_version: string }>
    changes: ChangeItem[]
  }): ChangesetDocument {
    const sha = computeProposalSha(doc.changes)
    return {
      frontmatter: {
        spec_version: 'V_0-4-0',
        level: 3,
        parent_spec: { name: 'changes', url: 'https://example.test/changes/spec_NN.md' },
        blueprint_version: '0.1.0',
        status: doc.status ?? 'proposed',
        proposal_sha: sha,
        title: 'Test Changeset',
        author: 'agent-writer',
        workspace_id: 'ws-1',
        models: doc.models,
      },
      changes: doc.changes,
    }
  }

  it('Single-Writer Lock: active lock blocks concurrent execution with CONCURRENT_APPLY_ACTIVE; released on error or success', async () => {
    const csFile = join(changesDir, 'ws_agent_c1_changes_NN.md')
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
    await writeFile(csFile, serializeChangeset(csDoc), 'utf-8')

    // Pre-create an active lock (<60s)
    const lockPath = join(changesDir, '.lock')
    await writeFile(
      lockPath,
      JSON.stringify({ pid: process.pid, timestamp: Date.now(), changeset: 'another_change' }),
      'utf-8',
    )

    // Attempting apply should fail immediately with CONCURRENT_APPLY_ACTIVE
    await expect(applyChange(csRoot, 'changes/ws_agent_c1_changes_NN.md')).rejects.toThrow(
      /CONCURRENT_APPLY_ACTIVE/,
    )

    // The lock file remains intact
    expect(existsSync(lockPath)).toBe(true)

    // Clean up lock manually
    await rm(lockPath, { force: true })

    // Now apply succeeds and lock is released after completion
    const res = await applyChange(csRoot, 'changes/ws_agent_c1_changes_NN.md')
    expect(res.success).toBe(true)
    expect(existsSync(lockPath)).toBe(false)
  })

  it('Precondition Check: aborts with CONFLICT/PRECONDITION_FAILED when from value does not match', async () => {
    const csFile = join(changesDir, 'precondition_fail_changes_NN.md')
    const csDoc = makeChangeset({
      changes: [
        {
          id: 'c-01',
          op: 'update_field',
          target: 'strategy@Vision&statement',
          from: 'Incorrect prior value',
          to: 'Accelerate clean energy',
        },
      ],
    })
    await writeFile(csFile, serializeChangeset(csDoc), 'utf-8')

    const res = await applyChange(csRoot, 'changes/precondition_fail_changes_NN.md')
    expect(res.success).toBe(false)
    expect(
      res.errors?.some(
        (e) => e.code === 'PRECONDITION_FAILED' || /PRECONDITION_FAILED|conflict/i.test(e.message),
      ),
    ).toBe(true)

    // Live file untouched
    const live = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    expect(live).toContain('Accelerate green energy')
    expect(existsSync(join(knowledgeDir, 'archive'))).toBe(false)
  })

  it('Phase 1 Validation Failure: aborts with zero disk changes when mutation violates schema', async () => {
    const csFile = join(changesDir, 'invalid_schema_changes_NN.md')
    const csDoc = makeChangeset({
      changes: [
        {
          id: 'c-01',
          op: 'add_element',
          target: 'strategy@NonExistentConcept',
          concept: 'NonExistentConcept',
          name: 'Invalid Item',
        },
      ],
    })
    await writeFile(csFile, serializeChangeset(csDoc), 'utf-8')

    const res = await applyChange(csRoot, 'changes/invalid_schema_changes_NN.md')
    expect(res.success).toBe(false)
    expect(res.errors && res.errors.length > 0).toBe(true)

    // Zero archive files, zero tmp files, live file unchanged
    expect(existsSync(join(knowledgeDir, 'archive'))).toBe(false)
    expect(existsSync(join(knowledgeDir, 'strategy.tmp'))).toBe(false)
    const live = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    expect(live).toContain('Accelerate green energy')
    expect(existsSync(join(changesDir, '.lock'))).toBe(false)
  })

  it('Phase 2 Persistence: bumps version, annotates the changeset, writes no snapshot', async () => {
    const csFile = join(changesDir, 'ws_agent_apply_changes_NN.md')
    const csDoc = makeChangeset({
      changes: [
        {
          id: 'c-01',
          op: 'update_field',
          target: 'strategy@Vision&statement',
          from: 'Accelerate green energy',
          to: 'Accelerate 100% renewable energy globally',
          notes: 'Approved by steering committee',
        },
      ],
    })
    await writeFile(csFile, serializeChangeset(csDoc), 'utf-8')

    const res = await applyChange(csRoot, 'changes/ws_agent_apply_changes_NN.md')
    expect(res.success).toBe(true)
    expect(res.status).toBe('applied')
    expect(res.models).toBeDefined()
    expect(res.models!['strategy']).toEqual({
      base_version: 'V_0-1-0',
      result_version: 'V_0-1-1',
    })

    // No snapshot is written: kNNowledge/archive/ does not exist, and no .tmp is left.
    expect(existsSync(join(knowledgeDir, 'archive'))).toBe(false)
    expect(existsSync(join(knowledgeDir, 'strategy.tmp'))).toBe(false)

    // Live file has bumped version and mutated content
    const liveContent = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    expect(liveContent).toContain('knowledge_version: "V_0-1-1"')
    expect(liveContent).toContain('Accelerate 100% renewable energy globally')

    // Changeset on disk is annotated
    const updatedCs = parseChangeset(await readFile(csFile, 'utf-8'))
    expect(updatedCs.frontmatter.status).toBe('applied')
    expect(updatedCs.frontmatter.applied_at).toBeDefined()
    expect(updatedCs.frontmatter.models?.['strategy']).toEqual({
      base_version: 'V_0-1-0',
      result_version: 'V_0-1-1',
    })
    expect(updatedCs.changes[0].status).toBe('applied')
    expect(updatedCs.changes[0].resolution).toBeDefined()
  })

  it('D20 removed: apply writes NO companion citation on the model and no replaced_sources', async () => {
    const csFile = join(changesDir, 'ws_agent_d20_changes_NN.md')
    const csDoc = makeChangeset({
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

    const res = await applyChange(csRoot, 'changes/ws_agent_d20_changes_NN.md')
    expect(res.success).toBe(true)

    const liveContent = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    // The mutation is written...
    expect(liveContent).toContain('New Vision Statement')
    // ...but the field gains no companion citation pointing at the change.
    expect(liveContent).not.toContain('statement_source:: changes/')
    // An untouched field keeps its previous citation.
    expect(liveContent).toContain('target_year_source:: sources/report.pdf_sidecar_NN.md@## Timeline')

    // No replaced_sources annotation is written anywhere.
    const written = await readFile(csFile, 'utf-8')
    expect(written).not.toContain('replaced_sources::')
    const updatedCs = parseChangeset(written)
    expect(verifyProposalSha(updatedCs)).toBe(true)
  })

  it('add_element writes no companion citation and no replaced_sources annotation', async () => {
    const csFile = join(changesDir, 'ws_agent_add_changes_NN.md')
    const csDoc = makeChangeset({
      changes: [
        {
          id: 'c-01',
          op: 'add_element',
          target: 'strategy@Work',
          concept: 'Work',
          name: 'Fresh Element',
        },
      ],
    })
    await writeFile(csFile, serializeChangeset(csDoc), 'utf-8')

    const res = await applyChange(csRoot, 'changes/ws_agent_add_changes_NN.md')
    expect(res.success).toBe(true)

    const written = await readFile(csFile, 'utf-8')
    expect(written).not.toContain('replaced_sources::')
    expect(written).not.toContain('sources::')
  })

  it('Idempotent Replay: re-applying an applied changeset writes no file at all', async () => {
    const csFile = join(changesDir, 'ws_agent_replay_changes_NN.md')
    const csDoc = makeChangeset({
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

    // First apply
    const res1 = await applyChange(csRoot, 'changes/ws_agent_replay_changes_NN.md')
    expect(res1.success).toBe(true)
    expect(existsSync(join(knowledgeDir, 'archive'))).toBe(false)

    const modelAfterFirst = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    const csAfterFirst = await readFile(csFile, 'utf-8')

    // Replay apply
    const res2 = await applyChange(csRoot, 'changes/ws_agent_replay_changes_NN.md')
    expect(res2.success).toBe(true)

    // No file is written on replay: the model and changeset bytes are unchanged.
    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toBe(modelAfterFirst)
    expect(await readFile(csFile, 'utf-8')).toBe(csAfterFirst)

    // Model version not re-bumped (still V_0-1-1)
    expect(modelAfterFirst).toContain('knowledge_version: "V_0-1-1"')
  })

  it('Direct apply_change update_field preserves a numeric field type (price:: 7, not "7")', async () => {
    const res = await applyChange(csRoot, 'strategy', 'update_field', {
      elementName: 'Vision',
      fieldName: 'price',
      value: 7,
    })
    expect(res.success).toBe(true)

    const live = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    expect(live).toContain('price:: 7')
    expect(live).not.toContain('price:: "7"')
  })

  it('Bare Operation Synthesis: calling apply_change with legacy bare args synthesizes, seals, and executes changeset', async () => {
    const res = await applyChange(csRoot, 'strategy', 'update_field', {
      elementName: 'Vision',
      fieldName: 'statement',
      value: 'Synthesized update via legacy bare arguments',
    })

    expect(res.success).toBe(true)

    // Live model updated
    const liveContent = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    expect(liveContent).toContain('Synthesized update via legacy bare arguments')
    expect(liveContent).toContain('knowledge_version: "V_0-1-1"')

    // A changeset file was synthesized in changes/
    const csFiles = await readdir(changesDir)
    const synthesized = csFiles.filter((f) => f.includes('_agent_') && f.endsWith('_changes_NN.md'))
    expect(synthesized.length).toBe(1)

    // Synthesized changeset is sealed and marked applied
    const csContent = await readFile(join(changesDir, synthesized[0]), 'utf-8')
    const parsedCs = parseChangeset(csContent)
    expect(parsedCs.frontmatter.status).toBe('applied')
    expect(parsedCs.frontmatter.proposal_sha).toBeDefined()
    expect(parsedCs.frontmatter.level).toBe(3)
    expect(parsedCs.frontmatter.parent_spec.name).toBe('changes')
    expect(parsedCs.changes.length).toBe(1)
  })

  it('update_field with an empty to clears the field line', async () => {
    const csFile = join(changesDir, 'clear_field_changes_NN.md')
    const csDoc = makeChangeset({
      changes: [
        {
          id: 'c-01',
          op: 'update_field',
          target: 'strategy@Vision&statement',
          from: 'Accelerate green energy',
          to: '',
        },
      ],
    })
    await writeFile(csFile, serializeChangeset(csDoc), 'utf-8')

    const res = await applyChange(csRoot, 'changes/clear_field_changes_NN.md')
    expect(res.success).toBe(true)

    const live = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    expect(live).not.toContain('statement:: Accelerate green energy')
    // Untouched fields survive the clear.
    expect(live).toContain('target_year:: 2030')

    const annotated = parseChangeset(await readFile(csFile, 'utf-8'))
    expect(annotated.changes[0].status).toBe('applied')
  })

  it('a clear whose from does not match is a conflict with a resolution and writes nothing', async () => {
    const csFile = join(changesDir, 'clear_conflict_changes_NN.md')
    const csDoc = makeChangeset({
      changes: [
        {
          id: 'c-01',
          op: 'update_field',
          target: 'strategy@Vision&statement',
          from: 'Wrong prior value',
          to: '',
        },
      ],
    })
    await writeFile(csFile, serializeChangeset(csDoc), 'utf-8')

    const res = await applyChange(csRoot, 'changes/clear_conflict_changes_NN.md')
    expect(res.success).toBe(false)

    const live = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    expect(live).toContain('statement:: Accelerate green energy')

    const annotated = parseChangeset(await readFile(csFile, 'utf-8'))
    expect(annotated.changes[0].status).toBe('conflict')
    expect(annotated.changes[0].resolution).toContain('PRECONDITION_FAILED')
  })

  it('a validation failure rejects the whole file: a valid clear in the same batch is not persisted', async () => {
    const before = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    const csFile = join(changesDir, 'invalid_after_apply_changes_NN.md')
    const csDoc = makeChangeset({
      changes: [
        {
          id: 'c-clear',
          op: 'update_field',
          target: 'strategy@Vision&statement',
          from: 'Accelerate green energy',
          to: '',
        },
        {
          id: 'c-dangle',
          op: 'update_field',
          target: 'strategy@Vision&depends_on',
          to: 'Ghost Element',
        },
      ],
    })
    await writeFile(csFile, serializeChangeset(csDoc), 'utf-8')

    const res = await applyChange(csRoot, 'changes/invalid_after_apply_changes_NN.md')
    expect(res.success).toBe(false)
    expect(res.errors?.some((e) => e.code === 'VALIDATION_FAILED')).toBe(true)

    // Whole-file rejection: even the otherwise-valid clear is not persisted.
    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toBe(before)
    expect(existsSync(join(knowledgeDir, 'archive'))).toBe(false)
  })

  describe('Slice S2b: Partitioning, Slugs, and Delete Impact', () => {
    it('mixed batch applies clean subset and annotates partially_applied', async () => {
      const csFile = join(changesDir, 'mixed_batch_changes_NN.md')
      const csDoc = makeChangeset({
        changes: [
          {
            id: 'c-clean',
            op: 'update_field',
            target: 'strategy@Vision&statement',
            from: 'Accelerate green energy',
            to: 'Accelerate clean energy',
          },
          {
            id: 'c-conflict',
            op: 'update_field',
            target: 'strategy@Vision&target_year',
            from: '2099',
            to: '2040',
          },
        ],
      })
      await writeFile(csFile, serializeChangeset(csDoc), 'utf-8')

      const res = await applyChange(csRoot, 'changes/mixed_batch_changes_NN.md')
      expect(res.success).toBe(true)
      expect(res.status).toBe('partially_applied')
      expect(res.appliedCount).toBe(1)
      expect(res.conflictedCount).toBe(1)

      // Live model received clean update
      const live = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
      expect(live).toContain('Accelerate clean energy')
      expect(live).toContain('target_year:: 2030') // Unchanged

      // Changeset document annotated
      const annotated = parseChangeset(await readFile(csFile, 'utf-8'))
      expect(annotated.frontmatter.status).toBe('partially_applied')
      expect(annotated.changes[0].status).toBe('applied')
      expect(annotated.changes[1].status).toBe('conflict')
      expect(annotated.changes[1].resolution).toContain('PRECONDITION_FAILED')
    })

    it('all-conflicted batch makes zero disk writes and emits zero snapshots', async () => {
      const csFile = join(changesDir, 'all_conflicted_changes_NN.md')
      const csDoc = makeChangeset({
        changes: [
          {
            id: 'c-bad',
            op: 'update_field',
            target: 'strategy@Vision&statement',
            from: 'Incorrect From',
            to: 'New Statement',
          },
        ],
      })
      await writeFile(csFile, serializeChangeset(csDoc), 'utf-8')

      const res = await applyChange(csRoot, 'changes/all_conflicted_changes_NN.md')
      expect(res.success).toBe(false)
      expect(res.status).toBe('conflict')
      expect(res.appliedCount).toBe(0)

      // Zero snapshots in archive
      expect(existsSync(join(knowledgeDir, 'archive'))).toBe(false)

      // Live model untouched
      const live = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
      expect(live).toContain('Accelerate green energy')

      // Changeset annotated with conflict status
      const annotated = parseChangeset(await readFile(csFile, 'utf-8'))
      expect(annotated.frontmatter.status).toBe('conflict')
      expect(annotated.changes[0].status).toBe('conflict')
    })

    it('untouched models in mixed batch emit no version bump and no snapshot', async () => {
      // Create a second model execution_NN.md
      const EXEC_MODEL = `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: "strategy_V_0-2-0"
  url: "specs/strategy_V_0-2-0_NN.md"
knowledge_version: "V_0-1-0"
title: "Execution"
---

# NN index
* [[Work]]

# NN Work
## NN Work: Task1
statement:: Execute plan
`
      await writeFile(join(knowledgeDir, 'execution_NN.md'), EXEC_MODEL, 'utf-8')

      const csFile = join(changesDir, 'multi_model_mixed_changes_NN.md')
      const csDoc = makeChangeset({
        changes: [
          {
            id: 'c-strat',
            op: 'update_field',
            target: 'strategy@Vision&statement',
            from: 'Accelerate green energy',
            to: 'Accelerate clean energy',
          },
          {
            id: 'c-exec',
            op: 'update_field',
            target: 'execution@Task1&statement',
            from: 'Wrong from',
            to: 'New task',
          },
        ],
      })
      await writeFile(csFile, serializeChangeset(csDoc), 'utf-8')

      const res = await applyChange(csRoot, 'changes/multi_model_mixed_changes_NN.md')
      expect(res.success).toBe(true)
      expect(res.status).toBe('partially_applied')

      // strategy was bumped and archived
      const liveStrat = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
      expect(liveStrat).toContain('knowledge_version: "V_0-1-1"')

      // execution was untouched (retains V_0-1-0)
      const liveExec = await readFile(join(knowledgeDir, 'execution_NN.md'), 'utf-8')
      expect(liveExec).toContain('knowledge_version: "V_0-1-0"')

      // No snapshot directory is created for either model.
      expect(existsSync(join(knowledgeDir, 'archive'))).toBe(false)
    })

    it('idempotent replay of partially_applied changeset is safe no-op', async () => {
      const csFile = join(changesDir, 'replay_partial_changes_NN.md')
      const csDoc = makeChangeset({
        status: 'partially_applied',
        models: {
          strategy: {
            base_version: 'V_0-1-0',
            result_version: 'V_0-1-0',
          },
        },
        changes: [
          {
            id: 'c-1',
            op: 'update_field',
            target: 'strategy@Vision&statement',
            from: 'Accelerate green energy',
            to: 'Accelerate clean energy',
          },
        ],
      })
      await writeFile(csFile, serializeChangeset(csDoc), 'utf-8')

      const res = await applyChange(csRoot, 'changes/replay_partial_changes_NN.md')
      expect(res.success).toBe(true)
      expect(res.status).toBe('partially_applied')
      expect(res.appliedCount).toBe(0)
    })

    it('batch slug collision auto-suffixes and permits intra-batch field update', async () => {
      const csFile = join(changesDir, 'slug_collision_changes_NN.md')
      const csDoc = makeChangeset({
        changes: [
          {
            id: 'add-1',
            op: 'add_element',
            target: 'strategy@Work',
            name: 'Vision 2',
            slug: 'vision', // Collides with existing Vision (slug: vision)
          },
          {
            id: 'upd-1',
            op: 'update_field',
            target: 'strategy@vision&statement',
            to: 'Suffixed vision statement',
          },
        ],
      })
      await writeFile(csFile, serializeChangeset(csDoc), 'utf-8')

      const res = await applyChange(csRoot, 'changes/slug_collision_changes_NN.md')
      expect(res.success).toBe(true)
      expect(res.appliedCount).toBe(2)

      const live = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
      expect(live).toContain('slug:: vision-1')
      expect(live).toContain('Suffixed vision statement')

      // The proposal is immutable on write-back: the persisted changeset keeps the
      // original target and its original seal (the slug resolution is applied to the
      // model, never by rewriting the proposal).
      const persisted = await readFile(csFile, 'utf-8')
      const reparse = parseChangeset(persisted)
      expect(reparse.changes.find((c) => c.id === 'upd-1')?.target).toBe(
        'strategy@vision&statement',
      )
      expect(reparse.frontmatter.proposal_sha).toBe(csDoc.frontmatter.proposal_sha)
    })

    it('remove_element cascades matrix cells and records count in resolution', async () => {
      // Add Matrix Definition to template
      const templateWithMatrix = BLUEPRINT_CONTENT + `
# NN Matrix Definition
## NN Matrix Definition: Access
concept:: Work
type:: binary
`
      await writeFile(join(specsDir, 'strategy_V_0-2-0_NN.md'), templateWithMatrix, 'utf-8')

      // Add a matrix with a cell referencing Vision to strategy_NN.md
      const modelWithMatrix = LIVE_STRATEGY_MODEL + `
# NN matrices: Access
| Work \\ Work | read |
| :--- | :---: |
| Vision | allow |
`
      await writeFile(join(knowledgeDir, 'strategy_NN.md'), modelWithMatrix, 'utf-8')

      const csFile = join(changesDir, 'delete_cascade_changes_NN.md')
      const csDoc = makeChangeset({
        changes: [
          {
            id: 'del-1',
            op: 'remove_element',
            target: 'strategy@Vision',
          },
        ],
      })
      await writeFile(csFile, serializeChangeset(csDoc), 'utf-8')

      const res = await applyChange(csRoot, 'changes/delete_cascade_changes_NN.md')
      expect(res.success).toBe(true)
      expect(res.appliedCount).toBe(1)

      const live = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
      expect(live).not.toContain('## NN Work: Vision')
      expect(live).not.toContain('| Vision | allow |')

      const annotated = parseChangeset(await readFile(csFile, 'utf-8'))
      expect(annotated.changes[0].resolution).toContain('cascaded 1 matrix cell')
    })

    it('update_matrix_cell resolves a matrix by its display name (with spaces)', async () => {
      // The console emits the matrix display name, not a slug.
      const modelWithMatrix =
        LIVE_STRATEGY_MODEL +
        `
# NN matrices: Concept 1-Concept 2 Matrix
| Work \\ Work | Col B |
| :--- | :---: |
| Vision | archived |
`
      await writeFile(join(knowledgeDir, 'strategy_NN.md'), modelWithMatrix, 'utf-8')

      const csFile = join(changesDir, 'matrix_name_changes_NN.md')
      const csDoc = makeChangeset({
        changes: [
          {
            id: 'cell-1',
            op: 'update_matrix_cell',
            target: 'strategy@Concept 1-Concept 2 Matrix&Vision&Col B',
            from: 'archived',
            to: 'relevant',
          },
        ],
      })
      await writeFile(csFile, serializeChangeset(csDoc), 'utf-8')

      const res = await applyChange(csRoot, 'changes/matrix_name_changes_NN.md')
      expect(res.success).toBe(true)
      expect(res.appliedCount).toBe(1)

      const live = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
      expect(live).toContain('| Vision | relevant |')
    })

    it('update_matrix_cell resolves row/col slugs correctly (Task 1.9)', async () => {
      const modelWithMatrix =
        LIVE_STRATEGY_MODEL +
        `
# NN matrices: Concept 1-Concept 2 Matrix
| Work \\ Work | Col B |
| :--- | :---: |
| Vision | archived |
`
      await writeFile(join(knowledgeDir, 'strategy_NN.md'), modelWithMatrix, 'utf-8')

      const csFile = join(changesDir, 'matrix_slug_changes_NN.md')
      const csDoc = makeChangeset({
        changes: [
          {
            id: 'cell-1',
            op: 'update_matrix_cell',
            target: 'strategy@concept-1-concept-2-matrix&vision&col-b',
            from: 'archived',
            to: 'active',
          },
        ],
      })
      await writeFile(csFile, serializeChangeset(csDoc), 'utf-8')

      const res = await applyChange(csRoot, 'changes/matrix_slug_changes_NN.md')
      expect(res.success).toBe(true)
      expect(res.appliedCount).toBe(1)

      const live = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
      expect(live).toContain('| Vision | active |')
    })

    it('remove_element blocked by active reference records conflict', async () => {
      // Create marketing model referencing Vision
      const MARKETING_MODEL = `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: "strategy_V_0-2-0"
  url: "specs/strategy_V_0-2-0_NN.md"
knowledge_version: "V_0-1-0"
title: "Marketing"
---

# NN index
* [[Work]]

# NN Work
## NN Work: Launch
statement:: Depends on [[strategy@vision]]
`
      await writeFile(join(knowledgeDir, 'marketing_NN.md'), MARKETING_MODEL, 'utf-8')

      const csFile = join(changesDir, 'delete_blocked_changes_NN.md')
      const csDoc = makeChangeset({
        changes: [
          {
            id: 'del-blocked',
            op: 'remove_element',
            target: 'strategy@Vision',
          },
        ],
      })
      await writeFile(csFile, serializeChangeset(csDoc), 'utf-8')

      const res = await applyChange(csRoot, 'changes/delete_blocked_changes_NN.md')
      expect(res.success).toBe(false)
      expect(res.status).toBe('conflict')

      // Vision should NOT be deleted
      const live = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
      expect(live).toContain('## NN Work: Vision')

      const annotated = parseChangeset(await readFile(csFile, 'utf-8'))
      expect(annotated.changes[0].status).toBe('conflict')
      expect(annotated.changes[0].resolution).toContain('REFERENCED_BY')
    })
  })
})
