import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
const consoleDir = join(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console')

global.InnfoIcons = require(join(consoleDir, 'nn-icons.js'))
const UI = require(join(consoleDir, 'ui-kit.js'))

describe('Data surfaces: Table / MatrixGrid / Timeline (shared grid core)', () => {
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

  describe('exports', () => {
    it('exposes all three on the public API', () => {
      assert.equal(typeof UI.DataTable, 'function')
      assert.equal(typeof UI.MatrixGrid, 'function')
      assert.equal(typeof UI.Timeline, 'function')
    })
  })

  describe('DataTable', () => {
    const columns = [
      { key: 'name', label: 'Name', kind: 'element' },
      { key: 'role', label: 'Role' },
    ]
    const rows = [{ id: 'ecto-1', name: 'Ecto-1', concept: 'Vehicle', fields: { role: 'Interceptor' } }]

    it('renders a data-table with headers, element badge and field text', () => {
      const node = UI.DataTable({ columns, rows, emptyText: 'none' }, { doc: document })
      document.body.appendChild(node)
      assert.equal(node.getAttribute('data-innfo-component'), 'data-table')
      const ths = [...node.querySelectorAll('thead th')].map((t) => t.textContent)
      assert.deepEqual(ths, ['Name', 'Role'])
      assert.ok(node.querySelector('[data-innfo-component="ku-unit"][data-element-id="ecto-1"]'))
      assert.equal(node.querySelector('tbody [data-col="role"]').textContent, 'Interceptor')
    })

    it('calls onEdit with the element id when the element cell is activated', () => {
      const seen = []
      const node = UI.DataTable({ columns, rows }, { doc: document, onEdit: (id) => seen.push(id) })
      document.body.appendChild(node)
      const badge = node.querySelector('[role="button"]')
      assert.ok(badge)
      badge.dispatchEvent(new window.Event('click', { bubbles: true }))
      assert.deepEqual(seen, ['ecto-1'])
    })

    it('falls back to onSelect when no onEdit is given', () => {
      const seen = []
      const node = UI.DataTable({ columns, rows }, { doc: document, onSelect: (id) => seen.push(id) })
      document.body.appendChild(node)
      node.querySelector('[role="button"]').dispatchEvent(new window.Event('click', { bubbles: true }))
      assert.deepEqual(seen, ['ecto-1'])
    })

    it('renders the empty state when there are no rows', () => {
      const node = UI.DataTable({ columns, rows: [], emptyText: 'No hay elementos' }, { doc: document })
      document.body.appendChild(node)
      const empty = node.querySelector('.innfo-grid-empty')
      assert.equal(empty.textContent, 'No hay elementos')
      assert.equal(empty.colSpan, 2)
    })

    it('rejects invalid data', () => {
      assert.throws(() => UI.DataTable({ rows: [] }, { doc: document }), /data\.columns/)
      assert.throws(() => UI.DataTable({ columns: [] }, { doc: document }), /data\.rows/)
    })
  })

  describe('MatrixGrid', () => {
    function matrix() {
      return UI.MatrixGrid(
        {
          rowHeader: { label: 'Provider' },
          columns: [
            { key: '2026-01', label: '26/01' },
            { key: '2026-02', label: '26/02' },
          ],
          rows: [
            { key: 'aws', header: 'AWS', cells: { '2026-01': '📄' } },
            {
              key: 'gcp',
              header: 'GCP',
              cell: (col) => (col.key === '2026-02' ? '⚠' : ''),
            },
          ],
          emptyText: 'empty',
        },
        { doc: document },
      )
    }

    it('renders a pinned matrix-grid with a corner header and row headers', () => {
      const node = matrix()
      document.body.appendChild(node)
      assert.equal(node.getAttribute('data-innfo-component'), 'matrix-grid')
      assert.equal(node.getAttribute('data-pin-first'), 'true')
      assert.equal(node.querySelector('.innfo-grid-corner').textContent, 'Provider')
      const heads = [...node.querySelectorAll('tbody .innfo-grid-rowhead')].map((h) => h.textContent)
      assert.deepEqual(heads, ['AWS', 'GCP'])
      assert.equal(node.querySelector('tbody tr[data-row="aws"] [data-col="2026-01"]').textContent, '📄')
      assert.equal(node.querySelector('tbody tr[data-row="gcp"] [data-col="2026-02"]').textContent, '⚠')
    })

    it('renders a node header and never executes string content as HTML', () => {
      const strong = document.createElement('strong')
      strong.textContent = 'Anthropic'
      const node = UI.MatrixGrid(
        {
          columns: [{ key: 'c', label: 'C' }],
          rows: [{ header: strong, cells: { c: '<img src=x onerror=alert(1)>' } }],
        },
        { doc: document },
      )
      document.body.appendChild(node)
      assert.ok(node.querySelector('tbody .innfo-grid-rowhead strong'))
      assert.equal(node.querySelector('img'), null)
      assert.equal(node.querySelector('tbody [data-col="c"]').textContent, '<img src=x onerror=alert(1)>')
    })

    it('can opt out of pinning', () => {
      const node = UI.MatrixGrid({ columns: [{ key: 'c', label: 'C' }], rows: [], pinFirstColumn: false }, { doc: document })
      assert.equal(node.getAttribute('data-pin-first'), null)
    })

    it('rejects invalid data', () => {
      assert.throws(() => UI.MatrixGrid({ rows: [] }, { doc: document }), /data\.columns/)
      assert.throws(() => UI.MatrixGrid({ columns: [] }, { doc: document }), /data\.rows/)
    })
  })

  describe('Timeline', () => {
    it('renders periods as centre-aligned columns over the shared grid core', () => {
      const node = UI.Timeline(
        {
          rowHeader: { label: 'Workstream' },
          periods: [
            { key: 'q1', label: 'Q1' },
            { key: 'q2', label: 'Q2' },
          ],
          lanes: [{ key: 'build', header: 'Build', cell: (col) => (col.key === 'q1' ? 'done' : '') }],
        },
        { doc: document },
      )
      document.body.appendChild(node)
      assert.equal(node.getAttribute('data-innfo-component'), 'timeline')
      assert.equal(node.getAttribute('data-pin-first'), 'true')
      assert.ok(node.querySelector('.innfo-grid-cell--center'))
      assert.equal(node.querySelector('tbody tr[data-row="build"] [data-col="q1"]').textContent, 'done')
    })

    it('rejects invalid data', () => {
      assert.throws(() => UI.Timeline({ lanes: [] }, { doc: document }), /data\.periods/)
      assert.throws(() => UI.Timeline({ periods: [] }, { doc: document }), /data\.lanes/)
    })
  })

  describe('shared core', () => {
    it('all three surfaces emit the same grid skeleton (proof of reuse)', () => {
      const t = UI.DataTable({ columns: [{ key: 'n', label: 'N' }], rows: [] }, { doc: document })
      const m = UI.MatrixGrid({ columns: [{ key: 'n', label: 'N' }], rows: [] }, { doc: document })
      const l = UI.Timeline({ periods: [{ key: 'n', label: 'N' }], lanes: [] }, { doc: document })
      for (const surface of [t, m, l]) {
        assert.ok(surface.classList.contains('innfo-grid-scroll'))
        assert.equal(surface.querySelectorAll('table.innfo-grid').length, 1)
      }
    })

    it('owns a self-contained horizontal scroll port (no Tailwind dependency)', () => {
      const node = UI.MatrixGrid({ columns: [{ key: 'c', label: 'C' }], rows: [] }, { doc: document })
      document.body.appendChild(node)
      const style = document.head.querySelector('style[data-innfo-tokens]')
      assert.ok(style, 'token style injected')
      assert.match(style.textContent, /\.innfo-grid-scroll\{[^}]*overflow:auto/)
    })
  })
})
