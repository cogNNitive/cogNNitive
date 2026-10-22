import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { JSDOM } from 'jsdom'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..')
const require = createRequire(import.meta.url)
const runtime = require(join(repoRoot, 'iNNfo/specs/bluepriNNts/console/nn-runtime.js'))

const PAGE = 100

// nn-runtime's `el()` reads the global `document`; the console browser does too.
function mountDoc() {
  const dom = new JSDOM('<!doctype html><html><body><div id="innfo-content"></div></body></html>')
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  return dom.window.document
}

function elements(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: 'e' + i,
    concept: 'Thing',
    name: 'Element ' + i,
    fields: { a: 'value ' + i },
  }))
}

describe('console progressive render window', () => {
  it('table view caps the first pass and appends the rest on demand', () => {
    const doc = mountDoc()
    const total = PAGE + 37
    runtime.mountElementTable(
      doc,
      elements(total),
      [],
      [],
      { key: null, dir: 'asc' },
      null,
      () => {},
      'm',
    )

    const rows = () => doc.querySelectorAll('.innfo-element-table tbody tr').length
    assert.equal(rows(), PAGE, 'first pass renders exactly one page')

    const more = doc.querySelector('.innfo-load-more')
    assert.ok(more, 'a "show more" control is offered')
    more.click()

    assert.equal(rows(), total, 'second pass appends the remainder')
    assert.equal(doc.querySelector('.innfo-load-more'), null, 'control disappears once complete')
  })

  it('a result smaller than one page renders whole with no control', () => {
    const doc = mountDoc()
    runtime.mountElementBadges(doc, elements(10), [], [], {}, 'm')
    assert.equal(doc.querySelectorAll('[data-innfo-component="ku-unit"]').length, 10)
    assert.equal(doc.querySelector('.innfo-load-more'), null)
  })

  it('badges view also windows a broad result', () => {
    const doc = mountDoc()
    const total = PAGE + 5
    runtime.mountElementBadges(doc, elements(total), [], [], {}, 'm')
    assert.equal(doc.querySelectorAll('[data-innfo-component="ku-unit"]').length, PAGE)
    doc.querySelector('.innfo-load-more').click()
    assert.equal(doc.querySelectorAll('[data-innfo-component="ku-unit"]').length, total)
  })
})
