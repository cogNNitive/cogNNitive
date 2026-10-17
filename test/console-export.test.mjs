import { describe, it, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { consoleHtml, consoleBundle, consoleMembers } from './helpers/console-artifacts.mjs'
import { JSDOM } from 'jsdom'

const execFileAsync = promisify(execFile)
const here = dirname(fileURLToPath(import.meta.url))
const scriptPath = resolve(here, '..', 'scripts', 'export-console.mjs')

async function runCli(args, opts = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath, ...args, '--no-open'], {
      cwd: opts.cwd || process.cwd(),
      env: { ...process.env, ...opts.env },
    })
    return { code: 0, stdout, stderr }
  } catch (err) {
    return {
      code: err.code ?? (err.status || 1),
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
    }
  }
}

describe('Console Offline Contract & CLI Standalone Export', () => {
  let tempDir

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'nn-offline-test-'))
    await mkdir(join(tempDir, 'models'), { recursive: true })

    const modelContent = `---
title: "Offline Business Model"
model_version: "V_1-0-0"
level: 3
---

# NN Stakeholders
## NN Stakeholders: Enterprise
  slug:: enterprise
  budget:: "$100k"
  tagline:: "Mission critical"

  Leading enterprise tier offering.

# NN RevenueStream
## NN RevenueStream: Subscription
  slug:: subscription
  pricing:: "$50k/yr"

  Annual recurring subscription stream.
`
    await writeFile(join(tempDir, 'models', 'business_V_1-0-0_NN.md'), modelContent, 'utf-8')
  })

  afterEach(async () => {
    if (tempDir && existsSync(tempDir)) {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  it('exports a standalone single-file console with the bundle, CSS, slots and views inlined', async () => {
    const res = await runCli([tempDir, '--all'])
    assert.equal(res.code, 0)

    const htmlPath = consoleHtml(tempDir, 'business_V_1-0-0')
    assert.equal(existsSync(htmlPath), true, 'HTML artifact was generated')
    assert.equal(existsSync(consoleBundle(tempDir, 'business_V_1-0-0')), false, 'no sibling bundle')

    const htmlContent = await readFile(htmlPath, 'utf-8')
    assert.equal(/<script[^>]*\ssrc=/.test(htmlContent), false, 'self-contained: no external script')
    assert.ok(htmlContent.includes('single-file console runtime'), 'bundle inlined')
    assert.match(htmlContent, /<style>[\s\S]*--innfo-bg[\s\S]*<\/style>/, 'css inlined')
    assert.match(htmlContent, /<script type="application\/json" id="innfo-config">/)
    assert.match(htmlContent, /<script type="application\/json" id="innfo-schema">/)
    assert.match(htmlContent, /<script type="application\/json" id="innfo-model">/)
    assert.match(htmlContent, /id="innfo-tab-review"/)
  })

  it('hydrates Level 1 primitives and Review tab offline in JSDOM without remote network requests', async () => {
    await runCli([tempDir, '--all'])

    const htmlPath = consoleHtml(tempDir, 'business_V_1-0-0')
    const html = await readFile(htmlPath, 'utf-8')
    const bundleJs = await readFile(
      resolve(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console', 'innfo-console.bundle.js'),
      'utf-8',
    )

    // Hydrate in isolated JSDOM simulating offline file:// load
    const dom = new JSDOM(html, {
      url: 'http://localhost',
      runScripts: 'outside-only',
    })

    // Execute vendored bundle directly in DOM window
    const mm = () => ({
      matches: false,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })
    dom.window.matchMedia = mm
    dom.window.eval('var matchMedia = window.matchMedia;' + bundleJs)

    const doc = dom.window.document
    dom.window.InnfoConsole.boot(doc)

    // Verify the navbar identity (single model -> the model title) and reviewer chip
    const titleEl = doc.getElementById('innfo-domain-title')
    assert.ok(titleEl, 'navbar identity title rendered')
    assert.equal(titleEl.textContent, 'Offline Business Model')
    const banner = doc.getElementById('innfo-feedback-banner') || doc.getElementById('innfo-banner')
    assert.ok(banner)
    const reviewerChip = banner.querySelector('.innfo-reviewer-chip')
    assert.ok(reviewerChip, 'Reviewer profile chip rendered in banner')
    assert.match(reviewerChip.textContent, /Reviewer/)

    // Verify concept rail
    const rail = doc.getElementById('innfo-rail')
    assert.ok(rail)
    const railItems = rail.querySelectorAll('.innfo-rail-item')
    assert.ok(railItems.length >= 2, 'Concept rail rendered concept items')

    // Verify element cards
    const content = doc.getElementById('innfo-content')
    assert.ok(content)
    const cards = content.querySelectorAll('.innfo-card')
    assert.ok(cards.length >= 2, 'Element cards rendered')

    // Verify tabs navigation
    const tabsNav = doc.getElementById('innfo-view-tabs')
    assert.ok(tabsNav)
    const reviewTabBtn = tabsNav.querySelector('[data-tab="review"]')
    assert.equal(reviewTabBtn, null, 'Review is reached from the floating review dock, not the tab strip')
  })

  it('contains no fallbackBuildPayload symbol in export-console.mjs source', async () => {
    const src = await readFile(scriptPath, 'utf-8')
    assert.equal(src.includes('fallbackBuildPayload'), false, 'fallbackBuildPayload must be completely removed')
  })

  it('escapes < character in slot output without literal <', async () => {
    // Write a model with <script> or <tag> in field/content
    const xssModel = `---
title: "XSS Test Model"
model_version: "V_1-0-0"
level: 3
---

# NN Note
## NN Note: Security
  slug:: security
  note:: "</script><script>alert('xss')</script>"

  Dangerous note with <div>HTML content</div>.
`
    await writeFile(join(tempDir, 'models', 'xss_V_1-0-0_NN.md'), xssModel, 'utf-8')
    const res = await runCli([tempDir, 'xss_V_1-0-0'])
    assert.equal(res.code, 0)

    const htmlPath = consoleHtml(tempDir, 'xss_V_1-0-0')
    const htmlContent = await readFile(htmlPath, 'utf-8')

    // Inside the script tag for innfo-model, there must be no literal </script> or <script> or <div>
    const modelScriptMatch = htmlContent.match(/<script type="application\/json" id="innfo-model">([\s\S]*?)<\/script>/)
    assert.ok(modelScriptMatch)
    const slotBody = modelScriptMatch[1]
    assert.equal(slotBody.includes('<script>'), false)
    assert.equal(slotBody.includes('</script>'), false)
    assert.equal(slotBody.includes('<div>'), false)
    assert.ok(slotBody.includes('\\u003c/script>'))
  })

  it('ignores any feedback-ledger.jsonl: a domain with one exports the same bytes', async () => {
    const stripStamp = (html) => html.replace(/"generated": "[^"]*"/g, '"generated": "<stamp>"')

    // Baseline export, no ledger anywhere.
    assert.equal((await runCli([tempDir, '--all'])).code, 0)
    const baseline = stripStamp(await readFile(consoleHtml(tempDir, 'business_V_1-0-0'), 'utf-8'))

    // A root ledger and a legacy-path decoy must change nothing.
    await writeFile(
      join(tempDir, 'feedback-ledger.jsonl'),
      JSON.stringify({
        v: 1,
        at: '2026-10-01T10:00:00Z',
        source: { kind: 'console-json', path: 'sources/import/feedback/f1.json', sha256: 'abc1' },
        item: 'fb-001',
        model_id: 'models/business_V_1-0-0_NN.md',
        element_id: 'stakeholders-enterprise',
        status: 'applied',
        by: 'lead',
      }) + '\n',
      'utf-8',
    )
    const legacyLedgerDir = join(tempDir, 'sources', 'import', 'feedback')
    await mkdir(legacyLedgerDir, { recursive: true })
    await writeFile(
      join(legacyLedgerDir, 'ledger.jsonl'),
      JSON.stringify({ v: 1, item: 'fb-999-decoy', status: 'rejected', by: 'decoy' }) + '\n',
      'utf-8',
    )

    assert.equal((await runCli([tempDir, '--all'])).code, 0)
    const withLedger = stripStamp(await readFile(consoleHtml(tempDir, 'business_V_1-0-0'), 'utf-8'))
    assert.equal(withLedger, baseline, 'a feedback-ledger.jsonl changes nothing')
    assert.equal(withLedger.includes('feedbackState'), false, 'no feedbackState is emitted')
    assert.equal(withLedger.includes('fb-001'), false, 'no ledger entry reaches the payload')
  })

  it('resolves citations to el.citations.sources map', async () => {
    // Write a source file
    const sourcesDir = join(tempDir, 'sources')
    await mkdir(sourcesDir, { recursive: true })
    await writeFile(join(sourcesDir, 'brief.md'), '# Project Brief\n\n## Overview\nEnterprise context\n', 'utf8')

    const citedModel = `---
title: "Cited Model"
model_version: "V_1-0-0"
level: 3
---

# NN Concept
## NN Concept: Enterprise Plan
  slug:: enterprise-plan
  sources:: "sources/brief.md#overview"

  Enterprise plan details.
`
    await writeFile(join(tempDir, 'models', 'cited_V_1-0-0_NN.md'), citedModel, 'utf-8')

    const res = await runCli([tempDir, 'cited_V_1-0-0'])
    assert.equal(res.code, 0)

    const htmlPath = consoleHtml(tempDir, 'cited_V_1-0-0')
    const htmlContent = await readFile(htmlPath, 'utf-8')
    assert.ok(htmlContent.includes('citationsResolvedAt'))
    assert.ok(htmlContent.includes('sources/brief.md'))
  })

  it('fails loudly when mirror is missing in custom INNFO_CONSOLE_DIR', async () => {
    const emptyConsoleDir = await mkdtemp(join(tmpdir(), 'empty-console-dir-'))
    try {
      // Put only shell in emptyConsoleDir (no mirror)
      await writeFile(join(emptyConsoleDir, 'artifact_shell.html'), '<html></html>', 'utf-8')

      const res = await runCli([tempDir, '--all'], {
        env: { INNFO_CONSOLE_DIR: emptyConsoleDir },
      })
      assert.notEqual(res.code, 0, 'CLI should exit with non-zero when mirror missing')
      assert.ok(res.stderr.includes('console-payload.generated.cjs') || res.stdout.includes('console-payload.generated.cjs'))
    } finally {
      await rm(emptyConsoleDir, { recursive: true, force: true })
    }
  })

  it('succeeds in standalone environment with only shell, bundle, and mirror (R-EXP-02)', async () => {
    const standaloneDir = await mkdtemp(join(tmpdir(), 'standalone-console-dir-'))
    try {
      const repoConsoleDir = resolve(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console')
      const shellContent = await readFile(join(repoConsoleDir, 'artifact_shell.html'), 'utf-8')
      const bundleContent = await readFile(join(repoConsoleDir, 'innfo-console.bundle.js'), 'utf-8')
      const mirrorContent = await readFile(join(repoConsoleDir, 'console-payload.generated.cjs'), 'utf-8')
      const cssContent = await readFile(join(repoConsoleDir, 'innfo-ui.css'), 'utf-8')

      await writeFile(join(standaloneDir, 'artifact_shell.html'), shellContent, 'utf-8')
      await writeFile(join(standaloneDir, 'innfo-console.bundle.js'), bundleContent, 'utf-8')
      await writeFile(join(standaloneDir, 'console-payload.generated.cjs'), mirrorContent, 'utf-8')
      await writeFile(join(standaloneDir, 'innfo-ui.css'), cssContent, 'utf-8')

      const res = await runCli([tempDir, '--all'], {
        env: { INNFO_CONSOLE_DIR: standaloneDir },
      })
      assert.equal(res.code, 0, `Standalone export should exit with 0. stderr: ${res.stderr}`)

      const htmlPath = consoleHtml(tempDir, 'business_V_1-0-0')
      assert.equal(existsSync(htmlPath), true, 'Artifact produced in standalone mode')
    } finally {
      await rm(standaloneDir, { recursive: true, force: true })
    }
  })

  it('never lists a seeded sidecar, staging file, or lineage record as a model', async () => {
    const doc = (parent) => `---\ntitle: "X"\nlevel: 3\nparent_spec:\n  name: "${parent}"\n---\n\n# NN Item\n`
    await mkdir(join(tempDir, 'sources', 'import'), { recursive: true })
    await mkdir(join(tempDir, 'staging'), { recursive: true })
    await writeFile(join(tempDir, 'sources', 'import', 'report.pdf_sidecar_NN.md'), doc('sidecar'), 'utf-8')
    await writeFile(join(tempDir, 'sources', 'import', 'prices.csv_sidecar_NN.md'), doc('business_V_0-2-0'), 'utf-8')
    await writeFile(join(tempDir, 'staging', 'Draft_business_NN.md'), doc('business_V_0-2-0'), 'utf-8')
    await writeFile(join(tempDir, 'Acme_cogNNitive_NN.md'), doc('cogNNitive'), 'utf-8')

    const res = await runCli([tempDir, '--list'])
    assert.equal(res.code, 0)
    assert.match(res.stdout, /models\/business_V_1-0-0_NN\.md/)
    assert.doesNotMatch(res.stdout, /sidecar/)
    assert.doesNotMatch(res.stdout, /staging/)
    assert.doesNotMatch(res.stdout, /cogNNitive/)
    assert.match(res.stdout, /\(1 models\)/)
  })

  it('prints stderr WARNING when parent_spec is not found at Tier 1', async () => {
    const modelWithParentSpec = `---
title: "Parent Spec Test Model"
model_version: "V_1-0-0"
parent_spec:
  name: "missing_blueprint_V_0-1-0"
level: 3
---

# NN Item
## NN Item: Example
  slug:: example
  name:: "Example"
`
    await writeFile(join(tempDir, 'models', 'parent_test_V_1-0-0_NN.md'), modelWithParentSpec, 'utf-8')
    const res = await runCli([tempDir, '--all'])
    assert.equal(res.code, 0)
    assert.ok(res.stderr.includes('WARNING: [export-console] Schema resolution for parent_spec'))
    assert.ok(res.stderr.includes('missing_blueprint_V_0-1-0'))
  })

  it('exports Master Domain Console domaiNN_console.html at workspace root with --domain (D14)', async () => {
    const res = await runCli([tempDir, '--domain'])
    assert.equal(res.code, 0)
    assert.match(res.stdout, /domaiNN_console\.html/)

    const domainPath = join(tempDir, 'domaiNN_console.html')
    const content = await readFile(domainPath, 'utf-8')
    assert.ok(content.includes('id="innfo-model"'))
    assert.ok(content.includes('Domain'))
  })

  describe('--domain single-file console with views (S2c1)', () => {
    const PIPELINE = `registerView({
  title: 'Pipeline', icon: 'layout', order: 1, kind: 'readonly',
  mount(ctx) { ctx.container.textContent = 'pipeline mounted with ' + ctx.payload.model.elements.length + ' elements' },
})
`
    const METRICS_MODEL =
      '---\ntitle: "M"\nlevel: 3\nparent_spec:\n  name: "metrics_V_0-4-1"\n---\n\n# NN Item\n## NN Item: A\n  slug:: a\n  name:: "A"\n'
    const domainFile = () => join(tempDir, 'domaiNN_console.html')
    const addView = async (slug, code = PIPELINE, dir = join(tempDir, 'consoles', 'views')) => {
      await mkdir(dir, { recursive: true })
      await writeFile(join(dir, slug + '.js'), code, 'utf-8')
    }
    const metricsViews = () => join(tempDir, 'specs', 'bluepriNNts', 'metrics', 'assets')
    const rootFiles = async () =>
      (await readdir(tempDir, { withFileTypes: true })).filter((e) => e.isFile()).map((e) => e.name)
    const banner = async () => {
      const bundle = await readFile(
        resolve(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console', 'innfo-console.bundle.js'),
        'utf-8',
      )
      return bundle.match(/innfo-console\.bundle\.js — single-file console runtime/)[0]
    }
    const stripStamp = (html) => html.replace(/"generated": "[^"]*"/g, '"generated": "<stamp>"')

    it('writes exactly one root file, overwrites it, and leaves old root bundle files alone', async () => {
      await writeFile(join(tempDir, 'innfo-console.bundle.js'), '// old sibling', 'utf-8')
      await writeFile(join(tempDir, 'innfo-ui.css'), '/* old css */', 'utf-8')
      assert.equal((await runCli([tempDir, '--domain'])).code, 0)
      const second = await runCli([tempDir, '--domain'])
      assert.equal(second.code, 0)
      assert.equal(second.stderr.match(/leftover from an earlier export/g)?.length, 1, 'warned once')
      assert.match(second.stderr, /innfo-console\.bundle\.js and innfo-ui\.css/)
      assert.match(second.stderr, /not removed/)
      assert.deepEqual((await rootFiles()).sort(), ['domaiNN_console.html', 'innfo-console.bundle.js', 'innfo-ui.css'])
      assert.equal(await readFile(join(tempDir, 'innfo-console.bundle.js'), 'utf-8'), '// old sibling')
      assert.equal(await readFile(join(tempDir, 'innfo-ui.css'), 'utf-8'), '/* old css */')
    })

    it('creates no sibling files on a fresh domain', async () => {
      assert.equal((await runCli([tempDir, '--domain'])).code, 0)
      assert.deepEqual(await rootFiles(), ['domaiNN_console.html'])
    })

    it('does not warn about leftovers when there are none', async () => {
      const res = await runCli([tempDir, '--domain'])
      assert.equal(res.code, 0)
      assert.doesNotMatch(res.stderr, /leftover/)
    })

    it('inlines the bundle once, with no external script or stylesheet tags', async () => {
      assert.equal((await runCli([tempDir, '--domain'])).code, 0)
      const html = await readFile(domainFile(), 'utf-8')
      assert.equal(/<script[^>]*\ssrc=/.test(html), false, 'no script src')
      assert.equal(/<link[^>]*stylesheet/.test(html), false, 'no stylesheet link')
      assert.equal(html.split(await banner()).length - 1, 1, 'one bundle copy')
      assert.match(html, /<style>[\s\S]*--innfo-bg[\s\S]*<\/style>/, 'css inlined')
    })

    it('lists every view in the header and tags its script', async () => {
      await addView('pipeline')
      await addView('console-view-timeline', PIPELINE.replace('Pipeline', 'Timeline'), metricsViews())
      await writeFile(join(tempDir, 'models', 'm_V_1-0-0_NN.md'), METRICS_MODEL, 'utf-8')
      const res = await runCli([tempDir, '--domain'])
      assert.equal(res.code, 0, res.stderr)
      const html = await readFile(domainFile(), 'utf-8')
      const header = html.match(/<!-- innfo-views[\s\S]*?-->/)[0]
      assert.match(header, /^pipeline domaiNN domaiNN:consoles\/views\/pipeline\.js sha256:[0-9a-f]{12}$/m)
      assert.match(
        header,
        /^timeline bluepriNNt bluepriNNt:metrics\/assets\/console-view-timeline\.js sha256:[0-9a-f]{12}$/m,
      )
      assert.ok(html.includes('data-innfo-view="pipeline" data-innfo-view-source="domaiNN:consoles/views/pipeline.js"'))
      assert.ok(html.includes('data-innfo-view="timeline"'))
    })

    it('lists the metrics model in meta.models[] without a projection (view-derived)', async () => {
      const metricsModel = `---
title: "M"
level: 3
parent_spec:
  name: "metrics_V_0-4-1"
---

# NN Metrics
## NN Metrics: Revenue
slug:: revenue
metricValue:: <calculated>
metricFormula:: incidents x fee
metricType:: revenue
metricUnit:: USD
evolution:: [[Compound]]

# NN Variables
## NN Variables: Incidents
slug:: incidents
variableValue:: 20
variableType:: count
variableUnit:: incidents

# NN Evolution
## NN Evolution: Compound
slug:: compound
evolutionType:: compound
evolutionFactor:: 5

# NN Scenario
## NN Scenario: Year 1
slug:: year-1
scenarioMonths:: 12
`
      await writeFile(join(tempDir, 'models', 'm_V_1-0-0_NN.md'), metricsModel, 'utf-8')
      assert.equal((await runCli([tempDir, '--domain'])).code, 0)
      const html = await readFile(domainFile(), 'utf-8')
      const slot = JSON.parse(html.match(/<script type="application\/json" id="innfo-model">([\s\S]*?)<\/script>/)[1])
      const summary = slot.meta.models.find((s) => s.blueprint === 'metrics')
      assert.ok(summary, JSON.stringify(slot.meta.models))
      assert.equal(summary.projection, undefined, 'projection is view-derived, not exporter-derived')
      assert.match(summary.sha256, /^[0-9a-f]{64}$/, 'meta.models entry carries the model sha256')
    })

    it('mounts the discovered timeline view as a tab, with no canonical/studio tabs and no global ids', async () => {
      const metricsModel = `---
title: "M"
level: 3
parent_spec:
  name: "metrics_V_0-4-1"
---

# NN Metrics
## NN Metrics: Revenue
slug:: revenue
metricValue:: <calculated>
metricFormula:: incidents x fee
metricType:: revenue
metricUnit:: USD
evolution:: [[Compound]]

# NN Variables
## NN Variables: Incidents
slug:: incidents
variableValue:: 20
variableType:: count
variableUnit:: incidents

# NN Evolution
## NN Evolution: Compound
slug:: compound
evolutionType:: compound
evolutionFactor:: 5

# NN Scenario
## NN Scenario: Year 1
slug:: year-1
scenarioMonths:: 12
`
      await writeFile(join(tempDir, 'models', 'm_V_1-0-0_NN.md'), metricsModel, 'utf-8')
      assert.equal((await runCli([tempDir, '--domain'])).code, 0)
      const dom = new JSDOM(await readFile(domainFile(), 'utf-8'), {
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
      const doc = dom.window.document
      const tabs = [...doc.querySelectorAll('#innfo-view-tabs [data-tab]')].map((b) => b.dataset.tab)
      assert.ok(tabs.includes('timeline'), JSON.stringify(tabs))
      assert.equal(tabs.includes('canonical'), false)
      assert.equal(tabs.includes('studio'), false)
      assert.equal(tabs.includes('review'), false, 'Changes lives in the review dock, not the tab strip')
      doc.querySelector('#innfo-view-tabs [data-tab="timeline"]').click()
      const panel = doc.getElementById('innfo-tab-timeline')
      assert.ok(panel.querySelector('.innfo-timeline-table'), 'timeline grid rendered into its own panel')
      assert.equal(doc.getElementById('innfo-timeline-grid'), null, 'no global timeline host id')
    })

    it('boots under jsdom, registers each view with id == slug and opens the model explorer', async () => {
      await addView('pipeline')
      await addView('other', PIPELINE.replace('order: 1', 'order: 2').replace('Pipeline', 'Other'))
      assert.equal((await runCli([tempDir, '--domain'])).code, 0)
      const dom = new JSDOM(await readFile(domainFile(), 'utf-8'), {
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
      const doc = dom.window.document
      const tabs = [...doc.querySelectorAll('#innfo-view-tabs [data-tab]')].map((b) => b.dataset.tab)
      assert.deepEqual(tabs.slice(0, 2), ['pipeline', 'other'], 'tabs come from the registry, ordered')
      assert.equal(doc.getElementById('innfo-view-errors'), null, 'no registration errors')
      assert.equal(doc.querySelector('#innfo-view-tabs .innfo-view-tab.active').dataset.tab, 'explorer')
      doc.querySelector('#innfo-view-tabs [data-tab="pipeline"]').click()
      assert.match(doc.getElementById('innfo-tab-pipeline').textContent, /pipeline mounted with 2 elements/)
    })

    it('fails before writing when a view is not a classic script', async () => {
      await addView('esm', "import x from './x.js'\n")
      const res = await runCli([tempDir, '--domain'])
      assert.notEqual(res.code, 0)
      assert.match(res.stderr, /domaiNN:consoles\/views\/esm\.js.*ES module syntax/)
      assert.equal(existsSync(domainFile()), false)
      assert.equal(existsSync(join(tempDir, 'artifacts')), false, 'no per-model console is written either')
    })

    it('fails naming both sources when a bluepriNNt and a domaiNN view share an id', async () => {
      await addView('timeline')
      await addView('console-view-timeline', PIPELINE, metricsViews())
      await writeFile(join(tempDir, 'models', 'm_V_1-0-0_NN.md'), METRICS_MODEL, 'utf-8')
      const res = await runCli([tempDir, '--domain'])
      assert.notEqual(res.code, 0)
      assert.match(res.stderr, /duplicate view id "timeline"/)
      assert.ok(res.stderr.includes('bluepriNNt:metrics/assets/console-view-timeline.js'))
      assert.ok(res.stderr.includes('domaiNN:consoles/views/timeline.js'))
      assert.equal(existsSync(domainFile()), false)
    })

    describe('validates everything before the first write', () => {
      const consoleSrc = resolve(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console')
      const ASSETS = ['artifact_shell.html', 'innfo-console.bundle.js', 'console-payload.generated.cjs', 'innfo-ui.css']
      const assetsWith = async (name, { shell = (s) => s, omit = [] } = {}) => {
        const dir = join(tempDir, name)
        await mkdir(dir, { recursive: true })
        for (const file of ASSETS.filter((f) => !omit.includes(f))) {
          const text = await readFile(join(consoleSrc, file), 'utf-8')
          await writeFile(join(dir, file), file === 'artifact_shell.html' ? shell(text) : text, 'utf-8')
        }
        return { INNFO_CONSOLE_DIR: dir }
      }
      const untouched = async () => {
        assert.equal(existsSync(domainFile()), false, 'no domain file')
        assert.equal(existsSync(join(tempDir, 'artifacts')), false, 'no artifacts dir')
      }

      it('rejects a shell without the stylesheet link', async () => {
        const env = await assetsWith('no-css', { shell: (s) => s.replace(/<link rel="stylesheet" href="\.\/innfo-ui\.css" ?\/>/, '') })
        const res = await runCli([tempDir, '--domain'], { env })
        assert.notEqual(res.code, 0)
        assert.match(res.stderr, /stylesheet link/)
        await untouched()
      })

      it('rejects a shell without the viewport meta', async () => {
        const env = await assetsWith('no-meta', { shell: (s) => s.replace(/<meta name="viewport"[^>]*>/, '') })
        const res = await runCli([tempDir, '--domain'], { env })
        assert.notEqual(res.code, 0)
        assert.match(res.stderr, /viewport meta/)
        await untouched()
      })

      it('rejects a shell without the nn:console-shell block', async () => {
        const env = await assetsWith('no-block', { shell: (s) => s.replace('<!-- nn:console-shell:end -->', '') })
        const res = await runCli([tempDir, '--domain'], { env })
        assert.notEqual(res.code, 0)
        assert.match(res.stderr, /bundle script tags/)
        await untouched()
      })

      it('rejects a missing bundle', async () => {
        const env = await assetsWith('no-bundle', { omit: ['innfo-console.bundle.js'] })
        const res = await runCli([tempDir, '--domain'], { env })
        assert.notEqual(res.code, 0)
        await untouched()
      })

      it('rejects a missing stylesheet file', async () => {
        const env = await assetsWith('no-css-file', { omit: ['innfo-ui.css'] })
        const res = await runCli([tempDir, '--domain'], { env })
        assert.notEqual(res.code, 0)
        assert.match(res.stderr, /innfo-ui\.css/)
        await untouched()
      })

      it('rejects a view that cannot be embedded', async () => {
        await addView('bad', 'var script = 3; var r = 1 <script >2\nregisterView({})\n')
        const res = await runCli([tempDir, '--domain'])
        assert.notEqual(res.code, 0)
        assert.match(res.stderr, /cannot be embedded/)
        await untouched()
      })
    })

    it('produces identical bytes for identical input apart from the generated stamp', async () => {
      await addView('pipeline')
      assert.equal((await runCli([tempDir, '--domain'])).code, 0)
      const first = await readFile(domainFile(), 'utf-8')
      assert.equal((await runCli([tempDir, '--domain'])).code, 0)
      const second = await readFile(domainFile(), 'utf-8')
      assert.equal(stripStamp(second), stripStamp(first))
      assert.ok(first.includes('"generated"'), 'the stamp convention is still present')
    })
  })

  describe('Changes collection in the domain payload', () => {
    const domainFile = () => join(tempDir, 'domaiNN_console.html')
    const modelSlot = async () =>
      JSON.parse((await readFile(domainFile(), 'utf-8')).match(/id="innfo-model">([\s\S]*?)<\/script>/)[1])

    const changeset = (status, title) =>
      `---\nspec_version: "V_0-4-0"\nlevel: 3\nparent_spec:\n  name: changes\n  url: "https://example.test/changes/spec_NN.md"\nblueprint_version: "V_0-2-0"\nstatus: ${status}\ntitle: "${title}"\n---\n\n# NN Change\n\n## NN Change: c-01\nop:: comment\ntarget:: Business Model@enterprise&tagline\nnotes:: "note"\nsources:: sources/brief.md@## Overview\nreplaced_sources:: sources/old.md@## Overview\n`

    it('carries every changeset with sources/replaced_sources, and [] with no changes/', async () => {
      // No changes/ directory: the collection is empty.
      assert.equal((await runCli([tempDir, '--domain'])).code, 0)
      assert.deepEqual((await modelSlot()).changes, [])

      await mkdir(join(tempDir, 'changes'), { recursive: true })
      await writeFile(join(tempDir, 'changes', 'a_reviewer_1_changes_NN.md'), changeset('proposed', 'A'), 'utf-8')
      await writeFile(join(tempDir, 'changes', 'b_reviewer_2_changes_NN.md'), changeset('applied', 'B'), 'utf-8')

      assert.equal((await runCli([tempDir, '--domain'])).code, 0)
      const model = await modelSlot()
      assert.equal(model.changes.length, 2)
      const change = model.changes[0].changes[0]
      assert.equal(change.sources, 'sources/brief.md@## Overview')
      assert.equal(change.replaced_sources, 'sources/old.md@## Overview')
      // Never written into a model.
      const modelFile = await readFile(join(tempDir, 'models', 'business_V_1-0-0_NN.md'), 'utf-8')
      assert.doesNotMatch(modelFile, /replaced_sources/)
    })
  })

  describe('D14 remainder: every model, history, source index, embed threshold, size budget', () => {
    const domainFile = () => join(tempDir, 'domaiNN_console.html')
    const modelSlot = async () =>
      JSON.parse((await readFile(domainFile(), 'utf-8')).match(/id="innfo-model">([\s\S]*?)<\/script>/)[1])

    it('embeds every model of the domaiNN in the domain payload', async () => {
      await writeFile(
        join(tempDir, 'models', 'second_V_1-0-0_NN.md'),
        `---\ntitle: "Second Model"\nknowledge_version: "V_1-0-0"\nlevel: 3\n---\n\n# NN Widget\n## NN Widget: Gauge\n  slug:: gauge\n\n  A widget.\n`,
        'utf-8',
      )
      assert.equal((await runCli([tempDir, '--domain'])).code, 0)
      const slot = await modelSlot()
      assert.deepEqual(
        slot.meta.models.map((m) => m.filePath).sort(),
        ['business_V_1-0-0_NN.md', 'second_V_1-0-0_NN.md'],
        'every model is listed in meta.models',
      )
      const concepts = new Set(slot.elements.map((el) => el.concept))
      assert.ok(concepts.has('Stakeholders'), 'first model elements are embedded')
      assert.ok(concepts.has('Widget'), 'second model elements are embedded')
    })

    it('embeds the precomputed per-element history from the domain changesets', async () => {
      await mkdir(join(tempDir, 'changes'), { recursive: true })
      await writeFile(
        join(tempDir, 'changes', 'c1_changes_NN.md'),
        `---\nspec_version: "V_0-4-0"\nlevel: 3\nparent_spec:\n  name: changes\n  url: "https://example.test/changes/spec_NN.md"\nblueprint_version: "V_0-2-0"\nstatus: applied\ntitle: "C"\n---\n\n# NN Change\n\n## NN Change: c-01\nop:: comment\ntarget:: business@enterprise\nnotes:: "a note"\nauthor:: OpenCode\n`,
        'utf-8',
      )
      assert.equal((await runCli([tempDir, '--domain'])).code, 0)
      const slot = await modelSlot()
      const el = slot.elements.find((e) => e.slug === 'enterprise')
      assert.ok(el, 'the enterprise element is embedded')
      assert.ok(Array.isArray(el.history) && el.history.length >= 1, 'history is embedded on the element')
      assert.equal(el.history[0].op, 'comment')
      assert.equal(el.history[0].notes, 'a note')
    })

    it('embeds the per-element source index and the model file-level source', async () => {
      await mkdir(join(tempDir, 'sources'), { recursive: true })
      await writeFile(join(tempDir, 'sources', 'brief.md'), '# Brief\n\n## Overview\nEnterprise context\n', 'utf8')
      await writeFile(
        join(tempDir, 'models', 'cited_V_1-0-0_NN.md'),
        `---\ntitle: "Cited"\nknowledge_version: "V_1-0-0"\nlevel: 3\n---\n\n# NN Concept\n## NN Concept: Enterprise Plan\n  slug:: enterprise-plan\n  sources:: "sources/brief.md#overview"\n\n  Details.\n`,
        'utf-8',
      )
      assert.equal((await runCli([tempDir, '--domain'])).code, 0)
      const slot = await modelSlot()
      const el = slot.elements.find((e) => e.slug === 'enterprise-plan')
      assert.ok(el && el.citations && Array.isArray(el.citations.sources), 'source index embedded on the element')
      assert.equal(el.citations.sources[0].path, 'sources/brief.md')
      assert.ok(el.citations.sources[0].excerpt.includes('Enterprise context'))
      const cited = slot.meta.models.find((m) => m.filePath === 'cited_V_1-0-0_NN.md')
      assert.deepEqual(cited.sources, ['kNNowledge/cited_V_1-0-0_NN.md'], 'the model file-level source is embedded')
    })

    it('links a source above the excerpt threshold instead of embedding its full body', async () => {
      await mkdir(join(tempDir, 'sources'), { recursive: true })
      const longBody = 'A'.repeat(1200)
      await writeFile(join(tempDir, 'sources', 'long.md'), `# Long\n\n## Section\n${longBody}\n`, 'utf8')
      await writeFile(
        join(tempDir, 'models', 'longref_V_1-0-0_NN.md'),
        `---\ntitle: "LongRef"\nknowledge_version: "V_1-0-0"\nlevel: 3\n---\n\n# NN Concept\n## NN Concept: Big\n  slug:: big\n  sources:: "sources/long.md#section"\n`,
        'utf-8',
      )
      assert.equal((await runCli([tempDir, '--domain'])).code, 0)
      const html = await readFile(domainFile(), 'utf-8')
      const slot = JSON.parse(html.match(/id="innfo-model">([\s\S]*?)<\/script>/)[1])
      const cite = slot.elements.find((e) => e.slug === 'big').citations.sources[0]
      assert.equal(cite.truncated, true, 'a heavy source is truncated')
      assert.equal(cite.excerpt.length, 500, 'the excerpt is capped, not the whole body')
      assert.equal(html.includes(longBody), false, 'the full source body is never embedded')
      assert.ok(html.includes('A'.repeat(400)), 'only the capped excerpt is embedded')
    })

    it('fails an oversized export through the size budget and writes no artifact', async () => {
      const viewsDir = join(tempDir, 'consoles', 'views')
      await mkdir(viewsDir, { recursive: true })
      await writeFile(join(viewsDir, 'huge.js'), `/* ${'x'.repeat(16_000_000)} */\n`, 'utf-8')
      const res = await runCli([tempDir, '--domain'])
      assert.notEqual(res.code, 0, 'an oversized export must fail')
      assert.match(res.stderr, /larger than 15000000 B/)
      assert.equal(existsSync(domainFile()), false, 'no artifact is written on budget failure')
    })
  })
})




describe('domain console schema slot carries marker and matrix definitions (S3b P1-11)', () => {
  let root
  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'nn-matrix-defs-'))
    const dir = join(root, 'specs', 'bluepriNNts', 'journey')
    await mkdir(dir, { recursive: true })
    await writeFile(
      join(dir, 'spec_NN.md'),
      `---
level: 2
spec_version: V_0-1-0
title: "Journey"
---

# NN Concept Definition
## NN Concept Definition: Step
type:: text

# NN Marker Definition
## NN Marker Definition: Active
widget:: boolean

# NN Matrix Definition
## NN Matrix Definition: Journey map
source:: Step
target:: Step
values:: [Max, High, Low]
widget:: set
`,
      'utf-8',
    )
    await mkdir(join(root, 'models'), { recursive: true })
    await writeFile(
      join(root, 'models', 'j_journey_V_1-0-0_NN.md'),
      `---
title: "journey"
model_version: "V_1-0-0"
level: 3
parent_spec:
  name: "journey_V_0-1-0"
---

# NN Step
## NN Step: A
  slug:: a
`,
      'utf-8',
    )
  })
  after(() => rm(root, { recursive: true, force: true }))

  it('exports markers and matrices with widgetType and values in the domain innfo-schema slot', async () => {
    const res = await runCli([root, '--domain'])
    assert.equal(res.code, 0, res.stderr)
    const html = await readFile(join(root, 'domaiNN_console.html'), 'utf-8')
    const m = html.match(/<script type="application\/json" id="innfo-schema">([\s\S]*?)<\/script>/)
    const schema = JSON.parse(m[1])
    assert.deepEqual(
      schema.matrices.map((x) => [x.name, x.widgetType, x.values]),
      [['Journey map', 'set', ['Max', 'High', 'Low']]],
    )
    assert.deepEqual(schema.markers?.map((x) => [x.name, x.widgetType]) ?? [], [])
  })
})
