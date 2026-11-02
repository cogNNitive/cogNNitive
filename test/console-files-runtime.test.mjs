import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { consoleDir, nnConsole, MODEL } from './helpers/console-boot.mjs'

const FILES_PAYLOAD = {
  inventory: [
    {
      id: 'sources/import/spec.md',
      path: 'sources/import/spec.md',
      category: 'source',
      size: 2048,
      sha256: 'a'.repeat(64),
      mimeType: 'text/markdown',
      mtime: '2026-11-01T10:00:00.000Z',
      sidecar: { path: 'sources/import/spec.md_sidecar_NN.md', exists: true, valid: true, sha256Matches: true },
      citationsCount: 1,
      excerptCount: 1,
      changesCount: 0,
      uncited: false,
      snippet: '# Spec\n<script>alert(1)</script>',
      snippetTruncated: false,
    },
    {
      id: 'sources/import/orphan.txt',
      path: 'sources/import/orphan.txt',
      category: 'source',
      size: 512,
      sha256: 'b'.repeat(64),
      mimeType: 'text/plain',
      mtime: '2026-11-01T09:00:00.000Z',
      sidecar: { path: 'sources/import/orphan.txt_sidecar_NN.md', exists: false, valid: false },
      citationsCount: 0,
      excerptCount: 0,
      changesCount: 0,
      uncited: true,
      snippet: 'orphan',
      snippetTruncated: false,
    },
    {
      id: 'artifacts/summary.html',
      path: 'artifacts/summary.html',
      category: 'artifact',
      size: 4096,
      sha256: 'c'.repeat(64),
      mimeType: 'text/html',
      mtime: '2026-11-01T11:00:00.000Z',
      citationsCount: 0,
      excerptCount: 0,
      changesCount: 0,
      uncited: false,
      snippet: '<html>summary</html>',
      snippetTruncated: false,
    },
  ],
  watchRoots: [{ path: 'sources', status: 'active', fileCount: 2, lastSync: '2026-11-01T10:00:00.000Z' }],
  stats: {
    totalFiles: 3,
    totalBytes: 6656,
    categoryCounts: { watch_root: 1, source: 2, imported_domain: 0, asset: 0, evidence: 0, artifact: 1 },
    storageByCategory: { watch_root: 0, source: 2560, imported_domain: 0, asset: 0, evidence: 0, artifact: 4096 },
    sourceCoverageRate: 0.5,
    uncitedSourceCount: 1,
    sidecarMissingCount: 1,
    sidecarInvalidCount: 0,
    sidecarMismatchCount: 0,
    excerptCount: 1,
  },
  lineage: {
    'artifacts/summary.html': {
      artifactId: 'artifacts/summary.html',
      artifactPath: 'artifacts/summary.html',
      unitIds: ['ecto-1'],
      changesetIds: ['2026-10-01-initial'],
      sourcePaths: ['sources/import/spec.md'],
    },
  },
}

const FILES_MODEL = {
  ...MODEL,
  elements: [
    {
      ...MODEL.elements[0],
      citations: { source: [{ path: 'sources/import/spec.md', excerpt: 'Engine specification details.' }] },
    },
  ],
  changes: [
    {
      path: 'changes/2026-10-01-initial_changes_NN.md',
      title: 'Initial change',
      status: 'applied',
      changes: [{ target: 'ecto-1', op: 'create' }],
    },
  ],
  matrices: [],
  files: FILES_PAYLOAD,
}

function bootFromShell(model) {
  const shell = readFileSync(join(consoleDir, 'artifact_shell.html'), 'utf8')
  const html = shell
    .replace(/<script\s+src=[^>]*><\/script>/g, '')
    .replace(
      /(<script type="application\/json" id="nn-model">)[\s\S]*?(<\/script>)/,
      (_m, open, close) => open + JSON.stringify(model).replace(/</g, '\\u003c') + close,
    )
    .replace(
      /(<script type="application\/json" id="nn-schema">)[\s\S]*?(<\/script>)/,
      (_m, open, close) => open + JSON.stringify({ concepts: [{ name: 'Fleet' }] }) + close,
    )
  const dom = new JSDOM(html, { url: 'http://localhost' })
  global.window = dom.window
  global.document = dom.window.document
  global.localStorage = dom.window.localStorage
  global.CustomEvent = dom.window.CustomEvent
  nnConsole.boot(dom.window.document)
  return dom.window.document
}

describe('Files tab runtime', () => {
  it('registers the tab after Knowledge and before Matrices', () => {
    const document = bootFromShell({ ...FILES_MODEL, matrices: MODEL.matrices })
    const order = [...document.querySelectorAll('.nn-view-tab')].map((b) => b.dataset.tab)
    assert.ok(order.includes('files'), 'files tab is registered')
    assert.ok(order.indexOf('files') > order.indexOf('explorer'), 'files follows knowledge')
    assert.ok(order.indexOf('files') < order.indexOf('matrices'), 'files precedes matrices')
  })

  it('is suppressed when the payload carries no files', () => {
    const document = bootFromShell(MODEL)
    assert.equal(document.querySelector('.nn-view-tab[data-tab="files"]'), null)
  })

  it('renders the workspace dashboard by default', () => {
    const document = bootFromShell(FILES_MODEL)
    document.querySelector('.nn-view-tab[data-tab="files"]').click()
    const panel = document.getElementById('nn-tab-files')
    assert.ok(panel.classList.contains('active'))
    assert.equal(panel.hasAttribute('hidden'), false, 'the hidden attribute is cleared')
    const kpis = panel.querySelectorAll('.nn-kpi-card')
    assert.equal(kpis.length, 4, 'four KPI cards')
    assert.ok(panel.querySelector('.nn-storage-bar'), 'storage distribution renders')
    assert.ok(panel.querySelector('.nn-watch-table'), 'watch roots table renders')
    assert.ok(panel.querySelector('.nn-integrity-alert'), 'integrity signals render')
  })

  it('lists files by category and opens a per-file detail card', () => {
    const document = bootFromShell(FILES_MODEL)
    document.querySelector('.nn-view-tab[data-tab="files"]').click()
    const rows = document.querySelectorAll('.nn-file-row')
    assert.equal(rows.length, 3, 'one row per inventory entry')
    const headers = [...document.querySelectorAll('.nn-category-header')].map((h) => h.textContent)
    assert.ok(headers.some((h) => h.includes('Sources')))
    assert.ok(headers.some((h) => h.includes('Artifacts')))

    document.querySelector('.nn-file-row[data-path="sources/import/spec.md"]').click()
    const detail = document.getElementById('nn-files-detail')
    assert.ok(detail.querySelector('.nn-file-detail-card'), 'detail card renders')
    assert.ok(detail.textContent.includes('sources/import/spec.md'))
    assert.ok(detail.querySelector('.nn-ku'), 'citing unit renders as a canonical Ku badge')
    // Read-only invariant: no mutation affordances.
    assert.equal(detail.querySelector('input, textarea, [contenteditable="true"]'), null)

    // Back to the dashboard.
    detail.querySelector('.nn-file-detail-breadcrumb a').click()
    assert.ok(document.getElementById('nn-files-detail').querySelector('.nn-files-dashboard'))
  })

  it('opens the preview dialog with inert content', () => {
    const document = bootFromShell(FILES_MODEL)
    document.querySelector('.nn-view-tab[data-tab="files"]').click()
    document.querySelector('.nn-file-row[data-path="sources/import/spec.md"]').click()
    const open = [...document.querySelectorAll('#nn-files-detail button')].find((b) =>
      /Preview/.test(b.textContent),
    )
    assert.ok(open, 'preview action exists')
    open.click()
    const dialog = document.getElementById('nn-file-preview-dialog')
    assert.ok(dialog.hasAttribute('open'), 'dialog opens')
    const code = dialog.querySelector('.nn-file-preview-code code')
    assert.ok(code, 'text content renders in a code block')
    assert.equal(code.querySelector('script'), null, 'file content never parses as markup')
    assert.ok(code.textContent.includes('<script>alert(1)</script>'), 'content stays literal text')
  })

  it('switches to the pipeline view and traces a source', () => {
    const document = bootFromShell(FILES_MODEL)
    document.querySelector('.nn-view-tab[data-tab="files"]').click()
    document.getElementById('nn-files-mode-pipeline').click()
    const pipeline = document.getElementById('nn-files-pipeline')
    assert.notEqual(pipeline.style.display, 'none')
    const stages = pipeline.querySelectorAll('.nn-pipeline-stage')
    assert.equal(stages.length, 5, '5 stages')
    assert.ok(pipeline.textContent.includes('Origins'))
    assert.ok(pipeline.textContent.includes('Artifacts'))
    const changeStage = [...stages].find((s) => s.textContent.includes('Changes'))
    assert.equal(changeStage.querySelectorAll('.nn-pipeline-card').length, 1, 'changes come from the domain changesets')
    assert.ok(changeStage.textContent.includes('Initial change'), 'the changeset title is shown')

    const sourceCard = [...pipeline.querySelectorAll('.nn-pipeline-card')].find((c) =>
      c.textContent.includes('spec.md'),
    )
    sourceCard.dispatchEvent(new document.defaultView.Event('mouseenter'))
    assert.ok(sourceCard.classList.contains('nn-pipeline-highlight'))
    const artifactCard = [...pipeline.querySelectorAll('.nn-pipeline-card')].find((c) =>
      c.textContent.includes('summary.html'),
    )
    assert.ok(artifactCard && !artifactCard.classList.contains('dimmed'), 'lineage link stays lit')
  })

  it('deep-links to a file through #files&path=', () => {
    const document = bootFromShell(FILES_MODEL)
    document.location.hash = '#files&path=' + encodeURIComponent('sources/import/orphan.txt')
    document.defaultView.dispatchEvent(new document.defaultView.Event('hashchange'))
    const panel = document.getElementById('nn-tab-files')
    assert.ok(panel.classList.contains('active'), 'files tab activates from the hash')
    const detail = document.getElementById('nn-files-detail')
    assert.ok(detail.textContent.includes('sources/import/orphan.txt'), 'the deep-linked file is selected')
  })
})
