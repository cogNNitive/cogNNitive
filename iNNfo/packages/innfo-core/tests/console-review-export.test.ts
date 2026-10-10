// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createConsoleEnv, modelConsolePath } from './helpers/console-review-env'

const env = createConsoleEnv()

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
  env.setup(html)
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
  env.localStorage.setItem(
    'innfo-console:v2:ghostbusters-model',
    JSON.stringify({ v: 2, modelId: 'ghostbusters-model', drafts: [draft], reviewed: {} }),
  )
}

function boot() {
  const mods = env.loadConsole()
  const res = mods.Console.boot(env.document)
  return { mods, controller: res && res.controller }
}

function openModal() {
  ;(env.document.getElementById('innfo-feedback-open') as HTMLElement).dispatchEvent(
    new env.window.Event('click', { bubbles: true }),
  )
}

describe('console-review-export (preview + clipboard)', () => {
  beforeEach(() => {
    renderModelConsole()
    env.localStorage.clear()
    const g = globalThis as any
    if (!g.HTMLDialogElement.prototype.showModal) {
      g.HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
        this.setAttribute('open', 'open')
      }
    }
    if (!g.HTMLDialogElement.prototype.close) {
      g.HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
        this.removeAttribute('open')
      }
    }
  })

  afterEach(() => {
    env.teardown()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('opening the feedback modal renders a DraftList preview', () => {
    seedDraft()
    boot()
    openModal()
    const preview = env.document.querySelector('#innfo-feedback-modal [data-innfo="preview"]')
    expect(preview).not.toBeNull()
    expect(preview!.querySelector('[data-innfo-component="draft-list"]')).not.toBeNull()
  })

  it('an empty identifier disables download and copy', () => {
    seedDraft()
    boot()
    openModal()
    const download = env.document.querySelector(
      '#innfo-feedback-modal [data-innfo="download-changeset"]',
    ) as HTMLButtonElement
    const copy = env.document.querySelector(
      '#innfo-feedback-modal [data-innfo="copy-changeset-prompt"]',
    ) as HTMLButtonElement
    expect(download.disabled).toBe(true)
    expect(copy.disabled).toBe(true)
  })

  it('clipboard writeText receives the changeset prompt', () => {
    seedDraft()
    boot()
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    openModal()
    const idInput = env.document.querySelector(
      '#innfo-feedback-modal [data-innfo="identifier"]',
    ) as HTMLInputElement
    idInput.value = 'Egon Spengler'
    idInput.dispatchEvent(new env.window.Event('input', { bubbles: true }))

    const copy = env.document.querySelector(
      '#innfo-feedback-modal [data-innfo="copy-changeset-prompt"]',
    ) as HTMLButtonElement
    copy.dispatchEvent(new env.window.Event('click', { bubbles: true }))

    expect(writeText).toHaveBeenCalledTimes(1)
    const text = writeText.mock.calls[0][0]
    expect(text).toContain('## NN Change: fb-001')
    expect(text).not.toContain('"base_hash"')
    const status = env.document.querySelector('#innfo-feedback-modal [data-innfo="copy-status"]')!
    expect(status.getAttribute('role')).toBe('status')
  })

  it('clipboard unavailable falls back to execCommand and announces without throwing', () => {
    seedDraft()
    boot()
    vi.stubGlobal('navigator', { clipboard: undefined })
    const execCommand = vi.fn().mockReturnValue(true)
    ;(env.document as any).execCommand = execCommand

    openModal()
    const idInput = env.document.querySelector(
      '#innfo-feedback-modal [data-innfo="identifier"]',
    ) as HTMLInputElement
    idInput.value = 'Egon Spengler'
    idInput.dispatchEvent(new env.window.Event('input', { bubbles: true }))

    const copy = env.document.querySelector(
      '#innfo-feedback-modal [data-innfo="copy-changeset-prompt"]',
    ) as HTMLButtonElement
    expect(() => copy.dispatchEvent(new env.window.Event('click', { bubbles: true }))).not.toThrow()
    expect(execCommand).toHaveBeenCalled()
    expect(
      env.document.querySelector('#innfo-feedback-modal [data-innfo="copy-status"]')!.textContent,
    ).toBeTruthy()
  })

  it('the export textarea previews the _changes_NN.md changeset, not the legacy JSON', () => {
    seedDraft()
    boot()
    openModal()
    const idInput = env.document.querySelector(
      '#innfo-feedback-modal [data-innfo="identifier"]',
    ) as HTMLInputElement
    idInput.value = 'Egon Spengler'
    idInput.dispatchEvent(new env.window.Event('input', { bubbles: true }))

    const textarea = env.document.querySelector(
      '#innfo-feedback-modal [data-innfo="changeset-preview"]',
    ) as HTMLTextAreaElement
    expect(textarea.value).toContain('parent_spec: "changes"')
    expect(textarea.value).toContain('## NN Change: fb-001')
    expect(textarea.value).toContain('op:: update_field')
    expect(textarea.value).toContain('target:: GhostbustersModel@threat-slimer&owner')
    expect(textarea.value).toContain('from:: A')
    expect(textarea.value).toContain('to:: B')
    expect(() => JSON.parse(textarea.value)).toThrow()
  })

})
