import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { bootConsole } from './helpers/console-boot.mjs'

// Matrix cells are editable in review mode: the cell anchor opens the shared
// edit modal and records a draft that exports as an `update_matrix_cell` change
// addressed by `model@matrix&row&col`.
const MATRIX_MODEL = {
  meta: { title: 'Matrix Lab', modelId: 'matrix-lab', modelVersion: 'V_1-0-0', changesBlueprintVersion: 'V_0-3-0' },
  elements: [
    { id: 'a1', concept: 'Fleet', name: 'Ecto-1', fields: {}, hash: '0123456789abcdef' },
  ],
  matrices: [
    { name: 'Coverage', rows: ['r1'], cols: ['c1'], cells: { r1: { c1: 'old' } } },
  ],
}

function boot() {
  const env = bootConsole({
    model: MATRIX_MODEL,
    schema: { concepts: [{ name: 'Fleet' }] },
    config: { needs: ['feedback-export', 'matrix-grids'] },
  })
  return env
}

describe('console matrix cell review editing', () => {
  it('decorates matrix cells with an edit anchor and exports an update_matrix_cell change', () => {
    const { document, dom } = boot()
    const Ev = dom.window.Event

    const td = document.querySelector('td[data-matrix][data-row][data-col]')
    assert.ok(td, 'matrix cell rendered with coordinate data attributes')
    assert.equal(td.getAttribute('data-row'), 'r1')
    assert.equal(td.getAttribute('data-col'), 'c1')
    assert.equal(td.getAttribute('data-cell-raw'), 'old')

    const toggle =
      document.querySelector('.innfo-review-toggle') ||
      document.querySelector('[data-innfo="review-toggle"]')
    assert.ok(toggle, 'review toggle exists')
    toggle.click()

    const anchor = td.querySelector('[data-innfo-ctl="matrix-cell-anchor"]')
    assert.ok(anchor, 'cell edit anchor appears in review mode')
    anchor.click()

    const modal = document.querySelector('[data-innfo-component="edit-modal"]')
    assert.ok(modal, 'edit modal opens')
    const input = modal.querySelector('.innfo-edit-input')
    assert.equal(input.value, 'old', 'modal pre-fills the current cell value')
    input.value = 'NEW VALUE'
    modal.querySelector('.innfo-edit-btn-save').click()

    assert.equal(document.querySelectorAll('[data-draft-id]').length, 1, 'one draft recorded')

    document.getElementById('innfo-feedback-open').click()
    const identifier = document.querySelector('#innfo-feedback-modal [data-innfo="identifier"]')
    identifier.value = 'tester'
    identifier.dispatchEvent(new Ev('input', { bubbles: true }))

    const changeset = document.querySelector('#innfo-feedback-modal [data-innfo="changeset-preview"]')
    assert.match(changeset.value, /op:: update_matrix_cell/)
    assert.match(changeset.value, /target:: matrix-lab@Coverage&r1&c1/)
    assert.match(changeset.value, /to:: "NEW VALUE"/)
  })
})
