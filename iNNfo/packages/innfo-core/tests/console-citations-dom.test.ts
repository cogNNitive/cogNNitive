// @vitest-environment node
//
// SCS S3.3: the runtime (single shell) owns the citation-icon contract the
// retired model viewer used to render. Header-level icons come from `opts.head`
// (`InnfoUI.CitationIcons`); field-row icons from `FieldRow`'s `CitationIcon`.
// The old suite required `render-model-viewer.js`; this one boots `InnfoConsole`
// against `artifact_shell.html` (same helper the other console suites use).
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { createConsoleEnv, shellPath } from './helpers/console-review-env'

const env = createConsoleEnv()

const schemaFixture = { concepts: [{ name: 'Problems', weight: 90 }] }

let modelFixture: {
  meta: Record<string, unknown>
  elements: Array<Record<string, unknown>>
  matrices: unknown[]
}

function renderShell(): void {
  const html = readFileSync(shellPath, 'utf8')
    .replace(
      /(<script type="application\/json" id="innfo-schema">)[\s\S]*?(<\/script>)/,
      `$1${JSON.stringify(schemaFixture)}$2`,
    )
    .replace(
      /(<script type="application\/json" id="innfo-model">)[\s\S]*?(<\/script>)/,
      `$1${JSON.stringify(modelFixture)}$2`,
    )
    .replace(
      /(<script type="application\/json" id="innfo-config">)[\s\S]*?(<\/script>)/,
      '$1{"needs":["concept-rail","fulltext-search"]}$2',
    )
    .replace(/<script\b[^>]*\bsrc=[^>]*><\/script>/g, '')
  env.setup(html)
}

let controllers: any[] = []

function boot(): void {
  renderShell()
  const mods = env.loadConsole()
  const res = mods.Console.boot(env.document)
  if (res && res.controller) controllers.push(res.controller)
}

beforeEach(() => {
  controllers = []
})

afterEach(() => {
  controllers.forEach((c) => c && c.destroy && c.destroy())
  controllers = []
  env.teardown()
})

describe('single shell — citation icons (backward compatibility)', () => {
  it('renders no citation icons when the element has no citations key', () => {
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
    boot()
    expect(env.document.querySelectorAll('[data-innfo-component=citation-icon]')).toHaveLength(0)
  })

  it('renders citations via the kit; clicking is inert without a dialog API', () => {
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
    boot()
    const icons = env.document.querySelectorAll('[data-innfo-component=citation-icon]')
    expect(icons.length).toBe(1)
    expect(() =>
      (icons[0] as HTMLElement).dispatchEvent(new env.window.Event('click', { bubbles: true })),
    ).not.toThrow()
  })
})

describe('single shell — citation icons (origin-typed)', () => {
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
    boot()

    const head = env.document.querySelector('[data-element-id="problems-x"] .innfo-card-head')!
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
    boot()

    const precioRow = env.document.querySelector('[data-ku-kind=field][data-field=precio]')
    const precioSourceRow = env.document.querySelector(
      '[data-ku-kind=field][data-field=precio_source]',
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
    boot()

    const icons = env.document.querySelectorAll('[data-innfo-component=citation-icon]')
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
    boot()

    const icons = [...env.document.querySelectorAll('[data-innfo-component=citation-icon]')]
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
    boot()

    const icons = env.document.querySelectorAll(
      '[data-innfo-component=citation-icon][data-origin=document]',
    )
    expect(icons).toHaveLength(1)
  })

  it('clicking a citation icon does not toggle the element card open', () => {
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
    boot()

    const card = env.document.querySelector('[data-element-id="problems-x"]') as HTMLElement
    const openBefore = card.getAttribute('data-open')
    const icon = env.document.querySelector('[data-innfo-component=citation-icon]') as HTMLElement
    expect(() => icon.dispatchEvent(new env.window.Event('click', { bubbles: true }))).not.toThrow()
    expect(card.getAttribute('data-open')).toBe(openBefore)
  })
})
