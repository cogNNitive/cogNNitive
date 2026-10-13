import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname, basename } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { JSDOM } from 'jsdom'

const execFileAsync = promisify(execFile)
const here = dirname(fileURLToPath(import.meta.url))
const scriptPath = resolve(here, '..', 'scripts', 'export-console.mjs')

async function runCli(args, env) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath, ...args], {
      maxBuffer: 64 * 1024 * 1024,
      env: env ? { ...process.env, ...env } : process.env,
    })
    return { code: 0, stdout, stderr }
  } catch (err) {
    return { code: err.code ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' }
  }
}

const MODEL = `---
title: "View Model"
model_version: "V_1-0-0"
level: 3
---

# NN Stakeholders
## NN Stakeholders: Enterprise
  budget:: "$100k"

  Leading enterprise tier offering.
`

// Editable view that hands its context to the page so a test can drive it.
const editableView = (title) => `registerView({
  title: '${title}', icon: 'layout', order: 1, kind: 'editable',
  mount(ctx) { ctx.container.textContent = '${title} mounted'; window.__ctx = ctx },
})
`

describe('export-console size budget and --view (S2c2)', () => {
  let root
  const domainFile = () => join(root, 'domaiNN_console.html')
  const addView = async (slug, code) => {
    await mkdir(join(root, 'consoles', 'views'), { recursive: true })
    await writeFile(join(root, 'consoles', 'views', slug + '.js'), code, 'utf-8')
  }
  const untouched = async () => {
    assert.equal(existsSync(domainFile()), false, 'no domain file')
    assert.equal(existsSync(join(root, 'artifacts')), false, 'no artifacts directory')
  }
  const viewOutputs = async (id) => {
    const dir = join(root, 'artifacts', `${id}_view`)
    return existsSync(dir) ? (await readdir(dir)).map((n) => join(dir, n)) : []
  }
  const boot = async (html, hash = '') => {
    const dom = new JSDOM(html, {
      url: 'http://localhost/' + hash,
      runScripts: 'dangerously',
      beforeParse(w) {
        w.matchMedia = () => ({
          matches: false,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent: () => false,
        })
      },
    })
    await new Promise((ok) => dom.window.addEventListener('load', ok))
    return dom
  }
  const modelOf = (dom) => JSON.parse(dom.window.document.getElementById('innfo-model').textContent)

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'nn-view-'))
    await mkdir(join(root, 'models'), { recursive: true })
    await writeFile(join(root, 'models', 'view_V_1-0-0_NN.md'), MODEL, 'utf-8')
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  describe('size budget', () => {
    const padded = (bytes) => editableView('Pad') + '/*' + 'x'.repeat(bytes) + '*/\n'

    it('prints the breakdown on every export', async () => {
      const res = await runCli([root, '--domain'])
      assert.equal(res.code, 0, res.stderr)
      assert.match(res.stdout, /size: total \d+ B \(bundle \d+ B, models \d+ B, views \d+ B\)/)
      assert.doesNotMatch(res.stderr, /larger than/)
    })

    it('warns on stderr above 5 MB, still writes, and exits 0', async () => {
      await addView('pad', padded(6_000_000))
      const res = await runCli([root, '--domain'])
      assert.equal(res.code, 0, res.stderr)
      assert.match(res.stderr, /WARNING: \[export-console\] console is larger than 5000000 B; size: total \d+ B/)
      assert.match(res.stderr, /views 6\d{6} B/)
      assert.equal(existsSync(domainFile()), true)
    })

    it('fails above 15 MB with the breakdown and writes nothing', async () => {
      await addView('pad', padded(16_000_000))
      const res = await runCli([root, '--domain'])
      assert.notEqual(res.code, 0)
      assert.match(
        res.stderr,
        /console is larger than 15000000 B; size: total \d+ B \(bundle \d+ B, models \d+ B, views 16\d{6} B\)/,
      )
      await untouched()
    })

    it('applies to --view as well', async () => {
      await addView('pad', padded(16_000_000))
      const res = await runCli([root, '--view', 'pad'])
      assert.notEqual(res.code, 0)
      assert.match(res.stderr, /larger than 15000000 B/)
      await untouched()
    })
  })

  describe('--view <id>', () => {
    it('fails on an unknown id, lists the available ids and writes nothing', async () => {
      await addView('alpha', editableView('Alpha'))
      await addView('beta', editableView('Beta'))
      const res = await runCli([root, '--view', 'nope'])
      assert.notEqual(res.code, 0)
      assert.match(res.stderr, /unknown view "nope"/)
      assert.match(res.stderr, /available views: alpha, beta/)
      await untouched()
    })

    it('says so when there are no views at all', async () => {
      const res = await runCli([root, '--view', 'nope'])
      assert.notEqual(res.code, 0)
      assert.match(res.stderr, /available views: \(none\)/)
      await untouched()
    })

    it('refuses --view together with --domain', async () => {
      await addView('alpha', editableView('Alpha'))
      const res = await runCli([root, '--view', 'alpha', '--domain'])
      assert.notEqual(res.code, 0)
      assert.match(res.stderr, /--view and --domain/)
      await untouched()
    })

    it('combines --view with a model selection into one scoped view console', async () => {
      await addView('alpha', editableView('Alpha'))
      const res = await runCli([root, '--view', 'alpha', 'view_V_1-0-0'])
      assert.equal(res.code, 0, res.stdout + res.stderr)
      const dir = join(root, 'artifacts', 'alpha-view_V_1-0-0_view')
      assert.equal(existsSync(dir), true)
      const members = (await readdir(dir)).map((n) => join(dir, n))
      assert.equal(members.length, 1)
      const model = JSON.parse(
        (await readFile(members[0], 'utf-8')).match(/id="innfo-model">([\s\S]*?)<\/script>/)[1],
      )
      assert.equal(model.meta.consoleScope.view, 'alpha')
      assert.equal(model.meta.consoleScope.models.length, 1)
      assert.ok(model.meta.consoleScope.label)
      assert.equal(model.meta.models.length, 1)
    })

    it('exits 2 when --domain is combined with a model selection', async () => {
      await addView('alpha', editableView('Alpha'))
      for (const extra of [['--all'], ['--filter', 'view'], ['--stale'], ['view_V_1-0-0']]) {
        const res = await runCli([root, '--domain', ...extra])
        assert.equal(res.code, 2, res.stdout + res.stderr)
        await untouched()
      }
    })

    it('exits 2 with a clear message when --view has no value', async () => {
      await addView('alpha', editableView('Alpha'))
      for (const argv of [[root, '--view'], [root, '--view', '--all']]) {
        const res = await runCli(argv)
        assert.equal(res.code, 2, res.stdout + res.stderr)
        assert.match(res.stderr, /--view needs a view id/)
        await untouched()
      }
    })

    it('reports a deduplicated write as unchanged, not as written', async () => {
      await addView('alpha', editableView('Alpha'))
      // Freeze the generated stamp so two runs produce identical bytes.
      const preload = join(root, 'freeze-date.mjs')
      await writeFile(preload, 'Date.prototype.toISOString = () => "2026-01-01T00:00:00.000Z"\n', 'utf-8')
      const env = { NODE_OPTIONS: `--import=${pathToFileURL(preload).href}` }
      const first = await runCli([root, '--view', 'alpha'], env)
      assert.equal(first.code, 0, first.stderr)
      assert.match(first.stdout, /Exported 1 console artifact\(s\)\./)
      const second = await runCli([root, '--view', 'alpha'], env)
      assert.equal(second.code, 0, second.stderr)
      assert.match(second.stdout, /= alpha_view_\S+\.html unchanged/)
      assert.doesNotMatch(second.stdout, /✔ alpha_view/)
      assert.match(second.stdout, /Exported 0 console artifact\(s\) \(1 unchanged\)\./)
      assert.equal((await viewOutputs('alpha')).length, 1)
    })

    it('writes one file under artifacts/<id>_view/ with the bundle once, one view and a one-line header', async () => {
      await addView('alpha', editableView('Alpha'))
      await addView('beta', editableView('Beta'))
      const res = await runCli([root, '--view', 'alpha'])
      assert.equal(res.code, 0, res.stderr)
      assert.match(res.stdout, /size: total \d+ B/)
      const outputs = await viewOutputs('alpha')
      assert.equal(outputs.length, 1)
      assert.match(basename(outputs[0]), /^alpha_view_.+\.html$/)
      assert.equal(existsSync(domainFile()), false, 'no domain file')
      assert.deepEqual((await readdir(join(root, 'artifacts'))).sort(), ['alpha_view'], 'no per-model console')
      const html = await readFile(outputs[0], 'utf-8')
      assert.equal(html.match(/data-innfo-view="/g).length, 1)
      assert.ok(html.includes('data-innfo-view="alpha"'))
      assert.equal(html.includes('Beta'), false, 'the other view is not embedded')
      assert.equal(html.match(/innfo-console\.bundle\.js — single-file console runtime/g).length, 1)
      const header = html.match(/<!-- innfo-views[\s\S]*?-->/)[0]
      assert.equal(header.split('\n').filter((l) => /sha256:/.test(l)).length, 1)
      assert.match(header, /^alpha domaiNN domaiNN:consoles\/views\/alpha\.js sha256:[0-9a-f]{12}$/m)
      assert.doesNotMatch(header, /beta/)
    })

    it('mounts only that view, scopes the draft key, and names the changeset after the view', async () => {
      await addView('alpha', editableView('Alpha'))
      await addView('beta', editableView('Beta'))
      assert.equal((await runCli([root, '--view', 'beta'])).code, 0)
      assert.equal((await runCli([root, '--domain'])).code, 0)

      const scoped = await boot(await readFile((await viewOutputs('beta'))[0], 'utf-8'))
      const doc = scoped.window.document
      const tabs = [...doc.querySelectorAll('#innfo-view-tabs [data-tab]')].map((b) => b.dataset.tab)
      assert.deepEqual(tabs, ['beta', 'review'], 'no built-in tab, only the scoped view')
      assert.equal(doc.getElementById('innfo-tab-explorer')?.classList.contains('active') ?? false, false)
      assert.match(doc.getElementById('innfo-tab-beta').textContent, /Beta mounted/)
      assert.equal(doc.getElementById('innfo-view-errors'), null)
      assert.deepEqual(modelOf(scoped).meta.consoleScope, { view: 'beta' })

      const ctx = scoped.window.__ctx
      ctx.store.propose({ kind: 'comment', elementId: modelOf(scoped).elements[0].id, comment: 'scoped note' })
      const scopedKeys = Object.keys(scoped.window.localStorage)
      assert.equal(scopedKeys.length, 1)
      // The store key is the stable domain id (root name + short root-path hash) plus the scope.
      assert.match(scopedKeys[0], new RegExp(`:${basename(root)}-[0-9a-f]{8}::view:beta$`), scopedKeys[0])

      const composed = ctx.changeset.compose('tester')
      assert.equal(composed.ok, true, String(composed.errors))
      assert.match(composed.changesetFilename, new RegExp(`^${basename(root).toLowerCase()}-beta_tester_.+_changes_NN\\.md$`))
      assert.ok(composed.changesetText.includes(`title: "${basename(root)} Domain - Beta"`), composed.changesetText)
      assert.match(composed.changesetText, /scoped note/)

      // The domain console of the same workspace keeps the unscoped key. It
      // opens on the model explorer, so activate the view tab to mount it.
      const domain = await boot(await readFile(domainFile(), 'utf-8'))
      assert.equal(modelOf(domain).meta.consoleScope, undefined)
      domain.window.document.querySelector('#innfo-view-tabs [data-tab="beta"]').click()
      domain.window.__ctx.store.propose({ kind: 'comment', elementId: modelOf(domain).elements[0].id, comment: 'domain note' })
      const domainKeys = Object.keys(domain.window.localStorage)
      assert.equal(domainKeys.length, 1)
      assert.equal(domainKeys[0], scopedKeys[0].replace('::view:beta', ''), 'the domain key is the unscoped one')
    })
  })

  describe('scoped runtime hides explorer-only UI', () => {
    const EXPLORER_ONLY = ['#innfo-rail', '.innfo-toolbar', '#innfo-search']

    it('renders no toolbar, rail or stats bar, and search-related entry points are inert', async () => {
      await addView('beta', editableView('Beta'))
      assert.equal((await runCli([root, '--view', 'beta'])).code, 0)
      const html = await readFile((await viewOutputs('beta'))[0], 'utf-8')
      const scoped = await boot(html, '#q=Enterprise')
      const doc = scoped.window.document
      for (const sel of EXPLORER_ONLY) assert.equal(doc.querySelector(sel), null, sel)

      // A search query in the URL never moves a scoped console to the hidden explorer.
      const active = [...doc.querySelectorAll('.innfo-view-tab.active')].map((b) => b.dataset.tab)
      assert.deepEqual(active, ['beta'])
      scoped.window.location.hash = '#q=Other'
      scoped.window.dispatchEvent(new scoped.window.Event('hashchange'))
      assert.deepEqual([...doc.querySelectorAll('.innfo-view-tab.active')].map((b) => b.dataset.tab), ['beta'])

      // Focusing an element card has nothing to focus in a scoped console.
      const id = modelOf(scoped).elements[0].id
      assert.doesNotThrow(() => scoped.window.InnfoConsole.focusElementCard(doc, id))
      assert.equal(doc.querySelector('.innfo-highlight'), null)
      assert.deepEqual([...doc.querySelectorAll('.innfo-view-tab.active')].map((b) => b.dataset.tab), ['beta'])
    })

    it('keeps the export feedback and the changeset working', async () => {
      await addView('beta', editableView('Beta'))
      assert.equal((await runCli([root, '--view', 'beta'])).code, 0)
      const scoped = await boot(await readFile((await viewOutputs('beta'))[0], 'utf-8'))
      const doc = scoped.window.document
      scoped.window.__ctx.store.propose({ kind: 'comment', elementId: modelOf(scoped).elements[0].id, comment: 'keep me' })
      doc.getElementById('innfo-feedback-open').click()
      assert.match(doc.querySelector('#innfo-feedback-modal [data-innfo="instructions"]').textContent, /Review 1 pending/)
      assert.match(doc.querySelector('.innfo-banner-drafts').textContent, /drafts: 1/)
      assert.equal(scoped.window.__ctx.changeset.compose('tester').ok, true)
    })

    it('leaves the unscoped domain console unchanged', async () => {
      await addView('beta', editableView('Beta'))
      assert.equal((await runCli([root, '--domain'])).code, 0)
      const domain = await boot(await readFile(domainFile(), 'utf-8'), '#q=Enterprise')
      const doc = domain.window.document
      for (const sel of EXPLORER_ONLY) assert.ok(doc.querySelector(sel), sel)
      assert.equal(doc.querySelector('#innfo-view-tabs [data-tab="explorer"]').classList.contains('active'), true)
      const id = modelOf(domain).elements[0].id
      domain.window.InnfoConsole.focusElementCard(doc, id)
      assert.ok(doc.querySelector('.innfo-highlight'), 'the explorer card is highlighted')
    })
  })

  describe('draft isolation between views', () => {
    // Each view stashes its ctx per mount so the test can drive several consoles in one window.
    const proposingView = (title) => `registerView({
  title: '${title}', icon: 'layout', order: 1, kind: 'editable',
  mount(ctx) {
    ctx.container.textContent = '${title} mounted'
    ;(window.__ctxs = window.__ctxs || []).push({ title: '${title}', ctx })
  },
})
`
    const storedDrafts = (win, key) => JSON.parse(win.localStorage.getItem(key)).drafts

    it('puts two views of one domain console in the same changeset and keeps scoped consoles apart', async () => {
      await addView('alpha', proposingView('Alpha'))
      await addView('beta', proposingView('Beta'))
      for (const argv of [['--domain'], ['--view', 'alpha'], ['--view', 'beta']]) {
        assert.equal((await runCli([root, ...argv])).code, 0)
      }
      const domain = await boot(await readFile(domainFile(), 'utf-8'))
      const win = domain.window
      const elementId = modelOf(domain).elements[0].id
      for (const id of ['alpha', 'beta']) win.document.querySelector(`#innfo-view-tabs [data-tab="${id}"]`).click()
      const byTitle = (title) => win.__ctxs.filter((c) => c.title === title).pop().ctx

      // Two views, one console: both drafts land in the same store and the same changeset.
      byTitle('Alpha').store.propose({ kind: 'comment', elementId, comment: 'from alpha view' })
      byTitle('Beta').store.propose({ kind: 'comment', elementId, comment: 'from beta view' })
      const [domainKey, ...others] = Object.keys(win.localStorage)
      assert.deepEqual(others, [])
      assert.equal(storedDrafts(win, domainKey).length, 2)
      const composed = byTitle('Alpha').changeset.compose('tester')
      assert.equal(composed.ok, true, String(composed.errors))
      assert.match(composed.changesetText, /from alpha view/)
      assert.match(composed.changesetText, /from beta view/)

      // Scoped consoles booted in the same window, over the same real localStorage.
      const scopedDoc = async (id) => {
        const html = await readFile((await viewOutputs(id))[0], 'utf-8')
        const doc = new win.DOMParser().parseFromString(html, 'text/html')
        assert.equal(win.InnfoConsole.boot(doc).ok, true)
        doc.querySelector(`#innfo-view-tabs [data-tab="${id}"]`).click()
        return win.__ctxs.filter((c) => c.ctx.container.ownerDocument === doc).pop().ctx
      }
      const alphaCtx = await scopedDoc('alpha')
      alphaCtx.store.propose({ kind: 'comment', elementId, comment: 'scoped alpha only' })
      const betaCtx = await scopedDoc('beta')
      betaCtx.store.propose({ kind: 'comment', elementId, comment: 'scoped beta only' })

      const keys = Object.keys(win.localStorage)
      assert.equal(keys.length, 3)
      const alphaKey = keys.find((k) => k.endsWith('::view:alpha'))
      const betaKey = keys.find((k) => k.endsWith('::view:beta'))
      assert.ok(alphaKey && betaKey && alphaKey !== betaKey)
      assert.deepEqual(storedDrafts(win, alphaKey).map((d) => d.comment), ['scoped alpha only'])
      assert.deepEqual(storedDrafts(win, betaKey).map((d) => d.comment), ['scoped beta only'])
      assert.equal(storedDrafts(win, domainKey).length, 2, 'the domain drafts are untouched')
      assert.equal(alphaCtx.changeset.count(), 1)
      assert.equal(betaCtx.changeset.count(), 1)
    })
  })
})
