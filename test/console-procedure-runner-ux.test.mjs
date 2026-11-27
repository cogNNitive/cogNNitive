/* The console as a person runs it from an emailed file (procedure-runner-ux S6, S9): slot
   values instead of `{slot}` placeholders, the run's seq on every request, one button per
   branch, the run projected through the real fold once answered, a run requested from a slot
   form, and the "Your turn" inbox first. Drives the real stepper over the real nn-core fold. */
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runModelOfEvents } from './helpers/run-model-of-events.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')
const consoleDir = join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'console')
const stepperPath = join(consoleDir, 'render-procedure-stepper.js')
const corePath = join(consoleDir, 'nn-procedure-core.js')
const require = createRequire(import.meta.url)
const runtime = require(join(consoleDir, 'nn-runtime.js'))
const payloadCore = require(join(consoleDir, 'console-payload.generated.cjs'))

const FILE = 'procedures/ingest_procedures_NN.md'
const INGEST = `---
level: 3
parent_spec:
  name: "procedures_V_0-6-1"
  url: "https://example.invalid/procedures/spec_NN.md"
knowledge_version: "V_1-0-0"
title: "Ingest"
slots:
  - { name: batch, kind: value, required: true }
  - { name: language, kind: value, required: false, default: "es" }
---

# NN Procedure

## NN Procedure: Ingest
slug:: ingest

# NN Work

## NN Work: Transcribe
slug:: transcribe
step_type:: task
executor:: engine
command:: node transcribe.js staging/{batch}.wav
output:: @raw-transcript
next:: @review

## NN Work: Review
slug:: review
step_type:: decision
executor:: human
decision:: Is batch {batch} good enough?
input:: @raw-transcript
next:: [@normalize, @discard]

## NN Work: Normalize
slug:: normalize
step_type:: task
executor:: agent
condition:: outcome == approve

## NN Work: Discard
slug:: discard
step_type:: task
executor:: agent
condition:: outcome == reject

# NN Artifact

## NN Artifact: Raw Transcript
slug:: raw-transcript
verify:: file:staging/{batch}-transcript.md
`

const REV = 'a'.repeat(64)
const STARTED = [{ kind: 'started', actor: 'engine' }]
const AT_TRANSCRIBE = [...STARTED, { kind: 'step_started', step: 'transcribe', attempt: 1 }]
const DONE_TRANSCRIBE = [
  ...AT_TRANSCRIBE,
  { kind: 'step_completed', step: 'transcribe', next: 'review' },
  {
    kind: 'artifact_validated',
    field: 'raw-transcript',
    value: 'staging/b1-transcript.md',
    rev: REV,
    step: 'transcribe',
  },
]
const AT_REVIEW = [...DONE_TRANSCRIBE, { kind: 'step_started', step: 'review', attempt: 1 }]
const WAITING_REVIEW = [...AT_REVIEW, { kind: 'step_waiting', step: 'review', value: 'a person' }]
/** A run a person decided in: approved at the review, normalized, and finished by the agent. */
const COMPLETED_BY_A_PERSON = [
  ...AT_REVIEW,
  { kind: 'step_completed', step: 'review', outcome: 'approve', next: 'normalize' },
  { kind: 'step_started', step: 'normalize', attempt: 1 },
  { kind: 'step_completed', step: 'normalize' },
]

const graph = () => payloadCore.procedureGraph(payloadCore.parseKnowledge(INGEST))

/** A human task that writes a required deliverable and an optional one (private run outputs). */
const DELIVER = `---
level: 3
parent_spec:
  name: "procedures_V_0-6-1"
  url: "https://example.invalid/procedures/spec_NN.md"
knowledge_version: "V_1-0-0"
title: "Document"
---

# NN Procedure

## NN Procedure: Document
slug:: document

# NN Work

## NN Work: Write SOP
slug:: write-sop
step_type:: task
executor:: human
output:: [@sop, @notes]
next:: @publish

## NN Work: Publish
slug:: publish
step_type:: task
executor:: agent

# NN Artifact

## NN Artifact: Standard Operating Procedure
slug:: sop
verify:: file:docs/sop.md

## NN Artifact: Notes
slug:: notes
required:: false
verify:: file:docs/notes.md
`
const deliverGraph = () => payloadCore.procedureGraph(payloadCore.parseKnowledge(DELIVER))
const AT_WRITE = [...STARTED, { kind: 'step_started', step: 'write-sop', attempt: 1 }]

function runOf(id, events, opts = {}) {
  const g = opts.graph ?? graph()
  const defRev = 'V_1-0-0'
  const model = runModelOfEvents(events, { defRev, procedure: FILE, state: opts.state })
  model.params = opts.params ?? { batch: 'b1', language: 'es' }
  model.seq = opts.seq ?? 7
  if (opts.claimedAt)
    model.steps.transcribe = { ...model.steps.transcribe, claimedAt: opts.claimedAt }
  return {
    id,
    file: `executions/${id}/${id}_executions_NN.md`,
    closed: !!opts.closed,
    defRev,
    params: model.params,
    seq: model.seq,
    requests: opts.requests ?? {},
    model,
    embeds: opts.embeds ?? {},
    state: payloadCore.foldRun(g, model, { defRev }),
    ...(opts.handoff ? { handoff: opts.handoff } : {}),
  }
}

function payload(runs, g = graph()) {
  return {
    schema: { concepts: [] },
    model: {
      meta: { modelId: 'intake', domainId: 'intake-1234' },
      elements: [],
      matrices: [],
      procedureGraphs: [
        {
          file: FILE,
          title: 'Ingest',
          graph: g,
          slots: [
            { name: 'batch', kind: 'value', required: true },
            { name: 'language', kind: 'value', required: false, default: 'es' },
          ],
          runs,
        },
      ],
    },
  }
}

/** The console's store facade, as nn-runtime hands it to an editable view. */
function storeSpy() {
  const drafts = []
  let n = 0
  return {
    drafts,
    ctx: {
      store: {
        drafts: () => drafts.slice(),
        propose: (p) => {
          const d = { ...p, id: 'd' + ++n }
          drafts.push(d)
          return d
        },
        remove: (id) => {
          const i = drafts.findIndex((d) => d.id === id)
          if (i !== -1) drafts.splice(i, 1)
        },
      },
    },
  }
}

describe('procedure runner UX (standalone console)', () => {
  let dom
  let doc
  let container
  let stepper

  beforeEach(() => {
    dom = new JSDOM('<!doctype html><html><body><div id="c"></div></body></html>')
    doc = dom.window.document
    container = doc.getElementById('c')
    global.window = dom.window
    global.document = doc
    global.self = dom.window
    global.nnConsole = runtime
    dom.window.nnConsole = runtime
    delete require.cache[require.resolve(corePath)]
    const core = require(corePath)
    core.use({ foldRun: payloadCore.foldRun })
    dom.window.nnProcedureCore = core
    global.nnProcedureCore = core
    stepper = require(stepperPath)
  })

  const click = (el) => el.dispatchEvent(new doc.defaultView.Event('click'))
  const text = () => container.textContent

  it('resolves {slot} placeholders from the run params: question, command and file', () => {
    stepper.mount(container, payload([runOf('r1', WAITING_REVIEW)]), storeSpy().ctx)
    assert.match(container.querySelector('.exec-step-question').textContent, /batch b1 good/)
    const open = container.querySelector(
      '[data-proc-artifact="raw-transcript"] .proc-artifact-open',
    )
    assert.equal(open.textContent, 'Open staging/b1-transcript.md')
    click(container.querySelector('.dag-node[data-step="transcribe"]'))
    assert.match(text(), /node transcribe\.js staging\/b1\.wav/)
    assert.doesNotMatch(text(), /\{batch\}/, 'no raw placeholder anywhere')
  })

  it('fillSlots marks a slot with no value instead of printing raw braces', () => {
    assert.equal(stepper.fillSlots('a {x} b {y}', { x: '1' }), 'a 1 b ‹y›')
  })

  it('pins every request to the seq of the run the person saw', () => {
    const spy = storeSpy()
    stepper.mount(container, payload([runOf('r1', WAITING_REVIEW, { seq: 7 })]), spy.ctx)
    click(container.querySelector('[data-proc-outcome="approve"]'))
    assert.equal(JSON.parse(spy.drafts[0].proposed).base_seq, 7)
  })

  it('answers with one button per branch, with an optional note as the reason', () => {
    const spy = storeSpy()
    stepper.mount(container, payload([runOf('r1', WAITING_REVIEW)]), spy.ctx)
    const labels = [...container.querySelectorAll('.exec-step-card [data-proc-outcome]')].map(
      (b) => b.textContent,
    )
    assert.deepEqual(labels, ['Approve', 'Reject'])
    container.querySelector('[data-proc-reason]').value = 'clean audio'
    click(container.querySelector('[data-proc-outcome="reject"]'))
    assert.equal(spy.drafts.length, 1)
    const fields = JSON.parse(spy.drafts[0].proposed)
    assert.equal(spy.drafts[0].concept, 'Step Request')
    assert.equal(fields.action, 'complete')
    assert.equal(fields.step, 'review')
    assert.equal(fields.requested_outcome, 'reject')
    assert.equal(fields.requested_value, 'clean audio')
  })

  it('projects the run through the fold once answered, and undoes it until sent', () => {
    const spy = storeSpy()
    stepper.mount(container, payload([runOf('r1', WAITING_REVIEW)]), spy.ctx)
    click(container.querySelector('[data-proc-outcome="approve"]'))

    const normalize = container.querySelector('.dag-node[data-step="normalize"]')
    assert.ok(normalize.classList.contains('current'), 'the run advanced to the next step')
    assert.ok(normalize.classList.contains('projected'), 'marked as not recorded yet')
    assert.ok(container.querySelector('[data-proc-projected]'), 'the panel says it is projected')
    const card = container.querySelector('.exec-step-card')
    assert.equal(card.getAttribute('data-step'), 'normalize')
    assert.ok(card.querySelector('[data-proc-system="agent"]'), 'labelled as a system step')
    assert.match(card.textContent, /Next action: save your previous response/)

    click(container.querySelector('.dag-node[data-step="review"]'))
    const decided = container.querySelector('[data-proc-decided]')
    assert.match(decided.textContent, /Decided: approve/)
    assert.match(decided.textContent, /not sent yet/)
    click(decided.querySelector('[data-proc-undo]'))
    assert.equal(spy.drafts.length, 0, 'the answer is gone')
    assert.equal(
      container.querySelector('.dag-node[data-step="review"]').classList.contains('current'),
      true,
      'the run is back where the export left it',
    )
    assert.ok(container.querySelector('[data-proc-outcome="approve"]'), 'and can be answered again')
  })

  it('renders every typed start field and stages its value as typed JSON', () => {
    dom.window.nnUI = require(join(consoleDir, 'ui-kit.js'))
    const spy = storeSpy()
    const data = payload([])
    data.model.files = {
      inventory: [
        { path: 'intake.md', snippet: 'Inventory brief' },
        { path: 'procedures/old_procedures_NN.md', snippet: 'a model, not a brief' },
        { path: 'data.csv', snippet: 'a,b' },
      ],
    }
    data.model.procedureGraphs[0].slots = [
      {
        name: 'batch',
        type: 'select',
        label: 'Source brief',
        description: 'Pick the brief',
        source: 'markdown-files',
      },
      {
        name: 'language',
        type: 'string',
        output: { directory: 'procedures', suffix: '_procedures_NN.md' },
      },
      { name: 'amount', type: 'number', default: 0 },
      { name: 'approved', type: 'boolean', default: false },
      { name: 'teams', type: 'multiselect', options: ['A', 'B'], default: ['B'] },
      { name: 'owner', type: 'reference', default: '@owner' },
      { name: 'notes', type: 'markdown', default: '**draft**' },
      { name: 'summary', type: 'markdown_inline', default: '*short*' },
    ].map((slot) => ({ kind: 'value', required: true, ...slot }))
    stepper.mount(container, data, spy.ctx)
    click(container.querySelector('[data-proc-start-run]'))
    const field = (name) => container.querySelector(`[data-proc-slot="${name}"]`)
    assert.match(container.querySelector('[data-proc-start-form]').textContent, /Source brief/)
    assert.match(container.querySelector('[data-proc-start-form]').textContent, /Pick the brief/)
    assert.equal(field('batch').getAttribute('data-nn-widget'), 'select')
    assert.deepEqual(
      [...field('batch').options].map((o) => o.value).filter(Boolean),
      ['intake.md'],
      'only Markdown briefs that are not models are offered',
    )
    field('batch').value = 'intake.md'
    field('batch').dispatchEvent(new dom.window.Event('change'))
    assert.match(text(), /Inventory brief/)
    field('language').value = 'Monthly inventory'
    field('language').dispatchEvent(new dom.window.Event('input'))
    assert.match(
      text(),
      /Destination once the procedure runs: procedures\/monthly-inventory_procedures_NN.md/,
    )
    container.querySelector('[data-proc-start-form]').dispatchEvent(new dom.window.Event('submit'))
    assert.deepEqual(spy.drafts[0].params, {
      batch: 'intake.md',
      language: 'procedures/monthly-inventory_procedures_NN.md',
      amount: 0,
      approved: false,
      teams: ['B'],
      owner: '@owner',
      notes: '**draft**',
      summary: '*short*',
    })
  })

  it('refuses an output path that already exists in the export', () => {
    dom.window.nnUI = require(join(consoleDir, 'ui-kit.js'))
    const spy = storeSpy()
    const data = payload([])
    data.model.files = { inventory: [{ path: 'procedures/monthly_procedures_NN.md' }] }
    data.model.procedureGraphs[0].slots = [
      {
        name: 'batch',
        kind: 'value',
        required: true,
        type: 'string',
        output: { directory: 'procedures', suffix: '_procedures_NN.md' },
      },
    ]
    stepper.mount(container, data, spy.ctx)
    click(container.querySelector('[data-proc-start-run]'))
    container.querySelector('[data-proc-slot="batch"]').value = 'Monthly'
    container.querySelector('[data-proc-start-form]').dispatchEvent(new dom.window.Event('submit'))
    assert.match(text(), /already exists/)
    assert.deepEqual(spy.drafts, [])
  })

  it('explains why a required file picker cannot start without exported files', () => {
    dom.window.nnUI = require(join(consoleDir, 'ui-kit.js'))
    const spy = storeSpy()
    const data = payload([])
    data.model.procedureGraphs[0].slots[0] = {
      name: 'batch',
      kind: 'value',
      type: 'select',
      source: 'markdown-files',
      required: true,
    }
    stepper.mount(container, data, spy.ctx)
    click(container.querySelector('[data-proc-start-run]'))
    assert.match(text(), /No compatible files were exported/)
    assert.equal(container.querySelector('[data-proc-start-submit]').disabled, true)
    container.querySelector('[data-proc-start-form]').dispatchEvent(new dom.window.Event('submit'))
    assert.deepEqual(spy.drafts, [])
  })

  it('exports the typed presentation of a slot and keeps legacy slots as they were', async () => {
    const { slotDeclarationsOf } = await import('../scripts/export-console.mjs')
    const output = { directory: 'procedures', suffix: '_procedures_NN.md' }
    assert.deepEqual(
      slotDeclarationsOf({
        slots: [
          'plain',
          { name: 'legacy', default: 3 },
          {
            name: 'count',
            type: 'number',
            label: 'How many',
            default: 3,
            options: ['x', 4],
            source: 'markdown-files',
            output: { ...output, extra: 1 },
          },
          { name: 'bad', source: 'elsewhere', output: { directory: 1, suffix: '' } },
        ],
      }),
      [
        { name: 'plain', kind: 'value', required: true },
        { name: 'legacy', kind: 'value', required: true, default: '3' },
        {
          name: 'count',
          kind: 'value',
          required: true,
          default: 3,
          type: 'number',
          label: 'How many',
          options: ['x'],
          source: 'markdown-files',
          output,
        },
        { name: 'bad', kind: 'value', required: true },
      ],
    )
  })

  it('asks for the Document SOP start values by their typed fields', async () => {
    const { slotDeclarationsOf } = await import('../scripts/export-console.mjs')
    dom.window.nnUI = require(join(consoleDir, 'ui-kit.js'))
    const sop = readFileSync(
      join(consoleDir, '..', 'procedures', 'procedures', 'document_sop_procedures_NN.md'),
      'utf8',
    )
    const slots = slotDeclarationsOf(payloadCore.parseKnowledge(sop).frontmatter)
    assert.deepEqual(
      slots.map((s) => [s.name, s.type, s.source, s.output?.directory]),
      [
        ['intake', 'select', 'markdown-files', undefined],
        ['sop', 'string', undefined, 'procedures'],
      ],
    )
    const spy = storeSpy()
    const data = payload([])
    data.model.files = { inventory: [{ path: 'intake.md', snippet: 'Inventory brief' }] }
    data.model.procedureGraphs[0].slots = slots
    data.model.procedureGraphs[0].graph.slots = [] // the fixture graph's own {batch} is not this procedure's
    stepper.mount(container, data, spy.ctx)
    click(container.querySelector('[data-proc-start-run]'))
    container.querySelector('[data-proc-slot="intake"]').value = 'intake.md'
    container.querySelector('[data-proc-slot="sop"]').value = 'Inventory SOP'
    container.querySelector('[data-proc-start-form]').dispatchEvent(new dom.window.Event('submit'))
    assert.deepEqual(spy.drafts[0].params, {
      intake: 'intake.md',
      sop: 'procedures/inventory-sop_procedures_NN.md',
    })
  })

  it('answers a not yet started human decision in one response: start, then the outcome', () => {
    const spy = storeSpy()
    stepper.mount(container, payload([runOf('r1', DONE_TRANSCRIBE)]), spy.ctx)
    assert.equal(container.querySelector('[data-proc-action="start"]'), null)
    const approve = container.querySelector('[data-proc-outcome="approve"]')
    assert.ok(approve, 'the outcomes are offered without a separate start submission')
    assert.ok(container.querySelector('[data-proc-outcome="reject"]'))
    click(approve)
    const sent = spy.drafts.map((d) => JSON.parse(d.proposed))
    assert.deepEqual(
      sent.map((f) => [f.action, f.step, f.base_seq]),
      [
        ['start', 'review', 7],
        ['complete', 'review', 7],
      ],
    )
    assert.equal(sent[0].requested_outcome, undefined)
    assert.equal(sent[1].requested_outcome, 'approve')
    assert.ok(container.querySelector('[data-proc-projected]'))
  })

  it('marks a not yet started linear human task done with start and complete', () => {
    const run = runOf('r1', [
      ...AT_REVIEW,
      { kind: 'step_completed', step: 'review', outcome: 'approve', next: 'normalize' },
    ])
    const data = payload([run])
    data.model.procedureGraphs[0].graph.steps.normalize.executor = 'human'
    const spy = storeSpy()
    stepper.mount(container, data, spy.ctx)
    const done = container.querySelector('[data-proc-action="complete"]')
    assert.equal(done?.textContent, 'Mark as done')
    click(done)
    assert.deepEqual(
      spy.drafts.map((d) => JSON.parse(d.proposed).action),
      ['start', 'complete'],
    )
  })

  it('leaves no start draft behind when the answer itself is refused', () => {
    const spy = storeSpy()
    const propose = spy.ctx.store.propose
    spy.ctx.store.propose = (p) => {
      if (JSON.parse(p.proposed).action === 'complete') throw new Error('read-only export')
      return propose(p)
    }
    stepper.mount(container, payload([runOf('r1', DONE_TRANSCRIBE)]), spy.ctx)
    click(container.querySelector('[data-proc-outcome="approve"]'))
    assert.deepEqual(spy.drafts, [])
    assert.match(text(), /read-only export/)
  })

  it('shows a preview-only handoff on the step the unsent answer led to', () => {
    const spy = storeSpy()
    stepper.mount(container, payload([runOf('r1', WAITING_REVIEW)]), spy.ctx)
    click(container.querySelector('[data-proc-outcome="approve"]'))
    const card = container.querySelector('.exec-step-card')
    assert.equal(card.getAttribute('data-step'), 'normalize')
    assert.match(card.textContent, /Next action: save your previous response/)
    assert.match(card.textContent, /Preview only: the Runner has not confirmed/)
    assert.equal(card.querySelector('[data-proc-system-note]'), null)
    assert.equal(card.querySelector('[data-proc-action]'), null, 'nothing to complete yet')
    // The button is the one in the response bar: with no name yet, it asks for it.
    click(card.querySelector('[data-proc-preview-save]'))
    assert.match(
      container.querySelector('[data-proc-response]').textContent,
      /Type your name first/,
    )
    assert.equal(spy.drafts.length, 1, 'saving writes no request of its own')
  })

  it('shows no preview-only handoff on the step the export itself is at', () => {
    stepper.mount(container, payload([runOf('r1', AT_TRANSCRIBE)]), storeSpy().ctx)
    assert.equal(container.querySelector('[data-proc-preview-save]'), null)
    assert.match(
      container.querySelector('[data-proc-system-note]').textContent,
      new RegExp(stepper.SYSTEM_STEP_NOTE.replace(/\./g, '\\.')),
    )
  })

  it('requests a new run from the slot form, with the declared defaults', () => {
    const spy = storeSpy()
    stepper.mount(container, payload([runOf('r1', WAITING_REVIEW)]), spy.ctx)
    click(container.querySelector('[data-proc-start-run]'))
    const form = container.querySelector('[data-proc-start-form]')
    assert.equal(form.querySelector('[data-proc-slot="language"]').value, 'es')
    form.dispatchEvent(new doc.defaultView.Event('submit', { cancelable: true }))
    assert.equal(spy.drafts.length, 0, 'a required slot left empty refuses the request')
    assert.match(form.textContent, /Fill in batch/)

    container.querySelector('[data-proc-slot="batch"]').value = 'b2'
    container
      .querySelector('[data-proc-start-form]')
      .dispatchEvent(new doc.defaultView.Event('submit', { cancelable: true }))
    assert.deepEqual(
      spy.drafts.map((d) => ({ kind: d.kind, procedure: d.procedure, params: d.params })),
      [{ kind: 'run_start', procedure: FILE, params: { batch: 'b2', language: 'es' } }],
    )
    const chip = container.querySelector('[data-proc-run-request]')
    assert.match(chip.textContent, /Requested · starts when you send your response/)
    click(chip.querySelector('[data-proc-undo]'))
    assert.equal(spy.drafts.length, 0)
  })

  it('opens on "Your turn": waiting human steps first, then active ones, never system steps', () => {
    stepper.mount(
      container,
      payload([runOf('r-a', AT_REVIEW), runOf('r-b', WAITING_REVIEW), runOf('r-c', AT_TRANSCRIBE)]),
      storeSpy().ctx,
    )
    const items = [...container.querySelectorAll('[data-proc-inbox-item]')]
    assert.deepEqual(
      items.map((i) => i.getAttribute('data-run-id')),
      ['r-b', 'r-a'],
    )
    assert.match(items[0].textContent, /Is batch b1 good enough\?/)
    const inbox = container.querySelector('[data-proc-inbox]')
    const graphCol = container.querySelector('.exec-dag-col')
    assert.ok(
      inbox.compareDocumentPosition(graphCol) & doc.defaultView.Node.DOCUMENT_POSITION_FOLLOWING,
      'the inbox comes before the graph',
    )
    assert.ok(
      container.querySelector('.proc-run[data-run-id="r-b"]').classList.contains('active'),
      'the first run waiting on the person is open',
    )
  })

  it('filters the runs: waiting for me, in progress, closed', () => {
    stepper.mount(
      container,
      payload([
        runOf('r-a', WAITING_REVIEW),
        runOf('r-c', AT_TRANSCRIBE),
        runOf('r-z', DONE_TRANSCRIBE, { state: 'completed', closed: true }),
      ]),
      storeSpy().ctx,
    )
    const shown = () =>
      [...container.querySelectorAll('.proc-run[data-run-id]')].map((b) =>
        b.getAttribute('data-run-id'),
      )
    click(container.querySelector('[data-proc-filter="closed"]'))
    assert.deepEqual(shown(), ['r-z'], 'a filtered-out run is not kept just because it is selected')
    click(container.querySelector('[data-proc-filter="mine"]'))
    assert.deepEqual(shown(), ['r-a'])
    click(container.querySelector('[data-proc-filter="open"]'))
    assert.deepEqual(shown(), ['r-a', 'r-c'])
  })

  it('an engine step says the system runs it, with the agent instruction collapsed', () => {
    stepper.mount(container, payload([runOf('r-c', AT_TRANSCRIBE)]), storeSpy().ctx)
    const card = container.querySelector('.exec-step-card')
    assert.equal(card.getAttribute('data-step'), 'transcribe')
    assert.ok(card.querySelector('[data-proc-system="engine"]'))
    assert.match(card.textContent, new RegExp(stepper.SYSTEM_STEP_NOTE.replace(/\./g, '\\.')))
    const hint = card.querySelector('details[data-proc-agent-hint]')
    assert.ok(hint, 'the instruction is there for the owner')
    assert.equal(hint.hasAttribute('open'), false, 'collapsed')
    assert.match(hint.textContent, /procedure_record \{"run":"r-c"/)
    assert.equal(card.querySelector('[data-proc-action]'), null, 'nothing to click for a person')
  })

  it('shows a closed run as its summary, with short hashes', () => {
    stepper.mount(
      container,
      payload([
        runOf('r-z', DONE_TRANSCRIBE, {
          state: 'completed',
          closed: true,
          claimedAt: '2026-11-23T10:00:00.000Z',
        }),
      ]),
      storeSpy().ctx,
    )
    const summary = container.querySelector('[data-proc-run-summary]')
    assert.ok(summary, 'a closed run opens on its summary')
    assert.match(summary.textContent, /Path: Transcribe/)
    assert.match(summary.textContent, /Started: 2026-11-23 10:00 UTC/)
    assert.match(summary.textContent, /batch = b1/)
    const state = summary.querySelector('.proc-artifact-state')
    assert.equal(state.textContent, 'validated · rev aaaaaaaa')
    assert.equal(state.getAttribute('title'), 'rev ' + REV)
  })

  it('offers the final handoff of a completed run: two choices, one draft, undone until sent', () => {
    const spy = storeSpy()
    stepper.mount(
      container,
      payload([runOf('r-z', DONE_TRANSCRIBE, { state: 'completed', closed: true })]),
      spy.ctx,
    )
    const card = container.querySelector('[data-proc-handoff]')
    assert.ok(card, 'a completed run asks what to do with its result')
    const labels = [...card.querySelectorAll('[data-proc-handoff-choice]')].map(
      (b) => b.textContent,
    )
    assert.deepEqual(labels, ['Send to the administrator', 'Register with the agent'])
    assert.match(card.textContent, /nothing is added to the domaiNN/i)
    assert.deepEqual(spy.drafts, [], 'looking at the choices writes nothing')

    click(card.querySelector('[data-proc-handoff-choice="administrator"]'))
    assert.equal(spy.drafts.length, 1)
    assert.equal(spy.drafts[0].kind, 'run_handoff')
    assert.equal(spy.drafts[0].run, 'r-z')
    assert.equal(spy.drafts[0].choice, 'administrator')
    const chosen = container.querySelector('[data-proc-handoff]')
    assert.equal(chosen.querySelector('[data-proc-handoff-choice]'), null, 'one choice per run')
    assert.match(chosen.textContent, /Send to the administrator/)
    assert.match(chosen.textContent, /not sent yet/)

    click(chosen.querySelector('[data-proc-undo]'))
    assert.equal(spy.drafts.length, 0, 'the choice is gone')
    click(container.querySelector('[data-proc-handoff-choice="agent"]'))
    assert.equal(spy.drafts[0].choice, 'agent')
  })

  describe('handoff guidance modal', () => {
    const completed = () =>
      payload([runOf('r-z', DONE_TRANSCRIBE, { state: 'completed', closed: true })])
    const modalOf = (choice) => doc.querySelector(`dialog[data-proc-handoff-dialog="${choice}"]`)
    const isOpen = (d) => !!d && d.hasAttribute('open')
    const keydown = (el, key) =>
      el.dispatchEvent(new doc.defaultView.KeyboardEvent('keydown', { key, bubbles: true }))
    const stubClipboard = (impl) =>
      Object.defineProperty(dom.window.navigator, 'clipboard', {
        value: impl,
        configurable: true,
      })

    it('choosing the administrator opens a modal with what to do next, and records one draft', () => {
      const spy = storeSpy()
      stepper.mount(container, completed(), spy.ctx)
      click(container.querySelector('[data-proc-handoff-choice="administrator"]'))
      assert.equal(spy.drafts.length, 1, 'the choice is still one draft')
      assert.equal(spy.drafts[0].choice, 'administrator')
      const modal = modalOf('administrator')
      assert.ok(isOpen(modal), 'the guidance is open')
      assert.equal(modal.getAttribute('aria-modal'), 'true')
      assert.ok(modal.getAttribute('aria-labelledby'), 'it is labelled by its title')
      assert.match(modal.textContent, /Save your response/)
      assert.match(modal.textContent, /administrator/i)
      assert.match(modal.textContent, /send or share the saved HTML file/i)
      assert.equal(modal.querySelector('[data-proc-handoff-copy]'), null, 'no prompt to copy here')
      assert.match(modal.textContent, /executions\/r-z\/outputs\//, 'it names the private outputs')
      assert.match(modal.textContent, /travel with the run/)
      assert.equal(modalOf('agent'), null)

      const close = modal.querySelector('[data-proc-handoff-close]')
      assert.equal(close.textContent, 'Close')
      click(close)
      assert.equal(isOpen(modal), false, 'Close closes it')
      assert.equal(spy.drafts.length, 1, 'closing the modal changes nothing')
    })

    it('moves focus into the modal and back to the handoff card on close', () => {
      stepper.mount(container, completed(), storeSpy().ctx)
      click(container.querySelector('[data-proc-handoff-choice="administrator"]'))
      const modal = modalOf('administrator')
      assert.ok(modal.contains(doc.activeElement), 'focus is inside the modal')
      keydown(modal, 'Escape')
      assert.equal(isOpen(modal), false, 'Escape closes it')
      const card = container.querySelector('[data-proc-handoff]')
      assert.ok(card.contains(doc.activeElement), 'focus returned to the handoff card')
    })

    it('choosing the agent shows a copyable prompt that names the run, the choice and import_console', async () => {
      const spy = storeSpy()
      let copied = null
      stubClipboard({
        writeText: (t) => {
          copied = t
          return Promise.resolve()
        },
      })
      stepper.mount(container, completed(), spy.ctx)
      click(container.querySelector('[data-proc-handoff-choice="agent"]'))
      assert.equal(spy.drafts.length, 1)
      assert.equal(spy.drafts[0].choice, 'agent')
      const modal = modalOf('agent')
      assert.ok(isOpen(modal))
      assert.match(modal.textContent, /Register with the agent/)
      const shown = modal.querySelector('[data-proc-handoff-prompt]')
      assert.ok(shown, 'the prompt is readable in the modal')

      click(modal.querySelector('[data-proc-handoff-copy]'))
      await new Promise((r) => setTimeout(r, 0))
      assert.equal(typeof copied, 'string', 'the prompt reached the clipboard')
      assert.match(copied, /import_console/)
      assert.match(copied, /apply/)
      assert.match(copied, /r-z/)
      assert.match(copied, /agent/)
      assert.match(copied, /run_handoff/)
      assert.doesNotMatch(copied, /nn-drafts|\{slot\}/)
      // The private outputs of the run: published where the procedure declares them, after
      // the choice is recorded.
      assert.match(copied, /executions\/r-z\/outputs\//)
      assert.match(copied, /after .*record.*publish|publish .*after/is)
      assert.match(copied, /where the procedure declares/)
      assert.equal(shown.value, copied, 'what is shown is what is copied')
      assert.match(modal.querySelector('[data-proc-handoff-status]').textContent, /Copied/)
      assert.equal(spy.drafts.length, 1, 'copying writes nothing')

      keydown(modal, 'Escape')
      assert.equal(isOpen(modal), false)
    })

    it('falls back to select-and-copy when the clipboard is not available', () => {
      stubClipboard(undefined)
      stepper.mount(container, completed(), storeSpy().ctx)
      click(container.querySelector('[data-proc-handoff-choice="agent"]'))
      const modal = modalOf('agent')
      click(modal.querySelector('[data-proc-handoff-copy]'))
      assert.match(modal.querySelector('[data-proc-handoff-status]').textContent, /Select and copy/)
      const area = modal.querySelector('[data-proc-handoff-prompt]')
      assert.equal(area.selectionStart, 0)
      assert.equal(area.selectionEnd, area.value.length, 'the whole prompt is selected')
    })

    it('a rejected clipboard write also falls back to select-and-copy', async () => {
      stubClipboard({ writeText: () => Promise.reject(new Error('denied')) })
      stepper.mount(container, completed(), storeSpy().ctx)
      click(container.querySelector('[data-proc-handoff-choice="agent"]'))
      const modal = modalOf('agent')
      click(modal.querySelector('[data-proc-handoff-copy]'))
      await new Promise((r) => setTimeout(r, 0))
      assert.match(modal.querySelector('[data-proc-handoff-status]').textContent, /Select and copy/)
    })

    it('shows the instructions again for the choice already made, without a second draft', () => {
      const spy = storeSpy()
      stepper.mount(container, completed(), spy.ctx)
      click(container.querySelector('[data-proc-handoff-choice="agent"]'))
      click(modalOf('agent').querySelector('[data-proc-handoff-close]'))
      assert.equal(isOpen(modalOf('agent')), false)

      const again = container.querySelector('[data-proc-handoff-open="agent"]')
      assert.ok(again, 'the chosen option can be opened again')
      click(again)
      assert.ok(isOpen(modalOf('agent')))
      assert.equal(doc.querySelectorAll('dialog[data-proc-handoff-dialog]').length, 1, 'one modal')
      assert.equal(spy.drafts.length, 1, 'no second draft')

      click(modalOf('agent').querySelector('[data-proc-handoff-close]'))
      click(container.querySelector('[data-proc-undo]'))
      assert.equal(spy.drafts.length, 0, 'undo still removes the choice')
      assert.equal(container.querySelector('[data-proc-handoff-open]'), null)
    })
  })

  it('opens on a completed run a person decided in until they choose its handoff', () => {
    const spy = storeSpy()
    stepper.mount(
      container,
      payload([
        runOf('r-sys', DONE_TRANSCRIBE, { state: 'completed', closed: true }),
        runOf('r-done', COMPLETED_BY_A_PERSON, { state: 'completed', closed: true }),
      ]),
      spy.ctx,
    )
    const items = () =>
      [...container.querySelectorAll('[data-proc-inbox-item]')].map((i) =>
        i.getAttribute('data-run-id'),
      )
    // A run only the system walked asks nobody; the one a person decided in is their turn.
    assert.deepEqual(items(), ['r-done'])
    assert.match(container.querySelector('[data-proc-inbox-item]').textContent, /Hand off this run/)
    const card = container.querySelector('[data-proc-handoff]')
    assert.equal(card.getAttribute('data-proc-handoff'), 'r-done', 'the console opens on it')
    click(card.querySelector('[data-proc-handoff-choice="agent"]'))
    assert.deepEqual(items(), [], 'a chosen handoff is no longer waiting on the person')
  })

  it('shows a recorded handoff as done: no choice is offered again, and nothing waits', () => {
    const spy = storeSpy()
    stepper.mount(
      container,
      payload([
        runOf('r-done', COMPLETED_BY_A_PERSON, {
          state: 'completed',
          closed: true,
          handoff: { run: 'r-done', choice: 'agent', by: 'ana', at: '2026-11-25T10:00:00.000Z' },
        }),
      ]),
      spy.ctx,
    )
    assert.equal(container.querySelector('[data-proc-inbox-item]'), null)
    container.querySelector('.proc-run[data-run-id="r-done"]') &&
      click(container.querySelector('.proc-run[data-run-id="r-done"]'))
    const card = container.querySelector('[data-proc-handoff]')
    assert.ok(card, 'the run still says what became of its result')
    assert.equal(card.querySelector('[data-proc-handoff-choice]'), null)
    assert.match(card.textContent, /Register with the agent/)
    assert.match(card.textContent, /recorded by ana, 2026-11-25 10:00 UTC/)
    assert.deepEqual(spy.drafts, [])
  })

  it('offers no handoff before the run completes, or when it failed', () => {
    for (const [events, state] of [
      [WAITING_REVIEW, undefined],
      [DONE_TRANSCRIBE, 'failed'],
      [DONE_TRANSCRIBE, 'cancelled'],
    ]) {
      container.innerHTML = ''
      stepper.mount(
        container,
        payload([runOf('r-x', events, { state, closed: !!state })]),
        storeSpy().ctx,
      )
      assert.equal(container.querySelector('[data-proc-handoff]'), null, String(state))
    }
  })

  it('shows the embedded input the person reviews, and opens it without folder access', () => {
    stepper.mount(
      container,
      payload([
        runOf('r1', WAITING_REVIEW, {
          embeds: {
            'raw-transcript': {
              path: 'staging/b1-transcript.md',
              kind: 'text',
              bytes: 20,
              text: '## a.wav\nhello world',
            },
          },
        }),
      ]),
      storeSpy().ctx,
    )
    const embed = container.querySelector('.exec-step-card [data-proc-embed="raw-transcript"]')
    assert.ok(embed, 'the input is in the card')
    assert.match(embed.textContent, /hello world/)
    click(container.querySelector('[data-proc-artifact="raw-transcript"] .proc-artifact-open'))
    assert.match(container.querySelector('.proc-artifact-view').textContent, /hello world/)
  })

  it('makes saving the response the one primary action, after asking the name once', async () => {
    const saved = []
    const rt = {
      ...runtime,
      name: '',
      getReviewerName() {
        return this.name || 'reviewer'
      },
      setReviewerName(n) {
        this.name = n
      },
      saveSnapshot(d) {
        saved.push(d)
        return Promise.resolve({ ok: true, filename: 'intake_console.html' })
      },
    }
    dom.window.nnConsole = rt
    const spy = storeSpy()
    stepper.mount(container, payload([runOf('r1', WAITING_REVIEW)]), spy.ctx)
    assert.equal(container.querySelector('[data-proc-response]'), null, 'nothing to send yet')
    click(container.querySelector('[data-proc-outcome="approve"]'))
    const bar = container.querySelector('[data-proc-response]')
    assert.match(bar.textContent, /1 answer not sent yet/)
    click(bar.querySelector('[data-proc-save-response]'))
    assert.equal(saved.length, 0, 'no save without a name')
    assert.match(bar.textContent, /Type your name/)
    bar.querySelector('[data-proc-reviewer]').value = 'Ana'
    click(bar.querySelector('[data-proc-save-response]'))
    await new Promise((r) => setTimeout(r, 0))
    assert.equal(saved.length, 1)
    assert.equal(rt.name, 'Ana', 'the name is remembered')
    assert.match(
      container.querySelector('[data-proc-saved-note]').textContent,
      /Attach this file to your reply/,
    )
  })

  describe('private run outputs: the person writes the deliverable of their step', () => {
    const deliver = (events, opts = {}) => {
      const g = deliverGraph()
      return payload([runOf('r1', events, { ...opts, graph: g })], g)
    }
    const editorOf = (slug) => container.querySelector(`[data-proc-output="${slug}"]`)
    const typeInto = (el, value) => {
      el.value = value
      el.dispatchEvent(new doc.defaultView.Event('input', { bubbles: true }))
    }
    const doneButton = () => container.querySelector('[data-proc-action="complete"]')
    const hint = () => container.querySelector('[data-proc-output-hint]')

    it('offers an editor for each declared output the step has not validated yet', () => {
      stepper.mount(container, deliver(AT_WRITE), storeSpy().ctx)
      assert.ok(editorOf('sop'), 'the required deliverable')
      assert.ok(editorOf('notes'), 'the optional one')
      assert.match(container.querySelector('.exec-step-card').textContent, /Your deliverable/)
      assert.ok(container.querySelector('input[type="file"][data-proc-output-file="sop"]'))
      assert.ok(container.querySelector('[data-proc-output-name="sop"]'))

      const validated = [
        ...AT_WRITE,
        {
          kind: 'artifact_validated',
          field: 'sop',
          value: 'executions/r1/outputs/sop/sop.md',
          rev: REV,
          step: 'write-sop',
        },
      ]
      stepper.mount(container, deliver(validated), storeSpy().ctx)
      assert.equal(editorOf('sop'), null, 'this step already validated it')
      assert.ok(editorOf('notes'))
    })

    it('keeps "Mark as done" disabled until the required deliverable is written, naming it', () => {
      const spy = storeSpy()
      stepper.mount(container, deliver(AT_WRITE), spy.ctx)
      assert.equal(doneButton().disabled, true)
      assert.match(hint().textContent, /Standard Operating Procedure/)
      assert.doesNotMatch(hint().textContent, /Notes/, 'an optional output never blocks')
      click(doneButton())
      assert.deepEqual(spy.drafts, [], 'a disabled button proposes nothing')

      typeInto(editorOf('sop'), '# SOP\nStep one.')
      assert.equal(doneButton().disabled, false)
      assert.equal(hint().textContent, '')
    })

    it('carries the deliverables on the complete request, leaving out an empty optional one', () => {
      const spy = storeSpy()
      stepper.mount(container, deliver(AT_WRITE), spy.ctx)
      typeInto(editorOf('sop'), '# SOP\nStep one.')
      typeInto(container.querySelector('[data-proc-output-name="sop"]'), 'sop-v1.md')
      click(doneButton())
      assert.equal(spy.drafts.length, 1)
      const fields = JSON.parse(spy.drafts[0].proposed)
      assert.equal(fields.action, 'complete')
      assert.equal(fields.step, 'write-sop')
      assert.equal(
        fields.requested_outputs,
        JSON.stringify({ sop: { name: 'sop-v1.md', text: '# SOP\nStep one.' } }),
      )

      // The card follows the projected run; the answered step shows the undo.
      click(container.querySelector('.dag-node[data-step="write-sop"]'))
      click(container.querySelector('[data-proc-undo]'))
      assert.equal(spy.drafts.length, 0, 'undo removes the request and its deliverable')
      assert.equal(editorOf('sop').value, '# SOP\nStep one.', 'what was typed is still there')
      typeInto(editorOf('notes'), 'a note')
      typeInto(container.querySelector('[data-proc-output-name="sop"]'), '')
      click(doneButton())
      assert.equal(
        JSON.parse(spy.drafts[0].proposed).requested_outputs,
        JSON.stringify({ sop: { text: '# SOP\nStep one.' }, notes: { text: 'a note' } }),
      )
    })

    it('starts and completes a step not started yet, the deliverable on the completion only', () => {
      const spy = storeSpy()
      stepper.mount(container, deliver(STARTED), spy.ctx)
      typeInto(editorOf('sop'), 'body')
      click(doneButton())
      const sent = spy.drafts.map((d) => JSON.parse(d.proposed))
      assert.deepEqual(
        sent.map((f) => f.action),
        ['start', 'complete'],
      )
      assert.equal(sent[0].requested_outputs, undefined)
      assert.equal(sent[1].requested_outputs, JSON.stringify({ sop: { text: 'body' } }))
    })

    it('refuses a deliverable over 256 KiB and proposes nothing', () => {
      const spy = storeSpy()
      stepper.mount(container, deliver(AT_WRITE), spy.ctx)
      // 128 Ki + 1 two-byte characters: under 256 Ki characters, over 256 KiB of UTF-8.
      typeInto(editorOf('sop'), 'é'.repeat(128 * 1024 + 1))
      click(doneButton())
      assert.deepEqual(spy.drafts, [])
      assert.match(container.querySelector('.proc-action-error').textContent, /256 KiB/)
      assert.match(
        container.querySelector('.proc-action-error').textContent,
        /Standard Operating Procedure/,
      )
    })

    it('keeps what the person typed when the view renders again', () => {
      stepper.mount(container, deliver(AT_WRITE), storeSpy().ctx)
      typeInto(editorOf('sop'), 'draft text')
      typeInto(container.querySelector('[data-proc-output-name="sop"]'), 'mine.md')
      // Inspect another step, then come back: the card is rebuilt from scratch.
      click(container.querySelector('.dag-node[data-step="publish"]'))
      assert.equal(editorOf('sop'), null)
      click(container.querySelector('.dag-node[data-step="write-sop"]'))
      assert.equal(editorOf('sop').value, 'draft text')
      assert.equal(container.querySelector('[data-proc-output-name="sop"]').value, 'mine.md')
      assert.equal(doneButton().disabled, false)
    })

    it('loads a text file into the deliverable and its name', async () => {
      stepper.mount(container, deliver(AT_WRITE), storeSpy().ctx)
      const picker = container.querySelector('[data-proc-output-file="sop"]')
      const file = new dom.window.File(['# From disk'], 'sop-draft.md', { type: 'text/markdown' })
      Object.defineProperty(picker, 'files', { value: [file], configurable: true })
      picker.dispatchEvent(new doc.defaultView.Event('change', { bubbles: true }))
      await new Promise((r) => setTimeout(r, 20))
      assert.equal(editorOf('sop').value, '# From disk')
      assert.equal(container.querySelector('[data-proc-output-name="sop"]').value, 'sop-draft.md')
      assert.equal(doneButton().disabled, false)
    })

    it('keeps the outcome buttons of a decision disabled until its required output is written', () => {
      const data = payload([runOf('r1', WAITING_REVIEW)])
      const g = data.model.procedureGraphs[0].graph
      g.steps.review.outputs = ['verdict']
      g.artifacts.verdict = {
        slug: 'verdict',
        name: 'Verdict',
        kind: 'file',
        required: true,
        producers: ['review'],
      }
      const spy = storeSpy()
      stepper.mount(container, data, spy.ctx)
      const approve = () => container.querySelector('[data-proc-outcome="approve"]')
      assert.equal(approve().disabled, true)
      assert.equal(container.querySelector('[data-proc-outcome="reject"]').disabled, true)
      assert.match(hint().textContent, /Verdict/)
      typeInto(editorOf('verdict'), 'looks fine')
      assert.equal(approve().disabled, false)
      click(approve())
      const fields = JSON.parse(spy.drafts[0].proposed)
      assert.equal(fields.requested_outcome, 'approve')
      assert.equal(fields.requested_outputs, JSON.stringify({ verdict: { text: 'looks fine' } }))
    })

    it('a step that declares no output answers as before, with no deliverable field', () => {
      const spy = storeSpy()
      stepper.mount(container, payload([runOf('r1', WAITING_REVIEW)]), spy.ctx)
      assert.equal(container.querySelector('[data-proc-output]'), null)
      assert.equal(container.querySelector('[data-proc-outcome="approve"]').disabled, false)
      click(container.querySelector('[data-proc-outcome="approve"]'))
      const fields = JSON.parse(spy.drafts[0].proposed)
      assert.deepEqual(Object.keys(fields).sort(), [
        'action',
        'base_seq',
        'request_status',
        'requested_outcome',
        'step',
      ])
    })
  })
})

describe('collectProcedureRuns carries what the standalone console needs', () => {
  const runDoc = (artifactValue) => `---
level: 3
parent_spec:
  name: "executions"
  url: "specs/bluepriNNts/executions/spec_NN.md"
knowledge_version: "V_0-1-0"
title: "r1"
---

# NN Procedure Execution
## NN Procedure Execution: r1
slug:: r1
def_rev:: V_1-0-0
params:: "{\\"batch\\":\\"b1\\"}"
procedure:: ${FILE}
seq:: 9
state:: open

# NN Step Run
## NN Step Run: Transcribe
slug:: transcribe
status:: done
attempt:: 1
next:: review

## NN Step Run: Review
slug:: review
status:: waiting
attempt:: 1
waiting_on:: a person

# NN Run Artifact
## NN Run Artifact: Raw Transcript
slug:: raw-transcript
kind:: file
status:: validated
value:: ${artifactValue}
rev:: ${REV}
step:: transcribe

# NN Step Request
## NN Step Request: q-001
slug:: q-001
request_status:: stale
action:: complete
step:: review
base_seq:: 3
reason:: moved
`

  async function exportOf(context, artifactValue, files) {
    const { mkdtempSync, rmSync, mkdirSync, writeFileSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { collectProcedureRuns } = await import('../scripts/export-console.mjs')
    const root = mkdtempSync(join(tmpdir(), 'nn-proc-ux-'))
    context.after(() => rmSync(root, { recursive: true, force: true }))
    for (const [rel, content] of Object.entries(files)) {
      mkdirSync(dirname(join(root, rel)), { recursive: true })
      writeFileSync(join(root, rel), content)
    }
    const model = (rel, content) => ({
      filePath: join(root, rel),
      content,
      fm: payloadCore.parseFrontmatter(content),
    })
    const procedure = model(FILE, INGEST)
    const run = model('executions/r1/r1_executions_NN.md', runDoc(artifactValue))
    return collectProcedureRuns({
      root,
      models: [procedure, run],
      payloadModels: [procedure, run],
      wholeDomain: true,
      helper: payloadCore,
      compare: (a, b) => (a < b ? -1 : a > b ? 1 : 0),
    })
  }

  it('the run seq, its requests, its rows, the slot declarations and the reviewed file', async (context) => {
    const [entry] = await exportOf(context, 'staging/b1-transcript.md', {
      'staging/b1-transcript.md': '## a.wav\nhello',
    })
    assert.deepEqual(entry.slots, [
      { name: 'batch', kind: 'value', required: true },
      { name: 'language', kind: 'value', required: false, default: 'es' },
    ])
    const [r1] = entry.runs
    assert.equal(r1.seq, 9, 'a request must pin this, not 0')
    assert.equal(r1.requests['q-001'].status, 'stale')
    assert.equal(r1.model.steps.review.status, 'waiting')
    assert.deepEqual(r1.embeds['raw-transcript'], {
      path: 'staging/b1-transcript.md',
      kind: 'text',
      bytes: 14,
      text: '## a.wav\nhello',
    })
  })

  it('the handoff an import recorded beside the run, and nothing for a broken record', async (context) => {
    const handoff = {
      run: 'r1',
      choice: 'administrator',
      by: 'ana',
      at: '2026-11-25T10:00:00.000Z',
    }
    const [entry] = await exportOf(context, 'staging/b1-transcript.md', {
      'executions/r1/handoff.json': JSON.stringify(handoff),
    })
    assert.deepEqual(entry.runs[0].handoff, handoff)
    for (const broken of ['{', JSON.stringify({ ...handoff, choice: 'publish' })]) {
      const [again] = await exportOf(context, 'staging/b1-transcript.md', {
        'executions/r1/handoff.json': broken,
      })
      assert.equal(again.runs[0].handoff, undefined, broken)
    }
  })

  it('embeds a private run output, a file the run keeps under executions/<run>/outputs/', async (context) => {
    const value = 'executions/r1/outputs/raw-transcript/notes.md'
    const [entry] = await exportOf(context, value, { [value]: '# Notes\nwritten by a person' })
    assert.deepEqual(entry.runs[0].embeds['raw-transcript'], {
      path: value,
      kind: 'text',
      bytes: 27,
      text: '# Notes\nwritten by a person',
    })
  })

  it('never embeds a file outside the domain, whatever path the run recorded', async (context) => {
    const [entry] = await exportOf(context, '../outside.md', {})
    assert.deepEqual(entry.runs[0].embeds['raw-transcript'], {
      path: '../outside.md',
      omitted: 'missing',
    })
  })
})

describe('changeset download name', () => {
  it("is named after the domain's workspace_id with the runner's UTC stamp", () => {
    const state = runtime.exportStateOf({
      title: 'sim-intake Domain',
      modelId: 'sim-intake',
      workspaceId: 'intake-sim',
      changesBlueprintVersion: 'V_0-1-0',
    })
    state.store = { drafts: () => [] }
    state.exportedAt = '2026-11-23T11:28:06Z'
    const out = runtime.composeExport(state, 'lucas')
    assert.equal(out.ok, true)
    assert.equal(out.changesetFilename, 'intake-sim_lucas_20261123T112806Z_changes_NN.md')
  })
})

describe('procedure flow graph through the shared chart API', () => {
  let dom
  let doc
  let container
  let stepper
  let calls
  let originalRenderChart
  let width
  let reduced

  const vendorEcharts = join(consoleDir, 'vendor', 'echarts.min.js')

  /** One live store with `onChange`, as the console hands it (the stepper re-renders on it). */
  function liveStore() {
    const drafts = []
    const listeners = []
    let n = 0
    return {
      drafts,
      add: (d) => {
        drafts.push({ ...d, id: 'x' + ++n })
        listeners.forEach((f) => f())
      },
      ctx: {
        store: {
          drafts: () => drafts.slice(),
          propose: (p) => {
            const d = { ...p, id: 'd' + ++n }
            drafts.push(d)
            return d
          },
          remove: (id) => {
            const i = drafts.findIndex((d) => d.id === id)
            if (i !== -1) drafts.splice(i, 1)
          },
          onChange: (f) => {
            listeners.push(f)
            return () => {}
          },
        },
      },
    }
  }

  /** The draft the console would hold after the person approved `review`. */
  function approveDraft() {
    const spy = storeSpy()
    const d = new JSDOM('<!doctype html><body><div id="c"></div></body>')
    global.document = d.window.document
    global.window = d.window
    const scratch = d.window.document.getElementById('c')
    stepper.mount(scratch, payload([runOf('r1', WAITING_REVIEW)]), spy.ctx)
    scratch
      .querySelector('[data-proc-outcome="approve"]')
      .dispatchEvent(new d.window.Event('click'))
    global.document = doc
    global.window = dom.window
    const { id, ...rest } = spy.drafts[0]
    return rest
  }

  beforeEach(() => {
    dom = new JSDOM('<!doctype html><html><body><div id="c"></div></body></html>')
    doc = dom.window.document
    container = doc.getElementById('c')
    global.window = dom.window
    global.document = doc
    global.self = dom.window
    global.nnConsole = runtime
    dom.window.nnConsole = runtime
    width = 1200
    reduced = false
    Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get() {
        return width
      },
    })
    dom.window.matchMedia = (query) => ({
      matches: reduced && /reduce/.test(query),
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    })
    delete require.cache[require.resolve(corePath)]
    const core = require(corePath)
    core.use({ foldRun: payloadCore.foldRun })
    dom.window.nnProcedureCore = core
    global.nnProcedureCore = core
    stepper = require(stepperPath)

    // A recording stand-in for the shared chart API: the stepper must go through it.
    calls = []
    originalRenderChart = runtime.renderChart
    runtime.renderChart = (host, option, opts) => {
      const handlers = {}
      const chart = {
        handlers,
        setOptions: [],
        on(name, fn) {
          handlers[name] = fn
        },
        setOption(o) {
          this.setOptions.push(o)
        },
        resize() {},
        isDisposed: () => false,
        dispose() {
          this.disposed = true
        },
      }
      calls.push({ host, option, opts, chart })
      return chart
    }
  })

  afterEach(() => {
    runtime.renderChart = originalRenderChart
    delete global.echarts
  })

  const click = (el) => el.dispatchEvent(new doc.defaultView.Event('click'))
  const key = (el, k) =>
    el.dispatchEvent(new doc.defaultView.KeyboardEvent('keydown', { key: k, bubbles: true }))
  const lastCall = () => calls[calls.length - 1]
  // The option the chart last drew: the one it was made with, or the latest setOption.
  const optionOf = (call) => call.chart.setOptions.at(-1) ?? call.option
  const graphOf = (call) => optionOf(call).series.find((s) => s.type === 'graph')
  const pick = (call, slug) => call.chart.handlers.click({ dataType: 'node', data: { id: slug } })
  const cardStep = () => container.querySelector('.exec-step-card').getAttribute('data-step')

  it('says in English whether the run has branches, and never calls a branching run linear', () => {
    stepper.mount(container, payload([runOf('r1', WAITING_REVIEW)]), storeSpy().ctx)
    const note = container.querySelector('.proc-flow-note').textContent
    assert.doesNotMatch(note, /[áéíóúñ]|Cadena|ramas/i, 'the note is English copy')
    assert.doesNotMatch(note, /no branches|straight chain/i, 'review branches, so it is not linear')
    assert.match(note, /branch/i)
  })

  it('draws the flow with the shared chart API: every step a node, every branch a labelled link', () => {
    stepper.mount(container, payload([runOf('r1', WAITING_REVIEW)]), storeSpy().ctx)
    assert.equal(calls.length, 1, 'one chart for the one flow')
    const { host, option } = calls[0]
    assert.ok(host.closest('.exec-dag-view'), 'drawn inside the flow card')
    assert.equal(container.querySelector('.dag-canvas'), null, 'no native renderer beside it')
    const graph = graphOf(calls[0])
    assert.deepEqual(graph.data.map((d) => d.id).sort(), [
      'discard',
      'normalize',
      'review',
      'transcribe',
    ])
    const links = graph.links.map((l) => `${l.source}>${l.target}`).sort()
    assert.deepEqual(links, ['review>discard', 'review>normalize', 'transcribe>review'])
    const labelOf = (to) => graph.links.find((l) => l.target === to).label
    assert.equal(labelOf('normalize').formatter, 'approve')
    assert.equal(labelOf('discard').formatter, 'reject')
    assert.ok(
      !graph.links.find((l) => l.target === 'review').label?.show,
      'a single path is unlabelled',
    )
    assert.ok(option.xAxis && option.yAxis, 'positions are fractions of the host, so it resizes')
  })

  it('says each status in words on the node, never by colour alone', () => {
    stepper.mount(container, payload([runOf('r1', WAITING_REVIEW)]), storeSpy().ctx)
    const node = (slug) => graphOf(calls[0]).data.find((d) => d.id === slug)
    assert.match(node('review').label.formatter, /Review/)
    assert.match(node('review').label.formatter, /waiting/i)
    assert.match(node('transcribe').label.formatter, /done/i)
    assert.match(node('normalize').label.formatter, /pending/i)
    assert.equal(node('normalize').itemStyle.borderType, 'dashed', 'pending also differs in shape')
  })

  it('opens the step card of a node picked in the chart', () => {
    stepper.mount(container, payload([runOf('r1', WAITING_REVIEW)]), storeSpy().ctx)
    pick(calls[0], 'transcribe')
    assert.equal(cardStep(), 'transcribe')
    assert.ok(lastCall() !== calls[0], 'the graph is drawn again')
    const picked = graphOf(lastCall()).data.find((d) => d.id === 'transcribe')
    assert.ok(picked.selected, 'and marks the picked node')
  })

  it('ignores a click on an edge or on nothing', () => {
    stepper.mount(container, payload([runOf('r1', WAITING_REVIEW)]), storeSpy().ctx)
    calls[0].chart.handlers.click({
      dataType: 'edge',
      data: { source: 'review', target: 'discard' },
    })
    calls[0].chart.handlers.click({})
    assert.equal(cardStep(), 'review')
    assert.equal(calls.length, 1)
  })

  it('picking the active node follows the Runner; inspecting another node pins the card', () => {
    const draft = approveDraft()

    const following = liveStore()
    stepper.mount(container, payload([runOf('r1', WAITING_REVIEW)]), following.ctx)
    pick(lastCall(), 'review')
    assert.equal(cardStep(), 'review')
    following.add(draft)
    assert.equal(cardStep(), 'normalize', 'the card moved on with the run')

    const pinned = liveStore()
    stepper.mount(container, payload([runOf('r1', WAITING_REVIEW)]), pinned.ctx)
    pick(lastCall(), 'transcribe')
    pinned.add(draft)
    assert.equal(cardStep(), 'transcribe', 'a manual inspection stays put')
  })

  it('pulses the active step, and draws it still under prefers-reduced-motion', () => {
    stepper.mount(container, payload([runOf('r1', WAITING_REVIEW)]), storeSpy().ctx)
    const pulse = optionOf(calls[0]).series.find((s) => s.type === 'effectScatter')
    assert.ok(pulse, 'an animated ring')
    assert.equal(pulse.data.length, 1)
    assert.equal(pulse.data[0].id, 'review', 'on the current step only')
    assert.equal(container.querySelector('[data-proc-graph]').getAttribute('data-pulse'), 'on')

    reduced = true
    stepper.mount(container, payload([runOf('r1', WAITING_REVIEW)]), storeSpy().ctx)
    const still = lastCall()
    assert.equal(
      optionOf(still).series.find((s) => s.type === 'effectScatter'),
      undefined,
      'no animated series',
    )
    assert.equal(container.querySelector('[data-proc-graph]').getAttribute('data-pulse'), 'off')
    const current = graphOf(still).data.find((d) => d.id === 'review')
    const others = graphOf(still).data.filter((d) => d.id !== 'review' && d.itemStyle)
    assert.ok(
      others.every((d) => current.itemStyle.borderWidth > d.itemStyle.borderWidth),
      'the active step is still marked, without motion: its border is the heaviest one',
    )
    assert.ok(
      others.every((d) => d.itemStyle.borderWidth <= 1.5),
      'every other node keeps a hairline border',
    )
    assert.equal(current.symbol, 'rect', 'boxes are plain rectangles, not pills')
  })

  it('lays the flow out for the width it has: wide nodes on a wide host, narrow ones on a phone', () => {
    width = 1200
    stepper.mount(container, payload([runOf('r1', WAITING_REVIEW)]), storeSpy().ctx)
    const wide = graphOf(calls[0]).data[0].symbolSize
    width = 360
    stepper.mount(container, payload([runOf('r1', WAITING_REVIEW)]), storeSpy().ctx)
    const narrow = graphOf(lastCall()).data[0].symbolSize
    assert.ok(wide[0] >= 180, 'wide: ' + wide[0])
    assert.ok(narrow[0] < wide[0] && narrow[0] * 2 <= 360, 'two branches fit: ' + narrow[0])
    assert.ok(narrow[0] >= 80, 'but stay readable')
  })

  it('summarises the graph for assistive technology on a focusable group', () => {
    stepper.mount(container, payload([runOf('r1', WAITING_REVIEW)]), storeSpy().ctx)
    const g = container.querySelector('[data-proc-graph]')
    assert.equal(g.getAttribute('tabindex'), '0')
    assert.equal(g.getAttribute('role'), 'group')
    const label = g.getAttribute('aria-label')
    assert.match(label, /4 steps/)
    assert.match(label, /Review/)
    assert.match(label, /waiting/)
    assert.match(label, /arrow keys/i)
    assert.equal(g.querySelector('[aria-live]').getAttribute('aria-live'), 'polite')
  })

  it('moves between connected steps with the arrow keys and selects with Enter or Space', () => {
    stepper.mount(container, payload([runOf('r1', WAITING_REVIEW)]), storeSpy().ctx)
    const g = container.querySelector('[data-proc-graph]')
    const focused = () => {
      const d = graphOf(lastCall()).data.find((n) => n.focused)
      return d && d.id
    }
    g.dispatchEvent(new doc.defaultView.Event('focus'))
    assert.equal(focused(), 'review', 'starts on the active step')
    key(g, 'ArrowDown')
    assert.equal(focused(), 'normalize', 'down: the next step')
    key(g, 'ArrowRight')
    assert.equal(focused(), 'discard', 'right: the sibling branch')
    key(g, 'ArrowLeft')
    assert.equal(focused(), 'normalize')
    key(g, 'ArrowUp')
    assert.equal(focused(), 'review', 'up: where it came from')
    assert.match(g.querySelector('[aria-live]').textContent, /Review/, 'announced')
    key(g, 'ArrowUp')
    assert.equal(focused(), 'transcribe')
    assert.equal(cardStep(), 'review', 'moving alone selects nothing')

    key(container.querySelector('[data-proc-graph]'), 'Enter')
    assert.equal(cardStep(), 'transcribe')
    key(container.querySelector('[data-proc-graph]'), 'ArrowDown')
    key(container.querySelector('[data-proc-graph]'), ' ')
    assert.equal(cardStep(), 'review', 'Space selects too')
  })

  it('keeps the same steps reachable by keyboard in the timeline, with the status written out', () => {
    stepper.mount(container, payload([runOf('r1', WAITING_REVIEW)]), storeSpy().ctx)
    assert.equal(
      container.querySelector('[data-proc-step-list], .proc-step-list-box'),
      null,
      'the graph has no second list under it: the timeline is the list',
    )
    const rows = [...container.querySelectorAll('[data-proc-step-toggle]')]
    assert.equal(rows.length, 4)
    const review = rows.find((b) => b.getAttribute('data-proc-step-toggle') === 'review')
    assert.match(review.textContent, /waiting/)
    assert.equal(review.tagName, 'BUTTON', 'a real button, in the tab order')
    assert.equal(review.getAttribute('tabindex'), null)
    click(rows.find((b) => b.getAttribute('data-proc-step-toggle') === 'transcribe'))
    assert.equal(cardStep(), 'transcribe')
  })

  it('lays a loop out top-down: the decision sits above both of its branches', () => {
    const loop = payload([])
    loop.model.procedureGraphs[0].graph = payloadCore.procedureGraph(
      payloadCore.parseKnowledge(
        INGEST.replace(
          'next:: [@normalize, @discard]',
          'max_attempts:: 2\nnext:: [@normalize, @discard]',
        ).replace('condition:: outcome == reject', 'condition:: outcome == reject\nnext:: @review'),
      ),
    )
    assert.deepEqual(loop.model.procedureGraphs[0].graph.steps.discard.next, ['review'])
    stepper.mount(container, loop, storeSpy().ctx)
    // The row a node is drawn on is its layer: the chart's own data is the order.
    const nodes = graphOf(lastCall()).data
    assert.equal(nodes.length, 4)
    const rowOf = (slug) => nodes.find((d) => d.id === slug).value[1]
    const order = ['transcribe', 'review', 'normalize', 'discard'].map((s) => s + '@' + rowOf(s))
    assert.ok(rowOf('review') < rowOf('normalize'), order.join(' > '))
    assert.ok(rowOf('review') < rowOf('discard'), order.join(' > '))
    assert.equal(rowOf('transcribe'), Math.min(...nodes.map((d) => d.value[1])))
  })

  it('filters the run list, and drops a selection the filter hides', () => {
    stepper.mount(container, payload([runOf('r1', WAITING_REVIEW)]), storeSpy().ctx)
    assert.ok(container.querySelector('.proc-run[data-run-id="r1"]'), 'the run is listed')
    click(container.querySelector('[data-proc-filter="closed"]'))
    assert.equal(
      container.querySelector('.proc-run[data-run-id="r1"]'),
      null,
      'a waiting run is not closed',
    )
    assert.match(container.querySelector('.proc-run-list').textContent, /No run matches/)
    assert.match(
      container.querySelector('.proc-runbar').textContent,
      /definition/,
      'the panel does not keep the run the list just hid',
    )
  })

  it('writes the flow hint in English', () => {
    stepper.mount(container, payload([runOf('r1', WAITING_REVIEW)]), storeSpy().ctx)
    assert.match(container.querySelector('.rail-hint').textContent, /^The selected node/)
  })

  it('falls back to the native svg when ECharts is not there', () => {
    runtime.renderChart = originalRenderChart // the real entry point, no library loaded
    const warn = console.warn
    console.warn = () => {}
    try {
      stepper.mount(container, payload([runOf('r1', WAITING_REVIEW)]), storeSpy().ctx)
    } finally {
      console.warn = warn
    }
    assert.ok(container.querySelector('.dag-canvas'), 'native flow drawn')
    assert.equal(container.querySelectorAll('.dag-node').length, 4)
    assert.ok(container.querySelector('.dag-canvas[data-proc-graph]'), 'the same graph hook')
    assert.ok(container.querySelector('.exec-dag-view-native'), 'marked, so narrow CSS can hide it')
    const node = container.querySelector('.dag-node[data-step="review"]')
    assert.equal(node.tagName, 'BUTTON', 'native nodes are real buttons, not divs with a role')
    assert.equal(node.getAttribute('type'), 'button')
    key(container.querySelector('.dag-node[data-step="transcribe"]'), 'Enter')
    assert.equal(cardStep(), 'transcribe')
  })

  it('pulses the same step in both renderers, pending or active, and neither under reduced motion', () => {
    const recording = runtime.renderChart
    const pulseOf = (events, chart) => {
      runtime.renderChart = chart ? recording : undefined
      stepper.mount(container, payload([runOf('r1', events)]), storeSpy().ctx)
      return container.querySelector('[data-proc-graph]').getAttribute('data-pulse')
    }
    for (const events of [DONE_TRANSCRIBE, WAITING_REVIEW]) {
      const chart = pulseOf(events, true)
      const native = pulseOf(events, false)
      assert.equal(chart, 'on')
      assert.equal(native, chart, 'the native svg pulses the step ECharts pulses')
    }
    reduced = true
    assert.equal(pulseOf(WAITING_REVIEW, true), 'off')
    assert.equal(pulseOf(WAITING_REVIEW, false), 'off')
  })

  it('scrolls the flow box so the step the arrow keys reach stays visible', () => {
    stepper.mount(container, payload([runOf('r1', AT_TRANSCRIBE)]), storeSpy().ctx)
    const view = container.querySelector('.exec-dag-view')
    const g = container.querySelector('[data-proc-graph]')
    // jsdom has no layout: a 100 px box over a chart that starts at its top.
    Object.defineProperty(view, 'clientHeight', { configurable: true, value: 100 })
    view.getBoundingClientRect = () => ({
      top: 0,
      bottom: 100,
      left: 0,
      right: 0,
      width: 0,
      height: 100,
    })
    g.querySelector('.dag-chart').getBoundingClientRect = () => ({
      top: -view.scrollTop,
      bottom: 0,
      left: 0,
      right: 0,
      width: 0,
      height: 0,
    })
    g.dispatchEvent(new doc.defaultView.Event('focus'))
    assert.equal(view.scrollTop, 0, 'the first row is already in view')
    key(g, 'ArrowDown')
    key(g, 'ArrowDown')
    assert.ok(view.scrollTop > 0, 'a row below the box scrolls into it')
    const reached = view.scrollTop
    key(g, 'ArrowUp')
    key(g, 'ArrowUp')
    assert.ok(view.scrollTop < reached, 'and back up again')
  })

  it('falls back when the console has no chart entry point at all', () => {
    runtime.renderChart = undefined
    stepper.mount(container, payload([runOf('r1', WAITING_REVIEW)]), storeSpy().ctx)
    assert.equal(container.querySelectorAll('.dag-node').length, 4)
  })

  it('draws a real ECharts svg with the steps in it when the library is loaded', () => {
    global.echarts = require(vendorEcharts)
    runtime.renderChart = originalRenderChart
    const mounted = stepper.mount(container, payload([runOf('r1', WAITING_REVIEW)]), storeSpy().ctx)
    try {
      const svg = container.querySelector('.exec-dag-view svg')
      assert.ok(svg, 'a chart svg')
      assert.equal(container.querySelector('svg.dag-canvas'), null)
      const words = svg.textContent
      for (const name of ['Transcribe', 'Review', 'Normalize', 'Discard'])
        assert.ok(words.includes(name), name + ' is drawn')
      assert.ok(words.includes('approve') && words.includes('reject'), 'branch labels drawn')
    } finally {
      mounted.unmount() // stops the pulse animation, which would keep the process alive
    }
  })

  it('ships reduced-motion CSS for the pulse and a step list that is never hidden', () => {
    const css = readFileSync(join(consoleDir, 'nn-ui.css'), 'utf8')
    const reducedBlocks =
      css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\n\}/g) || []
    // Every selector that animates the pulse is switched off by the same selector, so the
    // reduced-motion rule (later in the file) wins the cascade instead of losing on specificity.
    const pulsing = [
      ...css
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .matchAll(/\n([^{}@\n][^{}]*)\{[^}]*animation:\s*dag-pulse/g),
    ]
      .flatMap((m) => m[1].split(',').map((s) => s.trim()))
      .filter(Boolean)
    assert.ok(pulsing.length > 0, 'the native pulse exists')
    const offIn = (block, selector) => {
      const at = block.indexOf(selector)
      return at !== -1 && /animation:\s*none/.test(block.slice(at, block.indexOf('}', at)))
    }
    for (const selector of pulsing)
      assert.ok(
        reducedBlocks.some((b) => offIn(b, selector)),
        'native pulse is switched off for ' + selector,
      )
    assert.ok(/@keyframes dag-pulse/.test(css), 'and exists to be switched off')
    assert.match(css, /\.dag-graph:focus-visible/, 'a visible focus style')
  })
})
