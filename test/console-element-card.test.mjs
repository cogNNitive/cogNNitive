import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
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

  describe('Path, tags, relations', () => {
    it('a hostile tag is inert text and an empty tag list renders no row', () => {
      const hostile = '<img src=x onerror=alert(1)>'
      const card = UI.ElementCard({ id: 'h', name: 'H', tags: [hostile] }, { doc: document })
      document.body.appendChild(card)
      assert.equal(card.querySelector('img'), null)
      assert.equal(card.querySelector('[data-tag]').textContent, hostile)
      const empty = UI.ElementCard({ id: 'e', name: 'E', tags: [] }, { doc: document })
      assert.equal(empty.querySelector('[data-innfo-component="tag-row"]'), null)
    })

    it('a chip calls onTag with its tag; without onTag chips are not interactive', () => {
      const seen = []
      const card = UI.ElementCard({ id: 't', name: 'T', tags: ['pricing', 'ai'] }, { doc: document, onTag: (t) => seen.push(t) })
      document.body.appendChild(card)
      card.querySelector('[data-tag="pricing"]').dispatchEvent(new window.Event('click', { bubbles: true }))
      assert.deepEqual(seen, ['pricing'])
      const plain = UI.ElementCard({ id: 'p', name: 'P', tags: ['x'] }, { doc: document })
      assert.equal(plain.querySelector('[data-tag]').getAttribute('role'), null)
    })

    it('review mode still offers "+ tag" on an element without tags', () => {
      const card = UI.ElementCard({ id: 'u', name: 'U', fields: [{ name: 'f', value: 'v' }] }, { doc: document, domId: 'el-u' })
      document.body.appendChild(card)
      const elements = [{ id: 'u', concept: 'C', name: 'U', fields: { f: 'v' }, tags: [], hash: '0123456789abcdef' }]
      const store = InnfoReview.createDraftStore(null, 'm')
      const ctl = InnfoReview.createReviewController(document, {
        elements,
        store,
        meta: { modelId: 'ghostbusters' },
      })
      ctl.enable()
      assert.ok(card.querySelector('[data-innfo-ctl="tag-add"]'), 'tag add on an untagged card')
      ctl.disable()
      assert.equal(card.querySelector('[data-innfo-component="tag-row"]'), null, 'the helper row goes away with review mode')
    })

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
      assert.match(
        rel.querySelector('[data-ku-kind="element"]').getAttribute('data-ku-address'),
        /hq-garage$/,
      )
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
      const value = card.querySelector('[data-ku-kind="value"]')
      assert.equal(value.getAttribute('data-field'), 'f')
      assert.match(value.textContent, /f[\s\S]*v/)
    })

    it('renders a concept icon thumbnail fallback when no image field is present', () => {
      const card1 = UI.ElementCard(
        { id: 'e1a', name: 'Element 1A', conceptId: 'Concept 1', concept: { index: 0, slot: 1 } },
        { doc: document },
      )
      const thumb1 = card1.querySelector('.innfo-card-thumb.innfo-card-thumb--concept')
      assert.ok(thumb1, 'concept icon thumb rendered for Concept 1')
      assert.equal(thumb1.getAttribute('data-concept-icon'), 'box')
      assert.ok(thumb1.querySelector('svg'), 'SVG icon rendered inside concept thumb')

      const cardEdge = UI.ElementCard(
        { id: 'probe', name: 'Probe', conceptId: 'Edge Cases', concept: { index: 2, slot: 3 } },
        { doc: document },
      )
      const thumbEdge = cardEdge.querySelector('.innfo-card-thumb.innfo-card-thumb--concept')
      assert.ok(thumbEdge, 'concept icon thumb rendered for Edge Cases')
      assert.equal(thumbEdge.getAttribute('data-concept-icon'), 'flask-conical')
    })
  })

  describe('EditAnchor', () => {
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
      const ctl = InnfoReview.createReviewController(document, {
        elements,
        store,
        meta: { modelId: 'ghostbusters' },
      })
      ctl.enable()
      return { card, store, ctl }
    }

    it('adds name/desc pencils and tag/relation controls', () => {
      const { card } = decorated()
      assert.equal(
        card.querySelector('[data-innfo-ctl="edit-toggle"]'),
        null,
        'no per-card edit toggle',
      )
      assert.equal(
        card.querySelector('[data-innfo-ctl="name-anchor"]'),
        null,
        'no permanent name pencil: editing lives in the badge flyout',
      )
      assert.equal(
        card.querySelector('[data-innfo-ctl="desc-anchor"]'),
        null,
        'no permanent description pencil',
      )
      assert.ok(card.querySelector('.innfo-ku-more'), 'the badge carries the + affordance')
      assert.equal(
        card.querySelector('[data-innfo-ctl="marker-anchor"]'),
        null,
        'no marker pencil (the Marker primitive is gone)',
      )
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

    it('tag remove records a correction on tags with the full new array', () => {
      const { store, card } = decorated()
      card
        .querySelector('[data-innfo-ctl="tag-remove"]')
        .dispatchEvent(new window.Event('click', { bubbles: true }))
      const drafts = store.drafts()
      assert.equal(drafts.length, 1)
      assert.equal(drafts[0].kind, 'correction')
      assert.equal(drafts[0].field, 'tags')
      assert.deepEqual(drafts[0].proposed, ['nyc-fleet'])
    })

    it('the badge carries the + flyout, and openEdit opens the KU modal', () => {
      const { card, ctl } = decorated()
      const wrap = card.querySelector('.innfo-card-head [data-ku-kind="element"]').closest('.innfo-ku-wrap')
      assert.ok(wrap.querySelector('.innfo-ku-more'), 'the + affordance sits beside the badge')
      assert.ok(wrap.querySelector('[data-ku-action="edit"]'), 'the flyout carries the edit action')
      // This fixture wires a bare controller with no Ku delegation, so the entry point
      // under test is the controller API (the runtime's delegated listener is covered
      // by console-ku-actions).
      assert.equal(typeof ctl.openEdit, 'function')
      assert.equal(ctl.openEdit({ elementId: 'ecto-1', field: '__name' }), true)
      const modal = document.querySelector('[data-innfo-component="edit-modal"]')
      assert.ok(modal, 'KU modal opens')
      assert.match(modal.querySelector('h2').textContent, /Ecto-1/)
    })
  })
})

describe('Single shell end-to-end (runtime renderElement)', () => {
  it('renders qud, path and structured relations through boot()', () => {
    const model = {
      meta: { title: 'T', template: 'ghostbusters' },
      elements: [
        {
          id: 'ecto-1',
          concept: 'Fleet',
          name: 'Ecto-1',
          description: 'Car.',
          fields: { role: 'Interceptor' },
          markers: { priority: 'high' },
          relations: [{ field: 'parked-at', target: 'hq-garage' }],
          hash: '0123456789abcdef',
          modelFile: 'ghostbusters_NN.md',
        },
        {
          id: 'hq-garage',
          concept: 'Fleet',
          name: 'HQ Garage',
          fields: {},
          markers: {},
          hash: 'abcdef0123456789',
        },
      ],
    }
    const filled = readFileSync(join(consoleDir, 'artifact_shell.html'), 'utf8')
      .replace(
        /(<script type="application\/json" id="innfo-schema">)[\s\S]*?(<\/script>)/,
        '$1{"concepts": [{"name": "Fleet"}]}$2',
      )
      .replace(
        /(<script type="application\/json" id="innfo-model">)[\s\S]*?(<\/script>)/,
        `$1${JSON.stringify(model)}$2`,
      )
      .replace(
        /(<script type="application\/json" id="innfo-config">)[\s\S]*?(<\/script>)/,
        '$1{"needs":["concept-rail","fulltext-search"]}$2',
      )
      .replace(/<script\b[^>]*\bsrc=[^>]*><\/script>/g, '')
    const dom = new JSDOM(filled, { url: 'http://localhost' })
    // The shell stays on the inner dom for the rest of the process (each test
    // file has its own process).
    global.window = dom.window
    global.document = dom.window.document
    global.location = dom.window.location
    global.CustomEvent = dom.window.CustomEvent
    global.Event = dom.window.Event
    global.InnfoUI = UI
    global.InnfoReview = InnfoReview
    const InnfoConsole = require(join(consoleDir, 'innfo-runtime.js'))
    InnfoConsole.boot(global.document)
    const card = global.document.querySelector('#el-ecto-1')
    assert.ok(card, 'card renders with domId')
    assert.match(
      card.querySelector('.innfo-card-path').textContent,
      /ghostbusters_NN\.md/,
    )
    const rel = card.querySelector('[data-innfo-component="rel-list"] .innfo-rel-row')
    assert.ok(rel, 'structured relation list (no legacy .rel-list)')
    assert.match(
      rel.querySelector('[data-ku-kind="element"]').getAttribute('data-ku-address'),
      /hq-garage$/,
    )
    assert.equal(card.querySelector('.rel-list'), null, 'legacy relation markup gone')
    assert.equal(
      card.querySelector('[data-innfo-component="tag-row"]'),
      null,
      'no tag row without payload tags',
    )
  })

  // The sourceUrl link contract moved to `console-source-url.test.ts` and the
  // runtime's `safeSourceHref` (SCS S1.5).
})
