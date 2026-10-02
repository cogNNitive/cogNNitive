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
const sampleModel = {
  meta: {
    modelId: 'ghostbusters-model',
    title: 'GhostbustersModel',
    modelVersion: 'V_0-2-1',
    sha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  },
  elements: [
    { id: 'x', concept: 'ParanormalThreat', name: 'X', hash: 'aaaaaaaaaaaaaaaa', fields: {} },
    { id: 'y', concept: 'ParanormalThreat', name: 'Y', hash: 'bbbbbbbbbbbbbbbb', fields: {} },
    { id: 'z', concept: 'ParanormalThreat', name: 'Z', hash: 'cccccccccccccccc', fields: {} },
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

describe('console-review-changed-filter', () => {
  beforeEach(() => {
    localStorage.clear()
    controllers = []
    ;(globalThis as any).__innfoNoAutoBoot = true
    document.body.innerHTML = ''
    renderModelConsole()
    document.documentElement.removeAttribute('data-innfo-review')
    document.documentElement.removeAttribute('data-innfo-filter')
  })

  afterEach(() => {
    controllers.forEach((c) => c && c.destroy && c.destroy())
    controllers = []
    localStorage.clear()
    ;(globalThis as any).__innfoNoAutoBoot = false
    vi.restoreAllMocks()
  })

  it('enabling the changed filter sets html[data-innfo-filter=changed]', () => {
    localStorage.setItem(
      'innfo-console:v2:ghostbusters-model',
      JSON.stringify({
        v: 2,
        modelId: 'ghostbusters-model',
        drafts: [],
        reviewed: { x: 'stale____________', y: 'bbbbbbbbbbbbbbbb' },
      }),
    )
    enableReview()
    const filterBtn = document.querySelector('[data-innfo="changed-filter"]') as HTMLElement
    expect(filterBtn).not.toBeNull()
    filterBtn.dispatchEvent(new Event('click', { bubbles: true }))
    expect(document.documentElement.getAttribute('data-innfo-filter')).toBe('changed')
  })

  it('marks changed cards with data-innfo-changed', () => {
    localStorage.setItem(
      'innfo-console:v2:ghostbusters-model',
      JSON.stringify({
        v: 2,
        modelId: 'ghostbusters-model',
        drafts: [],
        reviewed: { x: 'stale____________', y: 'bbbbbbbbbbbbbbbb' },
      }),
    )
    enableReview()
    ;(document.querySelector('[data-innfo="changed-filter"]') as HTMLElement).dispatchEvent(
      new Event('click', { bubbles: true }),
    )
    const x = document.querySelector('[data-element-id="x"]') as HTMLElement
    const y = document.querySelector('[data-element-id="y"]') as HTMLElement
    expect(x.hasAttribute('data-innfo-changed')).toBe(true)
    expect(y.hasAttribute('data-innfo-changed')).toBe(false)
  })

  it('never-reviewed elements are not marked changed', () => {
    localStorage.setItem(
      'innfo-console:v2:ghostbusters-model',
      JSON.stringify({
        v: 2,
        modelId: 'ghostbusters-model',
        drafts: [],
        reviewed: { x: 'stale____________' },
      }),
    )
    enableReview()
    ;(document.querySelector('[data-innfo="changed-filter"]') as HTMLElement).dispatchEvent(
      new Event('click', { bubbles: true }),
    )
    const z = document.querySelector('[data-element-id="z"]') as HTMLElement
    expect(z.hasAttribute('data-innfo-changed')).toBe(false)
  })
})
