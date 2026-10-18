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
  it('renders the matrix definition, headers and cells as Ku units', () => {
    const { document } = boot()
    const section = document.querySelector('.innfo-matrix')
    assert.ok(section, 'matrix section rendered')
    assert.ok(section.querySelector('[data-ku-kind="matrix"]'), 'matrix definition badge')
    assert.ok(section.querySelector('th [data-ku-kind="element"]'), 'header element badge')
    const cell = section.querySelector('td[data-matrix] [data-ku-kind="value"]')
    assert.ok(cell, 'cell value badge')
    assert.match(cell.getAttribute('data-ku-address'), /matrix-lab@coverage&r1&c1/i)
  })

  it('decorates matrix cells with an edit anchor and exports an update_matrix_cell change', () => {
    const { document, dom } = boot()
    const Ev = dom.window.Event

    const td = document.querySelector('td[data-matrix][data-row][data-col]')
    assert.ok(td, 'matrix cell rendered with coordinate data attributes')
    assert.equal(td.getAttribute('data-row'), 'r1')
    assert.equal(td.getAttribute('data-col'), 'c1')
    assert.equal(td.getAttribute('data-cell-raw'), 'old')

    // No review mode: decoration follows the render event. Re-dispatch it so the
    // already-rendered tree gets its anchors.
    document.dispatchEvent(
      new dom.window.Event('innfo:rendered', { detail: { root: document.getElementById('innfo-content') || document } }),
    )

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

  it('targets the model that owns the matrix, not the domain id', () => {
    const env = bootConsole({
      model: {
        ...MATRIX_MODEL,
        matrices: [
          {
            name: 'Coverage',
            rows: ['r1'],
            cols: ['c1'],
            cells: { r1: { c1: 'old' } },
            modelId: 'kNNowledge/Coverage',
          },
        ],
      },
      schema: { concepts: [{ name: 'Fleet' }] },
      config: { needs: ['feedback-export', 'matrix-grids'] },
    })
    const { document, dom } = env
    const Ev = dom.window.Event
    const td = document.querySelector('td[data-matrix][data-row][data-col]')
    assert.equal(
      td.getAttribute('data-matrix-model'),
      'kNNowledge/Coverage',
      'the owning model address reaches the cell',
    )
    // No review mode: decoration follows the render event. Re-dispatch it so the
    // already-rendered tree gets its anchors.
    document.dispatchEvent(
      new dom.window.Event('innfo:rendered', { detail: { root: document.getElementById('innfo-content') || document } }),
    )
    td.querySelector('[data-innfo-ctl="matrix-cell-anchor"]').click()
    const modal = document.querySelector('[data-innfo-component="edit-modal"]')
    modal.querySelector('.innfo-edit-input').value = 'relevant'
    modal.querySelector('.innfo-edit-btn-save').click()

    document.getElementById('innfo-feedback-open').click()
    const identifier = document.querySelector('#innfo-feedback-modal [data-innfo="identifier"]')
    identifier.value = 'tester'
    identifier.dispatchEvent(new Ev('input', { bubbles: true }))
    const changeset = document.querySelector('#innfo-feedback-modal [data-innfo="changeset-preview"]')
    // Never `matrix-lab@...` (the domain id): apply_change resolves the model part.
    assert.match(changeset.value, /target:: kNNowledge\/Coverage@Coverage&r1&c1/)
  })
})

// Constrained matrix cell editor (S3b P1-11): the governing definition of a cell
// (the matrix definition of a free matrix, the column Marker of the reserved
// item-markers matrix) decides the widget.
function bootWith(matrix, schemaExtra) {
  return bootConsole({
    model: { ...MATRIX_MODEL, matrices: [matrix] },
    schema: { concepts: [{ name: 'Fleet' }], ...schemaExtra },
    config: { needs: ['feedback-export', 'matrix-grids'] },
  })
}

function editCell(env, matrixName, row, col) {
  const { document } = env
  // No review mode: decoration follows the render event. Re-dispatch it so the
  // already-rendered tree gets its anchors.
  document.dispatchEvent(
    new env.dom.window.Event('innfo:rendered', { detail: { root: document.getElementById('innfo-content') || document } }),
  )
  const td = document.querySelector(
    `td[data-matrix="${matrixName}"][data-row="${row}"][data-col="${col}"]`,
  )
  td.querySelector('[data-innfo-ctl="matrix-cell-anchor"]').click()
  return document.querySelector('[data-innfo-component="edit-modal"]')
}

describe('constrained matrix cell editor', () => {
  it('offers blank plus the declared values for a set matrix', () => {
    const env = bootWith(
      { name: 'Journey map', rows: ['r1'], cols: ['c1'], cells: { r1: { c1: 'High' } } },
      { matrices: [{ name: 'journey map', widgetType: 'set', values: ['Max', 'High', 'Low'] }] },
    )
    const modal = editCell(env, 'Journey map', 'r1', 'c1')
    const select = modal.querySelector('select[data-innfo-widget="select"]')
    assert.ok(select, 'a select replaces the free-text input')
    assert.deepEqual([...select.options].map((o) => o.value), ['', 'Max', 'High', 'Low'])
    assert.equal(select.value, 'High', 'the current value is preselected')
    select.value = 'Low'
    modal.querySelector('.innfo-edit-btn-save').click()
    assert.equal(env.document.querySelectorAll('[data-draft-id]').length, 1)
  })

  it('preserves a current value that is not among the declared values', () => {
    const env = bootWith(
      { name: 'Journey map', rows: ['r1'], cols: ['c1'], cells: { r1: { c1: 'Odd' } } },
      { matrices: [{ name: 'Journey map', widgetType: 'scale', values: ['Max', 'Low'] }] },
    )
    const select = editCell(env, 'Journey map', 'r1', 'c1').querySelector('select[data-innfo-widget="select"]')
    assert.equal(select.value, 'Odd')
  })

  it('proposes true from a boolean matrix column', () => {
    const env = bootWith(
      { name: 'Flags', source: 'Fleet', target: 'Status', rows: ['r1'], cols: ['active'], cells: { r1: { active: '' } } },
      { matrices: [{ name: 'Flags', widgetType: 'boolean' }] },
    )
    const modal = editCell(env, 'Flags', 'r1', 'active')
    const cb = modal.querySelector('input[type="checkbox"][data-innfo-widget="boolean"]')
    assert.ok(cb, 'a checkbox is offered')
    cb.checked = true
    modal.querySelector('.innfo-edit-btn-save').click()
    env.document.getElementById('innfo-feedback-open').click()
    const id = env.document.querySelector('#innfo-feedback-modal [data-innfo="identifier"]')
    id.value = 'tester'
    id.dispatchEvent(new env.dom.window.Event('input', { bubbles: true }))
    const cs = env.document.querySelector('#innfo-feedback-modal [data-innfo="changeset-preview"]')
    assert.match(cs.value, /to:: true/)
  })

  it('keeps the text input when no widget is declared', () => {
    const env = bootWith(
      { name: 'Coverage', rows: ['r1'], cols: ['c1'], cells: { r1: { c1: 'old' } } },
      { matrices: [{ name: 'Coverage' }, { name: 'Other', widgetType: 'text', values: ['a'] }] },
    )
    const modal = editCell(env, 'Coverage', 'r1', 'c1')
    assert.ok(modal.querySelector('.innfo-edit-input'))
    assert.equal(modal.querySelector('select'), null)
  })

  it('keeps the text input when the matrix is undeclared', () => {
    const env = bootWith(
      { name: 'Coverage', rows: ['r1'], cols: ['c1'], cells: { r1: { c1: 'old' } } },
      {},
    )
    assert.ok(editCell(env, 'Coverage', 'r1', 'c1').querySelector('.innfo-edit-input'))
  })
})

describe('a matrix targeting markers is not special', () => {
  it('offers no marker-driven checkbox (the construct is retired)', () => {
    const env = bootWith(
      { name: 'Flags', source: 'Fleet', target: 'markers', rows: ['r1'], cols: ['active'], cells: { r1: { active: '' } } },
      { markers: [{ name: 'Active', widgetType: 'boolean' }] },
    )
    const modal = editCell(env, 'Flags', 'r1', 'active')
    assert.equal(modal.querySelector('input[type="checkbox"][data-innfo-widget="boolean"]'), null)
  })
})
