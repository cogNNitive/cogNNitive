/**
 * `read_lineage` pagination: the default call is bounded, every item stays
 * reachable through `section` + `cursor`, and `focus`/`scope` compose with it.
 *
 * Driven through the public dispatcher (`dispatchTool`), the same path the MCP
 * server takes.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { join } from 'node:path'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { buildChangeLog, projectLineage, readLineageSnapshot } from '@cognnitive/nn-core'
import { dispatchTool } from '../src/server.js'

const SECTIONS = ['sources', 'models', 'artifacts', 'changes', 'edges', 'diagnostics'] as const
const CHANGESETS = 300

const MODEL = `---
level: 3
parent_spec:
  name: "TestLab_V_0-1-0"
  url: "specs/TestLab_NN.md"
knowledge_version: "V_0-1-0"
title: "Goal Model"
---

# NN Concept 1
## NN Concept 1: Goal 1
slug:: goal-1
owner:: Bea
`

function changeset(i: number): string {
  const ts = new Date(Date.UTC(2026, 9, 10, 0, 0, 0) + i * 1000).toISOString()
  return `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: changes
  url: "https://example.test/changes/spec_NN.md"
blueprint_version: "V_0-6-0"
status: applied
title: "Goal Changes ${i}"
applied_at: "${ts}"
---

# NN Change

## NN Change: c-${i}-a
op:: update_field
target:: goal@goal-1&f${i}a
to:: Bea ${i}
evidence:: sources/import/a.md

## NN Change: c-${i}-b
op:: update_field
target:: goal@goal-1&${i < 20 ? 'owner' : `f${i}b`}
to:: Bea ${i}b
evidence:: sources/import/b.md
`
}

function stamp(i: number): string {
  return new Date(Date.UTC(2026, 9, 10, 0, 0, 0) + i * 1000)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}

let root: string

async function call(args: Record<string, unknown>) {
  const result = await dispatchTool('read_lineage', { domain: root, ...args })
  const text = (result.content[0] as { text: string }).text
  return { result, text, body: JSON.parse(text) }
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'nn-read-lineage-pages-'))
  for (const dir of ['kNNowledge', 'changes', 'artifacts', join('sources', 'import')]) {
    mkdirSync(join(root, dir), { recursive: true })
  }
  writeFileSync(join(root, 'kNNowledge', 'goal_NN.md'), MODEL, 'utf-8')
  writeFileSync(join(root, 'sources', 'import', 'a.md'), '# A\n', 'utf-8')
  writeFileSync(join(root, 'sources', 'import', 'b.md'), '# B\n', 'utf-8')
  for (let i = 0; i < 40; i++) {
    writeFileSync(join(root, 'artifacts', `Report_${stamp(i)}.md`), `# Report ${i}\n`, 'utf-8')
  }
  for (let i = 0; i < CHANGESETS; i++) {
    writeFileSync(
      join(root, 'changes', `dom_agent_${stamp(i)}_changes_NN.md`),
      changeset(i),
      'utf-8',
    )
  }
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

/** Every item of one section, following next_cursor from the start. */
async function drain(section: string, extra: Record<string, unknown> = {}) {
  const items: unknown[] = []
  let cursor: string | undefined
  for (let guard = 0; guard < 10_000; guard++) {
    const { body } = await call({ section, limit: 250, ...(cursor ? { cursor } : {}), ...extra })
    items.push(...body[section])
    if (typeof body.next_cursor !== 'string') return { items, total: body.total }
    cursor = body.next_cursor
  }
  throw new Error('pagination did not terminate')
}

describe('read_lineage pagination', () => {
  it('bounds the default call: one page per section, every total, and a small response', async () => {
    const { result, text, body } = await call({})
    expect(result.isError).toBeFalsy()
    expect(body.totals.changes).toBe(CHANGESETS)
    expect(body.totals.artifacts).toBe(40)
    expect(body.totals.edges).toBeGreaterThan(CHANGESETS)
    for (const section of SECTIONS) {
      expect(body[section].length).toBeLessThanOrEqual(body.limit)
      expect(body[section].length).toBeLessThanOrEqual(body.totals[section])
    }
    expect(body.changes.length).toBeLessThan(CHANGESETS)
    expect(typeof body.next_cursor.changes).toBe('string')
    expect(typeof body.next_cursor.edges).toBe('string')
    expect(Buffer.byteLength(text, 'utf-8')).toBeLessThan(200 * 1024)
  }, 120_000)

  it('keeps diagnostics discoverable in the default view', async () => {
    const { body } = await call({})
    expect(body.totals.diagnostics).toBe(40)
    expect(body.diagnostics.length).toBeGreaterThan(0)
    expect(body.diagnostics[0].code).toBe('ARTIFACT_WITHOUT_RECORD')
  }, 120_000)

  it('reaches every item exactly once, in the projection order, by following next_cursor', async () => {
    const files = readLineageSnapshot(root)
    const view = projectLineage(files, buildChangeLog(files), { scope: 'live' })
    const full: Record<string, unknown[]> = {
      sources: view.sources,
      models: view.knowledge,
      artifacts: view.artifacts,
      changes: view.changesets,
      edges: view.edges,
      diagnostics: view.diagnostics,
    }
    for (const section of SECTIONS) {
      const { items, total } = await drain(section)
      expect(total).toBe(full[section].length)
      expect(items).toEqual(full[section])
    }
  }, 120_000)

  it('composes focus and scope with pagination', async () => {
    const focused = await call({ focus: 'artifacts/' })
    expect(focused.body.totals.artifacts).toBe(40)
    expect(focused.body.totals.changes).toBe(0)
    expect(focused.body.totals.models).toBe(0)

    const one = await call({ section: 'changes', focus: '_changes_NN.md', limit: 10 })
    expect(one.body.total).toBe(CHANGESETS)
    expect(one.body.changes).toHaveLength(10)

    const live = await drain('edges')
    const allTime = await drain('edges', { scope: 'all-time' })
    expect(allTime.total).toBeGreaterThan(live.total)
    expect(allTime.items).toHaveLength(allTime.total)
    const allTimeHead = await call({ scope: 'all-time' })
    expect(allTimeHead.body.totals.edges).toBe(allTime.total)
  }, 120_000)

  it('refuses an unknown section, an out-of-range limit and a malformed cursor', async () => {
    const cases: Array<[Record<string, unknown>, RegExp]> = [
      [{ section: 'nodes' }, /section/],
      [{ section: 'edges', limit: 0 }, /limit/],
      [{ section: 'edges', limit: 5000 }, /limit/],
      [{ section: 'edges', limit: 2.5 }, /limit/],
      [{ section: 'edges', cursor: 'abc' }, /cursor/],
      [{ section: 'edges', cursor: '999999' }, /cursor/],
      [{ cursor: '10' }, /cursor.*section|section.*cursor/],
    ]
    for (const [args, pattern] of cases) {
      const { result, body } = await call(args)
      expect(result.isError, JSON.stringify(args)).toBe(true)
      expect(body.ok).toBe(false)
      expect(body.code).toBe('INVALID_LINEAGE_PAGE')
      expect(body.message).toMatch(pattern)
    }
  }, 120_000)
})
