// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const req = createRequire(import.meta.url)
const consoleDir = join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts', 'console')
const modelConsolePath = join(
  import.meta.dirname!,
  '..',
  '..',
  '..',
  'specs',
  'bluepriNNts',
  'workspace',
  'assets',
  'model_console.html',
)

type ConsoleApi = {
  boot: (doc: Document) => any
  ensureFeedbackUi: (doc: Document, state?: any) => HTMLElement | null
  getDraftKey: (model: string, version: string) => string
  addDraft: (keyOrDrafts: string | any[], item: any) => any
  draftToItem: (draft: any, element?: any) => any
  buildExportDoc: (args: any) => any
  validateFeedback: (doc: any) => { ok: boolean; errors: string[] }
}

const sampleSchema = {
  concepts: [{ name: 'ParanormalThreat' }, { name: 'ContainmentEquipment' }],
}

const sampleModel = {
  meta: {
    modelId: 'ghostbusters-model',
    title: 'GhostbustersModel',
    modelVersion: 'V_0-2-1',
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
  ;(globalThis as any).InnfoConsole = api
  ;(window as any).InnfoConsole = api
  return api
}

describe('console-feedback-ui (bundle-injected feedback UI contract)', () => {
  beforeEach(() => {
    localStorage.clear()
    // HTMLDialogElement.prototype.showModal stub for jsdom
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
        this.setAttribute('open', 'open')
      }
    }
    if (!HTMLDialogElement.prototype.close) {
      HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
        this.removeAttribute('open')
      }
    }
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

  it('seeded draft exports target.field and base_hash, passing validateFeedback', () => {
    renderModelConsole()
    const api = loadRuntime()
    api.boot(document)

    const draftKey = api.getDraftKey('GhostbustersModel', 'V_0-2-1')
    api.addDraft(draftKey, {
      elementId: 'threat-slimer',
      concept: 'ParanormalThreat',
      elementName: 'Slimer',
      field: 'severity',
      base_hash: 'abcdef0123456789',
      kind: 'correction',
      note: 'Change severity to Class VII',
    })

    const drafts = JSON.parse(localStorage.getItem(draftKey) || '[]')
    expect(drafts).toHaveLength(1)
    expect(drafts[0].base_hash).toBe('abcdef0123456789')
    expect(drafts[0].field).toBe('severity')

    const exportDoc = api.buildExportDoc({
      meta: {
        source_knowledge: 'GhostbustersModel',
        source_knowledge_version: 'V_0-2-1',
        artifact: 'GhostbustersModel_console.html',
        artifact_version: '0.7.3',
        exported_at: '2026-10-02T12:00:00Z',
        author: 'Egon Spengler',
        feedback_slug: 'egon-spengler',
        viewer: 'innfo-console@0.7.3',
        source_sha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      },
      drafts,
    })

    expect(exportDoc.items).toHaveLength(1)
    expect(exportDoc.items[0].target.field).toBe('severity')
    expect(exportDoc.items[0].base_hash).toBe('abcdef0123456789')
    expect((exportDoc.items[0] as any).status).toBeUndefined()

    const validation = api.validateFeedback(exportDoc)
    expect(validation.ok).toBe(true)
    expect(validation.errors).toHaveLength(0)
  })

  it('invalid meta prevents createObjectURL and lists errors in [data-innfo="errors"]', () => {
    // Override meta with a forbidden property
    renderModelConsole(undefined, {
      title: 'GhostbustersModel',
      knowledge: 'forbidden_alias',
      modelVersion: 'V_0-2-1',
    })

    const api = loadRuntime()
    api.boot(document)

    const draftKey = api.getDraftKey('GhostbustersModel', 'V_0-2-1')
    api.addDraft(draftKey, {
      elementId: 'threat-slimer',
      concept: 'ParanormalThreat',
      elementName: 'Slimer',
      base_hash: 'abcdef0123456789',
      kind: 'comment',
      note: 'Needs check',
    })

    const createObjectURLSpy = vi.fn().mockReturnValue('blob:stub')
    globalThis.URL.createObjectURL = createObjectURLSpy

    const openBtn = document.getElementById('innfo-feedback-open')!
    openBtn.dispatchEvent(new Event('click', { bubbles: true }))

    const idInput = document.querySelector('#innfo-feedback-modal [data-innfo="identifier"]') as HTMLInputElement
    idInput.value = 'Reviewer-1'

    const downloadBtn = document.querySelector('#innfo-feedback-modal [data-innfo="download"]')!
    downloadBtn.dispatchEvent(new Event('click', { bubbles: true }))

    expect(createObjectURLSpy).not.toHaveBeenCalled()

    const errorsEl = document.querySelector('#innfo-feedback-modal [data-innfo="errors"]')!
    expect(errorsEl.textContent).toContain('forbidden property')
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

  it('viewer renders citation icon from builder output', () => {
    renderModelConsole()
    const api = loadRuntime()
    api.boot(document)
    const viewer = req(join(consoleDir, 'render-model-viewer.js'))
    viewer.boot()

    // Element 'el-threat-slimer' has citations
    const card = document.getElementById('el-threat-slimer')!
    expect(card).not.toBeNull()
    const citeIcon = card.querySelector('.cite-icon')
    expect(citeIcon).not.toBeNull()
  })
})
