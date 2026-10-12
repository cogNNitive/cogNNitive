import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
const runtimePath = join(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console', 'innfo-runtime.js')
const InnfoConsole = require(runtimePath)

describe('Domain Console Hierarchy & Faceted Omnibar Contract', () => {
  test('filterElements matches by model:, file:, tag:, and text tokens', () => {
    assert.ok(InnfoConsole, 'InnfoConsole module loaded')

    const elements = [
      {
        id: 'el-1',
        name: 'CEO Stakeholder',
        concept: 'Stakeholders',
        modelId: 'business-model',
        modelFile: 'business_model.md',
        modelTitle: 'Business Model',
        tags: ['critical', 'executive'],
      },
      {
        id: 'el-2',
        name: 'Ghost Risk',
        concept: 'Risks',
        modelId: 'analysis',
        modelFile: 'analysis.md',
        modelTitle: 'Strategic Analysis',
        tags: ['paranormal'],
      },
    ]

    // Match by model facet
    const byModel = InnfoConsole.filterElements(elements, 'model:business')
    assert.equal(byModel.length, 1)
    assert.equal(byModel[0].id, 'el-1')

    // Match by file facet
    const byFile = InnfoConsole.filterElements(elements, 'file:analysis.md')
    assert.equal(byFile.length, 1)
    assert.equal(byFile[0].id, 'el-2')

    // Match by tag facet
    const byTag = InnfoConsole.filterElements(elements, 'tag:paranormal')
    assert.equal(byTag.length, 1)
    assert.equal(byTag[0].id, 'el-2')

    // Combined multi-facet query (AND between facets, OR within same facet)
    const combined = InnfoConsole.filterElements(elements, 'model:business tag:executive')
    assert.equal(combined.length, 1)
    assert.equal(combined[0].id, 'el-1')

    // Multi-model OR filtering
    const multiModel = InnfoConsole.filterElements(elements, 'model:business model:analysis')
    assert.equal(multiModel.length, 2)

    // Non-matching facet
    const noMatch = InnfoConsole.filterElements(elements, 'model:analysis tag:executive')
    assert.equal(noMatch.length, 0)
  })

  test('renderFilterBar renders facet dropdowns and toggles checkboxes', () => {
    const dom = new JSDOM(
      `<!doctype html>
      <html>
        <body>
          <div class="innfo-toolbar">
            <input id="innfo-search" type="search" />
            <div id="innfo-filter-facets"></div>
            <div id="innfo-active-filters"></div>
          </div>
        </body>
      </html>`,
    )
    const { document } = dom.window
    global.window = dom.window
    global.document = document

    const state = {
      meta: {
        models: [
          { id: 'business-model', title: 'Business Model', filePath: 'business_model.md', elementCount: 1 },
          { id: 'analysis', title: 'Analysis', filePath: 'analysis.md', elementCount: 1 },
        ],
      },
      elements: [
        { id: 'el-1', concept: 'Stakeholders', modelId: 'business-model' },
        { id: 'el-2', concept: 'Risks', modelId: 'analysis' },
      ],
    }

    let emittedQuery = null
    InnfoConsole.renderFilterBar(
      document,
      state,
      (q) => {
        emittedQuery = q
      },
      'model:business-model',
    )

    const host = document.getElementById('innfo-filter-facets')
    const dropdowns = host.querySelectorAll('.innfo-facet-dropdown')
    assert.equal(dropdowns.length, 2, 'renders 2 dropdowns (models, concepts)')

    // Check that model:business-model checkbox is checked
    const checkboxes = dropdowns[0].querySelectorAll('input[type="checkbox"]')
    assert.equal(checkboxes.length, 2)
    assert.equal(checkboxes[0].checked, true)
    assert.equal(checkboxes[1].checked, false)

    // Ticking second checkbox emits multi-model query
    checkboxes[1].checked = true
    checkboxes[1].dispatchEvent(new dom.window.Event('change'))
    assert.ok(emittedQuery.includes('model:business-model'))
    assert.ok(emittedQuery.includes('analysis'))
  })

  test('renderRail renders clean model and concept lists', () => {
    const dom = new JSDOM(
      `<!doctype html>
      <html>
        <body>
          <div id="innfo-layout">
            <nav id="innfo-rail"></nav>
          </div>
        </body>
      </html>`,
    )
    const { document } = dom.window
    global.window = dom.window
    global.document = document

    const concepts = [{ name: 'Stakeholders' }, { name: 'Risks' }]
    const counts = { Stakeholders: 1, Risks: 1 }
    const state = {
      meta: {
        models: [
          { id: 'business-model', title: 'Business Model', filePath: 'business_model.md', elementCount: 1 },
          { id: 'analysis', title: 'Analysis', filePath: 'analysis.md', elementCount: 1 },
        ],
      },
      elements: [
        { id: 'el-1', concept: 'Stakeholders', modelId: 'business-model' },
        { id: 'el-2', concept: 'Risks', modelId: 'analysis' },
      ],
    }

    let selectedFilter = null
    InnfoConsole.renderRail(
      document,
      concepts,
      counts,
      {},
      (val) => {
        selectedFilter = val
      },
      state,
    )

    const rail = document.getElementById('innfo-rail')
    const modelItems = rail.querySelectorAll('[data-model]')
    assert.equal(modelItems.length, 2, 'renders 2 model rail items')

    modelItems[0].click()
    assert.equal(selectedFilter, 'model:business-model')

    const conceptItems = rail.querySelectorAll('[data-concept]')
    assert.equal(conceptItems.length, 2, 'renders 2 concept rail items')

    conceptItems[1].click()
    assert.equal(selectedFilter, 'concept:Risks')
  })
})

describe('Hostile text renders as text, never as markup', () => {
  const HOSTILE_IMG = '<img src=x onerror=alert(1)>'
  const HOSTILE_SVG = '<svg onload=alert(1)>'

  function boot(body) {
    const dom = new JSDOM(`<!doctype html><html><body>${body}</body></html>`)
    global.window = dom.window
    global.document = dom.window.document
    return dom.window.document
  }

  test('model title and concept name in the rail are inert', () => {
    const document = boot('<nav id="innfo-rail"></nav>')
    const hostileConcept = '<script>x()</script>'
    const state = {
      meta: { models: [{ id: 'm1', title: HOSTILE_IMG, filePath: 'm1.md', elementCount: 1 }, { id: 'm2', title: 'Two', filePath: 'm2.md', elementCount: 1 }] },
      elements: [{ id: 'e1', concept: hostileConcept, modelId: 'm1' }],
    }
    InnfoConsole.renderRail(document, [{ name: hostileConcept }], { [hostileConcept]: 1 }, {}, () => {}, state)

    const rail = document.getElementById('innfo-rail')
    assert.equal(rail.querySelector('img'), null)
    assert.equal(rail.querySelector('script'), null)
    assert.ok(rail.textContent.includes(HOSTILE_IMG), 'model title appears literally')
    assert.ok(rail.textContent.includes(hostileConcept), 'concept name appears literally')
  })

  test('hostile concept color and element count cannot break out of the style attribute', () => {
    const document = boot('<nav id="innfo-rail"></nav>')
    const state = {
      meta: { models: [{ id: 'm1', title: 'One', filePath: 'm1.md', elementCount: '1</span><img src=x onerror=1>' }] },
      elements: [{ id: 'e1', concept: 'Risks', modelId: 'm1' }],
    }
    const color = 'red"><img src=x onerror=1>'
    InnfoConsole.renderRail(document, [{ name: 'Risks', color }], { Risks: 1 }, {}, () => {}, state)

    const rail = document.getElementById('innfo-rail')
    assert.equal(rail.querySelector('img'), null)
    assert.equal(rail.querySelector('[onerror]'), null)
    const dot = rail.querySelector('.innfo-concept-dot')
    assert.ok(dot, 'dot still rendered with a fallback color')
    assert.ok(!dot.getAttribute('style').includes('onerror'))
  })

  test('search token and operator value in the filter pills are inert', () => {
    const document = boot('<input id="innfo-search" /><div id="innfo-filter-facets"></div><div id="innfo-active-filters"></div>')
    InnfoConsole.renderFilterBar(document, { meta: { models: [] }, elements: [] }, () => {}, `"${HOSTILE_SVG}" tag:<b>x</b>`)

    const pills = document.getElementById('innfo-active-filters')
    assert.ok(pills.children.length > 0, 'pills rendered')
    assert.equal(pills.querySelector('svg'), null)
    assert.equal(pills.querySelector('b'), null)
    assert.ok(pills.textContent.includes(HOSTILE_SVG))
  })

  test('validation error strings are inert', () => {
    const document = boot('<dialog id="innfo-feedback-modal"><div data-innfo="errors"></div></dialog>')
    InnfoConsole.renderErrors(document, [HOSTILE_IMG])

    const box = document.querySelector('[data-innfo="errors"]')
    assert.equal(box.querySelector('img'), null)
    assert.ok(box.textContent.includes(HOSTILE_IMG))
  })
})
