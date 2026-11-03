/**
 * test/console-view-episode-review.test.mjs
 *
 * Change 2026-11-02-video-script-v1, decision D10 / A3 / A12:
 * `console-view-episode-review` is a registered bluepriNNt view of `coNNtent`. It shows
 * one episode's scenes with verdict controls, writes every edit as a changeset operation
 * (`update_field` / `comment`) through the console's proposal store, and reads the money
 * and timing facts from `ctx.viewData` — never from the model.
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { bootConsole, nnConsole } from './helpers/console-boot.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const ASSETS = resolve(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'coNNtent', 'assets')
const VIEW_FILE = join(ASSETS, 'console-view-episode-review.js')
const DATA_FILE = join(ASSETS, 'console-view-episode-review.data.mjs')

const EPISODE_MODEL = {
  meta: { title: 'Video Domain', modelId: 'video', changesBlueprintVersion: 'V_0-3-0' },
  elements: [
    { id: 'ep-1', concept: 'Video', name: 'Episode One', hash: 'aaaaaaaaaaaaaaaa', fields: { slug: 'ep-1', status: 'draft', budget: '1.50' } },
    { id: 's-1', concept: 'Scene', name: 'Opening', hash: 'bbbbbbbbbbbbbbbb', fields: { slug: 'opening', kind: 'hook', narration: 'Hello there', review: 'pending' } },
    { id: 's-2', concept: 'Scene', name: 'Explain', hash: 'cccccccccccccccc', fields: { slug: 'explain', kind: 'explain', narration: 'The details', review: 'pending' } },
    { id: 'p-1', concept: 'Preset', name: 'Lucas', hash: 'dddddddddddddddd', fields: { slug: 'lucas' } },
  ],
  matrices: [],
}

/** Loads the shipped view source into a registry, exactly as the console would. */
function bootView({ viewData, model = EPISODE_MODEL } = {}) {
  const registry = nnConsole.createViewRegistry()
  const factory = new Function('registerView', readFileSync(VIEW_FILE, 'utf8'))
  // The emitted wrapper binds the id from the file name (nn-runtime viewRegistrar);
  // an isolated registry keeps one test from registering into another's.
  factory(registry.registrar('episode-review', 'probe'))
  const booted = bootConsole({ registry, model, viewData })
  booted.document.querySelector('.nn-view-tab[data-tab="episode-review"]').click()
  const drafts = () => (booted.res && booted.res.state && booted.res.state.store ? booted.res.state.store.drafts() : [])
  return { ...booted, drafts }
}

describe('Episode review view', () => {
  it('ships as a classic script under the bluepriNNt assets', () => {
    const code = readFileSync(VIEW_FILE, 'utf8')
    assert.match(code, /registerView\(\{/, 'it registers itself')
    assert.doesNotMatch(code, /^\s*(import|export)\s/m, 'a view is a classic script, never a module')
    assert.match(code, /console-view-episode-review\.data\.mjs|ctx\.viewData/, 'it reads the collected facts')
  })

  it('lists the episode scenes in order with their kind and verdict', () => {
    const { document } = bootView({
      viewData: { 'episode-review': { episodes: { 'ep-1': { realUsd: 0.5, budgetUsd: 1.5 } } } },
    })
    const rows = [...document.querySelectorAll('[data-nn-episode-scene]')]
    assert.equal(rows.length, 2, 'one row per scene')
    assert.deepEqual(
      rows.map((r) => r.getAttribute('data-nn-episode-scene')),
      ['opening', 'explain'],
      'scenes keep their document order',
    )
    assert.match(rows[0].textContent, /hook/, 'the kind is shown')
    rows.forEach((r) => assert.ok(r.querySelector('[data-nn-verdict]'), 'each scene has a verdict control'))
  })

  it('writes a verdict as an update_field operation, never a private copy', () => {
    const { document, drafts } = bootView({})
    const approve = document.querySelector('[data-nn-scene="opening"] [data-nn-verdict="approved"]')
    assert.ok(approve, 'the approve control exists')
    approve.dispatchEvent(new document.defaultView.Event('click', { bubbles: true }))
    const op = drafts().find((p) => p.field === 'review')
    assert.ok(op, 'the verdict is proposed as a field change')
    assert.equal(op.kind, 'correction', 'a field change is a correction op')
    assert.equal(op.proposed, 'approved')
    assert.equal(op.element_id, 's-1', 'it targets the scene element')
  })

  it('writes a needs-change reason as a comment operation', () => {
    const { document, drafts } = bootView({})
    const box = document.querySelector('[data-nn-scene="explain"] [data-nn-comment]')
    assert.ok(box, 'the comment box exists')
    box.value = 'the pacing drags'
    document
      .querySelector('[data-nn-scene="explain"] [data-nn-comment-save]')
      .dispatchEvent(new document.defaultView.Event('click', { bubbles: true }))
    const op = drafts().find((p) => p.kind === 'comment')
    assert.ok(op, 'the reason is proposed as a comment')
    assert.equal(op.comment, 'the pacing drags')
    assert.equal(op.element_id, 's-2')
  })

  it('offers one preset selector with the chain presets and no baked tier label', () => {
    const { document } = bootView({})
    const selectors = document.querySelectorAll('[data-nn-preset-selector]')
    assert.equal(selectors.length, 1, 'exactly one preset selector')
    assert.match(selectors[0].textContent + selectors[0].innerHTML, /Lucas/, 'the Series preset is offered')
    const text = document.querySelector('[data-nn-episode-review]').textContent
    assert.doesNotMatch(text, /ALTA|MEDIA|R[ÁA]PIDA/, 'no motion tier label is baked into the view')
  })

  it('shows the estimated cost against the budget from the facts', () => {
    const { document } = bootView({
      viewData: { 'episode-review': { episodes: { 'ep-1': { estimateUsd: 0.75, realUsd: 0.5, budgetUsd: 1.5 } } } },
    })
    const cost = document.querySelector('[data-nn-episode-cost]').textContent
    assert.match(cost, /0\.75/, 'the estimate is shown')
    assert.match(cost, /1\.50?/, 'the budget is shown')
  })

  it('mounts without facts instead of failing', () => {
    const { document } = bootView({ viewData: { 'episode-review': {} } })
    assert.ok(document.querySelector('[data-nn-episode-review]'), 'the view still renders')
    assert.match(document.querySelector('[data-nn-episode-review]').textContent, /no cost facts/i)
  })
})

describe('Episode review data hook', () => {
  let root
  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'nn-ep-review-'))
    await mkdir(join(root, '.cognnitive', 'video'), { recursive: true })
    await writeFile(
      join(root, '.cognnitive', 'video', 'ledger.jsonl'),
      [
        JSON.stringify({ ts: 1, episode: 'ep-1', kind: 'tts', model: 'm', estUsd: 0.25, outcome: 'started' }),
        JSON.stringify({ ts: 2, episode: 'ep-1', kind: 'image', model: 'm', estUsd: 0.5, outcome: 'started' }),
      ].join('\n') + '\n',
      'utf8',
    )
    await writeFile(
      join(root, '.cognnitive', 'video', 'timings.jsonl'),
      JSON.stringify({ run_id: 'r1', episode: 'ep-1', stage: 'render', duration_ms: 1200, machine: { fp: 'abc123' } }) + '\n',
      'utf8',
    )
  })
  after(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('sums the real cost per episode from the ledger', async () => {
    const { collect } = await import(pathToFileURL(DATA_FILE).href)
    const data = await collect({ rootDir: root, models: [] })
    assert.equal(data.episodes['ep-1'].realUsd, 0.75, 'the real cost is the sum of the ledger rows')
  })

  it('reads the stage timings with their machine fingerprint', async () => {
    const { collect } = await import(pathToFileURL(DATA_FILE).href)
    const data = await collect({ rootDir: root, models: [] })
    const timing = data.episodes['ep-1'].timings.find((t) => t.stage === 'render')
    assert.equal(timing.durationMs, 1200)
    assert.equal(timing.fingerprint, 'abc123')
  })

  it('returns an empty fact set when the files do not exist', async () => {
    const empty = await mkdtemp(join(tmpdir(), 'nn-ep-review-empty-'))
    try {
      const { collect } = await import(pathToFileURL(DATA_FILE).href)
      const data = await collect({ rootDir: empty, models: [] })
      assert.deepEqual(data.episodes, {}, 'no ledger and no timings means no episodes, not an error')
    } finally {
      await rm(empty, { recursive: true, force: true })
    }
  })
})
