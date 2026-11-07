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

  test('EditModal Changes tab renders collapsed change sheets with diff preview and evidence icon', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>')
    const { document } = dom.window

    const element = {
      id: 'TestLab_coverage_TestLab@element-1a',
      name: 'Element 1A',
      concept: 'Concept 1',
      history: [
        {
          id: 'ch-001',
          op: 'update_field',
          target: 'TestLab_coverage_TestLab@element-1a&status',
          field: 'status',
          from: 'draft',
          to: 'published',
          author: 'lucas',
          timestamp: '2026-11-05T10:00:00Z',
          evidence: 'sources/review-evidence.md',
          evidenceCitation: {
            origin: 'document',
            path: 'sources/review-evidence.md',
            exists: true,
            field: 'evidence',
          },
        },
      ],
    }

    const modal = ui.EditModal(
      {
        title: element.name,
        element: element,
        elementId: element.id,
        concept: element.concept,
        history: element.history,
        startTab: 'history',
      },
      {
        doc: document,
        // A citation icon is only painted when the host can open it.
        onEvidence: () => {},
      },
    )

    document.body.appendChild(modal)

    const historyPanel = modal.querySelector('.nn-history-modal-body')
    assert.ok(historyPanel, 'History panel exists')

    const changeCard = historyPanel.querySelector('[data-nn-component="element-card"]')
    assert.ok(changeCard, 'Change card rendered as ElementCard')

    // Must be collapsible and start collapsed
    assert.equal(changeCard.getAttribute('data-open'), 'false', 'Change card starts collapsed')
    const toggle = changeCard.querySelector('.nn-card-toggle')
    assert.ok(toggle, 'Toggle button exists')
    assert.equal(toggle.getAttribute('aria-expanded'), 'false', 'Toggle is not expanded')

    // Must contain diff preview with from -> to in header
    const diffPreview = changeCard.querySelector('.nn-change-diff-preview')
    assert.ok(diffPreview, 'Diff preview pill rendered in card head')
    assert.match(diffPreview.textContent, /draft\s*→\s*published/, 'Diff shows original and changed values with arrow')

    // Must contain evidence citation icon in header
    const citeIcon = changeCard.querySelector('.nn-card-head .cite-icon')
    assert.ok(citeIcon, 'Citation icon rendered in card head')
    assert.equal(citeIcon.getAttribute('data-origin'), 'document', 'Evidence citation has document origin')

    // Clicking header expands the card
    toggle.click()
    assert.equal(changeCard.getAttribute('data-open'), 'true', 'Card expands on toggle click')
  })
})
