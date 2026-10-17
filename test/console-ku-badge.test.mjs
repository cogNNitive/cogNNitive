// S4/U4: the knowledge-unit badge family. One grammar per canonical unit kind;
// the legacy Marker primitive is gone (no MarkerChip, no marker kind).
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

describe('KuBadge family (S4/U4)', () => {
  let document

  beforeEach(() => {
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
      url: 'http://localhost',
    })
    document = dom.window.document
    global.window = dom.window
    global.document = document
  })

  it('exposes the six unit kinds and no marker kind', () => {
    for (const kind of ['document', 'element', 'concept', 'field', 'cell', 'reference']) {
      const badge = UI.KuBadge({ kind, label: kind, id: 'x', name: 'x', value: 'v' })
      assert.equal(badge.getAttribute('data-innfo-component'), 'ku-badge')
      assert.equal(badge.getAttribute('data-ku-kind'), kind)
    }
    const marker = UI.KuBadge({ kind: 'marker', label: 'Risk' })
    assert.notEqual(marker.getAttribute('data-ku-kind'), 'marker')
  })

  it('has retired the MarkerChip component', () => {
    assert.equal(UI.MarkerChip, undefined)
  })

  it('renders a field as name and value with data-field', () => {
    const badge = UI.KuBadge({ kind: 'field', name: 'owner', value: 'Slimer' })
    assert.equal(badge.getAttribute('data-field'), 'owner')
    assert.match(badge.textContent, /owner/)
    assert.match(badge.textContent, /Slimer/)
  })

  it('renders one value chip per value of a multi-valued field', () => {
    const badge = UI.KuBadge({ kind: 'field', name: 'tags', value: ['ai', 'core'] })
    const chips = [...badge.querySelectorAll('.innfo-ku-value-chip')].map((c) => c.textContent)
    assert.deepEqual(chips, ['ai', 'core'])
  })

  it('throws a TypeError naming KuBadge on invalid data', () => {
    assert.throws(() => UI.KuBadge(null), (err) => err instanceof TypeError && /KuBadge/.test(err.message))
  })

  it('element label text is inert', () => {
    const badge = UI.KuBadge({ kind: 'element', id: 'slimer', label: '<img src=x onerror=alert(1)>' })
    assert.equal(badge.querySelector('img'), null)
    assert.match(badge.textContent, /<img src=x onerror=alert\(1\)>/)
  })
})

describe('TagRow (S4/U4)', () => {
  let document

  beforeEach(() => {
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
      url: 'http://localhost',
    })
    document = dom.window.document
    global.window = dom.window
    global.document = document
  })

  it('renders one chip per tag, inert text, with the deterministic slot', () => {
    const row = UI.TagRow({ tags: ['pricing', 'ai'] })
    assert.equal(row.getAttribute('data-innfo-component'), 'tag-row')
    const chips = [...row.querySelectorAll('[data-tag]')]
    assert.deepEqual(chips.map((c) => c.getAttribute('data-tag')), ['pricing', 'ai'])
    for (const chip of chips) {
      assert.equal(chip.getAttribute('data-concept-slot'), String(UI.tagSlot(chip.getAttribute('data-tag'))))
    }
  })

  it('clicking a chip calls onTag with the tag name', () => {
    const seen = []
    const row = UI.TagRow({ tags: ['pricing'] }, { onTag: (t) => seen.push(t) })
    row.querySelector('[data-tag="pricing"]').click()
    assert.deepEqual(seen, ['pricing'])
  })

  it('a hostile tag renders as text', () => {
    const row = UI.TagRow({ tags: ['<img src=x onerror=alert(1)>'] })
    assert.equal(row.querySelector('img'), null)
    assert.match(row.textContent, /<img src=x onerror=alert\(1\)>/)
  })
})
