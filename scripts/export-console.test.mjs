import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, mkdir, writeFile, readFile, copyFile, readdir } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname, basename, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { consoleHtml, consoleBundle, consoleMembers } from '../test/helpers/console-artifacts.mjs'
import { createHash } from 'node:crypto'

const execFileAsync = promisify(execFile)
const here = dirname(fileURLToPath(import.meta.url))
const scriptPath = resolve(here, 'export-console.mjs')

function computeHash(str) {
  return createHash('sha256').update(str, 'utf8').digest('hex')
}

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

describe('export-console CLI test suite', () => {
  let tempDir

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'nn-export-test-'))
    // Create models directory with fixtures
    await mkdir(join(tempDir, 'models'), { recursive: true })
    await mkdir(join(tempDir, 'subdomains'), { recursive: true })

    const modelA = `---
title: "Business Model"
knowledge_version: "V_0-2-5"
level: 3
---

# NN Market
## NN Stakeholders: Enterprise Customer
  budget:: "$50k"
  tagline:: "They REJECTED $1M. Today They're Bankrupt"

  Primary enterprise segment with annual subscription.
`
    const modelB = `---
title: "Procedures Model"
knowledge_version: "V_0-1-0"
level: 3
---

# NN Procedures
## NN Procedure: Onboarding
  duration:: "2 weeks"

  Standard customer onboarding procedure.
`
    const modelC = `---
title: "Metrics Model"
knowledge_version: "V_0-1-0"
level: 3
---

# NN Metrics
## NN Metric: ARR
  target:: "1M"

  Annual recurring revenue target.
`

    await writeFile(join(tempDir, 'models', 'business_V_0-2-5_NN.md'), modelA, 'utf-8')
    await writeFile(join(tempDir, 'models', 'procedures_V_0-1-0_NN.md'), modelB, 'utf-8')
    await writeFile(join(tempDir, 'subdomains', 'metrics_V_0-1-0_NN.md'), modelC, 'utf-8')
  })

  afterEach(async () => {
    if (tempDir && existsSync(tempDir)) {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  describe('Phase 1: Argument Parsing and Usage', () => {
    it('exits with code 2 when workspaceRoot is omitted', async () => {
      const res = await runCli([])
      assert.equal(res.code, 2)
      assert.match(res.stderr, /Usage:/)
    })

    it('lists all Level 3 models with --list and does not create artifacts folder', async () => {
      const res = await runCli([tempDir, '--list'])
      assert.equal(res.code, 0)
      assert.match(res.stdout, /business_V_0-2-5_NN\.md/)
      assert.match(res.stdout, /procedures_V_0-1-0_NN\.md/)
      assert.match(res.stdout, /metrics_V_0-1-0_NN\.md/)
      assert.match(res.stdout, /\(3 models\)/)
      assert.equal(existsSync(join(tempDir, 'artifacts')), false)
    })

    it('lists a procedures model but not a procedures/ submodel', async () => {
      await writeFile(
        join(tempDir, 'models', 'Workflows_procedures_NN.md'),
        `---
level: 3
parent_spec:
  name: "procedures_V_0-3-2"
  url: "iNNfo/specs/bluepriNNts/procedures/spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Workflows"
---

# NN Work

## NN Work: Step One
step_type:: task
Do the thing.
`,
        'utf-8',
      )
      await mkdir(join(tempDir, 'procedures'), { recursive: true })
      await writeFile(
        join(tempDir, 'procedures', 'import_audio_procedures_NN.md'),
        `---
level: 3
parent_spec:
  name: "procedures_V_0-2-0"
  url: "iNNfo/specs/bluepriNNts/procedures/procedures_V_0-2-0_NN.md"
knowledge_version: "V_0-1-0"
title: "Audio import"
---

# NN Work

## NN Work: Transcribe
step_type:: task
Transcribe it.
`,
        'utf-8',
      )
      const res = await runCli([tempDir, '--list'])
      assert.equal(res.code, 0)
      assert.match(res.stdout, /Workflows_procedures_NN\.md/)
      assert.doesNotMatch(res.stdout, /import_audio_procedures_NN\.md/)
      assert.match(res.stdout, /\(4 models\)/)
    })

    it('exits with code 1 when no models match filter and not in read-only mode', async () => {
      const res = await runCli([tempDir, 'nonexistent_pattern'])
      assert.equal(res.code, 1)
      assert.match(res.stderr, /No models selected/i)
    })
  })

  describe('Phase 2: SHA-256 Hashing, Metadata Injection & Status Engine', () => {
    it('injects meta.sha256 matching source model content into compiled HTML', async () => {
      const res = await runCli([tempDir, 'business'])
      assert.equal(res.code, 0)

      const htmlPath = consoleHtml(tempDir, 'business_V_0-2-5')
      assert.equal(existsSync(htmlPath), true)

      const htmlContent = await readFile(htmlPath, 'utf-8')
      const sourceContent = await readFile(
        join(tempDir, 'models', 'business_V_0-2-5_NN.md'),
        'utf-8',
      )
      const expectedHash = computeHash(sourceContent)

      const jsonMatch = htmlContent.match(
        /<script type="application\/json" id="innfo-model">([\s\S]*?)<\/script>/,
      )
      assert.ok(jsonMatch, 'innfo-model script slot exists in HTML')

      const modelJson = JSON.parse(jsonMatch[1])
      assert.equal(modelJson.meta.sha256, expectedHash)
      assert.equal(modelJson.meta.modelVersion, 'V_0-2-5')
    })

    it('emits embedded model JSON verbatim when fields contain $-sequences', async () => {
      const res = await runCli([tempDir, 'business'])
      assert.equal(res.code, 0)

      const htmlPath = consoleHtml(tempDir, 'business_V_0-2-5')
      const htmlContent = await readFile(htmlPath, 'utf-8')
      const jsonMatch = htmlContent.match(
        /<script type="application\/json" id="innfo-model">([\s\S]*?)<\/script>/,
      )
      assert.ok(jsonMatch, 'innfo-model script slot exists in HTML')

      const modelJson = JSON.parse(jsonMatch[1])
      const element = modelJson.elements.find((e) => e.fields.tagline)
      assert.ok(element, 'fixture element with $-sequence survived injection')
      assert.equal(element.fields.tagline, "They REJECTED $1M. Today They're Bankrupt")
    })

    it('embeds changeset lineage (element.history) from changes/*_changes_NN.md', async () => {
      await mkdir(join(tempDir, 'changes'), { recursive: true })
      await writeFile(
        join(tempDir, 'changes', 'business_reviewer_20260101T000000Z_changes_NN.md'),
        `---
spec_version: "V_0-4-0"
parent_spec: "changes"
blueprint_version: "0.1.0"
status: applied
title: "Review"
author: "reviewer"
applied_at: "2026-01-01T00:00:00.000Z"
---

# NN index

* [[Change]]

# NN Change

## NN Change: fb-001
op:: comment
target:: Business Model@Enterprise Customer&tagline
notes:: "Please review the tagline"
`,
        'utf-8',
      )

      const res = await runCli([tempDir, 'business'])
      assert.equal(res.code, 0)
      const htmlContent = await readFile(consoleHtml(tempDir, 'business_V_0-2-5'), 'utf-8')
      const jsonMatch = htmlContent.match(
        /<script type="application\/json" id="innfo-model">([\s\S]*?)<\/script>/,
      )
      assert.ok(jsonMatch, 'innfo-model slot exists')
      const modelJson = JSON.parse(jsonMatch[1])
      const element = modelJson.elements.find((e) => e.name === 'Enterprise Customer')
      assert.ok(element, 'fixture element exists')
      assert.ok(Array.isArray(element.history) && element.history.length === 1, 'history attached')
      assert.equal(element.history[0].id, 'fb-001')
      assert.equal(element.history[0].op, 'comment')
      assert.equal(element.history[0].author, 'reviewer')
      assert.equal(element.history[0].notes, 'Please review the tagline')
      assert.equal(element.history[0].timestamp, '2026-01-01T00:00:00.000Z')
    })

    it('reports status tags correctly with --status in read-only mode', async () => {
      // Initially all are uncompiled
      let res = await runCli([tempDir, '--status'])
      assert.equal(res.code, 0)
      assert.match(res.stdout, /business_V_0-2-5_NN\.md\s+\[uncompiled\]/)
      assert.match(res.stdout, /procedures_V_0-1-0_NN\.md\s+\[uncompiled\]/)
      assert.match(res.stdout, /metrics_V_0-1-0_NN\.md\s+\[uncompiled\]/)
      assert.equal(existsSync(join(tempDir, 'artifacts')), false, 'Status check must not create artifacts dir')

      // Compile business model
      const compileRes = await runCli([tempDir, 'business'])
      assert.equal(compileRes.code, 0)

      // Now business is fresh, others uncompiled
      res = await runCli([tempDir, '--status'])
      assert.equal(res.code, 0)
      assert.match(res.stdout, /business_V_0-2-5_NN\.md\s+\[fresh\]/)
      assert.match(res.stdout, /procedures_V_0-1-0_NN\.md\s+\[uncompiled\]/)

      // Modify business model without updating version -> stale
      const currentContent = await readFile(join(tempDir, 'models', 'business_V_0-2-5_NN.md'), 'utf-8')
      await writeFile(
        join(tempDir, 'models', 'business_V_0-2-5_NN.md'),
        currentContent + '\n## NN Stakeholders: Partner\n  budget:: "$10k"\n',
        'utf-8',
      )

      res = await runCli([tempDir, '--status'])
      assert.equal(res.code, 0)
      assert.match(res.stdout, /business_V_0-2-5_NN\.md\s+\[stale\]/)

      // Bump version in model frontmatter without recompiling -> version_mismatch
      const modifiedContent = await readFile(join(tempDir, 'models', 'business_V_0-2-5_NN.md'), 'utf-8')
      const bumpedContent = modifiedContent.replace('knowledge_version: "V_0-2-5"', 'knowledge_version: "V_0-3-0"')
      await writeFile(join(tempDir, 'models', 'business_V_0-2-5_NN.md'), bumpedContent, 'utf-8')

      res = await runCli([tempDir, '--status'])
      assert.equal(res.code, 0)
      assert.match(res.stdout, /business_V_0-2-5_NN\.md\s+\[version_mismatch\]/)
    })
  })

  describe('Phase 3: Tree Hierarchy Visualization & Selective Export', () => {
    it('renders hierarchical directory tree with --tree in read-only mode', async () => {
      const res = await runCli([tempDir, '--tree'])
      assert.equal(res.code, 0)
      assert.match(res.stdout, /models\//)
      assert.match(res.stdout, /subdomains\//)
      assert.match(res.stdout, /business_V_0-2-5_NN\.md/)
      assert.match(res.stdout, /\[uncompiled\]/)
      assert.equal(existsSync(join(tempDir, 'artifacts')), false)
    })

    it('exports all models with --all', async () => {
      const res = await runCli([tempDir, '--all'])
      assert.equal(res.code, 0)
      assert.match(res.stdout, /Exported 3 console artifact\(s\)/)
      assert.equal(
        existsSync(consoleHtml(tempDir, 'business_V_0-2-5')),
        true,
      )
      assert.equal(
        existsSync(consoleHtml(tempDir, 'procedures_V_0-1-0')),
        true,
      )
      assert.equal(
        existsSync(consoleHtml(tempDir, 'metrics_V_0-1-0')),
        true,
      )
    })

    it('exports only stale or uncompiled models with --stale', async () => {
      // Compile all models first
      await runCli([tempDir, '--all'])

      // Running --stale now should do nothing because all are fresh
      let res = await runCli([tempDir, '--stale'])
      assert.equal(res.code, 0)
      assert.match(res.stdout, /fresh|nothing to export/i)

      // Modify procedures model
      const procFile = join(tempDir, 'models', 'procedures_V_0-1-0_NN.md')
      const content = await readFile(procFile, 'utf-8')
      await writeFile(procFile, content + '\n## NN Procedure: Offboarding\n', 'utf-8')

      // Now --stale should compile only procedures
      res = await runCli([tempDir, '--stale'])
      assert.equal(res.code, 0)
      assert.match(res.stdout, /procedures_V_0-1-0_console(?:_\d{8}T\d{6}Z(?:-\d+)?)?\.html/)
      assert.doesNotMatch(res.stdout, /business_V_0-2-5_console(?:_\d{8}T\d{6}Z(?:-\d+)?)?\.html/)
      assert.match(res.stdout, /Exported 1 console artifact\(s\)/)
    })

    it('filters models by pattern with --filter', async () => {
      const res = await runCli([tempDir, '--filter', 'metrics'])
      assert.equal(res.code, 0)
      assert.match(res.stdout, /metrics_V_0-1-0_console(?:_\d{8}T\d{6}Z(?:-\d+)?)?\.html/)
      assert.doesNotMatch(res.stdout, /business_V_0-2-5_console(?:_\d{8}T\d{6}Z(?:-\d+)?)?\.html/)
      assert.doesNotMatch(res.stdout, /procedures_V_0-1-0_console(?:_\d{8}T\d{6}Z(?:-\d+)?)?\.html/)
      assert.match(res.stdout, /Exported 1 console artifact\(s\)/)
    })
  })

  describe('Phase 4: Standalone exporter & CDN pin', () => {
    it('pins the runtime CDN to the vendored bundle version banner', async () => {
      const res = await runCli([tempDir, 'business'])
      assert.equal(res.code, 0)

      const htmlPath = consoleHtml(tempDir, 'business_V_0-2-5')
      const htmlContent = await readFile(htmlPath, 'utf-8')
      const configMatch = htmlContent.match(
        /<script type="application\/json" id="innfo-config">([\s\S]*?)<\/script>/,
      )
      assert.ok(configMatch, 'innfo-config slot exists in HTML')
      const config = JSON.parse(configMatch[1])

      const bundle = await readFile(
        resolve(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console', 'innfo-console.bundle.js'),
        'utf-8',
      )
      const version = bundle.match(/\bVersion (\d+\.\d+\.\d+)\./)[1]
      assert.equal(
        config.runtime.cdn,
        `https://cdn.jsdelivr.net/gh/cogNNitive/cogNNitive@innfo-console-v${version}/iNNfo/specs/bluepriNNts/console/innfo-console.bundle.js`,
      )
    })

    it('normalizes every console CDN ref in the output to the vendored bundle version', async () => {
      const res = await runCli([tempDir, 'business'])
      assert.equal(res.code, 0)

      const htmlPath = consoleHtml(tempDir, 'business_V_0-2-5')
      const htmlContent = await readFile(htmlPath, 'utf-8')

      const bundle = await readFile(
        resolve(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console', 'innfo-console.bundle.js'),
        'utf-8',
      )
      const version = bundle.match(/\bVersion (\d+\.\d+\.\d+)\./)[1]

      const refs = [...htmlContent.matchAll(/@innfo-console-v(\d+\.\d+\.\d+)/g)].map((m) => m[1])
      assert.ok(refs.length > 0, 'console CDN ref(s) present in output')
      assert.deepEqual(
        [...new Set(refs)],
        [version],
        'every console CDN ref must match the vendored bundle version',
      )
    })

    it('runs standalone next to the console assets without scripts/lib or manifest', async () => {
      const repoRoot = resolve(here, '..')
      const toolsDir = join(tempDir, 'tools')
      const consoleDir = join(tempDir, 'iNNfo', 'specs', 'bluepriNNts', 'console')
      await mkdir(toolsDir, { recursive: true })
      await mkdir(consoleDir, { recursive: true })
      await copyFile(resolve(here, 'export-console.mjs'), join(toolsDir, 'export-console.mjs'))
      for (const name of [
        'artifact_shell.html',
        'innfo-console.bundle.js',
        'console-payload.generated.cjs',
      ]) {
        await copyFile(
          join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'console', name),
          join(consoleDir, name),
        )
      }
      assert.equal(existsSync(join(tempDir, 'manifest')), false)

      const { stdout } = await execFileAsync(
        process.execPath,
        [join(toolsDir, 'export-console.mjs'), tempDir, 'business'],
        { cwd: tempDir },
      )
      assert.match(stdout, /business_V_0-2-5_console(?:_\d{8}T\d{6}Z(?:-\d+)?)?\.html/)
      assert.equal(
        existsSync(consoleHtml(tempDir, 'business_V_0-2-5')),
        true,
      )
    })

    it('falls back to the legacy artifact_blueprint.html name in an installed console dir', async () => {
      const repoRoot = resolve(here, '..')
      const consoleSrc = join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'console')
      const assetsDir = join(tempDir, 'legacy-console')
      const toolsDir = join(tempDir, 'elsewhere', 'tools')
      await mkdir(assetsDir, { recursive: true })
      await mkdir(toolsDir, { recursive: true })
      await copyFile(resolve(here, 'export-console.mjs'), join(toolsDir, 'export-console.mjs'))
      // Installs made before the shell rename only carry the old filename.
      await copyFile(join(consoleSrc, 'artifact_shell.html'), join(assetsDir, 'artifact_blueprint.html'))
      await copyFile(join(consoleSrc, 'innfo-console.bundle.js'), join(assetsDir, 'innfo-console.bundle.js'))
      await copyFile(join(consoleSrc, 'console-payload.generated.cjs'), join(assetsDir, 'console-payload.generated.cjs'))

      const { stdout } = await execFileAsync(
        process.execPath,
        [join(toolsDir, 'export-console.mjs'), tempDir, 'business'],
        { cwd: tempDir, env: { ...process.env, INNFO_CONSOLE_DIR: assetsDir } },
      )
      assert.match(stdout, /business_V_0-2-5_console(?:_\d{8}T\d{6}Z(?:-\d+)?)?\.html/)
      assert.equal(
        existsSync(consoleHtml(tempDir, 'business_V_0-2-5')),
        true,
      )
    })

    it('prefers artifact_shell.html over the legacy name when both exist in a dir', async () => {
      const repoRoot = resolve(here, '..')
      const consoleSrc = join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'console')
      const assetsDir = join(tempDir, 'both-console')
      const toolsDir = join(tempDir, 'elsewhere', 'tools')
      await mkdir(assetsDir, { recursive: true })
      await mkdir(toolsDir, { recursive: true })
      await copyFile(resolve(here, 'export-console.mjs'), join(toolsDir, 'export-console.mjs'))
      await copyFile(join(consoleSrc, 'artifact_shell.html'), join(assetsDir, 'artifact_shell.html'))
      const shell = await readFile(join(consoleSrc, 'artifact_shell.html'), 'utf-8')
      await writeFile(join(assetsDir, 'artifact_blueprint.html'), shell.replace('<title>', '<title>STALE-LEGACY '))
      await copyFile(join(consoleSrc, 'innfo-console.bundle.js'), join(assetsDir, 'innfo-console.bundle.js'))
      await copyFile(join(consoleSrc, 'console-payload.generated.cjs'), join(assetsDir, 'console-payload.generated.cjs'))

      await execFileAsync(
        process.execPath,
        [join(toolsDir, 'export-console.mjs'), tempDir, 'business'],
        { cwd: tempDir, env: { ...process.env, INNFO_CONSOLE_DIR: assetsDir } },
      )
      const out = await readFile(
        consoleHtml(tempDir, 'business_V_0-2-5'),
        'utf-8',
      )
      assert.equal(out.includes('STALE-LEGACY'), false)
    })

    it('resolves console assets from $INNFO_CONSOLE_DIR when no repo tree is present', async () => {
      const repoRoot = resolve(here, '..')
      const assetsDir = join(tempDir, 'installed-console')
      const toolsDir = join(tempDir, 'elsewhere', 'tools')
      await mkdir(assetsDir, { recursive: true })
      await mkdir(toolsDir, { recursive: true })
      await copyFile(resolve(here, 'export-console.mjs'), join(toolsDir, 'export-console.mjs'))
      for (const name of [
        'artifact_shell.html',
        'innfo-console.bundle.js',
        'console-payload.generated.cjs',
      ]) {
        await copyFile(
          join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'console', name),
          join(assetsDir, name),
        )
      }

      const { stdout } = await execFileAsync(
        process.execPath,
        [join(toolsDir, 'export-console.mjs'), tempDir, 'business'],
        { cwd: tempDir, env: { ...process.env, INNFO_CONSOLE_DIR: assetsDir } },
      )
      assert.match(stdout, /business_V_0-2-5_console(?:_\d{8}T\d{6}Z(?:-\d+)?)?\.html/)
      assert.equal(
        existsSync(consoleHtml(tempDir, 'business_V_0-2-5')),
        true,
      )
    })
  })

  describe('distributed exporter set', () => {
    // The installer places every manifest console_assets file flat, by basename, in one
    // folder (skills-commands installConsoleAssetAtCommit). Rebuild exactly that.
    const manifestConsoleFiles = () => {
      const yaml = readFileSync(resolve(here, '..', 'manifest', 'source.yaml'), 'utf-8')
      const block = yaml.split('\nconsole_assets:\n')[1].split(/\n\S/)[0]
      return [...block.matchAll(/^\s+file:\s*(\S+)\s*$/gm)].map((m) => m[1])
    }
    const install = async (dir, { skip = [] } = {}) => {
      await mkdir(dir, { recursive: true })
      for (const rel of manifestConsoleFiles()) {
        if (skip.includes(basename(rel))) continue
        await copyFile(resolve(here, '..', rel), join(dir, basename(rel)))
      }
    }
    const runInstalled = (dir, args, env = {}) =>
      execFileAsync(process.execPath, [join(dir, 'export-console.mjs'), tempDir, ...args], {
        cwd: tempDir,
        env: { ...process.env, INNFO_CONSOLE_DIR: dir, ...env },
      })
    const VIEW = (title) =>
      `registerView({ title: '${title}', icon: 'layout', order: 1, kind: 'readonly', mount() {} })\n`
    const METRICS_MODEL =
      '---\ntitle: "M"\nlevel: 3\nparent_spec:\n  name: "metrics_V_0-4-1"\n---\n\n# NN Item\n## NN Item: A\n  name:: "A"\n'
    const putView = async (dir, slug, title) => {
      await mkdir(dir, { recursive: true })
      await writeFile(join(dir, slug + '.js'), VIEW(title), 'utf-8')
    }
    const viewsOf = (packagesRoot) => join(packagesRoot, 'metrics', 'assets')
    const setUpViews = async (packagesRoot) => {
      await writeFile(join(tempDir, 'models', 'm_V_1-0-0_NN.md'), METRICS_MODEL, 'utf-8')
      await putView(join(tempDir, 'consoles', 'views'), 'pipeline', 'Pipeline')
      if (packagesRoot) await putView(viewsOf(packagesRoot), 'console-view-timeline', 'Timeline')
    }
    const domainHtml = () => readFile(join(tempDir, 'domaiNN_console.html'), 'utf-8')
    const assertWholeConsole = async (html) => {
      const bundle = await readFile(
        resolve(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console', 'innfo-console.bundle.js'),
        'utf-8',
      )
      const banner = bundle.match(/innfo-console\.bundle\.js — single-file console runtime/)[0]
      assert.equal(html.split(banner).length - 1, 1, 'bundle inlined once')
      assert.match(html, /<style>[\s\S]*--innfo-bg[\s\S]*<\/style>/, 'css inlined')
      assert.ok(
        html.includes('data-innfo-view="pipeline" data-innfo-view-source="domaiNN:consoles/views/pipeline.js"'),
        'domain view present',
      )
    }
    const failure = async (promise) => {
      try {
        await promise
      } catch (err) {
        return err
      }
      assert.fail('expected the exporter to exit non-zero')
    }

    it('lists the exporter, its view lib and the assets --domain reads in the manifest', () => {
      const names = manifestConsoleFiles().map((f) => basename(f))
      for (const need of [
        'export-console.mjs',
        'console-views.mjs',
        'innfo-ui.css',
        'console-payload.generated.cjs',
        'innfo-console.bundle.js',
        'artifact_shell.html',
      ]) {
        assert.ok(names.includes(need), need + ' must be a console_assets entry')
      }
    })

    it('runs --domain from an installed set alone, with no repo tree around it', async () => {
      const dir = join(tempDir, 'installed')
      await install(dir)
      const { stdout } = await runInstalled(dir, ['--domain'])
      assert.match(stdout, /domaiNN_console\.html/)
      const html = await readFile(join(tempDir, 'domaiNN_console.html'), 'utf-8')
      assert.equal(/<script[^>]*\ssrc=/.test(html), false, 'self-contained')
    })

    it('inlines the bundle, the CSS and a domain-local view from an installed set', async () => {
      const dir = join(tempDir, 'installed')
      await install(dir)
      await setUpViews(null)
      await runInstalled(dir, ['--domain'], { INNFO_BLUEPRINTS_DIR: join(tempDir, 'no-packages') })
      await assertWholeConsole(await domainHtml())
    })

    it('resolves bluepriNNt views from INNFO_BLUEPRINTS_DIR for an installed set', async () => {
      const dir = join(tempDir, 'installed')
      const packages = join(tempDir, 'packages')
      await install(dir)
      await setUpViews(packages)
      const { stderr } = await runInstalled(dir, ['--domain'], { INNFO_BLUEPRINTS_DIR: packages })
      const html = await domainHtml()
      await assertWholeConsole(html)
      assert.ok(
        html.includes(
          'data-innfo-view="timeline" data-innfo-view-source="bluepriNNt:metrics/assets/console-view-timeline.js"',
        ),
      )
      assert.doesNotMatch(stderr, /no bluepriNNt package/)
    })

    it('looks for installed bluepriNNt packages in ~/.agents/bluepriNNts by default', async () => {
      const dir = join(tempDir, 'installed')
      const home = join(tempDir, 'home')
      await install(dir)
      await setUpViews(join(home, '.agents', 'bluepriNNts'))
      await runInstalled(dir, ['--domain'], { HOME: home, USERPROFILE: home, INNFO_BLUEPRINTS_DIR: '' })
      assert.ok((await domainHtml()).includes('data-innfo-view="timeline"'))
    })

    it('warns on stderr, and still exports, when the bluepriNNt package cannot be found', async () => {
      const dir = join(tempDir, 'installed')
      await install(dir)
      await setUpViews(null)
      const packages = join(tempDir, 'empty-packages')
      const { stderr } = await runInstalled(dir, ['--domain'], { INNFO_BLUEPRINTS_DIR: packages })
      assert.match(stderr, /WARNING: \[export-console\] no bluepriNNt package for "metrics_V_0-4-1"/)
      assert.ok(stderr.includes(join(packages, 'metrics')))
      await assertWholeConsole(await domainHtml())
    })

    it('fails with a clear message when the view lib is not next to the exporter', async () => {
      const dir = join(tempDir, 'installed')
      await install(dir, { skip: ['console-views.mjs'] })
      const err = await failure(runInstalled(dir, ['--domain']))
      assert.notEqual(err.code, 0)
      assert.match(err.stderr, /--domain needs console-views\.mjs next to this script/)
      assert.equal(existsSync(join(tempDir, 'domaiNN_console.html')), false)
    })

    it('does not turn a missing module inside the lib into the "lib absent" message', async () => {
      const dir = join(tempDir, 'installed')
      await install(dir)
      const lib = join(dir, 'console-views.mjs')
      await writeFile(lib, "import './not-there.mjs'\n" + (await readFile(lib, 'utf-8')), 'utf-8')
      const err = await failure(runInstalled(dir, ['--domain']))
      assert.match(err.stderr, /not-there\.mjs/)
      assert.doesNotMatch(err.stderr, /next to this script/)
    })

    it('still exports a single model without the view lib', async () => {
      const dir = join(tempDir, 'installed')
      await install(dir, { skip: ['console-views.mjs'] })
      await runInstalled(dir, ['business'])
      assert.equal(existsSync(consoleHtml(tempDir, 'business_V_0-2-5')), true)
    })
  })

  describe('Phase 6: Write-once exports', () => {
    const sha = async (file) => computeHash(await readFile(file, 'utf-8'))
    const tree = async (root) => {
      const out = []
      const walk = async (dir) => {
        for (const e of await readdir(dir, { withFileTypes: true })) {
          const p = join(dir, e.name)
          if (e.isDirectory()) await walk(p)
          else out.push(`${relative(root, p).replace(/\\/g, '/')}:${await sha(p)}`)
        }
      }
      await walk(join(root, 'artifacts'))
      return out.sort()
    }

    it('writes nothing new when run twice on unchanged input', async () => {
      assert.equal((await runCli([tempDir, '--all'])).code, 0)
      const first = await tree(tempDir)
      const again = await runCli([tempDir, '--all'])
      assert.equal(again.code, 0)
      assert.match(again.stdout, /Exported 0 console artifact\(s\)/)
      assert.deepEqual(await tree(tempDir), first)
      assert.equal(consoleMembers(tempDir, 'business_V_0-2-5').length, 1)
    })

    it('adds a suffixed member for a changed model and leaves the earlier console byte-identical', async () => {
      await runCli([tempDir, 'business'])
      const [original] = consoleMembers(tempDir, 'business_V_0-2-5')
      const before = await sha(original)

      const file = join(tempDir, 'models', 'business_V_0-2-5_NN.md')
      await writeFile(file, (await readFile(file, 'utf-8')) + '\n## NN Stakeholders: Partner\n  budget:: "$10k"\n', 'utf-8')
      const res = await runCli([tempDir, '--stale'])
      assert.equal(res.code, 0)

      const members = consoleMembers(tempDir, 'business_V_0-2-5')
      assert.equal(members.length, 2)
      assert.match(basename(members[1]), /^business_V_0-2-5_console_\d{8}T\d{6}Z(-\d+)?\.html$/)
      assert.equal(await sha(original), before)
      assert.equal(members[0], original)
      assert.equal(consoleHtml(tempDir, 'business_V_0-2-5'), members[1])
      const meta = JSON.parse(
        (await readFile(members[1], 'utf-8')).match(/id="innfo-model">([\s\S]*?)<\/script>/)[1],
      ).meta
      assert.equal(meta.sha256, computeHash(await readFile(file, 'utf-8')))
    })

    it('embeds meta.sources from the core payload builder', async () => {
      await runCli([tempDir, 'business'])
      const html = await readFile(consoleHtml(tempDir, 'business_V_0-2-5'), 'utf-8')
      const meta = JSON.parse(html.match(/id="innfo-model">([\s\S]*?)<\/script>/)[1]).meta
      assert.ok(Array.isArray(meta.sources) && meta.sources.length > 0)
      assert.ok(meta.sources[0].endsWith('business_V_0-2-5_NN.md'))
    })

    it('vendors the bundle as its own write-once member and points the HTML at it', async () => {
      await runCli([tempDir, 'business'])
      const html = await readFile(consoleHtml(tempDir, 'business_V_0-2-5'), 'utf-8')
      const bundle = consoleBundle(tempDir, 'business_V_0-2-5')
      assert.equal(existsSync(bundle), true)
      assert.ok(html.includes(`./${basename(bundle)}`))
    })
  })

  describe('Phase 5: Matrix serialization', () => {
    // Two ordinary `# NN matrices:` tables plus one special `item-markers matrix`
    // (which the parser folds into model-level markers, not a matrix).
    const matrixModel = `---
title: "Matrix Model"
knowledge_version: "V_0-1-0"
level: 3
---

# NN Metrics
## NN Metrics: Payback capex
metricValue:: 56

# NN matrices: metrics-dependencies matrix
| Metrics \\ Metrics | Flujo acumulado | Payback capex |
| :--- | :---: | :---: |
| Flujo acumulado | - | DependsOn |
| Payback capex | DependsOn | - |

# NN matrices: scenario matrix
| Scenario \\ Metric | Base | Stress |
| :--- | :---: | :---: |
| Base-Balance | 1 | - |
| Stress-Balance | - | 1 |

# NN matrices: item-markers matrix
| Item \\ Marker | is_formula |
| :--- | :---: |
| Payback capex | X |
`

    beforeEach(async () => {
      await writeFile(join(tempDir, 'models', 'matrix_V_0-1-0_NN.md'), matrixModel, 'utf-8')
    })

    it('serializes ordinary `# NN matrices:` sections into model.matrices for the viewer', async () => {
      const res = await runCli([tempDir, 'matrix_V_0-1-0'])
      assert.equal(res.code, 0)

      const htmlPath = consoleHtml(tempDir, 'matrix_V_0-1-0')
      const htmlContent = await readFile(htmlPath, 'utf-8')
      const modelJson = JSON.parse(
        htmlContent.match(/<script type="application\/json" id="innfo-model">([\s\S]*?)<\/script>/)[1],
      )

      assert.equal(modelJson.matrices.length, 2, 'both ordinary matrices serialized')
      const deps = modelJson.matrices.find((m) => m.name === 'metrics-dependencies matrix')
      assert.ok(deps, 'metrics-dependencies matrix present')
      assert.deepEqual(deps.rows, ['Flujo acumulado', 'Payback capex'])
      assert.deepEqual(deps.cols, ['Flujo acumulado', 'Payback capex'])
      assert.equal(deps.cells['Payback capex']['Flujo acumulado'], 'DependsOn')

      const scenario = modelJson.matrices.find((m) => m.name === 'scenario matrix')
      assert.ok(scenario, 'scenario matrix present')
      assert.deepEqual(scenario.rows, ['Base-Balance', 'Stress-Balance'])
      assert.deepEqual(scenario.cols, ['Base', 'Stress'])
      assert.equal(scenario.cells['Base-Balance']['Base'], '1')
    })
  })
})
