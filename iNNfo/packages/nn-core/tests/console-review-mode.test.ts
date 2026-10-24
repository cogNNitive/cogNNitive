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
 * Capability split: state decoration (the single per-row change-state badge, the
 * change pips, the rail progress) is capability-free and always runs; the edit
 * ANCHORS (tag/relation controls, matrix-cell anchors) decorate only when
 * `canPropose` holds (`meta.modelId` present AND every element carries a `hash`).
 * The export surface is gated separately, by `canReview` (= `canPropose` +
 * `feedback-export` declared).
 *
 * There is NO reviewed toggle any more: a mark was local state with no effect on
 * the domain, so it was removed; the console only ever records CHANGES.
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
      /(<script type="application\/json" id="nn-config">)[\s\S]*?(<\/script>)/,
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
  return Array.from(doc.querySelectorAll('#nn-content [data-nn-component="element-card"]'))
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
    expect(env.document.querySelector('[data-nn="review-toggle"]')).toBeNull()
    expect(env.document.querySelector('.nn-review-toggle')).toBeNull()
    expect(env.document.documentElement.getAttribute('data-nn-review')).toBeNull()
  })

  it('decorates every card and the edit anchors at boot, with no mode to enter', () => {
    renderModelConsole()
    bootConsole()
    const viewerCards = cards(env.document)
    expect(viewerCards.length).toBeGreaterThan(0)
    viewerCards.forEach((card) => {
      expect(card.querySelectorAll('[data-nn-review-ctl]').length).toBeGreaterThan(0)
    })
    // No permanent pencil in a value row any more: editing lives in the badge flyout.
    expect(env.document.querySelector('[data-nn-ctl="field-anchor"]')).toBeNull()
    expect(env.document.querySelector('.nn-ku-more')).not.toBeNull()
  })

  it('gates the edit anchors on canPropose while state decoration always runs', () => {
    // modelId present, but one element has no hash => canPropose is false and
    // canReview is false. The proposal anchors must be withheld; the change-state
    // decoration and the rail progress reflect state and must still decorate.
    const model = {
      meta: sampleModel.meta,
      elements: [
        sampleModel.elements[0],
        { id: 'equip-orphan', concept: 'ContainmentEquipment', name: 'Orphan', fields: {} },
      ],
      matrices: [],
    }
    env.setup(fillShell(model, { needs: ['feedback-export', 'concept-rail', 'fulltext-search'] }))
    bootConsole()

    expect(env.document.querySelectorAll('[data-nn-ctl="tag-add"]').length).toBe(0)
    expect(env.document.querySelectorAll('[data-nn-ctl="rel-add"]').length).toBe(0)
    // No export surface either: canReview is false.
    expect(env.document.querySelector('[data-nn="changed-filter"]')).toBeNull()

    expect(cards(env.document).length).toBeGreaterThan(0)
    // The reviewed toggle is gone; the rail progress now reads the change.
    expect(env.document.querySelector('[data-nn-component="reviewed-toggle"]')).toBeNull()
    const rail = env.document.querySelector('[data-nn-component="rail-progress"]') as HTMLElement
    expect(rail).not.toBeNull()
    expect(rail.getAttribute('data-total')).toBeTruthy()
    expect(rail.getAttribute('data-pending')).toBe('0')
  })

  it('decorates the edit anchors when the domain is proposable', () => {
    renderModelConsole()
    bootConsole()
    expect(env.document.querySelectorAll('[data-nn-ctl="tag-add"]').length).toBeGreaterThan(0)
  })

  it('renders no Edit-structure switch', () => {
    renderModelConsole()
    bootConsole()
    expect(env.document.querySelector('#nn-review-dock [data-nn="structure-switch"]')).toBeNull()
    expect(env.document.documentElement.getAttribute('data-nn-structure')).toBeNull()
  })

  it('keeps the changeset bar hidden while there are no drafts', () => {
    renderModelConsole()
    bootConsole()
    const dock = env.document.getElementById('nn-review-dock')
    expect(dock).not.toBeNull()
    expect(dock!.getAttribute('data-visible')).toBeNull()
    expect((dock as HTMLElement).style.display).toBe('none')
  })

  it('re-render re-decorates idempotently', () => {
    renderModelConsole()
    bootConsole()

    const search = env.document.getElementById('nn-search') as HTMLInputElement
    search.value = 'slimer'
    search.dispatchEvent(new env.window.Event('input', { bubbles: true }))

    const visibleCards = cards(env.document)
    expect(visibleCards.length).toBe(1)
    expect(visibleCards[0].querySelectorAll('[data-nn-review-ctl]').length).toBeGreaterThan(0)
  })
})
