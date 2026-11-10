// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { attachChangesetHistory, loadChangesetRecords } from '../src/index.js'

/**
 * T6 (changes-compact-format): the console reads `set_fields` and the inherited
 * execution facts through the payload, never by re-implementing either.
 */

const req = createRequire(import.meta.url)
const consoleDir = join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts', 'console')
const UI = req(join(consoleDir, 'ui-kit.js')) as any

const AT = '2026-10-23T10:00:00.123Z'
const STEM = 'dom_juan_20261023T100000Z_changes'
const SHA = 'a'.repeat(64)

function changesetText(frontmatterFacts: string, perChange: string): string {
  return `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: changes
  url: "https://example.test/changes/spec_NN.md"
blueprint_version: "V_0-9-0"
author: juan
${frontmatterFacts}
---

# NN Change

## NN Change: c-01
op:: set_fields
target:: m@e1
from:: {"language":"en"}
to:: {"topics":"ai","language":"es"}
evidence:: sources/r.md
${perChange}`
}

const INHERITED = changesetText(
  `status: applied\napplied_at: ${AT}\nbatch: ${STEM}\nevidence_sha256:\n  sources/r.md: ${SHA}`,
  '',
)
const PER_CHANGE = changesetText(
  `status: applied\napplied_at: ${AT}`,
  `status:: applied\nresolved_target:: m@e1\nevidence_sha256:: [${SHA}]\napplied_at:: ${AT}\nbatch:: ${STEM}\n`,
)

const temps: string[] = []
afterEach(async () => {
  for (const dir of temps.splice(0)) await rm(dir, { recursive: true, force: true })
})

async function recordsOf(text: string) {
  const dir = await mkdtemp(join(tmpdir(), 'nn-console-set-fields-'))
  temps.push(dir)
  await mkdir(join(dir, 'changes'), { recursive: true })
  await writeFile(join(dir, 'changes', `${STEM}_NN.md`), text, 'utf-8')
  return loadChangesetRecords(dir)
}

const sheets = (root: HTMLElement) => root.querySelectorAll('article[data-nn-component="element-card"]')

describe('console: set_fields change cards', () => {
  it('renders an applied set_fields as one card listing each field -> value, never the JSON', async () => {
    const history = UI.ChangeHistory({ changes: await recordsOf(INHERITED), byId: {} }, {})
    const cards = sheets(history)
    expect(cards.length).toBe(1)
    const text = cards[0]!.textContent ?? ''
    expect(text).toContain('topics')
    expect(text).toContain('ai')
    expect(text).toContain('language')
    expect(text).toContain('es')
    expect(text).not.toContain('{"')
    expect(cards[0]!.getAttribute('data-change-state')).toBe('applied')
  })

  it('shows the same card for inherited and per-change execution facts', async () => {
    const inherited = UI.ChangeHistory({ changes: await recordsOf(INHERITED), byId: {} }, {})
    const perChange = UI.ChangeHistory({ changes: await recordsOf(PER_CHANGE), byId: {} }, {})
    expect(inherited.textContent).toBe(perChange.textContent)
    expect(inherited.textContent).toContain(AT)
  })

  it('offers Revert per field of an applied set_fields', async () => {
    const onRevert = vi.fn()
    const history = UI.ChangeHistory({ changes: await recordsOf(INHERITED), byId: {} }, { onRevert })
    const reverts = history.querySelectorAll('[data-nn="revert"]')
    expect(reverts.length).toBe(2)
    ;(reverts[1] as HTMLButtonElement).click()
    expect(onRevert).toHaveBeenCalledTimes(1)
    expect(onRevert.mock.calls[0][0]).toMatchObject({
      op: 'update_field',
      target: 'm@e1&language',
      field: 'language',
      from: 'en',
      to: 'es',
    })
  })
})

describe('console payload: resolved facts', () => {
  it('records carry the resolved facts of an inherited changeset', async () => {
    const [record] = await recordsOf(INHERITED)
    expect(record!.changes[0]).toMatchObject({
      status: 'applied',
      applied_at: AT,
      batch: STEM,
      author: 'juan',
      resolved_target: 'm@e1',
      evidence_sha256: [SHA],
    })
  })

  it('element history items carry the inherited batch for the change pseudo-unit', async () => {
    const elements = [{ id: 'e1', name: 'E1', slug: 'e1' }] as any[]
    attachChangesetHistory(elements, await recordsOf(INHERITED))
    expect(elements[0].history.length).toBeGreaterThan(0)
    for (const item of elements[0].history) expect(item.batch).toBe(STEM)
  })
})
