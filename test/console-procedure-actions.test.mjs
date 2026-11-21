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
    events,
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

// A store facade that behaves like ctx.store: it records the drafts a view proposes.
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

describe('procedure view: advancing a run writes a draft', () => {
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
    assert.deepEqual(actionIds(), [], 'a definition has nothing to advance')
  })

  it('offers the actions the fold allows on an open step, and nothing that closes a run', () => {
    mount(payload([(g) => runOf('r1', g, STARTED)]), draftSpy().ctx)
    // The runner's `allowedActions` for an active step: wait, complete, fail, plus pause.
    assert.deepEqual(enabled(), ['wait', 'complete', 'fail', 'pause'])
    assert.ok(!actionIds().includes('finish'), 'finish is not offered: it needs close_model')
    assert.ok(!actionIds().includes('cancel'), 'cancel is not offered: it needs close_model')
  })

  it('offers start, not complete, on a step that has not begun', () => {
    mount(payload([(g) => runOf('r1', g, [{ kind: 'started', actor: 'ana' }])]), draftSpy().ctx)
    assert.deepEqual(enabled(), ['start', 'pause'])
  })

  it('offers nothing once the run is closed', () => {
    mount(payload([(g) => runOf('r1', g, STARTED, { closed: true })]), draftSpy().ctx)
    assert.deepEqual(enabled(), [], 'a closed run cannot be advanced')
  })

  it('offers only rebase when the run drifted from its definition', () => {
    mount(payload([(g) => runOf('r1', g, STARTED, { defRev: 'V_0-9-0' })]), draftSpy().ctx)
    assert.deepEqual(enabled(), ['rebase'])
  })

  it('offers only resume when the run is paused', () => {
    mount(payload([(g) => runOf('r1', g, [...STARTED, { kind: 'interrupted' }])]), draftSpy().ctx)
    assert.deepEqual(enabled(), ['resume'])
  })

  it('will not complete a decision step until a branch is chosen, then records the outcome', () => {
    const spy = draftSpy()
    mount(payload([(g) => runOf('r1', g, AT_REVIEW)]), spy.ctx)

    const complete = container.querySelector('[data-proc-action="complete"]')
    assert.ok(complete, 'complete is offered on a decision step')

    // Two branches, nothing chosen: the guard refuses and says why.
    click(complete)
    assert.equal(spy.added.length, 0, 'no draft without a branch')
    const err = container.querySelector('.proc-action-error')
    assert.ok(err, 'the refusal is shown, not swallowed')
    assert.match(err.textContent, /branch/i)

    // The branch control lists both outcomes; choosing one records it.
    const select = container.querySelector('[data-proc-outcome]')
    assert.ok(select, 'a branch selector is offered')
    const values = [...select.querySelectorAll('option')].map((o) => o.value).filter(Boolean)
    assert.deepEqual(values, ['approve', 'decline'])

    select.value = 'approve'
    click(complete)
    assert.equal(spy.added.length, 1)
    const fields = JSON.parse(spy.added[0].proposed)
    assert.equal(fields.kind, 'step_completed')
    assert.equal(fields.step, 'review')
    assert.equal(fields.outcome, 'approve')
    assert.equal(fields.next, 'publish')
  })

  it('creates ONE event draft carrying the fields the runner records', () => {
    const spy = draftSpy()
    mount(payload([(g) => runOf('r1', g, STARTED.toSpliced?.() || STARTED)]), spy.ctx)
    const fail = container.querySelector('[data-proc-action="fail"]')
    click(fail)

    assert.equal(spy.added.length, 1, 'one draft per action')
    const [d] = spy.added
    assert.equal(d.kind, 'new')
    assert.equal(d.concept, 'Execution Event')
    assert.equal(d.knowledge_id, 'r1', 'the draft targets the run model')
    assert.equal(d.element, 'e-003', 'the event follows the two already recorded')
    assert.equal(d.element_slug, 'e-003')
    const fields = JSON.parse(d.proposed)
    assert.equal(fields.kind, 'step_failed')
    assert.equal(fields.step, 'draft')
  })

  it('records run-level facts without a step, exactly as the runner writes them', () => {
    const paused = draftSpy()
    mount(payload([(g) => runOf('r1', g, [...STARTED, { kind: 'interrupted' }])]), paused.ctx)
    click(container.querySelector('[data-proc-action="resume"]'))
    assert.equal(paused.added.length, 1)
    const resumed = JSON.parse(paused.added[0].proposed)
    assert.deepEqual(
      resumed,
      { kind: 'resumed' },
      'resume carries no step: the runner records it run-level',
    )
  })

  it('never applies anything: the panel says the draft waits for apply_change', () => {
    const spy = draftSpy()
    mount(payload([(g) => runOf('r1', g, STARTED)]), spy.ctx)
    click(container.querySelector('[data-proc-action="complete"]'))
    const note = container.querySelector('.proc-draft-pending')
    assert.ok(note, 'the pending draft is stated')
    assert.match(note.textContent, /apply_change/i)
    assert.match(note.textContent, /e-003/)
    assert.equal(
      container.querySelector('[data-proc-action="apply"]'),
      null,
      'no apply control exists',
    )
  })

  it('renders no actions at all without a draft store (read-only console)', () => {
    stepper.mount(container, payload([(g) => runOf('r1', g, STARTED)]))
    assert.deepEqual(actionIds(), [], 'a console without a store offers no write')
  })
})
