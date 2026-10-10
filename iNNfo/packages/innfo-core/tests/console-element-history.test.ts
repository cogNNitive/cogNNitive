import { describe, it, expect, afterEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  buildConsolePayload,
  attachChangesetHistory,
  loadChangesetRecords,
  parseChangesetTarget,
  normalizeAddressKey,
} from '../src/index.js'

const MODEL = `---
title: "TestLab Coverage Model"
knowledge_version: "V_0-1-0"
parent_spec:
  name: "TestLab_V_0-1-0"
  url: "specs/TestLab_NN.md"
---

# NN Concept 1
## NN Concept 1: Element 1A
summary:: Intake baseline.

# NN Concept 2
## NN Concept 2: Element 2A
summary:: Other.
`

const CHANGESET = `---
spec_version: "V_0-4-0"
parent_spec: "changes"
blueprint_version: "0.1.0"
status: applied
title: "TestLab Domain"
author: "lucas"
applied_at: "2026-10-10T17:20:19.500Z"
---

# NN index

* [[Change]]

# NN Change

## NN Change: fb-001
op:: comment
target:: TestLab Domain@concept-1-element-1a&__description
notes:: "Es para probar"

## NN Change: fb-002
op:: update_field
target:: TestLab Domain@Element 2A&summary
from:: "Other."
to:: "Changed."
`

describe('console element history (changeset lineage)', () => {
  const temps: string[] = []
  afterEach(async () => {
    for (const d of temps) await rm(d, { recursive: true, force: true })
    temps.length = 0
  })

  it('parseChangesetTarget + normalizeAddressKey', () => {
    expect(parseChangesetTarget('M@element-1a&field')).toEqual({
      modelPart: 'M',
      elementPart: 'element-1a',
    })
    expect(parseChangesetTarget('M@element-1a')).toEqual({ modelPart: 'M', elementPart: 'element-1a' })
    expect(parseChangesetTarget('no-at-sign')).toEqual({ modelPart: '', elementPart: '' })
    expect(normalizeAddressKey('Element 1A')).toBe('element1a')
    expect(normalizeAddressKey('concept-1-element-1a')).toBe('concept1element1a')
  })

  it('attachChangesetHistory matches by element id and name, strips quotes, ignores non-matches', () => {
    const elements: any[] = [
      { id: 'concept-1-element-1a', name: 'Element 1A' },
      { id: 'concept-2-element-2a', name: 'Element 2A' },
      { id: 'concept-9-element-9a', name: 'Element 9A' },
    ]
    const changesets = [
      {
        path: 'changes/dom_lucas_1_changes_NN.md',
        status: 'applied',
        author: 'lucas',
        appliedAt: '2026-10-10T17:20:19.500Z',
        changes: [
          { id: 'c-01', op: 'comment', target: 'Domain@concept-1-element-1a&__description', notes: '"A comment"' },
          { id: 'c-02', op: 'update_field', target: 'Domain@Element 2A&summary', notes: 'no quotes' },
          { id: 'c-03', op: 'update_field', target: 'Domain@ghost&summary' },
        ],
      },
    ]
    attachChangesetHistory(elements, changesets as any)
    expect(elements[0].history).toEqual([
      {
        id: 'c-01',
        op: 'comment',
        author: 'lucas',
        timestamp: '2026-10-10T17:20:19.500Z',
        notes: 'A comment',
        status: 'applied',
      },
    ])
    expect(elements[1].history?.[0]).toMatchObject({ id: 'c-02', notes: 'no quotes' })
    expect(elements[2].history).toBeUndefined()
  })

  it('buildConsolePayload embeds history from changesets without touching the schema slot', () => {
    const payload = buildConsolePayload({
      content: MODEL,
      path: 'kNNowledge/TestLab_NN.md',
      changesets: [
        {
          path: 'changes/dom_lucas_1_changes_NN.md',
          status: 'applied',
          author: 'lucas',
          appliedAt: 'T',
          changes: [
            {
              id: 'fb-001',
              op: 'comment',
              target: 'Domain@concept-1-element-1a&__description',
              notes: 'nota',
            },
          ],
        },
      ],
    })
    const el = payload.model.elements.find((e) => e.name === 'Element 1A')!
    expect(el.history).toEqual([
      { id: 'fb-001', op: 'comment', author: 'lucas', timestamp: 'T', notes: 'nota', status: 'applied' },
    ])
    expect(JSON.stringify(payload.schema)).not.toContain('fb-001')
  })

  it('loadChangesetRecords reads changes/*_changes_NN.md and ignores other files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'nn-hist-'))
    temps.push(dir)
    await mkdir(join(dir, 'changes'), { recursive: true })
    await writeFile(join(dir, 'changes', 'dom_lucas_1_changes_NN.md'), CHANGESET, 'utf-8')
    await writeFile(join(dir, 'changes', 'notes.md'), 'ignored', 'utf-8')
    const records = await loadChangesetRecords(dir)
    expect(records.length).toBe(1)
    expect(records[0].author).toBe('lucas')
    expect(records[0].appliedAt).toBe('2026-10-10T17:20:19.500Z')
    expect(records[0].changes.length).toBe(2)
    expect(records[0].changes[0]).toMatchObject({
      id: 'fb-001',
      op: 'comment',
      target: 'TestLab Domain@concept-1-element-1a&__description',
    })
  })

  it('loadChangesetRecords returns [] when changes/ is absent', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'nn-hist-'))
    temps.push(dir)
    expect(await loadChangesetRecords(dir)).toEqual([])
  })
})
