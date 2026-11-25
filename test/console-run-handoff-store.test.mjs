/* The final handoff of a completed run as the console's draft store holds it: one validated
   `run_handoff` draft per run, never a model change in the downloaded changeset. */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
const consoleDir = join(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console')

global.nnIcons = require(join(consoleDir, 'nn-icons.js'))
require(join(consoleDir, 'ui-kit.js'))
const nnReview = require(join(consoleDir, 'review.js'))
const runtime = require(join(consoleDir, 'nn-runtime.js'))

const newStore = () => nnReview.createDraftStore(null, 'intake')

describe('run_handoff drafts', () => {
  it('stores the run and the choice, and nothing about an element', () => {
    const store = newStore()
    const d = store.addDraft({ kind: 'run_handoff', run: 'r1', choice: 'administrator' })
    assert.equal(d.kind, 'run_handoff')
    assert.equal(d.run, 'r1')
    assert.equal(d.choice, 'administrator')
    assert.equal(d.element_id, '')
    assert.equal(store.drafts().length, 1)
  })

  it('refuses a draft without a run slug or with a choice the console does not offer', () => {
    const store = newStore()
    assert.throws(() => store.addDraft({ kind: 'run_handoff', choice: 'agent' }), /run slug/)
    assert.throws(
      () => store.addDraft({ kind: 'run_handoff', run: 'R 1', choice: 'agent' }),
      /run slug/,
    )
    assert.throws(
      () => store.addDraft({ kind: 'run_handoff', run: 'r1', choice: 'publish' }),
      /administrator, agent/,
    )
    assert.equal(store.drafts().length, 0, 'a refused draft leaves nothing behind')
  })

  it('keeps one choice per run: choosing again replaces it in place', () => {
    const store = newStore()
    const first = store.addDraft({ kind: 'run_handoff', run: 'r1', choice: 'administrator' })
    store.addDraft({ kind: 'run_handoff', run: 'r2', choice: 'agent' })
    const again = store.addDraft({ kind: 'run_handoff', run: 'r1', choice: 'agent' })
    assert.equal(again.id, first.id)
    assert.deepEqual(
      store.drafts().map((d) => [d.run, d.choice]),
      [
        ['r1', 'agent'],
        ['r2', 'agent'],
      ],
    )
  })

  it('is never a change in the changeset the console downloads', () => {
    const state = runtime.exportStateOf({
      title: 'intake Domain',
      modelId: 'intake',
      workspaceId: 'intake',
      changesBlueprintVersion: 'V_0-1-0',
    })
    const store = newStore()
    store.addDraft({ kind: 'run_handoff', run: 'r1', choice: 'agent' })
    store.addDraft({ kind: 'new', knowledge_id: 'k', concept: 'Concept', element: 'Element' })
    state.store = store
    state.exportedAt = '2026-11-24T10:00:00Z'
    const out = runtime.composeExport(state, 'ana')
    assert.equal(out.ok, true)
    assert.match(out.changesetText, /add_element/, 'the real change is exported')
    assert.doesNotMatch(JSON.stringify(out), /run_handoff|handoff|agent/)
  })
})
