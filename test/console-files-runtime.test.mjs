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
  origins: [
    {
      id: 'org',
      alias: 'org',
      origin: '/shared/org',
      kind: 'folder',
      state: 'active',
      files: ['sources/import/spec.md'],
    },
  ],
  stats: {
    totalFiles: 3,
    totalBytes: 6656,
    categoryCounts: { source: 2, asset: 0, evidence: 0, artifact: 1, unclassified: 0 },
    storageByCategory: { source: 2560, asset: 0, evidence: 0, artifact: 4096, unclassified: 0 },
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
    assert.ok(panel.querySelector('.nn-origins-table'), 'origins table renders')
    assert.ok(panel.querySelector('.nn-origins-table').textContent.includes('org'))
    assert.equal(panel.querySelector('.nn-watch-table'), null, 'no watch roots table')
    assert.ok(!/Watch roots|Watch Folders|Imported Domains/.test(panel.textContent), 'no legacy wording')
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

  it('shows Unclassified only when a file has that category', () => {
    const headersOf = (model) => {
      const document = bootFromShell(model)
      document.querySelector('.nn-view-tab[data-tab="files"]').click()
      return [...document.querySelectorAll('.nn-category-header')].map((h) => h.textContent)
    }
    assert.ok(!headersOf(FILES_MODEL).some((h) => h.includes('Unclassified')))
    const loose = {
      id: 'misc/loose.bin',
      path: 'misc/loose.bin',
      category: 'unclassified',
      size: 10,
      sha256: 'd'.repeat(64),
      mimeType: 'application/octet-stream',
      citationsCount: 0,
      excerptCount: 0,
      changesCount: 0,
      uncited: false,
    }
    const withLoose = { ...FILES_MODEL, files: { ...FILES_PAYLOAD, inventory: [...FILES_PAYLOAD.inventory, loose] } }
    assert.ok(headersOf(withLoose).some((h) => h.includes('Unclassified')))
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

  it('switches to the pipeline view and selects a source by click', () => {
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
    assert.equal(changeStage.querySelectorAll('.nn-pipeline-node').length, 1, 'changes come from the domain changesets')
    assert.ok(changeStage.textContent.includes('Initial change'), 'the changeset title is shown')

    // Nodes are badges, never cards: units keep the canonical Ku badge.
    const unitNodes = [...stages]
      .find((s) => s.textContent.includes('Units'))
      .querySelectorAll('.nn-pipeline-node')
    assert.ok(unitNodes.length > 0, 'units stage has nodes')
    assert.ok(unitNodes[0].querySelector('.nn-ku-wrap [data-nn-component="ku-unit"]'), 'unit nodes use the Ku badge')
    const unitKebab = unitNodes[0].querySelector('.nn-ku-more')
    assert.ok(unitKebab, 'unit nodes expose the official Ku affordance')
    unitKebab.click()
    assert.ok(
      !unitNodes[0].classList.contains('nn-pipeline-selected'),
      'the badge kebab acts on the unit and never selects the node',
    )

    const sourceNode = [...pipeline.querySelectorAll('.nn-pipeline-node')].find((n) =>
      n.textContent.includes('spec.md'),
    )
    // Hover no longer traces: selection is an explicit click.
    sourceNode.dispatchEvent(new document.defaultView.Event('mouseenter'))
    assert.ok(!sourceNode.classList.contains('nn-pipeline-selected'), 'hover does not select')
    sourceNode.click()
    assert.ok(sourceNode.classList.contains('nn-pipeline-selected'), 'click selects the node')
    assert.equal(sourceNode.getAttribute('aria-pressed'), 'true')
    assert.equal(sourceNode.style.order, '-2', 'selected node is ordered first (-2)')
    const artifactNode = [...pipeline.querySelectorAll('.nn-pipeline-node')].find((n) =>
      n.textContent.includes('summary.html'),
    )
    assert.ok(artifactNode && !artifactNode.classList.contains('dimmed'), 'lineage link stays lit')
    assert.equal(artifactNode.style.order, '-1', 'connected node in artifact stage floats to top (-1)')
    assert.ok(artifactNode.classList.contains('nn-pipeline-connected'), 'connected node gets connected class')
    sourceNode.click()
    assert.ok(!sourceNode.classList.contains('nn-pipeline-selected'), 'second click clears the selection')
    assert.equal(sourceNode.style.order, '', 'clearing restores natural order')
    assert.equal(artifactNode.style.order, '', 'clearing restores connected node order')
  })

  it('hides the Origins stage and card when there are no origins', () => {
    const model = { ...FILES_MODEL, files: { ...FILES_PAYLOAD, origins: [] } }
    const document = bootFromShell(model)
    document.querySelector('.nn-view-tab[data-tab="files"]').click()
    const panel = document.getElementById('nn-tab-files')
    assert.equal(panel.querySelector('.nn-origins-table'), null, 'no origins card')
    document.getElementById('nn-files-mode-pipeline').click()
    const stages = [...document.getElementById('nn-files-pipeline').querySelectorAll('.nn-pipeline-stage')]
    assert.equal(stages.length, 4)
    assert.ok(!stages.some((st) => st.textContent.includes('Origins')))
  })

  it('builds the Origins stage from origins[].files and traces to its files', () => {
    const document = bootFromShell(FILES_MODEL)
    document.querySelector('.nn-view-tab[data-tab="files"]').click()
    document.getElementById('nn-files-mode-pipeline').click()
    const pipeline = document.getElementById('nn-files-pipeline')
    const originNode = pipeline.querySelector('.nn-pipeline-node[data-node="origin:org"]')
    assert.ok(originNode, 'one node per origin')
    originNode.click()
    const lit = (path) => pipeline.querySelector('.nn-pipeline-node[data-node="file:' + path + '"]')
    assert.ok(lit('sources/import/spec.md').classList.contains('nn-pipeline-connected'), 'attributed file is connected')
    assert.ok(!lit('sources/import/orphan.txt').classList.contains('nn-pipeline-connected'), 'other files are not')
  })

  it('shows the Files tab for origins only', () => {
    const model = { ...FILES_MODEL, files: { ...FILES_PAYLOAD, inventory: [] } }
    const document = bootFromShell(model)
    assert.ok(document.querySelector('.nn-view-tab[data-tab="files"]'), 'files tab exists')
  })

  it('opens the unit modal when clicking the three vertical dots on a pipeline unit node', () => {
    const document = bootFromShell(FILES_MODEL)
    document.querySelector('.nn-view-tab[data-tab="files"]').click()
    document.getElementById('nn-files-mode-pipeline').click()
    const pipeline = document.getElementById('nn-files-pipeline')
    const unitNode = pipeline.querySelector('.nn-pipeline-node[data-node^="unit:"]')
    assert.ok(unitNode, 'unit node exists')
    // Click unit node to select it first (as reported by user)
    unitNode.click()
    assert.ok(unitNode.classList.contains('nn-pipeline-selected'), 'unit node is selected')
    const moreBtn = unitNode.querySelector('[data-ku-more]')
    assert.ok(moreBtn, 'kebab button exists')
    const beforeModal = document.querySelector('dialog[open], .nn-modal, [data-nn-component="edit-modal"], [data-nn-component="ku-info-panel"]')
    assert.equal(beforeModal, null, 'no modal before clicking kebab')
    moreBtn.click()
    const modal = document.querySelector('dialog[open], .nn-modal, [data-nn-component="edit-modal"], [data-nn-component="ku-info-panel"]')
    assert.ok(modal, 'modal is opened after clicking kebab')
  })

  it('renders formal badges with icons and semantic kind for origins, sources, changes, and artifacts', () => {
    const document = bootFromShell(FILES_MODEL)
    document.querySelector('.nn-view-tab[data-tab="files"]').click()
    document.getElementById('nn-files-mode-pipeline').click()
    const pipeline = document.getElementById('nn-files-pipeline')

    // Origins badge check
    const originBadge = pipeline.querySelector('.nn-pipeline-stage:nth-child(1) .nn-ku[data-ku-kind="origin"]')
    assert.ok(originBadge, 'origins stage uses data-ku-kind="origin"')
    assert.equal(originBadge.getAttribute('data-ku-nature'), 'container')
    assert.ok(originBadge.querySelector('.nn-ku-icon'), 'origin badge has icon')

    // Sources badge check
    const sourceBadge = pipeline.querySelector('.nn-pipeline-stage:nth-child(2) .nn-ku[data-ku-kind="source"]')
    assert.ok(sourceBadge, 'sources stage uses data-ku-kind="source"')
    assert.equal(sourceBadge.getAttribute('data-ku-nature'), 'content')
    assert.ok(sourceBadge.querySelector('.nn-ku-icon'), 'source badge has icon')

    // Changes badge check
    const changeBadge = pipeline.querySelector('.nn-pipeline-stage:nth-child(3) .nn-ku[data-ku-kind="change"]')
    assert.ok(changeBadge, 'changes stage uses data-ku-kind="change"')
    assert.equal(changeBadge.getAttribute('data-ku-nature'), 'container')
    assert.ok(changeBadge.querySelector('.nn-ku-icon'), 'change badge has icon')

    // Artifacts badge check
    const artifactBadge = pipeline.querySelector('.nn-pipeline-stage:nth-child(5) .nn-ku[data-ku-kind="artifact"]')
    assert.ok(artifactBadge, 'artifacts stage uses data-ku-kind="artifact"')
    assert.equal(artifactBadge.getAttribute('data-ku-nature'), 'content')
    assert.ok(artifactBadge.querySelector('.nn-ku-icon'), 'artifact badge has icon')
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
