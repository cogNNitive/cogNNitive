import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
const consoleDir = join(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console')

global.InnfoIcons = require(join(consoleDir, 'innfo-icons.js'))
const UI = require(join(consoleDir, 'ui-kit.js'))
const InnfoReview = require(join(consoleDir, 'review.js'))

describe('Element Card Redesign Contract', () => {
  let document
  let window

  beforeEach(() => {
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
      url: 'http://localhost',
    })
    window = dom.window
    document = window.document
    global.window = window
    global.document = document
  })

  function fullCard() {
    return UI.ElementCard(
      {
        id: 'ecto-1',
        name: 'Ecto-1',
        conceptId: 'Fleet Vehicles',
        description: '1959 Cadillac Miller-Meteor.',
        fields: [{ name: 'role', value: 'Interceptor' }],
        markers: [{ id: 'priority', label: 'priority', kind: 'marker', value: 'high' }],
        qud: {
          id: 'ecto-1',
          concept: 'Fleet Vehicles',
          hash: '0123456789abcdef',
          path: 'ghostbusters / fleet-vehicles / ecto-1',
        },
        path: 'ghostbusters / fleet-vehicles / ecto-1',
        tags: ['iconic', 'nyc-fleet'],
        relations: [{ field: 'parked-at', target: 'hq-garage', targetLabel: 'HQ Garage' }],
      },
      { doc: document, domId: 'el-ecto-1', byId: { 'hq-garage': { name: 'HQ Garage' } } },
    )
  }

  describe('QKUD chip (read-only)', () => {
    it('renders copy + info buttons and never a pencil', () => {
      const card = fullCard()
      document.body.appendChild(card)
      const qud = card.querySelector('[data-innfo-component="qud-chip"]')
      assert.ok(qud, 'QKUD chip renders')
      assert.match(qud.textContent, /ecto-1/)
      assert.ok(qud.querySelector('[aria-label="Copy knowledge unit ID"]'), 'copy button')
      assert.ok(qud.querySelector('[aria-label="Knowledge unit ID details"]'), 'info button')
      assert.equal(
        qud.querySelectorAll('.innfo-edit-anchor').length,
        0,
        'no pencil inside the QKUD chip',
      )
      assert.equal(
        qud.querySelectorAll('[data-innfo-ctl]').length,
        0,
        'QKUD buttons carry no review ctl (they work without review mode)',
      )
    })

    it('toggles the detail line (id, concept, path, hash) on info click', () => {
      const card = fullCard()
      document.body.appendChild(card)
      const info = card.querySelector('[aria-label="Knowledge unit ID details"]')
      info.dispatchEvent(new window.Event('click', { bubbles: true }))
      assert.equal(card.getAttribute('data-qud-open'), 'true')
      const detail = card.querySelector('.innfo-qud-detail')
      assert.match(detail.textContent, /0123456789abcdef/)
      assert.match(detail.textContent, /fleet-vehicles/)
      info.dispatchEvent(new window.Event('click', { bubbles: true }))
      assert.equal(card.getAttribute('data-qud-open'), 'false')
    })

    it('copy click never throws without a clipboard', () => {
      const card = fullCard()
      document.body.appendChild(card)
      const copy = card.querySelector('[aria-label="Copy knowledge unit ID"]')
      assert.doesNotThrow(() => {
        copy.dispatchEvent(new window.Event('click', { bubbles: true }))
      })
    })
  })

  describe('Path, tags, relations', () => {
    it('renders path footer, tag row and relation list', () => {
      const card = fullCard()
      document.body.appendChild(card)
      assert.match(
        card.querySelector('.innfo-card-path').textContent,
        /ghostbusters \/ fleet-vehicles \/ ecto-1/,
      )
      const tags = card.querySelectorAll('[data-innfo-component="tag-row"] .innfo-tag')
      assert.equal(tags.length, 2)
      const rel = card.querySelector('[data-innfo-component="rel-list"] .innfo-rel-row')
      assert.ok(rel)
      assert.equal(rel.getAttribute('data-rel-field'), 'parked-at')
      assert.equal(rel.querySelector('a').getAttribute('href'), '#el-hq-garage')
    })

    it('omits qud, path, tags and relations when not provided (back-compat)', () => {
      const card = UI.ElementCard(
        { id: 'x', name: 'X', fields: [{ name: 'f', value: 'v' }] },
        { doc: document },
      )
      document.body.appendChild(card)
      assert.equal(card.querySelector('[data-innfo-component="qud-chip"]'), null)
      assert.equal(card.querySelector('.innfo-card-path'), null)
      assert.equal(card.querySelector('[data-innfo-component="tag-row"]'), null)
      assert.equal(card.querySelector('[data-innfo-component="rel-list"]'), null)
      assert.equal(card.querySelector('[data-ku-kind="field"]').textContent, 'f:v')
    })
  })

  describe('EditToggle & EditAnchor', () => {
    it('renders a pencil toggle with aria-pressed=false', () => {
      const t = UI.EditToggle({ doc: document })
      assert.equal(t.getAttribute('aria-pressed'), 'false')
      assert.ok(t.querySelector('svg'), 'pencil icon')
      assert.equal(t.getAttribute('aria-label'), 'Toggle edit controls on this card')
    })

    it('renders a labeled pencil anchor', () => {
      const a = UI.EditAnchor({ label: 'Edit element name' }, { doc: document })
      assert.equal(a.getAttribute('aria-label'), 'Edit element name')
      assert.ok(a.querySelector('svg'), 'pencil icon')
    })
  })

  describe('Review decoration', () => {
    function decorated() {
      const card = fullCard()
      document.body.appendChild(card)
      const elements = [
        {
          id: 'ecto-1',
          concept: 'Fleet Vehicles',
          name: 'Ecto-1',
          description: '1959 Cadillac Miller-Meteor.',
          fields: { role: 'Interceptor' },
          markers: { priority: 'high' },
          tags: ['iconic', 'nyc-fleet'],
          relations: [{ field: 'parked-at', target: 'hq-garage' }],
          hash: '0123456789abcdef',
        },
      ]
      const store = InnfoReview.createDraftStore(null, 'ghostbusters')
      const ctl = InnfoReview.createReviewController(document, { elements, store })
      ctl.enable()
      return { card, store, ctl }
    }

    it('adds toggle, name/desc/marker pencils and tag/relation controls', () => {
      const { card } = decorated()
      assert.ok(card.querySelector('[data-innfo-ctl="edit-toggle"]'), 'edit toggle')
      assert.ok(
        card.querySelector('.innfo-card-head [data-ku-kind="element"] [data-innfo-ctl="name-anchor"]'),
        'name pencil',
      )
      assert.ok(
        card.querySelector('.innfo-card-desc [data-innfo-ctl="desc-anchor"]'),
        'description pencil',
      )
      assert.ok(card.querySelector('[data-innfo-ctl="marker-anchor"]'), 'marker pencil')
      assert.equal(
        card.querySelectorAll('[data-innfo-ctl="tag-remove"]').length,
        2,
        'one remove per tag',
      )
      assert.ok(card.querySelector('[data-innfo-ctl="tag-add"]'), 'tag add')
      assert.ok(card.querySelector('[data-innfo-ctl="rel-retarget"]'), 'relation retarget')
      assert.ok(card.querySelector('[data-innfo-ctl="rel-unlink"]'), 'relation unlink')
      assert.ok(card.querySelector('[data-innfo-ctl="rel-add"]'), 'relation add')
    })

    it('edit toggle pins and unpins card editing state', () => {
      const { card } = decorated()
      const toggle = card.querySelector('[data-innfo-ctl="edit-toggle"]')
      toggle.dispatchEvent(new window.Event('click', { bubbles: true }))
      assert.equal(card.getAttribute('data-editing'), 'true')
      assert.equal(toggle.getAttribute('aria-pressed'), 'true')
      toggle.dispatchEvent(new window.Event('click', { bubbles: true }))
      assert.equal(card.getAttribute('data-editing'), 'false')
    })

    it('tag remove records a comment draft without a modal', () => {
      const { store, card } = decorated()
      card
        .querySelector('[data-innfo-ctl="tag-remove"]')
        .dispatchEvent(new window.Event('click', { bubbles: true }))
      const drafts = store.drafts()
      assert.equal(drafts.length, 1)
      assert.equal(drafts[0].kind, 'comment')
      assert.equal(drafts[0].field, 'tags')
      assert.match(drafts[0].comment, /removing tag/)
    })

    it('name pencil opens the KU modal', () => {
      const { card } = decorated()
      card
        .querySelector('[data-innfo-ctl="name-anchor"]')
        .dispatchEvent(new window.Event('click', { bubbles: true }))
      const modal = document.querySelector('[data-innfo-component="edit-modal"]')
      assert.ok(modal, 'KU modal opens')
      assert.match(modal.querySelector('h2').textContent, /Ecto-1/)
    })
  })
})

describe('Model viewer end-to-end (renderElement)', () => {
  it('renders qud, path and structured relations through boot()', () => {
    const dom = new JSDOM(
      `<!doctype html><html><head></head><body>
        <h1 id="doc-title"></h1><div id="doc-meta"></div>
        <nav id="rail"></nav><input id="search" type="search" />
        <main id="content"></main>
        <script type="application/json" id="innfo-schema">{"concepts": [{"name": "Fleet"}]}</script>
        <script type="application/json" id="innfo-model">{"meta": {"title": "T", "template": "ghostbusters"},
          "elements": [
            {"id": "ecto-1", "concept": "Fleet", "name": "Ecto-1", "description": "Car.",
             "fields": {"role": "Interceptor"}, "markers": {"priority": "high"},
             "relations": [{"field": "parked-at", "target": "hq-garage"}],
             "hash": "0123456789abcdef"},
            {"id": "hq-garage", "concept": "Fleet", "name": "HQ Garage",
             "fields": {}, "markers": {}, "hash": "abcdef0123456789"}
          ]}</script>
      </body></html>`,
      { url: 'http://localhost' },
    )
    // NOTE: globals stay on the inner dom for the rest of the process.
    // render-model-viewer schedules a deferred autoBoot on DOMContentLoaded;
    // restoring the outer globals first would crash that stray boot against
    // an empty document. Each test file gets its own process, so this is safe.
    global.window = dom.window
    global.document = dom.window.document
    global.location = dom.window.location
    global.CustomEvent = dom.window.CustomEvent
    const Viewer = require(join(consoleDir, 'render-model-viewer.js'))
    const res = Viewer.boot()
    assert.equal(res.ok, true)
    assert.equal(res.elements, 2)
    const card = global.document.querySelector('#el-ecto-1')
    assert.ok(card, 'card renders with domId')
    assert.ok(card.querySelector('[data-innfo-component="qud-chip"]'), 'qud chip')
    assert.match(
      card.querySelector('.innfo-card-path').textContent,
      /ghostbusters \/ Fleet \/ ecto-1/,
    )
    const rel = card.querySelector('[data-innfo-component="rel-list"] .innfo-rel-row')
    assert.ok(rel, 'structured relation list (no legacy .rel-list)')
    assert.equal(rel.querySelector('a').getAttribute('href'), '#el-hq-garage')
    assert.match(rel.textContent, /HQ Garage/)
    assert.equal(card.querySelector('.rel-list'), null, 'legacy relation markup gone')
    assert.equal(
      card.querySelector('[data-innfo-component="tag-row"]'),
      null,
      'no tag row without payload tags',
    )
  })

  function bootWithSourceUrl(sourceUrl) {
    const dom = new JSDOM(
      `<!doctype html><html><head></head><body>
        <h1 id="doc-title"></h1><div id="doc-meta"></div>
        <nav id="rail"></nav><input id="search" type="search" />
        <main id="content"></main>
        <script type="application/json" id="innfo-schema">{"concepts": [{"name": "Fleet"}]}</script>
        <script type="application/json" id="innfo-model">${JSON.stringify({
          meta: { title: 'T', sourceUrl },
          elements: [{ id: 'a', concept: 'Fleet', name: 'A', fields: {}, markers: {}, hash: '0123456789abcdef' }],
        })}</script>
      </body></html>`,
      { url: 'http://localhost' },
    )
    global.window = dom.window
    global.document = dom.window.document
    global.location = dom.window.location
    global.CustomEvent = dom.window.CustomEvent
    const Viewer = require(join(consoleDir, 'render-model-viewer.js'))
    assert.equal(Viewer.boot().ok, true)
    return dom.window.document.getElementById('doc-meta')
  }

  it('links only http(s) and relative source URLs; other schemes render as plain text', () => {
    const https = bootWithSourceUrl('https://example.com/doc')
    assert.equal(https.querySelector('a').getAttribute('href'), 'https://example.com/doc')
    const rel = bootWithSourceUrl('docs/model.md')
    assert.equal(rel.querySelector('a').getAttribute('href'), 'docs/model.md')
    for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<b>x</b>', 'vbscript:x']) {
      const meta = bootWithSourceUrl(bad)
      assert.equal(meta.querySelector('a'), null, `no link for ${bad}`)
      assert.equal(meta.querySelector('b'), null)
      assert.ok(meta.textContent.includes(bad.replace(/<b>x<\/b>/, '<b>x</b>')), 'shown as text')
    }
  })
})
