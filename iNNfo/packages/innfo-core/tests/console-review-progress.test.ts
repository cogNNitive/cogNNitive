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
      hash: 'abcdef0123456789',
      fields: {},
    },
    {
      id: 'threat-staypuft',
      concept: 'ParanormalThreat',
      name: 'StayPuft',
      hash: '1234567890abcdef',
      fields: {},
    },
    {
      id: 'equip-trap',
      concept: 'ContainmentEquipment',
      name: 'Ghost Trap',
      hash: 'fedcba9876543210',
      fields: {},
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
  const mods = loadModules()
  const res = mods.Console.boot(document)
  if (res && res.controller) controllers.push(res.controller)
  ;(document.querySelector('[data-innfo="review-toggle"]') as HTMLElement).dispatchEvent(
    new Event('click', { bubbles: true }),
  )
  mods.Viewer.boot()
  return mods
}

describe('console-review-progress (reviewed marks + rail progress)', () => {
  beforeEach(() => {
    localStorage.clear()
    controllers = []
    ;(globalThis as any).__innfoNoAutoBoot = true
    renderModelConsole()
    document.documentElement.removeAttribute('data-innfo-review')
  })

  afterEach(() => {
    controllers.forEach((c) => c && c.destroy && c.destroy())
    controllers = []
    localStorage.clear()
    ;(globalThis as any).__innfoNoAutoBoot = false
    vi.restoreAllMocks()
  })

  it('shows a ReviewedToggle per card and persists the hash on mark', () => {
    enableReview()
    const card = document.querySelector(
      '[data-element-id="threat-slimer"]',
    ) as HTMLElement
    const toggle = card.querySelector('[data-innfo-component="reviewed-toggle"]') as HTMLElement
    expect(toggle).not.toBeNull()
    toggle.dispatchEvent(new Event('click', { bubbles: true }))

    const raw = JSON.parse(localStorage.getItem('innfo-console:v2:ghostbusters-model') || '{}')
    expect(raw.reviewed).toEqual({ 'threat-slimer': 'abcdef0123456789' })
  })

  it('attaches RailProgress to concept pills in the viewer showing reviewed/total', () => {
    enableReview()
    const progress = document.querySelectorAll('[data-innfo-component="rail-progress"]')
    expect(progress.length).toBeGreaterThan(0)
    const threat = Array.from(progress).find(
      (p) => (p as HTMLElement).getAttribute('data-total') === '2',
    ) as HTMLElement
    expect(threat).toBeTruthy()
    expect(threat.getAttribute('data-reviewed')).toBe('0')
  })

  it('hash drift un-counts a reviewed mark and marks it changed', () => {
    localStorage.setItem(
      'innfo-console:v2:ghostbusters-model',
      JSON.stringify({
        v: 2,
        modelId: 'ghostbusters-model',
        drafts: [],
        reviewed: { 'threat-slimer': 'stale____________' },
      }),
    )
    enableReview()
    const card = document.querySelector('[data-element-id="threat-slimer"]') as HTMLElement
    const toggle = card.querySelector('[data-innfo-component="reviewed-toggle"]') as HTMLElement
    expect(toggle.getAttribute('data-state')).toBe('changed')
  })

  it('reviewed progress survives reload', () => {
    enableReview()
    const card = document.querySelector('[data-element-id="equip-trap"]') as HTMLElement
    ;(card.querySelector('[data-innfo-component="reviewed-toggle"]') as HTMLElement).dispatchEvent(
      new Event('click', { bubbles: true }),
    )

    // Re-boot fresh with the same store.
    controllers.forEach((c) => c.destroy && c.destroy())
    controllers = []
    renderModelConsole()
    enableReview()
    const card2 = document.querySelector('[data-element-id="equip-trap"]') as HTMLElement
    const toggle2 = card2.querySelector('[data-innfo-component="reviewed-toggle"]') as HTMLElement
    expect(toggle2.getAttribute('data-state')).toBe('reviewed')
  })
})
