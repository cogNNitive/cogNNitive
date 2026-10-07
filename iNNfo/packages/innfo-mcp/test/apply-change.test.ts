import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { rm, mkdir, writeFile, readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { applyChange } from '../src/tools/apply-change.js'
import {
  computeProposalSha,
  serializeChangeset,
  parseChangeset,
} from '@cognnitive/innfo-core'
import type { ChangesetDocument, ChangeItem } from '@cognnitive/innfo-core'

const rootDir = join(import.meta.dirname!, '..', 'temp-test-apply-change-cascade')

const STRATEGY_MODEL = `---
specification_version: "V_0-1-0"
level: 3
parent_spec:
  name: business
  url: "business"
knowledge_version: "V_0-1-0"
title: "Strategy"
---

# NN index

* [[Vision]]

# NN Vision

## NN Vision: Core Purpose
description:: Our core purpose.
`

const EXECUTION_MODEL = `---
specification_version: "V_0-1-0"
level: 3
parent_spec:
  name: business
  url: "business"
knowledge_version: "V_0-1-0"
title: "Execution"
---

# NN index

* [[Roadmap]]

# NN Roadmap

## NN Roadmap: Phase 1
derived_from_inputs:: [strategy_V_0-1-0_NN.md]
`

const MARKETING_MODEL = `---
specification_version: "V_0-1-0"
level: 3
parent_spec:
  name: business
  url: "business"
knowledge_version: "V_0-1-0"
title: "Marketing"
---

# NN index

* [[Marketing]]

# NN Marketing

## NN Marketing: Launch
sources:: [kNNowledge/strategy_V_0-1-0_NN.md@## Vision]
description:: See details in [[strategy_V_0-1-0_NN]].
`

describe('bump_version cascading references and pre-mutation validation', () => {
  let oldCache: string | undefined
  beforeEach(async () => {
    oldCache = process.env.INNFO_CACHE_DIR
    process.env.INNFO_CACHE_DIR = join(rootDir, '.cache')
    await rm(rootDir, { recursive: true, force: true })
    await mkdir(join(rootDir, 'models'), { recursive: true })
    await writeFile(join(rootDir, 'models', 'strategy_V_0-1-0_NN.md'), STRATEGY_MODEL, 'utf-8')
    await writeFile(join(rootDir, 'models', 'execution_V_0-1-0_NN.md'), EXECUTION_MODEL, 'utf-8')
    await writeFile(join(rootDir, 'models', 'marketing_V_0-1-0_NN.md'), MARKETING_MODEL, 'utf-8')
  })

  afterEach(async () => {
    if (oldCache !== undefined) {
      process.env.INNFO_CACHE_DIR = oldCache
    } else {
      delete process.env.INNFO_CACHE_DIR
    }
    await rm(rootDir, { recursive: true, force: true })
  })

  it('cascades version bump to dependent models derived_from_inputs and sources', async () => {
    const res = await applyChange(rootDir, 'strategy_V_0-1-0_NN', 'bump_version', {
      bump: 'minor',
    })

    if (!res.success) {
      console.log('RES ERRORS:', res.errors)
    }

    expect(res.success).toBe(true)
    expect(existsSync(join(rootDir, 'models', 'strategy_V_0-2-0_NN.md'))).toBe(true)
    expect(existsSync(join(rootDir, 'models', 'strategy_V_0-1-0_NN.md'))).toBe(false)

    // Check execution model updated derived_from_inputs
    const executionContent = await readFile(
      join(rootDir, 'models', 'execution_V_0-1-0_NN.md'),
      'utf-8',
    )
    expect(executionContent).toContain('strategy_V_0-2-0_NN.md')
    expect(executionContent).not.toContain('strategy_V_0-1-0_NN.md')

    // Check marketing model updated sources and wikilinks
    const marketingContent = await readFile(
      join(rootDir, 'models', 'marketing_V_0-1-0_NN.md'),
      'utf-8',
    )
    expect(marketingContent).toContain('kNNowledge/strategy_V_0-2-0_NN.md@## Vision')
    expect(marketingContent).toContain('[[strategy_V_0-2-0_NN]]')
    expect(marketingContent).not.toContain('strategy_V_0-1-0_NN.md')
  })

  it('aborts bump with zero disk changes when a referencing model fails validation', async () => {
    // Create a broken referencing model with invalid structure
    const brokenModel = `---
specification_version: "V_0-1-0"
level: 3
parent_spec:
  name: business
  url: "business"
knowledge_version: "V_0-1-0"
title: "Broken"
---

# NN InvalidConceptThatDoesNotExist

## NN InvalidConceptThatDoesNotExist: Invalid Element
derived_from_inputs:: [strategy_V_0-1-0_NN.md]
`
    await writeFile(join(rootDir, 'models', 'broken_V_0-1-0_NN.md'), brokenModel, 'utf-8')

    const res = await applyChange(rootDir, 'strategy_V_0-1-0_NN', 'bump_version', {
      bump: 'minor',
    })

    expect(res.success).toBe(false)
    expect(res.errors).toBeDefined()
    expect(res.errors!.length).toBeGreaterThan(0)

    // Ensure no files on disk were changed or renamed
    expect(existsSync(join(rootDir, 'models', 'strategy_V_0-1-0_NN.md'))).toBe(true)
    expect(existsSync(join(rootDir, 'models', 'strategy_V_0-2-0_NN.md'))).toBe(false)

    const executionContent = await readFile(
      join(rootDir, 'models', 'execution_V_0-1-0_NN.md'),
      'utf-8',
    )
    expect(executionContent).toContain('strategy_V_0-1-0_NN.md')
  })

  it('cascades patch version bump across models', async () => {
    const res = await applyChange(rootDir, 'strategy_V_0-1-0_NN', 'bump_version', {
      bump: 'patch',
    })

    expect(res.success).toBe(true)
    expect(existsSync(join(rootDir, 'models', 'strategy_V_0-1-1_NN.md'))).toBe(true)

    const marketingContent = await readFile(
      join(rootDir, 'models', 'marketing_V_0-1-0_NN.md'),
      'utf-8',
    )
    expect(marketingContent).toContain('kNNowledge/strategy_V_0-1-1_NN.md@## Vision')
  })
})

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
    status?: 'proposed' | 'applied'
    models?: Record<string, { base_version: string; result_version: string }>
    changes: ChangeItem[]
  }): ChangesetDocument {
    const sha = computeProposalSha(doc.changes)
    return {
      frontmatter: {
        spec_version: 'V_0-4-0',
        parent_spec: 'changes',
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

  it('Phase 2 Persistence & Snapshot Archival: archives prior snapshot, bumps version, annotates changeset', async () => {
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

    // Check archive snapshot exists with correct naming contract
    const archiveDir = join(knowledgeDir, 'archive')
    expect(existsSync(archiveDir)).toBe(true)
    const archivedFiles = await readdir(archiveDir)
    expect(archivedFiles.length).toBe(1)
    const archiveName = archivedFiles[0]
    expect(archiveName).toMatch(/^strategy_V_0-1-0_\d{8}T\d{6}Z_ws_agent_apply_changes_NN\.md$/)

    // Archived file holds original content
    const archivedContent = await readFile(join(archiveDir, archiveName), 'utf-8')
    expect(archivedContent).toContain('knowledge_version: "V_0-1-0"')
    expect(archivedContent).toContain('Accelerate green energy')

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

  it('Field Citation Rewriting (D20): touched fields cite changes/<cs>@## NN Change: <id>, untouched retain old citations', async () => {
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
    // Touched field has rewritten citation
    expect(liveContent).toContain('statement_source:: changes/ws_agent_d20_changes_NN.md@## NN Change: c-01')
    // Untouched field retains previous citation
    expect(liveContent).toContain('target_year_source:: sources/report.pdf_sidecar_NN.md@## Timeline')
  })

  it('Idempotent Replay: re-applying an already applied changeset returns success no-op without re-bumping or duplicating archives', async () => {
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

    const archiveDir = join(knowledgeDir, 'archive')
    const archivesAfterFirst = await readdir(archiveDir)
    expect(archivesAfterFirst.length).toBe(1)

    // Replay apply
    const res2 = await applyChange(csRoot, 'changes/ws_agent_replay_changes_NN.md')
    expect(res2.success).toBe(true)

    // Archive count remains exactly 1 (no duplicate archives created)
    const archivesAfterSecond = await readdir(archiveDir)
    expect(archivesAfterSecond.length).toBe(1)

    // Model version not re-bumped (still V_0-1-1)
    const liveContent = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    expect(liveContent).toContain('knowledge_version: "V_0-1-1"')
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
    const synthesized = csFiles.filter((f) => f.includes('strategy_agent_') && f.endsWith('_changes_NN.md'))
    expect(synthesized.length).toBe(1)

    // Synthesized changeset is sealed and marked applied
    const csContent = await readFile(join(changesDir, synthesized[0]), 'utf-8')
    const parsedCs = parseChangeset(csContent)
    expect(parsedCs.frontmatter.status).toBe('applied')
    expect(parsedCs.frontmatter.proposal_sha).toBeDefined()
    expect(parsedCs.changes.length).toBe(1)
  })
})
