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

export function bootConsole({ registry, model = MODEL, schema, config, url = 'http://localhost', before, runScripts, viewData } = {}) {
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
          <div class="nn-toolbar"><input id="nn-search" type="search" /></div>
          <div id="nn-doc"></div>
          <div id="nn-content"></div>
          <div id="nn-matrices"></div>
        </main>
      </div>
      <script type="application/json" id="nn-config">${JSON.stringify(configSlot)}</script>
      <script type="application/json" id="nn-schema">${JSON.stringify(schemaSlot)}</script>
      <script type="application/json" id="nn-model">${JSON.stringify(model)}</script>
      ${viewDataSlot}
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

// Records a draft through the unit editor. The tag-proposal popover was retired when
// editing was unified into the KU modal, so the anchor now opens that modal: switch to
// its Edit tab, fill the value, save. (The modal still has no list-valued editor, so a
// tag is proposed as a plain value until the ChipEditor lands — issue #490.)
export function addCommentDraft(document) {
  const Ev = document.defaultView.Event
  const fire = (node, type) => node.dispatchEvent(new Ev(type, { bubbles: true }))
  fire(document.querySelector('[data-nn-ctl="tag-add"]'), 'click')

  const modal = document.querySelector('[data-nn-component="edit-modal"]')
  if (!modal) throw new Error('addCommentDraft: the unit editor did not open')
  const editTab = [...modal.querySelectorAll('.nn-modal-tab-btn')].find(
    (b) => b.textContent.trim() === 'Edit',
  )
  if (editTab) fire(editTab, 'click')

  const input = modal.querySelector('.nn-edit-input')
  if (!input) throw new Error('addCommentDraft: the edit form has no value input')
  input.value = 'looks wrong'
  const save = modal.querySelector('.nn-edit-btn-save')
  if (!save) throw new Error('addCommentDraft: the edit form has no save control')
  fire(save, 'click')
}

