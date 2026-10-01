import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { JSDOM } from 'jsdom'

const execFileAsync = promisify(execFile)
const here = dirname(fileURLToPath(import.meta.url))
const scriptPath = resolve(here, '..', 'scripts', 'export-console.mjs')

async function runCli(args, opts = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath, ...args], {
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
  budget:: "$100k"
  tagline:: "Mission critical"

  Leading enterprise tier offering.

# NN RevenueStream
## NN RevenueStream: Subscription
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

  it('exports standalone 3-tier console artifact with embedded bundle and slots', async () => {
    const res = await runCli([tempDir, '--all'])
    assert.equal(res.code, 0)

    const exportDir = join(tempDir, 'export', 'business_V_1-0-0_console')
    const htmlPath = join(exportDir, 'business_V_1-0-0_console.html')
    const bundlePath = join(exportDir, 'innfo-console.bundle.js')

    assert.equal(existsSync(htmlPath), true, 'HTML artifact was generated')
    assert.equal(existsSync(bundlePath), true, 'innfo-console.bundle.js vendored alongside HTML')

    const htmlContent = await readFile(htmlPath, 'utf-8')
    assert.match(htmlContent, /<script type="application\/json" id="innfo-config">/)
    assert.match(htmlContent, /<script type="application\/json" id="innfo-schema">/)
    assert.match(htmlContent, /<script type="application\/json" id="innfo-model">/)
    assert.match(htmlContent, /id="innfo-tab-review"/)
  })

  it('hydrates Level 1 primitives and Review tab offline in JSDOM without remote network requests', async () => {
    await runCli([tempDir, '--all'])

    const htmlPath = join(
      tempDir,
      'export',
      'business_V_1-0-0_console',
      'business_V_1-0-0_console.html',
    )
    const bundlePath = join(
      tempDir,
      'export',
      'business_V_1-0-0_console',
      'innfo-console.bundle.js',
    )

    const html = await readFile(htmlPath, 'utf-8')
    const bundleJs = await readFile(bundlePath, 'utf-8')

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

    // Verify banner and reviewer chip
    const banner = doc.getElementById('innfo-banner')
    assert.ok(banner)
    assert.match(banner.textContent, /Offline Business Model/)
    const reviewerChip = banner.querySelector('.innfo-reviewer-chip')
    assert.ok(reviewerChip, 'Reviewer profile chip rendered in banner')
    assert.match(reviewerChip.textContent, /reviewer/)

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
    assert.ok(reviewTabBtn, 'Review tab button rendered in view tabs navigation')
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
  note:: "</script><script>alert('xss')</script>"

  Dangerous note with <div>HTML content</div>.
`
    await writeFile(join(tempDir, 'models', 'xss_V_1-0-0_NN.md'), xssModel, 'utf-8')
    const res = await runCli([tempDir, '--all'])
    assert.equal(res.code, 0)

    const htmlPath = join(tempDir, 'export', 'xss_V_1-0-0_console', 'xss_V_1-0-0_console.html')
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

  it('reads root feedback-ledger.jsonl and ignores legacy paths', async () => {
    // Write root ledger entry
    const rootLedgerContent = JSON.stringify({
      v: 1,
      at: '2026-10-01T10:00:00Z',
      source: { kind: 'console-json', path: 'sources/import/feedback/f1.json', sha256: 'abc1234567890123456789012345678901234567890123456789012345678901' },
      item: 'fb-001',
      model_id: 'models/business_V_1-0-0_NN.md',
      knowledge_version: 'V_1-0-0',
      element_id: 'stakeholders-enterprise',
      status: 'applied',
      by: 'lead',
    }) + '\n'
    await writeFile(join(tempDir, 'feedback-ledger.jsonl'), rootLedgerContent, 'utf-8')

    // Write decoy ledger in ignored location
    const legacyLedgerDir = join(tempDir, 'sources', 'import', 'feedback')
    await mkdir(legacyLedgerDir, { recursive: true })
    const legacyLedgerContent = JSON.stringify({
      v: 1,
      at: '2026-10-01T11:00:00Z',
      source: { kind: 'console-json', path: 'sources/import/feedback/f1.json', sha256: 'decoy123' },
      item: 'fb-999-decoy',
      model_id: 'models/business_V_1-0-0_NN.md',
      knowledge_version: 'V_1-0-0',
      status: 'rejected',
      by: 'decoy',
    }) + '\n'
    await writeFile(join(legacyLedgerDir, 'ledger.jsonl'), legacyLedgerContent, 'utf-8')

    const res = await runCli([tempDir, '--all'])
    assert.equal(res.code, 0)

    const htmlPath = join(tempDir, 'export', 'business_V_1-0-0_console', 'business_V_1-0-0_console.html')
    const htmlContent = await readFile(htmlPath, 'utf-8')
    assert.ok(htmlContent.includes('fb-001'), 'Root ledger entry fb-001 included in feedbackState')
    assert.equal(htmlContent.includes('fb-999-decoy'), false, 'Decoy legacy ledger entry ignored')
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
  sources:: "sources/brief.md#overview"

  Enterprise plan details.
`
    await writeFile(join(tempDir, 'models', 'cited_V_1-0-0_NN.md'), citedModel, 'utf-8')

    const res = await runCli([tempDir, '--all'])
    assert.equal(res.code, 0)

    const htmlPath = join(tempDir, 'export', 'cited_V_1-0-0_console', 'cited_V_1-0-0_console.html')
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

      await writeFile(join(standaloneDir, 'artifact_shell.html'), shellContent, 'utf-8')
      await writeFile(join(standaloneDir, 'innfo-console.bundle.js'), bundleContent, 'utf-8')
      await writeFile(join(standaloneDir, 'console-payload.generated.cjs'), mirrorContent, 'utf-8')

      const res = await runCli([tempDir, '--all'], {
        env: { INNFO_CONSOLE_DIR: standaloneDir },
      })
      assert.equal(res.code, 0, `Standalone export should exit with 0. stderr: ${res.stderr}`)

      const htmlPath = join(tempDir, 'export', 'business_V_1-0-0_console', 'business_V_1-0-0_console.html')
      assert.equal(existsSync(htmlPath), true, 'Artifact produced in standalone mode')
    } finally {
      await rm(standaloneDir, { recursive: true, force: true })
    }
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
  name:: "Example"
`
    await writeFile(join(tempDir, 'models', 'parent_test_V_1-0-0_NN.md'), modelWithParentSpec, 'utf-8')
    const res = await runCli([tempDir, '--all'])
    assert.equal(res.code, 0)
    assert.ok(res.stderr.includes('WARNING: [export-console] Schema resolution for parent_spec'))
    assert.ok(res.stderr.includes('missing_blueprint_V_0-1-0'))
  })
})



