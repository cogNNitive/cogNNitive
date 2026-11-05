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

  test('EditModal View tab renders dedicated Field inspector when fieldName is provided', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>')
    const { document } = dom.window

    const element = {
      id: 'TestLab_coverage_TestLab@element-1c',
      name: 'Element 1C (test)',
      concept: 'Concept 1',
      description: 'Element 1C closes the Concept 1 triangle.',
    }

    const modal = ui.EditModal(
      {
        title: 'Element 1C (test) → summary',
        element: element,
        elementId: element.id,
        concept: element.concept,
        fieldName: 'summary',
        type: 'string',
        value: 'Multi-node traceability source element.',
        startTab: 'view',
      },
      {
        doc: document,
      },
    )

    document.body.appendChild(modal)

    const viewPanel = modal.querySelector('.nn-view-modal-body')
    assert.ok(viewPanel, 'View panel exists')

    // Must contain field inspector box, NOT the full element card
    const fieldBox = viewPanel.querySelector('.nn-field-view-box')
    assert.ok(fieldBox, 'Field inspector box mounted in View panel')
    assert.equal(viewPanel.querySelector('[data-nn-component="element-card"]'), null, 'ElementCard not rendered for field view')

    // Must show current value
    const text = viewPanel.textContent
    assert.match(text, /Multi-node traceability source element\./)
    assert.match(text, /summary/)
  })

  test('Opening field modal from element modal stacks on top and closing it preserves parent modal', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>')
    const { document } = dom.window

    const reviewPath = join(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console', 'review.js')
    const review = require(reviewPath)

    const element = {
      id: 'TestLab_coverage_TestLab@element-1a',
      name: 'Element 1A',
      concept: 'Concept 1',
      fields: {
        summary: 'Baseline summary',
      },
    }

    const controller = review.createReviewController(document, {
      elements: [element],
      schema: {
        concepts: [{ name: 'Concept 1', fields: [{ name: 'summary', type: 'string' }] }],
      },
      meta: { modelId: 'TestLab_coverage_TestLab' },
    })

    // Open element modal
    const openedEl = controller.openEdit({ elementId: element.id, info: true })
    assert.equal(openedEl, true, 'Element modal opened')

    const elModal = document.querySelector('dialog[data-nn-component="edit-modal"]')
    assert.ok(elModal, 'Element modal exists in DOM')
    assert.equal(elModal.getAttribute('data-nested-modal'), null, 'Element modal is not nested')
    assert.equal(elModal.querySelector('.nn-edit-modal-head h2').textContent, 'Element 1A')

    // Open field modal from within element modal
    const openedField = controller.openEdit({ elementId: element.id, field: 'summary', info: true })
    assert.equal(openedField, true, 'Field modal opened')

    const allModals = document.querySelectorAll('dialog[data-nn-component="edit-modal"]')
    assert.equal(allModals.length, 2, 'Two modals exist simultaneously in DOM (stacked layer)')

    const childModal = allModals[1]
    assert.equal(childModal.getAttribute('data-nested-modal'), 'true', 'Child modal has data-nested-modal')
    assert.ok(childModal.classList.contains('nn-modal-nested'), 'Child modal has class nn-modal-nested')
    assert.equal(childModal.querySelector('.nn-edit-modal-head h2').textContent, 'Element 1A \u2192 summary')

    // Close child modal
    const closeBtn = childModal.querySelector('.nn-edit-modal-close')
    closeBtn.click()

    const remainingModals = document.querySelectorAll('dialog[data-nn-component="edit-modal"]')
    assert.equal(remainingModals.length, 1, 'Child modal removed, exactly 1 modal remains')
    assert.equal(remainingModals[0], elModal, 'Parent element modal is preserved intact')
    assert.equal(remainingModals[0].querySelector('.nn-edit-modal-head h2').textContent, 'Element 1A')
  })
})
