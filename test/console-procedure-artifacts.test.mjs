/* Artifacts are files, not model elements: the card names them as chips, each says which
   step produced it and offers the file. Opening one reads it; it never writes. */
import { describe, it, beforeEach } from 'node:test'
import { runModelOfEvents } from './helpers/run-model-of-events.mjs'
import assert from 'node:assert/strict'
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
output:: @draft-doc

## NN Work: Review
slug:: review
step_type:: decision
executor:: human
decision:: Publish?
input:: @draft-doc
next:: [@publish]

## NN Work: Publish
slug:: publish
step_type:: task
condition:: outcome == approve

# NN Artifact

## NN Artifact: Draft Document
slug:: draft-doc
verify:: file:draft.md

## NN Artifact: Published File
slug:: published-file
verify:: file:published.txt
`

const EVENTS = [
  { kind: 'started', actor: 'ana' },
  { kind: 'step_started', step: 'draft', attempt: 1 },
  { kind: 'artifact_validated', step: 'draft', field: 'draft-doc', value: 'draft.md', rev: 'r1' },
  { kind: 'step_completed', step: 'draft', next: 'review' },
  { kind: 'step_started', step: 'review', attempt: 1 },
]

function payload() {
  const graph = core.procedureGraph(core.parseKnowledge(REVIEW))
  const defRev = 'V_1-0-0'
  return {
    schema: { concepts: [] },
    model: {
      meta: { modelId: 'demo', domainId: 'demo-1234' },
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
              events: EVENTS,
              state: core.foldRun(graph, runModelOfEvents(EVENTS, { defRev }), { defRev }),
            },
          ],
        },
      ],
    },
  }
}

describe('procedure artifacts are files with a way in', () => {
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
    stepper = require(stepperPath)
  })

  const mount = () => stepper.mount(container, payload())
  const click = (el) => el.dispatchEvent(new doc.defaultView.Event('click'))

  it('names the artifact, its state and its producer, not one comma-separated string', () => {
    mount()
    const chip = container.querySelector('[data-proc-artifact="draft-doc"]')
    assert.ok(chip, 'the artifact has a chip')
    assert.equal(chip.getAttribute('data-status'), 'validated')
    assert.match(chip.querySelector('.proc-artifact-name').textContent, /Draft Document/)
    assert.match(chip.querySelector('.proc-artifact-state').textContent, /validated · rev r1/)
    assert.match(chip.querySelector('.proc-artifact-producer').textContent, /produced by Draft/)
  })

  it('jumps to the step that produced the artifact', () => {
    mount()
    // Open the review step, which consumes the artifact.
    click(container.querySelector('.nn-graph-node[data-step="review"]'))
    const chip = container.querySelector('[data-proc-artifact="draft-doc"]')
    click(chip.querySelector('.proc-artifact-producer'))
    assert.match(container.querySelector('.exec-step-card .exec-step-title').textContent, /Draft/)
  })

  it('offers the file its verify names', () => {
    mount()
    const open = container.querySelector('[data-proc-artifact="draft-doc"] .proc-artifact-open')
    assert.ok(open, 'the chip offers the file')
    assert.match(open.textContent, /draft\.md/)
  })

  it('offers no file for an artifact the run has not produced', () => {
    mount()
    const expected = container.querySelector('[data-proc-artifact="published-file"]')
    assert.ok(expected, 'the pending artifact still shows')
    assert.equal(expected.querySelector('.proc-artifact-open'), null, 'no file to open yet')
    assert.match(expected.querySelector('.proc-artifact-pending').textContent, /not produced yet/)
  })

  it('reads the file through the connected folder and shows it, without writing', async () => {
    const fileText = '# Draft\n\nThe note about the procedure runner.\n'
    const handle = {
      getDirectoryHandle: () => Promise.resolve({}),
      getFileHandle: () => ({
        getFile: () => Promise.resolve({ text: () => Promise.resolve(fileText) }),
      }),
    }
    let connected = ''
    const fsaMock = {
      createIndexedDbStore: () => ({ get: () => Promise.resolve(), set: () => Promise.resolve() }),
      createWriter: () => ({
        connect: (workspaceId) => {
          connected = workspaceId
          return Promise.resolve({ ok: true, handle })
        },
      }),
    }
    // GLOBAL resolves to `self`, which is the page's window, not the Node global.
    dom.window.nnFsa = fsaMock
    global.nnFsa = fsaMock
    // The stepper captured `self` when it was first required, so the mock must also live on
    // the window it actually reads, not only on this test's fresh JSDOM.
    if (global.self && global.self.nnFsa !== fsaMock) global.self.nnFsa = fsaMock
    const view = mount()
    click(container.querySelector('[data-proc-artifact="draft-doc"] .proc-artifact-open'))
    await new Promise((r) => setTimeout(r, 20))

    assert.equal(connected, 'demo-1234', 'it connects to this domain')
    const shown = container.querySelector('.proc-artifact-view')
    assert.ok(shown, 'the file is shown')
    assert.match(
      shown.querySelector('.proc-artifact-view-body').textContent,
      /The note about the procedure runner/,
    )
    assert.match(shown.querySelector('.proc-artifact-view-path').textContent, /draft\.md/)
    delete dom.window.nnFsa
    delete global.nnFsa
    view.unmount()
  })

  it('says so when folder access is unavailable instead of failing silently', () => {
    delete dom.window.nnFsa
    delete global.nnFsa
    mount()
    const open = container.querySelector('[data-proc-artifact="draft-doc"] .proc-artifact-open')
    click(open)
    assert.match(open.textContent, /folder access is not available/)
    assert.equal(open.disabled, true)
  })

  it('prints no artifact row for a step with no artifacts', () => {
    mount()
    click(container.querySelector('.nn-graph-node[data-step="publish"]'))
    assert.equal(container.querySelector('[data-proc-artifact-row]'), null)
  })
})
