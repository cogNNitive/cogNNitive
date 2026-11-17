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
import { decodedModelTextOf, modelSlotMarkup } from './helpers/console-slots.mjs'

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
  ${modelSlotMarkup(model)}
  <script type="application/json" id="nn-drafts">{}</script>
</body></html>`
}

const SHELL = shellHtml()

// Executes the committed bundle as one classic script inside the DOM, exactly the way
// the exported console loads it. `__innfoNoAutoBoot` keeps the runtime from booting
// itself before the test is ready to read the result. `before` patches the window
// before the bundle runs, and `hash` sets the deep link the boot reads.
// jsdom has no Compression Streams and no Response; a browser has both, so the window
// borrows Node's (`streams: false` models a browser without them).
function bootBundle(html = SHELL, { hash = '', before, streams = true } = {}) {
  const dom = new JSDOM(html, { url: 'http://localhost/' + hash, runScripts: 'dangerously', pretendToBeVisual: true })
  const win = dom.window
  win.__innfoNoAutoBoot = true
  if (streams) {
    win.Response = Response
    win.DecompressionStream = DecompressionStream
    win.CompressionStream = CompressionStream
  }
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
    const res = ctx.win.nnConsole.boot(ctx.document, { modelText: decodedModelTextOf(ctx.document) })
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

  it('reports that same release as its runtime identity, with no second literal to drift', () => {
    assert.equal(ctx.win.nnConsole.version, pkg.version, 'nnConsole.version is the package release')
    assert.equal(ctx.win.nnConsole.CONSOLE_VERSION, pkg.version, 'the exported constant agrees')

    // One declaration, injected at compose time from console/package.json: a source
    // literal elsewhere could only disagree with the banner above.
    const declared = [...bundle.matchAll(/^\s*var CONSOLE_VERSION = (.+)$/gm)].map((m) => m[1].trim())
    assert.equal(declared.length, 1, 'the runtime declares its version once')
    assert.equal(declared[0], `'${pkg.version}'`, 'the composed bundle carries the package version literally')
    assert.equal(bundle.includes('__NN_CONSOLE_RELEASE_VERSION__'), false, 'the compose-time marker never ships')

    // The exported provenance keeps reading that one constant.
    assert.ok(bundle.includes('artifact_version: CONSOLE_VERSION'), 'artifact_version is the runtime identity')
    assert.ok(bundle.includes("viewer: 'nn-console@' + CONSOLE_VERSION"), 'viewer names the same identity')
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
  ctx.win.nnConsole.boot(ctx.document, { modelText: decodedModelTextOf(ctx.document) })
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

// The element id the address bar names, if any: `#el-<id>` is the only hash form
// that claims a card.
function urlClaims(win) {
  const raw = String(win.location.hash || '').replace(/^#/, '')
  if (raw.indexOf('el-') !== 0) return null
  try {
    return decodeURIComponent(raw.slice(3))
  } catch {
    return raw.slice(3)
  }
}

describe('a refresh after a deep-link boot never loses the element the URL names', () => {
  it('clears the consumed focus from the address bar instead of naming an unmounted card', () => {
    const ctx = bootWide('#el-' + FOCUS_ID)
    assert.ok(ctx.document.getElementById('el-' + FOCUS_ID), 'the deep link still lands on its card')
    assert.equal(
      urlClaims(ctx.win),
      null,
      'the focus id is consumed once by contract, so the address bar stops naming it',
    )

    // The repaint a draft change or another tab's store update triggers: it re-mounts
    // the first page only, because the focus id was consumed.
    ctx.document.__nnConsoleState.refreshUi()
    assert.equal(cards(ctx.document).length, PAGE, 'the refresh mounts the first page')
    assert.equal(ctx.document.getElementById('el-' + FOCUS_ID), null, 'and the focused card is gone again')
    assert.equal(urlClaims(ctx.win), null, 'while the address bar names nothing: URL and cards agree')
  })

  it('reloads from that address bar onto the first page with nothing claimed', () => {
    const first = bootWide('#el-' + FOCUS_ID)
    const reloaded = bootWide(first.win.location.hash)
    assert.equal(urlClaims(reloaded.win), null, 'the reloaded page names no element')
    assert.equal(reloaded.document.getElementById('el-' + FOCUS_ID), null, 'so it mounts no card the URL could claim')
    assert.equal(cards(reloaded.document).length, PAGE, 'one page, as a plain boot')
  })
})

// The page boots itself: autoBoot decodes the compressed nn-model slot (deflate-raw +
// base64) with DecompressionStream, then runs the synchronous boot. Both tests run the
// committed bundle exactly as an exported page does, with the self-boot left on.
describe('the committed bundle decodes the compressed model slot at boot', () => {
  const small = {
    meta: { title: 'Small', modelId: 'small', modelVersion: 'V_1-0-0' },
    elements: [
      { id: 'a1', concept: 'Fleet', name: 'Alpha', fields: {} },
      { id: 'b2', concept: 'Fleet', name: 'Beta', fields: {} },
    ],
    matrices: [],
  }
  const selfBooting = (win) => {
    win.__innfoNoAutoBoot = false
  }
  async function until(check, what) {
    for (let i = 0; i < 100; i++) {
      if (check()) return
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
    assert.fail(`timed out waiting for ${what}`)
  }

  it('autoBoot decodes the slot and renders every element', async () => {
    const ctx = bootBundle(shellHtml(small), { before: selfBooting })
    await until(() => cards(ctx.document).length === 2, 'the two element cards')
    assert.equal(ctx.document.getElementById('nn-boot-error'), null, 'no boot error is shown')
  })

  it('decodeAndBoot (public API) resolves to the boot result of the decoded model', async () => {
    const ctx = bootBundle(shellHtml(small))
    const res = await ctx.win.nnConsole.decodeAndBoot(ctx.document)
    assert.equal(res.ok, true)
    assert.equal(res.elements, 2)
  })

  it('shows a visible error instead of a blank page when DecompressionStream is missing', async () => {
    const ctx = bootBundle(shellHtml(small), { before: selfBooting, streams: false })
    await until(() => ctx.document.getElementById('nn-boot-error'), 'the boot error')
    const box = ctx.document.getElementById('nn-boot-error')
    assert.equal(box.getAttribute('role'), 'alert')
    assert.match(box.textContent, /DecompressionStream/)
    assert.match(box.textContent, /Chrome, Edge, Firefox or Safari/)
    assert.equal(cards(ctx.document).length, 0, 'nothing booted from an undecoded slot')
  })

  it('shows a visible error when the slot holds corrupt data', async () => {
    const html = shellHtml(small).replace(/(id="nn-model">)[^<]*/, '$1bm90IGRlZmxhdGU=')
    const ctx = bootBundle(html, { before: selfBooting })
    await until(() => ctx.document.getElementById('nn-boot-error'), 'the boot error')
    assert.match(ctx.document.getElementById('nn-boot-error').textContent, /nn-model slot holds corrupt compressed data/)
  })
})
