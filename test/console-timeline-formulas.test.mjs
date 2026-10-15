import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { InnfoConsole, bootConsole } from './helpers/console-boot.mjs'

// Renders the Timeline grid for the given rows and returns, per row label,
// the text of its monthly numeric cells.
function renderRows(rows, months = 2) {
  const { document } = bootConsole()
  const container = document.createElement('div')
  document.body.appendChild(container)
  InnfoConsole.renderTimelineGrid(container, { rows }, { months })
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
    assert.equal(out['Coste'][0], '2,240')
  })

  it('leaves the % variable row itself displayed as authored (#178)', () => {
    const out = renderRows([
      { id: 'v1', label: 'Ratio', variable: true, base: 35, metricUnit: '%', growth: { mode: 'fixed', factor: 0 } },
    ])
    assert.equal(out['Ratio'][0], '35')
  })
})
