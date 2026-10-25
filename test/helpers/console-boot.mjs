import { JSDOM } from 'jsdom'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

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

export function bootConsole({ registry, model = MODEL, schema, config, url = 'http://localhost', before, runScripts } = {}) {
  const schemaSlot = schema || { concepts: [{ name: 'Fleet' }] }
  const configSlot = config || { needs: ['feedback-export'] }
  const dom = new JSDOM(
    `<!doctype html><html><head></head><body>
      <div id="nn-layout">
        <nav id="nn-rail"></nav>
        <header id="nn-feedback-banner"></header>
        <main>
          <div class="nn-toolbar"><input id="nn-search" type="search" /></div>
          <div id="nn-doc"></div>
          <div id="nn-content"></div>
          <div id="nn-matrices"></div>
        </main>
      </div>
      <script type="application/json" id="nn-config">${JSON.stringify(configSlot)}</script>
      <script type="application/json" id="nn-schema">${JSON.stringify(schemaSlot)}</script>
      <script type="application/json" id="nn-model">${JSON.stringify(model)}</script>
    </body></html>`,
    runScripts ? { url, runScripts } : { url },
  )
  global.window = dom.window
  global.document = dom.window.document
  global.localStorage = dom.window.localStorage
  global.CustomEvent = dom.window.CustomEvent
  if (before) before(dom.window.document)
  const res = nnConsole.boot(dom.window.document, registry ? { registry } : undefined)
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
      /(<script type="application\/json" id="nn-model">)[\s\S]*?(<\/script>)/,
      (_m, open, close) => open + JSON.stringify(MODEL) + close,
    )
    .replace(
      /(<script type="application\/json" id="nn-schema">)[\s\S]*?(<\/script>)/,
      (_m, open, close) => open + JSON.stringify({ concepts: [{ name: 'Fleet' }] }) + close,
    )
  const dom = new JSDOM(html, { url: 'http://localhost' })
  global.window = dom.window
  global.document = dom.window.document
  global.localStorage = dom.window.localStorage
  global.CustomEvent = dom.window.CustomEvent
  const res = nnConsole.boot(dom.window.document)
  return { dom, document: dom.window.document, res }
}

// Records a comment draft through the tag proposal popover (the card-level
// annotate anchor was retired in favour of the KU modal).
export function addCommentDraft(document) {
  const Ev = document.defaultView.Event
  document
    .querySelector('[data-nn-ctl="tag-add"]')
    .dispatchEvent(new Ev('click', { bubbles: true }))
  const pop = document.querySelector('.nn-popover-comment')
  pop.value = 'looks wrong'
  document.querySelector('.nn-popover-save').dispatchEvent(new Ev('click', { bubbles: true }))
}

