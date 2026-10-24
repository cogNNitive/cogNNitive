import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')
const viewPath = join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'procedures', 'assets', 'console-view-procedure.js')
const stepperPath = join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'console', 'render-procedure-stepper.js')

function loadView() {
  const code = readFileSync(viewPath, 'utf8')
  let captured
  new Function('registerView', code)((def) => {
    captured = def
  })
  return captured
}

const payload = () => ({
  schema: { concepts: [{ name: 'Work', weight: 100 }] },
  model: {
    meta: { title: 'Test Procedures', modelVersion: 'V_0-1-0' },
    elements: [
      { id: 'work-p', concept: 'Work', name: 'Main Procedure', fields: { step_type: 'task' }, relations: [], description: 'root' },
      { id: 'work-s1', concept: 'Work', name: 'Step One', fields: { step_type: 'task', parent: 'Main Procedure' }, relations: [], description: 's1' },
      { id: 'work-s2', concept: 'Work', name: 'Step Two', fields: { step_type: 'task', parent: 'Main Procedure' }, relations: [], description: 's2' },
    ],
    matrices: [],
  },
})

describe('procedure view (bluepriNNt)', () => {
  let doc
  let container

  beforeEach(() => {
    const dom = new JSDOM('<!doctype html><html><body><div id="c"></div></body></html>')
    doc = dom.window.document
    container = doc.getElementById('c')
  })

  it('declares an editable view with order 20 and no self-declared id', () => {
    const def = loadView()
    assert.equal(def.id, undefined)
    assert.equal(def.title, 'Procedure')
    assert.equal(def.order, 20)
    assert.equal(def.kind, 'editable')
    assert.equal(typeof def.mount, 'function')
  })

  it('hands the shared payload to nnProcedureStepper.mount', () => {
    const def = loadView()
    const calls = []
    global.nnProcedureStepper = { mount: (c, p) => calls.push({ c, p }) }
    try {
      def.mount({ container, payload: payload() })
    } finally {
      delete global.nnProcedureStepper
    }
    assert.equal(calls.length, 1)
    assert.equal(calls[0].c, container)
    assert.equal(calls[0].p.model.meta.title, 'Test Procedures')
  })

  it('shows an empty state when the stepper runtime is absent', () => {
    const def = loadView()
    def.mount({ container, payload: payload() })
    assert.match(container.textContent, /Procedure runtime is not available/)
  })

  it('renders into its own container with no global ids and a container-scoped log dialog', () => {
    const stepper = createRequire(import.meta.url)(stepperPath)
    const handle = stepper.mount(container, payload())
    assert.equal(handle.ok, true)
    assert.ok(container.querySelector('.nn-procedure-view'), 'built inside the container')

    // No global shell ids / no collision with the runtime's feedback modal, and
    // no id at all inside the mounted view (container-scoped DOM only).
    for (const id of ['nn-export-modal', 'audit-log-container', 'run-timer', 'doc-title', 'proc-tabs']) {
      assert.equal(doc.getElementById(id), null, `must not create the global id #${id}`)
    }
    assert.equal(container.querySelectorAll('[id]').length, 0, 'no element in the view carries an id')

    // The execution-log dialog is created inside the container, not as #nn-export-modal.
    const exportBtn = container.querySelector('.btn-export-log')
    assert.ok(exportBtn, 'export-log button rendered')
    exportBtn.click()
    const dialog = container.querySelector('dialog.export-dialog')
    assert.ok(dialog, 'a scoped dialog was created inside the container')
    assert.notEqual(dialog.id, 'nn-export-modal')

    handle.unmount()
    assert.equal(container.innerHTML, '')
  })

  it('lists the blueprint procedures with usage first as "Getting started"', () => {
    const stepper = createRequire(import.meta.url)(stepperPath)
    const p = payload()
    p.schema.procedures = [
      {
        id: 'generate-docsify-suite',
        name: 'Generate Docsify Suite',
        path: 'procedures/generate_docsify_suite_procedures_NN.md',
      },
      { id: 'usage', name: 'Getting started', path: 'procedures/usage_procedures_NN.md' },
    ]
    const handle = stepper.mount(container, p)
    const list = container.querySelector('[data-nn-procedures="blueprint"]')
    assert.ok(list, 'blueprint procedures list rendered')
    const items = [...list.querySelectorAll('.proc-blueprint-item')]
    assert.equal(items.length, 2)
    assert.equal(items[0].getAttribute('data-procedure-id'), 'usage', 'usage reads first')
    assert.equal(items[0].textContent, 'Getting started')
    assert.equal(items[1].getAttribute('data-procedure-id'), 'generate-docsify-suite')
    handle.unmount()
  })

  it('renders no blueprint list when the schema carries no procedures', () => {
    const stepper = createRequire(import.meta.url)(stepperPath)
    const handle = stepper.mount(container, payload())
    assert.equal(container.querySelector('[data-nn-procedures="blueprint"]'), null)
    handle.unmount()
  })
})
