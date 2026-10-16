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
    { id: 'x', concept: 'ParanormalThreat', name: 'X', hash: 'aaaaaaaaaaaaaaaa', fields: {} },
    { id: 'y', concept: 'ParanormalThreat', name: 'Y', hash: 'bbbbbbbbbbbbbbbb', fields: {} },
    { id: 'z', concept: 'ParanormalThreat', name: 'Z', hash: 'cccccccccccccccc', fields: {} },
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
      /(<script type="application\/json" id="innfo-config">)[\s\S]*?(<\/script>)/,
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
  ;(env.document.querySelector('[data-innfo="review-toggle"]') as HTMLElement).dispatchEvent(
    new env.window.Event('click', { bubbles: true }),
  )
  return mods
}

describe('console-review-changed-filter', () => {
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

  it('enabling the changed filter sets html[data-innfo-filter=changed]', () => {
    env.localStorage.setItem(
      'innfo-console:v3:ghostbusters-model',
      JSON.stringify({
        v: 4,
        modelId: 'ghostbusters-model',
        drafts: [],
        reviewed: { x: 'stale____________', y: 'bbbbbbbbbbbbbbbb' },
      }),
    )
    enableReview()
    const filterBtn = env.document.querySelector('[data-innfo="changed-filter"]') as HTMLElement
    expect(filterBtn).not.toBeNull()
    filterBtn.dispatchEvent(new env.window.Event('click', { bubbles: true }))
    expect(env.document.documentElement.getAttribute('data-innfo-filter')).toBe('changed')
  })

  it('marks changed cards with data-innfo-changed', () => {
    env.localStorage.setItem(
      'innfo-console:v3:ghostbusters-model',
      JSON.stringify({
        v: 4,
        modelId: 'ghostbusters-model',
        drafts: [],
        reviewed: { x: 'stale____________', y: 'bbbbbbbbbbbbbbbb' },
      }),
    )
    enableReview()
    ;(env.document.querySelector('[data-innfo="changed-filter"]') as HTMLElement).dispatchEvent(
      new env.window.Event('click', { bubbles: true }),
    )
    const x = env.document.querySelector('[data-element-id="x"]') as HTMLElement
    const y = env.document.querySelector('[data-element-id="y"]') as HTMLElement
    expect(x.hasAttribute('data-innfo-changed')).toBe(true)
    expect(y.hasAttribute('data-innfo-changed')).toBe(false)
  })

  it('never-reviewed elements are not marked changed', () => {
    env.localStorage.setItem(
      'innfo-console:v3:ghostbusters-model',
      JSON.stringify({
        v: 4,
        modelId: 'ghostbusters-model',
        drafts: [],
        reviewed: { x: 'stale____________' },
      }),
    )
    enableReview()
    ;(env.document.querySelector('[data-innfo="changed-filter"]') as HTMLElement).dispatchEvent(
      new env.window.Event('click', { bubbles: true }),
    )
    const z = env.document.querySelector('[data-element-id="z"]') as HTMLElement
    expect(z.hasAttribute('data-innfo-changed')).toBe(false)
  })
})
