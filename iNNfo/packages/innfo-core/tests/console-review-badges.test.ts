// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createConsoleEnv, shellPath } from './helpers/console-review-env'

const env = createConsoleEnv()

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
  const html = readFileSync(shellPath, 'utf8')
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
  env.setup(html)
}

let controllers: any[] = []

function boot(withReview: boolean) {
  const mods = env.loadConsole()
  const res = mods.Console.boot(env.document)
  if (res && res.controller) controllers.push(res.controller)
  if (withReview) {
    ;(env.document.querySelector('[data-innfo="review-toggle"]') as HTMLElement).dispatchEvent(
      new env.window.Event('click', { bubbles: true }),
    )
  }
  return mods
}

describe('console-review-badges (verdict badges from feedbackState)', () => {
  beforeEach(() => {
    controllers = []
    env.setup(readFileSync(shellPath, 'utf8'))
    env.localStorage.clear()
  })

  afterEach(() => {
    controllers.forEach((c) => c && c.destroy && c.destroy())
    controllers = []
    env.teardown()
    vi.restoreAllMocks()
  })

  it('renders an applied StatusBadge in the card head', () => {
    renderModelConsole(
      buildModel([{ id: 'fb-001', element_id: 'threat-slimer', status: 'applied' }]),
    )
    boot(false)
    const badges = env.document.querySelector(
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
    expect(env.document.documentElement.getAttribute('data-innfo-review')).not.toBe('on')
    const badge = env.document.querySelector(
      '[data-innfo-review-badges] [data-innfo-component="status-badge"]',
    ) as HTMLElement
    expect(badge).not.toBeNull()
    expect(badge.getAttribute('data-status')).toBe('stale')
  })

  it('a local draft alone produces no verdict badge', () => {
    renderModelConsole(buildModel())
    env.localStorage.setItem(
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
    boot(false)
    expect(env.document.querySelector('[data-innfo-review-badges]')).toBeNull()
  })

  it('ignores orphan feedback entries targeting a missing element', () => {
    renderModelConsole(
      buildModel([{ id: 'fb-001', element_id: 'ghost-element', status: 'applied' }]),
    )
    expect(() => boot(false)).not.toThrow()
    expect(env.document.querySelector('[data-innfo-review-badges]')).toBeNull()
  })
})
