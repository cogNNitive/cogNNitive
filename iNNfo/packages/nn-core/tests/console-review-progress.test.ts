// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createConsoleEnv, shellPath } from './helpers/console-review-env'

/**
 * The reviewed mark is GONE: it was local state with no effect on the domain.
 * What remains is the single per-row change state (Unsent / Proposed / Applied /
 * Conflict) and the rail progress, which now reads unsent changes per concept.
 */
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
    { id: 'threat-slimer', concept: 'ParanormalThreat', name: 'Slimer', hash: 'abcdef0123456789', fields: {} },
    { id: 'threat-staypuft', concept: 'ParanormalThreat', name: 'StayPuft', hash: '1234567890abcdef', fields: {} },
    { id: 'equip-trap', concept: 'ContainmentEquipment', name: 'Ghost Trap', hash: 'fedcba9876543210', fields: {} },
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

function boot() {
  const mods = env.loadConsole()
  const res = mods.Console.boot(env.document)
  if (res && res.controller) controllers.push(res.controller)
  return res && res.controller
}

function changeBadge(elId: string): HTMLElement | null {
  return env.document.querySelector(
    `[data-element-id="${elId}"] [data-nn-change-state] [data-nn-component="status-badge"]`,
  ) as HTMLElement | null
}

describe('console-review-progress (change state + rail progress, no reviewed marks)', () => {
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

  it('renders no reviewed toggle anywhere', () => {
    boot()
    expect(env.document.querySelector('[data-nn-component="reviewed-toggle"]')).toBeNull()
    expect(env.document.querySelector('[data-nn="changed-filter"]')).toBeNull()
  })

  it('records a local change and paints ONE Unsent state badge on its row', () => {
    const ctl = boot()
    const card = env.document.querySelector('[data-element-id="threat-slimer"]') as HTMLElement
    expect(changeBadge('threat-slimer')).toBeNull()

    ctl.propose({ elementId: 'threat-slimer' }, { kind: 'comment', comment: 'x' })

    const badge = changeBadge('threat-slimer')!
    expect(badge).not.toBeNull()
    expect(badge.getAttribute('data-status')).toBe('local')
    expect(badge.textContent).toBe('Unsent')
    expect(badge.getAttribute('title')).toContain('1 unsent')
    expect(card.querySelectorAll('[data-nn-component="status-badge"]').length).toBe(1)
  })

  it('shows the Change recorded toast when a change is saved, and dismisses it', () => {
    const ctl = boot()
    ctl.propose({ elementId: 'equip-trap' }, { kind: 'comment', comment: 'x' })

    const toast = env.document.querySelector('[data-nn-component="toast"]') as HTMLElement
    expect(toast).not.toBeNull()
    expect(toast.querySelector('.nn-change-toast-title')!.textContent).toBe('Change recorded')
    expect(toast.querySelector('.nn-change-toast-text')!.textContent).toContain(
      'It lives only in this console',
    )
    ;(toast.querySelector('.nn-change-toast-close') as HTMLElement).dispatchEvent(
      new env.window.Event('click', { bubbles: true }),
    )
    expect(env.document.querySelector('[data-nn-component="toast"]')).toBeNull()
  })

  it('the change toast body describes the export-and-agent flow, not cogNNitive', () => {
    const ctl = boot()
    ctl.propose({ elementId: 'equip-trap' }, { kind: 'comment', comment: 'x' })
    const body = env.document.querySelector('.nn-change-toast-text')!
    expect(body.textContent).toContain('export it')
    expect(body.textContent).not.toContain('from cogNNitive')
  })

  it('attaches RailProgress per concept showing pending/total', () => {
    const ctl = boot()
    ctl.propose({ elementId: 'threat-slimer' }, { kind: 'comment', comment: 'x' })

    const progress = env.document.querySelectorAll('[data-nn-component="rail-progress"]')
    expect(progress.length).toBeGreaterThan(0)
    const threat = Array.from(progress).find(
      (p) => (p as HTMLElement).getAttribute('data-total') === '2',
    ) as HTMLElement
    expect(threat).toBeTruthy()
    expect(threat.getAttribute('data-pending')).toBe('1')
    expect(threat.textContent).toContain('1/2')
  })

  it('persists the local change across a reload', () => {
    const ctl = boot()
    ctl.propose({ elementId: 'equip-trap' }, { kind: 'comment', comment: 'x' })
    const persisted = env.localStorage.getItem('nn-console:v4:ghostbusters-model')

    controllers.forEach((c) => c.destroy && c.destroy())
    controllers = []
    renderModelConsole()
    env.localStorage.setItem('nn-console:v4:ghostbusters-model', persisted as string)
    boot()

    const badge = changeBadge('equip-trap')!
    expect(badge.getAttribute('data-status')).toBe('local')
  })
})
