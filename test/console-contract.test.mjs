// Observable contracts of the console, asserted through test/helpers/console-contract.mjs
// so a UI refactor that keeps the behavior does not force a test rewrite.
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bootConsole } from './helpers/console-boot.mjs'
import {
  openUnitModal,
  wrapModal,
  getCitationAffordance,
  historyEntries,
  tabNames,
  activeTabName,
  openTab,
  openModals,
  offersPropose,
  submitComment,
} from './helpers/console-contract.mjs'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
const ui = require(join(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console', 'ui-kit.js'))

const newDoc = () => new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>').window.document

const CITATIONS = {
  sources: [{ origin: 'document', path: 'sources/interview.md', exists: true }],
  owner: [{ origin: 'human', path: 'sources/owner.md', exists: true }],
}

const card = (doc, opts) => {
  const node = ui.ElementCard(
    { id: 'e1', concept: 'Initiative', name: 'Alpha', fields: [], citations: CITATIONS },
    { doc, ...opts },
  )
  doc.body.appendChild(node)
  return node
}

const CHANGE = (id, extra) => ({
  id,
  op: 'update_field',
  author: 'lucas',
  timestamp: '2026-11-05T10:00:00Z',
  ...extra,
})

describe('citation affordance contract', () => {
  it('(a) an element card paints no citation icon when the host gave no handler', () => {
    const root = card(newDoc())
    assert.deepEqual(getCitationAffordance(root), [])
  })

  it('(a) a change sheet paints no evidence icon when the host gave no handler', () => {
    const doc = newDoc()
    const history = [
      CHANGE('ch-1', { field: 'status', from: 'draft', to: 'published', evidence: 'sources/review-evidence.md' }),
    ]
    const modal = ui.EditModal({ title: 'Alpha', elementId: 'e1', history, startTab: 'history' }, { doc })
    doc.body.appendChild(modal)
    assert.equal(historyEntries(modal).length, 1, 'the change is still listed')
    assert.deepEqual(getCitationAffordance(modal), [])
  })

  it('(a) the same change sheet shows the evidence source once the host can open it', () => {
    const doc = newDoc()
    const history = [
      CHANGE('ch-1', { field: 'status', from: 'draft', to: 'published', evidence: 'sources/review-evidence.md' }),
    ]
    const modal = ui.EditModal(
      { title: 'Alpha', elementId: 'e1', history, startTab: 'history' },
      { doc, onEvidence: () => {} },
    )
    doc.body.appendChild(modal)
    const icons = getCitationAffordance(modal)
    assert.ok(icons.length >= 1, 'the evidence is reachable from the change sheet')
    assert.ok(
      icons.every((i) => i.field === 'evidence' && i.sourcePath === 'sources/review-evidence.md'),
      'every icon opens the evidence source',
    )
    assert.equal(icons[0].visible, true)
    const [entry] = historyEntries(modal)
    assert.equal(entry.id, 'ch-1')
    assert.match(entry.text, /draft\s*→\s*published/, 'the entry shows what changed')
  })

  it('(b) an element card header shows one citation group per field', () => {
    const root = card(newDoc(), { onCite: () => {} })
    assert.deepEqual(
      getCitationAffordance(root).map((i) => [i.field, i.sourcePath]),
      [
        ['sources', 'sources/interview.md'],
        ['owner', 'sources/owner.md'],
      ],
    )
  })

  it('(b) opening a header citation passes the field name to onCite', () => {
    const doc = newDoc()
    const seen = []
    const root = card(doc, { onCite: (data) => seen.push(data.field) })
    root.querySelector('[data-nn-component="citation-icon"][data-field="owner"]').click()
    assert.deepEqual(seen, ['owner'])
  })

  it('(b) a booted console renders the citation of an element and the reader can open it', () => {
    const { document } = bootConsole({
      model: {
        meta: { title: 'M', modelId: 'm', modelVersion: 'V_1-0-0' },
        elements: [
          { id: 'e1', concept: 'Fleet', name: 'E1', fields: {}, hash: '0123456789abcdef', citations: { sources: [{ path: 'sources/a.md' }] } },
        ],
        matrices: [],
      },
    })
    const rendered = getCitationAffordance(document.querySelector('[data-nn-component="element-card"]'), { field: 'sources' })
    assert.deepEqual(rendered.map((i) => i.sourcePath), ['sources/a.md'])
  })
})

describe('unit modal contract', () => {
  const ENTRIES = [
    CHANGE('ch-status', { field: 'status', from: 'a', to: 'b', timestamp: '2026-11-03T10:00:00Z' }),
    CHANGE('ch-element', { op: 'rename_element', from: 'Old', to: 'Alpha', timestamp: '2026-11-04T10:00:00Z' }),
    CHANGE('ch-other', { field: 'owner', from: 'x', to: 'y', timestamp: '2026-11-05T10:00:00Z' }),
  ]

  const modalFor = (fieldName) => {
    const doc = newDoc()
    const modal = ui.EditModal({ title: 'Alpha', elementId: 'e1', fieldName, value: 'a', history: ENTRIES }, { doc })
    doc.body.appendChild(modal)
    return modal
  }

  it('(c) a field-scoped Changes tab keeps the element-level entries that name no field', () => {
    const modal = modalFor('status')
    openTab(modal, 'Changes')
    assert.deepEqual(
      historyEntries(modal).map((e) => e.id),
      ['ch-element', 'ch-status'],
      'newest first; the owner change belongs to another field',
    )
  })

  it('(c) an element-scoped Changes tab lists every entry', () => {
    const modal = modalFor(undefined)
    assert.deepEqual(historyEntries(modal).map((e) => e.id).sort(), ['ch-element', 'ch-other', 'ch-status'])
  })

  const booted = () => bootConsole()

  it('(d) the kebab of a field badge opens the modal for that element and field', () => {
    const b = booted()
    const modal = openUnitModal(b, { elementId: 'ecto-1', field: 'role', via: 'kebab' })
    assert.equal(modal.kind, 'edit-modal')
    assert.equal(modal.elementId, 'ecto-1')
    assert.equal(modal.field, 'role')
  })

  it('(d) the kebab of the element badge opens the modal for the element, not a field', () => {
    const modal = openUnitModal(booted(), { elementId: 'ecto-1', via: 'kebab' })
    assert.equal(modal.elementId, 'ecto-1')
    assert.equal(modal.field, null)
  })

  it('(d) the kebab of a table header badge opens the unit panel for that field', () => {
    const { document } = bootConsole({
      model: {
        meta: { title: 'T', modelId: 't', modelVersion: 'V_1-0-0' },
        elements: [
          { id: 'a', concept: 'Thing', name: 'Beta', fields: { rank: '3' }, hash: '0'.repeat(16) },
          { id: 'b', concept: 'Thing', name: 'Alpha', fields: { rank: '1' }, hash: '1'.repeat(16) },
        ],
      },
    })
    document.querySelector('.nn-viewmode-btn[data-mode="table"]').click()
    document.querySelector('.nn-element-table th[data-sort-key="rank"] [data-ku-more]').click()
    const [panel] = openModals(document)
    assert.equal(wrapModal(panel).kind, 'ku-info-panel')
    assert.match(wrapModal(panel).address, /rank/, 'the panel is for the rank field')
  })

  it('(e) an element-level comment opens comment-only, without the Propose toggle', () => {
    const modal = openUnitModal(booted(), { elementId: 'ecto-1', via: 'comment' })
    assert.equal(modal.field, null)
    assert.equal(modal.offersPropose(), false)
  })

  it('(e) the element-level comment is saved as a comment draft', () => {
    const b = booted()
    const modal = openUnitModal(b, { elementId: 'ecto-1', via: 'comment' })
    submitComment(modal, 'needs a source')
    const stored = Object.keys(b.dom.window.localStorage)
      .map((k) => b.dom.window.localStorage.getItem(k))
      .join('|')
    assert.match(stored, /needs a source/)
    assert.equal(openModals(b.document).length, 0, 'the modal closed after saving')
  })

  it('(e) a field comment keeps the Propose toggle', () => {
    const modal = openUnitModal(booted(), { elementId: 'ecto-1', field: 'role', via: 'comment' })
    assert.equal(modal.field, 'role')
    assert.equal(offersPropose(modal), true)
  })

  it('(f) the same four tabs, by name, in every kind of modal', () => {
    const NAMES = ['View', 'Edit', 'Changes', 'Connections']
    const b = booted()
    const field = openUnitModal(b, { elementId: 'ecto-1', field: 'role' })
    const element = openUnitModal(b, { elementId: 'ecto-1' })
    const comment = openUnitModal(b, { elementId: 'ecto-1', via: 'comment' })
    const fieldComment = openUnitModal(b, { elementId: 'ecto-1', field: 'role', via: 'comment' })
    for (const m of [field, element, comment, fieldComment]) {
      assert.deepEqual(tabNames(m.el), NAMES)
      assert.equal(activeTabName(m.el), 'View', 'every modal opens on View')
    }
  })

  it('(f) opening a tab by name makes it the active one', () => {
    const modal = openUnitModal(booted(), { elementId: 'ecto-1', field: 'role' })
    for (const name of ['Edit', 'Changes', 'Connections', 'View']) {
      modal.openTab(name)
      assert.equal(modal.activeTab(), name)
    }
    assert.throws(() => modal.openTab('Lineage'), /no "Lineage" tab/)
  })

  it('(f) closing the modal removes it from the stack', () => {
    const b = booted()
    openUnitModal(b, { elementId: 'ecto-1' })
    const top = openUnitModal(b, { elementId: 'ecto-1', field: 'role' })
    assert.equal(openModals(b.document).length, 2)
    top.close()
    assert.equal(openModals(b.document).length, 1)
  })
})
