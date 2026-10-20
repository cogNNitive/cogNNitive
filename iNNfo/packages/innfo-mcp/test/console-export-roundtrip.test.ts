import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { applyChange } from '../src/tools/apply-change.js'
import { buildConsolePayload, parseChangeset, readChangeAuthor, extractHeadings } from '@cognnitive/innfo-core'

/**
 * Console -> apply contract: a changeset exported by the console runtime must
 * resolve its targets in `apply_change` (file-stem model address, element slug,
 * `new` drafts as `add_element`).
 */

const req = createRequire(import.meta.url)
const consoleDir = join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts', 'console')

const root = join(import.meta.dirname!, '..', 'temp-test-console-roundtrip')
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

## NN Field Definition: target_year
concept:: Work
type:: string
`

const MODEL_FILE = `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: "strategy_V_0-2-0"
  url: "specs/strategy_V_0-2-0_NN.md"
knowledge_version: "V_0-1-0"
title: "Strategy Review Board"
---

# NN index
* [[Work]]

# NN Work
## NN Work: Vision
slug:: vision
statement:: Accelerate green energy
target_year:: 2030

## NN Work: Legacy Plan
slug:: legacy-plan
statement:: Keep the old plan
target_year:: 2025
`

type Draft = Record<string, unknown>

describe('console export round trip', () => {
  beforeEach(async () => {
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
    await writeFile(join(knowledgeDir, 'strategy_NN.md'), MODEL_FILE, 'utf-8')
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  function exportChangeset(drafts: Draft[], modelId: string): string {
    const runtime = req(join(consoleDir, 'innfo-runtime.js')) as {
      composeChangesetExport: (state: unknown, identifier: string) => { ok: boolean; text: string }
    }
    const composed = runtime.composeChangesetExport(
      // modelTitle is a display title with spaces: it must NOT leak into targets.
      {
        modelTitle: 'Strategy Review Board',
        modelId,
        // The real payload meta: it carries the changes bluepriNNt version the export stamps.
        meta: buildConsolePayload({ content: MODEL_FILE, path: 'kNNowledge/strategy_NN.md' }).model.meta,
        store: { drafts: () => drafts },
      },
      'tester',
    )
    expect(composed.ok).toBe(true)
    return composed.text
  }

  function visionCorrection(vision: { id: string; slug?: string; concept: string; name: string }, baseHash: string): Draft {
    return {
      id: 'fb-001',
      kind: 'correction',
      element_id: vision.id,
      element_slug: vision.slug,
      knowledge_id: 'kNNowledge/strategy',
      concept: vision.concept,
      element: vision.name,
      base_hash: baseHash,
      field: 'statement',
      original: 'Accelerate green energy',
      proposed: 'Accelerate clean energy',
    }
  }

  it('applies correction, delete and new drafts exported from a payload', async () => {
    const payload = buildConsolePayload({
      content: MODEL_FILE,
      path: 'kNNowledge/strategy_NN.md',
    })
    const byName = (name: string) => payload.model.elements.find((e) => e.name === name)!
    const vision = byName('Vision')
    const legacy = byName('Legacy Plan')
    const modelId = payload.model.meta.modelId
    expect(modelId).toBe('kNNowledge/strategy')

    const drafts: Draft[] = [
      {
        id: 'fb-001',
        kind: 'correction',
        element_id: vision.id,
        element_slug: vision.slug,
        knowledge_id: modelId,
        concept: vision.concept,
        element: vision.name,
        base_hash: vision.hash,
        field: 'statement',
        original: 'Accelerate green energy',
        proposed: 'Accelerate clean energy',
      },
      {
        id: 'fb-002',
        kind: 'delete',
        element_id: legacy.id,
        element_slug: legacy.slug,
        knowledge_id: modelId,
        concept: legacy.concept,
        element: legacy.name,
        base_hash: legacy.hash,
      },
      {
        id: 'fb-003',
        kind: 'new',
        element_id: 'work-mission',
        knowledge_id: modelId,
        concept: 'Work',
        element: 'Mission',
        base_hash: vision.hash,
        proposed: { statement: 'Serve everyone', target_year: '2031' },
      },
    ]

    const text = exportChangeset(drafts, modelId)
    const doc = parseChangeset(text)
    expect(doc.changes.map((c) => c.op)).toEqual(['update_field', 'remove_element', 'add_element'])
    expect(doc.changes[0].target).toBe(`${modelId}@${vision.slug}&statement`)

    await writeFile(join(changesDir, 'tester_changes_NN.md'), text, 'utf-8')
    const result = await applyChange(root, 'changes/tester_changes_NN.md')
    expect(result.errors ?? []).toEqual([])
    expect(result.success).toBe(true)
    expect(result.appliedCount).toBe(3)

    const live = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    expect(live).toContain('Accelerate clean energy')
    expect(live).not.toContain('Legacy Plan')
    expect(live).toContain('Mission')
    expect(live).toContain('Serve everyone')
  })

  it('carries base_hash and the engine accepts it when the element is unchanged', async () => {
    const payload = buildConsolePayload({ content: MODEL_FILE, path: 'kNNowledge/strategy_NN.md' })
    const vision = payload.model.elements.find((e) => e.name === 'Vision')!
    const text = exportChangeset([visionCorrection(vision, vision.hash)], 'kNNowledge/strategy')
    const change = parseChangeset(text).changes[0]
    expect(change.base_hash).toBe(vision.hash)

    await writeFile(join(changesDir, 'ok_changes_NN.md'), text, 'utf-8')
    const result = await applyChange(root, 'changes/ok_changes_NN.md')
    expect(result.success).toBe(true)
    expect(result.appliedCount).toBe(1)
  })

  it('rejects a change whose base_hash no longer matches and leaves the model untouched', async () => {
    const payload = buildConsolePayload({ content: MODEL_FILE, path: 'kNNowledge/strategy_NN.md' })
    const vision = payload.model.elements.find((e) => e.name === 'Vision')!
    const text = exportChangeset([visionCorrection(vision, 'deadbeefdeadbeef')], 'kNNowledge/strategy')
    await writeFile(join(changesDir, 'stale_changes_NN.md'), text, 'utf-8')

    const result = await applyChange(root, 'changes/stale_changes_NN.md')
    expect(result.success).toBe(false)
    expect(result.status).toBe('conflict')
    expect(result.appliedCount).toBe(0)
    expect(JSON.stringify(result.errors)).toMatch(/base_hash/)
    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toBe(MODEL_FILE)
  })

  it('an exported author:: resolves as a human author', async () => {
    const payload = buildConsolePayload({ content: MODEL_FILE, path: 'kNNowledge/strategy_NN.md' })
    const vision = payload.model.elements.find((e) => e.name === 'Vision')!
    const text = exportChangeset([visionCorrection(vision, vision.hash)], 'kNNowledge/strategy')
    expect(text).toContain('author:: tester')

    await writeFile(join(changesDir, 'author_changes_NN.md'), text, 'utf-8')
    const applied = await applyChange(root, 'changes/author_changes_NN.md')
    expect(applied.success).toBe(true)

    const persisted = await readFile(join(changesDir, 'author_changes_NN.md'), 'utf-8')
    const heading = extractHeadings(persisted).find((h) => h.text.indexOf('NN Change:') === 0)!
    const { origin, author } = readChangeAuthor(persisted, heading)
    expect(origin).toBe('human')
    expect(author).toBe('tester')
  })

  it('exports a new draft without concept or name as a comment', () => {
    const text = exportChangeset(
      [{ id: 'fb-001', kind: 'new', element_id: 'x', base_hash: '0123456789abcdef', concept: '', element: '' }],
      'kNNowledge/strategy',
    )
    expect(parseChangeset(text).changes.map((c) => c.op)).toEqual(['comment'])
  })
})
