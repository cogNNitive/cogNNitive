// @jsdom — the Domain tab: the domaiNN at a glance for someone who does not know it.
import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { bootConsole, consoleDir } from './helpers/console-boot.mjs'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))

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
        declaredConcepts: ['Client', 'Deal', 'Risk'],
      },
      {
        id: 'pipeline',
        title: 'Pipeline',
        blueprint: 'metrics',
        elementCount: 1,
        conceptNames: ['Deal'],
        declaredConcepts: ['Deal'],
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
  document.querySelectorAll('#nn-tab-domain .nn-kpi-card').forEach((card) => {
    out[card.querySelector('.kpi-label').textContent] = card.querySelector('.kpi-value').textContent
  })
  return out
}

describe('Domain tab', () => {
  afterEach(() => {
    delete global.echarts
  })

  it('is the first tab of the core band', () => {
    const { document } = boot()
    const tabs = [...document.querySelectorAll('.nn-view-tab')].map((b) => b.dataset.tab)
    assert.equal(tabs[0], 'domain')
    assert.equal(document.querySelector('.nn-view-tab[data-tab="domain"]').textContent, 'Domain')
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
    const cards = [...document.querySelectorAll('#nn-tab-domain .nn-summary-model')]
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
    const items = [...document.querySelectorAll('#nn-tab-domain .nn-summary-attention li')].map(
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
    const first = document.querySelector('#nn-tab-domain .nn-summary-attention li')
    assert.equal(first.textContent, 'Risk, Lead and Task have no elements yet.')
    assert.deepEqual(
      [...first.querySelectorAll('[data-concept]')].map((a) => a.dataset.concept),
      ['Risk', 'Lead', 'Task'],
    )
  })

  it('lists every concept its bluepriNNt declares, empty ones too, with their counts', () => {
    const { document } = boot()
    const rows = [
      ...document.querySelectorAll(
        '#nn-tab-domain .nn-summary-model[data-model="crm"] .nn-summary-model-legend li',
      ),
    ]
    assert.deepEqual(
      rows.map((li) => [
        li.querySelector('.nn-ku-label').textContent,
        li.querySelector('.nn-summary-count').textContent,
      ]),
      [
        ['Client', '2'],
        ['Deal', '1'],
        ['Risk', '0'],
      ],
    )
    assert.equal(rows[0].querySelector('.nn-summary-dot').style.background, 'rgb(37, 99, 235)')
  })

  it('opens the concept window when a concept on a card is clicked', () => {
    const { document } = boot()
    document
      .querySelector(
        '#nn-tab-domain .nn-summary-model[data-model="crm"] [data-concept="Deal"] .nn-ku',
      )
      .click()
    const dialog = document.querySelector('dialog.nn-ku-info-panel')
    assert.ok(dialog, 'the concept window is open')
    assert.equal(dialog.querySelector('.nn-ku-info-title').textContent, 'Deal')
    assert.equal(dialog.getAttribute('data-nn-address'), 'crm@concept:deal')
  })

  it('opens the concept window when a concept in a hint is clicked', () => {
    const { document } = boot()
    document
      .querySelector('#nn-tab-domain .nn-summary-attention [data-concept="Deal"] .nn-ku')
      .click()
    assert.equal(
      document.querySelector('dialog.nn-ku-info-panel .nn-ku-info-title').textContent,
      'Deal',
    )
  })

  it('opens Knowledge filtered by the model a card names', () => {
    const { document } = boot()
    document
      .querySelector(
        '#nn-tab-domain .nn-summary-model[data-model="pipeline"] .nn-summary-model-open',
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
      '#nn-tab-domain .nn-summary-model[data-model="crm"] .nn-summary-model-chart',
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
    assert.equal(document.querySelectorAll('#nn-tab-domain .nn-summary-model').length, 2)
  })

  it('is not shown for a console with no models', () => {
    const { document } = bootConsole()
    assert.equal(document.querySelector('.nn-view-tab[data-tab="domain"]'), null)
  })

  it('is where the domaiNN console lands, unless the URL carries a search', () => {
    const config = { needs: ['feedback-export'], defaultView: 'domain' }
    const active = (document) => document.querySelector('.nn-view-tab.active').dataset.tab
    assert.equal(active(bootConsole({ model: MODEL, schema: SCHEMA, config }).document), 'domain')
    const searched = bootConsole({
      model: MODEL,
      schema: SCHEMA,
      config,
      url: 'http://localhost/#q=Acme',
    })
    assert.equal(active(searched.document), 'explorer')
  })

  it('holds Schema and Map as its sub-tabs instead of top-level tabs', () => {
    const { document } = boot()
    const top = [...document.querySelectorAll('#nn-view-tabs .nn-view-tab')].map(
      (b) => b.dataset.tab,
    )
    assert.ok(top.includes('domain') && top.includes('explorer'), top.join(','))
    assert.ok(
      !top.includes('metamodel') && !top.includes('map') && !top.includes('versions'),
      top.join(','),
    )
    const subnav = document.getElementById('nn-domain-subtabs')
    assert.equal(subnav.getAttribute('aria-label'), 'Domain views')
    const sub = [...subnav.querySelectorAll('.nn-view-tab')]
    assert.deepEqual(
      sub.map((b) => b.dataset.tab),
      ['domain', 'metamodel', 'map'],
    )
    assert.deepEqual(
      sub.map((b) => b.textContent),
      ['Overview', 'Schema', 'Map'],
    )
  })

  it('keeps Domain lit while a sub-tab shows, and hides the sub-tabs elsewhere', () => {
    const { document } = boot()
    const subnav = document.getElementById('nn-domain-subtabs')
    const topDomain = document.querySelector('#nn-view-tabs .nn-view-tab[data-tab="domain"]')
    subnav.querySelector('[data-tab="metamodel"]').click()
    assert.ok(document.getElementById('nn-tab-metamodel').classList.contains('active'))
    assert.ok(!document.getElementById('nn-tab-domain').classList.contains('active'))
    assert.ok(topDomain.classList.contains('active'), 'Domain stays lit')
    assert.ok(subnav.querySelector('[data-tab="metamodel"]').classList.contains('active'))
    assert.ok(!subnav.querySelector('[data-tab="domain"]').classList.contains('active'))
    assert.equal(subnav.style.display, 'flex')

    document.querySelector('#nn-view-tabs .nn-view-tab[data-tab="explorer"]').click()
    assert.equal(subnav.style.display, 'none')
    assert.ok(!topDomain.classList.contains('active'))
  })

  it('opens a sub-tab from its hash route, with Domain lit', () => {
    const { document } = bootConsole({ model: MODEL, schema: SCHEMA, url: 'http://localhost/#map' })
    assert.ok(document.getElementById('nn-tab-map').classList.contains('active'))
    assert.ok(
      document
        .querySelector('#nn-view-tabs .nn-view-tab[data-tab="domain"]')
        .classList.contains('active'),
    )
    assert.equal(document.getElementById('nn-domain-subtabs').style.display, 'flex')
  })

  it('is the landing tab the whole-domaiNN export asks for', () => {
    const html = readFileSync(join(here, 'fixtures', 'testlab', 'domaiNN_console.html'), 'utf8')
    const config = JSON.parse(/id="nn-config">([\s\S]*?)<\/script>/.exec(html)[1])
    assert.equal(config.defaultView, 'domain')
  })
})
