import { describe, it, beforeEach } from 'node:test'
import { runModelOfEvents } from './helpers/run-model-of-events.mjs'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { JSDOM } from 'jsdom'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/* The stepper asks the runner: each action records a `Step Request` on the run model, and
 * only `procedure_record` consumes it. The view never writes the run and never closes it. */

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')
const consoleDir = join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'console')
const stepperPath = join(consoleDir, 'render-procedure-stepper.js')
const require = createRequire(import.meta.url)
const runtime = require(join(consoleDir, 'nn-runtime.js'))
const core = require(join(consoleDir, 'console-payload.generated.cjs'))

const FILE = 'kNNowledge/review_procedures_NN.md'
const REVIEW = `---
level: 3
parent_spec:
  name: "procedures_V_0-6-1"
  url: "https://example.invalid/procedures/spec_NN.md"
knowledge_version: "V_1-0-0"
title: "Review"
---

# NN Procedure

## NN Procedure: Review
slug:: review-procedure

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
decision:: Approve the draft?
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

function runOf(id, graph, events, opts = {}) {
  const defRev = opts.defRev || 'V_1-0-0'
  return {
    id,
    file: `executions/${id}/${id}_executions_NN.md`,
    closed: !!opts.closed,
    defRev,
    params: {},
    seq: opts.seq ?? 3,
    requests: opts.requests ?? {},
    state: core.foldRun(graph, runModelOfEvents(events, { defRev }), { defRev }),
  }
}

function payload(runs) {
  const graph = graphOf(REVIEW)
  return {
    schema: { concepts: [] },
    model: {
      meta: { title: 'Review Domain' },
      elements: [],
      matrices: [],
      procedureGraphs: [{ file: FILE, title: 'Review', graph, runs: runs.map((r) => r(graph)) }],
    },
  }
}

/** A store facade that behaves like ctx.store: it records the drafts a view proposes. */
function draftSpy() {
  const added = []
  return {
    added,
    ctx: {
      store: {
        drafts: () => added,
        propose: (p) => {
          added.push(p)
          return p
        },
      },
    },
  }
}

const STARTED = [
  { kind: 'started', actor: 'ana' },
  { kind: 'step_started', step: 'draft', attempt: 1 },
]
const AT_REVIEW = [
  ...STARTED,
  { kind: 'step_completed', step: 'draft', next: 'review' },
  { kind: 'step_started', step: 'review', attempt: 1 },
]

describe('procedure view: an action records a Step Request', () => {
  let doc
  let container
  let stepper

  beforeEach(() => {
    const dom = new JSDOM('<!doctype html><html><body><div id="c"></div></body></html>')
    doc = dom.window.document
    container = doc.getElementById('c')
    global.window = dom.window
    global.document = doc
    global.self = dom.window
    global.nnConsole = runtime
    dom.window.nnConsole = runtime
    stepper = require(stepperPath)
  })

  const mount = (p, ctx) => stepper.mount(container, p, ctx)
  const actionIds = () =>
    [...container.querySelectorAll('[data-proc-action]')].map((b) =>
      b.getAttribute('data-proc-action'),
    )
  const enabled = () =>
    [...container.querySelectorAll('[data-proc-action]')]
      .filter((b) => !b.disabled)
      .map((b) => b.getAttribute('data-proc-action'))
  const click = (el) => el.dispatchEvent(new doc.defaultView.Event('click'))

  it('offers no action when the procedure has no runs', () => {
    mount(payload([]), draftSpy().ctx)
    assert.deepEqual(actionIds(), [], 'a definition has nothing to ask')
  })

  it('offers the three actions a request can carry, and nothing that closes a run', () => {
    mount(payload([(g) => runOf('r1', g, AT_REVIEW)]), draftSpy().ctx)
    assert.deepEqual([...new Set(enabled())].sort(), ['complete', 'fail', 'wait'])
    assert.ok(!actionIds().includes('start'), 'start is not a request: the agent claims a step')
    assert.ok(
      !actionIds().includes('finish'),
      'finish needs close_model, which a request cannot emit',
    )
    assert.ok(!actionIds().includes('cancel'), 'cancel needs close_model too')
    assert.ok(!actionIds().includes('pause'), 'pause is run-level, not a step request')
  })

  it('offers no action on a step that has not begun', () => {
    mount(payload([(g) => runOf('r1', g, [{ kind: 'started', actor: 'ana' }])]), draftSpy().ctx)
    assert.deepEqual(
      actionIds().filter((a) => a === 'complete' || a === 'wait' || a === 'fail'),
      [],
      'a pending step is claimed by the runner, never asked for',
    )
  })

  it('offers nothing once the run is closed', () => {
    mount(payload([(g) => runOf('r1', g, AT_REVIEW, { closed: true })]), draftSpy().ctx)
    assert.deepEqual(enabled(), [], 'a closed run cannot be advanced')
  })

  it('answers a decision with one button per branch, never an outcome-less complete', () => {
    const spy = draftSpy()
    mount(payload([(g) => runOf('r1', g, AT_REVIEW)]), spy.ctx)

    const completes = [...container.querySelectorAll('[data-proc-action="complete"]')]
    assert.deepEqual(
      completes.map((b) => b.getAttribute('data-proc-outcome')),
      ['approve', 'decline'],
      'every complete names its branch',
    )
    assert.deepEqual(
      completes.map((b) => b.textContent),
      ['Approve', 'Decline'],
      'labelled by the branch token',
    )
    assert.ok(
      completes.every((b) => b.closest('.exec-step-card')),
      'the answer lives in the step card',
    )
    assert.equal(container.querySelector('select'), null, 'no branch drop-down')

    click(container.querySelector('[data-proc-outcome="approve"]'))
    assert.equal(spy.added.length, 1)
    const fields = JSON.parse(spy.added[0].proposed)
    assert.equal(fields.action, 'complete')
    assert.equal(fields.step, 'review')
    assert.equal(fields.requested_outcome, 'approve')
  })

  it('creates ONE Step Request pinned to the seq, carrying the step and the action', () => {
    const spy = draftSpy()
    mount(payload([(g) => runOf('r1', g, AT_REVIEW, { seq: 7 })]), spy.ctx)
    // A failed step names why: the field the action row renders carries it.
    container.querySelector('[data-proc-request-value]').value = 'no data'
    click(container.querySelector('[data-proc-action="fail"]'))

    assert.equal(spy.added.length, 1, 'one request per action')
    const [d] = spy.added
    assert.equal(d.kind, 'new')
    assert.equal(d.concept, 'Step Request', 'never an Execution Event')
    assert.equal(d.knowledge_id, 'r1', 'the draft targets the run model')
    assert.equal(d.element, 'q-001')
    assert.equal(d.element_slug, 'q-001')
    const fields = JSON.parse(d.proposed)
    assert.equal(fields.action, 'fail')
    assert.equal(fields.step, 'review')
    assert.equal(fields.base_seq, 7, 'the request pins the seq the person saw')
    assert.equal(fields.request_status, 'pending')
  })

  it('a pending request disables the step and says it waits for the agent', () => {
    mount(
      payload([
        (g) =>
          runOf('r1', g, AT_REVIEW, {
            requests: { 'q-001': { action: 'complete', status: 'pending', step: 'review' } },
          }),
      ]),
      draftSpy().ctx,
    )
    const note = container.querySelector('[data-proc-waiting]')
    assert.ok(note, 'the pending ask is shown')
    assert.match(note.textContent, /Waiting for the agent/)
    assert.equal(container.querySelector('[data-proc-action="complete"]'), null, 'no second ask')
  })

  it('never applies anything: the request waits for procedure_record', () => {
    const spy = draftSpy()
    mount(payload([(g) => runOf('r1', g, AT_REVIEW)]), spy.ctx)
    container.querySelector('[data-proc-request-value]').value = 'no data'
    click(container.querySelector('[data-proc-action="fail"]'))
    assert.equal(spy.added.length, 1, 'the request was proposed, never applied')
    assert.equal(
      container.querySelector('[data-proc-action="apply"]'),
      null,
      'no apply control exists',
    )
    assert.equal(
      container.querySelector('[data-proc-action="finish"]'),
      null,
      'the console cannot close a run',
    )
  })

  it('renders no actions at all without a draft store (read-only console)', () => {
    stepper.mount(container, payload([(g) => runOf('r1', g, AT_REVIEW)]))
    assert.deepEqual(actionIds(), [], 'a console without a store offers no write')
  })

  it('offers start on an unstarted manual step and disables upon proposing a draft', () => {
    const BEFORE_REVIEW = [...STARTED, { kind: 'step_completed', step: 'draft', next: 'review' }]
    const spy = draftSpy()
    mount(payload([(g) => runOf('r1', g, BEFORE_REVIEW)]), spy.ctx)
    assert.deepEqual(enabled(), ['start'], 'a pending human step offers start')

    click(container.querySelector('[data-proc-action="start"]'))
    assert.equal(spy.added.length, 1)
    const proposed = JSON.parse(spy.added[0].proposed)
    assert.equal(proposed.action, 'start')
    assert.equal(proposed.step, 'review')

    // After click, draftRequestsOf detects the proposed draft, disabling further asks
    const note = container.querySelector('[data-proc-waiting]')
    assert.ok(note, 'draft request shows waiting note')
    assert.match(note.textContent, /not sent yet/)
    assert.equal(
      container.querySelector('[data-proc-action="start"]'),
      null,
      'no second start click',
    )
  })
})
