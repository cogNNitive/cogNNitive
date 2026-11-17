// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { createConsoleEnv, shellPath } from './helpers/console-review-env'
import { deflateRawSync, inflateRawSync } from 'node:zlib'

/** The nn-model slot holds the payload deflate-raw compressed and base64 encoded. */
const encodeModelSlot = (model: unknown): string =>
  deflateRawSync(Buffer.from(JSON.stringify(model), 'utf8'), { level: 9 }).toString('base64')

/** The decoded JSON text of a document's nn-model slot; the page decodes it before boot. */
const decodedModelText = (doc: Document): string => {
  const text = (doc.getElementById('nn-model')?.textContent ?? '').trim()
  return text ? inflateRawSync(Buffer.from(text, 'base64')).toString('utf8') : ''
}

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
  const html = readFileSync(shellPath, 'utf8')
    .replace(
      /(<script type="application\/json" id="nn-schema">)[\s\S]*?(<\/script>)/,
      `$1${JSON.stringify(sampleSchema)}$2`,
    )
    .replace(
      /(<script type="application\/x-nn-deflate-base64" id="nn-model">)[\s\S]*?(<\/script>)/,
      `$1${encodeModelSlot(model)}$2`,
    )
    .replace(
      /(<script type="application\/json" id="nn-config">)[\s\S]*?(<\/script>)/,
      '$1{"needs":["feedback-export","concept-rail","fulltext-search"]}$2',
    )
    .replace(/<script\b[^>]*\bsrc=[^>]*><\/script>/g, '')
  env.setup(html)
  const mods = env.loadConsole()
  const res = mods.Console.boot(env.document, { modelText: decodedModelText(env.document) })
  if (res && res.controller) controllers.push(res.controller)
  if (withReview) {
    /* no review mode: edits are live */
  }
  return mods
}

describe('console review info action + change pip', () => {
  beforeEach(() => {
    controllers = []
  })

  afterEach(() => {
    env.teardown()
  })

  it('shows an info action on a unit badge, with no toggle and decoration always on', () => {
    boot(false)
    const badge = env.document.querySelector('.nn-card-head [data-ku-kind="element"]') as HTMLElement
    expect(badge).not.toBeNull()
    const actions = badge.parentElement!.querySelector('.nn-ku-actions')
    expect(actions).not.toBeNull()
    expect(actions!.querySelector('[data-ku-action="info"]')).not.toBeNull()
    // No mode: no toggle exists, and the review controls are decorated from boot.
    expect(env.document.querySelector('[data-nn="review-toggle"]')).toBeNull()
    expect(env.document.querySelector('[data-nn-review-ctl]')).not.toBeNull()
  })

  it('adds a count pip to the targeted unit badge when a draft exists', () => {
    boot(false)
    const c = controllers[0]
    c.propose({ elementId: 'threat-slimer', field: '__name' }, { kind: 'correction', proposed: 'Z' })
    c.refresh()
    const badge = env.document.querySelector('.nn-card-head [data-ku-kind="element"]') as HTMLElement
    expect(badge.getAttribute('data-ku-changes')).toBe('1')
    expect(
      badge.parentElement!.querySelector('[data-nn-component="ku-change-pip"]')!.textContent,
    ).toBe('1')
  })
})
