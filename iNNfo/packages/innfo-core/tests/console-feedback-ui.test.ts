// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'

import { installDialogStub } from './helpers/dialog-stub'
const req = createRequire(import.meta.url)
const consoleDir = join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts', 'console')
const modelConsolePath = join(consoleDir, 'artifact_shell.html')

type ConsoleApi = {
  boot: (doc: Document) => any
  ensureFeedbackUi: (doc: Document, state?: any) => HTMLElement | null
  renderNavbarIdentity: (doc: Document, meta: any) => void
  composeExport: (state: any, identifier?: string) => any
}

const sampleSchema = {
  concepts: [{ name: 'ParanormalThreat' }, { name: 'ContainmentEquipment' }],
}

const sampleModel = {
  meta: {
    modelId: 'ghostbusters-model',
    title: 'GhostbustersModel',
    modelVersion: 'V_0-2-1',
    changesBlueprintVersion: 'V_0-3-0',
    sha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  },
  elements: [
    {
      id: 'threat-slimer',
      concept: 'ParanormalThreat',
      name: 'Slimer',
      description: 'Green potato ghost',
      hash: 'abcdef0123456789',
      fields: { severity: 'Class V' },
      citations: {
        severity: [
          {
            origin: 'document',
            path: 'sources/canon.md',
            sha256: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
          },
        ],
      },
    },
    {
      id: 'equip-trap',
      concept: 'ContainmentEquipment',
      name: 'Ghost Trap',
      description: 'High voltage trap',
      hash: 'fedcba9876543210',
      fields: {},
    },
  ],
  matrices: [],
}

function renderModelConsole(overrideConfig?: any, overrideMeta?: any): void {
  const html = readFileSync(modelConsolePath, 'utf8')
  const modelToUse = overrideMeta
    ? Object.assign({}, sampleModel, { meta: overrideMeta })
    : sampleModel
  const filled = html
    .replace(
      /(<script type="application\/json" id="innfo-schema">)[\s\S]*?(<\/script>)/,
      `$1${JSON.stringify(sampleSchema)}$2`,
    )
    .replace(
      /(<script type="application\/json" id="innfo-model">)[\s\S]*?(<\/script>)/,
      `$1${JSON.stringify(modelToUse)}$2`,
    )
    .replace(
      /(<script type="application\/json" id="innfo-config">)[\s\S]*?(<\/script>)/,
      overrideConfig ? `$1${JSON.stringify(overrideConfig)}$2` : '$1{"needs":["feedback-export","concept-rail","fulltext-search"]}$2',
    )
    .replace(/<script\b[^>]*\bsrc=[^>]*><\/script>/g, '')
  document.documentElement.innerHTML = filled
}

function loadRuntime(): ConsoleApi {
  // Clear require cache for clean evaluation
  delete req.cache[req.resolve(join(consoleDir, 'innfo-runtime.js'))]
  const api = req(join(consoleDir, 'innfo-runtime.js')) as ConsoleApi
  const ui = req(join(consoleDir, 'ui-kit.js'))
  ;(globalThis as any).InnfoConsole = api
  ;(window as any).InnfoConsole = api
  ;(globalThis as any).InnfoUI = ui
  ;(window as any).InnfoUI = ui
  return api
}

describe('console-feedback-ui (bundle-injected feedback UI contract)', () => {
  beforeEach(() => {
    localStorage.clear()
    installDialogStub()
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('injects single [data-innfo-feedback-root] and #innfo-feedback-open when evaluated twice', () => {
    renderModelConsole()

    // First evaluation
    const api1 = loadRuntime()
    api1.boot(document)

    // Second evaluation (simulating second bundle load)
    const api2 = loadRuntime()
    api2.boot(document)

    const roots = document.querySelectorAll('[data-innfo-feedback-root]')
    expect(roots.length).toBe(1)

    const openBtns = document.querySelectorAll('#innfo-feedback-open')
    expect(openBtns.length).toBe(1)

    const modals = document.querySelectorAll('#innfo-feedback-modal')
    expect(modals.length).toBe(1)
  })

  it('calls showModal once per click on #innfo-feedback-open', () => {
    renderModelConsole()
    const api = loadRuntime()
    api.boot(document)

    const modal = document.getElementById('innfo-feedback-modal') as HTMLDialogElement
    const showModalSpy = vi.spyOn(modal, 'showModal')

    const openBtn = document.getElementById('innfo-feedback-open')!
    openBtn.dispatchEvent(new Event('click', { bubbles: true }))

    expect(showModalSpy).toHaveBeenCalledTimes(1)
  })

  it('composeExport builds a changeset document and no JSON payload', () => {
    renderModelConsole()
    const api = loadRuntime()
    api.boot(document)

    const storeKey = 'innfo-console:v3:ghostbusters-model'
    const existing = JSON.parse(localStorage.getItem(storeKey) || '{"v":4,"modelId":"ghostbusters-model","drafts":[],"reviewed":{}}')
    existing.drafts.push({
      id: 'fb-001',
      element_id: 'threat-slimer',
      concept: 'ParanormalThreat',
      element: 'Slimer',
      field: 'severity',
      base_hash: 'abcdef0123456789',
      kind: 'correction',
      comment: 'Change severity to Class VII',
      created_at: '2026-10-02T12:00:00Z',
    })
    localStorage.setItem(storeKey, JSON.stringify(existing))

    // Re-boot so the controller reads the seeded store.
    api.boot(document)
    const composed = api.composeExport(
      { store: { drafts: () => JSON.parse(localStorage.getItem(storeKey) || '{}').drafts }, modelId: 'ghostbusters-model', modelTitle: 'GhostbustersModel', modelVersion: 'V_0-2-1', meta: { changesBlueprintVersion: 'V_0-3-0' } },
      'Egon Spengler',
    )
    expect(composed.ok).toBe(true)
    expect(composed.changesetText).toContain('## NN Change: fb-001')
    expect(composed.changesetFilename).toMatch(/_changes_NN\.md$/)
    expect((composed as any).text).toBeUndefined()
    expect((composed as any).payload).toBeUndefined()
  })

  it('injects nothing when feedback-export is not declared in needs', () => {
    renderModelConsole({ needs: ['concept-rail', 'fulltext-search'] })
    const api = loadRuntime()
    api.boot(document)

    expect(document.querySelector('[data-innfo-feedback-root]')).toBeNull()
    expect(document.getElementById('innfo-feedback-open')).toBeNull()
    expect(document.getElementById('innfo-feedback-modal')).toBeNull()
  })

  it('coexists with procedure stepper #innfo-export-modal', () => {
    renderModelConsole()

    // Simulate procedure stepper modal already on the page
    const stepperModal = document.createElement('dialog')
    stepperModal.id = 'innfo-export-modal'
    stepperModal.className = 'stepper-dialog'
    document.body.appendChild(stepperModal)

    const api = loadRuntime()
    api.boot(document)

    expect(document.getElementById('innfo-export-modal')).toBe(stepperModal)
    expect(document.getElementById('innfo-feedback-modal')).not.toBeNull()
    expect(document.getElementById('innfo-feedback-modal')).not.toBe(stepperModal)
  })

  it('never shows a store-level staleness banner, whatever the persisted store holds', () => {
    renderModelConsole({ needs: ['feedback-export'] })
    // A store persisted under the current version, carrying drafts whose element
    // hash has since moved: staleness is per draft, surfaced in the review tab,
    // never by the banner.
    localStorage.setItem(
      'innfo-console:v3:ghostbusters-model',
      JSON.stringify({
        v: 4,
        modelId: 'ghostbusters-model',
        drafts: [
          {
            id: 'fb-001',
            element_id: 'threat-slimer',
            concept: 'ParanormalThreat',
            element: 'Slimer',
            base_hash: 'stale____________',
            kind: 'comment',
            comment: 'stale rewrite',
          },
        ],
        reviewed: {},
      }),
    )
    const api = loadRuntime()
    api.boot(document)
    expect(document.querySelector('#innfo-feedback-banner .innfo-banner-stale')).toBeNull()
    expect(document.querySelector('[data-innfo="stale-feedback"]')).toBeNull()
  })

  it('does not leak the config needs[] list into the review banner', () => {
    renderModelConsole()
    const api = loadRuntime()
    api.boot(document)
    const banner = document.getElementById('innfo-feedback-banner')
    expect(banner).not.toBeNull()
    expect(banner!.querySelector('.innfo-banner-needs')).toBeNull()
    expect(banner!.textContent).not.toContain('needs:')
  })

  it('stamps the console header info popover with the generated timestamp', () => {
    renderModelConsole()
    const api = loadRuntime()
    api.renderNavbarIdentity(document, { generated: '2026-10-11T16:56:22.123Z' })
    const popover = document.querySelector('.innfo-navbar-info-popover')!
    expect(popover).not.toBeNull()
    expect(popover.textContent).toContain('Generated: 2026-10-11 16:56:22 UTC')
    const host = document.getElementById('innfo-navbar-extra')!
    expect(host).not.toBeNull()
    expect(host.textContent).toBe('')
  })

  it('the single shell renders a citation icon for an element with citations', () => {
    renderModelConsole()
    const api = loadRuntime()
    api.boot(document)

    // Element 'el-threat-slimer' has citations; the runtime renders them from
    // the kit (no model viewer).
    const card = document.getElementById('el-threat-slimer')!
    expect(card).not.toBeNull()
    const citeIcon = card.querySelector('.cite-icon')
    expect(citeIcon).not.toBeNull()
  })
})
