// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createConsoleEnv, shellPath } from './helpers/console-review-env'

const env = createConsoleEnv()

const sampleSchema = { concepts: [{ name: 'ParanormalThreat' }] }

interface BuildOpts {
  history?: any[]
  changes?: any[]
}

function buildModel(opts: BuildOpts = {}) {
  const element: any = {
    id: 'threat-slimer',
    concept: 'ParanormalThreat',
    name: 'Slimer',
    hash: 'abcdef0123456789',
    fields: {},
  }
  if (opts.history) element.history = opts.history
  const model: any = {
    meta: {
      modelId: 'ghostbusters-model',
      title: 'GhostbustersModel',
      modelVersion: 'V_0-2-1',
      sha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    },
    elements: [element],
    matrices: [],
  }
  if (opts.changes) model.changes = opts.changes
  return model
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

function badgeStatuses(): string[] {
  return Array.from(
    env.document.querySelectorAll(
      '[data-innfo-review-badges] [data-innfo-component="status-badge"]',
    ),
  ).map((b) => (b as HTMLElement).getAttribute('data-status') || '')
}

describe('console-review-badges (badges from changesets)', () => {
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

  it('renders an applied StatusBadge from element.history', () => {
    renderModelConsole(
      buildModel({ history: [{ id: 'c-01', op: 'comment', status: 'applied' }] }),
    )
    boot(false)
    const badges = env.document.querySelector(
      '[data-element-id="threat-slimer"] [data-innfo-review-badges]',
    )
    expect(badges).not.toBeNull()
    const badge = badges!.querySelector('[data-innfo-component="status-badge"]') as HTMLElement
    expect(badge).not.toBeNull()
    expect(badge.getAttribute('data-status')).toBe('applied')
    expect(badge.textContent).toBe('1')
  })

  it('renders a conflict StatusBadge from element.history', () => {
    renderModelConsole(
      buildModel({ history: [{ id: 'c-01', op: 'update_field', status: 'conflict' }] }),
    )
    boot(false)
    expect(badgeStatuses()).toEqual(['conflict'])
  })

  it('renders a proposed StatusBadge from the proposed changesets of payload.changes', () => {
    renderModelConsole(
      buildModel({
        changes: [
          {
            path: 'changes/m_reviewer_1_changes_NN.md',
            status: 'proposed',
            changes: [{ id: 'c-01', op: 'comment', target: 'm@threat-slimer&note' }],
          },
        ],
      }),
    )
    boot(false)
    expect(badgeStatuses()).toEqual(['proposed'])
  })

  it('renders badges with review mode OFF', () => {
    renderModelConsole(
      buildModel({ history: [{ id: 'c-01', op: 'comment', status: 'applied' }] }),
    )
    boot(false)
    expect(env.document.documentElement.getAttribute('data-innfo-review')).not.toBe('on')
    expect(badgeStatuses()).toEqual(['applied'])
  })

  it('a local draft alone produces no verdict badge', () => {
    renderModelConsole(buildModel())
    env.localStorage.setItem(
      'innfo-console:v3:ghostbusters-model',
      JSON.stringify({
        v: 3,
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

  it('ignores a proposed change targeting a missing element', () => {
    renderModelConsole(
      buildModel({
        changes: [
          {
            path: 'changes/m_reviewer_1_changes_NN.md',
            status: 'proposed',
            changes: [{ id: 'c-01', op: 'comment', target: 'm@ghost-element&note' }],
          },
        ],
      }),
    )
    expect(() => boot(false)).not.toThrow()
    expect(env.document.querySelector('[data-innfo-review-badges]')).toBeNull()
  })
})
