// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createConsoleEnv, shellPath } from './helpers/console-review-env'

const env = createConsoleEnv()

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
  /* no review mode: edits are live */
  return mods
}

describe('console-review-progress (reviewed marks + rail progress)', () => {
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

  it('shows a ReviewedToggle per card and persists the hash on mark', () => {
    enableReview()
    const card = env.document.querySelector('[data-element-id="threat-slimer"]') as HTMLElement
    const toggle = card.querySelector('[data-innfo-component="reviewed-toggle"]') as HTMLElement
    expect(toggle).not.toBeNull()
    toggle.dispatchEvent(new env.window.Event('click', { bubbles: true }))

    const raw = JSON.parse(
      env.localStorage.getItem('innfo-console:v3:ghostbusters-model') || '{}',
    )
    expect(raw.reviewed).toEqual({ 'threat-slimer': 'abcdef0123456789' })
  })

  it('repaints the toggle in place after marking, without a reload', () => {
    enableReview()
    const card = env.document.querySelector('[data-element-id="threat-slimer"]') as HTMLElement
    const toggle = card.querySelector('[data-innfo-component="reviewed-toggle"]') as HTMLElement
    expect(toggle.getAttribute('data-state')).toBe('none')
    expect(toggle.textContent).toBe('Mark reviewed')

    toggle.dispatchEvent(new env.window.Event('click', { bubbles: true }))

    const after = card.querySelector('[data-innfo-component="reviewed-toggle"]') as HTMLElement
    expect(after).toBe(toggle)
    expect(after.getAttribute('data-state')).toBe('reviewed')
    expect(after.getAttribute('aria-pressed')).toBe('true')
    expect(after.textContent).toBe('Reviewed')
  })

  it('attaches RailProgress to concept pills in the viewer showing reviewed/total', () => {
    enableReview()
    const progress = env.document.querySelectorAll('[data-innfo-component="rail-progress"]')
    expect(progress.length).toBeGreaterThan(0)
    const threat = Array.from(progress).find(
      (p) => (p as HTMLElement).getAttribute('data-total') === '2',
    ) as HTMLElement
    expect(threat).toBeTruthy()
    expect(threat.getAttribute('data-reviewed')).toBe('0')
  })

  it('hash drift un-counts a reviewed mark and marks it changed', () => {
    env.localStorage.setItem(
      'innfo-console:v3:ghostbusters-model',
      JSON.stringify({
        v: 4,
        modelId: 'ghostbusters-model',
        drafts: [],
        reviewed: { 'threat-slimer': 'stale____________' },
      }),
    )
    enableReview()
    const card = env.document.querySelector('[data-element-id="threat-slimer"]') as HTMLElement
    const toggle = card.querySelector('[data-innfo-component="reviewed-toggle"]') as HTMLElement
    expect(toggle.getAttribute('data-state')).toBe('changed')
  })

  it('reviewed progress survives reload', () => {
    enableReview()
    const card = env.document.querySelector('[data-element-id="equip-trap"]') as HTMLElement
    ;(card.querySelector('[data-innfo-component="reviewed-toggle"]') as HTMLElement).dispatchEvent(
      new env.window.Event('click', { bubbles: true }),
    )
    const persisted = env.localStorage.getItem('innfo-console:v3:ghostbusters-model')

    // Re-boot fresh with the same persisted store.
    controllers.forEach((c) => c.destroy && c.destroy())
    controllers = []
    renderModelConsole()
    env.localStorage.setItem('innfo-console:v3:ghostbusters-model', persisted as string)
    enableReview()
    const card2 = env.document.querySelector('[data-element-id="equip-trap"]') as HTMLElement
    const toggle2 = card2.querySelector('[data-innfo-component="reviewed-toggle"]') as HTMLElement
    expect(toggle2.getAttribute('data-state')).toBe('reviewed')
  })
})
