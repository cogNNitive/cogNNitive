// @vitest-environment node
//
// SCS S1.7: header-level `sources` citation icons. An element whose `citations`
// carry the `sources` family renders a `CitationIcon` in `.nn-card-head`
// (parity with the retired model viewer). `opts.head` carries it there.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createConsoleEnv, consoleDir } from './helpers/console-review-env'
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
const shellPath = join(consoleDir, 'artifact_shell.html')

const sampleSchema = { concepts: [{ name: 'Threat' }] }

function buildModel() {
  return {
    meta: { modelId: 'm', title: 'M', modelVersion: 'V_1-0-0', sha256: 'aa'.repeat(32) },
    elements: [
      {
        id: 't1',
        concept: 'Threat',
        name: 'T1',
        hash: 'h1',
        fields: {},
        citations: { sources: [{ origin: 'human', field: 'sources', path: 'sources/x.md' }] },
      },
    ],
    matrices: [],
  }
}

function renderShell(): void {
  const html = readFileSync(shellPath, 'utf8')
    .replace(
      /(<script type="application\/json" id="nn-schema">)[\s\S]*?(<\/script>)/,
      `$1${JSON.stringify(sampleSchema)}$2`,
    )
    .replace(
      /(<script type="application\/x-nn-deflate-base64" id="nn-model">)[\s\S]*?(<\/script>)/,
      `$1${encodeModelSlot(buildModel())}$2`,
    )
    .replace(
      /(<script type="application\/json" id="nn-config">)[\s\S]*?(<\/script>)/,
      '$1{"needs":["concept-rail","fulltext-search"]}$2',
    )
    .replace(/<script\b[^>]*\bsrc=[^>]*><\/script>/g, '')
  env.setup(html)
}

let controllers: any[] = []

beforeEach(() => {
  controllers = []
  env.setup(readFileSync(shellPath, 'utf8'))
  env.localStorage.clear()
})

afterEach(() => {
  controllers.forEach((c) => c && c.destroy && c.destroy())
  controllers = []
  env.teardown()
})

describe('header-level sources icons', () => {
  it('renders a citation icon in the card head', () => {
    renderShell()
    const mods = env.loadConsole()
    const res = mods.Console.boot(env.document, { modelText: decodedModelText(env.document) })
    if (res && res.controller) controllers.push(res.controller)
    const head = env.document.querySelector('[data-element-id="t1"] .nn-card-head')
    expect(head).not.toBeNull()
    expect(
      head!.querySelectorAll('[data-nn-component="citation-icon"]').length,
    ).toBeGreaterThanOrEqual(1)
  })
})
