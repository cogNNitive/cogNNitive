import { describe, it } from 'node:test'
import { runModelOfEvents } from './helpers/run-model-of-events.mjs'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')
const consoleDir = join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'console')
const require = createRequire(import.meta.url)
const runtime = require(join(consoleDir, 'nn-runtime.js'))
// The engine's own parser (the workspace build), not the console's payload mirror: the
// question is whether the REAL parser accepts what the draft wrote.
const core = await import(new URL('../iNNfo/packages/nn-core/dist/index.js', import.meta.url).href)

/* End to end: a console draft becomes the changeset the engine parses, and the parsed
   change carries the fields `procedure_record` would have written. The event is the unit
   `foldRun` reads, so a fieldless block is a silent lost transition. */

const FIELDS = {
  kind: 'step_completed',
  step: 'review',
  outcome: 'approve',
  next: 'publish',
  actor: 'ana',
  at: '2026-11-19T10:00:00.000Z',
}

function draft(fields, n = 7) {
  return {
    id: 'ev-' + n,
    kind: 'new',
    knowledge_id: 'r1',
    element_slug: 'e-' + String(n).padStart(3, '0'),
    concept: 'Execution Event',
    element: 'e-' + String(n).padStart(3, '0'),
    proposed: JSON.stringify(fields),
  }
}

function exportOf(drafts) {
  return runtime.composeChangesetExport(
    {
      meta: { changesBlueprintVersion: 'V_0-13-0' },
      modelId: 'r1',
      modelTitle: 'r1',
      modelVersion: '1-0-0',
      store: { drafts: () => drafts },
    },
    'ana',
  )
}

function splitFrontmatter(text) {
  const m = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(text)
  return m[0]
}

// `apply_change` parses `to` as JSON (`apply-change.ts:396`); the parser only strips one
// layer of quotes. Together they decide whether a field survives the round trip.
function parsedTo(change) {
  const raw = String(change.to ?? '')
  return raw.trim() === '' ? null : JSON.parse(raw)
}

describe('the exported event survives the engine parser', () => {
  it('parses as an add_element whose `to` is the event object', () => {
    const out = exportOf([draft(FIELDS)])
    assert.equal(out.ok, true, JSON.stringify(out.errors))

    const doc = core.parseChangeset(out.text)
    assert.equal(doc.changes.length, 1, 'one change, not a fieldless element plus noise')
    const change = doc.changes[0]
    assert.equal(change.op, 'add_element')
    assert.equal(change.concept, 'Execution Event')
    assert.equal(change.name, 'e-007')
    assert.deepEqual(parsedTo(change), FIELDS)
  })

  it('folds the recorded event into the run it belongs to', () => {
    // The procedure the event is being written into.
    const procedure = `---
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
    const graph = core.procedureGraph(core.parseKnowledge(procedure))
    const out = exportOf([draft(FIELDS)])
    const doc = core.parseChangeset(out.text)
    const event = parsedTo(doc.changes[0])

    const before = core.foldRun(
      graph,
      runModelOfEvents(
        [
          { kind: 'started' },
          { kind: 'step_started', step: 'draft', attempt: 1 },
          { kind: 'step_completed', step: 'draft', next: 'review' },
          { kind: 'step_started', step: 'review', attempt: 1 },
        ],
        { defRev: 'V_1-0-0' },
      ),
      { defRev: 'V_1-0-0' },
    )
    assert.equal(before.currentStep, 'review')

    const after = core.foldRun(
      graph,
      runModelOfEvents(
        [
          { kind: 'started' },
          { kind: 'step_started', step: 'draft', attempt: 1 },
          { kind: 'step_completed', step: 'draft', next: 'review' },
          { kind: 'step_started', step: 'review', attempt: 1 },
          event,
        ],
        { defRev: 'V_1-0-0' },
      ),
      { defRev: 'V_1-0-0' },
    )
    assert.equal(after.currentStep, 'publish', 'the recorded decision advanced the walk')
    assert.equal(after.steps.review.outcome, 'approve')
    assert.equal(after.steps.rework.status, 'off_path')
  })
})
