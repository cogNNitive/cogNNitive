// @jsdom — the exported console is booted inside jsdom to prove the payload that
// ships still feeds the Changes tab; no browser, no network.
//
// console-unread-provenance-payload (batch b12): the exporter attached two
// per-element maps — `history` and `provenance` — and only `history` had readers
// (nn-runtime.js mountElementCards/kuModalTarget, review.js kuModalTarget,
// ui-kit.js EditModal). This suite pins the contract:
//
//   1. an exported payload carries `element.history` and no `element.provenance`;
//   2. the over-budget degrade ladder's second step drops `history` and reports
//      itself as `strip-citations+history`;
//   3. a console exported from a domain with applied changes still renders the
//      Changes tab and the per-field value history.
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { runExportConsole } from '../scripts/export-console.mjs'
import { decodeConsoleModelText, encodeConsoleModel, slotTextOf } from './helpers/console-slots.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const consoleDir = resolve(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console')
const BUNDLE = readFileSync(join(consoleDir, 'nn-console.bundle.js'), 'utf-8')

const bytes = (text) => Buffer.byteLength(text, 'utf8')

/** Runs the exporter in-process, the same entry the CLI uses. */
async function exportDomain(root) {
  const res = await runExportConsole([root, '--domain', '--no-open'], { open: false })
  return res
}

/** The raw (compressed, base64) `nn-model` slot text of an exported console. */
function encodedIsland(html) {
  const text = slotTextOf(html, 'nn-model')
  assert.ok(text, 'the exported console carries the nn-model payload island')
  return text
}

/** The `nn-model` payload island of an exported console, decoded to its JSON text. */
function modelIsland(html) {
  return decodeConsoleModelText(encodedIsland(html))
}

const MODEL = `---
title: "Provenance Domain"
model_version: "V_1-0-0"
level: 3
---

# NN Stakeholders
## NN Stakeholders: Enterprise
  slug:: enterprise
  budget:: "$100k"
  summary:: "Baseline"
  sources:: "sources/brief.md#overview"

  Leading enterprise tier offering.

## NN Stakeholders: Startup
  slug:: startup
  budget:: "$10k"
  summary:: "Untouched"
`

const CHANGES = `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: changes
  url: "https://example.test/changes/spec_NN.md"
blueprint_version: "V_0-2-0"
status: applied
title: "Provenance changes"
author: "OpenCode"
applied_at: "2026-11-16T10:00:00.000Z"
---

# NN index

* [[Change]]

# NN Change

## NN Change: c-01
op:: update_field
target:: business@enterprise&summary
from:: "Baseline"
to:: "Applied"
author:: OpenCode
notes:: "Moved the summary to the applied value."

## NN Change: c-02
op:: comment
target:: business@enterprise
author:: OpenCode
notes:: "Whole-element comment."
`

/** Writes the domain the payload shape and the DOM pins read. */
async function writeDomain(root) {
  await mkdir(join(root, 'models'), { recursive: true })
  await mkdir(join(root, 'changes'), { recursive: true })
  await mkdir(join(root, 'sources'), { recursive: true })
  await writeFile(join(root, 'models', 'business_V_1-0-0_NN.md'), MODEL, 'utf-8')
  await writeFile(join(root, 'changes', 'dom_prov_1_changes_NN.md'), CHANGES, 'utf-8')
  await writeFile(join(root, 'sources', 'brief.md'), `# Brief\n\n## Overview\n${'Enterprise context. '.repeat(80)}\n`, 'utf-8')
}

describe('an exported payload keeps history and drops provenance (b12)', () => {
  let root
  let html
  let island
  let slot

  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'nn-prov-payload-'))
    await writeDomain(root)
    const res = await exportDomain(root)
    assert.equal(res.exitCode, 0, `the export succeeded: ${res.stderr}`)
    html = await readFile(join(root, 'domaiNN_console.html'), 'utf-8')
    island = modelIsland(html)
    slot = JSON.parse(island)
  })

  after(async () => {
    if (root && existsSync(root)) await rm(root, { recursive: true, force: true })
  })

  it('embeds the per-element history', () => {
    const el = slot.elements.find((e) => e.slug === 'enterprise')
    assert.ok(el, 'the enterprise element is embedded')
    assert.deepEqual(
      el.history.map((h) => h.id),
      ['c-01', 'c-02'],
      'every recorded change ships on the element, for the Changes tab',
    )
    assert.equal(el.history[0].notes, 'Moved the summary to the applied value.')
    assert.equal(slot.elements.find((e) => e.slug === 'startup').history, undefined, 'an unchanged element carries none')
  })

  it('attaches no per-element provenance map', () => {
    for (const el of slot.elements) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(el, 'provenance'),
        false,
        `element "${el.slug}" carries no provenance map: nothing in the console reads it`,
      )
    }
    // This domain declares no matrix, so no other producer can put the key back.
    assert.equal(island.includes('"provenance"'), false, 'the model slot carries no provenance key at all')
  })

  it('renders the Changes tab from the exported history', () => {
    const { document, window } = boot(html)
    const el = slot.elements.find((e) => e.slug === 'enterprise')
    const unit = document.querySelector('[data-ku-address$="@enterprise"]')
    assert.ok(unit, 'the element renders as a KU unit')
    const info = unit.closest('.nn-ku-wrap').querySelector('[data-ku-action="info"]')
    assert.ok(info, 'the unit carries the info action')
    info.dispatchEvent(new window.Event('click', { bubbles: true }))

    const modal = document.querySelector('[data-nn-component="edit-modal"]')
    assert.ok(modal, 'the unit modal opens')
    const tab = modal.querySelector('[data-nn-tab="history"]')
    assert.ok(tab, 'the modal carries the Changes tab')
    assert.equal(tab.textContent, 'Changes')
    tab.dispatchEvent(new window.Event('click', { bubbles: true }))

    const panel = modal.querySelector('[data-tab="history"]')
    const sheets = [...panel.querySelectorAll('[data-nn-change-sheet]')].map((n) => n.getAttribute('data-change-id'))
    assert.deepEqual(sheets, el.history.map((h) => h.id), 'one change sheet per exported history entry')
    assert.equal(panel.querySelectorAll('.nn-history-empty').length, 0, 'the panel is not the empty state')
  })

  it('renders the per-field value history from the exported history', () => {
    const { document, window } = boot(html)
    const el = slot.elements.find((e) => e.slug === 'enterprise')
    // The exact shape review.js kuModalTarget passes to the modal.
    const open = (fieldName) =>
      window.nnUI.EditModal(
        { title: el.name, element: el, elementId: el.id, fieldName, history: el.history },
        { doc: document },
      )
    const scoped = open('summary').querySelector('[data-tab="history"]')
    assert.deepEqual(
      [...scoped.querySelectorAll('[data-change-id]')].map((n) => n.getAttribute('data-change-id')),
      ['c-01'],
      'a field modal lists the change that touched that field',
    )
    const other = open('budget').querySelector('[data-tab="history"]')
    assert.equal(other.querySelectorAll('[data-nn-change-sheet]').length, 0, 'a field with no change lists none')
    assert.equal(
      other.querySelector('.nn-history-empty')?.textContent,
      'No recorded changes for this field.',
      'and says so instead of rendering a stale sheet',
    )
  })
})

describe('the second degrade step drops history under its own name (b12)', () => {
  let root

  // A history big enough that half of it is a wide margin on either side of the
  // threshold the test computes: the ladder's second step must be what lands the
  // page under the limit, never an accident of a few bytes.
  const BULK = `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: changes
  url: "https://example.test/changes/spec_NN.md"
blueprint_version: "V_0-2-0"
status: applied
title: "Bulk changes"
author: "OpenCode"
applied_at: "2026-11-16T11:00:00.000Z"
---

# NN Change

${Array.from(
  { length: 12 },
  (_, i) => `## NN Change: b-${String(i + 1).padStart(2, '0')}
op:: update_field
target:: business@enterprise&budget
from:: "$100k"
to:: "$${100 + i}k"
author:: OpenCode
notes:: "Budget revision ${i + 1} recorded so the per-element history has real weight in the payload: it repeats the change log per element, which is exactly what the second degrade step removes when the page is still over the hard limit."
`,
).join('\n')}`

  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'nn-prov-degrade-'))
    await writeDomain(root)
    await writeFile(join(root, 'changes', 'dom_prov_bulk_changes_NN.md'), BULK, 'utf-8')
  })

  after(async () => {
    if (root && existsSync(root)) await rm(root, { recursive: true, force: true })
  })

  it('strips citations, then history, and reports strip-citations+history', async () => {
    // A manifest is present from the first export, with thresholds of the same width
    // as the measured ones, so the payload does not shift between the two runs.
    const manifest = (warn, fail) =>
      `---\nlevel: 3\ntitle: "Provenance Domain"\nconsole_size_budget_warn: ${warn}\nconsole_size_budget_fail: ${fail}\n---\n\n# NN Domain\n`
    await writeFile(join(root, 'domaiNN_NN.md'), manifest(9000000, 9500000), 'utf-8')

    const measured = await exportDomain(root)
    assert.equal(measured.exitCode, 0, `the measuring export succeeded: ${measured.stderr}`)
    const fullHtml = await readFile(join(root, 'domaiNN_console.html'), 'utf-8')
    const fullIsland = encodedIsland(fullHtml)
    const model = JSON.parse(modelIsland(fullHtml))

    // The payload caps each element's history at CONSOLE_HISTORY_LIMIT and records the
    // original count, so the modal can point at the changes model instead of silently
    // showing fewer hops. Pinned here because this payload comes from a real export.
    for (const el of model.elements) {
      if (!Array.isArray(el.history)) continue
      assert.ok(el.history.length <= 12, `${el.name}: history is capped at 12`)
      if (el.historyTotal !== undefined) {
        assert.ok(el.historyTotal >= el.history.length, `${el.name}: historyTotal covers the kept hops`)
      }
    }

    const without = (drop) =>
      JSON.stringify({
        ...model,
        elements: model.elements.map((el) => {
          const copy = { ...el }
          for (const key of drop) delete copy[key]
          return copy
        }),
      })
    // The page carries the model compressed, so every size is the size of the slot the
    // exporter would write for that payload.
    const slotOf = (json) => '\n' + encodeConsoleModel(JSON.parse(json)) + '\n'
    const noCitations = slotOf(without(['citations']))
    const noCitationsNoHistory = slotOf(without(['citations', 'history']))
    const historyBytes = bytes(noCitations) - bytes(noCitationsNoHistory)
    // The cap keeps the newest 12 hops per element, so the fixture's history is smaller
    // than it was when this floor was 200 B. 100 B still proves the measurement moves
    // when history is dropped, which is what the ladder below needs.
    assert.ok(historyBytes > 100, `the fixture carries a real history (${historyBytes} B)`)

    // Stage 1 alone cannot fit; stage 2 does. The island is the only part of the
    // page the ladder changes, so the totals move by exactly its byte delta.
    const stageOneTotal = bytes(fullHtml) - bytes(fullIsland) + bytes(noCitations)
    const fail = stageOneTotal - Math.floor(historyBytes / 2)
    const warn = fail - 1000
    assert.equal(String(fail).length, 7, 'the measured threshold keeps the manifest width')
    assert.equal(String(warn).length, 7)
    await writeFile(join(root, 'domaiNN_NN.md'), manifest(warn, fail), 'utf-8')

    const degraded = await exportDomain(root)
    assert.equal(degraded.exitCode, 0, `the degraded export still writes: ${degraded.stderr}`)
    assert.match(degraded.stderr, new RegExp(`exported degraded \\(strip-citations\\+history\\)`))
    assert.match(degraded.stderr, /the history of \d+ elements/)

    const written = JSON.parse(modelIsland(await readFile(join(root, 'domaiNN_console.html'), 'utf-8')))
    const el = written.elements.find((e) => e.slug === 'enterprise')
    assert.ok(el, 'the element is still in the payload')
    assert.equal(el.citations, undefined, 'the resolved citations are the first thing dropped')
    assert.equal(el.history, undefined, 'the second step drops the per-element history')
    assert.equal(el.fields.budget, '$100k', 'the raw field values survive the degrade untouched')
    assert.equal(Object.prototype.hasOwnProperty.call(el, 'provenance'), false)
  })
})

// console-matrix-provenance-payload (batch b17): the same dead-map class as the
// element one b12 removed, one slot over. The builder emitted `matrix.provenance` —
// per row/column `{history, origin}` — for every non-empty cell, and no browser-side
// console source reads it: every view renders the cell VALUE. The export is pinned
// here, on a domain that actually holds a matrix with an applied cell change, so a
// producer that puts the key back cannot slip through on an empty fixture.
const MATRIX_MODEL = `---
title: "Matrix Domain"
model_version: "V_1-0-0"
level: 3
---

# NN Stakeholders
## NN Stakeholders: Enterprise
slug:: enterprise

## NN Stakeholders: Startup
slug:: startup

# NN matrices: Impact Matrix
| - | Startup |
| :--- | :---: |
| Enterprise | high |
`

const MATRIX_CHANGES = `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: changes
  url: "https://example.test/changes/spec_NN.md"
blueprint_version: "V_0-2-0"
status: applied
title: "Matrix changes"
author: "OpenCode"
applied_at: "2026-11-16T12:00:00.000Z"
---

# NN index

* [[Change]]

# NN Change

## NN Change: m-01
op:: update_matrix_cell
target:: business_V_1-0-0@Impact Matrix&enterprise&startup
resolved_target:: business_V_1-0-0@impact-matrix&enterprise&startup
to:: "high"
author:: OpenCode
notes:: "Set the impact cell from the source."
`

describe('an exported payload ships no matrix provenance (b17)', () => {
  let root
  let island
  let slot

  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'nn-prov-matrix-'))
    await mkdir(join(root, 'models'), { recursive: true })
    await mkdir(join(root, 'changes'), { recursive: true })
    await writeFile(join(root, 'models', 'business_V_1-0-0_NN.md'), MATRIX_MODEL, 'utf-8')
    await writeFile(join(root, 'changes', 'dom_matrix_1_changes_NN.md'), MATRIX_CHANGES, 'utf-8')
    const res = await exportDomain(root)
    assert.equal(res.exitCode, 0, `the export succeeded: ${res.stderr}`)
    island = modelIsland(await readFile(join(root, 'domaiNN_console.html'), 'utf-8'))
    slot = JSON.parse(island)
  })

  after(async () => {
    if (root && existsSync(root)) await rm(root, { recursive: true, force: true })
  })

  it('carries the cell value and no per-cell provenance map', () => {
    const matrix = slot.matrices.find((m) => m.name === 'Impact Matrix')
    assert.ok(matrix, 'the matrix is embedded')
    assert.equal(matrix.cells.Enterprise.Startup, 'high', 'the cell keeps the value the Matrices view renders')
    assert.equal(
      Object.prototype.hasOwnProperty.call(matrix, 'provenance'),
      false,
      'no matrix provenance map ships: the console has no reader for it',
    )
    assert.equal(
      Object.prototype.hasOwnProperty.call(matrix, 'history'),
      false,
      'and no matrix history map replaces it',
    )
    // This domain DOES hold a matrix with an applied cell change, so the byte-level
    // check is real: no producer can put the key back unnoticed.
    assert.equal(island.includes('"provenance"'), false, 'the model slot carries no provenance key at all')
  })
})

/**
 * Boots an exported console the way the file does: patch what jsdom lacks, execute
 * the bundle, then boot. `runScripts: 'outside-only'` keeps the inlined copy from
 * booting itself before the window is ready.
 */
function boot(html) {
  const dom = new JSDOM(html, { url: 'http://localhost', runScripts: 'outside-only' })
  const window = dom.window
  window.matchMedia = () => ({
    matches: false,
    media: '',
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false
    },
  })
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.eval(BUNDLE)
  // The page decodes its compressed model before booting; this test pre-decodes it.
  const res = window.nnConsole.boot(window.document, { modelText: modelIsland(html) })
  assert.equal(res.ok, true, 'the exported console boots')
  return { window, document: window.document }
}
