import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')
const consoleDir = join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'console')
const require = createRequire(import.meta.url)
const runtime = require(join(consoleDir, 'nn-runtime.js'))

/* An `Execution Event` is written by the procedure runner as ONE `add_element` whose
   fields ride in `to` (`procedure-record.ts:48-55`). A console draft must produce that
   same change, or the exported changeset records an event with no kind. */

function stateWith(drafts) {
  return {
    meta: { changesBlueprintVersion: 'V_0-13-0' },
    modelId: 'review',
    modelTitle: 'Review',
    modelVersion: '1-0-0',
    store: { drafts: () => drafts },
  }
}

const eventDraft = (fields, n = 7) => ({
  id: 'ev-' + n,
  kind: 'new',
  knowledge_id: 'r1',
  element_slug: 'e-' + String(n).padStart(3, '0'),
  concept: 'Execution Event',
  element: 'e-' + String(n).padStart(3, '0'),
  proposed: JSON.stringify(fields),
})

describe('draft export: add_element carries its fields in `to`', () => {
  it('emits the event fields the runner records, in one add_element change', () => {
    const fields = {
      kind: 'step_completed',
      step: 'review',
      outcome: 'approve',
      next: 'publish',
      actor: 'ana',
      at: '2026-11-19T10:00:00.000Z',
    }
    const out = runtime.composeChangesetExport(stateWith([eventDraft(fields)]), 'ana')
    assert.equal(out.ok, true, JSON.stringify(out.errors))

    const block = out.text.split('## NN Change: ev-7')[1]
    assert.ok(block, 'the event block is present')
    assert.match(block, /^op:: add_element$/m)
    assert.match(block, /^target:: r1@Execution Event$/m)
    assert.match(block, /^concept:: Execution Event$/m)
    assert.match(block, /^name:: e-007$/m)

    const to = /\nto:: (.+)\n/.exec(block)
    assert.ok(to, 'the change carries `to`')
    const parsed = JSON.parse(to[1])
    assert.deepEqual(parsed, fields, 'every event field round-trips')
  })

  it('leaves an object `proposed` on the editor path it already had (set_fields)', () => {
    const draft = {
      id: 'ev-8',
      kind: 'new',
      knowledge_id: 'r1',
      element_slug: 'e-008',
      concept: 'Execution Event',
      element: 'e-008',
      proposed: { kind: 'step_started', step: 'draft', attempt: '1' },
    }
    const out = runtime.composeChangesetExport(stateWith([draft]), 'ana')
    assert.equal(out.ok, true, JSON.stringify(out.errors))
    assert.match(out.text, /## NN Change: ev-8-fields/)
    assert.match(out.text, /op:: set_fields/)
    // The element block itself stays fieldless: the fields ride the set_fields change.
    const head = out.text.split('## NN Change: ev-8\n')[1].split('## NN Change:')[0]
    assert.doesNotMatch(head, /^to:: /m)
  })

  it('leaves a fieldless add_element exactly as it was', () => {
    const draft = {
      id: 'ev-9',
      kind: 'new',
      knowledge_id: 'r1',
      element_slug: 'e-009',
      concept: 'Execution Event',
      element: 'e-009',
    }
    const out = runtime.composeChangesetExport(stateWith([draft]), 'ana')
    assert.equal(out.ok, true, JSON.stringify(out.errors))
    const block = out.text.split('## NN Change: ev-9')[1]
    assert.match(block, /^op:: add_element$/m)
    assert.doesNotMatch(block, /^to:: /m, 'no `to` when the draft carries no fields')
    assert.equal((out.text.match(/## NN Change: ev-9/g) || []).length, 1, 'exactly one block')
  })
})
