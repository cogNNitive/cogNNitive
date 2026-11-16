// @jsdom — the committed artifact is executed inside jsdom; no browser, no network,
// no fixture domain export. This is the only suite that loads
// `iNNfo/specs/bluepriNNts/console/nn-console.bundle.js` itself: every other console
// test boots the separate source modules, so a build that composes them in the wrong
// order, drops one, or ships a stale banner used to reach main unguarded.
import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { JSDOM } from 'jsdom'
import { consoleDir } from './helpers/console-boot.mjs'

const require = createRequire(import.meta.url)
const { SOURCES } = require('../scripts/lib/console-bundle.js')

const bundle = readFileSync(join(consoleDir, 'nn-console.bundle.js'), 'utf8')
const pkg = JSON.parse(readFileSync(join(consoleDir, 'package.json'), 'utf8'))

// The minimal shell the runtime boots against: the slots it parses plus the three
// containers it mounts into. No entries, so the boot stays a wiring check.
function shellHtml(model = { meta: { title: 'T', modelId: 't', modelVersion: 'V_1-0-0' }, elements: [], matrices: [] }) {
  return `<!doctype html><html><head></head><body>
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
  <script type="application/json" id="nn-config">{"needs":["feedback-export"]}</script>
  <script type="application/json" id="nn-schema">{"concepts":[{"name":"Fleet"}]}</script>
  <script type="application/json" id="nn-model">${JSON.stringify(model)}</script>
</body></html>`
}

const SHELL = shellHtml()

// Executes the committed bundle as one classic script inside the DOM, exactly the way
// the exported console loads it. `__innfoNoAutoBoot` keeps the runtime from booting
// itself before the test is ready to read the result. `before` patches the window
// before the bundle runs, and `hash` sets the deep link the boot reads.
function bootBundle(html = SHELL, { hash = '', before } = {}) {
  const dom = new JSDOM(html, { url: 'http://localhost/' + hash, runScripts: 'dangerously', pretendToBeVisual: true })
  const win = dom.window
  win.__innfoNoAutoBoot = true
  if (before) before(win)
  // jsdom ships neither; the bundled vendor code probes both at load time.
  win.matchMedia = () => ({
    matches: false,
    media: '',
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false
    },
  })
  win.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  const script = win.document.createElement('script')
  script.textContent = bundle
  // Throws if a source in the bundle fails against a missing predecessor.
  win.document.body.appendChild(script)
  return { dom, win, document: win.document }
}

describe('committed nn-console.bundle.js', () => {
  let ctx

  before(() => {
    ctx = bootBundle()
  })

  it('is composed from the declared sources, in order, and defines every one', () => {
    const declared = SOURCES.map(([file]) => file)
    const composed = /^ \* Composed \(in dependency order\): (.*)\.$/m.exec(bundle)
    assert.ok(composed, 'the bundle header names its composed sources')
    assert.deepEqual(composed[1].split(', '), declared)

    const markers = [...bundle.matchAll(/\/\* ===== (\S+) \(defines (\S+)\) ===== \*\//g)].map(m => [m[1], m[2]])
    assert.deepEqual(markers, SOURCES, 'one body marker per source, in composition order')

    for (const [, globalName] of markers) {
      assert.notEqual(ctx.win[globalName], undefined, `${globalName} is defined by the executed bundle`)
    }
  })

  it('boots the console', () => {
    const res = ctx.win.nnConsole.boot(ctx.document)
    assert.equal(res.ok, true)
    assert.equal(res.elements, 0)
  })

  it('renders one icon through the sprite, not an empty box', () => {
    const host = ctx.document.getElementById('nn-content')
    host.innerHTML = ctx.win.nnIcons.getSvg('download', { size: 14, doc: ctx.document })

    const svg = host.querySelector('svg.lucide-download')
    assert.ok(svg, 'the icon markup becomes a real <svg>')
    const use = svg.querySelector('use')
    assert.equal(use?.getAttribute('href'), '#nn-i-download')

    const sprite = ctx.document.getElementById('nn-icon-sprite')
    assert.ok(sprite, 'the sprite host is mounted once per document')
    const symbol = ctx.document.getElementById('nn-i-download')
    assert.ok(symbol, 'the <use> target exists')
    assert.equal(symbol.namespaceURI, 'http://www.w3.org/2000/svg')
    assert.ok(symbol.children.length > 0, 'the symbol carries geometry, so the box is not empty')
  })

  it('renders one markdown body through the console renderer', () => {
    const host = ctx.document.getElementById('nn-content')
    const value = '## Goal\n\nA **fast** body with <img src=x onerror=1>'
    host.appendChild(ctx.win.nnUI.FieldValue({ name: 'description', value, type: 'markdown' }, ctx.document))

    const rendered = host.querySelector('.nn-field-markdown')
    assert.ok(rendered, 'a markdown-typed field renders as markdown')
    assert.match(rendered.className, /nn-markdown/)
    assert.equal(rendered.querySelector('h2')?.textContent, 'Goal')
    assert.equal(rendered.querySelector('strong')?.textContent, 'fast')
    assert.equal(rendered.querySelector('img'), null, 'raw HTML in the body stays inert')
    assert.ok(rendered.textContent.includes('<img src=x onerror=1>'), 'the markup is shown as text')
  })

  it('ships the version banner of the package it belongs to', () => {
    const banners = [...bundle.matchAll(/^ \* Version ([\d.]+)\. Regenerate on every console release\.$/gm)]
    assert.equal(banners.length, 1, 'exactly one generated version banner')
    assert.equal(banners[0][1], pkg.version, `banner version matches console/package.json (${pkg.version})`)
  })
})

// RENDER_PAGE is 100 in nn-runtime.js: a plain boot mounts one page, so a domain this
// wide makes "one page" and "every card" impossible to confuse. The focused element is
// deliberately off the first page, where the old code mounted every card before it.
const PAGE = 100
const WIDE_TOTAL = 450
const FOCUS_INDEX = 430
const FOCUS_ID = 'e' + FOCUS_INDEX

function wideModel() {
  return {
    meta: { title: 'Wide', modelId: 'wide', modelVersion: 'V_1-0-0' },
    elements: Array.from({ length: WIDE_TOTAL }, (_, i) => ({
      id: 'e' + i,
      concept: 'Fleet',
      name: 'Element ' + i,
      description: 'Element number ' + i,
      fields: { role: 'role ' + i },
    })),
    matrices: [],
  }
}

const cards = (document) => document.querySelectorAll('[data-nn-component="element-card"]')

// Boots the committed bundle over the wide domain. `scrolls` records every
// scrollIntoView call the boot makes, so "the focused card is scrolled into view" is
// observable without a real layout engine.
function bootWide(hash = '') {
  const scrolls = []
  const ctx = bootBundle(shellHtml(wideModel()), {
    hash,
    before: (win) => {
      win.Element.prototype.scrollIntoView = function () {
        scrolls.push(this.id || '')
      }
    },
  })
  ctx.win.nnConsole.boot(ctx.document)
  return { ...ctx, scrolls }
}

describe('a deep link does not mount the whole list', () => {
  it('mounts a bounded window around the focused card, and lands on it', () => {
    const ctx = bootWide('#el-' + FOCUS_ID)
    const mounted = cards(ctx.document)

    assert.ok(
      mounted.length <= 2 * PAGE,
      `a focused boot mounted ${mounted.length} of ${WIDE_TOTAL} cards; two pages is the budget`,
    )
    assert.ok(mounted.length > PAGE, 'the page holding the focused card is mounted too')

    const focused = ctx.document.getElementById('el-' + FOCUS_ID)
    assert.ok(focused, 'the focused card is mounted')
    assert.equal(focused.getAttribute('data-open'), 'true', 'the focused card is expanded')
    assert.ok(ctx.scrolls.includes('el-' + FOCUS_ID), 'the focused card is scrolled into view')
    assert.ok(ctx.document.getElementById('el-e0'), 'the first page is still mounted')
    assert.equal(
      ctx.document.getElementById('el-e200'),
      null,
      'the cards between the first page and the focused page stay unmounted',
    )
  })

  it('mounts the page of a card that focusElementCard is asked to reveal', () => {
    const ctx = bootWide('')
    assert.equal(cards(ctx.document).length, PAGE, 'a plain boot mounts exactly one page')
    assert.equal(ctx.document.getElementById('el-' + FOCUS_ID), null, 'the card starts unmounted')

    ctx.win.nnConsole.focusElementCard(ctx.document, FOCUS_ID)

    const focused = ctx.document.getElementById('el-' + FOCUS_ID)
    assert.ok(focused, 'the page holding the card was mounted on demand')
    assert.equal(ctx.document.querySelectorAll('#el-' + FOCUS_ID).length, 1, 'mounted exactly once')
    assert.ok(cards(ctx.document).length <= 2 * PAGE, 'the reveal stays inside the page budget')
    assert.equal(focused.getAttribute('data-open'), 'true', 'the revealed card is expanded')
    assert.ok(ctx.scrolls.includes('el-' + FOCUS_ID), 'the revealed card is scrolled into view')
    assert.ok(focused.classList.contains('nn-highlight'), 'the revealed card is highlighted')
  })

  it('leaves the DOM untouched for a card the view does not carry', () => {
    const ctx = bootWide('#el-does-not-exist')
    assert.equal(cards(ctx.document).length, PAGE, 'a stale deep link still mounts one page')
    assert.equal(ctx.document.getElementById('el-does-not-exist'), null)

    ctx.win.nnConsole.focusElementCard(ctx.document, 'does-not-exist')
    assert.equal(cards(ctx.document).length, PAGE, 'an unknown id mounts nothing and does not crash')
  })

  it('a search still reaches an element the window has not mounted', () => {
    const ctx = bootWide('#el-' + FOCUS_ID)
    assert.equal(ctx.document.getElementById('el-e200'), null, 'the match starts outside the window')

    const search = ctx.document.getElementById('nn-search')
    search.value = 'Element 200'
    search.dispatchEvent(new ctx.win.Event('input', { bubbles: true }))

    const ids = [...cards(ctx.document)].map((c) => c.getAttribute('data-element-id'))
    assert.deepEqual(ids, ['e200'], 'the filtered set is mounted whole, wherever the match lives')
  })
})
