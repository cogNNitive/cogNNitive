// @vitest-environment node
//
// SCS S1.7: header-level `sources` citation icons. An element whose `citations`
// carry the `sources` family renders a `CitationIcon` in `.nn-card-head`
// (parity with the retired model viewer). `opts.head` carries it there.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createConsoleEnv, consoleDir } from './helpers/console-review-env'

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
      /(<script type="application\/json" id="nn-model">)[\s\S]*?(<\/script>)/,
      `$1${JSON.stringify(buildModel())}$2`,
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
    const res = mods.Console.boot(env.document)
    if (res && res.controller) controllers.push(res.controller)
    const head = env.document.querySelector('[data-element-id="t1"] .nn-card-head')
    expect(head).not.toBeNull()
    expect(
      head!.querySelectorAll('[data-nn-component="citation-icon"]').length,
    ).toBeGreaterThanOrEqual(1)
  })
})
