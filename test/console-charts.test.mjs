// @jsdom — the console's chart entry points run on the vendored Chart.js build.
import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { JSDOM } from 'jsdom'
import { consoleDir, nnConsole } from './helpers/console-boot.mjs'

const require = createRequire(import.meta.url)
const { SOURCES } = require('../scripts/lib/console-bundle.js')

function mock2dContext(canvas) {
  return {
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: [] }),
    putImageData: () => {},
    createPattern: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    setTransform: () => {},
    resetTransform: () => {},
    drawImage: () => {},
    save: () => {},
    fillText: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => ({ width: 0 }),
    transform: () => {},
    rect: () => {},
    clip: () => {},
    setLineDash: () => {},
    getLineDash: () => [],
    canvas: canvas,
  }
}

function freshHost() {
  const dom = new JSDOM('<!doctype html><html><body><div id="host"></div></body></html>')
  const origCreateElement = dom.window.document.createElement.bind(dom.window.document)
  dom.window.document.createElement = function (tagName) {
    const el = origCreateElement(tagName)
    if (tagName.toLowerCase() === 'canvas') {
      el.getContext = () => mock2dContext(el)
    }
    return el
  }
  global.window = dom.window
  global.document = dom.window.document
  dom.window.requestAnimationFrame = (cb) => setTimeout(cb, 0)
  dom.window.cancelAnimationFrame = (id) => clearTimeout(id)
  global.requestAnimationFrame = dom.window.requestAnimationFrame
  global.cancelAnimationFrame = dom.window.cancelAnimationFrame
  global.ResizeObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  }
  global.MutationObserver =
    dom.window.MutationObserver ||
    class {
      observe() {}
      disconnect() {}
    }
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
    global.MutationObserver = class {
      observe() {}
      disconnect() {}
    }
    const chartPath = join(consoleDir, 'vendor', 'chart.umd.min.js')
    global.Chart = require(chartPath)
    require.cache['chart.js'] = {
      id: 'chart.js',
      filename: 'chart.js',
      loaded: true,
      exports: global.Chart,
    }
    require.cache['chart.js/helpers'] = {
      id: 'chart.js/helpers',
      filename: 'chart.js/helpers',
      loaded: true,
      exports: global.Chart.helpers,
    }
    const Module = require('node:module')
    const origResolve = Module._resolveFilename
    Module._resolveFilename = function (request, parent, isMain, options) {
      if (request === 'chart.js' || request === 'chart.js/helpers') return request
      return origResolve.call(this, request, parent, isMain, options)
    }
    global.ChartTreemap = require(join(consoleDir, 'vendor', 'chartjs-chart-treemap.min.js'))
  })

  it('bundles Chart.js and chartjs-chart-treemap and no longer bundles ECharts or uPlot', () => {
    const files = SOURCES.map(([file]) => file)
    assert.ok(files.includes('vendor/chart.umd.min.js'))
    assert.ok(files.includes('vendor/chartjs-chart-treemap.min.js'))
    assert.ok(!files.some((f) => /echarts|uplot/i.test(f)))
  })

  it('renderChart draws an option into the host on a canvas', () => {
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
    assert.ok(host.querySelector('canvas'), 'renders canvas into the host')
  })

  it('renderChart draws a host that has no size yet (a hidden tab) at a fallback size', () => {
    const chart = nnConsole.renderChart(freshHost(), {
      series: [{ type: 'treemap', data: [{ name: 'a', value: 1 }] }],
    })
    assert.equal(chart.getWidth(), 960)
    assert.equal(chart.getHeight(), 400)
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
      assert.ok(!second.isDisposed(), 'the second chart is active')
      assert.deepEqual(
        observers.map((o) => o.connected),
        [false, true],
      )
    } finally {
      delete global.ResizeObserver
    }
  })

  it('renderChart warns and returns null when the library is missing', () => {
    const saved = global.Chart
    delete global.Chart
    try {
      const { result, warnings } = withWarnings(() =>
        nnConsole.renderChart(freshHost(), { series: [] }),
      )
      assert.equal(result, null)
      assert.ok(warnings.some((w) => /Chart library unavailable/.test(w)))
    } finally {
      global.Chart = saved
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
    const canvasWrap = sections[0].querySelector('.nn-chart-canvas')
    assert.ok(canvasWrap.querySelector('canvas'))
    const option = global.Chart.getChart(canvasWrap.querySelector('canvas')).getOption()
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
