import { JSDOM } from 'jsdom'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
export const consoleDir = join(here, '..', '..', 'iNNfo', 'specs', 'bluepriNNts', 'console')

globalThis.__innfoNoAutoBoot = true
global.InnfoIcons = require(join(consoleDir, 'innfo-icons.js'))
export const InnfoConsole = require(join(consoleDir, 'innfo-runtime.js'))

export const MODEL = {
  meta: { title: 'Ghost Busters Model', modelId: 'ghost-busters', modelVersion: 'V_1-0-0' },
  elements: [
    {
      id: 'ecto-1',
      concept: 'Fleet',
      name: 'Ecto-1',
      description: 'Car.',
      fields: { role: 'Interceptor' },
      tags: ['iconic'],
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

export function bootConsole() {
  const dom = new JSDOM(
    `<!doctype html><html><head></head><body>
      <div id="innfo-layout">
        <nav id="innfo-rail"></nav>
        <header id="innfo-feedback-banner"></header>
        <main>
          <div class="innfo-toolbar"><input id="innfo-search" type="search" /></div>
          <div id="innfo-doc"></div>
          <div id="innfo-content"></div>
          <div id="innfo-matrices"></div>
        </main>
      </div>
      <script type="application/json" id="innfo-config">{"needs":["feedback-export"]}</script>
      <script type="application/json" id="innfo-schema">{"concepts":[{"name":"Fleet"}]}</script>
      <script type="application/json" id="innfo-model">${JSON.stringify(MODEL)}</script>
    </body></html>`,
    { url: 'http://localhost' },
  )
  global.window = dom.window
  global.document = dom.window.document
  global.localStorage = dom.window.localStorage
  global.CustomEvent = dom.window.CustomEvent
  const res = InnfoConsole.boot(dom.window.document)
  return { dom, document: dom.window.document, res }
}

export function addCommentDraft(document) {
  const Ev = document.defaultView.Event
  document
    .querySelector('[data-innfo-ctl="card-anchor"]')
    .dispatchEvent(new Ev('click', { bubbles: true }))
  const pop = document.querySelector('.innfo-popover-comment')
  pop.value = 'looks wrong'
  document.querySelector('.innfo-popover-save').dispatchEvent(new Ev('click', { bubbles: true }))
}

