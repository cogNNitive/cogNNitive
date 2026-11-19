import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { collectProcedureRuns } from '../scripts/export-console.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')
const consoleDir = join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'console')
const viewPath = join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'procedures', 'assets', 'console-view-procedure.js')
const stepperPath = join(consoleDir, 'render-procedure-stepper.js')
const runtimePath = join(consoleDir, 'nn-runtime.js')
const require = createRequire(import.meta.url)
const runtime = require(runtimePath)
// The graph and the run state come from nn-core (the payload mirror the exporter loads), never
// from a browser re-implementation: the fixtures below are built with the same functions.
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
summary:: Reviews a draft before it is published.
procedure_model:: ${FILE}

# NN Work

## NN Work: Draft
slug:: draft
step_type:: task
executor:: agent
next:: @review
output:: @draft-doc
Write the draft of **Publish**.

## NN Work: Review
slug:: review
step_type:: decision
executor:: human
decision:: Approve the draft?
input:: @draft-doc
next:: [@publish, @rework]

## NN Work: Publish
slug:: publish
step_type:: task
condition:: outcome == approve

## NN Work: Rework
slug:: rework
step_type:: task
condition:: outcome == decline

# NN Artifact

## NN Artifact: Draft Doc
slug:: draft-doc
verify:: file:draft.md
`

const graphOf = (text) => core.procedureGraph(core.parseKnowledge(text))

/** Payload elements of the review model, as the exporter flattens them (modelFile + slug). */
function elementsOf(text, file) {
  const parsed = core.parseKnowledge(text)
  const out = []
  for (const [concept, nodes] of parsed.elements) {
    for (const n of nodes) {
      out.push({
        id: `review@${n.slug}`,
        slug: n.slug,
        concept,
        name: n.name,
        description: n.description || '',
        fields: Object.fromEntries(Object.entries(n.fields).map(([k, v]) => [k, String(v)])),
        modelFile: file,
      })
    }
  }
  return out
}

function runOf(id, graph, events, defRev = 'V_1-0-0') {
  return { id, file: `executions/${id}/${id}_executions_NN.md`, closed: false, defRev, params: {}, events, state: core.foldRun(graph, events, { defRev, lockFree: true }) }
}

const APPROVED = [
  { kind: 'started', actor: 'ana' },
  { kind: 'step_started', step: 'draft', attempt: 1 },
  { kind: 'artifact_validated', step: 'draft', field: 'draft-doc', value: 'draft.md', rev: 'd1' },
  { kind: 'step_completed', step: 'draft', next: 'review' },
  { kind: 'step_started', step: 'review', attempt: 1 },
  { kind: 'step_completed', step: 'review', outcome: 'approve', next: 'publish' },
]

function payload({ runs = [], text = REVIEW, procedures } = {}) {
  const graph = graphOf(text)
  return {
    schema: { concepts: [{ name: 'Work', weight: 100 }], ...(procedures ? { procedures } : {}) },
    model: {
      meta: { title: 'Review Domain' },
      elements: elementsOf(text, FILE),
      matrices: [],
      procedureGraphs: [{ file: FILE, title: 'Review', graph, runs: runs.map((r) => r(graph)) }],
    },
  }
}

function loadView() {
  const code = readFileSync(viewPath, 'utf8')
  let captured
  new Function('registerView', code)((def) => {
    captured = def
  })
  return captured
}

describe('procedure view (bluepriNNt)', () => {
  let doc
  let container
  let stepper

  beforeEach(() => {
    const dom = new JSDOM('<!doctype html><html><body><div id="c"></div></body></html>')
    doc = dom.window.document
    container = doc.getElementById('c')
    global.nnConsole = runtime
    stepper = require(stepperPath)
  })

  const mount = (p, context) => {
    const handle = stepper.mount(container, p)
    if (context) context.after(() => handle.unmount())
    return handle
  }
  const texts = (selector) => [...container.querySelectorAll(selector)].map((n) => n.textContent)

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
    assert.equal(calls[0].p.model.meta.title, 'Review Domain')
  })

  it('shows an empty state when the stepper runtime is absent', () => {
    loadView().mount({ container, payload: payload() })
    assert.match(container.textContent, /Procedure runtime is not available/)
  })

  it('renders the procedure graph from procedureGraph, decision branches included, when there is no run', (context) => {
    const handle = mount(payload(), context)
    assert.equal(handle.ok, true)
    assert.equal(handle.steps, 4, 'the container-less graph has four steps')
    assert.deepEqual(texts('.dag-node .node-title'), ['Draft', 'Review', 'Publish', 'Rework'])
    // The decision forks: one edge per target, the two targets side by side in one layer.
    assert.equal(container.querySelectorAll('.dag-edge').length, 3)
    const [publish, rework] = ['publish', 'rework'].map((s) => container.querySelector(`.dag-node[data-step="${s}"]`))
    assert.equal(publish.getAttribute('data-layer'), rework.getAttribute('data-layer'))
    assert.match(container.querySelector('.proc-run-state').textContent, /No run/)
    // The decision step lists each branch with its guard.
    container.querySelector('.dag-node[data-step="review"]').dispatchEvent(new doc.defaultView.Event('click'))
    const branches = texts('.exec-step-card .branch-outcome')
    assert.deepEqual(branches, ['Publish — outcome == approve', 'Rework — outcome == decline'])
    assert.match(container.querySelector('.exec-step-card').textContent, /Approve the draft\?/)
  })

  it('shows the graph diagnostics instead of hiding them', (context) => {
    const broken = REVIEW.replace('next:: [@publish, @rework]', 'next:: [@publish, @ghost]')
    mount(payload({ text: broken }), context)
    const items = [...container.querySelectorAll('.proc-defect-item')]
    assert.ok(items.some((i) => i.getAttribute('data-defect-kind') === 'UNKNOWN_NEXT' && /ghost/.test(i.textContent)))
  })

  it("shows a run's folded state: current step, done steps and the decision outcome taken", (context) => {
    mount(payload({ runs: [(g) => runOf('r1', g, APPROVED)] }), context)
    const run = container.querySelector('.proc-run[data-run-id="r1"]')
    assert.ok(run, 'the run is listed')
    assert.match(run.textContent, /r1 · open/)
    const state = container.querySelector('.proc-run-state').textContent
    assert.match(state, /Current step: Publish/)
    assert.match(state, /Path: Draft → Review → Publish/)
    const statusOf = (s) => container.querySelector(`.dag-node[data-step="${s}"]`).getAttribute('data-status')
    assert.deepEqual(['draft', 'review', 'publish', 'rework'].map(statusOf), ['done', 'done', 'pending', 'off_path'])
    assert.ok(container.querySelector('.dag-node[data-step="publish"]').classList.contains('current'))
    container.querySelector('.dag-node[data-step="review"]').dispatchEvent(new doc.defaultView.Event('click'))
    assert.match(container.querySelector('.exec-step-card').textContent, /Outcome: approve → Publish/)
    // The artifact is a chip now: its name, its state and the file, not one flat string.
    const artifact = container.querySelector('.proc-run-artifacts [data-proc-artifact]')
    assert.ok(artifact, 'the artifact has a chip')
    assert.match(artifact.querySelector('.proc-artifact-name').textContent, /Draft Doc/)
    assert.match(artifact.querySelector('.proc-artifact-state').textContent, /validated/)
    assert.deepEqual(texts('.proc-run-events .audit-item .audit-kind').slice(0, 2), ['started', 'step_started'])
  })

  it('shows the drift of a run pinned to another definition revision', (context) => {
    mount(payload({ runs: [(g) => runOf('old', g, APPROVED.slice(0, 2), 'V_0-9-0')] }), context)
    const drift = container.querySelector('.proc-run-drift')
    assert.ok(drift, 'drift rendered')
    assert.match(drift.textContent, /V_0-9-0/)
    assert.match(drift.textContent, /V_1-0-0/)
    assert.match(container.querySelector('.proc-run[data-run-id="old"]').textContent, /drifted/)
  })

  it('shows the next action as the runner tool call an agent makes, never a CLI', (context) => {
    mount(payload({ runs: [(g) => runOf('r1', g, APPROVED)] }), context)
    const next = container.querySelector('.proc-run-next').textContent
    assert.match(next, /procedure_state \{"run":"r1"\}/)
    assert.match(next, /procedure_record \{"run":"r1"/)
    assert.doesNotMatch(container.textContent, /nn-cli/)
  })

  it('carries no hardcoded decision gate, fake CLI snippet or write controls', (context) => {
    mount(payload({ runs: [(g) => runOf('r1', g, APPROVED)] }), context)
    container.querySelector('.dag-node[data-step="review"]').dispatchEvent(new doc.defaultView.Event('click'))
    for (const selector of ['.exec-decision-box', '.btn-branch', '.exec-cli-snippet', '.exec-actions-row', '.btn-export-log', '[data-nn-timer]']) {
      assert.equal(container.querySelector(selector), null, `${selector} must not render`)
    }
    const code = readFileSync(stepperPath, 'utf8')
    assert.doesNotMatch(code, /nn-cli|Decision Gate|Proceed Path|Rework \/ Alternate/)
  })

  it('lists a run whose procedure definition is not in the export, without state', (context) => {
    const p = payload()
    p.model.procedureGraphs.push({
      file: 'bluepriNNt:procedures/x_procedures_NN.md',
      title: 'bluepriNNt:procedures/x_procedures_NN.md',
      graph: null,
      runs: [{ id: 'floor-1', file: 'executions/floor-1/floor-1_executions_NN.md', closed: false, defRev: 'V_1-0-0', params: {}, events: [], state: null }],
    })
    mount(p, context)
    const tab = [...container.querySelectorAll('.proc-tab')].find((t) => /bluepriNNt:/.test(t.textContent))
    tab.click()
    assert.match(container.textContent, /not in this export/)
    assert.ok(container.querySelector('.proc-run[data-run-id="floor-1"]'))
  })

  it('shows an empty state when the export carries no procedure graph', (context) => {
    mount({ schema: {}, model: { elements: [], matrices: [] } }, context)
    assert.match(container.textContent, /No procedures in this export/)
  })

  it('renders into its own container with no global ids', () => {
    const handle = stepper.mount(container, payload({ runs: [(g) => runOf('r1', g, APPROVED)] }))
    assert.ok(container.querySelector('.nn-procedure-view'), 'built inside the container')
    assert.equal(container.querySelectorAll('[id]').length, 0, 'no element in the view carries an id')
    handle.unmount()
    assert.equal(container.innerHTML, '')
  })

  it('renders Markdown descriptions with references as pills', (context) => {
    global.nnUI = require(join(consoleDir, 'ui-kit.js'))
    context.after(() => { delete global.nnUI })
    const opened = []
    global.nnConsole = { ...runtime, renderRefDialog: (_doc, element) => opened.push(element.id) }
    mount(payload(), context)
    const description = container.querySelector('.exec-step-desc')
    assert.equal(description.querySelector('strong')?.textContent, 'Publish')
    const reference = description.querySelector('[data-nn-component=ku-unit]')
    assert.ok(reference, 'prose reference remains a pill')
    reference.click()
    assert.deepEqual(opened, ['review@publish'])
  })

  it('keeps HTML and unsafe URLs inert in Markdown descriptions', (context) => {
    global.nnUI = require(join(consoleDir, 'ui-kit.js'))
    context.after(() => { delete global.nnUI })
    const p = payload()
    p.model.elements.find((e) => e.slug === 'draft').description =
      '**Safe**\n\n<img src=x onerror=1><script>alert(1)</script>\n\n[bad](javascript:alert)'
    mount(p, context)
    const description = container.querySelector('.exec-step-desc')
    assert.equal(description.querySelector('strong')?.textContent, 'Safe')
    assert.equal(description.querySelector('img, script, a'), null)
    assert.match(description.textContent, /<img src=x onerror=1>/)
  })

  it('lists the blueprint procedures with usage first as "Getting started", never a shadowed one', (context) => {
    mount(
      payload({
        procedures: [
          { id: 'generate-docsify-suite', name: 'Generate Docsify Suite' },
          { id: 'usage', name: 'Getting started' },
          { id: 'check', name: 'Beta check', status: 'shadowed', shadowed_by: 'alpha' },
        ],
      }),
      context,
    )
    const items = [...container.querySelectorAll('[data-nn-procedures="blueprint"] .proc-blueprint-item')]
    assert.deepEqual(items.map((i) => i.getAttribute('data-procedure-id')), ['usage', 'generate-docsify-suite'])
    assert.equal(items[0].textContent, 'Getting started')
  })

  it('renders the procedure ficha from the linked Procedure element', (context) => {
    mount(payload(), context)
    assert.match(container.querySelector('.proc-ficha').textContent, /Reviews a draft before it is published/)
  })

  it('draws the step icon through nnIcons, the sprite the console actually provides', (context) => {
    global.nnIcons = require(join(consoleDir, 'nn-icons.js'))
    context.after(() => {
      delete global.nnIcons
    })
    mount(payload(), context)
    // Before this, the view read `nnVisuals.iconSvg`, which the console no longer sets:
    // the pill rendered as a bare " TASK" with no icon at all.
    const pill = container.querySelector('.step-type-pill')
    assert.ok(pill.querySelector('svg'), 'the type pill carries an icon')
    assert.ok(container.querySelector('.exec-col-header svg'), 'the workflow header carries one too')
  })

  it('reads the icon module the way nn-runtime does, and never the retired nnVisuals', () => {
    const code = readFileSync(stepperPath, 'utf8')
    assert.match(code, /typeof nnIcons !== 'undefined'/, 'same lookup as the shell')
    // No executable reference to the retired global survives (comments may explain it).
    const executable = code
      .split('\n')
      .filter((l) => !/^\s*\/\//.test(l))
      .join('\n')
    assert.doesNotMatch(executable, /nnVisuals/, 'the retired global is gone from the code')
  })

  it('states every class the run panel relies on, so nothing renders unstyled', () => {
    // The panel is built from these classes; a missing rule leaves it browser-default,
    // which is what shipped: the run panel had no shape at all.
    const css = readFileSync(join(consoleDir, 'nn-ui.css'), 'utf8')
    const missing = [
      '.proc-runs',
      '.proc-runs-label',
      '.proc-ficha',
      '.proc-ficha-summary',
      '.proc-run-state',
      '.proc-run-next',
      '.proc-run-drift',
      '.proc-structure-summary',
      '.dag-node.current',
      '.dag-node.selected',
    ].filter((sel) => !css.includes(sel))
    assert.deepEqual(missing, [], 'every class the panel builds has a rule')
  })
})

describe('collectProcedureRuns (export)', () => {
  const runText = (procedure) => `---
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
params:: "{}"
procedure:: ${procedure}

# NN Execution Event
## NN Execution Event: e-001
slug:: e-001
kind:: started
actor:: ana

## NN Execution Event: e-002
slug:: e-002
kind:: step_started
step:: draft
attempt:: 1
`

  it('carries each procedure graph and its runs folded by nn-core', (context) => {
    const root = mkdtempSync(join(tmpdir(), 'nn-proc-export-'))
    context.after(() => rmSync(root, { recursive: true, force: true }))
    const model = (rel, content) => ({ filePath: join(root, rel), content, fm: core.parseFrontmatter(content) })
    const procedure = model(FILE, REVIEW)
    const run = model('executions/r1/r1_executions_NN.md', runText(FILE))
    const out = collectProcedureRuns({
      root,
      models: [procedure, run],
      payloadModels: [procedure, run],
      wholeDomain: true,
      helper: core,
      compare: (a, b) => (a < b ? -1 : a > b ? 1 : 0),
    })
    assert.equal(out.length, 1)
    assert.equal(out[0].file, FILE)
    assert.deepEqual(out[0].graph, graphOf(REVIEW))
    assert.equal(out[0].runs.length, 1)
    const [r1] = out[0].runs
    assert.equal(r1.id, 'r1')
    assert.deepEqual(r1.events.map((e) => e.kind), ['started', 'step_started'])
    assert.deepEqual(r1.state, core.foldRun(graphOf(REVIEW), r1.events, { defRev: 'V_1-0-0', lockFree: true }))
    assert.equal(r1.state.currentStep, 'draft')
  })

  it('keeps a run whose procedure is a bluepriNNt package document, with no graph and no state', (context) => {
    const root = mkdtempSync(join(tmpdir(), 'nn-proc-export-'))
    context.after(() => rmSync(root, { recursive: true, force: true }))
    const content = runText('bluepriNNt:procedures/x_procedures_NN.md')
    const run = { filePath: join(root, 'executions/r1/r1_executions_NN.md'), content, fm: core.parseFrontmatter(content) }
    const out = collectProcedureRuns({ root, models: [run], payloadModels: [run], wholeDomain: true, helper: core, compare: (a, b) => (a < b ? -1 : a > b ? 1 : 0) })
    assert.equal(out.length, 1)
    assert.equal(out[0].graph, null)
    assert.equal(out[0].runs[0].state, null)
  })
})
