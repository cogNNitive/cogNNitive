import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises'
import {
  computeProposalSha,
  parseChangeset,
  serializeChangeset,
  verifyProposalSha,
} from '@cognnitive/nn-core'
import type { ChangesetDocument, ChangeItem } from '@cognnitive/nn-core'
import { proposeChangeset } from './propose-changeset'
import { applyChange } from './apply-change'
import type { ConsoleWriter } from './console-regeneration'
import { resolvedFacts } from '../../test/helpers/resolved-facts'

/**
 * `changeset-document-model`: the prose body op, the `USE_UPDATE_ELEMENT_TEXT`
 * guard, the field-less `add_element` and the `notes` rule, end to end through
 * propose + apply.
 */

const root = join(import.meta.dirname!, '..', '..', 'temp-test-element-text')
const knowledgeDir = join(root, 'kNNowledge')
const changesDir = join(root, 'changes')
const specsDir = join(root, 'specs')
const consolePath = join(root, 'domaiNN_console.html')

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
`

const MODEL = `---
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
slug:: vision
statement:: Accelerate green energy
`

const writer: ConsoleWriter = async () => ({ path: consolePath, status: 'written', opened: false })
const propose = (operations: unknown[]) =>
  proposeChangeset(root, { operations, open: false }, { writer })
const files = () => readdir(changesDir).catch(() => [] as string[])

function makeChangeset(changes: ChangeItem[]): ChangesetDocument {
  const withEvidence = changes.map((c) => (c.evidence === undefined ? { ...c, evidence: 'decision' } : c))
  return {
    frontmatter: {
      spec_version: 'V_0-4-0',
      level: 3,
      parent_spec: { name: 'changes', url: 'https://example.test/changes/spec_NN.md' },
      blueprint_version: '0.1.0',
      status: 'proposed',
      proposal_sha: computeProposalSha(withEvidence),
      title: 'Element text test',
      author: 'agent-writer',
      workspace_id: 'ws-1',
    },
    changes: withEvidence,
  }
}

beforeEach(async () => {
  process.env.INNFO_CACHE_DIR = join(root, '.cache')
  vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
  await rm(root, { recursive: true, force: true })
  for (const dir of [knowledgeDir, specsDir, changesDir]) {
    await mkdir(dir, { recursive: true })
  }
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
  await writeFile(join(knowledgeDir, 'strategy_NN.md'), MODEL, 'utf-8')
})

afterEach(async () => {
  delete process.env.INNFO_CACHE_DIR
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})

describe('add_element carries no inline fields', () => {
  it('propose_changeset rejects a fields key and writes nothing', async () => {
    const result = await propose([
      {
        op: 'add_element',
        target: 'strategy@Work',
        concept: 'Work',
        name: 'Mission',
        fields: { statement: 'Inline' },
        evidence: 'decision',
      },
    ])
    expect(result.success).toBe(false)
    const err = result.errors?.find((e) => /fields/.test(e.message))
    expect(err?.code).toBe('INVALID_OPERATION')
    expect(err?.message).toContain('update_field')
    expect(await files()).toEqual([])
  })

  it('the apply engine rejects a changeset that still carries fields (persisted rejected)', async () => {
    const csFile = join(changesDir, 'inline_fields_changes_NN.md')
    const doc = makeChangeset([
      {
        id: 'c-01',
        op: 'add_element',
        target: 'strategy@Work',
        concept: 'Work',
        name: 'Mission',
        fields: { statement: 'Inline' },
      },
    ])
    await writeFile(csFile, serializeChangeset(doc), 'utf-8')

    const res = await applyChange(root, 'changes/inline_fields_changes_NN.md')
    expect(res.success).toBe(false)
    expect(res.status).toBe('rejected')
    const written = parseChangeset(await readFile(csFile, 'utf-8'))
    expect(written.frontmatter.status).toBe('rejected')
    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toBe(MODEL)
  })

  it('notes never become the prose body', async () => {
    const proposed = await propose([
      {
        op: 'add_element',
        target: 'strategy@Work',
        concept: 'Work',
        name: 'Mission',
        notes: 'rationale only',
        evidence: 'decision',
      },
    ])
    expect(proposed.success).toBe(true)
    const applied = await applyChange(root, proposed.changeset!)
    expect(applied.success).toBe(true)

    const model = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    expect(model).toContain('## NN Work: Mission')
    expect(model).not.toContain('rationale only')
  })

  it('a field-less add_element plus update_field creates the element and its value', async () => {
    const proposed = await propose([
      {
        op: 'add_element',
        target: 'strategy@Mission',
        concept: 'Work',
        name: 'Mission',
        evidence: 'decision',
      },
      {
        op: 'update_field',
        target: 'strategy@mission&statement',
        to: 'Reach orbit',
        evidence: 'decision',
      },
    ])
    expect(proposed.success).toBe(true)
    const applied = await applyChange(root, proposed.changeset!)
    expect(applied.success).toBe(true)

    const model = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    expect(model).toContain('## NN Work: Mission')
    expect(model).toContain('statement:: Reach orbit')
  })
})

describe('update_element_text', () => {
  it('propose_changeset accepts it and apply writes the prose body', async () => {
    const proposed = await propose([
      {
        op: 'update_element_text',
        target: 'strategy@vision',
        from: '',
        to: 'Our north star',
        evidence: 'decision',
      },
    ])
    expect(proposed.success).toBe(true)
    const applied = await applyChange(root, proposed.changeset!)
    expect(applied.success).toBe(true)

    const model = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    expect(model).toContain('Our north star')
    expect(model).not.toContain('description::')

    const doc = parseChangeset(await readFile(join(root, proposed.changeset!), 'utf-8'))
    expect(resolvedFacts(doc).status).toBe('applied')
    expect(resolvedFacts(doc).resolvedTarget).toBe('strategy@vision&#body')
    expect(verifyProposalSha(doc)).toBe(true)
  })

  it('a from mismatch is a PRECONDITION_FAILED conflict and writes nothing', async () => {
    const before = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    const proposed = await propose([
      {
        op: 'update_element_text',
        target: 'strategy@vision',
        from: 'Other prose',
        to: 'Overwritten',
        evidence: 'decision',
      },
    ])
    expect(proposed.success).toBe(true)
    const applied = await applyChange(root, proposed.changeset!)
    expect(applied.success).toBe(false)

    const doc = parseChangeset(await readFile(join(root, proposed.changeset!), 'utf-8'))
    expect(resolvedFacts(doc).status).toBe('conflict')
    expect(doc.changes[0].resolution).toContain('PRECONDITION_FAILED')
    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toBe(before)
  })
})

describe('update_field on description', () => {
  it('is rejected at proposal with USE_UPDATE_ELEMENT_TEXT and writes nothing', async () => {
    const result = await propose([
      {
        op: 'update_field',
        target: 'strategy@vision&description',
        to: 'Prose as a field',
        evidence: 'decision',
      },
    ])
    expect(result.success).toBe(false)
    expect(result.errors?.some((e) => e.code === 'USE_UPDATE_ELEMENT_TEXT')).toBe(true)
    expect(await files()).toEqual([])
  })

  it('is rejected defensively at apply with USE_UPDATE_ELEMENT_TEXT', async () => {
    const csFile = join(changesDir, 'description_field_changes_NN.md')
    const doc = makeChangeset([
      {
        id: 'c-01',
        op: 'update_field',
        target: 'strategy@vision&description',
        to: 'Prose as a field',
      },
    ])
    await writeFile(csFile, serializeChangeset(doc), 'utf-8')

    const res = await applyChange(root, 'changes/description_field_changes_NN.md')
    expect(res.success).toBe(false)
    expect(res.errors?.some((e) => e.code === 'USE_UPDATE_ELEMENT_TEXT')).toBe(true)
    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toBe(MODEL)
  })
})
