// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
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

let controllers: any[] = []

function enableReview() {
  const { Console, Viewer, Review } = loadModules()
  const res = Console.boot(document)
  if (res && res.controller) controllers.push(res.controller)
  const toggle = document.querySelector('[data-innfo="review-toggle"]') as HTMLElement
  toggle.dispatchEvent(new Event('click', { bubbles: true }))
  Viewer.boot()
  return { Console, Viewer, Review }
}

describe('console-review-popover (annotation)', () => {
  beforeEach(() => {
    localStorage.clear()
    controllers = []
    ;(globalThis as any).__innfoNoAutoBoot = true
    renderModelConsole()
    document.documentElement.removeAttribute('data-innfo-review')
    document.documentElement.removeAttribute('data-innfo-filter')
    document.documentElement.removeAttribute('data-innfo-console-booted')
  })

  afterEach(() => {
    controllers.forEach((c) => c && typeof c.destroy === 'function' && c.destroy())
    controllers = []
    localStorage.clear()
    ;(globalThis as any).__innfoNoAutoBoot = false
    vi.restoreAllMocks()
  })

  it('card anchor opens a popover offering comment and delete (no target.field)', () => {
    enableReview()
    const card = document.querySelector('[data-innfo-component="element-card"]') as HTMLElement
    const anchor = card.querySelector('[data-innfo-ctl="card-anchor"]') as HTMLElement
    expect(anchor).not.toBeNull()
    anchor.dispatchEvent(new Event('click', { bubbles: true }))

    const pop = document.querySelector('[data-innfo-component="annotation-popover"]')!
    expect(pop).not.toBeNull()
    const kinds = Array.from(pop.querySelectorAll('.innfo-popover-kind')).map((b) =>
      b.getAttribute('data-kind'),
    )
    expect(kinds).toContain('comment')
    expect(kinds).toContain('delete')
    expect(kinds).not.toContain('correction')
  })

  it('field row anchor offers comment and correction, prefilled original from the payload', () => {
    enableReview()
    const fieldRow = document.querySelector(
      '[data-innfo-component="field-row"][data-field="owner"]',
    ) as HTMLElement
    const anchor = fieldRow.querySelector('[data-innfo-ctl="field-anchor"]') as HTMLElement
    anchor.dispatchEvent(new Event('click', { bubbles: true }))

    const pop = document.querySelector('[data-innfo-component="annotation-popover"]')!
    const kinds = Array.from(pop.querySelectorAll('.innfo-popover-kind')).map((b) =>
      b.getAttribute('data-kind'),
    )
    expect(kinds).toContain('comment')
    expect(kinds).toContain('correction')
    const original = pop.querySelector('.innfo-popover-original')
    expect(original!.textContent).toBe('A')
  })

  it('saving a field correction writes target.field, original and current hash as base_hash', () => {
    const { Console } = enableReview()
    const fieldRow = document.querySelector(
      '[data-innfo-component="field-row"][data-field="owner"]',
    ) as HTMLElement
    ;(fieldRow.querySelector('[data-innfo-ctl="field-anchor"]') as HTMLElement).dispatchEvent(
      new Event('click', { bubbles: true }),
    )

    const pop = document.querySelector('[data-innfo-component="annotation-popover"]')!
    ;(pop.querySelector('.innfo-popover-kind[data-kind="correction"]') as HTMLElement).dispatchEvent(
      new Event('click', { bubbles: true }),
    )
    const ta = pop.querySelector('textarea') as HTMLTextAreaElement
    ta.value = 'B'
    ;(pop.querySelector('.innfo-popover-save') as HTMLElement).dispatchEvent(
      new Event('click', { bubbles: true }),
    )

    const raw = JSON.parse(localStorage.getItem('innfo-console:v2:ghostbusters-model') || '{}')
    expect(raw.drafts).toHaveLength(1)
    const d = raw.drafts[0]
    expect(d.element_id).toBe('threat-slimer')
    expect(d.field).toBe('owner')
    expect(d.original).toBe('A')
    expect(d.proposed).toBe('B')
    expect(d.base_hash).toBe('abcdef0123456789')
    void Console
  })

  it('card comment saves without a field', () => {
    enableReview()
    const card = document.querySelector('[data-innfo-component="element-card"]') as HTMLElement
    ;(card.querySelector('[data-innfo-ctl="card-anchor"]') as HTMLElement).dispatchEvent(
      new Event('click', { bubbles: true }),
    )
    const pop = document.querySelector('[data-innfo-component="annotation-popover"]')!
    ;(pop.querySelector('.innfo-popover-kind[data-kind="comment"]') as HTMLElement).dispatchEvent(
      new Event('click', { bubbles: true }),
    )
    const ta = pop.querySelector('textarea') as HTMLTextAreaElement
    ta.value = 'looks fine'
    ;(pop.querySelector('.innfo-popover-save') as HTMLElement).dispatchEvent(
      new Event('click', { bubbles: true }),
    )

    const raw = JSON.parse(localStorage.getItem('innfo-console:v2:ghostbusters-model') || '{}')
    expect(raw.drafts).toHaveLength(1)
    expect(raw.drafts[0].field).toBeUndefined()
    expect(raw.drafts[0].comment).toBe('looks fine')
  })

  it('Escape closes the popover without saving and restores focus to the anchor', () => {
    enableReview()
    const card = document.querySelector('[data-innfo-component="element-card"]') as HTMLElement
    const anchor = card.querySelector('[data-innfo-ctl="card-anchor"]') as HTMLElement
    anchor.dispatchEvent(new Event('click', { bubbles: true }))

    const pop = document.querySelector('[data-innfo-component="annotation-popover"]')!
    pop.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    expect(document.querySelector('[data-innfo-component="annotation-popover"]')).toBeNull()
    expect(document.activeElement).toBe(anchor)
    const raw = JSON.parse(localStorage.getItem('innfo-console:v2:ghostbusters-model') || '{}')
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
