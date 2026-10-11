import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { bootConsole, consoleDir } from './helpers/console-boot.mjs'

const require = createRequire(import.meta.url)
const UI = require(join(consoleDir, 'ui-kit.js'))
const InnfoReview = require(join(consoleDir, 'review.js'))

function click(node) {
  node.dispatchEvent(new node.ownerDocument.defaultView.Event('click', { bubbles: true }))
}

describe('SankeyFlow (KU modal Connections)', () => {
  function dom() {
    const d = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' })
    global.window = d.window
    global.document = d.window.document
    return d.window.document
  }

  it('renders centre + incoming + outgoing nodes and links', () => {
    const document = dom()
    const flow = UI.SankeyFlow({
      center: 'Ecto-1',
      incoming: [{ label: 'HQ', field: 'parked-at' }],
      outgoing: [{ label: 'Venkman', field: 'driver' }],
    })
    document.body.appendChild(flow)
    assert.ok(flow.classList.contains('innfo-sankey'))
    assert.equal(flow.querySelectorAll('.innfo-sankey-node').length, 3)
    assert.equal(flow.querySelectorAll('.innfo-sankey-link').length, 2)
    assert.match(flow.textContent, /Ecto-1/)
    assert.match(flow.textContent, /HQ/)
    assert.match(flow.textContent, /Venkman/)
  })

  it('shows an empty state with no relations', () => {
    const document = dom()
    const flow = UI.SankeyFlow({ incoming: [], outgoing: [] })
    document.body.appendChild(flow)
    assert.ok(flow.querySelector('.innfo-sankey-empty'))
    assert.equal(flow.querySelectorAll('.innfo-sankey-node').length, 0)
  })

  it('EditModal exposes a Connections tab wired to the flow', () => {
    const document = dom()
    const modal = UI.EditModal({
      title: 'Ecto-1',
      connections: { center: 'Ecto-1', incoming: [{ label: 'HQ', field: 'parked-at' }], outgoing: [] },
    })
    document.body.appendChild(modal)
    const tab = [...modal.querySelectorAll('.innfo-modal-tab-btn')].find((b) => b.textContent === 'Connections')
    assert.ok(tab, 'Connections tab button exists')
    assert.ok(modal.querySelector('.innfo-sankey'), 'flow mounted in the modal')
    tab.dispatchEvent(new document.defaultView.Event('click', { bubbles: true }))
    const panel = modal.querySelector('[data-tab="connections"]')
    assert.equal(panel.style.display, 'block')
  })

  it('the review controller projects element relations into the modal flow', () => {
    const document = dom()
    const elements = [
      {
        id: 'a',
        concept: 'Fleet',
        name: 'Ecto-1',
        description: '',
        fields: { role: 'Interceptor' },
        markers: {},
        hash: '0'.repeat(16),
        relations: [{ field: 'parked-at', target: 'b', targetLabel: 'HQ Garage' }],
      },
      {
        id: 'b',
        concept: 'Fleet',
        name: 'HQ Garage',
        description: '',
        fields: {},
        markers: {},
        hash: '1'.repeat(16),
        relations: [{ field: 'houses', target: 'a', targetLabel: 'Ecto-1' }],
      },
    ]
    const store = InnfoReview.createDraftStore(null, 'fleet')
    const ctl = InnfoReview.createReviewController(document, { elements, store })
    assert.equal(ctl.openEdit({ elementId: 'a', field: 'role' }), true)
    const modal = document.querySelector('[data-innfo-component="edit-modal"]')
    assert.ok(modal, 'modal opened')
    const flow = modal.querySelector('.innfo-sankey')
    assert.ok(flow, 'sankey rendered from relations')
    assert.match(flow.textContent, /HQ Garage/)
    assert.match(flow.textContent, /Ecto-1/)
  })
})

describe('Concept guidance sidebar', () => {
  const MODEL = {
    meta: { title: 'Fleet Model', modelId: 'fleet', modelVersion: 'V_1-0-0' },
    elements: [
      { id: 'a', concept: 'Fleet', name: 'Ecto-1', fields: { role: 'Interceptor' }, hash: '0'.repeat(16) },
      { id: 'b', concept: 'Ghost', name: 'Slimer', fields: {}, hash: '1'.repeat(16) },
    ],
    matrices: [{ name: 'Duty', source: 'Fleet', target: 'Ghost', rows: [], cols: [], cells: {} }],
  }
  const SCHEMA = {
    concepts: [
      { name: 'Fleet', description: 'Vehicles in the fleet.', fields: [{ name: 'role', type: 'string' }] },
      { name: 'Ghost', description: '' },
    ],
  }

  it('is absent until a single concept is in focus', () => {
    const { document } = bootConsole({ model: MODEL, schema: SCHEMA })
    assert.equal(document.getElementById('innfo-concept-guide'), null)
  })

  it('renders description, fields, matrices and element count for the filtered concept', () => {
    const { document } = bootConsole({ model: MODEL, schema: SCHEMA })
    const search = document.getElementById('innfo-search')
    search.value = 'concept:Fleet'
    search.dispatchEvent(new document.defaultView.Event('input', { bubbles: true }))
    const guide = document.getElementById('innfo-concept-guide')
    assert.ok(guide, 'guide sidebar created')
    assert.match(guide.textContent, /Vehicles in the fleet\./)
    assert.match(guide.textContent, /role/)
    assert.match(guide.textContent, /Duty/)
    assert.match(guide.textContent, /1 element/)
  })

  it('disappears when the concept filter is cleared', () => {
    const { document } = bootConsole({ model: MODEL, schema: SCHEMA })
    const search = document.getElementById('innfo-search')
    search.value = 'concept:Fleet'
    search.dispatchEvent(new document.defaultView.Event('input', { bubbles: true }))
    assert.ok(document.getElementById('innfo-concept-guide'))
    search.value = ''
    search.dispatchEvent(new document.defaultView.Event('input', { bubbles: true }))
    assert.equal(document.getElementById('innfo-concept-guide'), null)
  })
})

describe('Media lightbox', () => {
  const MODEL = {
    meta: { title: 'Media Model', modelId: 'media', modelVersion: 'V_1-0-0' },
    elements: [
      {
        id: 'a',
        concept: 'Photo',
        name: 'Shot',
        fields: { photo: './a.png', second: './b.jpg' },
        hash: '0'.repeat(16),
      },
    ],
  }

  it('opens a dialog from the card thumbnail with all element images', () => {
    const { document } = bootConsole({ model: MODEL })
    const thumb = document.querySelector('#innfo-content .innfo-card-thumb')
    assert.ok(thumb && thumb.tagName === 'IMG', 'image chip present')
    click(thumb)
    const dialog = document.getElementById('innfo-media-dialog')
    assert.ok(dialog, 'media dialog created')
    assert.equal(dialog.querySelector('.innfo-media-image').getAttribute('src'), './a.png')
    assert.ok(dialog.querySelectorAll('.innfo-media-nav').length >= 2 || dialog.querySelector('.innfo-media-count'))
    assert.equal(dialog.querySelector('.innfo-media-count').textContent, '1 / 2')
  })

  it('advances to the next image', () => {
    const { document } = bootConsole({ model: MODEL })
    click(document.querySelector('#innfo-content .innfo-card-thumb'))
    const dialog = document.getElementById('innfo-media-dialog')
    const next = [...dialog.querySelectorAll('.innfo-media-nav')].find((b) => b.textContent === '›')
    click(next)
    assert.equal(dialog.querySelector('.innfo-media-image').getAttribute('src'), './b.jpg')
    assert.equal(dialog.querySelector('.innfo-media-count').textContent, '2 / 2')
  })
})
