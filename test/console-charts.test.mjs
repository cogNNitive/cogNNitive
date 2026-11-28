// @jsdom — the console's chart entry points: renderChart draws a native Chart.js config,
// renderGraph draws a diagram as SVG from the console's own spec.
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { nnConsole } from './helpers/console-boot.mjs'
import {
  installChartLibrary,
  uninstallChartLibrary,
  clickChartCell,
} from './helpers/console-chart.mjs'

const require = createRequire(import.meta.url)
const { SOURCES } = require('../scripts/lib/console-bundle.js')

function freshHost() {
  const dom = installChartLibrary()
  const host = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(host)
  return host
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

const BARS = {
  type: 'bar',
  data: { labels: ['a', 'b'], datasets: [{ label: 'n', data: [1, 2] }] },
}

describe('console chart library', () => {
  before(() => installChartLibrary())
  after(() => uninstallChartLibrary())

  it('bundles Chart.js and chartjs-chart-treemap and no longer bundles ECharts or uPlot', () => {
    const files = SOURCES.map(([file]) => file)
    assert.ok(files.includes('vendor/chart.umd.min.js'))
    assert.ok(files.includes('vendor/chartjs-chart-treemap.min.js'))
    assert.ok(!files.some((f) => /echarts|uplot/i.test(f)))
  })

  it('renderChart draws a Chart.js config into the host on a canvas', () => {
    const host = freshHost()
    const chart = nnConsole.renderChart(host, structuredClone(BARS), { width: 400, height: 200 })
    const canvas = host.querySelector('canvas')
    assert.ok(canvas, 'renders canvas into the host')
    assert.equal(chart.canvas, canvas, 'returns the Chart drawn on it')
    assert.equal(chart.config.type, 'bar')
    assert.equal(canvas.width, 400)
    assert.equal(canvas.height, 200)
    assert.equal(chart.data.datasets[0].backgroundColor, '#2563eb', 'the console palette')
  })

  it('renderChart draws a host that has no size yet (a hidden tab) at a fallback size', () => {
    const host = freshHost()
    nnConsole.renderChart(host, {
      type: 'treemap',
      data: { datasets: [{ tree: [{ name: 'a', value: 1 }], key: 'value' }] },
    })
    const canvas = host.querySelector('canvas')
    assert.equal(canvas.width, 960)
    assert.equal(canvas.height, 400)
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
    const first = nnConsole.renderChart(host, structuredClone(BARS))
    const second = nnConsole.renderChart(host, structuredClone(BARS))
    assert.equal(first.canvas, null, 'the previous chart is destroyed')
    assert.equal(host.querySelectorAll('canvas').length, 1)
    assert.equal(second.canvas, host.querySelector('canvas'), 'the second chart is the one drawn')
    assert.deepEqual(
      observers.map((o) => o.connected),
      [false, true],
    )
  })

  it('renderChart refuses a chart type the console does not draw, visibly, instead of drawing a line', () => {
    const host = freshHost()
    assert.throws(
      () =>
        nnConsole.renderChart(host, {
          type: 'sankey',
          data: { datasets: [{ data: [] }] },
        }),
      /chart type "sankey" is not available; this console draws .*bar.*treemap/,
    )
    assert.equal(host.querySelector('canvas'), null, 'nothing is drawn in its place')
    const shown = host.querySelector('.nn-chart-error')
    assert.ok(shown, 'the host says what went wrong')
    assert.equal(shown.getAttribute('role'), 'alert')
    assert.match(shown.textContent, /"sankey" is not available/)
  })

  it('renderChart refuses an ECharts option: it takes a Chart.js config only', () => {
    const host = freshHost()
    assert.throws(
      () => nnConsole.renderChart(host, { series: [{ type: 'bar', data: [1] }] }),
      /renderChart takes a Chart.js config \{ type, data, options \}/,
    )
    assert.ok(host.querySelector('.nn-chart-error'))
  })

  it('renderChart hands onPick the data item of the element clicked', () => {
    const host = freshHost()
    const picked = []
    const chart = nnConsole.renderChart(
      host,
      {
        type: 'treemap',
        data: {
          datasets: [
            {
              tree: [
                { name: 'big', value: 3 },
                { name: 'small', value: 1 },
              ],
              key: 'value',
              groups: ['name'],
            },
          ],
        },
      },
      { onPick: (item) => picked.push(item.name) },
    )
    clickChartCell(chart, (raw) => raw._data.name === 'small')
    assert.deepEqual(picked, ['small'])
  })

  it('renderChart warns and returns null when the library is missing', () => {
    const host = freshHost()
    const saved = global.Chart
    delete global.Chart
    try {
      const { result, warnings } = withWarnings(() =>
        nnConsole.renderChart(host, structuredClone(BARS)),
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
    const canvas = sections[0].querySelector('.nn-chart-canvas canvas')
    assert.ok(canvas)
    const chart = global.Chart.getChart(canvas)
    assert.equal(chart.config.type, 'line')
    assert.deepEqual(chart.data.labels, ['2026-11', '2026-12', '2027-01'])
    assert.deepEqual(
      chart.data.datasets.map((d) => d.label),
      ['Base', 'Optimistic'],
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

describe('console diagram (renderGraph)', () => {
  before(() => installChartLibrary())

  const SPEC = {
    width: 400,
    height: 300,
    nodes: [
      { id: 'a', x: 100, y: 100, width: 120, height: 40, title: 'Alpha', sub: 'task' },
      { id: 'b', x: 300, y: 200, width: 120, height: 40, header: 'Beta', lines: ['x  text'] },
    ],
    edges: [{ source: 'a', target: 'b', dash: 'dashed', label: 'next' }],
    marks: [{ kind: 'badge', x: 100, y: 73, text: 'HEAD' }],
  }

  it('draws every node, edge, label and mark as SVG, at the spec positions', () => {
    const host = freshHost()
    const svg = nnConsole.renderGraph(host, SPEC)
    assert.equal(host.querySelector('svg'), svg)
    assert.equal(svg.getAttribute('viewBox'), '0 0 400 300')
    const a = svg.querySelector('g.nn-graph-node[data-node-id="a"] rect')
    assert.deepEqual(
      ['x', 'y', 'width', 'height'].map((k) => a.getAttribute(k)),
      ['40', '80', '120', '40'],
    )
    assert.equal(svg.querySelector('[data-node-id="a"] .nn-graph-title').textContent, 'Alpha')
    assert.equal(svg.querySelector('[data-node-id="b"] .nn-graph-header').textContent, 'Beta')
    const edge = svg.querySelector('path.nn-graph-edge[data-source="a"][data-target="b"]')
    assert.equal(edge.getAttribute('stroke-dasharray'), '5,5')
    assert.equal(svg.querySelector('.nn-graph-edge-label').textContent, 'next')
    assert.equal(svg.querySelector('.nn-graph-badge').textContent, 'HEAD')
  })

  it('places a circular layout around its centre node', () => {
    const host = freshHost()
    const svg = nnConsole.renderGraph(host, {
      layout: 'circular',
      width: 400,
      height: 400,
      nodes: [
        { id: 'c', shape: 'circle', center: true, label: 'C' },
        { id: 'n', shape: 'circle', label: 'N' },
      ],
    })
    const centre = svg.querySelector('[data-node-id="c"] circle')
    assert.deepEqual([centre.getAttribute('cx'), centre.getAttribute('cy')], ['200', '200'])
    assert.ok(
      Number(centre.getAttribute('r')) >
        Number(svg.querySelector('[data-node-id="n"] circle').getAttribute('r')),
    )
  })

  it('calls onPick with the spec node clicked, again after a redraw', () => {
    const host = freshHost()
    const picked = []
    const onPick = (node) => picked.push(node.id)
    nnConsole.renderGraph(host, SPEC, { onPick })
    const click = (id) =>
      host
        .querySelector(`[data-node-id="${id}"]`)
        .dispatchEvent(new host.ownerDocument.defaultView.Event('click'))
    click('b')
    nnConsole.renderGraph(host, SPEC, { onPick })
    click('a')
    assert.deepEqual(picked, ['b', 'a'])
    assert.equal(host.querySelectorAll('svg').length, 1, 'a redraw replaces the drawing')
  })
})
