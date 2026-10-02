// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const req = createRequire(import.meta.url)
const consoleDir = join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts', 'console')
const bpRoot = join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts')
const modelConsolePath = join(bpRoot, 'workspace', 'assets', 'model_console.html')

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
  const modelToUse = overrideMeta ? Object.assign({}, sampleModel, { meta: overrideMeta }) : sampleModel
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
      overrideConfig
        ? `$1${JSON.stringify(overrideConfig)}$2`
        : '$1{"needs":["feedback-export","concept-rail","fulltext-search"]}$2',
    )
    .replace(/<script\b[^>]*\bsrc=[^>]*><\/script>/g, '')
  document.documentElement.innerHTML = filled
  document.documentElement.removeAttribute('data-innfo-review')
  document.documentElement.removeAttribute('data-innfo-filter')
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

function reviewCtl(doc: Document): Element[] {
  return Array.from(doc.querySelectorAll('[data-innfo-review-ctl]'))
}

describe('console-review-mode (toggle + decoration)', () => {
  let controllers: any[] = []

  function bootConsole() {
    const mods = loadModules()
    const res = mods.Console.boot(document)
    if (res && res.controller) controllers.push(res.controller)
    return mods
  }

  beforeEach(() => {
    localStorage.clear()
    controllers = []
    ;(globalThis as any).__innfoNoAutoBoot = true
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

  it('renders the toggle only with feedback-export, modelId and all 16-hex hashes', () => {
    renderModelConsole()
    const { Console } = bootConsole()
    expect(document.querySelector('[data-innfo="review-toggle"]')).not.toBeNull()
  })

  it('withholds the toggle when modelId is missing', () => {
    renderModelConsole(undefined, {
      title: 'GhostbustersModel',
      modelVersion: 'V_0-2-1',
      sha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    })
    const { Console } = bootConsole()
    expect(document.querySelector('[data-innfo="review-toggle"]')).toBeNull()
  })

  it('withholds the toggle when an element lacks a hash', () => {
    const model = JSON.parse(JSON.stringify(sampleModel))
    delete model.elements[1].hash
    const html = readFileSync(modelConsolePath, 'utf8')
      .replace(
        /(<script type="application\/json" id="innfo-schema">)[\s\S]*?(<\/script>)/,
        `$1${JSON.stringify(sampleSchema)}$2`,
      )
      .replace(
        /(<script type="application\/json" id="innfo-model">)[\s\S]*?(<\/script>)/,
        `$1${JSON.stringify(model)}$2`,
      )
      .replace(
        /(<script type="application\/json" id="innfo-config">)[\s\S]*?(<\/script>)/,
        '$1{"needs":["feedback-export","concept-rail","fulltext-search"]}$2',
      )
      .replace(/<script\b[^>]*\bsrc=[^>]*><\/script>/g, '')
    document.documentElement.innerHTML = html

    const { Console } = bootConsole()
    expect(document.querySelector('[data-innfo="review-toggle"]')).toBeNull()
  })

  it('is off by default: zero review control nodes', () => {
    renderModelConsole()
    const { Console } = bootConsole()
    expect(document.documentElement.getAttribute('data-innfo-review')).not.toBe('on')
    expect(reviewCtl(document)).toHaveLength(0)
  })

  it('toggle on sets html[data-innfo-review=on], aria-pressed and decorates every card', () => {
    renderModelConsole()
    const { Console, Viewer } = bootConsole()
    Viewer.boot()

    const toggle = document.querySelector('[data-innfo="review-toggle"]') as HTMLElement
    toggle.dispatchEvent(new Event('click', { bubbles: true }))

    expect(document.documentElement.getAttribute('data-innfo-review')).toBe('on')
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    const cards = document.querySelectorAll('#content [data-innfo-component="element-card"]')
    expect(cards.length).toBeGreaterThan(0)
    cards.forEach((card) => {
      expect(card.querySelectorAll('[data-innfo-review-ctl]').length).toBeGreaterThan(0)
    })
  })

  it('toggle off cleans up every review control', () => {
    renderModelConsole()
    const { Console, Viewer } = bootConsole()
    Viewer.boot()
    const toggle = document.querySelector('[data-innfo="review-toggle"]') as HTMLElement
    toggle.dispatchEvent(new Event('click', { bubbles: true }))
    expect(reviewCtl(document).length).toBeGreaterThan(0)

    toggle.dispatchEvent(new Event('click', { bubbles: true }))
    expect(document.documentElement.getAttribute('data-innfo-review')).not.toBe('on')
    expect(reviewCtl(document)).toHaveLength(0)
  })

  it('re-render dispatches innfo:rendered and re-decorates idempotently', () => {
    renderModelConsole()
    const { Console, Viewer } = bootConsole()
    Viewer.boot()
    const toggle = document.querySelector('[data-innfo="review-toggle"]') as HTMLElement
    toggle.dispatchEvent(new Event('click', { bubbles: true }))

    const search = document.getElementById('search') as HTMLInputElement
    search.value = 'slimer'
    search.dispatchEvent(new Event('input', { bubbles: true }))

    const visibleCards = document.querySelectorAll('#content [data-innfo-component="element-card"]')
    expect(visibleCards.length).toBe(1)
    expect(visibleCards[0].querySelectorAll('[data-innfo-review-ctl]').length).toBeGreaterThan(0)
  })

  it('decorates the viewer cards from the same controller when the viewer renders', () => {
    renderModelConsole()
    const { Console, Viewer } = bootConsole()
    const toggle = document.querySelector('[data-innfo="review-toggle"]') as HTMLElement
    toggle.dispatchEvent(new Event('click', { bubbles: true }))

    Viewer.boot()

    const viewerCards = Array.from(
      document.querySelectorAll('#content [data-innfo-component="element-card"]'),
    )
    expect(viewerCards.length).toBeGreaterThan(0)
    viewerCards.forEach((card) => {
      expect(card.querySelectorAll('[data-innfo-review-ctl]').length).toBeGreaterThan(0)
    })
  })
})
