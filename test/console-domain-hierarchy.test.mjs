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

    // Combined multi-facet query
    const combined = InnfoConsole.filterElements(elements, 'model:business tag:executive')
    assert.equal(combined.length, 1)
    assert.equal(combined[0].id, 'el-1')

    // Non-matching facet
    const noMatch = InnfoConsole.filterElements(elements, 'model:analysis tag:executive')
    assert.equal(noMatch.length, 0)
  })

  test('renderRail renders hierarchical accordion when meta.models has multiple models', () => {
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
          {
            id: 'business-model',
            title: 'Business Model',
            filePath: 'business_model.md',
            conceptNames: ['Stakeholders'],
            elementCount: 1,
          },
          {
            id: 'analysis',
            title: 'Strategic Analysis',
            filePath: 'analysis.md',
            conceptNames: ['Risks'],
            elementCount: 1,
          },
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
    const details = rail.querySelectorAll('details')
    assert.equal(details.length, 2, 'renders 2 model accordion details')

    // Click model filter button
    const modelBtn = details[0].querySelector('button[class*="btn-ghost"]')
    assert.ok(modelBtn, 'found model filter button')
    modelBtn.click()
    assert.equal(selectedFilter, 'model:business-model')

    // Click concept item under model
    const conceptBtn = details[0].querySelector('[data-concept="Stakeholders"]')
    assert.ok(conceptBtn, 'found concept item button')
    conceptBtn.click()
    assert.equal(selectedFilter, 'model:business-model concept:Stakeholders')
  })
})
