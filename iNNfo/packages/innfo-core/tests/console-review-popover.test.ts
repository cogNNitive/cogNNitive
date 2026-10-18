// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createConsoleEnv, consoleDir, shellPath } from './helpers/console-review-env'

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
  const html = readFileSync(shellPath, 'utf8')
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
  /* no review mode: edits are live, no toggle to click */
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

  it('cards expose no annotate anchor; tag proposals open a correction-only popover', () => {
    enableReview()
    const card = env.document.querySelector('[data-innfo-component="element-card"]') as HTMLElement
    // The card-level annotate anchor was retired: element edits/comments go
    // through the one KU modal.
    expect(card.querySelector('[data-innfo-ctl="card-anchor"]')).toBeNull()
    const anchor = card.querySelector('[data-innfo-ctl="tag-add"]') as HTMLElement
    expect(anchor).not.toBeNull()
    anchor.dispatchEvent(new env.window.Event('click', { bubbles: true }))

    const pop = env.document.querySelector('[data-innfo-component="annotation-popover"]')!
    expect(pop).not.toBeNull()
    const kinds = Array.from(pop.querySelectorAll('.innfo-popover-kind')).map((b) =>
      b.getAttribute('data-kind'),
    )
    // A tag proposal is a `correction` on the `tags` Field (applied as update_field).
    expect(kinds).toContain('correction')
    expect(kinds).not.toContain('comment')
    expect(kinds).not.toContain('delete')
  })

  it('field row anchor opens the unified edit modal, prefilled with the payload value', () => {
    enableReview()
    const fieldRow = env.document.querySelector(
      '[data-ku-kind="value"][data-field="owner"]',
    ) as HTMLElement
    // No permanent pencil in a value row any more: editing lives in the badge flyout.
    // This fixture wires a bare controller (no Ku delegation), so the entry point under
    // test is the controller API; the flyout itself is asserted elsewhere.
    const ctl = controllers[controllers.length - 1]
    const rowEl = fieldRow.closest('[data-element-id]') as HTMLElement | null
    expect(
      ctl.openEdit({
        elementId: rowEl ? rowEl.getAttribute('data-element-id') : '',
        field: fieldRow.getAttribute('data-field') || '',
      }),
    ).toBe(true)

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
      '[data-ku-kind="value"][data-field="owner"]',
    ) as HTMLElement
    // No permanent pencil in a value row any more: editing lives in the badge flyout.
    // This fixture wires a bare controller (no Ku delegation), so the entry point under
    // test is the controller API; the flyout itself is asserted elsewhere.
    const ctl = controllers[controllers.length - 1]
    const rowEl = fieldRow.closest('[data-element-id]') as HTMLElement | null
    expect(
      ctl.openEdit({
        elementId: rowEl ? rowEl.getAttribute('data-element-id') : '',
        field: fieldRow.getAttribute('data-field') || '',
      }),
    ).toBe(true)

    const modal = env.document.querySelector('[data-innfo-component="edit-modal"]')!
    const input = modal.querySelector(
      '.innfo-edit-fields input, .innfo-edit-fields textarea',
    ) as HTMLInputElement
    input.value = 'B'
    ;(modal.querySelector('.innfo-edit-btn-save') as HTMLElement).dispatchEvent(
      new env.window.Event('click', { bubbles: true }),
    )

    const raw = JSON.parse(env.localStorage.getItem('innfo-console:v3:ghostbusters-model') || '{}')
    expect(raw.drafts).toHaveLength(1)
    const d = raw.drafts[0]
    expect(d.element_id).toBe('threat-slimer')
    expect(d.field).toBe('owner')
    expect(d.original).toBe('A')
    expect(d.proposed).toBe('B')
    expect(d.base_hash).toBe('abcdef0123456789')
    // The engine address travels with the draft so the changeset export can resolve it.
    expect(d.knowledge_id).toBe('ghostbusters-model')
    expect(d.element_slug).toBe('slimer')
  })

  it('element comment saves through the KU modal with no field', () => {
    enableReview()
    const ctl = controllers[controllers.length - 1]
    expect(ctl.openEdit({ elementId: 'threat-slimer', comment: true })).toBe(true)
    const modal = env.document.querySelector('[data-innfo-component="edit-modal"]')!
    expect(modal).not.toBeNull()
    const ta = modal.querySelector('.innfo-edit-form-comment textarea') as HTMLTextAreaElement
    ta.value = 'looks fine'
    ;(modal.querySelector('.innfo-edit-btn-save') as HTMLElement).dispatchEvent(
      new env.window.Event('click', { bubbles: true }),
    )

    const raw = JSON.parse(env.localStorage.getItem('innfo-console:v3:ghostbusters-model') || '{}')
    expect(raw.drafts).toHaveLength(1)
    expect(raw.drafts[0].field).toBeUndefined()
    expect(raw.drafts[0].comment).toBe('looks fine')
  })

  it('Escape closes the popover without saving and restores focus to the anchor', () => {
    enableReview()
    const card = env.document.querySelector('[data-innfo-component="element-card"]') as HTMLElement
    // The tag row lives in the card body, which starts collapsed; expand it so
    // the anchor is focusable (focus restoration is what this test checks).
    const toggle = card.querySelector('.innfo-card-toggle') as HTMLElement
    if (toggle) toggle.dispatchEvent(new env.window.Event('click', { bubbles: true }))
    const anchor = card.querySelector('[data-innfo-ctl="tag-add"]') as HTMLElement
    anchor.focus()
    anchor.dispatchEvent(new env.window.Event('click', { bubbles: true }))

    const pop = env.document.querySelector('[data-innfo-component="annotation-popover"]')!
    pop.dispatchEvent(new env.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    expect(env.document.querySelector('[data-innfo-component="annotation-popover"]')).toBeNull()
    expect(env.document.activeElement).toBe(anchor)
    const raw = JSON.parse(env.localStorage.getItem('innfo-console:v3:ghostbusters-model') || '{}')
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
