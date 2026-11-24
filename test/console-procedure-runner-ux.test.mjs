/* The console as a person runs it from an emailed file (procedure-runner-ux S6, S9): slot
   values instead of `{slot}` placeholders, the run's seq on every request, one button per
   branch, the run projected through the real fold once answered, a run requested from a slot
   form, and the "Your turn" inbox first. Drives the real stepper over the real nn-core fold. */
import { describe, it, beforeEach } from 'node:test'
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

const graph = () => payloadCore.procedureGraph(payloadCore.parseKnowledge(INGEST))

function runOf(id, events, opts = {}) {
  const g = graph()
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
  }
}

function payload(runs) {
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
          graph: graph(),
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
    assert.deepEqual(shown(), ['r-a', 'r-z'], 'the open run stays listed while it is selected')
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
