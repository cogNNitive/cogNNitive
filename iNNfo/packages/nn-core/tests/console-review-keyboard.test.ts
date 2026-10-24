// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createConsoleEnv, shellPath } from './helpers/console-review-env'

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
    { id: 'a', concept: 'ParanormalThreat', name: 'Alpha', hash: 'aaaaaaaaaaaaaaaa', fields: { owner: 'A' } },
    { id: 'b', concept: 'ParanormalThreat', name: 'Beta', hash: 'bbbbbbbbbbbbbbbb', fields: {} },
    { id: 'c', concept: 'ParanormalThreat', name: 'Gamma', hash: 'cccccccccccccccc', fields: {} },
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
      /(<script type="application\/json" id="nn-config">)[\s\S]*?(<\/script>)/,
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
  /* no review mode: edits are live */
  return mods
}

function pressKey(key: string, target: EventTarget = env.document) {
  target.dispatchEvent(new env.window.KeyboardEvent('keydown', { key, bubbles: true }))
}

function focusCard(id: string) {
  const card = env.document.querySelector(`[data-element-id="${id}"]`) as HTMLElement
  card.focus()
  return card
}

describe('console-review-keyboard (j/k/c + a11y)', () => {
  beforeEach(() => {
    controllers = []
    renderModelConsole()
    env.localStorage.clear()
  })

  afterEach(() => {
    controllers.forEach((c) => c && c.destroy && c.destroy())
    controllers = []
    env.teardown()
    vi.restoreAllMocks()
  })

  it('j moves focus to the next visible element card', () => {
    enableReview()
    const a = focusCard('a')
    expect(env.document.activeElement).toBe(a)
    pressKey('j')
    const b = env.document.querySelector('[data-element-id="b"]') as HTMLElement
    expect(env.document.activeElement).toBe(b)
  })

  it('k moves focus to the previous card', () => {
    enableReview()
    focusCard('b')
    pressKey('k')
    const a = env.document.querySelector('[data-element-id="a"]') as HTMLElement
    expect(env.document.activeElement).toBe(a)
  })

  it('c opens the KU modal in comment mode for the focused element', () => {
    enableReview()
    focusCard('a')
    pressKey('c')
    // The card annotate popover was retired; `c` opens the one KU modal.
    const modal = env.document.querySelector('[data-nn-component="edit-modal"]')
    expect(modal).not.toBeNull()
    expect(modal!.querySelector('.nn-edit-form-comment')).not.toBeNull()
  })

  it('keystrokes are ignored while typing in a textarea', () => {
    enableReview()
    const ta = env.document.createElement('textarea')
    env.document.body.appendChild(ta)
    ta.focus()
    pressKey('j', ta)
    expect(env.document.activeElement).toBe(ta)
  })

  it('keystrokes are ignored with a modifier key', () => {
    enableReview()
    const a = focusCard('a')
    env.document.dispatchEvent(
      new env.window.KeyboardEvent('keydown', { key: 'j', ctrlKey: true, bubbles: true }),
    )
    expect(env.document.activeElement).toBe(a)
  })

  it('the draft counter is an aria-live polite region', () => {
    const mods = env.loadConsole()
    const res = mods.Console.boot(env.document)
    if (res && res.controller) controllers.push(res.controller)
    const counter = env.document.querySelector('[data-nn="draft-count"]') as HTMLElement
    expect(counter).not.toBeNull()
    expect(counter.getAttribute('role')).toBe('status')
    expect(counter.getAttribute('aria-live')).toBe('polite')
  })
})
