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
const runtimePath = join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'console', 'nn-runtime.js')
const runtime = createRequire(import.meta.url)(runtimePath)

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
    global.nnConsole = runtime
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

  it('lists only selected blueprint procedures, never a shadowed one (L2.5.3)', () => {
    const stepper = createRequire(import.meta.url)(stepperPath)
    const p = payload()
    p.schema.procedures = [
      { id: 'check', name: 'Alpha check', path: 'procedures/check_alpha_NN.md', status: 'selected' },
      { id: 'check', name: 'Beta check', path: 'procedures/check_beta_NN.md', status: 'shadowed', shadowed_by: 'alpha' },
    ]
    const handle = stepper.mount(container, p)
    const items = [...container.querySelectorAll('[data-nn-procedures="blueprint"] .proc-blueprint-item')]
    assert.deepEqual(items.map((i) => i.textContent), ['Alpha check'])
    handle.unmount()
  })

  it('renders no blueprint list when the schema carries no procedures', () => {
    const stepper = createRequire(import.meta.url)(stepperPath)
    const handle = stepper.mount(container, payload())
    assert.equal(container.querySelector('[data-nn-procedures="blueprint"]'), null)
    handle.unmount()
  })

  it('starts chain at declared head and drops no steps when head is not alphabetically first', () => {
    const stepper = createRequire(import.meta.url)(stepperPath)
    const p = {
      schema: { concepts: [{ name: 'Work', weight: 100 }] },
      model: {
        meta: { title: 'Video Production', modelVersion: 'V_0-1-0' },
        elements: [
          { id: 'proc', concept: 'Work', name: 'Crear Video', fields: { step_type: 'task' }, relations: [] },
          { id: 's4', concept: 'Work', name: 'Aprobar', fields: { step_type: 'task', parent: 'Crear Video' }, relations: [] },
          { id: 's3', concept: 'Work', name: 'Redactar', fields: { step_type: 'task', parent: 'Crear Video', next: '[[Aprobar]]' }, relations: [] },
          { id: 's2', concept: 'Work', name: 'Elegir imágenes', fields: { step_type: 'task', parent: 'Crear Video', next: '[[Redactar]]' }, relations: [] },
          { id: 's1', concept: 'Work', name: 'Configurar el vídeo', fields: { step_type: 'task', parent: 'Crear Video', next: '[[Elegir imágenes]]' }, relations: [] },
        ],
      },
    }
    const tree = runtime.buildTree(p.model.elements)
    const chain = runtime.chainOf(tree.roots[0], tree.nodes)
    assert.deepEqual(chain.map(n => n.el.name), [
      'Crear Video',
      'Configurar el vídeo',
      'Elegir imágenes',
      'Redactar',
      'Aprobar',
    ])

    const handle = stepper.mount(container, p)
    const renderedTitles = [...container.querySelectorAll('.dag-node .node-title')].map(el => el.textContent)
    assert.deepEqual(renderedTitles, [
      'Crear Video',
      'Configurar el vídeo',
      'Elegir imágenes',
      'Redactar',
      'Aprobar',
    ])
    handle.unmount()
  })

  it('derives canonical ingest_visual_catalog order without dropping steps (#360)', () => {
    const p = {
      schema: { concepts: [{ name: 'Work', weight: 100 }] },
      model: {
        meta: { title: 'Ingest Visual Catalog', modelVersion: 'V_0-1-0' },
        elements: [
          { id: 'proc', concept: 'Work', name: 'Ingest Visual Catalog Workflow', fields: {} },
          { id: 's1', concept: 'Work', name: 'Normalize Source', fields: { parent: 'Ingest Visual Catalog Workflow', next: '[[Derive and Optimize Derivative]]' } },
          { id: 's2', concept: 'Work', name: 'Derive and Optimize Derivative', fields: { parent: 'Ingest Visual Catalog Workflow', next: '[[Extract Entities]]' } },
          { id: 's3', concept: 'Work', name: 'Extract Entities', fields: { parent: 'Ingest Visual Catalog Workflow', next: '[[Resolve and Deduplicate]]' } },
          { id: 's4', concept: 'Work', name: 'Resolve and Deduplicate', fields: { parent: 'Ingest Visual Catalog Workflow', next: '[[Upsert Idempotently]]' } },
          { id: 's5', concept: 'Work', name: 'Upsert Idempotently', fields: { parent: 'Ingest Visual Catalog Workflow', next: '[[Wire Matrix Cells]]' } },
          { id: 's6', concept: 'Work', name: 'Wire Matrix Cells', fields: { parent: 'Ingest Visual Catalog Workflow', next: '[[Validate and Report Ingestion]]' } },
          { id: 's7', concept: 'Work', name: 'Validate and Report Ingestion', fields: { parent: 'Ingest Visual Catalog Workflow' } },
        ],
      },
    }
    const tree = runtime.buildTree(p.model.elements)
    const chain = runtime.chainOf(tree.roots[0], tree.nodes)
    assert.deepEqual(chain.map(n => n.el.name), [
      'Ingest Visual Catalog Workflow',
      'Normalize Source',
      'Derive and Optimize Derivative',
      'Extract Entities',
      'Resolve and Deduplicate',
      'Upsert Idempotently',
      'Wire Matrix Cells',
      'Validate and Report Ingestion',
    ])
  })

  it('breaks ties between unordered siblings using document order, never localeCompare', () => {
    const p = {
      schema: { concepts: [{ name: 'Work', weight: 100 }] },
      model: {
        meta: { title: 'Unordered Siblings', modelVersion: 'V_0-1-0' },
        elements: [
          { id: 'proc', concept: 'Work', name: 'Root Process', fields: {} },
          // Zeta appears before Alpha in document order, with no next between them
          { id: 's1', concept: 'Work', name: 'Zeta Step', fields: { parent: 'Root Process' } },
          { id: 's2', concept: 'Work', name: 'Alpha Step', fields: { parent: 'Root Process' } },
        ],
      },
    }
    const tree = runtime.buildTree(p.model.elements)
    assert.deepEqual(tree.roots[0].children.map(c => c.el.name), ['Zeta Step', 'Alpha Step'])
  })

  it('contains no duplicated tree semantics definitions in render-procedure-stepper.js', () => {
    const stepperCode = readFileSync(stepperPath, 'utf8')
    const forbidden = [
      /function\s+sortChildren\b/,
      /function\s+chainOf\b/,
      /function\s+firstChild\b/,
      /function\s+nextStep\b/,
      /function\s+resolveParentId\b/,
      /function\s+cleanRef\b/,
    ]
    for (const pattern of forbidden) {
      assert.equal(pattern.test(stepperCode), false, `render-procedure-stepper.js must not define ${pattern}`)
    }
  })

  it('reports StructuralDefects for cycle, fork, external target, and unreachable step', () => {
    // 1. Cycle
    const pCycle = {
      model: {
        elements: [
          { id: 'p', concept: 'Work', name: 'Proc Cycle' },
          { id: 's1', concept: 'Work', name: 'Step 1', fields: { parent: 'Proc Cycle', next: '[[Step 2]]' } },
          { id: 's2', concept: 'Work', name: 'Step 2', fields: { parent: 'Proc Cycle', next: '[[Step 1]]' } },
        ],
      },
    }
    const treeCycle = runtime.buildTree(pCycle.model.elements)
    assert.ok(treeCycle.defects.some(d => d.kind === 'cycle'), 'cycle detected')

    // 2. Fork (two heads)
    const pFork = {
      model: {
        elements: [
          { id: 'p', concept: 'Work', name: 'Proc Fork' },
          { id: 'h1', concept: 'Work', name: 'Head 1', fields: { parent: 'Proc Fork', next: '[[Tail]]' } },
          { id: 'h2', concept: 'Work', name: 'Head 2', fields: { parent: 'Proc Fork', next: '[[Tail]]' } },
          { id: 'tail', concept: 'Work', name: 'Tail', fields: { parent: 'Proc Fork' } },
        ],
      },
    }
    const treeFork = runtime.buildTree(pFork.model.elements)
    assert.ok(treeFork.defects.some(d => d.kind === 'fork'), 'fork detected')

    // 3. External target
    const pExt = {
      model: {
        elements: [
          { id: 'p1', concept: 'Work', name: 'Proc 1' },
          { id: 's1', concept: 'Work', name: 'Step 1', fields: { parent: 'Proc 1', next: '[[Step 2]]' } },
          { id: 'p2', concept: 'Work', name: 'Proc 2' },
          { id: 's2', concept: 'Work', name: 'Step 2', fields: { parent: 'Proc 2' } },
        ],
      },
    }
    const treeExt = runtime.buildTree(pExt.model.elements)
    assert.ok(treeExt.defects.some(d => d.kind === 'external_target'), 'external target detected')

    // 4. Unreachable step
    const pUnreach = {
      model: {
        elements: [
          { id: 'p', concept: 'Work', name: 'Proc Unreach' },
          { id: 's1', concept: 'Work', name: 'Head', fields: { parent: 'Proc Unreach', next: '[[Tail]]' } },
          { id: 'tail', concept: 'Work', name: 'Tail', fields: { parent: 'Proc Unreach' } },
          { id: 'iso1', concept: 'Work', name: 'Island 1', fields: { parent: 'Proc Unreach', next: '[[Island 2]]' } },
          { id: 'iso2', concept: 'Work', name: 'Island 2', fields: { parent: 'Proc Unreach', next: '[[Island 1]]' } },
        ],
      },
    }
    const treeUnreach = runtime.buildTree(pUnreach.model.elements)
    assert.ok(treeUnreach.defects.some(d => d.kind === 'unreachable'), 'unreachable detected')
  })

  it('renders structure summary strip with counts and defects, and counts ungrouped steps', () => {
    const stepper = createRequire(import.meta.url)(stepperPath)
    const p = {
      schema: { concepts: [{ name: 'Work', weight: 100 }] },
      model: {
        meta: { title: 'Ungrouped Doc' },
        elements: [
          { id: 'u1', concept: 'Work', name: 'Ungrouped One', fields: { step_type: 'task' } },
          { id: 'u2', concept: 'Work', name: 'Ungrouped Two', fields: { step_type: 'task' } },
        ],
      },
    }
    const handle = stepper.mount(container, p)
    const summary = container.querySelector('.proc-structure-summary')
    assert.ok(summary, 'structure summary rendered')
    assert.match(summary.textContent, /0 procedures · 0 steps · 2 ungrouped/)
    const defectLines = [...container.querySelectorAll('.proc-defect-item')]
    assert.equal(defectLines.length, 2)
    assert.equal(container.querySelectorAll('.proc-tab').length, 0, 'no tabs rendered for ungrouped steps')
    handle.unmount()
  })

  it('renders decision step with >=2 next targets as a branch listing each outcome', () => {
    const stepper = createRequire(import.meta.url)(stepperPath)
    const p = {
      schema: { concepts: [{ name: 'Work', weight: 100 }] },
      model: {
        meta: { title: 'Branching Proc' },
        elements: [
          { id: 'p', concept: 'Work', name: 'Review Process' },
          { id: 's1', concept: 'Work', name: 'Review Quality', fields: { parent: 'Review Process', step_type: 'decision', next: '[[Approve]], [[Revise]]' } },
          { id: 's2', concept: 'Work', name: 'Approve', fields: { parent: 'Review Process', condition: 'passes check' } },
          { id: 's3', concept: 'Work', name: 'Revise', fields: { parent: 'Review Process', condition: 'fails check' } },
        ],
      },
    }
    const handle = stepper.mount(container, p)
    const branchOutcomes = container.querySelectorAll('.branch-outcome')
    assert.equal(branchOutcomes.length, 2, 'two outcomes rendered')
    const outcomeText = [...branchOutcomes].map(el => el.textContent)
    assert.ok(outcomeText.some(t => t.includes('Approve')), 'Approve outcome rendered')
    assert.ok(outcomeText.some(t => t.includes('Revise')), 'Revise outcome rendered')
    handle.unmount()
  })

  it('renders decision step with 1 next target as a normal step without branch list', () => {
    const stepper = createRequire(import.meta.url)(stepperPath)
    const p = {
      schema: { concepts: [{ name: 'Work', weight: 100 }] },
      model: {
        meta: { title: 'Linear Proc' },
        elements: [
          { id: 'p', concept: 'Work', name: 'Linear Process' },
          { id: 's1', concept: 'Work', name: 'Single Decision', fields: { parent: 'Linear Process', step_type: 'decision', next: '[[Approve]]' } },
          { id: 's2', concept: 'Work', name: 'Approve', fields: { parent: 'Linear Process' } },
        ],
      },
    }
    const handle = stepper.mount(container, p)
    const branchOutcomes = container.querySelectorAll('.branch-outcome')
    assert.equal(branchOutcomes.length, 0, 'no branch outcomes rendered for single target')
    handle.unmount()
  })
})
