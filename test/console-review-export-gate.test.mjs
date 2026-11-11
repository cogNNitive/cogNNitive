/**
 * test/console-review-export-gate.test.mjs
 *
 * #606: a console-exported review changeset must be accepted by `produce` as-is.
 * - The agent-prompt export ("Copy prompt for AI agent") never embeds a changeset signed
 *   by the placeholder reviewer `"reviewer"`: it asks for a name instead. With a name
 *   set, it signs with that name.
 * - Re-proposing a verdict for the same scene and gate replaces the earlier one, so a
 *   re-export after a failed apply carries each decision once (no fb-005..fb-008 copies
 *   of fb-001..fb-004). A verdict on another gate or another scene is still its own draft.
 */

import test from 'node:test'
import assert from 'node:assert/strict'

import { nnConsole, bootConsole } from './helpers/console-boot.mjs'

const HASH = 'a'.repeat(64)
const HASH2 = 'c'.repeat(64)
const SLICE = 'b'.repeat(64)

const scene = (slug) => ({
  id: 's/e@' + slug,
  concept: 'Scene',
  name: slug,
  slug,
  modelId: 's/e',
  fields: {},
  hash: '0123456789abcdef',
})

const MODEL = {
  meta: { title: 'Probe', modelId: 's/e', changesBlueprintVersion: 'V_0-8-1' },
  elements: [scene('one'), scene('two')],
  matrices: [],
}

function bootView() {
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
  const booted = bootConsole({ registry, model: MODEL })
  booted.document.querySelector('.nn-view-tab[data-tab="probe"]').click()
  return { ...booted, ctx, state: booted.res.state }
}

const verdict = (ctx, over = {}) =>
  ctx.store.propose({
    elementId: 's/e@one',
    kind: 'verdict',
    gate: 'script',
    verdict: 'approved',
    reviewed_hash: HASH,
    ...over,
  })

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

const reviewGateBlocks = (text) => (text.match(/^op:: review_gate$/gm) || []).length

test('the agent prompt never signs a changeset with the placeholder reviewer', () => {
  const { ctx, state } = bootView()
  localStorage.removeItem('nn_reviewer_name')
  verdict(ctx)
  const prompt = nnConsole.composeAgentPrompt(state)
  assert.doesNotMatch(prompt, /^reviewer: "reviewer"$/m)
  assert.doesNotMatch(prompt, /^author: "reviewer"$/m)
  assert.doesNotMatch(prompt, /^op:: review_gate$/m, 'no changeset is embedded without a reviewer name')
  assert.match(prompt, /reviewer name/i, 'the prompt says a reviewer name is needed')
})

test('the agent prompt signs the changeset with the reviewer name once one is set', () => {
  const { ctx, state } = bootView()
  nnConsole.setReviewerName('Ana')
  try {
    verdict(ctx)
    const prompt = nnConsole.composeAgentPrompt(state)
    assert.match(prompt, /^reviewer: "Ana"$/m)
    assert.match(prompt, /^op:: review_gate$/m)
  } finally {
    localStorage.removeItem('nn_reviewer_name')
  }
})

test('re-proposing a verdict for the same scene and gate replaces it instead of duplicating', () => {
  const { ctx } = bootView()
  const first = verdict(ctx)
  const again = verdict(ctx)
  assert.equal(ctx.store.drafts().length, 1, 'one draft per (scene, gate)')
  assert.equal(again.id, first.id, 'the replacement keeps the draft id, so the export is stable')
  assert.equal(reviewGateBlocks(exportText(ctx)), 1)
})

test('the later decision on the same scene and gate wins', () => {
  const { ctx } = bootView()
  verdict(ctx)
  verdict(ctx, { verdict: 'needs-change', notes: 'tighten the hook', reviewed_hash: HASH2 })
  const drafts = ctx.store.drafts()
  assert.equal(drafts.length, 1)
  assert.equal(drafts[0].verdict, 'needs-change')
  assert.equal(drafts[0].reviewed_hash, HASH2)
  assert.equal(drafts[0].notes, 'tighten the hook')
})

test('verdicts on another gate or another scene stay separate drafts', () => {
  const { ctx } = bootView()
  verdict(ctx)
  verdict(ctx, { gate: 'preview', plan_hash: SLICE })
  verdict(ctx, { elementId: 's/e@two' })
  assert.equal(ctx.store.drafts().length, 3)
  assert.equal(reviewGateBlocks(exportText(ctx)), 3)
})

test('two comments on the same element are still two drafts (only verdicts are replaced)', () => {
  const { ctx } = bootView()
  ctx.store.propose({ elementId: 's/e@one', kind: 'comment', comment: 'first' })
  ctx.store.propose({ elementId: 's/e@one', kind: 'comment', comment: 'second' })
  assert.equal(ctx.store.drafts().length, 2)
})
