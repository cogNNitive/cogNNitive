// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createConsoleEnv, shellPath } from './helpers/console-review-env'

/**
 * There is NO review mode. An edit only ever creates a draft, so the edit
 * affordance is always emitted and the controller decorates at boot.
 *
 * (Previously this suite specified the review-mode toggle and its on/off
 * cleanup. That feature was removed by decision: the toggle assertions became
 * "no toggle", and "toggle off removes the controls" became the state-driven
 * changeset bar.)
 *
 * KNOWN GAP, exposed by removing the mode: the capability gate
 * (`feedback-export` + `modelId` + every element hash) still decides whether the
 * toggle USED to render, but it is not applied to the edit anchors — they are
 * decorated whenever the console boots. Asserting a capability gate here failed
 * against the element-card contract, which expects decoration without it. Giving
 * the anchors their own gate is a follow-up of its own.
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
    {
      id: 'threat-slimer',
      concept: 'ParanormalThreat',
      name: 'Slimer',
      description: 'Green potato ghost',
      hash: 'abcdef0123456789',
      fields: { severity: 'Class V' },
    },
    {
      id: 'equip-trap',
      concept: 'ContainmentEquipment',
      name: 'Ghost Trap',
      description: 'High voltage trap',
      hash: 'fedcba9876543210',
      fields: {},
    },
  ],
  matrices: [],
}

function fillShell(modelToUse: any, overrideConfig?: any): string {
  return readFileSync(shellPath, 'utf8')
    .replace(
      /(<script type="application\/json" id="innfo-schema">)[\s\S]*?(<\/script>)/,
      `$1${JSON.stringify(sampleSchema)}$2`,
    )
    .replace(
      /(<script type="application\/json" id="innfo-model">)[\s\S]*?(<\/script>)/,
      `$1${JSON.stringify(modelToUse)}$2`,
    )
    .replace(
      /(<script type="application\/json" id="innfo-config">)[\s\S]*?(<\/script>)/,
      overrideConfig
        ? `$1${JSON.stringify(overrideConfig)}$2`
        : '$1{"needs":["feedback-export","concept-rail","fulltext-search"]}$2',
    )
    .replace(/<script\b[^>]*\bsrc=[^>]*><\/script>/g, '')
}

function renderModelConsole(overrideConfig?: any, overrideMeta?: any): void {
  const modelToUse = overrideMeta ? Object.assign({}, sampleModel, { meta: overrideMeta }) : sampleModel
  env.setup(fillShell(modelToUse, overrideConfig))
}

function cards(doc: Document): Element[] {
  return Array.from(doc.querySelectorAll('#innfo-content [data-innfo-component="element-card"]'))
}

describe('console-review (no mode, always-on decoration)', () => {
  let controllers: any[] = []

  function bootConsole() {
    const mods = env.loadConsole()
    const res = mods.Console.boot(env.document)
    if (res && res.controller) controllers.push(res.controller)
    return mods
  }

  beforeEach(() => {
    controllers = []
    env.setup(readFileSync(shellPath, 'utf8'))
    env.localStorage.clear()
  })

  afterEach(() => {
    controllers.forEach((c) => c && typeof c.destroy === 'function' && c.destroy())
    controllers = []
    env.teardown()
    vi.restoreAllMocks()
  })

  it('renders no review-mode toggle and sets no review-mode attribute', () => {
    renderModelConsole()
    bootConsole()
    expect(env.document.querySelector('[data-innfo="review-toggle"]')).toBeNull()
    expect(env.document.querySelector('.innfo-review-toggle')).toBeNull()
    expect(env.document.documentElement.getAttribute('data-innfo-review')).toBeNull()
  })

  it('decorates every card and the edit anchors at boot, with no mode to enter', () => {
    renderModelConsole()
    bootConsole()
    const viewerCards = cards(env.document)
    expect(viewerCards.length).toBeGreaterThan(0)
    viewerCards.forEach((card) => {
      expect(card.querySelectorAll('[data-innfo-review-ctl]').length).toBeGreaterThan(0)
    })
    // No permanent pencil in a value row any more: editing lives in the badge flyout.
    expect(env.document.querySelector('[data-innfo-ctl="field-anchor"]')).toBeNull()
    expect(env.document.querySelector('.innfo-ku-more')).not.toBeNull()
  })

  it('renders no Edit-structure switch', () => {
    renderModelConsole()
    bootConsole()
    expect(env.document.querySelector('#innfo-review-dock [data-innfo="structure-switch"]')).toBeNull()
    expect(env.document.documentElement.getAttribute('data-innfo-structure')).toBeNull()
  })

  it('keeps the changeset bar hidden while there are no drafts', () => {
    renderModelConsole()
    bootConsole()
    const dock = env.document.getElementById('innfo-review-dock')
    expect(dock).not.toBeNull()
    expect(dock!.getAttribute('data-visible')).toBeNull()
    expect((dock as HTMLElement).style.display).toBe('none')
  })

  it('re-render re-decorates idempotently', () => {
    renderModelConsole()
    bootConsole()

    const search = env.document.getElementById('innfo-search') as HTMLInputElement
    search.value = 'slimer'
    search.dispatchEvent(new env.window.Event('input', { bubbles: true }))

    const visibleCards = cards(env.document)
    expect(visibleCards.length).toBe(1)
    expect(visibleCards[0].querySelectorAll('[data-innfo-review-ctl]').length).toBeGreaterThan(0)
  })
})
