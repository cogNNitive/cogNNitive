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
      /(<script type="application\/json" id="nn-schema">)[\s\S]*?(<\/script>)/,
      `$1${JSON.stringify(sampleSchema)}$2`,
    )
    .replace(
      /(<script type="application\/json" id="nn-model">)[\s\S]*?(<\/script>)/,
      `$1${JSON.stringify(model)}$2`,
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
  return mods
}

function seedDrafts(drafts: any[]) {
  env.localStorage.setItem(
    'nn-console:v4:ghostbusters-model',
    JSON.stringify({ v: 4, modelId: 'ghostbusters-model', drafts, reviewed: {} }),
  )
}

function changeBadges(): HTMLElement[] {
  return Array.from(
    env.document.querySelectorAll(
      '[data-nn-change-state] [data-nn-component="status-badge"]',
    ),
  ) as HTMLElement[]
}

describe('console-review-badges (Unsent-only, from the draft store)', () => {
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

  it('shows no change signal for applied, conflict and proposed history with an empty draft store', () => {
    renderModelConsole(
      buildModel({
        history: [
          { id: 'c-01', op: 'comment', status: 'applied' },
          { id: 'c-02', op: 'update_field', status: 'conflict' },
        ],
        changes: [
          {
            path: 'changes/m_reviewer_1_changes_NN.md',
            status: 'proposed',
            changes: [{ id: 'c-03', op: 'comment', target: 'm@threat-slimer&note' }],
          },
        ],
      }),
    )
    boot()
    expect(env.document.querySelector('[data-nn-change-state]')).toBeNull()
    expect(changeBadges()).toEqual([])
  })

  it('shows one Unsent badge with the unsent count in its title when the store has drafts', () => {
    renderModelConsole(buildModel())
    seedDrafts([
      {
        id: 'fb-001',
        element_id: 'threat-slimer',
        concept: 'ParanormalThreat',
        element: 'Slimer',
        base_hash: 'abcdef0123456789',
        kind: 'comment',
        comment: 'x',
      },
      {
        id: 'fb-002',
        element_id: 'threat-slimer',
        concept: 'ParanormalThreat',
        element: 'Slimer',
        base_hash: 'abcdef0123456789',
        kind: 'comment',
        comment: 'y',
      },
    ])
    boot()
    const badges = changeBadges()
    expect(badges).toHaveLength(1)
    expect(badges[0].getAttribute('data-status')).toBe('local')
    expect(badges[0].textContent).toBe('Unsent')
    expect(badges[0].getAttribute('title')).toBe('2 unsent')
  })

  it('still shows the Unsent badge when the payload also carries applied history', () => {
    renderModelConsole(buildModel({ history: [{ id: 'c-01', op: 'comment', status: 'applied' }] }))
    seedDrafts([
      {
        id: 'fb-001',
        element_id: 'threat-slimer',
        concept: 'ParanormalThreat',
        element: 'Slimer',
        base_hash: 'abcdef0123456789',
        kind: 'comment',
        comment: 'x',
      },
    ])
    boot()
    expect(changeBadges().map((b) => b.getAttribute('data-status'))).toEqual(['local'])
  })
})
