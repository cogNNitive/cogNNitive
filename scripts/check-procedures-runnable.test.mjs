#!/usr/bin/env node

/**
 * scripts/check-procedures-runnable.test.mjs
 *
 * Unit tests for scripts/check-procedures-runnable.mjs, plus the guarantee itself on the
 * shipped tree: every shipped procedure is runnable, and the iNNtake audio ingestion is a
 * real engine procedure with a guarded human review.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkProceduresRunnable, loadCore } from './check-procedures-runnable.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const core = await loadCore()

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'check-procedures-runnable-'))
}

function writeDoc(root, rel, body) {
  const file = path.join(root, rel)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(
    file,
    `---\nlevel: 3\nknowledge_version: "V_0-1-0"\n---\n\n# NN Work\n\n${body}`,
    'utf8',
  )
}

const RUNNABLE = `## NN Procedure: Do It
slug:: do-it
summary:: Does it.

### NN Work: First
slug:: first
next:: @second
executor:: agent

### NN Work: Second
slug:: second
executor:: human
`

test('a runnable procedure passes', async () => {
  const root = fixtureRoot()
  writeDoc(root, 'demo/procedures/do_it_procedures_NN.md', RUNNABLE)
  const res = await checkProceduresRunnable({ blueprintsRoot: root, core })
  assert.deepEqual(res.failures, [])
  assert.equal(res.ok, true)
  assert.equal(res.checked, 1)
})

test('an old-form procedure fails with MISSING_SLUG naming the file and the step', async () => {
  const root = fixtureRoot()
  writeDoc(
    root,
    'demo/procedures/old_procedures_NN.md',
    `## NN Procedure: Old
### NN Work: Step One
next:: [[Step Two]]
tool:: [[AI Agent]]

### NN Work: Step Two
`,
  )
  const res = await checkProceduresRunnable({ blueprintsRoot: root, core })
  assert.equal(res.ok, false)
  const missing = res.failures.filter((f) => f.code === 'MISSING_SLUG')
  assert.deepEqual(
    missing.map((f) => [f.target, f.step]),
    [
      ['demo/procedures/old_procedures_NN.md', 'step-one'],
      ['demo/procedures/old_procedures_NN.md', 'step-two'],
    ],
  )
})

test('a next naming no step fails with UNKNOWN_NEXT', async () => {
  const root = fixtureRoot()
  writeDoc(
    root,
    'demo/procedures/broken_procedures_NN.md',
    RUNNABLE.replace('next:: @second', 'next:: @nowhere'),
  )
  const res = await checkProceduresRunnable({ blueprintsRoot: root, core })
  assert.equal(res.ok, false)
  assert.ok(res.failures.some((f) => f.code === 'UNKNOWN_NEXT' && f.step === 'first'))
})

test('a loop back to an earlier step fails with CYCLE', async () => {
  const root = fixtureRoot()
  writeDoc(
    root,
    'demo/procedures/loop_procedures_NN.md',
    RUNNABLE.replace('slug:: second\n', 'slug:: second\nnext:: @first\n'),
  )
  const res = await checkProceduresRunnable({ blueprintsRoot: root, core })
  assert.equal(res.ok, false)
  assert.ok(res.failures.some((f) => f.code === 'CYCLE'))
})

test('a document without a Procedure header fails with PROCEDURE_HEADER_COUNT', async () => {
  const root = fixtureRoot()
  writeDoc(root, 'demo/procedures/bare_procedures_NN.md', '## NN Work: A\nslug:: a\n')
  const res = await checkProceduresRunnable({ blueprintsRoot: root, core })
  assert.ok(res.failures.some((f) => f.code === 'PROCEDURE_HEADER_COUNT'))
})

test('a step left outside the header fails with WORK_NOT_UNDER_PROCEDURE', async () => {
  const root = fixtureRoot()
  writeDoc(
    root,
    'demo/procedures/loose_procedures_NN.md',
    `${RUNNABLE}
# NN Work

## NN Work: Loose
slug:: loose
`,
  )
  const res = await checkProceduresRunnable({ blueprintsRoot: root, core })
  assert.ok(res.failures.some((f) => f.code === 'WORK_NOT_UNDER_PROCEDURE' && f.step === 'loose'))
})

test('a declared procedure with no steps passes', async () => {
  const root = fixtureRoot()
  writeDoc(
    root,
    'demo/procedures/rfp_procedures_NN.md',
    '## NN Procedure: RFP\nslug:: rfp\nsummary:: Answers an RFP.\n',
  )
  const res = await checkProceduresRunnable({ blueprintsRoot: root, core })
  assert.deepEqual(res.failures, [])
})

test('only *_procedures_NN.md documents directly under procedures/ are checked', async () => {
  const root = fixtureRoot()
  writeDoc(root, 'demo/procedures/do_it_procedures_NN.md', RUNNABLE)
  writeDoc(root, 'demo/procedures/notes_NN.md', '## NN Work: Loose\n')
  writeDoc(root, 'demo/samples/Sample_V_0-1-0_procedures_NN.md', '## NN Work: Loose\n')
  const res = await checkProceduresRunnable({ blueprintsRoot: root, core })
  assert.equal(res.checked, 1)
  assert.equal(res.ok, true)
})

test('every shipped procedure is runnable', async () => {
  const res = await checkProceduresRunnable({ core })
  const lines = res.failures.map((f) => `${f.target} ${f.step ?? ''} ${f.code}`)
  assert.deepEqual(lines, [])
  assert.ok(res.checked >= 30, `only ${res.checked} procedure documents were found`)
})

test('iNNtake audio ingestion runs engine steps and a guarded human review', () => {
  const file = path.join(
    REPO_ROOT,
    'iNNfo/specs/bluepriNNts/workspace/procedures/import_and_transcribe_audio_procedures_NN.md',
  )
  const graph = core.procedureGraph(core.parseKnowledge(fs.readFileSync(file, 'utf8')))
  assert.deepEqual(graph.diagnostics, [])
  assert.ok(graph.start, 'one start step')
  assert.ok(graph.slots.length > 0, 'the run takes slots')

  const steps = Object.values(graph.steps)
  const engine = steps.filter((s) => s.executor === 'engine')
  assert.ok(engine.length > 0, 'no engine step')
  for (const s of engine) assert.ok(s.command, `engine step ${s.slug} has no command`)
  assert.ok(
    steps.some((s) => s.executor === 'agent'),
    'the transcription is agent work',
  )

  const decisions = steps.filter((s) => s.stepType === 'decision' && s.executor === 'human')
  assert.equal(decisions.length, 1, 'one human review decision')
  const [review] = decisions
  assert.ok(review.decision, 'the review asks a question')
  assert.equal(review.next.length, 2, 'the review has two branches')
  const guards = review.next.map((t) => graph.steps[t].condition)
  for (const g of guards)
    assert.match(g ?? '', /^outcome == \S+$/, `branch guard "${g}" is not evaluable`)
  assert.equal(new Set(guards).size, 2, 'the two branches are guarded by different outcomes')

  const artifacts = Object.values(graph.artifacts)
  assert.ok(
    artifacts.some((a) => /^file:/.test(a.verify ?? '')),
    'no artifact verifies a file',
  )
})
