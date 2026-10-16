// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'

/**
 * DOM-level contract of the generated console, previously asserted by the
 * Playwright suite `16-innfo-console.spec.ts` (deleted).
 *
 * That suite drove a real Chromium, so nothing ran it: Playwright was never
 * wired into CI. Most of what it checked was pure logic reached through
 * `page.evaluate` — `slugify`, slot parsing, tree helpers and the changeset
 * export — and all of that already has gated coverage in
 * `console-export-naming.test.ts`, `console-runtime.test.ts` and
 * nn-trannsform's `test-scanner.js`. Duplicating it here would add no signal.
 *
 * What had NO gated coverage is the DOM wiring below: that booting the runtime
 * against the shell's slots actually paints a banner, rail and cards, that
 * the search box filters the rendered cards (not just `filterElements`), and
 * that the export button refuses to emit a file until an identifier is typed.
 * The runtime is UMD and guards its own auto-boot, so jsdom is enough —
 * no browser needed.
 */

const req = createRequire(import.meta.url)
const consoleDir = join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts', 'console')

type ConsoleApi = {
  boot: (doc: Document) => void
}

const schemaFixture = { concepts: [{ name: 'Goal' }, { name: 'Metric' }] }
const modelFixture = {
  meta: {
    title: 'Acme',
    modelId: 'acme',
    changesBlueprintVersion: 'V_0-3-0',
    models: [{ id: 'acme', title: 'Acme', version: 'V_0-1-0', sha256: 'aa'.repeat(32) }],
  },
  elements: [
    {
      id: 'goal-grow',
      concept: 'Goal',
      name: 'Grow',
      description: 'Grow the business',
      fields: { owner: 'Reviewer' },
    },
    {
      id: 'metric-churn',
      concept: 'Metric',
      name: 'Churn',
      description: 'Monthly logo churn',
      fields: {},
    },
  ],
  matrices: [],
}

/**
 * Fills the shipped shell's JSON slots and drops its `<script src>` tags.
 * The runtime is loaded through `require` instead, so leaving the tags in only
 * keeps the shell self-contained (jsdom would not run them anyway).
 */
function renderShell(): void {
  const shell = readFileSync(join(consoleDir, 'artifact_shell.html'), 'utf8')
  const filled = shell
    .replace(
      /(<script type="application\/json" id="innfo-schema">)[\s\S]*?(<\/script>)/,
      `$1${JSON.stringify(schemaFixture)}$2`,
    )
    .replace(
      /(<script type="application\/json" id="innfo-model">)[\s\S]*?(<\/script>)/,
      `$1${JSON.stringify(modelFixture)}$2`,
    )
    .replace(/<script\b[^>]*\bsrc=[^>]*><\/script>/g, '')
  document.documentElement.innerHTML = filled
}

function bootConsole(): ConsoleApi {
  const api = req(join(consoleDir, 'innfo-runtime.js')) as ConsoleApi
  api.boot(document)
  return api
}

function typeInto(selector: string, value: string): void {
  const input = document.querySelector(selector) as HTMLInputElement
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('innfo-console — rendered DOM', () => {
  beforeEach(() => {
    renderShell()
  })

  it('paints the banner, concept rail and one card per element from the slots', () => {
    bootConsole()

    const banner = (document.getElementById('innfo-feedback-banner') || document.getElementById('innfo-banner'))!.textContent ?? ''
    expect(banner).toContain('Acme')
    expect(banner).toContain('V_0-1-0')

    const rail = [...document.querySelectorAll('.innfo-rail-item')].map((n) => n.textContent ?? '')
    expect(rail.join(' ')).toContain('Goal')
    expect(rail.join(' ')).toContain('Metric')

    const titles = [...document.querySelectorAll('.innfo-card .innfo-card-head [data-ku-kind=element]')].map((n) => n.textContent)
    expect(titles).toEqual(['Grow', 'Churn'])
  })

  it('filters the rendered cards as the reviewer types, and restores them when cleared', () => {
    bootConsole()

    typeInto('#innfo-search', 'grow')
    expect([...document.querySelectorAll('.innfo-card .innfo-card-head [data-ku-kind=element]')].map((n) => n.textContent)).toEqual([
      'Grow',
    ])

    // Matching runs over description text too, not just the element name.
    typeInto('#innfo-search', 'monthly logo')
    expect([...document.querySelectorAll('.innfo-card .innfo-card-head [data-ku-kind=element]')].map((n) => n.textContent)).toEqual([
      'Churn',
    ])

    typeInto('#innfo-search', 'zzz-no-match')
    expect(document.querySelectorAll('.innfo-card')).toHaveLength(0)

    typeInto('#innfo-search', '')
    expect(document.querySelectorAll('.innfo-card')).toHaveLength(2)
  })
})

describe('innfo-console — export gate', () => {
  let downloads: string[]
  let clickSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    renderShell()
    downloads = []
    // The runtime downloads by creating an <a download=...> and clicking it.
    // Capturing the click is the only seam; `downloads` staying empty is what
    // "the gate held" looks like, so every test also asserts the positive case
    // below — otherwise a runtime that stopped using an anchor would make this
    // spy silently stop intercepting and the gate tests would pass vacuously.
    clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        if (this.download) downloads.push(this.download)
      })
    globalThis.URL.createObjectURL = () => 'blob:stub'
    globalThis.URL.revokeObjectURL = () => {}
  })

  afterEach(() => {
    clickSpy.mockRestore()
    localStorage.clear()
  })

  it('refuses to emit a file until an identifier is entered', () => {
    bootConsole()

    const openBtn = (document.getElementById('innfo-feedback-open') || document.getElementById('innfo-export-open'))!
    openBtn.dispatchEvent(new Event('click', { bubbles: true }))
    const download = (document.querySelector('#innfo-feedback-modal [data-innfo="download-changeset"]') || document.querySelector('#innfo-export-modal [data-innfo="download-changeset"]'))!

    download.dispatchEvent(new Event('click', { bubbles: true }))
    expect(downloads).toEqual([])

    // Whitespace is not an identifier either.
    typeInto('#innfo-feedback-modal [data-innfo="identifier"], #innfo-export-modal [data-innfo="identifier"]', '   ')
    download.dispatchEvent(new Event('click', { bubbles: true }))
    expect(downloads).toEqual([])
  })

  it('emits a changeset named by the changeset contract once an identifier is entered', () => {
    localStorage.setItem(
      'innfo-console:v3:acme',
      JSON.stringify({
        v: 4,
        modelId: 'acme',
        drafts: [
          {
            id: 'fb-001',
            element_id: 'goal-grow',
            concept: 'Goal',
            element: 'Grow',
            comment: 'Clarify the owner field',
            base_hash: '0123456789abcdef',
            kind: 'comment',
          },
        ],
        reviewed: {},
      }),
    )
    bootConsole()

    const openBtn = (document.getElementById('innfo-feedback-open') || document.getElementById('innfo-export-open'))!
    openBtn.dispatchEvent(new Event('click', { bubbles: true }))
    typeInto('#innfo-feedback-modal [data-innfo="identifier"], #innfo-export-modal [data-innfo="identifier"]', 'Reviewer, primera revisión')
    const download = (document.querySelector('#innfo-feedback-modal [data-innfo="download-changeset"]') || document.querySelector('#innfo-export-modal [data-innfo="download-changeset"]'))!
    download.dispatchEvent(new Event('click', { bubbles: true }))

    expect(downloads).toHaveLength(1)
    expect(downloads[0]).toMatch(
      /^acme_reviewer-primera-revision_[0-9-]+_changes_NN\.md$/,
    )
  })

  it('reports the pending draft count in the modal instructions', () => {
    localStorage.setItem(
      'innfo-console:v3:acme',
      JSON.stringify({
        v: 4,
        modelId: 'acme',
        drafts: [
          { id: 'fb-001', element_id: 'goal-grow', concept: 'Goal', element: 'Grow', kind: 'comment', base_hash: '0123456789abcdef' },
          { id: 'fb-002', element_id: 'metric-churn', concept: 'Metric', element: 'Churn', kind: 'comment', base_hash: '0123456789abcdef' },
        ],
        reviewed: {},
      }),
    )
    bootConsole()

    const openBtn = (document.getElementById('innfo-feedback-open') || document.getElementById('innfo-export-open'))!
    openBtn.dispatchEvent(new Event('click', { bubbles: true }))

    const modal = (document.getElementById('innfo-feedback-modal') || document.getElementById('innfo-export-modal'))!
    expect(
      modal.querySelector('[data-innfo="instructions"]')!.textContent,
    ).toContain('2 pending draft(s)')
  })
})
