/**
 * test/console-view-data.test.mjs
 *
 * Change 2026-11-02-video-script-v1, decision A12: a view may ship a sibling
 * `<view>.data.mjs` exporting `collect({ rootDir, models })`. Its JSON result is
 * embedded in the console payload and reaches the view as `ctx.viewData`.
 *
 * The views need ledger and timing facts that are not part of the kNNowledge model,
 * and facts stay JSONL: the exporter computes them at export time, never at runtime.
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { discoverViews } from '../scripts/console-views.mjs'
import { bootConsole, nnConsole } from './helpers/console-boot.mjs'

const execFileAsync = promisify(execFile)
const here = dirname(fileURLToPath(import.meta.url))
const scriptPath = resolve(here, '..', 'scripts', 'export-console.mjs')

const VIEW = `registerView({ title: 'Probe', icon: 'list', order: 20, kind: 'readonly', mount: function () {} })`

const DATA = `export async function collect({ rootDir, models }) {
  return { rootDir: String(rootDir).replace(/\\\\/g, '/').length > 0, modelCount: models.length, rows: [1, 2, 3] }
}`

const MODEL = `---
title: "M"
knowledge_version: "V_1-0-0"
level: 3
parent_spec:
  name: probe
  url: "https://example.test/probe/spec_NN.md"
---

# NN Item
## NN Item: Alpha
  slug:: alpha
  note:: "a"
`

describe('view data hook (A12)', () => {
  let root
  let pkgDir
  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'nn-view-data-'))
    pkgDir = join(root, 'specs', 'bluepriNNts', 'probe')
    await mkdir(join(pkgDir, 'assets'), { recursive: true })
    await mkdir(join(root, 'models'), { recursive: true })
    await writeFile(join(pkgDir, 'assets', 'console-view-probe.js'), VIEW, 'utf-8')
    await writeFile(join(pkgDir, 'assets', 'console-view-probe.data.mjs'), DATA, 'utf-8')
    await writeFile(join(root, 'models', 'm_V_1-0-0_NN.md'), MODEL, 'utf-8')
  })
  after(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('attaches the sibling .data.mjs to its view', async () => {
    const views = await discoverViews({
      domainRoot: root,
      specNames: ['probe'],
      packagesDir: join(root, 'packages'),
    })
    const probe = views.find((v) => v.id === 'probe')
    assert.ok(probe, 'the view is discovered')
    assert.ok(probe.dataPath, 'the view carries the data module path')
    assert.match(probe.dataPath.replace(/\\/g, '/'), /console-view-probe\.data\.mjs$/)
  })

  it('refuses an orphan .data.mjs instead of ignoring it', async () => {
    const lonely = join(root, 'specs', 'bluepriNNts', 'lonely', 'assets')
    await mkdir(lonely, { recursive: true })
    await writeFile(join(lonely, 'console-view-ghost.data.mjs'), DATA, 'utf-8')
    await assert.rejects(
      () => discoverViews({ domainRoot: root, specNames: ['lonely'], packagesDir: join(root, 'packages') }),
      /ghost.*no matching view|no matching view.*ghost/s,
    )
    await rm(join(root, 'specs', 'bluepriNNts', 'lonely'), { recursive: true, force: true })
  })

  it('embeds the collected JSON in the console payload', async () => {
    await execFileAsync(process.execPath, [scriptPath, root, '--domain', '--no-open'], {
      maxBuffer: 64 * 1024 * 1024,
    })
    const html = await readFile(join(root, 'domaiNN_console.html'), 'utf-8')
    const slot = /<script type="application\/json" id="nn-view-data">([\s\S]*?)<\/script>/.exec(html)
    assert.ok(slot, 'the console carries an nn-view-data slot')
    const data = JSON.parse(slot[1])
    assert.equal(data.probe.modelCount, 1, 'collect received the payload models')
    assert.deepEqual(data.probe.rows, [1, 2, 3], 'the collected JSON is embedded verbatim')
  })
})

describe('ctx.viewData', () => {
  function bootWithData(viewData) {
    const registry = nnConsole.createViewRegistry()
    const seen = {}
    registry.register({
      id: 'probe',
      title: 'Probe',
      icon: 'list',
      order: 20,
      kind: 'readonly',
      mount(ctx) {
        seen.own = ctx.viewData
        seen.all = ctx.payload.viewData
        return {}
      },
    })
    const booted = bootConsole(viewData === undefined ? { registry } : { registry, viewData })
    booted.document.querySelector('.nn-view-tab[data-tab="probe"]').click()
    return seen
  }

  it('exposes this view’s data and the whole map', () => {
    const viewData = { probe: { rows: [1] }, other: { rows: [] } }
    const seen = bootWithData(viewData)
    assert.deepEqual(seen.own, { rows: [1] }, 'ctx.viewData is this view’s slice')
    assert.deepEqual(seen.all, viewData, 'ctx.payload.viewData is the whole map')
  })

  it('is an object even when the console carries no data', () => {
    const seen = bootWithData(undefined)
    assert.deepEqual(seen.own, {}, 'no data slot means an empty object, never undefined')
  })
})
