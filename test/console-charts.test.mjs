// @jsdom — the console's chart entry points run on the vendored ECharts build.
// ECharts reads its environment when it loads, so a DOM must exist before the require.
import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { JSDOM } from 'jsdom'
import { consoleDir, nnConsole } from './helpers/console-boot.mjs'

const require = createRequire(import.meta.url)
const { SOURCES } = require('../scripts/lib/console-bundle.js')

function freshHost() {
  const dom = new JSDOM('<!doctype html><html><body><div id="host"></div></body></html>')
  global.window = dom.window
  global.document = dom.window.document
  return dom.window.document.getElementById('host')
}

function withWarnings(fn) {
  const warnings = []
  const orig = console.warn
  console.warn = (...a) => warnings.push(a.join(' '))
  try {
    return { result: fn(), warnings }
  } finally {
    console.warn = orig
  }
}

describe('console chart library', () => {
  before(() => {
    freshHost()
    global.echarts = require(join(consoleDir, 'vendor', 'echarts.min.js'))
  })

  it('bundles ECharts and no longer bundles uPlot', () => {
    const files = SOURCES.map(([file]) => file)
    assert.ok(files.includes('vendor/echarts.min.js'))
    assert.ok(!files.some((f) => /uplot/i.test(f)))
  })

  it('renderChart draws an option into the host on a white background', () => {
    const host = freshHost()
    const chart = nnConsole.renderChart(
      host,
      {
        xAxis: { type: 'category', data: ['a', 'b'] },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: [1, 2] }],
      },
      { width: 400, height: 200 },
    )
    assert.ok(chart, 'returns the chart instance')
    assert.equal(chart.getOption().backgroundColor, '#ffffff')
    assert.ok(host.querySelector('svg'), 'renders into the host')
  })

  it('renderChart draws a host that has no size yet (a hidden tab) at a fallback size', () => {
    const chart = nnConsole.renderChart(freshHost(), {
      series: [{ type: 'treemap', data: [{ name: 'a', value: 1 }] }],
    })
    assert.equal(chart.getWidth(), 960)
    assert.equal(chart.getHeight(), 400)
  })

  it('renderChart keeps a background the option sets', () => {
    const chart = nnConsole.renderChart(
      freshHost(),
      { backgroundColor: '#f0f0f0', series: [] },
      { width: 200, height: 100 },
    )
    assert.equal(chart.getOption().backgroundColor, '#f0f0f0')
  })

  it('renderChart on the same host replaces the chart and its resize observer', () => {
    const host = freshHost()
    const observers = []
    global.ResizeObserver = class {
      constructor() {
        this.connected = false
        observers.push(this)
      }
      observe() {
        this.connected = true
      }
      disconnect() {
        this.connected = false
      }
    }
    try {
      const first = nnConsole.renderChart(host, { series: [] })
      const second = nnConsole.renderChart(host, { series: [] })
      assert.ok(first.isDisposed(), 'the previous chart is disposed')
      assert.equal(global.echarts.getInstanceByDom(host), second)
      assert.deepEqual(
        observers.map((o) => o.connected),
        [false, true],
      )
    } finally {
      delete global.ResizeObserver
    }
  })

  it('renderChart warns and returns null when the library is missing', () => {
    const saved = global.echarts
    delete global.echarts
    try {
      const { result, warnings } = withWarnings(() =>
        nnConsole.renderChart(freshHost(), { series: [] }),
      )
      assert.equal(result, null)
      assert.ok(warnings.some((w) => /ECharts unavailable/.test(w)))
    } finally {
      global.echarts = saved
    }
  })

  it('renderCharts keeps its contract: one titled line chart per declared series, month labels on x', () => {
    const host = freshHost()
    nnConsole.renderCharts(
      host,
      { series: { revenue: { Base: [1, 2, 3], Optimistic: [2, 3, 4] } } },
      { charts: [{ id: 'revenue', label: 'Revenue' }], months: 3, startMonth: 11, startYear: 2026 },
    )
    const sections = host.querySelectorAll('section.nn-chart')
    assert.equal(sections.length, 1)
    assert.equal(sections[0].querySelector('h3.nn-chart-title').textContent, 'Revenue')
    const canvas = sections[0].querySelector('.nn-chart-canvas')
    const option = global.echarts.getInstanceByDom(canvas).getOption()
    assert.deepEqual(option.xAxis[0].data, ['2026-11', '2026-12', '2027-01'])
    assert.deepEqual(
      option.series.map((s) => [s.type, s.name]),
      [
        ['line', 'Base'],
        ['line', 'Optimistic'],
      ],
    )
  })

  it('renderCharts still skips a declared chart with no series and warns', () => {
    const host = freshHost()
    const { warnings } = withWarnings(() =>
      nnConsole.renderCharts(host, { series: {} }, { charts: [{ id: 'gone', label: 'Gone' }] }),
    )
    assert.equal(host.querySelectorAll('section.nn-chart').length, 0)
    assert.ok(warnings.some((w) => /missing series for chart "gone"/.test(w)))
  })
})
