import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { JSDOM } from 'jsdom'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const consoleDir = join(root, 'iNNfo', 'specs', 'bluepriNNts', 'console')

const { parseUnitAddress } = require(
  join(root, 'iNNfo', 'packages', 'innfo-core', 'dist', 'index.js'),
)

let document

before(() => {
  global.InnfoIcons = require(join(consoleDir, 'innfo-icons.js'))
  const InnfoConsole = require(join(consoleDir, 'innfo-runtime.js'))
  const html = readFileSync(join(root, 'test', 'fixtures', 'testlab', 'domaiNN_console.html'), 'utf8')
  const dom = new JSDOM(html, { url: 'http://localhost' })
  global.window = dom.window
  global.document = dom.window.document
  global.localStorage = dom.window.localStorage
  global.CustomEvent = dom.window.CustomEvent
  InnfoConsole.boot(dom.window.document)
  document = dom.window.document
})

describe('Ku jsdom tree guard (testlab console)', () => {
  it('every table/definition cell holds an addressed badge or is explicitly exempt', () => {
    const bare = []
    for (const cell of document.querySelectorAll('td,th,dd,dt')) {
      if (cell.querySelector('[data-ku-address]') || cell.closest('[data-ku-exempt]')) continue
      bare.push(`${cell.tagName}.${cell.className} :: ${cell.textContent.trim().slice(0, 60)}`)
    }
    assert.deepEqual(bare, [])
  })

  it('every data-ku-address parses and its kind matches the descriptor', () => {
    const kindsByAddress = new Map()
    const failures = []
    for (const unit of document.querySelectorAll('[data-innfo-component="ku-unit"][data-ku-address]')) {
      const address = unit.getAttribute('data-ku-address')
      const kind = unit.getAttribute('data-ku-kind')
      const parsed = parseUnitAddress(address)
      if (!parsed) {
        failures.push(`${address} does not parse`)
        continue
      }
      if (parsed.kind !== kind) failures.push(`${address} parses as ${parsed.kind}, badge says ${kind}`)
      const prev = kindsByAddress.get(address)
      if (prev && prev !== kind) failures.push(`${address} has kinds ${prev} and ${kind}`)
      kindsByAddress.set(address, kind)
    }
    assert.deepEqual(failures, [])
  })

  it('review-off and structure-off gating rules are present', () => {
    const css = [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n')
    assert.match(css, /html:not\(\[data-innfo-review=on\]\)[^{]*\[data-ku-action=edit\][^{]*\{[^}]*display:none/)
    assert.match(
      css,
      /html:not\(\[data-innfo-structure=on\]\)[^{]*\[data-ku-structure=true\][^{]*\{[^}]*display:none/,
    )
    assert.equal(document.documentElement.getAttribute('data-innfo-review'), null)
  })
})
