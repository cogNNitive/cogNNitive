import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { nnConsole, bootConsole } from './helpers/console-boot.mjs'

// Renders the Timeline grid for the given rows and returns, per row label,
// the text of its monthly numeric cells.
function renderRows(rows, months = 2) {
  const { document } = bootConsole()
  const container = document.createElement('div')
  document.body.appendChild(container)
  nnConsole.renderTimelineGrid(container, { rows }, { months })
  const out = {}
  container.querySelectorAll('tbody tr').forEach((tr) => {
    const label = tr.querySelector('td')?.textContent || ''
    const cells = [...tr.querySelectorAll('td.td-num')].map((td) => {
      const input = td.querySelector('input')
      return input ? input.value : td.textContent
    })
    out[label.trim()] = cells
  })
  return out
}

function captureWarnings(fn) {
  const warnings = []
  const orig = console.warn
  console.warn = (...a) => warnings.push(a.join(' '))
  try {
    return { result: fn(), warnings }
  } finally {
    console.warn = orig
  }
}

describe('timeline formula operands', () => {
  it('resolves operands diacritic-insensitively (#177)', () => {
    const out = renderRows([
      { id: 'v1', label: 'Facturación media por obra', variable: true, base: 100, growth: { mode: 'fixed', factor: 0 } },
      { id: 'v2', label: 'Obras por mes', variable: true, base: 3, growth: { mode: 'fixed', factor: 0 } },
      { id: 'm1', label: 'Ingresos', formula: 'obras por mes x facturacion media por obra', growth: { mode: 'fixed', factor: 0 } },
    ])
    assert.equal(out['Ingresos'][0], '300')
  })

  it('also matches when the element name lacks the accent the formula has (#177)', () => {
    const out = renderRows([
      { id: 'v1', label: 'Facturacion media', variable: true, base: 10, growth: { mode: 'fixed', factor: 0 } },
      { id: 'm1', label: 'Doble', formula: 'facturación media x 2', growth: { mode: 'fixed', factor: 0 } },
    ])
    assert.equal(out['Doble'][0], '20')
  })

  it('does not silently render 0 for an unresolved operand (#177)', () => {
    const { result: out, warnings } = captureWarnings(() =>
      renderRows([
        { id: 'v1', label: 'Known', variable: true, base: 5, growth: { mode: 'fixed', factor: 0 } },
        { id: 'm1', label: 'Broken', formula: 'known x missing thing', growth: { mode: 'fixed', factor: 0 } },
        { id: 'm2', label: 'Broken sum', formula: 'known + missing thing', growth: { mode: 'fixed', factor: 0 } },
      ]),
    )
    assert.equal(out['Broken'][0], '-')
    assert.equal(out['Broken sum'][0], '-')
    assert.ok(warnings.some((w) => w.includes('missing thing')), 'warns about the unresolved operand')
  })

  it('treats a % variable as a fraction when used as an operand (#178)', () => {
    const out = renderRows([
      { id: 'v1', label: 'Ratio coste material', variable: true, base: 35, metricUnit: '%', growth: { mode: 'fixed', factor: 0 } },
      { id: 'v2', label: 'Ingresos mensuales', variable: true, base: 6400, growth: { mode: 'fixed', factor: 0 } },
      { id: 'm1', label: 'Coste', formula: 'ingresos mensuales x ratio coste material', growth: { mode: 'fixed', factor: 0 } },
    ])
    // 6400 x 0.35 = 2240, formatted with the runtime's own (default) locale.
    assert.equal(out['Coste'][0], (2240).toLocaleString())
  })

  it('leaves the % variable row itself displayed as authored (#178)', () => {
    const out = renderRows([
      { id: 'v1', label: 'Ratio', variable: true, base: 35, metricUnit: '%', growth: { mode: 'fixed', factor: 0 } },
    ])
    assert.equal(out['Ratio'][0], '35')
  })
})

// Renders the grid, optionally expands the inline chart of one row, and
// captures the CSV text produced by the Download CSV button.
function renderGrid(rows, { months = 4, chartLabel, meta = { slug: 'tl' } } = {}) {
  const { document } = bootConsole()
  const container = document.createElement('div')
  document.body.appendChild(container)
  nnConsole.renderTimelineGrid(container, { rows }, { months })
  if (chartLabel) {
    const tr = [...container.querySelectorAll('tbody tr')].find(
      (t) => (t.querySelector('td')?.textContent || '').trim().startsWith(chartLabel),
    )
    tr.querySelector('.nn-chart-btn').click()
  }
  return { container, document }
}

function captureCsv(container) {
  const origBlob = globalThis.Blob
  const origCreate = URL.createObjectURL
  const origRevoke = URL.revokeObjectURL
  let text = null
  globalThis.Blob = class {
    constructor(parts) {
      text = parts.join('')
    }
  }
  URL.createObjectURL = () => 'about:blank'
  URL.revokeObjectURL = () => {}
  try {
    container.querySelector('.nn-btn-csv').click()
  } finally {
    globalThis.Blob = origBlob
    URL.createObjectURL = origCreate
    URL.revokeObjectURL = origRevoke
  }
  return text
}

const MIXED_ROWS = [
  { id: 'v1', label: 'Known', variable: true, base: 5, growth: { mode: 'fixed', factor: 0 } },
  { id: 'm1', label: 'Resolved', formula: 'known x 2', growth: { mode: 'fixed', factor: 0 } },
  // Months 0-1 come from history; months 2-3 hit the unresolved operand (NaN).
  { id: 'm2', label: 'Mixed', formula: 'missing thing', history: [10, 20], growth: { mode: 'fixed', factor: 0 } },
]

describe('timeline NaN handling (unresolved operands)', () => {
  it('writes empty CSV cells instead of a literal NaN for month and Total', () => {
    const { warnings, result: csv } = captureWarnings(() => {
      const { container } = renderGrid(MIXED_ROWS)
      return captureCsv(container)
    })
    assert.ok(warnings.length > 0)
    assert.ok(csv, 'CSV text captured')
    assert.ok(!/NaN/.test(csv), 'no literal NaN anywhere in the CSV')
    const mixed = csv.split('\r\n').find((l) => l.includes('"Mixed"'))
    const cells = mixed.split(',').map((c) => c.replace(/^"|"$/g, ''))
    // Group, Metric, Type, Unit, Rule, M1..M4, Total
    assert.deepEqual(cells.slice(5), ['10', '20', '', '', ''])
    const resolved = csv.split('\r\n').find((l) => l.includes('"Resolved"'))
    assert.deepEqual(resolved.split(',').slice(5).map((c) => c.replace(/"/g, '')), ['10', '10', '10', '10', '40'])
  })

  it('keeps chart range, heights and colours sane for a row with some NaN months', () => {
    const { result } = captureWarnings(() => renderGrid(MIXED_ROWS, { chartLabel: 'Mixed' }))
    const chart = result.container.querySelector('tr.nn-timeline-chart-row')
    assert.ok(chart, 'chart row rendered')
    const range = chart.querySelector('.nn-chart-range').textContent
    assert.equal(range, 'Range: 10 .. 20')
    const bars = [...chart.querySelectorAll('.nn-mini-bar')]
    assert.equal(bars.length, 4)
    const heights = bars.map((b) => b.style.height)
    assert.deepEqual(heights, ['50%', '100%', '4%', '4%'])
    assert.ok(!bars.some((b) => /NaN/.test(b.getAttribute('style') || '')), 'no NaN in bar styles')
    assert.ok(!/NaN/.test(chart.textContent), 'no NaN text in the chart row')
    assert.equal(bars[2].style.backgroundColor, bars[3].style.backgroundColor)
    assert.notEqual(bars[1].style.backgroundColor, bars[2].style.backgroundColor, 'NaN bars are greyed out')
  })

  it('renders an all-NaN chart row without NaN leaking', () => {
    const rows = [{ id: 'm1', label: 'Broken', formula: 'missing thing', growth: { mode: 'fixed', factor: 0 } }]
    const { result } = captureWarnings(() => renderGrid(rows, { chartLabel: 'Broken' }))
    const chart = result.container.querySelector('tr.nn-timeline-chart-row')
    assert.ok(!/NaN/.test(chart.textContent))
    assert.ok(![...chart.querySelectorAll('.nn-mini-bar')].some((b) => /NaN/.test(b.getAttribute('style') || '')))
  })
})
