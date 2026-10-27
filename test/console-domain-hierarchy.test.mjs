import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
const runtimePath = join(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console', 'nn-runtime.js')
const nnConsole = require(runtimePath)

describe('Domain Console Hierarchy & Faceted Omnibar Contract', () => {
  test('filterElements matches by model:, file:, tags:, and text tokens', () => {
    assert.ok(nnConsole, 'nnConsole module loaded')

    const elements = [
      {
        id: 'el-1',
        name: 'CEO Stakeholder',
        concept: 'Stakeholders',
        modelId: 'business-model',
        modelFile: 'business_model.md',
        modelTitle: 'Business Model',
        fields: { tags: ['critical', 'executive'] },
      },
      {
        id: 'el-2',
        name: 'Ghost Risk',
        concept: 'Risks',
        modelId: 'analysis',
        modelFile: 'analysis.md',
        modelTitle: 'Strategic Analysis',
        fields: { tags: ['paranormal'] },
      },
    ]

    // Match by model facet
    const byModel = nnConsole.filterElements(elements, 'model:business')
    assert.equal(byModel.length, 1)
    assert.equal(byModel[0].id, 'el-1')

    // Match by file facet
    const byFile = nnConsole.filterElements(elements, 'file:analysis.md')
    assert.equal(byFile.length, 1)
    assert.equal(byFile[0].id, 'el-2')

    // Match by tag facet (tags is an ordinary Field, exact membership)
    const byTag = nnConsole.filterElements(elements, 'tags:paranormal')
    assert.equal(byTag.length, 1)
    assert.equal(byTag[0].id, 'el-2')

    // Combined multi-facet query (AND between facets; tags: is AND, model: is OR)
    const combined = nnConsole.filterElements(elements, 'model:business tags:executive')
    assert.equal(combined.length, 1)
    assert.equal(combined[0].id, 'el-1')

    // Multi-model OR filtering
    const multiModel = nnConsole.filterElements(elements, 'model:business model:analysis')
    assert.equal(multiModel.length, 2)

    // Non-matching facet
    const noMatch = nnConsole.filterElements(elements, 'model:analysis tags:executive')
    assert.equal(noMatch.length, 0)

    // Quoted facet value with spaces after colon (e.g. concept:"Concept 1" or model:"Business Model")
    const withSpaces = [
      ...elements,
      {
        id: 'el-3',
        name: 'Element 1A',
        concept: 'Concept 1',
        modelId: 'testlab',
        modelFile: 'TestLab_coverage_TestLab_NN.md',
        modelTitle: 'TestLab Coverage Model',
        fields: { tags: [] },
      },
    ]
    const byQuotedConcept = nnConsole.filterElements(withSpaces, 'concept:"Concept 1"')
    assert.equal(byQuotedConcept.length, 1)
    assert.equal(byQuotedConcept[0].id, 'el-3')

    const byQuotedModel = nnConsole.filterElements(withSpaces, 'model:"Business Model"')
    assert.equal(byQuotedModel.length, 1)
    assert.equal(byQuotedModel[0].id, 'el-1')
  })

  test('renderFilterBar renders facet dropdowns and toggles checkboxes', () => {
    const dom = new JSDOM(
      `<!doctype html>
      <html>
        <body>
          <div class="nn-toolbar">
            <input id="nn-search" type="search" />
            <div id="nn-filter-facets"></div>
            <div id="nn-active-filters"></div>
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
    nnConsole.renderFilterBar(
      document,
      state,
      (q) => {
        emittedQuery = q
      },
      'model:business-model',
    )

    const host = document.getElementById('nn-filter-facets')
    const dropdowns = host.querySelectorAll('.nn-facet-dropdown')
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
          <div id="nn-layout">
            <nav id="nn-rail"></nav>
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
    nnConsole.renderRail(
      document,
      concepts,
      counts,
      {},
      (val) => {
        selectedFilter = val
      },
      state,
    )

    const rail = document.getElementById('nn-rail')
    const modelItems = rail.querySelectorAll('[data-model]')
    assert.equal(modelItems.length, 2, 'renders 2 model rail items')

    modelItems[0].click()
    assert.equal(selectedFilter, 'model:business-model')

    const conceptItems = rail.querySelectorAll('[data-concept]')
    assert.equal(conceptItems.length, 2, 'renders 2 concept rail items')

    // A concept row is scoped to the model it hangs off.
    conceptItems[1].click()
    assert.equal(selectedFilter, 'model:analysis concept:Risks')
  })

  test('renderRail groups models by blueprint when the domaiNN has more than one', () => {
    const dom = new JSDOM(
      `<!doctype html>
      <html>
        <body>
          <div id="nn-layout">
            <nav id="nn-rail"></nav>
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
          { id: 'a1', title: 'Episode A', filePath: 'a1.md', elementCount: 2, blueprint: 'video-script' },
          { id: 'b1', title: 'Series B', filePath: 'b1.md', elementCount: 1, blueprint: 'video' },
          { id: 'a2', title: 'Episode B', filePath: 'a2.md', elementCount: 3, blueprint: 'video-script' },
        ],
      },
      elements: [],
    }

    nnConsole.renderRail(document, [], {}, {}, () => {}, state)
    const rail = document.getElementById('nn-rail')

    // One accordion section per blueprint, biggest group first, all collapsed.
    const sections = Array.from(rail.querySelectorAll('details[name="nn-rail-blueprint"]'))
    assert.deepEqual(
      sections.map((d) => d.querySelector('summary').textContent),
      ['video-script (2)', 'video (1)'],
    )
    assert.deepEqual(
      sections.map((d) => d.open),
      [false, false],
      'blueprint sections start collapsed',
    )
    assert.deepEqual(
      sections.map((d) => d.getAttribute('name')),
      ['nn-rail-blueprint', 'nn-rail-blueprint'],
      'a named details group keeps one blueprint open at a time',
    )

    // Grouping adds a level; it never drops a model.
    assert.equal(rail.querySelectorAll('[data-model]').length, 3)

    // A model nested inside a group still drives the model: facet.
    let selectedFilter = null
    nnConsole.renderRail(document, [], {}, {}, (v) => {
      selectedFilter = v
    }, state)
    const items = document.getElementById('nn-rail').querySelectorAll('[data-model]')
    items[0].click()
    assert.equal(selectedFilter, 'model:a1')
    items[2].click()
    assert.equal(selectedFilter, 'model:b1')
  })

  test('renderRail keeps the flat list when every model shares one blueprint', () => {
    const dom = new JSDOM(
      `<!doctype html>
      <html>
        <body>
          <nav id="nn-rail"></nav>
        </body>
      </html>`,
    )
    const { document } = dom.window
    global.window = dom.window
    global.document = document

    const state = {
      meta: {
        models: [
          { id: 'm1', title: 'One', filePath: 'm1.md', elementCount: 1, blueprint: 'business-model' },
          { id: 'm2', title: 'Two', filePath: 'm2.md', elementCount: 1, blueprint: 'business-model' },
        ],
      },
      elements: [],
    }

    nnConsole.renderRail(document, [], {}, {}, () => {}, state)
    const rail = document.getElementById('nn-rail')
    assert.equal(
      rail.querySelectorAll('details[name="nn-rail-blueprint"]').length,
      0,
      'no accordion section for a lone blueprint',
    )
    assert.equal(rail.querySelectorAll('[data-model]').length, 2)
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
    const document = boot('<nav id="nn-rail"></nav>')
    const hostileConcept = '<script>x()</script>'
    const state = {
      meta: { models: [{ id: 'm1', title: HOSTILE_IMG, filePath: 'm1.md', elementCount: 1 }, { id: 'm2', title: 'Two', filePath: 'm2.md', elementCount: 1 }] },
      elements: [{ id: 'e1', concept: hostileConcept, modelId: 'm1' }],
    }
    nnConsole.renderRail(document, [{ name: hostileConcept }], { [hostileConcept]: 1 }, {}, () => {}, state)

    const rail = document.getElementById('nn-rail')
    assert.equal(rail.querySelector('img'), null)
    assert.equal(rail.querySelector('script'), null)
    assert.ok(rail.textContent.includes(HOSTILE_IMG), 'model title appears literally')
    assert.ok(rail.textContent.includes(hostileConcept), 'concept name appears literally')
  })

  test('blueprint group label in the rail is inert', () => {
    const dom = new JSDOM(
      `<!doctype html>
      <html>
        <body>
          <nav id="nn-rail"></nav>
        </body>
      </html>`,
    )
    const document = dom.window.document
    global.window = dom.window
    global.document = document

    const state = {
      meta: {
        models: [
          { id: 'm1', title: 'One', filePath: 'm1.md', elementCount: 1, blueprint: HOSTILE_IMG },
          { id: 'm2', title: 'Two', filePath: 'm2.md', elementCount: 1, blueprint: 'video' },
        ],
      },
      elements: [],
    }

    nnConsole.renderRail(document, [], {}, {}, () => {}, state)

    const rail = document.getElementById('nn-rail')
    assert.equal(rail.querySelector('img'), null)
    assert.equal(rail.querySelector('[onerror]'), null)
    assert.ok(rail.textContent.includes(HOSTILE_IMG), 'hostile blueprint name appears literally')
  })

  test('hostile concept color and element count cannot break out of the style attribute', () => {
    const document = boot('<nav id="nn-rail"></nav>')
    const state = {
      // Two models: the hierarchical rail (the one that paints inline dot colors) only renders from 2 models up.
      meta: { models: [{ id: 'm1', title: 'One', filePath: 'm1.md', elementCount: '1</span><img src=x onerror=1>' }, { id: 'm2', title: 'Two', filePath: 'm2.md', elementCount: 1 }] },
      elements: [{ id: 'e1', concept: 'Risks', modelId: 'm1' }, { id: 'e2', concept: 'Risks', modelId: 'm2' }],
    }
    const color = 'red"><img src=x onerror=1>'
    nnConsole.renderRail(document, [{ name: 'Risks', color }], { Risks: 1 }, {}, () => {}, state)

    const rail = document.getElementById('nn-rail')
    assert.equal(rail.querySelector('img'), null)
    assert.equal(rail.querySelector('[onerror]'), null)
    assert.ok(rail.querySelector('[data-ku-kind="section"]'), 'concept badge still rendered')
    assert.ok(!rail.innerHTML.includes('onerror'))
  })

  test('search token and operator value in the filter pills are inert', () => {
    const document = boot('<input id="nn-search" /><div id="nn-filter-facets"></div><div id="nn-active-filters"></div>')
    nnConsole.renderFilterBar(document, { meta: { models: [] }, elements: [] }, () => {}, `"${HOSTILE_SVG}" tags:<b>x</b>`)

    const pills = document.getElementById('nn-active-filters')
    assert.ok(pills.children.length > 0, 'pills rendered')
    assert.equal(pills.querySelector('svg'), null)
    assert.equal(pills.querySelector('b'), null)
    assert.ok(pills.textContent.includes(HOSTILE_SVG))
  })

  test('validation error strings are inert', () => {
    const document = boot('<dialog id="nn-feedback-modal"><div data-nn="errors"></div></dialog>')
    nnConsole.renderErrors(document, [HOSTILE_IMG])

    const box = document.querySelector('[data-nn="errors"]')
    assert.equal(box.querySelector('img'), null)
    assert.ok(box.textContent.includes(HOSTILE_IMG))
  })
})
