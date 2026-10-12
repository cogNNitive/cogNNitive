// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createConsoleEnv, consoleDir, modelConsolePath } from './helpers/console-review-env'

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
      slug: 'slimer',
      concept: 'ParanormalThreat',
      name: 'Slimer',
      description: 'Green potato ghost',
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

let controllers: any[] = []

function enableReview() {
  const mods = env.loadConsole()
  const res = mods.Console.boot(env.document)
  if (res && res.controller) controllers.push(res.controller)
  const toggle = env.document.querySelector('[data-innfo="review-toggle"]') as HTMLElement
  toggle.dispatchEvent(new env.window.Event('click', { bubbles: true }))
  mods.Viewer.boot()
  return mods
}

describe('console-review-popover (annotation)', () => {
  beforeEach(() => {
    controllers = []
    renderModelConsole()
    env.localStorage.clear()
  })

  afterEach(() => {
    controllers.forEach((c) => c && typeof c.destroy === 'function' && c.destroy())
    controllers = []
    env.teardown()
    vi.restoreAllMocks()
  })

  it('card anchor opens a popover offering comment and delete (no target.field)', () => {
    enableReview()
    const card = env.document.querySelector('[data-innfo-component="element-card"]') as HTMLElement
    const anchor = card.querySelector('[data-innfo-ctl="card-anchor"]') as HTMLElement
    expect(anchor).not.toBeNull()
    anchor.dispatchEvent(new env.window.Event('click', { bubbles: true }))

    const pop = env.document.querySelector('[data-innfo-component="annotation-popover"]')!
    expect(pop).not.toBeNull()
    const kinds = Array.from(pop.querySelectorAll('.innfo-popover-kind')).map((b) =>
      b.getAttribute('data-kind'),
    )
    expect(kinds).toContain('comment')
    expect(kinds).toContain('delete')
    expect(kinds).not.toContain('correction')
  })

  it('field row anchor opens the unified edit modal, prefilled with the payload value', () => {
    enableReview()
    const fieldRow = env.document.querySelector(
      '[data-ku-kind="field"][data-field="owner"]',
    ) as HTMLElement
    const anchor = fieldRow.querySelector('[data-innfo-ctl="field-anchor"]') as HTMLElement
    anchor.dispatchEvent(new env.window.Event('click', { bubbles: true }))

    // Field edits moved from the inline annotation popover to the edit modal.
    expect(env.document.querySelector('[data-innfo-component="annotation-popover"]')).toBeNull()
    const modal = env.document.querySelector('[data-innfo-component="edit-modal"]')!
    expect(modal).not.toBeNull()
    const modes = Array.from(modal.querySelectorAll('.innfo-edit-mode-btn')).map((b) =>
      b.textContent,
    )
    expect(modes).toEqual(['Propose value', 'Comment'])
    const input = modal.querySelector('.innfo-edit-fields input, .innfo-edit-fields textarea') as
      | HTMLInputElement
      | HTMLTextAreaElement
    expect(input.value).toBe('A')
  })

  it('saving a field correction writes target.field, original and current hash as base_hash', () => {
    enableReview()
    const fieldRow = env.document.querySelector(
      '[data-ku-kind="field"][data-field="owner"]',
    ) as HTMLElement
    ;(fieldRow.querySelector('[data-innfo-ctl="field-anchor"]') as HTMLElement).dispatchEvent(
      new env.window.Event('click', { bubbles: true }),
    )

    const modal = env.document.querySelector('[data-innfo-component="edit-modal"]')!
    const input = modal.querySelector(
      '.innfo-edit-fields input, .innfo-edit-fields textarea',
    ) as HTMLInputElement
    input.value = 'B'
    ;(modal.querySelector('.innfo-edit-btn-save') as HTMLElement).dispatchEvent(
      new env.window.Event('click', { bubbles: true }),
    )

    const raw = JSON.parse(env.localStorage.getItem('innfo-console:v2:ghostbusters-model') || '{}')
    expect(raw.drafts).toHaveLength(1)
    const d = raw.drafts[0]
    expect(d.element_id).toBe('threat-slimer')
    expect(d.field).toBe('owner')
    expect(d.original).toBe('A')
    expect(d.proposed).toBe('B')
    expect(d.base_hash).toBe('abcdef0123456789')
    // The engine address travels with the draft so the changeset export can resolve it.
    expect(d.model_id).toBe('ghostbusters-model')
    expect(d.element_slug).toBe('slimer')
  })

  it('card comment saves without a field', () => {
    enableReview()
    const card = env.document.querySelector('[data-innfo-component="element-card"]') as HTMLElement
    ;(card.querySelector('[data-innfo-ctl="card-anchor"]') as HTMLElement).dispatchEvent(
      new env.window.Event('click', { bubbles: true }),
    )
    const pop = env.document.querySelector('[data-innfo-component="annotation-popover"]')!
    ;(pop.querySelector('.innfo-popover-kind[data-kind="comment"]') as HTMLElement).dispatchEvent(
      new env.window.Event('click', { bubbles: true }),
    )
    const ta = pop.querySelector('textarea') as HTMLTextAreaElement
    ta.value = 'looks fine'
    ;(pop.querySelector('.innfo-popover-save') as HTMLElement).dispatchEvent(
      new env.window.Event('click', { bubbles: true }),
    )

    const raw = JSON.parse(env.localStorage.getItem('innfo-console:v2:ghostbusters-model') || '{}')
    expect(raw.drafts).toHaveLength(1)
    expect(raw.drafts[0].field).toBeUndefined()
    expect(raw.drafts[0].comment).toBe('looks fine')
  })

  it('Escape closes the popover without saving and restores focus to the anchor', () => {
    enableReview()
    const card = env.document.querySelector('[data-innfo-component="element-card"]') as HTMLElement
    const anchor = card.querySelector('[data-innfo-ctl="card-anchor"]') as HTMLElement
    anchor.dispatchEvent(new env.window.Event('click', { bubbles: true }))

    const pop = env.document.querySelector('[data-innfo-component="annotation-popover"]')!
    pop.dispatchEvent(new env.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    expect(env.document.querySelector('[data-innfo-component="annotation-popover"]')).toBeNull()
    expect(env.document.activeElement).toBe(anchor)
    const raw = JSON.parse(env.localStorage.getItem('innfo-console:v2:ghostbusters-model') || '{}')
    expect(raw.drafts || []).toHaveLength(0)
  })

  it('source scan finds no prompt( and no review status select across console sources', () => {
    const files = readdirSync(consoleDir).filter((f) => f.endsWith('.js') && f !== 'innfo-console.bundle.js')
    files.forEach((f) => {
      const src = readFileSync(join(consoleDir, f), 'utf8')
      expect(src.includes('prompt('), `${f} must not call prompt(`).toBe(false)
      expect(src.includes('innfo-review-status-select'), `${f} must not render a status select`).toBe(false)
    })
  })
})
