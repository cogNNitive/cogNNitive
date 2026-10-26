import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { bootConsole, nnConsole } from './helpers/console-boot.mjs'

const MODEL = {
  meta: { title: 'Filter Lab', modelId: 'filter-lab', modelVersion: 'V_1-0-0' },
  elements: [
    { id: 'a1', concept: 'Alpha', name: 'element 1a', fields: {}, hash: '0'.repeat(16) },
    { id: 'b1', concept: 'Beta', name: 'B', fields: {}, hash: '0'.repeat(16) },
  ],
  matrices: [],
}
const SCHEMA = { concepts: [{ name: 'Alpha' }, { name: 'Beta' }] }

function setQuery(document, value) {
  const search = document.getElementById('nn-search')
  search.value = value
  search.dispatchEvent(new document.defaultView.Event('input', { bubbles: true }))
}

function click(node) {
  node.dispatchEvent(new node.ownerDocument.defaultView.Event('click', { bubbles: true }))
}

describe('explorer views show an empty state when the filter matches nothing', () => {
  for (const mode of ['sheets', 'cards', 'badges', 'table']) {
    it(`${mode} view renders the no-match message`, () => {
      const { document } = bootConsole({ model: MODEL, schema: SCHEMA })
      click(document.querySelector(`.nn-viewmode-btn[data-mode="${mode}"]`))
      setQuery(document, 'zzz-no-such-thing')
      assert.match(
        document.getElementById('nn-content').textContent,
        /No elements match the current filter\./,
      )
    })
  }
})

describe('removing a free-text pill keeps the other phrases intact', () => {
  it('re-quotes multiword tokens when rebuilding the query', () => {
    const { document } = bootConsole({ model: MODEL, schema: SCHEMA })
    const toolbar = document.querySelector('.nn-toolbar')
    for (const id of ['nn-filter-facets', 'nn-active-filters']) {
      const host = document.createElement('div')
      host.id = id
      toolbar.appendChild(host)
    }
    let next = null
    nnConsole.renderFilterBar(
      document,
      { meta: MODEL.meta, elements: MODEL.elements, schema: SCHEMA },
      (q) => {
        next = q
      },
      '"element 1a" zzz status:draft',
    )
    const pills = [...document.querySelectorAll('#nn-active-filters .nn-active-filter-pill')]
    const zzz = pills.find((p) => p.textContent.includes('zzz'))
    assert.ok(zzz, 'zzz pill rendered')
    click(zzz.querySelector('.nn-filter-pill-remove'))
    assert.equal(next, '"element 1a" status:draft')
  })
})

describe('an unknown is: value is flagged in the active-filter pill', () => {
  function pillFor(query) {
    const { document } = bootConsole({ model: MODEL, schema: SCHEMA })
    const toolbar = document.querySelector('.nn-toolbar')
    for (const id of ['nn-filter-facets', 'nn-active-filters']) {
      const host = document.createElement('div')
      host.id = id
      toolbar.appendChild(host)
    }
    nnConsole.renderFilterBar(
      document,
      { meta: MODEL.meta, elements: MODEL.elements, schema: SCHEMA },
      () => {},
      query,
    )
    return document.querySelector('#nn-active-filters .nn-active-filter-pill[data-filter-key="is"]')
  }

  it('marks is:bogus as unknown', () => {
    const pill = pillFor('is:bogus')
    assert.ok(pill, 'is pill rendered')
    assert.equal(pill.getAttribute('data-filter-invalid'), 'true')
    assert.match(pill.getAttribute('title') || '', /unknown.*draft, reviewed, changed/i)
  })

  it('does not mark valid is: values', () => {
    const pill = pillFor('is:draft')
    assert.ok(pill)
    assert.equal(pill.getAttribute('data-filter-invalid'), null)
  })
})
