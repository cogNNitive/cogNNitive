// @vitest-environment node
//
// SCS S1.3: working element deep links. A `#el-<model-qualified id>` hash opens
// that element's card, switching concept when the current filter hides it. An
// unknown id is a no-op, and a view-scoped console does nothing.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createConsoleEnv, consoleDir } from './helpers/console-review-env'

const env = createConsoleEnv()
const shellPath = join(consoleDir, 'artifact_shell.html')

const sampleSchema = { concepts: [{ name: 'ParanormalThreat' }, { name: 'Vehicle' }] }

function buildModel(extraMeta: Record<string, unknown> = {}) {
  return {
    meta: {
      modelId: 'ghostbusters-model',
      title: 'GhostbustersModel',
      modelVersion: 'V_0-2-1',
      sha256: 'aa'.repeat(32),
      ...extraMeta,
    },
    elements: [
      { id: 'threat-slimer', concept: 'ParanormalThreat', name: 'Slimer', hash: 'h1', fields: {} },
      { id: 'vehicle-ecto-1', concept: 'Vehicle', name: 'Ecto-1', hash: 'h2', fields: {} },
    ],
    matrices: [],
  }
}

function renderShell(model: unknown = buildModel()): void {
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

function searchBox(): HTMLInputElement {
  return env.document.getElementById('nn-search') as HTMLInputElement
}

describe('console deep links (#el-<id>)', () => {
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

  it('opens the linked card on boot', () => {
    renderShell()
    env.window.history.replaceState(null, '', '#el-vehicle-ecto-1')
    boot()
    const card = env.document.getElementById('el-vehicle-ecto-1')
    expect(card).not.toBeNull()
    expect(card!.getAttribute('data-open')).toBe('true')
    expect(env.document.getElementById('el-threat-slimer')!.getAttribute('data-open')).toBe('false')
  })

  it('switches concept when the linked element is filtered out', () => {
    renderShell()
    boot()
    searchBox().value = 'concept:ParanormalThreat'
    searchBox().dispatchEvent(new env.window.Event('input', { bubbles: true }))
    expect(env.document.getElementById('el-vehicle-ecto-1')).toBeNull()

    env.window.history.replaceState(null, '', '#el-vehicle-ecto-1')
    env.window.dispatchEvent(new env.window.Event('hashchange'))

    expect(searchBox().value).toContain('Vehicle')
    const card = env.document.getElementById('el-vehicle-ecto-1')
    expect(card).not.toBeNull()
    expect(card!.getAttribute('data-open')).toBe('true')
  })

  it('is a no-op for an unknown id', () => {
    renderShell()
    env.window.history.replaceState(null, '', '#el-does-not-exist')
    expect(() => boot()).not.toThrow()
    expect(env.document.querySelector('[data-open="true"]')).toBeNull()
  })

  it('is a no-op in a view-scoped console', () => {
    renderShell(buildModel({ consoleScope: { view: 'timeline', label: 'Timeline' } }))
    env.window.history.replaceState(null, '', '#el-vehicle-ecto-1')
    expect(() => boot()).not.toThrow()
  })
})
