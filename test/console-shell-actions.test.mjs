import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
const kitPath = join(resolve(here, '..'), 'iNNfo', 'specs', 'bluepriNNts', 'console', 'ui-kit.js')
const UI = require(kitPath)

describe('console shell actions', () => {
  let doc
  beforeEach(() => {
    doc = new JSDOM('<!doctype html><html><body></body></html>').window.document
  })

  describe('TopBarActions', () => {
    it('keeps both actions inline and behind one narrow-width trigger', () => {
      const calls = []
      const group = UI.TopBarActions(
        { draftsCount: 2 },
        { doc, onSave: () => calls.push('save'), onCopyPrompt: () => calls.push('copy') },
      )
      const inline = group.querySelector('.nn-navbar-actions-inner')
      assert.ok(inline, 'the inline row exists')
      assert.equal(inline.querySelectorAll('.nn-navbar-action-btn').length, 2, 'both actions stay in the row')

      const toggle = group.querySelector('.nn-navbar-actions-toggle')
      assert.ok(toggle, 'a collapse trigger exists')
      assert.equal(toggle.getAttribute('aria-expanded'), 'false', 'it starts closed')
      assert.match(toggle.textContent, /Actions/)

      const menu = group.querySelector('.nn-navbar-actions-menu')
      assert.ok(menu, 'the menu exists')
      assert.equal(menu.getAttribute('role'), 'menu')
      assert.equal(menu.getAttribute('data-open'), 'false', 'the menu starts closed')
      assert.deepEqual(
        Array.from(menu.querySelectorAll('[role="menuitem"]')).map((b) => b.getAttribute('data-nn-menu')),
        ['save-snapshot', 'copy-agent-prompt'],
        'the menu carries every action',
      )
    })

    it('opens and closes the menu from the trigger', () => {
      const group = UI.TopBarActions({ draftsCount: 0 }, { doc })
      const toggle = group.querySelector('.nn-navbar-actions-toggle')
      const menu = group.querySelector('.nn-navbar-actions-menu')
      toggle.click()
      assert.equal(toggle.getAttribute('aria-expanded'), 'true')
      assert.equal(menu.getAttribute('data-open'), 'true')
      toggle.click()
      assert.equal(toggle.getAttribute('aria-expanded'), 'false')
      assert.equal(menu.getAttribute('data-open'), 'false')
    })

    it('runs an action from the menu and closes it', () => {
      const calls = []
      const group = UI.TopBarActions({ draftsCount: 0 }, { doc, onSave: () => calls.push('save') })
      const toggle = group.querySelector('.nn-navbar-actions-toggle')
      toggle.click()
      group.querySelector('[data-nn-menu="save-snapshot"]').click()
      assert.deepEqual(calls, ['save'], 'the menu item calls the same handler')
      assert.equal(group.querySelector('.nn-navbar-actions-menu').getAttribute('data-open'), 'false', 'using an item closes the menu')
    })

    it('badges the trigger while drafts are unsent', () => {
      const group = UI.TopBarActions({ draftsCount: 3 }, { doc })
      assert.equal(group.querySelector('.nn-navbar-actions-toggle .nn-badge-count').textContent, '3')
    })
  })

  describe('ChipEditor', () => {
    function editor(data, opts = {}) {
      const root = UI.ChipEditor({ ...data, onChange: data.onChange }, { doc, ...opts })
      doc.body.appendChild(root)
      return root
    }

    it('renders the current values as removable chips', () => {
      const root = editor({ values: ['alpha', 'beta'] })
      assert.deepEqual(Array.from(root.querySelectorAll('.nn-chip')).map((c) => c.textContent.replace('×', '')), ['alpha', 'beta'])
      assert.equal(root.querySelector('.nn-chip-remove').getAttribute('aria-label'), 'Remove alpha')
    })

    it('adds a chip on Enter and reports the whole list', () => {
      const seen = []
      const root = editor({ values: ['alpha'], onChange: (v) => seen.push(v) })
      const input = root.querySelector('.nn-chip-input')
      input.value = 'gamma'
      input.dispatchEvent(new doc.defaultView.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      assert.deepEqual(seen, [['alpha', 'gamma']], 'onChange receives every value')
      assert.equal(input.value, '', 'the input clears after adding')
      assert.equal(root.querySelectorAll('.nn-chip').length, 2)
    })

    it('removes a chip and reports the remaining list', () => {
      const seen = []
      const root = editor({ values: ['alpha', 'beta'], onChange: (v) => seen.push(v) })
      root.querySelectorAll('.nn-chip-remove')[0].click()
      assert.deepEqual(seen, [['beta']])
      assert.deepEqual(Array.from(root.querySelectorAll('.nn-chip')).map((c) => c.textContent.replace('×', '')), ['beta'])
    })

    it('ignores an empty or repeated value', () => {
      const seen = []
      const root = editor({ values: ['alpha'], onChange: (v) => seen.push(v) })
      const input = root.querySelector('.nn-chip-input')
      input.value = '   '
      input.dispatchEvent(new doc.defaultView.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      input.value = 'ALPHA'
      input.dispatchEvent(new doc.defaultView.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      assert.deepEqual(seen, [], 'nothing changed, nothing reported')
      assert.equal(root.querySelectorAll('.nn-chip').length, 1)
    })

    it('offers declared options through a datalist', () => {
      const root = editor({ values: [], options: ['red', 'green'] })
      const input = root.querySelector('.nn-chip-input')
      const listId = input.getAttribute('list')
      assert.ok(listId, 'the input points at a datalist')
      assert.deepEqual(Array.from(doc.getElementById(listId).querySelectorAll('option')).map((o) => o.value), ['red', 'green'])
      assert.match(root.textContent, /No values/, 'an empty editor says so')
    })

    it('does not edit when disabled', () => {
      const root = editor({ values: ['alpha'], disabled: true })
      assert.equal(root.querySelector('.nn-chip-input').disabled, true)
      assert.equal(root.querySelector('.nn-chip-remove').disabled, true)
    })
  })
})
