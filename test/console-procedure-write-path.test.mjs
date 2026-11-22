/* The procedure view's write path, tested against the REAL console plumbing:
   `Review.createReviewController` + a real draft store, exactly as nn-runtime wires
   them. A hand-rolled mock store hid a real defect: `saveDraft` looks the draft's
   target up in `elementsById`, and an `Execution Event` is not an element, so every
   proposal returned null and the runtime threw "unknown element". */
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
const require = createRequire(import.meta.url)
const runtime = require(join(consoleDir, 'nn-runtime.js'))
const reviewLib = require(join(consoleDir, 'review.js'))
const core = require(join(consoleDir, 'console-payload.generated.cjs'))

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

const graphOf = (text) => core.procedureGraph(core.parseKnowledge(text))

const AT_REVIEW = [
  { kind: 'started', actor: 'ana' },
  { kind: 'step_started', step: 'draft', attempt: 1 },
  { kind: 'step_completed', step: 'draft', next: 'review' },
  { kind: 'step_started', step: 'review', attempt: 1 },
]

function payload() {
  const graph = graphOf(REVIEW)
  const defRev = 'V_1-0-0'
  return {
    schema: { concepts: [] },
    model: {
      meta: { modelId: 'demo', title: 'Demo' },
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
              state: core.foldRun(graph, runModelOfEvents(AT_REVIEW, { defRev }), { defRev }),
            },
          ],
        },
      ],
    },
  }
}

/* A store that records what is added — the real one, from review.js's own contract. */
function realStore() {
  const added = []
  return {
    added,
    store: {
      drafts: () => added.slice(),
      addDraft: (d) => {
        added.push(d)
        return d
      },
      removeDraft: () => added,
      clearDrafts: () => {},
      persistent: false,
      key: 'k',
      destroy() {},
    },
  }
}

describe('procedure view writes through the console controller (no mock store)', () => {
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

    const real = realStore()
    store = real.store
    // Exactly how nn-runtime builds it (nn-runtime.js:7978).
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

  const mount = () => {
    const viewCtx = {
      store: {
        drafts: () => store.drafts(),
        propose: (p) =>
          controller.propose(
            { elementId: p.elementId, field: p.field, knowledge_id: p.knowledge_id },
            p,
          ),
      },
    }
    return stepper.mount(container, payload(), viewCtx)
  }
  const click = (el) => el.dispatchEvent(new doc.defaultView.Event('click'))

  it('records the Step Request in the real store when a branch is chosen', () => {
    mount()
    const select = container.querySelector('[data-proc-outcome]')
    assert.ok(select, 'the branch control exists')
    select.value = 'approve'
    click(container.querySelector('[data-proc-action="complete"]'))

    assert.equal(store.drafts().length, 1, 'the request reached the store')
    const [d] = store.drafts()
    assert.equal(d.kind, 'new')
    assert.equal(d.concept, 'Step Request')
    assert.equal(d.knowledge_id, 'r1')
    const fields = JSON.parse(d.proposed)
    assert.equal(fields.action, 'complete')
    assert.equal(fields.requested_outcome, 'approve')
    assert.equal(fields.request_status, 'pending')
  })

  it('shows the pending banner once the draft really landed', () => {
    mount()
    const select = container.querySelector('[data-proc-outcome]')
    select.value = 'approve'
    click(container.querySelector('[data-proc-action="complete"]'))
    const banner = container.querySelector('.proc-draft-pending')
    assert.ok(banner, 'the banner is rendered')
    assert.match(banner.textContent, /apply_change/)
  })

  it('surfaces a refusal instead of silently swallowing it', () => {
    mount()
    // No branch chosen: the guard must say so, and write nothing.
    click(container.querySelector('[data-proc-action="complete"]'))
    assert.equal(store.drafts().length, 0, 'nothing written')
    const err = container.querySelector('.proc-action-error')
    assert.ok(err, 'the refusal is visible')
    assert.match(err.textContent, /branch/i)
  })
})
