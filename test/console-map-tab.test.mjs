// @jsdom — the Map tab: how the domaiNN is built (domaiNN > model > concept >
// element) and what one element is linked to, one hop away.
import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { JSDOM } from 'jsdom'
import { bootConsole, consoleDir } from './helpers/console-boot.mjs'
import {
  installChartLibrary,
  uninstallChartLibrary,
  mockCanvas,
  clickChartCell,
} from './helpers/console-chart.mjs'

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

function boot(model = MODEL) {
  return bootConsole({ model, schema: SCHEMA, before: mockCanvas })
}

function withCharts() {
  installChartLibrary()
}

/** The treemap the Map tab drew (the real Chart.js instance on its canvas). */
function treemapOf(document) {
  const canvas = document.querySelector('#nn-tab-map .nn-map-tree canvas')
  return global.Chart.getChart(canvas)
}

function crumbs(document) {
  return [...document.querySelectorAll('#nn-tab-map .nn-map-crumb')].map((c) => c.textContent)
}

function words(document) {
  return document.querySelector('#nn-tab-map .nn-map-words').textContent
}

describe('Map tab', () => {
  afterEach(() => {
    uninstallChartLibrary()
  })

  it('is a Domain sub-tab between Schema and Versions, not a top-level tab', () => {
    const { document } = boot()
    const top = [...document.querySelectorAll('#nn-view-tabs .nn-view-tab')].map(
      (b) => b.dataset.tab,
    )
    assert.equal(top.indexOf('map'), -1, top.join(','))
    const sub = [...document.querySelectorAll('#nn-domain-subtabs .nn-view-tab')].map(
      (b) => b.dataset.tab,
    )
    assert.ok(sub.indexOf('map') === sub.indexOf('metamodel') + 1, sub.join(','))
  })

  it('draws the domaiNN as nested boxes: models, then concepts, then elements', () => {
    withCharts()
    const { document } = boot()
    const chart = treemapOf(document)
    assert.equal(chart.config.type, 'treemap')
    const dataset = chart.data.datasets[0]
    assert.deepEqual(dataset.groups, ['l0', 'l1'])
    assert.deepEqual(
      dataset.tree.map((r) => [r.l0, r.l1, r.name, r.elementId]),
      [
        ['CRM · business', 'Client', 'Acme', 'crm@acme'],
        ['CRM · business', 'Client', 'Globex', 'crm@globex'],
        ['CRM · business', 'Deal', 'Big deal', 'crm@d1'],
        ['CRM · business', 'Deal', 'Small deal', 'crm@d2'],
        ['KPIs · metrics', 'Metric', 'Win rate', 'kpi@win'],
      ],
    )
  })

  it('dives into the model whose box is clicked, matching its name exactly', () => {
    withCharts()
    // "CRM" is the start of "CRM Archive": a prefix match opened the wrong model.
    const model = structuredClone(MODEL)
    model.meta.models.splice(1, 0, { id: 'arch', title: 'CRM Archive', blueprint: 'business' })
    model.elements.push({
      id: 'arch@old',
      modelId: 'arch',
      concept: 'Client',
      name: 'Old',
      fields: {},
    })
    const { document } = boot(model)
    clickChartCell(
      treemapOf(document),
      (raw) => raw.l === 0 && raw._data.l0 === 'CRM Archive · business',
    )
    assert.deepEqual(crumbs(document), ['🏠 Sales Domain', 'CRM Archive'])
    assert.deepEqual(
      treemapOf(document).data.datasets[0].tree.map((r) => r.elementId),
      ['arch@old'],
      'the map now holds that model only',
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
    const { document } = boot()
    const svg = document.querySelector('#nn-tab-map .nn-map-ego svg')
    const ids = [...svg.querySelectorAll('.nn-graph-node')].map((g) =>
      g.getAttribute('data-node-id'),
    )
    assert.deepEqual(ids, ['crm@d1', 'crm@acme', 'crm@globex', 'kpi@win'])
    const r = (id) => Number(svg.querySelector(`[data-node-id="${id}"] circle`).getAttribute('r'))
    assert.ok(r('crm@d1') > r('crm@acme'), 'the centre is the biggest node')
    assert.deepEqual(
      [...svg.querySelectorAll('path.nn-graph-edge')].map((p) => [
        p.getAttribute('data-source'),
        p.getAttribute('data-target'),
      ]),
      [
        ['crm@d1', 'crm@acme'],
        ['crm@d1', 'crm@globex'],
        ['kpi@win', 'crm@d1'],
      ],
    )
    assert.deepEqual(
      [...svg.querySelectorAll('.nn-graph-edge-label')].map((l) => l.textContent),
      ['client', 'partner', 'deal'],
    )
  })

  it('recentres on a neighbour clicked in the drawing', () => {
    const { document } = boot()
    document
      .querySelector('#nn-tab-map .nn-map-ego [data-node-id="crm@acme"]')
      .dispatchEvent(new document.defaultView.Event('click'))
    assert.equal(document.querySelector('#nn-tab-map select.nn-map-pick').value, 'crm@acme')
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
