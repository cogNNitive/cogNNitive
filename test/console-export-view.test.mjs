import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { JSDOM } from 'jsdom'

const execFileAsync = promisify(execFile)
const here = dirname(fileURLToPath(import.meta.url))
const scriptPath = resolve(here, '..', 'scripts', 'export-console.mjs')

async function runCli(args) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath, ...args], {
      maxBuffer: 64 * 1024 * 1024,
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
  const boot = async (html) => {
    const dom = new JSDOM(html, {
      url: 'http://localhost',
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
      assert.ok(scopedKeys[0].endsWith(`${basename(root)}::view:beta`), scopedKeys[0])

      const composed = ctx.changeset.compose('tester')
      assert.equal(composed.ok, true, String(composed.errors))
      assert.match(composed.changesetFilename, new RegExp(`^${basename(root).toLowerCase()}-beta_tester_.+_changes_NN\\.md$`))
      assert.ok(composed.changesetText.includes(`title: "${basename(root)} Domain - Beta"`), composed.changesetText)
      assert.match(composed.changesetText, /scoped note/)

      // The domain console of the same workspace keeps the unscoped key.
      const domain = await boot(await readFile(domainFile(), 'utf-8'))
      assert.equal(modelOf(domain).meta.consoleScope, undefined)
      domain.window.__ctx.store.propose({ kind: 'comment', elementId: modelOf(domain).elements[0].id, comment: 'domain note' })
      const domainKeys = Object.keys(domain.window.localStorage)
      assert.equal(domainKeys.length, 1)
      assert.equal(domainKeys[0], scopedKeys[0].replace('::view:beta', ''), 'the domain key is the unscoped one')
    })
  })
})
