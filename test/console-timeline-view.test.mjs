import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')
const viewPath = join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'metrics', 'assets', 'console-view-timeline.js')

function loadView() {
  const code = readFileSync(viewPath, 'utf8')
  let captured
  new Function('registerView', code)((def) => {
    captured = def
  })
  return captured
}

describe('metrics timeline view (bluepriNNt)', () => {
  let doc
  let container
  let gridCalls
  let edits

  beforeEach(() => {
    doc = new JSDOM('<!doctype html><html><body><div id="c"></div></body></html>').window.document
    container = doc.getElementById('c')
    gridCalls = []
    edits = []
    global.InnfoConsole = {
      renderTimelineGrid: (host, model, meta, hooks) => {
        gridCalls.push({ host, model, meta, hooks })
        const btn = doc.createElement('button')
        btn.className = 'innfo-edit-btn'
        btn.addEventListener('click', () => hooks.onEditRow(model.rows[0].id))
        host.appendChild(btn)
      },
    }
  })

  afterEach(() => {
    delete global.InnfoConsole
  })

  it('declares an editable view with order 10, and no self-declared id (the registrar injects it)', () => {
    const def = loadView()
    assert.equal(def.id, undefined)
    assert.equal(def.title, 'Timeline')
    assert.equal(def.order, 10)
    assert.equal(def.kind, 'editable')
    assert.equal(typeof def.mount, 'function')
  })

  it('derives the timeline projection from the payload elements and opens the shared modal on a row edit', () => {
    const def = loadView()
    const ctx = {
      container,
      payload: {
        model: {
          elements: [
            { id: 'scenario-1', concept: 'Scenario', name: 'Year 1', fields: { scenarioMonths: '36' }, modelId: 'm1', modelTitle: 'Metrics' },
            { id: 'metrics-revenue', concept: 'Metrics', name: 'Revenue', fields: { metricValue: '100', metricType: 'revenue', metricUnit: 'USD' }, relations: [], modelId: 'm1', modelTitle: 'Metrics' },
          ],
        },
      },
      modal: { edit: (anchor) => edits.push(anchor) },
    }
    def.mount(ctx)

    assert.equal(gridCalls.length, 1)
    assert.equal(gridCalls[0].model.rows.length, 1)
    assert.equal(gridCalls[0].model.rows[0].id, 'metrics-revenue')
    assert.deepEqual(gridCalls[0].meta, { months: 36 })
    container.querySelector('.innfo-edit-btn').click()
    assert.deepEqual(edits, [{ elementId: 'metrics-revenue' }])
  })

  it('shows an empty state when no model carries a projection, without calling the renderer', () => {
    const def = loadView()
    const ctx = {
      container,
      payload: { model: { elements: [{ id: 'x', concept: 'Stakeholders', name: 'Bob', fields: {} }] } },
      modal: { edit() {} },
    }
    def.mount(ctx)
    assert.equal(gridCalls.length, 0)
    assert.match(container.textContent, /No timeline projection/)
  })
})
