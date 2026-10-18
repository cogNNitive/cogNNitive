import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
const consoleDir = join(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console')

global.InnfoIcons = require(join(consoleDir, 'innfo-icons.js'))
const UI = require(join(consoleDir, 'ui-kit.js'))

describe('FilterSelect (shared multi-select facet)', () => {
  let document
  let window

  beforeEach(() => {
    const { JSDOM } = require('jsdom')
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost' })
    window = dom.window
    document = window.document
    global.window = window
    global.document = document
    UI.ensureTokens(document)
  })

  function build(data, opts) {
    const node = UI.FilterSelect(data, Object.assign({ doc: document }, opts))
    document.body.appendChild(node)
    return node
  }

  it('is exported on the public API', () => {
    assert.equal(typeof UI.FilterSelect, 'function')
  })

  it('renders a details facet with one checkbox per option', () => {
    const node = build({ label: 'Estado', options: [{ value: 'active', label: 'active' }, { value: 'paused', label: 'paused' }] })
    assert.equal(node.getAttribute('data-innfo-component'), 'filter-select')
    assert.equal(node.tagName, 'DETAILS')
    assert.equal(node.querySelectorAll('.innfo-filter-option input[type=checkbox]').length, 2)
    assert.equal(node.querySelector('.innfo-filter-summary').textContent, 'Estado: ninguno')
  })

  it('summarises all, none, one and many selections', () => {
    const all = build({ label: 'Mes', options: [{ value: 'a', label: 'a', selected: true }, { value: 'b', label: 'b', selected: true }] })
    assert.equal(all.querySelector('.innfo-filter-summary').textContent, 'Mes: todos (2)')
    const one = build({ label: 'Mes', options: [{ value: 'a', label: 'a', selected: true }, { value: 'b', label: 'b' }] })
    assert.equal(one.querySelector('.innfo-filter-summary').textContent, 'Mes: a')
    const many = build({ label: 'Mes', options: [{ value: 'a', label: 'a', selected: true }, { value: 'b', label: 'b', selected: true }, { value: 'c', label: 'c' }] })
    assert.equal(many.querySelector('.innfo-filter-summary').textContent, 'Mes: 2/3')
  })

  it('accepts a selected map or array', () => {
    const byMap = build({ label: 'X', options: ['a', 'b'], selected: { a: true } })
    assert.deepEqual(byMap.getSelection(), ['a'])
    const byArray = build({ label: 'X', options: ['a', 'b'], selected: ['b'] })
    assert.deepEqual(byArray.getSelection(), ['b'])
  })

  it('reports the next selection through onChange when a checkbox toggles', () => {
    const seen = []
    const node = build({ label: 'Estado', options: ['active', 'paused'] }, { onChange: (values) => seen.push(values) })
    const boxes = node.querySelectorAll('input[type=checkbox]')
    boxes[0].checked = true
    boxes[0].dispatchEvent(new window.Event('change', { bubbles: true }))
    assert.deepEqual(seen, [['active']])
    assert.equal(node.querySelector('.innfo-filter-summary').textContent, 'Estado: active')
    boxes[1].checked = true
    boxes[1].dispatchEvent(new window.Event('change', { bubbles: true }))
    assert.deepEqual(seen[1], ['active', 'paused'])
  })

  it('runs quick actions (all / none / subset)', () => {
    const seen = []
    const node = build(
      {
        label: 'Mes',
        options: ['2026-01', '2026-02', '2026-03'],
        quick: [
          { label: 'Todos', values: 'all' },
          { label: 'Ninguno', values: [] },
          { label: '2026', values: ['2026-01', '2026-02', '2026-03'] },
        ],
      },
      { onChange: (values) => seen.push(values) },
    )
    const buttons = node.querySelectorAll('.innfo-filter-quick button')
    assert.deepEqual([...buttons].map((b) => b.textContent), ['Todos', 'Ninguno', '2026'])
    buttons[1].dispatchEvent(new window.Event('click', { bubbles: true }))
    assert.deepEqual(seen[0], [])
    buttons[0].dispatchEvent(new window.Event('click', { bubbles: true }))
    assert.deepEqual(seen[1], ['2026-01', '2026-02', '2026-03'])
    assert.equal(node.querySelector('.innfo-filter-summary').textContent, 'Mes: todos (3)')
  })

  it('supports programmatic setSelection without notifying when silent', () => {
    const seen = []
    const node = build({ label: 'X', options: ['a', 'b'] }, { onChange: (v) => seen.push(v) })
    node.setSelection(['a'], true)
    assert.deepEqual(node.getSelection(), ['a'])
    assert.equal(seen.length, 0)
    assert.equal(node.querySelector('.innfo-filter-summary').textContent, 'X: a')
  })

  it('rejects invalid data', () => {
    assert.throws(() => UI.FilterSelect({ label: 'x' }, { doc: document }), /data\.options/)
  })
})
