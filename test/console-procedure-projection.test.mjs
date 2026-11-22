/* The projection: a run rendered with the drafts the console holds but has not applied,
   marked apart from what the export recorded. Drives the real fold and the real controller,
   so a projection that disagrees with nn-core fails here rather than in a browser. */
import { describe, it, beforeEach } from 'node:test'
import { runModelOfEvents } from './helpers/run-model-of-events.mjs'
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

  const payload = (requests = {}) => {
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
                requests: requests,
                state: nnCore.foldRun(graph, runModelOfEvents(AT_REVIEW, { defRev }), { defRev }),
              },
            ],
          },
        ],
      },
    }
  }

  const mount = (requests = {}) =>
    stepper.mount(container, payload(requests), {
      store: {
        drafts: () => store.drafts(),
        propose: (p) =>
          controller.propose(
            { elementId: p.elementId, field: p.field, knowledge_id: p.knowledge_id },
            p,
          ),
      },
    })

  it('renders the recorded state and claims no pending request', () => {
    mount()
    const review = container.querySelector('.dag-node[data-step="review"]')
    assert.equal(review.getAttribute('data-status'), 'active')
    assert.equal(container.querySelector('.proc-request'), null, 'no request box on a clean step')
    assert.equal(container.querySelector('.proc-run-requests'), null, 'and an empty queue')
  })

  it('offers only the actions a request can carry, never a run close', () => {
    mount()
    const actions = [...container.querySelectorAll('[data-proc-action]')].map((b) =>
      b.getAttribute('data-proc-action'),
    )
    assert.deepEqual(actions.sort(), ['complete', 'fail', 'wait'])
    assert.equal(container.querySelector('[data-proc-action="start"]'), null)
    assert.equal(container.querySelector('[data-proc-action="finish"]'), null)
    assert.equal(container.querySelector('[data-proc-action="cancel"]'), null)
  })

  it('an action proposes a Step Request pinned to the seq the person saw', () => {
    mount()
    const select = container.querySelector('[data-proc-outcome]')
    select.value = 'approve'
    container
      .querySelector('[data-proc-action="complete"]')
      .dispatchEvent(new doc.defaultView.Event('click'))
    const drafts = store.drafts()
    assert.equal(drafts.length, 1, 'one draft was proposed')
    const d = drafts[0]
    assert.equal(d.concept, 'Step Request', 'not an Execution Event')
    const fields = JSON.parse(d.proposed)
    assert.equal(fields.action, 'complete')
    assert.equal(fields.step, 'review')
    assert.equal(fields.requested_outcome, 'approve')
    assert.equal(typeof fields.base_seq, 'number', 'the request pins the run seq')
  })

  it('a pending request disables the step and says it waits for the agent', () => {
    mount({
      'q-001': { action: 'complete', status: 'pending', step: 'review', baseSeq: 3 },
    })
    const note = container.querySelector('[data-proc-waiting]')
    assert.ok(note, 'the pending ask is shown')
    assert.match(note.textContent, /Waiting for the agent/)
    assert.equal(container.querySelector('[data-proc-action="complete"]'), null, 'no second ask')
  })

  it('the card shows a resolved request with the reason the runner gave', () => {
    mount({
      'q-001': {
        action: 'complete',
        status: 'stale',
        step: 'review',
        baseSeq: 2,
        reason: 'The run moved from seq 2 to 4 before the request was consumed.',
      },
    })
    container
      .querySelector('.dag-node[data-step="review"]')
      .dispatchEvent(new doc.defaultView.Event('click'))
    const box = container.querySelector('[data-proc-request="review"]')
    assert.ok(box, 'the card carries the request')
    assert.match(box.textContent, /stale/)
    assert.match(box.textContent, /moved from seq 2 to 4/)
  })

  it('a rejected request is shown as rejected, not as done', () => {
    mount({
      'q-002': { action: 'wait', status: 'rejected', step: 'review', reason: 'STEP_NOT_STARTED' },
    })
    const item = container.querySelector('[data-proc-request-id="q-002"]')
    assert.ok(item, 'the queue lists it')
    assert.equal(item.getAttribute('data-proc-request-status'), 'rejected')
    assert.match(item.textContent, /STEP_NOT_STARTED/)
  })

  it('the legacy event log and the projection are gone from the view', () => {
    mount({ 'q-001': { action: 'wait', status: 'done', step: 'review', value: 'ana' } })
    assert.equal(container.querySelector('.proc-run-events'), null, 'no event log is rendered')
    assert.equal(container.querySelector('.proc-projection'), null, 'no projection box exists')
  })
})
