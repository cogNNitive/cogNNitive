/**
 * Per-test JSDOM harness for the console review suites.
 *
 * vitest runs nn-core with `pool: 'forks'` + `singleFork: true`, so every
 * test file shares one process and a shared jsdom document is a singleton. The
 * console UMD sources cache references to `document` at load, so a shared
 * document leaks state between suites. A fresh JSDOM per test removes the
 * singleton entirely (the same pattern `test/console-review.test.mjs` uses).
 *
 * Usage in a suite:
 *   // @vitest-environment node
 *   const env = createConsoleEnv()
 *   beforeEach(() => env.setup())
 *   afterEach(() => env.teardown())
 *   ... env.document / env.window / env.loadConsole()
 */
import { JSDOM } from 'jsdom'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const req = createRequire(import.meta.url)
// tests/helpers -> tests -> nn-core -> packages -> iNNfo
const iNNfoDir = join(import.meta.dirname!, '..', '..', '..', '..')
export const consoleDir = join(iNNfoDir, 'specs', 'bluepriNNts', 'console')
export const blueprintsDir = join(iNNfoDir, 'specs', 'bluepriNNts')
// SCS: one shell, no model viewer. Every suite boots `artifact_shell.html`
// through `InnfoConsole.boot`; the retired `model_console.html` /
// `render-model-viewer.js` are gone.
export const shellPath = join(consoleDir, 'artifact_shell.html')

const CONSOLE_SOURCES = ['ui-kit.js', 'review.js', 'innfo-runtime.js']

type Env = {
  dom: JSDOM
  window: any
  document: Document
  localStorage: Storage
}

function clearCache(): void {
  for (const f of CONSOLE_SOURCES) {
    try {
      delete req.cache[req.resolve(join(consoleDir, f))]
    } catch {
      /* not resolved yet */
    }
  }
}

export function createConsoleEnv() {
  let env: Env | null = null

  function setup(shellHtml?: string): Env {
    const html =
      shellHtml !== undefined
        ? shellHtml
        : readFileSync(shellPath, 'utf8')
    const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'outside-only' })
    const g = globalThis as any
    g.window = dom.window
    g.document = dom.window.document
    g.localStorage = dom.window.localStorage
    g.location = dom.window.location
    g.CustomEvent = dom.window.CustomEvent
    g.Event = dom.window.Event
    g.KeyboardEvent = dom.window.KeyboardEvent
    g.HTMLElement = dom.window.HTMLElement
    g.HTMLDialogElement = dom.window.HTMLDialogElement
    g.Node = dom.window.Node
    // The UMD runtime auto-boots when it sees an #innfo-config slot. These suites
    // boot explicitly, so suppress the module-level auto-boot: without this the
    // document gets TWO controllers (auto + explicit), each registering its own
    // keydown listener, so `j`/`k` advance two cards per press.
    g.__innfoNoAutoBoot = true
    env = {
      dom,
      window: dom.window,
      document: dom.window.document,
      localStorage: dom.window.localStorage,
    }
    clearCache()
    return env
  }

  function teardown(): void {
    clearCache()
    const g = globalThis as any
    delete g.window
    delete g.document
    delete g.localStorage
    delete g.InnfoUI
    delete g.InnfoReview
    delete g.InnfoConsole
    delete g.__innfoNoAutoBoot
    env = null
  }

  /** Require the three console sources against the current document. */
  function loadConsole() {
    const g = globalThis as any
    delete g.InnfoUI
    delete g.InnfoReview
    delete g.InnfoConsole
    clearCache()
    g.InnfoUI = req(join(consoleDir, 'ui-kit.js'))
    g.InnfoReview = req(join(consoleDir, 'review.js'))
    g.InnfoConsole = req(join(consoleDir, 'innfo-runtime.js'))
    return {
      UI: g.InnfoUI,
      Review: g.InnfoReview,
      Console: g.InnfoConsole,
    }
  }

  return {
    setup,
    teardown,
    loadConsole,
    get document(): Document {
      if (!env) throw new Error('createConsoleEnv: setup() not called')
      return env.document
    },
    get window(): any {
      if (!env) throw new Error('createConsoleEnv: setup() not called')
      return env.window
    },
    get localStorage(): Storage {
      if (!env) throw new Error('createConsoleEnv: setup() not called')
      return env.localStorage
    },
  }
}
