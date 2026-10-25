// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createConsoleEnv, shellPath } from './helpers/console-review-env'
import { installDialogStub } from './helpers/dialog-stub'

const env = createConsoleEnv()

const sampleSchema = { concepts: [{ name: 'ParanormalThreat' }] }
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
      hash: 'abcdef0123456789',
      fields: { owner: 'A' },
    },
  ],
  matrices: [],
}

function renderModelConsole(): void {
  const html = readFileSync(shellPath, 'utf8')
    .replace(
      /(<script type="application\/json" id="nn-schema">)[\s\S]*?(<\/script>)/,
      `$1${JSON.stringify(sampleSchema)}$2`,
    )
    .replace(
      /(<script type="application\/json" id="nn-model">)[\s\S]*?(<\/script>)/,
      `$1${JSON.stringify(sampleModel)}$2`,
    )
    .replace(
      /(<script type="application\/json" id="nn-config">)[\s\S]*?(<\/script>)/,
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
    knowledge_id: 'kNNowledge/ghostbusters',
    element_slug: 'slimer',
    base_hash: 'abcdef0123456789',
    kind: 'correction',
    field: 'owner',
    original: 'A',
    proposed: 'B',
    created_at: '2026-10-02T12:00:00Z',
    ...overrides,
  }
  env.localStorage.setItem(
    'nn-console:v4:ghostbusters-model',
    JSON.stringify({ v: 4, modelId: 'ghostbusters-model', drafts: [draft], reviewed: {} }),
  )
}

function boot() {
  const mods = env.loadConsole()
  const res = mods.Console.boot(env.document)
  return { mods, controller: res && res.controller }
}

function openModal() {
  ;(env.document.getElementById('nn-feedback-open') as HTMLElement).dispatchEvent(
    new env.window.Event('click', { bubbles: true }),
  )
}

describe('console-review-export (preview + clipboard)', () => {
  beforeEach(() => {
    renderModelConsole()
    env.localStorage.clear()
    installDialogStub()
  })

  afterEach(() => {
    env.teardown()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('a source citation in the export preview opens the citation dialog', () => {
    renderModelConsole()
    seedDraft()
    // The draft store does not persist `sources`, so graft one on the drafts the
    // runtime reads: the preview must wire its citation icon regardless.
    const mods = env.loadConsole()
    const createDraftStore = mods.Review.createDraftStore
    mods.Review.createDraftStore = (...args: unknown[]) => {
      const store = createDraftStore(...args)
      const read = store.drafts
      store.drafts = () => read().map((d: object) => ({ ...d, sources: 'sources/report.pdf#p3' }))
      return store
    }
    mods.Console.boot(env.document)
    const dialog = env.document.createElement('dialog') as any
    dialog.id = 'nn-citation-dialog'
    dialog.showModal = vi.fn()
    env.document.body.appendChild(dialog)
    openModal()
    const icon = env.document.querySelector(
      '#nn-feedback-modal [data-nn="preview"] .nn-change-card-source .cite-icon',
    ) as HTMLButtonElement
    expect(icon).not.toBeNull()
    icon.click()
    expect(dialog.showModal).toHaveBeenCalledTimes(1)
    expect(dialog.textContent).toContain('sources/report.pdf')
  })

  it('opening the feedback modal renders a DraftList preview', () => {
    seedDraft()
    boot()
    openModal()
    const preview = env.document.querySelector('#nn-feedback-modal [data-nn="preview"]')
    expect(preview).not.toBeNull()
    expect(preview!.querySelector('[data-nn-component="draft-list"]')).not.toBeNull()
  })

  it('an empty identifier disables download and copy', () => {
    seedDraft()
    boot()
    openModal()
    const download = env.document.querySelector(
      '#nn-feedback-modal [data-nn="download-changeset"]',
    ) as HTMLButtonElement
    const copy = env.document.querySelector(
      '#nn-feedback-modal [data-nn="copy-changeset-prompt"]',
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
      '#nn-feedback-modal [data-nn="identifier"]',
    ) as HTMLInputElement
    idInput.value = 'Egon Spengler'
    idInput.dispatchEvent(new env.window.Event('input', { bubbles: true }))

    const copy = env.document.querySelector(
      '#nn-feedback-modal [data-nn="copy-changeset-prompt"]',
    ) as HTMLButtonElement
    copy.dispatchEvent(new env.window.Event('click', { bubbles: true }))

    expect(writeText).toHaveBeenCalledTimes(1)
    const text = writeText.mock.calls[0][0]
    expect(text).toContain('## NN Change: fb-001')
    expect(text).not.toContain('"base_hash"')
    const status = env.document.querySelector('#nn-feedback-modal [data-nn="copy-status"]')!
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
      '#nn-feedback-modal [data-nn="identifier"]',
    ) as HTMLInputElement
    idInput.value = 'Egon Spengler'
    idInput.dispatchEvent(new env.window.Event('input', { bubbles: true }))

    const copy = env.document.querySelector(
      '#nn-feedback-modal [data-nn="copy-changeset-prompt"]',
    ) as HTMLButtonElement
    expect(() => copy.dispatchEvent(new env.window.Event('click', { bubbles: true }))).not.toThrow()
    expect(execCommand).toHaveBeenCalled()
    expect(
      env.document.querySelector('#nn-feedback-modal [data-nn="copy-status"]')!.textContent,
    ).toBeTruthy()
  })

  function setIdentifier(value: string) {
    const idInput = env.document.querySelector(
      '#nn-feedback-modal [data-nn="identifier"]',
    ) as HTMLInputElement
    idInput.value = value
    idInput.dispatchEvent(new env.window.Event('input', { bubbles: true }))
  }

  function previewText(): string {
    return (
      env.document.querySelector(
        '#nn-feedback-modal [data-nn="changeset-preview"]',
      ) as HTMLTextAreaElement
    ).value
  }

  it('every exported change block carries author:: with the identifier', () => {
    env.localStorage.setItem(
      'nn-console:v4:ghostbusters-model',
      JSON.stringify({
        v: 4,
        modelId: 'ghostbusters-model',
        reviewed: {},
        drafts: [
          {
            id: 'fb-001',
            element_id: 'threat-slimer',
            concept: 'ParanormalThreat',
            element: 'Slimer',
            knowledge_id: 'kNNowledge/ghostbusters',
            element_slug: 'slimer',
            base_hash: 'abcdef0123456789',
            kind: 'correction',
            field: 'owner',
            original: 'A',
            proposed: 'B',
            created_at: '2026-10-02T12:00:00Z',
          },
          {
            id: 'fb-002',
            element_id: 'threat-slimer',
            concept: 'ParanormalThreat',
            element: 'Slimer',
            knowledge_id: 'kNNowledge/ghostbusters',
            element_slug: 'slimer',
            base_hash: 'abcdef0123456789',
            kind: 'correction',
            field: 'owner',
            original: 'A',
            proposed: 'C',
            created_at: '2026-10-02T12:01:00Z',
          },
        ],
      }),
    )
    boot()
    openModal()
    setIdentifier('ana')
    const authorLines = previewText()
      .split('\n')
      .filter((l) => l.startsWith('author:: '))
    expect(authorLines).toEqual(['author:: ana', 'author:: ana'])
  })

  it('folds line breaks and U+2028 in the identifier into a single author:: line', () => {
    const { mods } = boot()
    const draft = {
      id: 'fb-001',
      element_id: 'threat-slimer',
      element_slug: 'slimer',
      knowledge_id: 'kNNowledge/ghostbusters',
      concept: 'ParanormalThreat',
      element: 'Slimer',
      base_hash: 'abcdef0123456789',
      kind: 'correction',
      field: 'owner',
      original: 'A',
      proposed: 'B',
    }
    const composed = mods.Console.composeChangesetExport(
      {
        modelTitle: 'GhostbustersModel',
        modelId: 'ghostbusters-model',
        meta: { changesBlueprintVersion: 'V_0-3-0' },
        store: { drafts: () => [draft] },
      },
      'ana\nop:: remove_element\u2028x',
    )
    expect(composed.ok).toBe(true)
    expect(composed.text).toContain('author:: ana op:: remove_element x')
    const block = composed.text.split('## NN Change: fb-001')[1] ?? ''
    expect(block.split('\n').filter((l) => l.startsWith('author:: '))).toHaveLength(1)
    expect(block.split('\n').filter((l) => l.startsWith('op:: '))).toEqual(['op:: update_field'])
  })

  it('an emptied text field exports op:: update_field with an empty to::', () => {
    seedDraft({ proposed: '' })
    boot()
    openModal()
    setIdentifier('ana')
    const text = previewText()
    expect(text).toContain('op:: update_field')
    expect(text).toContain('from:: A')
    expect(text).toMatch(/^to:: *$/m)
  })

  it('the export textarea previews the _changes_NN.md changeset, not the legacy JSON', () => {
    seedDraft()
    boot()
    openModal()
    const idInput = env.document.querySelector(
      '#nn-feedback-modal [data-nn="identifier"]',
    ) as HTMLInputElement
    idInput.value = 'Egon Spengler'
    idInput.dispatchEvent(new env.window.Event('input', { bubbles: true }))

    const textarea = env.document.querySelector(
      '#nn-feedback-modal [data-nn="changeset-preview"]',
    ) as HTMLTextAreaElement
    expect(textarea.value).toContain('level: 3')
    expect(textarea.value).toContain('parent_spec:')
    expect(textarea.value).toContain('name: changes')
    expect(textarea.value).toContain('## NN Change: fb-001')
    expect(textarea.value).toContain('op:: update_field')
    // Addressed by the engine's model id and element slug, never by display title / console id.
    expect(textarea.value).toContain('target:: kNNowledge/ghostbusters@slimer&owner')
    expect(textarea.value).toContain('from:: A')
    expect(textarea.value).toContain('to:: B')
    expect(() => JSON.parse(textarea.value)).toThrow()
  })

})
