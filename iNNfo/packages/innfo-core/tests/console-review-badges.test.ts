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

const sampleSchema = { concepts: [{ name: 'ParanormalThreat' }] }

function buildModel(feedbackState?: any[]) {
  return {
    meta: {
      modelId: 'ghostbusters-model',
      title: 'GhostbustersModel',
      modelVersion: 'V_0-2-1',
      sha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      ...(feedbackState ? { feedbackState } : {}),
    },
    elements: [
      {
        id: 'threat-slimer',
        concept: 'ParanormalThreat',
        name: 'Slimer',
        hash: 'abcdef0123456789',
        fields: {},
      },
    ],
    matrices: [],
  }
}

function renderModelConsole(model = buildModel()): void {
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

function boot(withReview: boolean) {
  const mods = loadModules()
  const res = mods.Console.boot(document)
  if (res && res.controller) controllers.push(res.controller)
  if (withReview) {
    ;(document.querySelector('[data-innfo="review-toggle"]') as HTMLElement).dispatchEvent(
      new Event('click', { bubbles: true }),
    )
  }
  mods.Viewer.boot()
  return mods
}

describe('console-review-badges (verdict badges from feedbackState)', () => {
  beforeEach(() => {
    localStorage.clear()
    controllers = []
    ;(globalThis as any).__innfoNoAutoBoot = true
    document.documentElement.removeAttribute('data-innfo-review')
  })

  afterEach(() => {
    controllers.forEach((c) => c && c.destroy && c.destroy())
    controllers = []
    localStorage.clear()
    ;(globalThis as any).__innfoNoAutoBoot = false
    vi.restoreAllMocks()
  })

  it('renders an applied StatusBadge in the card head', () => {
    renderModelConsole(
      buildModel([{ id: 'fb-001', element_id: 'threat-slimer', status: 'applied' }]),
    )
    boot(false)
    const badges = document.querySelector(
      '[data-element-id="threat-slimer"] [data-innfo-review-badges]',
    )
    expect(badges).not.toBeNull()
    const badge = badges!.querySelector('[data-innfo-component="status-badge"]') as HTMLElement
    expect(badge).not.toBeNull()
    expect(badge.getAttribute('data-status')).toBe('applied')
  })

  it('renders badges with review mode OFF', () => {
    renderModelConsole(
      buildModel([{ id: 'fb-001', element_id: 'threat-slimer', status: 'stale' }]),
    )
    boot(false)
    expect(document.documentElement.getAttribute('data-innfo-review')).not.toBe('on')
    const badge = document.querySelector(
      '[data-innfo-review-badges] [data-innfo-component="status-badge"]',
    ) as HTMLElement
    expect(badge).not.toBeNull()
    expect(badge.getAttribute('data-status')).toBe('stale')
  })

  it('a local draft alone produces no verdict badge', () => {
    localStorage.setItem(
      'innfo-console:v2:ghostbusters-model',
      JSON.stringify({
        v: 2,
        modelId: 'ghostbusters-model',
        drafts: [
          {
            id: 'fb-001',
            element_id: 'threat-slimer',
            concept: 'ParanormalThreat',
            element: 'Slimer',
            base_hash: 'abcdef0123456789',
            kind: 'comment',
            comment: 'x',
          },
        ],
        reviewed: {},
      }),
    )
    renderModelConsole(buildModel())
    boot(false)
    expect(document.querySelector('[data-innfo-review-badges]')).toBeNull()
  })

  it('ignores orphan feedback entries targeting a missing element', () => {
    renderModelConsole(
      buildModel([{ id: 'fb-001', element_id: 'ghost-element', status: 'applied' }]),
    )
    expect(() => boot(false)).not.toThrow()
    expect(document.querySelector('[data-innfo-review-badges]')).toBeNull()
  })
})
