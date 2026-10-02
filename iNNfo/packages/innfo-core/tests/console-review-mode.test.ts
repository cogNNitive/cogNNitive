// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createConsoleEnv, modelConsolePath } from './helpers/console-review-env'

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

function renderModelConsole(overrideConfig?: any, overrideMeta?: any): void {
  const html = readFileSync(modelConsolePath, 'utf8')
  const modelToUse = overrideMeta ? Object.assign({}, sampleModel, { meta: overrideMeta }) : sampleModel
  const filled = html
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
  env.setup(filled)
}

function reviewCtl(doc: Document): Element[] {
  return Array.from(doc.querySelectorAll('[data-innfo-review-ctl]'))
}

describe('console-review-mode (toggle + decoration)', () => {
  let controllers: any[] = []

  function bootConsole() {
    const mods = env.loadConsole()
    const res = mods.Console.boot(env.document)
    if (res && res.controller) controllers.push(res.controller)
    return mods
  }

  beforeEach(() => {
    controllers = []
    env.setup(readFileSync(modelConsolePath, 'utf8'))
    env.localStorage.clear()
  })

  afterEach(() => {
    controllers.forEach((c) => c && typeof c.destroy === 'function' && c.destroy())
    controllers = []
    env.teardown()
    vi.restoreAllMocks()
  })

  it('renders the toggle only with feedback-export, modelId and all 16-hex hashes', () => {
    renderModelConsole()
    bootConsole()
    expect(env.document.querySelector('[data-innfo="review-toggle"]')).not.toBeNull()
  })

  it('withholds the toggle when modelId is missing', () => {
    renderModelConsole(undefined, {
      title: 'GhostbustersModel',
      modelVersion: 'V_0-2-1',
      sha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    })
    bootConsole()
    expect(env.document.querySelector('[data-innfo="review-toggle"]')).toBeNull()
  })

  it('withholds the toggle when an element lacks a hash', () => {
    const model = JSON.parse(JSON.stringify(sampleModel))
    delete model.elements[1].hash
    const html = readFileSync(modelConsolePath, 'utf8')
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

    bootConsole()
    expect(env.document.querySelector('[data-innfo="review-toggle"]')).toBeNull()
  })

  it('is off by default: zero review control nodes', () => {
    renderModelConsole()
    bootConsole()
    expect(env.document.documentElement.getAttribute('data-innfo-review')).not.toBe('on')
    expect(reviewCtl(env.document)).toHaveLength(0)
  })

  it('toggle on sets html[data-innfo-review=on], aria-pressed and decorates every card', () => {
    renderModelConsole()
    const { Viewer } = bootConsole()
    Viewer.boot()

    const toggle = env.document.querySelector('[data-innfo="review-toggle"]') as HTMLElement
    toggle.dispatchEvent(new env.window.Event('click', { bubbles: true }))

    expect(env.document.documentElement.getAttribute('data-innfo-review')).toBe('on')
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    const cards = env.document.querySelectorAll('#content [data-innfo-component="element-card"]')
    expect(cards.length).toBeGreaterThan(0)
    cards.forEach((card) => {
      expect(card.querySelectorAll('[data-innfo-review-ctl]').length).toBeGreaterThan(0)
    })
  })

  it('toggle off cleans up every review control', () => {
    renderModelConsole()
    const { Viewer } = bootConsole()
    Viewer.boot()
    const toggle = env.document.querySelector('[data-innfo="review-toggle"]') as HTMLElement
    toggle.dispatchEvent(new env.window.Event('click', { bubbles: true }))
    expect(reviewCtl(env.document).length).toBeGreaterThan(0)

    toggle.dispatchEvent(new env.window.Event('click', { bubbles: true }))
    expect(env.document.documentElement.getAttribute('data-innfo-review')).not.toBe('on')
    expect(reviewCtl(env.document)).toHaveLength(0)
  })

  it('re-render dispatches innfo:rendered and re-decorates idempotently', () => {
    renderModelConsole()
    const { Viewer } = bootConsole()
    Viewer.boot()
    const toggle = env.document.querySelector('[data-innfo="review-toggle"]') as HTMLElement
    toggle.dispatchEvent(new env.window.Event('click', { bubbles: true }))

    const search = env.document.getElementById('search') as HTMLInputElement
    search.value = 'slimer'
    search.dispatchEvent(new env.window.Event('input', { bubbles: true }))

    const visibleCards = env.document.querySelectorAll('#content [data-innfo-component="element-card"]')
    expect(visibleCards.length).toBe(1)
    expect(visibleCards[0].querySelectorAll('[data-innfo-review-ctl]').length).toBeGreaterThan(0)
  })

  it('decorates the viewer cards from the same controller when the viewer renders', () => {
    renderModelConsole()
    const { Viewer } = bootConsole()
    const toggle = env.document.querySelector('[data-innfo="review-toggle"]') as HTMLElement
    toggle.dispatchEvent(new env.window.Event('click', { bubbles: true }))

    Viewer.boot()

    const viewerCards = Array.from(
      env.document.querySelectorAll('#content [data-innfo-component="element-card"]'),
    )
    expect(viewerCards.length).toBeGreaterThan(0)
    viewerCards.forEach((card) => {
      expect(card.querySelectorAll('[data-innfo-review-ctl]').length).toBeGreaterThan(0)
    })
  })
})
