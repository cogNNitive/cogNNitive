// @jsdom — the Map tab: how the domaiNN is built (domaiNN > model > concept >
// element) and what one element is linked to, one hop away.
import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { JSDOM } from 'jsdom'
import { bootConsole, consoleDir } from './helpers/console-boot.mjs'

const require = createRequire(import.meta.url)

const SCHEMA = {
  concepts: [{ name: 'Client', color: '#2563eb' }, { name: 'Deal' }, { name: 'Metric' }],
  fields: [{ concept: 'Deal', name: 'client', type: 'reference', target_concepts: ['Client'] }],
}

const MODEL = {
  meta: {
    title: 'D',
    modelId: 'crm',
    domain: { title: 'Sales Domain' },
    models: [
      { id: 'crm', title: 'CRM', blueprint: 'business' },
      { id: 'kpi', title: 'KPIs', blueprint: 'metrics' },
      { id: 'changes', title: 'Changes', blueprint: 'changes' },
    ],
  },
  elements: [
    { id: 'crm@acme', modelId: 'crm', concept: 'Client', name: 'Acme', fields: {} },
    { id: 'crm@globex', modelId: 'crm', concept: 'Client', name: 'Globex', fields: {} },
    {
      id: 'crm@d1',
      modelId: 'crm',
      concept: 'Deal',
      name: 'Big deal',
      fields: { client: 'crm@acme', partner: '[[Globex]]' },
    },
    {
      id: 'crm@d2',
      modelId: 'crm',
      concept: 'Deal',
      name: 'Small deal',
      fields: { client: 'acme' },
    },
    {
      id: 'kpi@win',
      modelId: 'kpi',
      concept: 'Metric',
      name: 'Win rate',
      fields: {},
      relations: [{ field: 'deal', target: 'crm@d1' }],
    },
    { id: 'changes@c1', modelId: 'changes', concept: 'Change', name: 'C1', fields: {} },
  ],
  matrices: [],
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

function words(document) {
  return document.querySelector('#nn-tab-map .nn-map-words').textContent
}

describe('Map tab', () => {
  afterEach(() => {
    delete global.echarts
  })

  it('sits between Schema and Knowledge', () => {
    const { document } = boot()
    const tabs = [...document.querySelectorAll('.nn-view-tab')].map((b) => b.dataset.tab)
    assert.ok(tabs.indexOf('map') === tabs.indexOf('metamodel') + 1, tabs.join(','))
    assert.ok(tabs.indexOf('map') < tabs.indexOf('explorer'))
  })

  it('draws the domaiNN as nested boxes: models, then concepts, then elements', () => {
    withECharts()
    const { document } = boot()
    const host = document.querySelector('#nn-tab-map .nn-map-tree')
    const data = global.echarts.getInstanceByDom(host).getOption().series[0].data
    assert.deepEqual(
      data.map((m) => [m.name, m.children.map((c) => [c.name, c.value, c.children.length])]),
      [
        [
          'CRM · business',
          [
            ['Client', 2, 2],
            ['Deal', 2, 2],
          ],
        ],
        ['KPIs · metrics', [['Metric', 1, 1]]],
      ],
    )
  })

  it('starts on the most linked element and tells its links in words', () => {
    const { document } = boot()
    assert.equal(document.querySelector('#nn-tab-map select.nn-map-pick').value, 'crm@d1')
    assert.equal(
      words(document),
      'Big deal (Deal, CRM) points to: Acme (client), Globex (partner). Pointed to by: Win rate (deal).',
    )
  })

  it('follows field addresses, wikilinks and relations in both directions', () => {
    const { document } = boot()
    const pick = document.querySelector('#nn-tab-map select.nn-map-pick')
    pick.value = 'crm@acme'
    pick.dispatchEvent(new document.defaultView.Event('change'))
    assert.equal(
      words(document),
      'Acme (Client, CRM) points to nothing. Pointed to by: Big deal (client), Small deal (client).',
    )
  })

  it('recentres on a neighbour when its name is clicked', () => {
    const { document } = boot()
    document.querySelector('#nn-tab-map .nn-map-words a[data-element="crm@acme"]').click()
    assert.equal(document.querySelector('#nn-tab-map select.nn-map-pick').value, 'crm@acme')
  })

  it('says so when an element has no links', () => {
    const { document } = boot()
    const pick = document.querySelector('#nn-tab-map select.nn-map-pick')
    pick.value = 'crm@globex'
    pick.dispatchEvent(new document.defaultView.Event('change'))
    pick.value = 'kpi@win'
    pick.dispatchEvent(new document.defaultView.Event('change'))
    assert.match(
      words(document),
      /^Win rate \(Metric, KPIs\) points to: Big deal \(deal\)\. Nothing points to it\.$/,
    )
  })

  it('draws the neighbourhood with the element in the middle and labelled links', () => {
    withECharts()
    const { document } = boot()
    const host = document.querySelector('#nn-tab-map .nn-map-ego')
    const series = global.echarts.getInstanceByDom(host).getOption().series[0]
    assert.deepEqual(
      series.data.map((n) => n.id),
      ['crm@d1', 'crm@acme', 'crm@globex', 'kpi@win'],
    )
    assert.ok(
      series.data[0].symbolSize > series.data[1].symbolSize,
      'the centre is the biggest node',
    )
    assert.deepEqual(
      series.links.map((l) => [l.source, l.target, l.label.formatter]),
      [
        ['crm@d1', 'crm@acme', 'client'],
        ['crm@d1', 'crm@globex', 'partner'],
        ['kpi@win', 'crm@d1', 'deal'],
      ],
    )
  })

  it('is absent when the console has no elements', () => {
    const { document } = bootConsole({
      model: {
        meta: { title: 'E', modelId: 'e', models: [{ id: 'e', title: 'E' }] },
        elements: [],
        matrices: [],
      },
    })
    assert.equal(document.querySelector('.nn-view-tab[data-tab="map"]'), null)
  })
})
