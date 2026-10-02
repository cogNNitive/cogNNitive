// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'

/**
 * DOM-level contract for C3 (icon placement in `render-model-viewer.js`) and
 * C4 (the `innfo-citation-dialog` in `innfo-runtime.js`). Uses happy-dom, not
 * jsdom: jsdom (as vendored in this monorepo, hoisted from innfo-editor) does
 * not implement `HTMLDialogElement.showModal`, which both the existing
 * `innfo-ref-dialog` pattern and the new citation dialog depend on. happy-dom
 * does implement it. This mirrors the environment pragma already used by the
 * sibling `console-dom.test.ts` file for the same reason.
 */

const req = createRequire(import.meta.url)
const consoleDir = join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts', 'console')
const viewerAsset = join(
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

type ModelViewerApi = {
  boot: () => { ok: boolean }
}

function loadShell(): void {
  const shell = readFileSync(viewerAsset, 'utf8')
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

const schemaFixture = { concepts: [{ name: 'Problems', weight: 90 }] }

let modelFixture: {
  meta: Record<string, unknown>
  elements: Array<Record<string, unknown>>
  matrices: unknown[]
}

function bootViewer(): ModelViewerApi {
  // `require`'s CJS cache is not cleared by `vi.resetModules()`, and the
  // module only auto-boots once at first load — so call `boot()` explicitly
  // every time to force a fresh render against the freshly loaded shell.
  const api = req(join(consoleDir, 'render-model-viewer.js')) as ModelViewerApi
  api.boot()
  return api
}

// The viewer now consumes the real InnfoUI via require(); only the runtime
// (dialog) is stubbed. window.InnfoConsole overrides the CJS require fallback.
function stubRuntime(overrides: Partial<{ renderCitationDialog: unknown }> = {}) {
  const w = (globalThis as unknown as { window: Record<string, unknown> }).window
  w.InnfoConsole = {
    renderCitationDialog: overrides.renderCitationDialog ?? vi.fn(),
  }
}

function clearRuntime() {
  const w = (globalThis as unknown as { window: Record<string, unknown> }).window
  delete w.InnfoConsole
}

describe('render-model-viewer.js — citation icons (backward compatibility)', () => {
  beforeEach(() => {
    modelFixture = {
      meta: { title: 'Acme' },
      elements: [
        {
          id: 'problems-x',
          concept: 'Problems',
          name: 'X',
          description: 'desc',
          fields: { severity: 'high' },
          markers: {},
          relations: [],
        },
      ],
      matrices: [],
    }
    loadShell()
  })

  it('renders no citation icons when the element has no citations key', () => {
    stubRuntime()
    bootViewer()
    expect(document.querySelectorAll('[data-innfo-component=citation-icon]')).toHaveLength(0)
  })

  it('renders citations via the kit even with no InnfoConsole; clicking is inert without a dialog', () => {
    // D5/D9 dropped the viewer's silent null degrade: icons come from InnfoUI,
    // so they render whenever InnfoUI is loaded. Only the dialog is runtime-gated.
    modelFixture = {
      meta: { title: 'Acme' },
      elements: [
        {
          id: 'problems-x',
          concept: 'Problems',
          name: 'X',
          fields: {},
          citations: { sources: [{ path: 'sources/a.md', exists: true, origin: 'document' }] },
        },
      ],
      matrices: [],
    }
    loadShell()
    clearRuntime()
    bootViewer()
    const icons = document.querySelectorAll('[data-innfo-component=citation-icon]')
    expect(icons.length).toBe(1)
    expect(() => (icons[0] as HTMLElement).dispatchEvent(new Event('click', { bubbles: true }))).not.toThrow()
  })
})

describe('render-model-viewer.js — citation icons (origin-typed)', () => {
  beforeEach(() => {
    loadShell()
  })

  it('places a header icon for a sources-family citation', () => {
    modelFixture = {
      meta: { title: 'Acme' },
      elements: [
        {
          id: 'problems-x',
          concept: 'Problems',
          name: 'X',
          fields: { precio: '100' },
          citations: {
            sources: [{ path: 'sources/a.md', exists: true, origin: 'document' }],
          },
        },
      ],
      matrices: [],
    }
    loadShell()
    stubRuntime()
    bootViewer()

    const head = document.querySelector('.innfo-card-head')!
    const icons = head.querySelectorAll('[data-innfo-component=citation-icon][data-origin=document]')
    expect(icons).toHaveLength(1)
  })

  it('places a row icon for a non-sources citation field, and leaves the sibling plain field bare', () => {
    modelFixture = {
      meta: { title: 'Acme' },
      elements: [
        {
          id: 'problems-x',
          concept: 'Problems',
          name: 'X',
          fields: { precio: '100', precio_source: 'see doc' },
          citations: {
            precio_source: [{ path: 'sources/a.md', exists: true, origin: 'agent' }],
          },
        },
      ],
      matrices: [],
    }
    loadShell()
    stubRuntime()
    bootViewer()

    const precioRow = document.querySelector('[data-innfo-component=field-row][data-field=precio]')
    const precioSourceRow = document.querySelector(
      '[data-innfo-component=field-row][data-field=precio_source]',
    )

    expect(precioRow!.querySelectorAll('[data-innfo-component=citation-icon]')).toHaveLength(0)
    expect(
      precioSourceRow!.querySelectorAll('[data-innfo-component=citation-icon][data-origin=agent]'),
    ).toHaveLength(1)
  })

  it('dedupes multiple entries of the same field and variant into one icon', () => {
    modelFixture = {
      meta: { title: 'Acme' },
      elements: [
        {
          id: 'problems-x',
          concept: 'Problems',
          name: 'X',
          fields: {},
          citations: {
            sources: [
              { path: 'sources/a.md', exists: true, origin: 'human' },
              { path: 'sources/b.md', exists: true, origin: 'human' },
            ],
          },
        },
      ],
      matrices: [],
    }
    loadShell()
    stubRuntime()
    bootViewer()

    const icons = document.querySelectorAll('[data-innfo-component=citation-icon]')
    expect(icons).toHaveLength(1)
    expect((icons[0] as HTMLElement).getAttribute('data-origin')).toBe('human')
  })

  it('renders the error variant when an entry has error set, ordered before other variants', () => {
    modelFixture = {
      meta: { title: 'Acme' },
      elements: [
        {
          id: 'problems-x',
          concept: 'Problems',
          name: 'X',
          fields: {},
          citations: {
            sources: [
              { path: 'sources/a.md', exists: false, origin: 'document', error: 'DANGLING_FILE' },
              { path: 'sources/b.md', exists: true, origin: 'human' },
            ],
          },
        },
      ],
      matrices: [],
    }
    loadShell()
    stubRuntime()
    bootViewer()

    const icons = [...document.querySelectorAll('[data-innfo-component=citation-icon]')]
    expect(icons.map((i) => (i as HTMLElement).getAttribute('data-origin'))).toEqual([
      'error',
      'human',
    ])
  })

  it('falls back to the document variant for an unknown/old-MCP origin', () => {
    modelFixture = {
      meta: { title: 'Acme' },
      elements: [
        {
          id: 'problems-x',
          concept: 'Problems',
          name: 'X',
          fields: {},
          citations: {
            sources: [{ path: 'sources/a.md', exists: true }],
          },
        },
      ],
      matrices: [],
    }
    loadShell()
    stubRuntime()
    bootViewer()

    const icons = document.querySelectorAll('[data-innfo-component=citation-icon][data-origin=document]')
    expect(icons).toHaveLength(1)
  })

  it('clicking a citation icon calls InnfoConsole.renderCitationDialog without toggling the element open', () => {
    modelFixture = {
      meta: { title: 'Acme' },
      elements: [
        {
          id: 'problems-x',
          concept: 'Problems',
          name: 'X',
          fields: {},
          citations: {
            sources: [{ path: 'sources/a.md', exists: true, origin: 'document' }],
          },
        },
      ],
      matrices: [],
    }
    loadShell()
    const dialogSpy = vi.fn()
    stubRuntime({ renderCitationDialog: dialogSpy })
    bootViewer()

    const card = document.querySelector('[data-innfo-component=element-card]') as HTMLElement
    const openBefore = card.getAttribute('data-open')
    const icon = document.querySelector('[data-innfo-component=citation-icon]') as HTMLElement
    icon.dispatchEvent(new Event('click', { bubbles: true }))

    expect(dialogSpy).toHaveBeenCalledTimes(1)
    expect(dialogSpy.mock.calls[0][1]).toBe('sources')
    // Clicking a citation icon must not toggle the card open state.
    expect(card.getAttribute('data-open')).toBe(openBefore)
  })
})
