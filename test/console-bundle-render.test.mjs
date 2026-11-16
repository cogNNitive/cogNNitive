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
const SHELL = `<!doctype html><html><head></head><body>
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
  <script type="application/json" id="nn-model">{"meta":{"title":"T","modelId":"t","modelVersion":"V_1-0-0"},"elements":[],"matrices":[]}</script>
</body></html>`

// Executes the committed bundle as one classic script inside the DOM, exactly the way
// the exported console loads it. `__innfoNoAutoBoot` keeps the runtime from booting
// itself before the test is ready to read the result.
function bootBundle() {
  const dom = new JSDOM(SHELL, { url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true })
  const win = dom.window
  win.__innfoNoAutoBoot = true
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
