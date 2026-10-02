// @vitest-environment happy-dom
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

const sampleSchema = { concepts: [{ name: 'ParanormalThreat' }] }
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
      hash: 'abcdef0123456789',
      fields: { owner: 'A' },
    },
  ],
  matrices: [],
}

function renderModelConsole(): void {
  const html = readFileSync(modelConsolePath, 'utf8')
    .replace(
      /(<script type="application\/json" id="innfo-schema">)[\s\S]*?(<\/script>)/,
      `$1${JSON.stringify(sampleSchema)}$2`,
    )
    .replace(
      /(<script type="application\/json" id="innfo-model">)[\s\S]*?(<\/script>)/,
      `$1${JSON.stringify(sampleModel)}$2`,
    )
    .replace(
      /(<script type="application\/json" id="innfo-config">)[\s\S]*?(<\/script>)/,
      '$1{"needs":["feedback-export","concept-rail","fulltext-search"]}$2',
    )
    .replace(/<script\b[^>]*\bsrc=[^>]*><\/script>/g, '')
  document.documentElement.innerHTML = html
}

function loadModules() {
  delete (globalThis as any).InnfoReview
  delete (globalThis as any).InnfoConsole
  delete (globalThis as any).InnfoModelViewer
  delete (globalThis as any).InnfoUI
  for (const f of ['ui-kit.js', 'review.js', 'innfo-runtime.js', 'render-model-viewer.js']) {
    delete req.cache[req.resolve(join(consoleDir, f))]
  }
  const UI = req(join(consoleDir, 'ui-kit.js'))
  ;(globalThis as any).InnfoUI = UI
  const Review = req(join(consoleDir, 'review.js'))
  ;(globalThis as any).InnfoReview = Review
  const Console = req(join(consoleDir, 'innfo-runtime.js'))
  ;(globalThis as any).InnfoConsole = Console
  const Viewer = req(join(consoleDir, 'render-model-viewer.js'))
  ;(globalThis as any).InnfoModelViewer = Viewer
  return { Review, Console, Viewer, UI }
}

function seedDraft(overrides: any = {}) {
  const draft = {
    id: 'fb-001',
    element_id: 'threat-slimer',
    concept: 'ParanormalThreat',
    element: 'Slimer',
    base_hash: 'abcdef0123456789',
    kind: 'correction',
    field: 'owner',
    original: 'A',
    proposed: 'B',
    created_at: '2026-10-02T12:00:00Z',
    ...overrides,
  }
  localStorage.setItem(
    'innfo-console:v2:ghostbusters-model',
    JSON.stringify({ v: 2, modelId: 'ghostbusters-model', drafts: [draft], reviewed: {} }),
  )
}

describe('console-review-export (preview + clipboard)', () => {
  beforeEach(() => {
    localStorage.clear()
    ;(globalThis as any).__innfoNoAutoBoot = true
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
    ;(globalThis as any).__innfoNoAutoBoot = false
    vi.restoreAllMocks()
  })

  it('opening the feedback modal renders a DraftList preview', () => {
    seedDraft()
    renderModelConsole()
    const { Console } = loadModules()
    Console.boot(document)
    ;(document.getElementById('innfo-feedback-open') as HTMLElement).dispatchEvent(
      new Event('click', { bubbles: true }),
    )
    const preview = document.querySelector('#innfo-feedback-modal [data-innfo="preview"]')
    expect(preview).not.toBeNull()
    expect(preview!.querySelector('[data-innfo-component="draft-list"]')).not.toBeNull()
  })

  it('an empty identifier disables download and copy', () => {
    seedDraft()
    renderModelConsole()
    const { Console } = loadModules()
    Console.boot(document)
    ;(document.getElementById('innfo-feedback-open') as HTMLElement).dispatchEvent(
      new Event('click', { bubbles: true }),
    )
    const download = document.querySelector(
      '#innfo-feedback-modal [data-innfo="download"]',
    ) as HTMLButtonElement
    const copy = document.querySelector(
      '#innfo-feedback-modal [data-innfo="copy"]',
    ) as HTMLButtonElement
    expect(download.disabled).toBe(true)
    expect(copy.disabled).toBe(true)
  })

  it('clipboard writeText receives exactly the export JSON', async () => {
    seedDraft()
    renderModelConsole()
    const { Console } = loadModules()
    Console.boot(document)
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    ;(document.getElementById('innfo-feedback-open') as HTMLElement).dispatchEvent(
      new Event('click', { bubbles: true }),
    )
    const idInput = document.querySelector(
      '#innfo-feedback-modal [data-innfo="identifier"]',
    ) as HTMLInputElement
    idInput.value = 'Egon Spengler'
    idInput.dispatchEvent(new Event('input', { bubbles: true }))

    const copy = document.querySelector(
      '#innfo-feedback-modal [data-innfo="copy"]',
    ) as HTMLButtonElement
    copy.dispatchEvent(new Event('click', { bubbles: true }))

    expect(writeText).toHaveBeenCalledTimes(1)
    const text = writeText.mock.calls[0][0]
    expect(text).toContain('"base_hash"')
    expect(text).not.toContain('"status"')
    const status = document.querySelector('#innfo-feedback-modal [data-innfo="copy-status"]')!
    expect(status.getAttribute('role')).toBe('status')
  })

  it('clipboard unavailable falls back to execCommand and announces without throwing', () => {
    seedDraft()
    renderModelConsole()
    const { Console } = loadModules()
    Console.boot(document)
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    const execCommand = vi.fn().mockReturnValue(true)
    ;(document as any).execCommand = execCommand

    ;(document.getElementById('innfo-feedback-open') as HTMLElement).dispatchEvent(
      new Event('click', { bubbles: true }),
    )
    const idInput = document.querySelector(
      '#innfo-feedback-modal [data-innfo="identifier"]',
    ) as HTMLInputElement
    idInput.value = 'Egon Spengler'
    idInput.dispatchEvent(new Event('input', { bubbles: true }))

    const copy = document.querySelector(
      '#innfo-feedback-modal [data-innfo="copy"]',
    ) as HTMLButtonElement
    expect(() => copy.dispatchEvent(new Event('click', { bubbles: true }))).not.toThrow()
    expect(execCommand).toHaveBeenCalled()
    expect(
      document.querySelector('#innfo-feedback-modal [data-innfo="copy-status"]')!.textContent,
    ).toBeTruthy()
  })

  it('exported items carry base_hash and no status', () => {
    seedDraft()
    renderModelConsole()
    const { Console } = loadModules()
    Console.boot(document)
    ;(document.getElementById('innfo-feedback-open') as HTMLElement).dispatchEvent(
      new Event('click', { bubbles: true }),
    )
    const idInput = document.querySelector(
      '#innfo-feedback-modal [data-innfo="identifier"]',
    ) as HTMLInputElement
    idInput.value = 'Egon Spengler'
    idInput.dispatchEvent(new Event('input', { bubbles: true }))

    const textarea = document.querySelector(
      '#innfo-feedback-modal [data-innfo="export-json"]',
    ) as HTMLTextAreaElement
    const doc = JSON.parse(textarea.value)
    expect(doc.items[0].base_hash).toBe('abcdef0123456789')
    expect('status' in doc.items[0]).toBe(false)
  })
})
