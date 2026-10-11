import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { bootConsole, consoleDir } from './helpers/console-boot.mjs'

const require = createRequire(import.meta.url)
const UI = require(join(consoleDir, 'ui-kit.js'))

function dom() {
  const d = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' })
  global.window = d.window
  global.document = d.window.document
  return d.window.document
}

function dblclick(node) {
  node.dispatchEvent(new node.ownerDocument.defaultView.Event('dblclick', { bubbles: true }))
}

describe('FieldValue (type-aware read rendering)', () => {
  it('renders booleans as Yes/No', () => {
    const document = dom()
    const t = UI.FieldValue({ value: true, type: 'boolean' })
    const f = UI.FieldValue({ value: false, type: 'boolean' })
    document.body.appendChild(t)
    assert.equal(t.textContent, 'Yes')
    assert.equal(f.textContent, 'No')
    assert.equal(t.getAttribute('data-value'), 'true')
  })

  it('renders urls as safe links', () => {
    const document = dom()
    const a = UI.FieldValue({ value: 'https://example.com', type: 'url' })
    document.body.appendChild(a)
    assert.equal(a.tagName, 'A')
    assert.equal(a.getAttribute('href'), 'https://example.com')
    assert.equal(a.getAttribute('rel'), 'noopener noreferrer')
  })

  it('renders code and markdown, arrays joined, plain as null', () => {
    const document = dom()
    assert.equal(UI.FieldValue({ value: 'x=1', type: 'code' }).tagName, 'CODE')
    assert.equal(UI.FieldValue({ value: '# H', type: 'markdown' }).className, 'innfo-field-markdown')
    assert.equal(UI.FieldValue({ value: ['a', 'b'] }).textContent, 'a, b')
    assert.equal(UI.FieldValue({ value: 'plain', type: 'string' }), null)
  })

  it('FieldRow keeps the plain field badge for strings but types a boolean', () => {
    const document = dom()
    const plain = UI.FieldRow({ name: 'f', value: 'v' })
    document.body.appendChild(plain)
    assert.equal(plain.textContent, 'f:v')
    const bool = UI.FieldRow({ name: 'active', value: true, type: 'boolean' })
    document.body.appendChild(bool)
    assert.ok(bool.querySelector('.innfo-field-bool'))
    assert.equal(bool.textContent, 'active:Yes')
  })
})

describe('Console type-aware rendering + field detail + incoming + metamodel', () => {
  const MODEL = {
    meta: { title: 'Typed Model', modelId: 'typed', modelVersion: 'V_1-0-0' },
    elements: [
      {
        id: 'a',
        concept: 'Fleet',
        name: 'Ecto-1',
        description: '',
        fields: { active: true, site: 'https://example.com', role: 'Interceptor' },
        hash: '0'.repeat(16),
      },
      {
        id: 'b',
        concept: 'Ghost',
        name: 'Slimer',
        description: '',
        fields: {},
        hash: '1'.repeat(16),
        relations: [{ field: 'haunts', target: 'a', targetLabel: 'Ecto-1' }],
      },
    ],
    matrices: [{ name: 'Duty', source: 'Fleet', target: 'Ghost', rows: [], cols: [], cells: {} }],
  }
  const SCHEMA = {
    concepts: [{ name: 'Fleet' }, { name: 'Ghost' }],
    fields: [
      { name: 'active', type: 'boolean' },
      { name: 'site', type: 'url' },
      { name: 'role', type: 'string' },
    ],
  }

  it('renders typed field values on the card', () => {
    const { document } = bootConsole({ model: MODEL, schema: SCHEMA })
    const card = document.querySelector('#innfo-content .innfo-card[data-element-id="a"]')
    assert.ok(card.querySelector('.innfo-field-bool'), 'boolean rendered')
    assert.match(card.querySelector('.innfo-field-bool').textContent, /Yes/)
    assert.ok(card.querySelector('a.innfo-field-url'), 'url rendered')
  })

  it('shows incoming relations with a count on the referenced card', () => {
    const { document } = bootConsole({ model: MODEL, schema: SCHEMA })
    const card = document.querySelector('#innfo-content .innfo-card[data-element-id="a"]')
    const inc = card.querySelector('.innfo-card-incoming')
    assert.ok(inc, 'incoming section present')
    assert.match(inc.querySelector('.innfo-card-incoming-label').textContent, /Referenced by \(1\)/)
    assert.match(inc.textContent, /Slimer/)
  })

  it('opens the field-detail dialog on a table-cell double-click', () => {
    const { document } = bootConsole({ model: MODEL, schema: SCHEMA })
    document.querySelector('.innfo-viewmode-btn[data-mode="table"]').dispatchEvent(
      new document.defaultView.Event('click', { bubbles: true }),
    )
    const idx = [...document.querySelectorAll('.innfo-element-table thead th')].findIndex(
      (th) => th.getAttribute('data-sort-key') === 'active',
    )
    const row = document.querySelector('.innfo-element-table tbody tr[data-element-id="a"]')
    dblclick(row.children[idx])
    const dialog = document.getElementById('innfo-field-dialog')
    assert.ok(dialog, 'field detail dialog created')
    assert.match(dialog.textContent, /active/)
    assert.ok(dialog.querySelector('.innfo-field-bool'), 'typed value in the dialog')
  })

  it('mounts the Model Map tab with concept nodes and matrix edges', () => {
    const { document } = bootConsole({ model: MODEL, schema: SCHEMA })
    const tab = document.querySelector('.innfo-view-tab[data-tab="metamodel"]')
    assert.ok(tab, 'metamodel tab exists')
    const panel = document.getElementById('innfo-tab-metamodel')
    assert.ok(panel, 'metamodel panel exists')
    const svg = panel.querySelector('.innfo-metamodel-svg')
    assert.ok(svg, 'svg rendered')
    assert.equal(panel.querySelectorAll('.innfo-metamodel-node').length, 2)
    assert.equal(panel.querySelectorAll('.innfo-metamodel-edge').length, 1)
    assert.match(panel.textContent, /Fleet/)
  })
})
