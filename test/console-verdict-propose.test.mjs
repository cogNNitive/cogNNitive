/**
 * test/console-verdict-propose.test.mjs
 *
 * A view proposes a verdict through the shared store; the store keeps it as a verdict
 * draft (no element base_hash) and the exported changeset addresses the scene, not the
 * model. This was the missing link of 4c.3: `draftToChanges` already exported verdicts,
 * but `propose()` refused the kind, so no view could ever emit one.
 */

import test from 'node:test'
import assert from 'node:assert/strict'

import { nnConsole, bootConsole } from './helpers/console-boot.mjs'

const HASH = 'a'.repeat(64)
const SLICE = 'b'.repeat(64)

const MODEL = {
  meta: { title: 'Probe', modelId: 's/e', changesBlueprintVersion: 'V_0-8-1' },
  elements: [
    {
      id: 's/e@one',
      concept: 'Scene',
      name: 'One',
      slug: 'one',
      modelId: 's/e',
      fields: {},
      hash: '0123456789abcdef',
    },
  ],
  matrices: [],
}

function bootView({ model = MODEL } = {}) {
  const registry = nnConsole.createViewRegistry()
  let ctx = null
  registry.register({
    id: 'probe',
    title: 'Probe',
    icon: 'play',
    order: 10,
    kind: 'editable',
    mount(c) {
      ctx = c
      return {}
    },
  })
  const booted = bootConsole({ registry, model })
  booted.document.querySelector('.nn-view-tab[data-tab="probe"]').click()
  return { ...booted, ctx }
}

const proposeVerdict = (ctx, over = {}) =>
  ctx.store.propose({
    elementId: 's/e@one',
    kind: 'verdict',
    gate: 'script',
    verdict: 'approved',
    reviewed_hash: HASH,
    ...over,
  })

/** The console's changeset export, fed from the shared draft store the view wrote to. */
function exportText(ctx, reviewer = 'Ana') {
  const res = nnConsole.composeChangesetExport(
    {
      modelTitle: 'Probe',
      modelId: 's/e',
      meta: { changesBlueprintVersion: 'V_0-8-1' },
      store: { drafts: () => ctx.store.drafts() },
    },
    reviewer,
  )
  assert.equal(res.ok, true, res.errors && res.errors.join('; '))
  return res.text
}

test('a view proposes a verdict and it lands as a verdict draft', () => {
  const { ctx } = bootView()
  const draft = proposeVerdict(ctx)
  assert.equal(draft.kind, 'verdict')
  assert.equal(draft.gate, 'script')
  assert.equal(draft.verdict, 'approved')
  assert.equal(draft.reviewed_hash, HASH)
  assert.ok(!draft.base_hash, 'a verdict carries no element base_hash')
  assert.equal(draft.element_slug, 'one', 'the target is the scene slug, not the model')
})

test('the exported changeset targets the scene and carries human console provenance', () => {
  const { ctx } = bootView()
  proposeVerdict(ctx)
  const text = exportText(ctx)
  assert.match(text, /^author_kind: human$/m)
  assert.match(text, /^origin: console$/m)
  assert.match(text, /^reviewer: "Ana"$/m)
  assert.match(text, /^op:: review_gate$/m)
  assert.match(text, /^target:: s\/e@one$/m)
  assert.match(text, new RegExp('^reviewed_hash:: ' + HASH + '$', 'm'))
})

test('a needs-change verdict keeps its reason as notes', () => {
  const { ctx } = bootView()
  const draft = proposeVerdict(ctx, { verdict: 'needs-change', notes: 'tighten the hook' })
  assert.equal(draft.verdict, 'needs-change')
  assert.equal(draft.notes, 'tighten the hook')
  const text = exportText(ctx)
  assert.match(text, /^verdict:: needs-change$/m)
  assert.match(text, /^notes:: tighten the hook$/m)
})

test('a preview verdict carries the scene plan slice hash', () => {
  const { ctx } = bootView()
  proposeVerdict(ctx, { gate: 'preview', plan_hash: SLICE })
  const text = exportText(ctx)
  assert.match(text, new RegExp('^plan_hash:: ' + SLICE + '$', 'm'))
})

test('a verdict without a reviewed hash is refused', () => {
  const { ctx } = bootView()
  assert.throws(() => proposeVerdict(ctx, { reviewed_hash: undefined }), /reviewed_hash/)
  assert.equal(ctx.store.drafts().length, 0, 'nothing is written')
})

test('needs-change without a reason is refused', () => {
  const { ctx } = bootView()
  assert.throws(() => proposeVerdict(ctx, { verdict: 'needs-change' }), /reason/)
  assert.equal(ctx.store.drafts().length, 0)
})

test('an unknown verdict is refused', () => {
  const { ctx } = bootView()
  assert.throws(() => proposeVerdict(ctx, { verdict: 'maybe' }), /approved or needs-change/)
  assert.equal(ctx.store.drafts().length, 0)
})

test('a malformed plan hash is refused', () => {
  const { ctx } = bootView()
  assert.throws(() => proposeVerdict(ctx, { gate: 'preview', plan_hash: 'abc' }), /plan_hash/)
  assert.equal(ctx.store.drafts().length, 0)
})
