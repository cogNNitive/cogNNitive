import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
const uiKitPath = join(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console', 'ui-kit.js')
const ui = require(uiKitPath)

describe('Unified KU Inspector Modal - Element Sheet View', () => {
  test('EditModal View tab renders canonical ElementCard without sources field', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>')
    const { document } = dom.window

    const element = {
      id: 'TestLab_coverage_TestLab@element-1c',
      name: 'Element 1C (test)',
      concept: 'Concept 1',
      description: 'Element 1C closes the Concept 1 triangle.',
      fields: {
        sources: ['sources/import/dataset.json@/items/0/name'],
        summary: 'Multi-node traceability source element.',
        long_description: 'Element 1C exists so multi-node traceability has three legs...',
        sibling: '@element-2b',
        status: 'published',
      },
      relations: [
        { field: 'sibling', target: 'element-2b', targetConcept: 'Concept 2' },
      ],
    }

    const byId = {
      'element-2b': {
        id: 'element-2b',
        name: 'Element 2B',
        concept: 'Concept 2',
        _conceptSlot: 2,
        _conceptColor: 'green',
      },
    }

    const modal = ui.EditModal(
      {
        title: element.name,
        element: element,
        elementId: element.id,
        concept: element.concept,
        startTab: 'view',
      },
      {
        doc: document,
        byId: byId,
      },
    )

    document.body.appendChild(modal)

    const viewPanel = modal.querySelector('.nn-view-modal-body')
    assert.ok(viewPanel, 'View panel exists')

    // Must contain the ElementCard component
    const card = viewPanel.querySelector('[data-nn-component="element-card"]')
    assert.ok(card, 'ElementCard component mounted in View panel')

    // Must NOT contain sources field
    const text = viewPanel.textContent
    assert.doesNotMatch(text, /SOURCES/, 'SOURCES must not appear in the sheet view')
    assert.doesNotMatch(text, /sources\/import/, 'Source path must not appear in the fields')

    // Must contain summary and long_description
    assert.match(text, /Multi-node traceability source element\./)
    assert.match(text, /Element 1C exists so multi-node traceability has three legs\.\.\./)

    // Sibling relation must be rendered via Ku badge or relation pill
    const relBadge = viewPanel.querySelector('.nn-strip-rel, [data-ku-kind="element"]')
    assert.ok(relBadge, 'Element relation badge rendered')
  })
})
