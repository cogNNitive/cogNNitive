import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { JSDOM } from 'jsdom'
import { runExportConsole, collectWorkspaceFiles } from '../scripts/export-console.mjs'

const sha = (text) => createHash('sha256').update(text).digest('hex')

const sidecarMd = (sourceFile, digest, format = 'md') => `---
level: 3
parent_spec:
  name: sidecar
source_file: ${sourceFile}
sha256: ${digest}
size_bytes: 42
source_format: ${format}
normalized_at: 2026-11-01T12:14:00Z
author: test
---

# Normalized body

${sourceFile} normalized text.
`

describe('Domain Console Export Files Section Integration', () => {
  let tempDir

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'nn-export-files-test-'))
    await mkdir(join(tempDir, 'sources', 'import'), { recursive: true })
    await mkdir(join(tempDir, 'sources', 'assets'), { recursive: true })
    await mkdir(join(tempDir, 'assets'), { recursive: true })
    await mkdir(join(tempDir, 'evidence'), { recursive: true })
    await mkdir(join(tempDir, 'artifacts'), { recursive: true })
    await mkdir(join(tempDir, 'kNNowledge'), { recursive: true })
    await mkdir(join(tempDir, 'changes'), { recursive: true })

    // A model whose unit cites one imported source with an excerpt.
    const modelContent = `---
title: "Product Model"
knowledge_version: "V_1-0-0"
target_blueprint: "system"
level: 3
---

# NN System
## NN System: Core Engine
  slug:: core-engine
  status:: active
  source:: sources/import/spec.md_sidecar_NN.md
`
    await writeFile(join(tempDir, 'kNNowledge', 'system_NN.md'), modelContent, 'utf8')

    // Imported source + canonical sidecar naming.
    const specBody = '# Core Engine Spec\nEngine specification details.'
    await writeFile(join(tempDir, 'sources', 'import', 'spec.md'), specBody, 'utf8')
    await writeFile(
      join(tempDir, 'sources', 'import', 'spec.md_sidecar_NN.md'),
      sidecarMd('sources/import/spec.md', sha(specBody)),
      'utf8',
    )

    // A sidecar with a drifted digest.
    const driftBody = 'Drifted document.'
    await writeFile(join(tempDir, 'sources', 'import', 'drift.md'), driftBody, 'utf8')
    await writeFile(
      join(tempDir, 'sources', 'import', 'drift.md_sidecar_NN.md'),
      sidecarMd('sources/import/drift.md', 'f'.repeat(64)),
      'utf8',
    )

    // An uncited imported source with no sidecar.
    await writeFile(join(tempDir, 'sources', 'import', 'orphan.txt'), 'Uncited source document.', 'utf8')

    // A binary asset nested under sources/ must stay an asset and never be inlined.
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0xff, 0xfe, 0x00, 0x80])
    await writeFile(join(tempDir, 'sources', 'assets', 'arch.png'), png)

    await writeFile(join(tempDir, 'evidence', 'bench.csv'), 'metric,value\nlatency,10ms', 'utf8')
    await writeFile(join(tempDir, 'artifacts', 'summary.html'), '<html><body>Summary [[core-engine]]</body></html>', 'utf8')

    const changeContent = `---
blueprint: changes
blueprint_version: "1.0.0"
---

# Changes
## NN Change: 2026-10-01-initial
  target:: core-engine
  op:: create
  evidence:: evidence/bench.csv
  notes:: Added core engine
`
    await writeFile(join(tempDir, 'changes', '2026-10-01-initial_changes_NN.md'), changeContent, 'utf8')
  })

  afterEach(async () => {
    if (tempDir && existsSync(tempDir)) {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  })

  // Two same-named sources in different folders, plus the existing spec.md at
  // sources/import/spec.md: the bare name 'spec.md' is ambiguous, 'orphan.txt' is not.
  async function seedSameNamedSources() {
    await mkdir(join(tempDir, 'sources', 'import', 'alpha'), { recursive: true })
    await mkdir(join(tempDir, 'sources', 'import', 'beta'), { recursive: true })
    await writeFile(join(tempDir, 'sources', 'import', 'alpha', 'spec.md'), '# Alpha spec\n', 'utf8')
    await writeFile(join(tempDir, 'sources', 'import', 'beta', 'spec.md'), '# Beta spec\n', 'utf8')
  }

  it('writes model.files in the #nn-model slot of domaiNN_console.html on --domain export', async () => {
    const res = await runExportConsole([tempDir, '--domain', '--no-open'], { open: false })
    assert.equal(res.exitCode, 0, `export failed: ${res.stderr}`)

    const consolePath = join(tempDir, 'domaiNN_console.html')
    assert.ok(existsSync(consolePath), 'domaiNN_console.html should exist')

    const html = await readFile(consolePath, 'utf8')
    const dom = new JSDOM(html)
    const modelScript = dom.window.document.getElementById('nn-model')
    assert.ok(modelScript, '#nn-model script tag should exist')

    const files = JSON.parse(modelScript.textContent).files
    assert.ok(files, 'model.files must be defined')
    assert.ok(Array.isArray(files.inventory), 'files.inventory must be an array')

    const specEntry = files.inventory.find((e) => e.path === 'sources/import/spec.md')
    assert.ok(specEntry, 'sources/import/spec.md should be in inventory')
    assert.equal(specEntry.category, 'source', 'sources/import is a source, not an imported domain')
    assert.equal(specEntry.mimeType, 'text/markdown')
    assert.equal(specEntry.sha256, sha('# Core Engine Spec\nEngine specification details.'))
    assert.equal(specEntry.uncited, false, 'spec.md is cited by core-engine')
    assert.equal(specEntry.citationsCount, 1)
    assert.equal(specEntry.sidecar.exists, true)
    assert.equal(specEntry.sidecar.path, 'sources/import/spec.md_sidecar_NN.md')
    assert.equal(specEntry.sidecar.valid, true)
    assert.equal(specEntry.sidecar.sha256Matches, true)

    const driftEntry = files.inventory.find((e) => e.path === 'sources/import/drift.md')
    assert.equal(driftEntry.sidecar.sha256Matches, false, 'drifted digest must be reported')

    const orphanEntry = files.inventory.find((e) => e.path === 'sources/import/orphan.txt')
    assert.equal(orphanEntry.uncited, true, 'orphan.txt should be uncited')
    assert.equal(orphanEntry.sidecar.exists, false)

    const assetEntry = files.inventory.find((e) => e.path === 'sources/assets/arch.png')
    assert.equal(assetEntry.category, 'asset', 'media under sources/ keeps the asset category')
    assert.equal(assetEntry.snippet, undefined, 'binaries are never inlined')

    // Sidecars are metadata, never inventory rows of their own.
    assert.equal(
      files.inventory.some((e) => /_sidecar_NN\.md$/.test(e.path)),
      false,
      'sidecar documents must not appear as files',
    )

    assert.deepEqual(files.origins, [], 'no Synchronization and no sidecar origin keys: no origins')
    assert.equal('watchRoots' in files, false, 'the payload has no watchRoots')

    assert.ok(files.stats, 'files.stats must be defined')
    assert.equal(files.stats.totalFiles, files.inventory.length)
    assert.equal(typeof files.stats.totalBytes, 'number')
    assert.ok(files.stats.categoryCounts)
    assert.ok(files.stats.storageByCategory)
    assert.equal('watch_root' in files.stats.categoryCounts, false)
    assert.equal('imported_domain' in files.stats.categoryCounts, false)
    assert.equal(typeof files.stats.sourceCoverageRate, 'number')
    assert.ok(files.stats.sourceCoverageRate <= 1 && files.stats.sourceCoverageRate >= 0)
    assert.equal(files.stats.uncitedSourceCount, 2, 'orphan.txt and drift.md are both uncited')
    assert.equal(files.stats.sidecarMissingCount, 1)
    assert.equal(files.stats.sidecarMismatchCount, 1)

    assert.ok(files.lineage, 'files.lineage must be defined')
    const artLineage = files.lineage['artifacts/summary.html']
    assert.ok(artLineage, 'lineage for artifacts/summary.html must exist')
    assert.ok(artLineage.unitIds.includes('core-engine'))
  })

  it('is deterministic: two exports of unchanged files produce identical files payloads', async () => {
    const first = await collectWorkspaceFiles(tempDir, { elements: [], changesets: [] })
    const second = await collectWorkspaceFiles(tempDir, { elements: [], changesets: [] })
    assert.deepEqual(first, second, 'no wall-clock timestamps may leak into the payload')
  })

  it('never derives an origin from a folder name', async () => {
    await mkdir(join(tempDir, 'external'), { recursive: true })
    await writeFile(join(tempDir, 'external', 'note.txt'), 'outside the layout', 'utf8')
    const files = await collectWorkspaceFiles(tempDir, { elements: [], changesets: [] })
    assert.deepEqual(files.origins, [])
    assert.equal('watchRoots' in files, false)
  })

  it('builds origins from the Synchronization catalog and the mirror files', async () => {
    await mkdir(join(tempDir, 'sources', 'sync', 'org'), { recursive: true })
    await writeFile(join(tempDir, 'sources', 'sync', 'org', 'organization_NN.md'), '# Organization\n', 'utf8')
    await writeFile(
      join(tempDir, 'sources', 'sources_NN.md'),
      [
        '---',
        'level: 3',
        'parent_spec:',
        '  name: "sources"',
        'knowledge_version: "V_0-1-0"',
        'title: "Sources"',
        '---',
        '',
        '# NN index',
        '',
        '* [[Synchronization]]',
        '',
        '# NN Synchronization',
        '',
        '## NN Synchronization: Organization',
        '  alias:: org',
        '  origin_uri:: ../organization',
        '  kind:: folder',
        '  state:: active',
        '',
      ].join('\n'),
      'utf8',
    )
    const files = await collectWorkspaceFiles(tempDir, { elements: [], changesets: [] })
    assert.deepEqual(files.origins, [
      {
        id: 'org',
        alias: 'org',
        origin: '../organization',
        kind: 'folder',
        state: 'active',
        files: ['sources/sync/org/organization_NN.md'],
      },
    ])
    const mirror = files.inventory.find((e) => e.path === 'sources/sync/org/organization_NN.md')
    assert.equal(mirror.category, 'source')
    assert.equal(mirror.sidecar, undefined, 'a mirror has no sidecar by design')
    // Only orphan.txt: the mirror and the catalog are models, exempt from sidecars.
    assert.equal(files.stats.sidecarMissingCount, 1, 'mirrored models and the catalog are not sidecar gaps')
  })

  it('bounds preview snippets per file and globally', async () => {
    const big = 'x'.repeat(20000)
    await writeFile(join(tempDir, 'sources', 'import', 'big.md'), big, 'utf8')
    const files = await collectWorkspaceFiles(tempDir, { elements: [], changesets: [] })
    const bigEntry = files.inventory.find((e) => e.path === 'sources/import/big.md')
    assert.ok(bigEntry.snippet, 'text files keep a bounded preview')
    assert.equal(bigEntry.snippetTruncated, true)
    assert.ok(bigEntry.snippet.length <= 500, `preview must stay within the excerpt cap, got ${bigEntry.snippet.length}`)
  })

  it('cuts a preview between code points instead of emitting a replacement glyph', async () => {
    // 499 single-byte characters put the 500-byte preview cut inside the two-byte 'é'.
    const body = 'a'.repeat(499) + 'é' + 'b'.repeat(100)
    await writeFile(join(tempDir, 'sources', 'import', 'multibyte.md'), body, 'utf8')
    const files = await collectWorkspaceFiles(tempDir, { elements: [], changesets: [] })
    const entry = files.inventory.find((e) => e.path === 'sources/import/multibyte.md')
    assert.ok(entry, 'multibyte.md should be in the inventory')
    assert.equal(entry.snippet.includes('\uFFFD'), false, 'a cut inside a code point must not emit U+FFFD')
    assert.equal(entry.snippet, 'a'.repeat(499), 'the incomplete trailing sequence is withheld')
    assert.equal(entry.snippetTruncated, true)
  })

  it('keeps a preview that ends exactly on a code-point boundary unchanged', async () => {
    const body = 'a'.repeat(500) + 'é' + 'b'.repeat(100)
    await writeFile(join(tempDir, 'sources', 'import', 'boundary.md'), body, 'utf8')
    const files = await collectWorkspaceFiles(tempDir, { elements: [], changesets: [] })
    const entry = files.inventory.find((e) => e.path === 'sources/import/boundary.md')
    assert.ok(entry, 'boundary.md should be in the inventory')
    assert.equal(entry.snippet, 'a'.repeat(500), 'a cut on a code-point boundary keeps the whole prefix')
    assert.equal(entry.snippet.includes('\uFFFD'), false)
    assert.equal(entry.snippetTruncated, true)
  })

  it('counts a citation only for the path it names, not for same-named siblings', async () => {
    await seedSameNamedSources()
    const files = await collectWorkspaceFiles(tempDir, {
      elements: [{ id: 'u1', citations: { sources: [{ path: 'sources/import/alpha/spec.md' }] } }],
      changesets: [],
    })
    const alpha = files.inventory.find((e) => e.path === 'sources/import/alpha/spec.md')
    const beta = files.inventory.find((e) => e.path === 'sources/import/beta/spec.md')
    assert.equal(alpha.citationsCount, 1, 'the cited path keeps its count')
    assert.equal(beta.citationsCount, 0, 'a same-named sibling must not inherit the citation')
  })

  it('counts change evidence only for the path it names, not for same-named siblings', async () => {
    await seedSameNamedSources()
    const files = await collectWorkspaceFiles(tempDir, {
      elements: [],
      changesets: [{ id: 'c1', evidence: 'sources/import/alpha/spec.md' }],
    })
    const alpha = files.inventory.find((e) => e.path === 'sources/import/alpha/spec.md')
    const beta = files.inventory.find((e) => e.path === 'sources/import/beta/spec.md')
    assert.equal(alpha.changesCount, 1, 'the named path keeps its change count')
    assert.equal(beta.changesCount, 0, 'a same-named sibling must not inherit the change count')
  })

  it('counts a bare-basename reference when that name is unique, in both loops', async () => {
    await seedSameNamedSources()
    const files = await collectWorkspaceFiles(tempDir, {
      elements: [{ id: 'u1', citations: { sources: [{ path: 'orphan.txt' }] } }],
      changesets: [{ id: 'c1', evidence: 'orphan.txt' }],
    })
    const orphan = files.inventory.find((e) => e.path === 'sources/import/orphan.txt')
    assert.equal(orphan.citationsCount, 1, 'an unambiguous bare citation still counts')
    assert.equal(orphan.changesCount, 1, 'an unambiguous bare change evidence still counts')
    assert.equal(orphan.uncited, false)
  })

  it('does not count an ambiguous bare-basename reference for any same-named file', async () => {
    await seedSameNamedSources()
    const files = await collectWorkspaceFiles(tempDir, {
      elements: [{ id: 'u1', citations: { sources: [{ path: 'spec.md' }] } }],
      changesets: [{ id: 'c1', evidence: 'spec.md' }],
    })
    for (const p of ['sources/import/alpha/spec.md', 'sources/import/beta/spec.md']) {
      const entry = files.inventory.find((e) => e.path === p)
      assert.equal(entry.citationsCount, 0, `${p} must not receive an ambiguous citation`)
      assert.equal(entry.changesCount, 0, `${p} must not receive an ambiguous change count`)
    }
  })

  it('supports --no-files flag to omit files precomputation', async () => {
    const res = await runExportConsole([tempDir, '--domain', '--no-files', '--no-open'], { open: false })
    assert.equal(res.exitCode, 0)

    const html = await readFile(join(tempDir, 'domaiNN_console.html'), 'utf8')
    const dom = new JSDOM(html)
    const modelScript = dom.window.document.getElementById('nn-model')
    assert.equal(JSON.parse(modelScript.textContent).files, undefined)
  })

  it('includes files inventory on --filter scoped builds', async () => {
    const res = await runExportConsole([tempDir, '--filter', 'system', '--no-open'], { open: false })
    assert.equal(res.exitCode, 0, `filter export failed: ${res.stderr}`)

    const scopedHtmlPath = join(tempDir, 'artifacts', 'system_console', 'system_console.html')
    assert.ok(existsSync(scopedHtmlPath), 'artifacts/system_console/system_console.html should exist')

    const html = await readFile(scopedHtmlPath, 'utf8')
    const dom = new JSDOM(html)
    const modelScript = dom.window.document.getElementById('nn-model')
    const payload = JSON.parse(modelScript.textContent)
    assert.ok(payload.files, 'scoped console must contain model.files')
    assert.ok(payload.files.inventory.length >= 5)
  })
})
