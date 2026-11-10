import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises'
import {
  computeProposalSha,
  loadChangeLog,
  parseChangeset,
  parseKnowledge,
  serializeChangeset,
  verifyProposalSha,
  changesetLikeOf,
  resolveChangeFacts,
} from '@cognnitive/nn-core'
import type { ChangeItem } from '@cognnitive/nn-core'
import { proposeChangeset } from './propose-changeset'
import { applyChange } from './apply-change'
import type { ConsoleWriter } from './console-regeneration'

/**
 * changeset-document-model: `set_fields` sets several fields of one element from one
 * evidence, all or nothing, through propose_changeset and apply_change.
 */

let root: string

const BLUEPRINT = `---
spec_version: "V_0-4-0"
level: 2
blueprint_version: "V_0-2-0"
blueprint_name: "alerts"
title: "Alerts"
parent_spec:
  name: "iNNfo_V_0-3-0"
  url: "specs/iNNfo_V_0-3-0_NN.md"
---

# NN Concept Definition
## NN Concept Definition: Alert
type:: list

# NN Field Definition
## NN Field Definition: topics
concept:: Alert
type:: string

## NN Field Definition: language
concept:: Alert
type:: string

## NN Field Definition: owner
concept:: Alert
type:: string
`

const MODEL = `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: "alerts_V_0-2-0"
  url: "specs/alerts_V_0-2-0_NN.md"
knowledge_version: "V_0-1-0"
title: "M"
---

# NN index
* [[Alert]]

# NN Alert
## NN Alert: Alerta
slug:: alerta
language:: en
`

const writer: ConsoleWriter = async () => ({ path: join(root, 'console.html'), status: 'written', opened: false })
const propose = (operations: unknown[]) => proposeChangeset(root, { operations, open: false }, { writer })

async function changesetFiles(): Promise<string[]> {
  return (await readdir(join(root, 'changes'))).filter((n) => n.endsWith('_NN.md'))
}

async function readModel() {
  return parseKnowledge(await readFile(join(root, 'kNNowledge', 'm_NN.md'), 'utf-8'))
}

function fieldsOf(model: ReturnType<typeof parseKnowledge>, slug: string): Record<string, unknown> {
  for (const [, elements] of model.elements) {
    for (const el of elements) if (el.slug === slug) return el.fields
  }
  return {}
}

/** Writes a hand-authored sealed changeset (bypassing propose validation). */
async function writeHandCs(changes: ChangeItem[]): Promise<string> {
  const doc = {
    frontmatter: {
      spec_version: 'V_0-4-0',
      level: 3 as const,
      parent_spec: { name: 'changes' as const, url: 'https://example.test/changes/spec_NN.md' },
      blueprint_version: 'V_0-9-0',
      status: 'proposed' as const,
      proposal_sha: computeProposalSha(changes),
      author: 'juan',
    },
    changes,
  }
  const name = 'hand_juan_20261023T100000Z_changes_NN.md'
  await writeFile(join(root, 'changes', name), serializeChangeset(doc), 'utf-8')
  return `changes/${name}`
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'nn-set-fields-'))
  process.env.INNFO_CACHE_DIR = join(root, '.cache')
  vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
  for (const dir of ['kNNowledge', 'changes', 'specs', 'sources/import']) await mkdir(join(root, dir), { recursive: true })
  await writeFile(
    join(root, 'specs', 'iNNfo_V_0-3-0_NN.md'),
    '---\nspec_version: "V_0-3-0"\nlevel: 1\ntitle: "iNNfo"\nparent_spec:\n  name: "defiNNition_V_0-1-0"\n  url: "specs/defiNNition_V_0-1-0_NN.md"\n---\n',
    'utf-8',
  )
  await writeFile(join(root, 'specs', 'defiNNition_V_0-1-0_NN.md'), '---\nspec_version: "V_0-1-0"\nlevel: 0\ntitle: "defiNNition"\n---\n', 'utf-8')
  await writeFile(join(root, 'specs', 'alerts_V_0-2-0_NN.md'), BLUEPRINT, 'utf-8')
  await writeFile(join(root, 'kNNowledge', 'm_NN.md'), MODEL, 'utf-8')
  await writeFile(join(root, 'sources', 'import', 'r.md'), '# Rows\n\n## Row 12\nai, es\n', 'utf-8')
})

afterEach(async () => {
  delete process.env.INNFO_CACHE_DIR
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})

describe('set_fields through propose_changeset and apply_change', () => {
  it('one change sets every field of an imported row, each with its own origin', async () => {
    const proposed = await propose([
      {
        op: 'set_fields',
        target: 'm@alerta',
        to: { topics: 'ai, news, travel', language: 'es' },
        evidence: 'sources/import/r.md@## Row 12',
      },
    ])
    expect(proposed.success, JSON.stringify(proposed.errors)).toBe(true)
    const applied = await applyChange(root, proposed.changeset!)
    expect(applied.success, JSON.stringify(applied.errors)).toBe(true)
    expect(applied.status).toBe('applied')
    expect(applied.appliedCount).toBe(1)

    expect(fieldsOf(await readModel(), 'alerta')).toMatchObject({ topics: 'ai, news, travel', language: 'es' })

    // The recorded change stays one sealed set_fields block.
    const doc = parseChangeset(await readFile(join(root, proposed.changeset!), 'utf-8'))
    expect(doc.changes).toHaveLength(1)
    expect(doc.changes[0]!.op).toBe('set_fields')
    expect(doc.changes[0]!.to).toBe('{"topics":"ai, news, travel","language":"es"}')
    expect(verifyProposalSha(doc)).toBe(true)

    const log = loadChangeLog(root)
    for (const unit of ['m@alerta&topics', 'm@alerta&language']) {
      expect(log.origin(unit)?.id).toBe('c-01')
      expect(log.origin(unit)?.evidence).toBe('sources/import/r.md@## Row 12')
    }
  })

  it('a failed precondition conflicts the whole change and writes no field', async () => {
    const before = await readFile(join(root, 'kNNowledge', 'm_NN.md'), 'utf-8')
    const proposed = await propose([
      {
        op: 'set_fields',
        target: 'm@alerta',
        from: { language: 'es' },
        to: { language: 'fr', topics: 'ai' },
        evidence: 'decision',
      },
    ])
    expect(proposed.success, JSON.stringify(proposed.errors)).toBe(true)
    const applied = await applyChange(root, proposed.changeset!)
    expect(applied.status).toBe('conflict')
    expect(await readFile(join(root, 'kNNowledge', 'm_NN.md'), 'utf-8')).toBe(before)
    const doc = parseChangeset(await readFile(join(root, proposed.changeset!), 'utf-8'))
    expect(doc.changes).toHaveLength(1)
    expect(resolveChangeFacts(doc.changes[0]!, changesetLikeOf('changes/x_NN.md', doc)).status).toBe('conflict')
  })

  it('a failed precondition on one field leaves the sibling field unwritten in a partial apply', async () => {
    const proposed = await propose([
      { op: 'update_field', target: 'm@alerta&owner', to: 'Ana', evidence: 'decision' },
      {
        op: 'set_fields',
        target: 'm@alerta',
        from: { language: 'es' },
        to: { language: 'fr', topics: 'ai' },
        evidence: 'decision',
      },
    ])
    const applied = await applyChange(root, proposed.changeset!)
    expect(applied.status).toBe('partially_applied')
    expect(applied.appliedCount).toBe(1)
    expect(applied.conflictedCount).toBe(1)
    const fields = fieldsOf(await readModel(), 'alerta')
    expect(fields.owner).toBe('Ana')
    expect(fields.language).toBe('en')
    expect(fields.topics).toBeUndefined()
  })

  it('add_element then set_fields creates the element with its fields', async () => {
    const proposed = await propose([
      { op: 'add_element', target: 'm@grow', concept: 'Alert', name: 'Grow', evidence: 'decision' },
      { op: 'set_fields', target: 'm@grow', to: '{"owner":"Ana","topics":"2027"}', evidence: 'decision' },
    ])
    expect(proposed.success, JSON.stringify(proposed.errors)).toBe(true)
    const applied = await applyChange(root, proposed.changeset!)
    expect(applied.success, JSON.stringify(applied.errors)).toBe(true)
    expect(fieldsOf(await readModel(), 'grow')).toMatchObject({ owner: 'Ana', topics: '2027' })
    const log = loadChangeLog(root)
    expect(log.origin('m@grow&owner')?.id).toBe('c-02')
    expect(log.origin('m@grow&topics')?.id).toBe('c-02')
  })

  it('resolves the target of a set_fields to the frozen element slug', async () => {
    const proposed = await propose([
      { op: 'set_fields', target: 'm@Alerta', to: { topics: 'ai' }, evidence: 'decision' },
    ])
    const applied = await applyChange(root, proposed.changeset!)
    expect(applied.success, JSON.stringify(applied.errors)).toBe(true)
    const log = loadChangeLog(root)
    expect(log.origin('m@alerta&topics')?.id).toBe('c-01')
  })

  it('keeps update_field working beside set_fields', async () => {
    const proposed = await propose([
      { op: 'update_field', target: 'm@alerta&language', from: 'en', to: 'es', evidence: 'decision' },
    ])
    const applied = await applyChange(root, proposed.changeset!)
    expect(applied.status).toBe('applied')
    expect(fieldsOf(await readModel(), 'alerta').language).toBe('es')
  })
})

describe('set_fields rejections', () => {
  it.each([
    ['an empty to', { to: {} }, 'INVALID_OPERATION'],
    ['a to that is not an object', { to: ['a'] }, 'INVALID_OPERATION'],
    ['a repeated key', { to: '{"topics":"a","topics":"b"}' }, 'INVALID_OPERATION'],
    ['a from key absent from to', { to: { topics: 'a' }, from: { language: 'en' } }, 'INVALID_OPERATION'],
    ['the description key', { to: { description: 'prose' } }, 'USE_UPDATE_ELEMENT_TEXT'],
  ])('propose_changeset rejects %s and writes no file', async (_label, payload, code) => {
    const result = await propose([{ op: 'set_fields', target: 'm@alerta', evidence: 'decision', ...payload }])
    expect(result.success).toBe(false)
    expect(result.errors?.map((e) => e.code)).toContain(code)
    expect(await changesetFiles()).toEqual([])
  })

  it.each([
    ['an empty to', '{}', 'INVALID_OPERATION'],
    ['a repeated key', '{"topics":"a","topics":"b"}', 'INVALID_OPERATION'],
    ['the description key', '{"description":"prose"}', 'USE_UPDATE_ELEMENT_TEXT'],
  ])('apply_change records a hand-written set_fields with %s as rejected', async (_label, to, code) => {
    const before = await readFile(join(root, 'kNNowledge', 'm_NN.md'), 'utf-8')
    const cs = await writeHandCs([{ id: 'c-01', op: 'set_fields', target: 'm@alerta', to, evidence: 'decision' }])
    const applied = await applyChange(root, cs)
    expect(applied.success).toBe(false)
    expect(applied.errors?.map((e) => e.code)).toContain(code)
    expect(await readFile(join(root, 'kNNowledge', 'm_NN.md'), 'utf-8')).toBe(before)
    const doc = parseChangeset(await readFile(join(root, cs), 'utf-8'))
    expect(doc.frontmatter.status).toBe('rejected')
    expect(resolveChangeFacts(doc.changes[0]!, changesetLikeOf('changes/x_NN.md', doc)).status).toBe('rejected')
  })
})

describe('set_fields as a bare operation', () => {
  it('is refused outside a changeset and writes nothing', async () => {
    const before = await readFile(join(root, 'kNNowledge', 'm_NN.md'), 'utf-8')
    const res = await applyChange(root, 'm', 'set_fields', { elementName: 'Alerta', value: 'x' })
    expect(res.success).toBe(false)
    expect(res.errors?.[0]?.code).toBe('SET_FIELDS_REQUIRES_CHANGESET')
    expect(await readFile(join(root, 'kNNowledge', 'm_NN.md'), 'utf-8')).toBe(before)
    expect(await changesetFiles()).toEqual([])
  })
})

describe('inline fields point to set_fields and update_field', () => {
  it('propose_changeset rejects inline fields and writes no file', async () => {
    const result = await propose([
      { op: 'add_element', target: 'm@grow', concept: 'Alert', name: 'Grow', fields: { owner: 'Ana' }, evidence: 'decision' },
    ])
    expect(result.success).toBe(false)
    const error = result.errors!.find((e) => e.code === 'INVALID_OPERATION')!
    expect(error.message).toContain('set_fields')
    expect(error.message).toContain('update_field')
    expect(await changesetFiles()).toEqual([])
  })

  it('apply_change records a hand-written add_element with inline fields as rejected', async () => {
    const before = await readFile(join(root, 'kNNowledge', 'm_NN.md'), 'utf-8')
    const cs = await writeHandCs([
      { id: 'c-01', op: 'add_element', target: 'm@grow', concept: 'Alert', name: 'Grow', fields: { owner: 'Ana' }, evidence: 'decision' },
    ])
    const applied = await applyChange(root, cs)
    expect(applied.success).toBe(false)
    const error = applied.errors!.find((e) => e.code === 'INVALID_OPERATION')!
    expect(error.message).toContain('set_fields')
    expect(error.message).toContain('update_field')
    expect(await readFile(join(root, 'kNNowledge', 'm_NN.md'), 'utf-8')).toBe(before)
    expect(parseChangeset(await readFile(join(root, cs), 'utf-8')).frontmatter.status).toBe('rejected')
  })

  it('the bare add_element refusal points to set_fields and update_field', async () => {
    const res = await applyChange(root, 'm', 'add_element', { conceptName: 'Alert', elementName: 'Grow', fields: { owner: 'Ana' } })
    expect(res.success).toBe(false)
    expect(res.errors?.[0]?.message).toContain('set_fields')
  })
})
