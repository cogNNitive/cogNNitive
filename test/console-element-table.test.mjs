import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { bootConsole, bootConsoleFromShell } from './helpers/console-boot.mjs'

const MODEL = {
  meta: { title: 'Sort Model', modelId: 'sort-model', modelVersion: 'V_1-0-0' },
  elements: [
    { id: 'a', concept: 'Thing', name: 'Beta', fields: { rank: '3', group: 'x' }, tags: ['t'], hash: '0'.repeat(16) },
    { id: 'b', concept: 'Thing', name: 'Alpha', fields: { rank: '1', group: 'y' }, hash: '1'.repeat(16) },
    { id: 'c', concept: 'Thing', name: 'Gamma', fields: { rank: '2' }, hash: '2'.repeat(16) },
  ],
}

function click(node) {
  node.dispatchEvent(new node.ownerDocument.defaultView.Event('click', { bubbles: true }))
}

function headKeys(document) {
  return [...document.querySelectorAll('.nn-element-table thead th')].map((th) =>
    th.getAttribute('data-sort-key'),
  )
}

function nameCells(document) {
  return [...document.querySelectorAll('.nn-element-table tbody tr .nn-element-table-name')].map(
    (c) => c.textContent.trim(),
  )
}

describe('Model Explorer element table view', () => {
  it('defaults to cards and offers a Cards/Table toggle', () => {
    const { document } = bootConsole({ model: MODEL })
    const group = document.getElementById('nn-explorer-toolbar')
    assert.ok(group, 'toolbar rendered')
    const btns = group.querySelectorAll('.nn-viewmode-btn')
    assert.equal(btns.length, 4)
    assert.ok(btns[0].classList.contains('active'), 'cards active by default')
    assert.ok(document.querySelector('#nn-content .nn-card'), 'cards rendered')
    assert.equal(document.querySelector('.nn-element-table'), null)
  })

  it('switches to a table with one row per element and field columns', () => {
    const { document } = bootConsole({ model: MODEL })
    click(document.querySelector('.nn-viewmode-btn[data-mode="table"]'))
    const table = document.querySelector('.nn-element-table')
    assert.ok(table, 'table rendered')
    const keys = headKeys(document)
    assert.deepEqual(keys.slice(0, 2), ['name', 'concept'])
    assert.ok(keys.includes('rank') && keys.includes('group') && keys.includes('tags'))
    const rows = table.querySelectorAll('tbody tr')
    assert.equal(rows.length, 3)
    assert.equal(rows[0].getAttribute('data-element-id'), 'a', 'payload order before sorting')
    assert.equal(document.querySelector('.nn-card'), null, 'cards replaced by the table')
  })

  it('renders field definition badges in headers and value badges in cells', () => {
    const { document } = bootConsole({ model: MODEL })
    click(document.querySelector('.nn-viewmode-btn[data-mode="table"]'))
    const rankHead = document.querySelector('.nn-element-table th[data-sort-key="rank"]')
    assert.ok(rankHead.querySelector('[data-ku-kind="field"]'), 'header field badge')
    const names = document.querySelectorAll('.nn-element-table tbody td.nn-element-table-name [data-ku-kind="element"]')
    assert.equal(names.length, 3, 'name cells are element badges')
    const cells = document.querySelectorAll(
      '.nn-element-table tbody td.nn-element-table-cell [data-ku-kind="value"][data-field="rank"]',
    )
    assert.equal(cells.length, 3, 'field cells are value badges')
    assert.ok(cells[0].getAttribute('data-ku-address'))
  })

  it('sorts by name ascending then descending', () => {
    const { document } = bootConsole({ model: MODEL })
    click(document.querySelector('.nn-viewmode-btn[data-mode="table"]'))
    click(document.querySelector('.nn-element-table th[data-sort-key="name"] .nn-element-table-sort'))
    assert.deepEqual(nameCells(document), ['Alpha', 'Beta', 'Gamma'])
    assert.equal(
      document.querySelector('.nn-element-table th[data-sort-key="name"]').getAttribute('aria-sort'),
      'ascending',
    )
    click(document.querySelector('.nn-element-table th[data-sort-key="name"] .nn-element-table-sort'))
    assert.deepEqual(nameCells(document), ['Gamma', 'Beta', 'Alpha'])
    assert.equal(
      document.querySelector('.nn-element-table th[data-sort-key="name"]').getAttribute('aria-sort'),
      'descending',
    )
  })

  it('shows a muted double triangle that becomes a single dark one when sorted', () => {
    const { document } = bootConsole({ model: MODEL })
    click(document.querySelector('.nn-viewmode-btn[data-mode="table"]'))
    const ctl = () =>
      document.querySelector(
        '.nn-element-table th[data-sort-key="name"] .nn-element-table-sort',
      )
    assert.ok(ctl(), 'every header carries a sort control')
    assert.equal(ctl().getAttribute('data-dir'), 'none', 'unsorted by default')
    assert.ok(ctl().querySelector('.nn-element-table-sort-up'), 'up triangle present')
    assert.ok(ctl().querySelector('.nn-element-table-sort-down'), 'down triangle present')
    click(ctl())
    assert.equal(ctl().getAttribute('data-dir'), 'asc', 'the rebuilt control marks ascending')
    click(ctl())
    assert.equal(ctl().getAttribute('data-dir'), 'desc', 'the rebuilt control marks descending')
  })

  it('clicking a header field badge + opens the field options without sorting', () => {
    const { document } = bootConsole({ model: MODEL })
    click(document.querySelector('.nn-viewmode-btn[data-mode="table"]'))
    const before = nameCells(document)
    const rankTh = document.querySelector('.nn-element-table th[data-sort-key="rank"]')
    const more = rankTh.querySelector('.nn-ku-more')
    assert.ok(more, 'header badge keeps its + affordance')
    click(more)
    assert.equal(
      document.querySelector('.nn-element-table th[data-sort-key="rank"]').getAttribute('aria-sort'),
      null,
      'clicking + does not sort the column',
    )
    assert.deepEqual(nameCells(document), before, 'rows stay in payload order')
    assert.equal(
      rankTh.querySelector('.nn-ku-wrap').getAttribute('data-ku-open'),
      'true',
      'the field options flyout opened',
    )
  })

  it('sorts numeric field values numerically, not lexically', () => {
    const { document } = bootConsole({ model: MODEL })
    click(document.querySelector('.nn-viewmode-btn[data-mode="table"]'))
    click(document.querySelector('.nn-element-table th[data-sort-key="rank"] .nn-element-table-sort'))
    const rankIdx = headKeys(document).indexOf('rank')
    const ranks = [...document.querySelectorAll('.nn-element-table tbody tr')].map(
      (tr) => tr.children[rankIdx].textContent.trim(),
    )
    assert.deepEqual(ranks, ['1', '2', '3'])
  })

  it('the search filter narrows the table rows', () => {
    const { document } = bootConsole({ model: MODEL })
    click(document.querySelector('.nn-viewmode-btn[data-mode="table"]'))
    const search = document.getElementById('nn-search')
    search.value = 'Alpha'
    search.dispatchEvent(new document.defaultView.Event('input', { bubbles: true }))
    const rows = document.querySelectorAll('.nn-element-table tbody tr')
    assert.equal(rows.length, 1)
    assert.match(rows[0].textContent, /Alpha/)
  })

  it('renders the toggle from the real artifact shell', () => {
    const { document } = bootConsoleFromShell()
    assert.ok(document.querySelector('.nn-viewmode-btn[data-mode="table"]'), 'toggle present')
    assert.ok(document.querySelector('#nn-content .nn-card'), 'shell still renders cards')
  })
})
