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
    const md = UI.FieldValue({ value: '# H', type: 'markdown' })
    assert.ok(md.classList.contains('innfo-field-markdown'))
    assert.equal(md.getAttribute('data-innfo-component'), 'markdown', 'rendered by InnfoUI.Markdown')
    assert.equal(md.querySelector('h1').textContent, 'H')
    assert.equal(UI.FieldValue({ value: ['a', 'b'] }).textContent, 'a, b')
    assert.equal(UI.FieldValue({ value: 'plain', type: 'string' }), null)
  })

  it('renders plain objects as structured key-value chips instead of [object Object]', () => {
    const document = dom()
    const node = UI.FieldValue({
      name: 'photo_metadata',
      value: { title: 'Three-tray workbench', author: 'TestLab crew' },
    })
    document.body.appendChild(node)
    assert.ok(node.classList.contains('innfo-obj-chips'))
    assert.equal(node.querySelectorAll('.innfo-obj-chip').length, 2)
    assert.doesNotMatch(node.textContent, /\[object Object\]/)
    assert.match(node.textContent, /Three-tray workbench/)
  })

  it('renders image field values with inline preview and normalized path', () => {
    const document = dom()
    const node = UI.FieldValue({
      name: 'photo',
      value: 'test/fixtures/testlab/sources/import/photo.png',
    })
    document.body.appendChild(node)
    assert.ok(node.classList.contains('innfo-field-image-wrap'))
    const img = node.querySelector('img.innfo-field-image')
    assert.ok(img, 'inline img preview rendered')
    assert.equal(img.getAttribute('src'), 'sources/import/photo.png')
    assert.match(node.textContent, /sources\/import\/photo\.png/)
  })

  it('renders select fields as a value pill and empty select as null', () => {
    const document = dom()
    const node = UI.FieldValue({ name: 'status', value: 'MVP', type: 'select' })
    document.body.appendChild(node)
    assert.ok(node.classList.contains('innfo-field-select'))
    assert.equal(node.textContent, 'MVP')
    assert.equal(UI.FieldValue({ name: 'status', value: '', type: 'select' }), null)
  })

  it('renders video and audio fields as native media players', () => {
    const document = dom()
    const video = UI.FieldValue({ name: 'clip', value: 'sources/import/demo.mp4', type: 'video' })
    const audio = UI.FieldValue({ name: 'interview', value: 'sources/import/interview.mp3', type: 'audio' })
    document.body.appendChild(video)
    document.body.appendChild(audio)
    const v = video.querySelector('video.innfo-field-media')
    const a = audio.querySelector('audio.innfo-field-media')
    assert.ok(v, 'video player rendered')
    assert.equal(v.getAttribute('src'), 'sources/import/demo.mp4')
    assert.ok(v.hasAttribute('controls'))
    assert.ok(a, 'audio player rendered')
    assert.equal(a.getAttribute('src'), 'sources/import/interview.mp3')
  })

  it('markdown_inline renders as markdown while markdown_file stays a path pill', () => {
    dom()
    const inline = UI.FieldValue({ value: '**x**', type: 'markdown_inline' })
    assert.equal(inline.querySelector('strong').textContent, 'x')
    const file = UI.FieldValue({ value: 'sources/notes.md', type: 'markdown_file' })
    assert.ok(file.classList.contains('innfo-file-pill'))
    assert.equal(file.querySelector('strong'), null)
  })

  it('declared media with an unsafe source is plain text, a remote one still plays', () => {
    dom()
    for (const type of ['video', 'audio']) {
      assert.equal(UI.FieldValue({ name: 'm', value: 'javascript:alert(1)', type }), null)
      assert.equal(UI.FieldValue({ name: 'm', value: 'data:text/html,x', type }), null)
    }
    const row = UI.FieldRow({ name: 'clip', value: 'javascript:alert(1)', type: 'video' })
    assert.equal(row.querySelector('video'), null)
    assert.match(row.textContent, /javascript:alert\(1\)/)
    const remote = UI.FieldValue({ name: 'clip', value: 'https://example.com/v.mp4', type: 'video' })
    assert.equal(remote.querySelector('video').getAttribute('src'), 'https://example.com/v.mp4')
  })

  it('a knowledge pill is clickable only when the caller can bind it', () => {
    dom()
    const seen = []
    const bound = UI.FieldValue(
      { name: 'k', value: '[[kNNowledge/a_NN.md]]', type: 'knowledge' },
      { onKnowledge: (v) => seen.push(v), isKnowledgeBound: () => true },
    )
    bound.click()
    assert.deepEqual(seen, ['[[kNNowledge/a_NN.md]]'])
    const inert = UI.FieldValue(
      { name: 'k', value: '[[kNNowledge/b_NN.md]]', type: 'knowledge' },
      { onKnowledge: (v) => seen.push(v), isKnowledgeBound: () => false },
    )
    assert.doesNotThrow(() => inert.click())
    assert.equal(seen.length, 1)
    assert.equal(inert.getAttribute('data-knowledge-bound'), null)
  })

  it('renders knowledge fields as a document pill, stripping wikilink brackets', () => {
    const document = dom()
    const node = UI.FieldValue({ name: 'system', value: '[[kNNowledge/billing_NN.md]]', type: 'knowledge' })
    document.body.appendChild(node)
    assert.ok(node.classList.contains('innfo-file-pill'))
    assert.match(node.textContent, /kNNowledge\/billing_NN\.md/)
    assert.doesNotMatch(node.textContent, /\[\[|\]\]/)
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
    // 2 edges since 35d4300b: matrix Duty (Fleet→Ghost) + implicit element
    // relation haunts (Ghost→Fleet). Previously matrices only (1).
    assert.equal(panel.querySelectorAll('.innfo-metamodel-edge').length, 2)
    assert.match(panel.textContent, /Fleet/)
  })

  it('applies distinct concept slot colors to card borders and concept badges even without explicit schema colors', () => {
    const { document } = bootConsole({ model: MODEL, schema: SCHEMA })
    const cardA = document.querySelector('#innfo-content .innfo-card[data-element-id="a"]')
    const cardB = document.querySelector('#innfo-content .innfo-card[data-element-id="b"]')
    assert.equal(cardA.getAttribute('data-concept-slot'), '1')
    assert.equal(cardB.getAttribute('data-concept-slot'), '2')
    assert.notEqual(cardA.style.borderLeft, cardB.style.borderLeft)
    assert.match(cardA.style.borderLeft, /#3b82f6|rgb\(59,\s*130,\s*246\)/i)
    assert.match(cardB.style.borderLeft, /#8b5cf6|rgb\(139,\s*92,\s*246\)/i)
  })
})
