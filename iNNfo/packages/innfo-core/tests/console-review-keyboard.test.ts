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
    { id: 'a', concept: 'ParanormalThreat', name: 'Alpha', hash: 'aaaaaaaaaaaaaaaa', fields: { owner: 'A' } },
    { id: 'b', concept: 'ParanormalThreat', name: 'Beta', hash: 'bbbbbbbbbbbbbbbb', fields: {} },
    { id: 'c', concept: 'ParanormalThreat', name: 'Gamma', hash: 'cccccccccccccccc', fields: {} },
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

function pressKey(key: string, target: EventTarget = document) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

function focusCard(id: string) {
  const card = document.querySelector(`[data-element-id="${id}"]`) as HTMLElement
  card.focus()
  return card
}

describe('console-review-keyboard (j/k/c + a11y)', () => {
  beforeEach(() => {
    localStorage.clear()
    controllers = []
    ;(globalThis as any).__innfoNoAutoBoot = true
    document.body.innerHTML = ''
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

  it('j moves focus to the next visible element card', () => {
    enableReview()
    const a = focusCard('a')
    expect(document.activeElement).toBe(a)
    pressKey('j')
    const b = document.querySelector('[data-element-id="b"]') as HTMLElement
    expect(document.activeElement).toBe(b)
  })

  it('k moves focus to the previous card', () => {
    enableReview()
    focusCard('b')
    pressKey('k')
    const a = document.querySelector('[data-element-id="a"]') as HTMLElement
    expect(document.activeElement).toBe(a)
  })

  it('c opens the card popover for the focused element', () => {
    enableReview()
    focusCard('a')
    pressKey('c')
    expect(document.querySelector('[data-innfo-component="annotation-popover"]')).not.toBeNull()
  })

  it('keystrokes are ignored while typing in a textarea', () => {
    enableReview()
    const ta = document.createElement('textarea')
    document.body.appendChild(ta)
    ta.focus()
    pressKey('j', ta)
    expect(document.activeElement).toBe(ta)
  })

  it('keystrokes are ignored with a modifier key', () => {
    enableReview()
    const a = focusCard('a')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', ctrlKey: true, bubbles: true }))
    expect(document.activeElement).toBe(a)
  })

  it('the draft counter is an aria-live polite region', () => {
    enableLifecycle()
    const counter = document.querySelector('[data-innfo="draft-count"]') as HTMLElement
    expect(counter).not.toBeNull()
    expect(counter.getAttribute('role')).toBe('status')
    expect(counter.getAttribute('aria-live')).toBe('polite')
  })
})

function enableLifecycle() {
  const mods = loadModules()
  const res = mods.Console.boot(document)
  if (res && res.controller) controllers.push(res.controller)
  return mods
}
