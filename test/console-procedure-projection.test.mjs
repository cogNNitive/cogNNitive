/* The projection: a run rendered with the drafts the console holds but has not applied,
   marked apart from what the export recorded. Drives the real fold and the real controller,
   so a projection that disagrees with nn-core fails here rather than in a browser. */
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { JSDOM } from 'jsdom'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')
const consoleDir = join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'console')
const stepperPath = join(consoleDir, 'render-procedure-stepper.js')
const corePath = join(consoleDir, 'nn-procedure-core.js')
const require = createRequire(import.meta.url)
const runtime = require(join(consoleDir, 'nn-runtime.js'))
const reviewLib = require(join(consoleDir, 'review.js'))

// The real fold, the same one the exporter bundles into the console.
const nnCore = require('@cognnitive/nn-core')

const FILE = 'procedures/demo_procedures_NN.md'
const REVIEW = `---
level: 3
parent_spec:
  name: "procedures"
  url: "specs/bluepriNNts/procedures/V_0-6-1/spec_NN.md"
knowledge_version: "V_1-0-0"
title: "Demo"
---

# NN Procedure

## NN Procedure: Demo
slug:: demo

# NN Work

## NN Work: Draft
slug:: draft
step_type:: task
executor:: agent
next:: @review

## NN Work: Review
slug:: review
step_type:: decision
executor:: human
decision:: Publish?
next:: [@publish, @rework]

## NN Work: Publish
slug:: publish
step_type:: task
condition:: outcome == approve

## NN Work: Rework
slug:: rework
step_type:: task
condition:: outcome == decline
`

const AT_REVIEW = [
  { kind: 'started', actor: 'ana' },
  { kind: 'step_started', step: 'draft', attempt: 1 },
  { kind: 'step_completed', step: 'draft', next: 'review' },
  { kind: 'step_started', step: 'review', attempt: 1 },
]

describe('procedure view projects a run from its pending drafts', () => {
  let doc
  let container
  let stepper
  let controller
  let store

  beforeEach(() => {
    const dom = new JSDOM('<!doctype html><html><body><div id="c"></div></body></html>')
    doc = dom.window.document
    container = doc.getElementById('c')
    global.window = dom.window
    global.document = doc
    global.self = dom.window
    global.nnConsole = runtime
    dom.window.nnConsole = runtime

    // The fold the console would have booted from its slot.
    delete require.cache[require.resolve(corePath)]
    const core = require(corePath)
    core.use({ foldRun: nnCore.foldRun })
    global.nnProcedureCore = core
    dom.window.nnProcedureCore = core

    const added = []
    store = {
      drafts: () => added.slice(),
      addDraft: (d) => (added.push(d), d),
      removeDraft: (id) => {
        const i = added.findIndex((d) => d.id === id)
        if (i !== -1) added.splice(i, 1)
        return added.slice()
      },
      clearDrafts: (ids) => {
        // Same contract as review.js: no argument clears everything, ids clear a subset.
        if (Array.isArray(ids)) {
          for (let i = added.length - 1; i >= 0; i--)
            if (ids.indexOf(added[i].id) !== -1) added.splice(i, 1)
        } else {
          added.length = 0
        }
      },
      persistent: false,
      key: 'k',
      destroy() {},
    }
    controller = reviewLib.createReviewController(doc, {
      meta: { modelId: 'demo' },
      elements: [],
      needs: ['feedback-export'],
      store,
      schema: { concepts: [] },
      referenceIndex: {},
    })
    stepper = require(stepperPath)
  })

  const payload = () => {
    const graph = nnCore.procedureGraph(nnCore.parseKnowledge(REVIEW))
    const defRev = 'V_1-0-0'
    return {
      schema: { concepts: [] },
      model: {
        meta: { modelId: 'demo' },
        elements: [],
        matrices: [],
        procedureGraphs: [
          {
            file: FILE,
            title: 'Demo',
            graph,
            runs: [
              {
                id: 'r1',
                file: 'executions/r1/r1_executions_NN.md',
                closed: false,
                defRev,
                params: {},
                events: AT_REVIEW,
                state: nnCore.foldRun(graph, AT_REVIEW, { defRev, lockFree: true }),
              },
            ],
          },
        ],
      },
    }
  }

  const mount = () =>
    stepper.mount(container, payload(), {
      store: {
        drafts: () => store.drafts(),
        propose: (p) =>
          controller.propose(
            { elementId: p.elementId, field: p.field, knowledge_id: p.knowledge_id },
            p,
          ),
      },
    })

  it('renders the recorded state when nothing is pending', () => {
    mount()
    const review = container.querySelector('.dag-node[data-step="review"]')
    assert.equal(review.getAttribute('data-status'), 'active')
    assert.equal(review.hasAttribute('data-projected-status'), false)
    assert.equal(container.querySelector('.proc-projection'), null, 'no pending change is claimed')
  })

  it('marks the step the pending draft moves, without pretending it applied', () => {
    mount()
    // Record it the way the view does: complete review with approve.
    const select = container.querySelector('[data-proc-outcome]')
    select.value = 'approve'
    container
      .querySelector('[data-proc-action="complete"]')
      .dispatchEvent(new doc.defaultView.Event('click'))

    const review = container.querySelector('.dag-node[data-step="review"]')
    assert.equal(review.getAttribute('data-status'), 'active', 'the applied state is unchanged')
    assert.equal(review.getAttribute('data-projected-status'), 'done', 'the projection moves it')
    assert.ok(review.classList.contains('projected'), 'and it is marked apart')

    const publish = container.querySelector('.dag-node[data-step="publish"]')
    // A completion leaves the next step reachable but not started: the fold says `pending`
    // until a `step_started` arrives, and the projection must not invent one.
    assert.equal(publish.getAttribute('data-status'), 'pending')
    assert.equal(publish.getAttribute('data-projected-status'), null)
  })

  it('shows the value the step would have, not just that something changed', () => {
    mount()
    const select = container.querySelector('[data-proc-outcome]')
    select.value = 'approve'
    container
      .querySelector('[data-proc-action="complete"]')
      .dispatchEvent(new doc.defaultView.Event('click'))

    container
      .querySelector('.dag-node[data-step="review"]')
      .dispatchEvent(new doc.defaultView.Event('click'))
    const box = container.querySelector('[data-proc-projection="review"]')
    assert.ok(box, 'the card carries the pending change')
    assert.match(box.textContent, /active/, 'the value it has now')
    assert.match(box.textContent, /done/, 'the value it would have')
    assert.match(box.textContent, /outcome: approve/, 'and the fact that produces it')
    assert.match(box.textContent, /Not applied yet/)
  })

  it('drops the projection when the draft is discarded', () => {
    const handle = mount()
    const select = container.querySelector('[data-proc-outcome]')
    select.value = 'approve'
    container
      .querySelector('[data-proc-action="complete"]')
      .dispatchEvent(new doc.defaultView.Event('click'))
    assert.ok(
      container.querySelector('.dag-node[data-step="review"]').classList.contains('projected'),
    )

    store.clearDrafts()
    handle.unmount()
    mount()
    assert.equal(
      container.querySelector('.proc-projection'),
      null,
      'nothing pending, nothing claimed',
    )
  })

  it('never folds another run\u2019s drafts into this one', () => {
    const handle = mount()
    store.addDraft({
      kind: 'new',
      knowledge_id: 'other-run',
      concept: 'Execution Event',
      element: 'e-001',
      element_slug: 'e-001',
      proposed: JSON.stringify({
        kind: 'step_completed',
        step: 'review',
        outcome: 'approve',
        next: 'publish',
      }),
    })
    handle.unmount()
    mount()
    assert.equal(
      container.querySelector('.proc-projection'),
      null,
      'a foreign draft is not this run',
    )
    assert.equal(
      container.querySelector('.dag-node[data-step="review"]').getAttribute('data-status'),
      'active',
    )
  })
})
