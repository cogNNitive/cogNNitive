/**
 * test/console-view-series.test.mjs
 *
 * Change 2026-11-02-video-script-v1, D10 / A12 / A13: the Series view lists the
 * Series' episodes by state, shows the real cost from the ledger and the stage
 * timings from the timing log, compares runs across machine fingerprints, flags
 * stale prices, and shows an empty state when there are no facts yet.
 *
 * Facts reach the view only through `ctx.viewData`, collected at export time from the
 * JSONL files (`.cognnitive/video/*.jsonl`), never recomputed from estimates.
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { readFileSync } from 'node:fs'
import { bootConsole, nnConsole } from './helpers/console-boot.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const ASSETS = resolve(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'coNNtent', 'assets')
const VIEW_FILE = join(ASSETS, 'console-view-series.js')
const DATA_FILE = join(ASSETS, 'console-view-series.data.mjs')

const SERIES_MODEL = {
  meta: { title: 'Video Domain', modelId: 'video', changesBlueprintVersion: 'V_0-3-0' },
  elements: [
    { id: 's', concept: 'Series', name: 'Demo Series', hash: 'eeeeeeeeeeeeeeee', fields: { slug: 's' } },
    { id: 'e1', concept: 'Video', name: 'One', hash: 'aaaaaaaaaaaaaaaa', fields: { slug: 'one', status: 'produced' } },
    { id: 'e2', concept: 'Video', name: 'Two', hash: 'bbbbbbbbbbbbbbbb', fields: { slug: 'two', status: 'draft' } },
    { id: 'e3', concept: 'Video', name: 'Three', hash: 'cccccccccccccccc', fields: { slug: 'three', status: 'produced' } },
  ],
  matrices: [],
}

function bootSeries({ viewData, model = SERIES_MODEL } = {}) {
  const registry = nnConsole.createViewRegistry()
  const factory = new Function('registerView', readFileSync(VIEW_FILE, 'utf8'))
  factory(registry.registrar('series', 'probe'))
  const booted = bootConsole({ registry, model, viewData })
  booted.document.querySelector('.nn-view-tab[data-tab="series"]').click()
  return booted
}

describe('Series view', () => {
  it('ships as a classic script with its data module', () => {
    const code = readFileSync(VIEW_FILE, 'utf8')
    assert.match(code, /registerView\(\{/, 'it registers itself')
    assert.doesNotMatch(code, /^\s*(import|export)\s/m, 'a view is a classic script, never a module')
    assert.match(code, /ctx\.viewData/, 'it reads the collected facts')
  })

  it('groups the episodes by state with counts', () => {
    const { document } = bootSeries({ viewData: { series: { episodes: {} } } })
    const groups = [...document.querySelectorAll('[data-nn-state-group]')]
    assert.deepEqual(
      groups.map((g) => g.getAttribute('data-nn-state-group')),
      ['produced', 'draft'],
      'one group per state, produced first',
    )
    const produced = groups.find((g) => g.getAttribute('data-nn-state-group') === 'produced')
    assert.match(produced.textContent, /2/, 'the produced group shows its count')
    assert.match(produced.textContent, /One/, 'and lists its episodes')
    assert.match(produced.textContent, /Three/)
  })

  it('shows the real cost from the ledger', () => {
    const { document } = bootSeries({
      viewData: { series: { episodes: { one: { realUsd: 1.25 } } } },
    })
    const row = document.querySelector('[data-nn-episode="one"]')
    assert.match(row.textContent, /1\.25/, 'the cost is the sum of the ledger rows')
  })

  it('compares stage timings across machine fingerprints', () => {
    const { document } = bootSeries({
      viewData: {
        series: {
          episodes: {
            one: {
              timings: [
                { stage: 'render', durationMs: 1200, fingerprint: 'aaaa1111' },
                { stage: 'render', durationMs: 900, fingerprint: 'bbbb2222' },
              ],
            },
          },
        },
      },
    })
    const cells = [...document.querySelectorAll('[data-nn-timing="render"]')]
    assert.equal(cells.length, 2, 'one cell per machine for the same stage')
    const text = cells.map((c) => c.textContent).join(' | ')
    assert.match(text, /1200/, 'the slow machine shows its duration')
    assert.match(text, /900/, 'the fast machine shows its duration')
    assert.match(text, /aaaa1111/, 'the first fingerprint is shown')
    assert.match(text, /bbbb2222/, 'the second fingerprint is shown')
  })

  it('flags a stale price and still counts the row', () => {
    const { document } = bootSeries({
      viewData: {
        series: {
          episodes: {
            one: { realUsd: 0.5, staleRows: [{ priceDate: '2020-01-01', model: 'old/model', usd: 0.5 }] },
          },
        },
      },
    })
    const stale = document.querySelector('[data-nn-stale-price]')
    assert.ok(stale, 'a stale price is flagged')
    assert.match(stale.textContent, /old\/model/)
    assert.match(document.querySelector('[data-nn-episode="one"]').textContent, /0\.5/, 'the row is still counted')
  })

  it('shows an empty state and no error when there are no facts', () => {
    const { document } = bootSeries({ viewData: { series: { episodes: {} } } })
    assert.match(document.querySelector('[data-nn-series]').textContent, /no facts/i)
  })
})

describe('Series view data hook', () => {
  let root
  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'nn-series-view-'))
    const dir = join(root, '.cognnitive', 'video')
    await mkdir(dir, { recursive: true })
    // Two machines: one file per machine, merged at export time (A13).
    await writeFile(
      join(dir, 'ledger.laptop.jsonl'),
      JSON.stringify({ ts: 1, episode: 'one', kind: 'tts', model: 'm', estUsd: 0.25, price_date: '2026-10-01' }) + '\n',
      'utf8',
    )
    await writeFile(
      join(dir, 'ledger.desktop.jsonl'),
      JSON.stringify({ ts: 2, episode: 'one', kind: 'image', model: 'm', estUsd: 0.5, price_date: '2020-01-01' }) + '\n',
      'utf8',
    )
    await writeFile(
      join(dir, 'timings.laptop.jsonl'),
      JSON.stringify({ run_id: 'r1', episode: 'one', stage: 'render', duration_ms: 1200, machine: { fp: 'aaaa1111' } }) + '\n',
      'utf8',
    )
    await writeFile(
      join(dir, 'timings.desktop.jsonl'),
      JSON.stringify({ run_id: 'r2', episode: 'one', stage: 'render', duration_ms: 900, machine: { fp: 'bbbb2222' } }) + '\n',
      'utf8',
    )
  })
  after(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('merges every machine file and sums the real cost', async () => {
    const { collect } = await import(pathToFileURL(DATA_FILE).href)
    const data = await collect({ rootDir: root, models: [] })
    assert.equal(data.episodes.one.realUsd, 0.75, 'both machines’ rows are counted')
  })

  it('keeps one timing per fingerprint for the same stage', async () => {
    const { collect } = await import(pathToFileURL(DATA_FILE).href)
    const data = await collect({ rootDir: root, models: [] })
    const render = data.episodes.one.timings.filter((t) => t.stage === 'render')
    assert.deepEqual(render.map((t) => t.fingerprint).sort(), ['aaaa1111', 'bbbb2222'])
  })

  it('flags only the row whose price_date is stale', async () => {
    const { collect } = await import(pathToFileURL(DATA_FILE).href)
    const data = await collect({ rootDir: root, models: [] })
    const stale = data.episodes.one.staleRows
    assert.equal(stale.length, 1, 'only the 2020 price is stale')
    assert.equal(stale[0].priceDate, '2020-01-01')
  })

  it('returns no episodes when the folder does not exist', async () => {
    const empty = await mkdtemp(join(tmpdir(), 'nn-series-empty-'))
    try {
      const { collect } = await import(pathToFileURL(DATA_FILE).href)
      const data = await collect({ rootDir: empty, models: [] })
      assert.deepEqual(data.episodes, {})
    } finally {
      await rm(empty, { recursive: true, force: true })
    }
  })
})
