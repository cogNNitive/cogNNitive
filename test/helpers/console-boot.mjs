import { JSDOM } from 'jsdom'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { topmostModal, submitEdit } from './console-contract.mjs'
import { decodedModelTextOf, modelSlotMarkup } from './console-slots.mjs'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
export const consoleDir = join(here, '..', '..', 'iNNfo', 'specs', 'bluepriNNts', 'console')

globalThis.__innfoNoAutoBoot = true
global.nnIcons = require(join(consoleDir, 'nn-icons.js'))
export const nnConsole = require(join(consoleDir, 'nn-runtime.js'))

export const MODEL = {
  meta: { title: 'Ghost Busters Model', modelId: 'ghost-busters', modelVersion: 'V_1-0-0', changesBlueprintVersion: 'V_0-3-0' },
  elements: [
    {
      id: 'ecto-1',
      concept: 'Fleet',
      name: 'Ecto-1',
      description: 'Car.',
      fields: { role: 'Interceptor' },
      hash: '0123456789abcdef',
    },
  ],
  matrices: [
    {
      name: 'Coverage',
      rows: ['a'],
      cols: ['b'],
      cells: { 'a|b': 'x' },
    },
  ],
}

// A plain assignment cannot undo `installSandboxedStorage`'s accessor: a
// property with a getter and no setter swallows the write, so every later boot
// would keep throwing. Redefine the property instead, in both directions.
function setGlobalStorage(value) {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value,
  })
}

/**
 * Reproduces a sandboxed iframe without `allow-same-origin`: reading
 * `window.localStorage` throws instead of returning undefined. A `typeof` guard
 * cannot survive that, which is the failure in issue #779.
 */
export function installSandboxedStorage() {
  const thrower = () => {
    throw new Error("The document is sandboxed and lacks the 'allow-same-origin' flag.")
  }
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: thrower })
  if (global.window) {
    Object.defineProperty(global.window, 'localStorage', { configurable: true, get: thrower })
  }
}

// `drafts` fills the nn-drafts slot (`{ drafts, uiState }`); absent, the slot is `{}`.
export function bootConsole({ registry, model = MODEL, schema, config, url = 'http://localhost', before, runScripts, viewData, drafts, sandboxedStorage = false } = {}) {
  const schemaSlot = schema || { concepts: [{ name: 'Fleet' }] }
  const configSlot = config || { needs: ['feedback-export'] }
  // Absent viewData keeps the slot out, so the "no data" path is the real shell path.
  const viewDataSlot = viewData === undefined ? '' : `<script type="application/json" id="nn-view-data">${JSON.stringify(viewData)}</script>`
  const dom = new JSDOM(
    `<!doctype html><html><head></head><body>
      <div id="nn-layout">
        <nav id="nn-rail"></nav>
        <header id="nn-feedback-banner"></header>
        <main>
          <div class="nn-toolbar">
            <input id="nn-search" type="search" />
            <div id="nn-filter-facets"></div>
            <div id="nn-active-filters"></div>
          </div>
          <div id="nn-doc"></div>
          <div id="nn-content"></div>
          <div id="nn-matrices"></div>
        </main>
      </div>
      <script type="application/json" id="nn-config">${JSON.stringify(configSlot)}</script>
      <script type="application/json" id="nn-schema">${JSON.stringify(schemaSlot)}</script>
      ${modelSlotMarkup(model)}
      <script type="application/json" id="nn-drafts">${JSON.stringify(drafts || {})}</script>
      ${viewDataSlot}
    </body></html>`,
    runScripts ? { url, runScripts } : { url },
  )
  global.window = dom.window
  global.document = dom.window.document
  global.CustomEvent = dom.window.CustomEvent
  if (sandboxedStorage) installSandboxedStorage()
  else setGlobalStorage(dom.window.localStorage)
  if (before) before(dom.window.document)
  // The real page decodes nn-model asynchronously before boot; tests pre-decode it with
  // the Node codec so boot stays synchronous.
  const modelText = decodedModelTextOf(dom.window.document)
  const res = nnConsole.boot(dom.window.document, registry ? { registry, modelText } : { modelText })
  return { dom, document: dom.window.document, res }
}

// Boots the console from the REAL artifact shell, where #nn-matrices already
// sits inside #nn-tab-explorer. Scripts are stripped (the runtime is loaded
// above) and the model/schema slots are filled with the test model.
export function bootConsoleFromShell() {
  const shell = readFileSync(join(consoleDir, 'artifact_shell.html'), 'utf8')
  const html = shell
    .replace(/<script\s+src=[^>]*><\/script>/g, '')
    .replace(
      /<script type="[^"]*" id="nn-model">[\s\S]*?<\/script>/,
      () => modelSlotMarkup(MODEL),
    )
    .replace(
      /(<script type="application\/json" id="nn-schema">)[\s\S]*?(<\/script>)/,
      (_m, open, close) => open + JSON.stringify({ concepts: [{ name: 'Fleet' }] }) + close,
    )
  const dom = new JSDOM(html, { url: 'http://localhost' })
  global.window = dom.window
  global.document = dom.window.document
  global.CustomEvent = dom.window.CustomEvent
  setGlobalStorage(dom.window.localStorage)
  const res = nnConsole.boot(dom.window.document, { modelText: decodedModelTextOf(dom.window.document) })
  return { dom, document: dom.window.document, res }
}

// Records a draft by proposing a tag in place: "+ tag" turns into a small input, the
// word is typed and Enter proposes it as a correction of the element's `tags`.
export function addCommentDraft(document) {
  const Ev = document.defaultView.Event
  document.querySelector('[data-nn-ctl="tag-add"]').dispatchEvent(new Ev('click', { bubbles: true }))
  // "+ tag" turns into an inline input: type the tag and press Enter.
  const input = document.querySelector('[data-nn-ctl="tag-input"]')
  if (!input) throw new Error('addCommentDraft: the inline tag input did not open')
  input.value = 'looks-wrong'
  input.dispatchEvent(new document.defaultView.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
}

