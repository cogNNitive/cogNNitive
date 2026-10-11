// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { createConsoleEnv, modelConsolePath } from './helpers/console-review-env'

const env = createConsoleEnv()

const sampleSchema = { concepts: [{ name: 'ParanormalThreat' }] }

const model = {
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
      fields: { owner: 'Slimer' },
    },
  ],
  matrices: [],
}

let controllers: any[] = []

function boot(withReview: boolean) {
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
  const mods = env.loadConsole()
  const res = mods.Console.boot(env.document)
  if (res && res.controller) controllers.push(res.controller)
  if (withReview) {
    ;(env.document.querySelector('[data-innfo="review-toggle"]') as HTMLElement).dispatchEvent(
      new env.window.Event('click', { bubbles: true }),
    )
  }
  mods.Viewer.boot()
  return mods
}

describe('console review info action + change pip', () => {
  beforeEach(() => {
    controllers = []
  })

  afterEach(() => {
    env.teardown()
  })

  it('shows an info action on a unit badge with review mode OFF, and no review controls', () => {
    boot(false)
    const badge = env.document.querySelector('.innfo-card-head [data-ku-kind="element"]') as HTMLElement
    expect(badge).not.toBeNull()
    const actions = badge.parentElement!.querySelector('[data-innfo-component="ku-actions"]')
    expect(actions).not.toBeNull()
    expect(actions!.querySelector('[data-ku-action="info"]')).not.toBeNull()
    expect(env.document.querySelector('[data-innfo-review-ctl]')).toBeNull()
  })

  it('adds a count pip to the targeted unit badge when a draft exists', () => {
    boot(false)
    const c = controllers[0]
    c.propose({ elementId: 'threat-slimer', field: '__name' }, { kind: 'correction', proposed: 'Z' })
    c.refresh()
    const badge = env.document.querySelector('.innfo-card-head [data-ku-kind="element"]') as HTMLElement
    expect(badge.getAttribute('data-ku-changes')).toBe('1')
    expect(badge.querySelector('[data-innfo-component="ku-change-pip"]')!.textContent).toBe('1')
  })
})
