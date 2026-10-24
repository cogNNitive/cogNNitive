// @jsdom — the XSS guarantees run under jsdom (a lenient DOM would let
// `javascript:` through).
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { consoleDir } from './helpers/console-boot.mjs'

const require = createRequire(import.meta.url)
const UI = require(join(consoleDir, 'ui-kit.js'))

function render(text) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' })
  global.window = dom.window
  global.document = dom.window.document
  const node = UI.Markdown(text, { doc: dom.window.document })
  dom.window.document.body.appendChild(node)
  return node
}

describe('nnUI.Markdown (safe subset)', () => {
  it('renders the subset as structure', () => {
    const root = render('## Goal\n\n- **fast**\n- *cheap*\n\n1. one\n2. two\n\nplain `code` and _em_')
    assert.equal(root.querySelector('h2').textContent, 'Goal')
    assert.equal(root.querySelectorAll('ul > li').length, 2)
    assert.equal(root.querySelector('strong').textContent, 'fast')
    assert.equal(root.querySelector('li em').textContent, 'cheap')
    assert.equal(root.querySelectorAll('ol > li').length, 2)
    assert.equal(root.querySelector('p code').textContent, 'code')
    assert.equal(root.querySelector('p em').textContent, 'em')
  })

  it('renders block quotes and callouts', () => {
    const root = render('> quoted\n\n> [!NOTE]\n> careful')
    const quotes = root.querySelectorAll('blockquote')
    assert.equal(quotes.length, 2)
    assert.equal(quotes[0].getAttribute('data-callout'), null)
    assert.equal(quotes[1].getAttribute('data-callout'), 'note')
    assert.match(quotes[1].textContent, /careful/)
  })

  it('keeps snake_case words literal', () => {
    const root = render('see foo_bar_baz now')
    assert.equal(root.querySelector('em'), null)
    assert.match(root.textContent, /foo_bar_baz/)
  })

  it('raw HTML is inert: no img, script or b, and the text stays literal', () => {
    const input = '<img src=x onerror=alert(1)><script>x()</script><b>bold</b>'
    const root = render(input)
    assert.equal(root.querySelector('img'), null)
    assert.equal(root.querySelector('script'), null)
    assert.equal(root.querySelector('b'), null)
    assert.ok(root.textContent.includes(input), 'the markup appears as text')
  })

  it('HTML inside headings, lists, quotes and links stays inert too', () => {
    const root = render('# <img src=x onerror=1>\n\n- <script>1</script>\n\n> <b>q</b>\n\n[<img src=x>](https://e.com)')
    assert.equal(root.querySelector('img'), null)
    assert.equal(root.querySelector('script'), null)
    assert.equal(root.querySelector('b'), null)
  })

  it('unsafe link schemes yield no anchor', () => {
    const cases = [
      '[a](javascript:alert(1))',
      '[b](JaVaScRiPt:alert(1))',
      '[c](data:text/html,<b>x</b>)',
      '[d](vbscript:x)',
      '[e](java\tscript:alert(1))',
      '[f](//evil.example/x)',
      '[g](\\evil)',
    ]
    for (const c of cases) {
      const root = render(c)
      assert.equal(root.querySelector('a'), null, `no anchor for ${JSON.stringify(c)}`)
      assert.equal(root.querySelector('b'), null, `no element parsed from ${JSON.stringify(c)}`)
    }
  })

  it('a safe link is a link that opens safely', () => {
    const a = render('[docs](https://example.com/x)').querySelector('a')
    assert.equal(a.getAttribute('href'), 'https://example.com/x')
    assert.equal(a.getAttribute('target'), '_blank')
    assert.equal(a.getAttribute('rel'), 'noopener noreferrer')
    assert.equal(render('[rel](sources/a.md)').querySelector('a').getAttribute('href'), 'sources/a.md')
  })

  it('the renderer source has no HTML sink', () => {
    const src = readFileSync(join(consoleDir, 'ui-kit.js'), 'utf8')
    const start = src.indexOf('// ---- Markdown (safe subset) ----')
    const end = src.indexOf('// ---- end Markdown ----')
    assert.ok(start !== -1 && end > start, 'renderer markers present')
    const body = src.slice(start, end)
    for (const sink of ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'DOMParser']) {
      assert.equal(body.includes(sink), false, `renderer must not use ${sink}`)
    }
  })
})
