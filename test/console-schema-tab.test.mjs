// @jsdom — the Schema tab: the domaiNN's concepts as an entity-relationship diagram
// (ECharts) plus the same schema in words, readable without the chart.
import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { JSDOM } from 'jsdom'
import { bootConsole, consoleDir } from './helpers/console-boot.mjs'

const require = createRequire(import.meta.url)

const SCHEMA = {
  concepts: [
    { name: 'Client', color: '#2563eb', declaredBy: { family: 'crm-app' } },
    { name: 'Deal', declaredBy: { family: 'crm-app' } },
    { name: 'Metric', declaredBy: { family: 'metrics-app' } },
  ],
  fields: [
    { concept: 'Client', name: 'sector', type: 'string' },
    { concept: 'Client', name: 'owner', type: 'string' },
    { concept: 'Client', name: 'segment', type: 'select' },
    { concept: 'Deal', name: 'amount', type: 'number' },
    { concept: 'Deal', name: 'client', type: 'reference', target_concepts: ['Client'] },
    { concept: 'Metric', name: 'value', type: 'number' },
  ],
  matrices: [],
}

const MODEL = {
  meta: { title: 'D', modelId: 'crm', models: [{ id: 'crm', title: 'CRM', blueprint: 'crm' }] },
  elements: [
    { id: 'crm@a', modelId: 'crm', concept: 'Client', name: 'A', fields: {} },
    { id: 'crm@b', modelId: 'crm', concept: 'Client', name: 'B', fields: {} },
    { id: 'crm@d', modelId: 'crm', concept: 'Deal', name: 'D', fields: {} },
  ],
  matrices: [{ name: 'Coverage', source: 'Deal', target: 'Metric', rows: [], cols: [], cells: {} }],
}

function boot() {
  return bootConsole({ model: MODEL, schema: SCHEMA })
}

function withECharts() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>')
  global.window = dom.window
  global.document = dom.window.document
  global.echarts = require(join(consoleDir, 'vendor', 'echarts.min.js'))
}

describe('Schema tab', () => {
  afterEach(() => {
    delete global.echarts
  })

  it('replaces the concept circles under the same tab id, titled Schema', () => {
    const { document } = boot()
    const tab = document.querySelector('.nn-view-tab[data-tab="metamodel"]')
    assert.equal(tab.textContent, 'Schema')
    assert.equal(document.querySelector('#nn-tab-metamodel .nn-metamodel-svg'), null)
  })

  it('tells the schema in words, grouped by bluepriNNt', () => {
    const { document } = boot()
    const groups = [...document.querySelectorAll('#nn-tab-metamodel .nn-schema-group')]
    assert.deepEqual(
      groups.map((g) => g.querySelector('h3').textContent),
      ['crm-app', 'metrics-app'],
    )
    const items = [...document.querySelectorAll('#nn-tab-metamodel .nn-schema-concept')].map(
      (li) => li.textContent,
    )
    assert.deepEqual(items, [
      'Client — 2 elements. Fields: sector (string), owner (string), segment (select).',
      'Deal — 1 element. Fields: amount (number), client (reference). Points to Client (client). Matrix with Metric (Coverage).',
      'Metric — 0 elements. Fields: value (number).',
    ])
  })

  it('opens Knowledge filtered by the concept a name links to', () => {
    const { document } = boot()
    document.querySelector('#nn-tab-metamodel .nn-schema-concept a[data-concept="Deal"]').click()
    assert.equal(document.getElementById('nn-search').value, 'concept:Deal')
  })

  it('draws one box per concept, taller with more fields, and never overlapping', () => {
    withECharts()
    const { document } = boot()
    const host = document.querySelector('#nn-tab-metamodel .nn-schema-chart')
    const series = global.echarts.getInstanceByDom(host).getOption().series[0]
    assert.equal(series.type, 'graph')
    const concepts = series.data.filter((n) => !n.name.startsWith('__nn-schema-anchor-'))
    const boxes = Object.fromEntries(concepts.map((n) => [n.name, n]))
    assert.deepEqual(Object.keys(boxes), ['Client', 'Deal', 'Metric'])
    assert.equal(boxes.Client.symbol, 'rect')
    assert.ok(
      boxes.Client.symbolSize[1] > boxes.Metric.symbolSize[1],
      'three fields need a taller box than one',
    )
    assert.equal(boxes.Client.itemStyle.borderColor, '#2563eb')
    const rect = (n) => ({
      l: n.x - n.symbolSize[0] / 2,
      r: n.x + n.symbolSize[0] / 2,
      t: n.y - n.symbolSize[1] / 2,
      b: n.y + n.symbolSize[1] / 2,
    })
    const nodes = concepts.map(rect)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]
        const overlap = a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b
        assert.equal(overlap, false, `${concepts[i].name} overlaps ${concepts[j].name}`)
      }
    }
  })

  it('draws matrices as solid lines and references as dashed lines, each labelled', () => {
    withECharts()
    const { document } = boot()
    const host = document.querySelector('#nn-tab-metamodel .nn-schema-chart')
    const links = global.echarts.getInstanceByDom(host).getOption().series[0].links
    assert.deepEqual(
      links.map((l) => [l.source, l.target, l.lineStyle.type, l.label.formatter]),
      [
        ['Deal', 'Metric', 'solid', 'Coverage'],
        ['Deal', 'Client', 'dashed', 'client'],
      ],
    )
  })

  it('anchors the canvas corners so every box is drawn at its real size, inside the canvas', () => {
    withECharts()
    const { document } = boot()
    const host = document.querySelector('#nn-tab-metamodel .nn-schema-chart')
    const series = global.echarts.getInstanceByDom(host).getOption().series[0]
    const anchors = series.data.filter((n) => n.name.startsWith('__nn-schema-anchor-'))
    assert.deepEqual(
      anchors.map((a) => [a.x, a.y]),
      [
        [0, 0],
        [series.width, series.height],
      ],
    )
    assert.equal(parseInt(host.style.height, 10), series.height)
    for (const n of series.data.filter((d) => !d.name.startsWith('__nn-schema-anchor-'))) {
      assert.ok(
        n.x - n.symbolSize[0] / 2 >= 0 && n.x + n.symbolSize[0] / 2 <= series.width,
        n.name + ' fits horizontally',
      )
      assert.ok(
        n.y - n.symbolSize[1] / 2 >= 0 && n.y + n.symbolSize[1] / 2 <= series.height,
        n.name + ' fits vertically',
      )
    }
  })

  it('sizes the chart to its layout so boxes keep their real size', () => {
    withECharts()
    const { document } = boot()
    const host = document.querySelector('#nn-tab-metamodel .nn-schema-chart')
    assert.match(host.style.height, /^\d+px$/)
    assert.ok(parseInt(host.style.height, 10) >= 200)
  })
})
