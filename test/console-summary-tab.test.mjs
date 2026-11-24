// @jsdom — the Summary tab: the domaiNN at a glance for someone who does not know it.
import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { JSDOM } from 'jsdom'
import { bootConsole, consoleDir } from './helpers/console-boot.mjs'

const require = createRequire(import.meta.url)

const SCHEMA = {
  concepts: [{ name: 'Client', color: '#2563eb' }, { name: 'Deal' }, { name: 'Risk' }],
  fields: [
    { concept: 'Client', name: 'sector', type: 'string' },
    { concept: 'Client', name: 'owner', type: 'string' },
    { concept: 'Deal', name: 'amount', type: 'number' },
    { concept: 'Deal', name: 'stage', type: 'select' },
  ],
}

const MODEL = {
  meta: {
    title: 'Sales Domain',
    modelId: 'crm',
    domain: { title: 'Sales Domain', modelCount: 3, sourceCount: 4 },
    models: [
      {
        id: 'crm',
        title: 'CRM',
        blueprint: 'business',
        elementCount: 3,
        conceptNames: ['Client', 'Deal'],
      },
      {
        id: 'pipeline',
        title: 'Pipeline',
        blueprint: 'metrics',
        elementCount: 1,
        conceptNames: ['Deal'],
      },
      {
        id: 'changes',
        title: 'Changes',
        blueprint: 'changes',
        elementCount: 1,
        conceptNames: ['Change'],
      },
    ],
  },
  elements: [
    {
      id: 'crm@acme',
      modelId: 'crm',
      concept: 'Client',
      name: 'Acme',
      fields: { sector: 'Retail', owner: 'Ana' },
    },
    { id: 'crm@globex', modelId: 'crm', concept: 'Client', name: 'Globex', fields: { sector: '' } },
    { id: 'crm@d1', modelId: 'crm', concept: 'Deal', name: 'D1', fields: {} },
    { id: 'pipeline@d2', modelId: 'pipeline', concept: 'Deal', name: 'D2', fields: { amount: 10 } },
    { id: 'changes@c1', modelId: 'changes', concept: 'Change', name: 'C1', fields: {} },
  ],
  matrices: [],
  changes: [
    { path: 'changes/a.md', status: 'applied', changes: [] },
    { path: 'changes/b.md', status: 'proposed', changes: [] },
    { path: 'changes/c.md', status: 'proposed', changes: [] },
  ],
}

function boot() {
  return bootConsole({ model: MODEL, schema: SCHEMA })
}

function kpis(document) {
  const out = {}
  document.querySelectorAll('#nn-tab-summary .nn-kpi-card').forEach((card) => {
    out[card.querySelector('.kpi-label').textContent] = card.querySelector('.kpi-value').textContent
  })
  return out
}

describe('Summary tab', () => {
  afterEach(() => {
    delete global.echarts
  })

  it('is the first tab of the core band', () => {
    const { document } = boot()
    const tabs = [...document.querySelectorAll('.nn-view-tab')].map((b) => b.dataset.tab)
    assert.equal(tabs[0], 'summary')
    assert.equal(document.querySelector('.nn-view-tab[data-tab="summary"]').textContent, 'Summary')
    assert.ok(tabs.indexOf('metamodel') > 0)
  })

  it('shows the domaiNN in numbers, leaving the change log out of models and elements', () => {
    const { document } = boot()
    assert.deepEqual(kpis(document), {
      Models: '2',
      Concepts: '3',
      Elements: '4',
      Sources: '4',
      'Pending changes': '2',
      'Fields filled': '38%',
    })
  })

  it('has one card per model with its bluepriNNt, size and completeness', () => {
    const { document } = boot()
    const cards = [...document.querySelectorAll('#nn-tab-summary .nn-summary-model')]
    assert.deepEqual(
      cards.map((c) => [
        c.querySelector('.nn-summary-model-title').textContent,
        c.querySelector('.nn-summary-model-blueprint').textContent,
        c.querySelector('.nn-summary-model-stats').textContent,
      ]),
      [
        ['CRM', 'business', '3 elements · 2 concepts · 33% fields filled'],
        ['Pipeline', 'metrics', '1 element · 1 concept · 50% fields filled'],
      ],
    )
  })

  it('lists what to look at: empty concepts, thin concepts and pending changes', () => {
    const { document } = boot()
    const items = [...document.querySelectorAll('#nn-tab-summary .nn-summary-attention li')].map(
      (li) => li.textContent,
    )
    assert.deepEqual(items, [
      'Risk has no elements yet.',
      'Deal: only 25% of its fields are filled.',
      '2 changes are waiting for review.',
    ])
  })

  it('names every empty concept in one hint', () => {
    const schema = { ...SCHEMA, concepts: [...SCHEMA.concepts, { name: 'Lead' }, { name: 'Task' }] }
    const { document } = bootConsole({ model: MODEL, schema })
    const first = document.querySelector('#nn-tab-summary .nn-summary-attention li')
    assert.equal(first.textContent, 'Risk, Lead and Task have no elements yet.')
    assert.deepEqual(
      [...first.querySelectorAll('a')].map((a) => a.dataset.concept),
      ['Risk', 'Lead', 'Task'],
    )
  })

  it('labels each card bar with its concepts and counts', () => {
    const { document } = boot()
    const legend = document.querySelector(
      '#nn-tab-summary .nn-summary-model[data-model="crm"] .nn-summary-model-legend',
    )
    assert.deepEqual(
      [...legend.querySelectorAll('a')].map((a) => a.textContent),
      ['Client (2)', 'Deal (1)'],
    )
    assert.equal(legend.querySelector('.nn-summary-dot').style.background, 'rgb(37, 99, 235)')
  })

  it('opens Knowledge filtered by the concept a hint names', () => {
    const { document } = boot()
    const link = document.querySelector(
      '#nn-tab-summary .nn-summary-attention a[data-concept="Deal"]',
    )
    link.click()
    assert.equal(document.getElementById('nn-search').value, 'concept:Deal')
    assert.ok(
      document.querySelector('.nn-view-tab[data-tab="explorer"]').classList.contains('tab-active'),
    )
  })

  it('opens Knowledge filtered by the model a card names', () => {
    const { document } = boot()
    document
      .querySelector(
        '#nn-tab-summary .nn-summary-model[data-model="pipeline"] .nn-summary-model-open',
      )
      .click()
    assert.equal(document.getElementById('nn-search').value, 'model:pipeline')
  })

  it('explains the vocabulary once, above the tabs', () => {
    const { document } = boot()
    const legends = document.querySelectorAll('.nn-vocab-legend')
    assert.equal(legends.length, 1)
    const text = legends[0].textContent
    for (const term of ['bluepriNNt', 'concept', 'element', 'field'])
      assert.ok(text.includes(term), term)
  })

  it('draws each model card as a stacked bar by concept when ECharts is loaded', () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>')
    global.window = dom.window
    global.document = dom.window.document
    global.echarts = require(join(consoleDir, 'vendor', 'echarts.min.js'))
    const { document } = boot()
    const bar = document.querySelector(
      '#nn-tab-summary .nn-summary-model[data-model="crm"] .nn-summary-model-chart',
    )
    const option = global.echarts.getInstanceByDom(bar).getOption()
    assert.deepEqual(
      option.series.map((s) => [s.name, s.data[0], s.stack]),
      [
        ['Client', 2, 'elements'],
        ['Deal', 1, 'elements'],
      ],
    )
    assert.equal(option.series[0].itemStyle.color, '#2563eb')
  })

  it('still renders its numbers when ECharts is missing', () => {
    const { document } = boot()
    assert.equal(kpis(document).Models, '2')
    assert.equal(document.querySelectorAll('#nn-tab-summary .nn-summary-model').length, 2)
  })

  it('is not shown for a console with no models', () => {
    const { document } = bootConsole()
    assert.equal(document.querySelector('.nn-view-tab[data-tab="summary"]'), null)
  })

  it('leaves Knowledge as the landing tab', () => {
    const { document } = boot()
    assert.equal(document.querySelector('.nn-view-tab.active').dataset.tab, 'explorer')
  })
})
