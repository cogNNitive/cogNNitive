// @jsdom — the Domain tab: the domaiNN at a glance for someone who does not know it.
import { describe, it } from 'node:test'
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
      Instances: '0',
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

  it('explains the vocabulary once, in the header info popover and not under the tabs', () => {
    const { document } = bootConsole({
      model: MODEL,
      schema: SCHEMA,
      // The helper's minimal shell has no header; the real one carries the brand block.
      before: (doc) =>
        doc.body.insertAdjacentHTML(
          'afterbegin',
          '<header class="nn-navbar"><div class="nn-brand"><h1 id="nn-domain-title"></h1><div id="nn-navbar-extra"></div></div></header>',
        ),
    })
    const legends = document.querySelectorAll('.nn-vocab-legend')
    assert.equal(legends.length, 1)
    assert.ok(legends[0].closest('.nn-navbar-info-popover'), 'legend lives in the popover')
    assert.equal(
      document.querySelector('.nn-navbar > .nn-vocab-legend, main .nn-vocab-legend'),
      null,
    )
    const text = legends[0].textContent
    for (const term of ['bluepriNNt', 'concept', 'element', 'field'])
      assert.ok(text.includes(term), term)
  })

  it('shows the search and filter bar only on Knowledge', () => {
    const { document } = boot()
    const toolbar = document.querySelector('.nn-toolbar')
    const tab = (id) => document.querySelector(`.nn-view-tab[data-tab="${id}"]`)
    tab('explorer').click()
    assert.notEqual(toolbar.style.display, 'none')
    tab('domain').click()
    assert.equal(toolbar.style.display, 'none')
    tab('explorer').click()
    assert.notEqual(toolbar.style.display, 'none')
  })

  it('draws each model card as a stacked bar by concept with native DOM track', () => {
    const { document } = boot()
    const bar = document.querySelector(
      '#nn-tab-domain .nn-summary-model[data-model="crm"] .nn-summary-model-chart',
    )
    const track = bar.querySelector('.nn-summary-bar-track')
    assert.ok(track, 'renders a native progress track')
    const segs = Array.from(track.querySelectorAll('.nn-summary-bar-seg'))
    assert.deepEqual(
      segs.map((s) => [s.getAttribute('data-concept'), s.getAttribute('title')]),
      [
        ['Client', 'Client: 2'],
        ['Deal', 'Deal: 1'],
      ],
    )
    assert.ok(
      segs[0].style.background.includes('2563eb') ||
        segs[0].style.background.includes('37, 99, 235'),
    )
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

  it('splits Models and Instances in the KPI row and counts content accurately (#947)', () => {
    const model = {
      meta: {
        title: 'Content Domain',
        modelId: 'domain',
        models: [
          {
            id: 'video-defaults',
            title: 'Video Defaults',
            blueprint: 'conntent',
            storage: { kind: 'compact' },
            elementCount: 5,
          },
          {
            id: 'model-catalog',
            title: 'Model Catalog',
            blueprint: 'conntent',
            storage: { kind: 'compact' },
            elementCount: 3,
          },
          {
            id: 'series-1',
            title: 'Series 1',
            blueprint: 'conntent',
            storage: { kind: 'instance', concept: 'Series', container: null, slug: 'series-1' },
            elementCount: 7,
          },
          {
            id: 'series-1/ep-1',
            title: 'Ep 1',
            blueprint: 'conntent',
            storage: { kind: 'instance', concept: 'Video', container: 'series-1', slug: 'ep-1' },
            elementCount: 13,
          },
          {
            id: 'series-1/ep-2',
            title: 'Ep 2',
            blueprint: 'conntent',
            storage: { kind: 'instance', concept: 'Video', container: 'series-1', slug: 'ep-2' },
            elementCount: 10,
          },
          {
            id: 'exec-1',
            title: 'Exec 1',
            blueprint: 'executions',
            storage: {
              kind: 'instance',
              concept: 'Procedure Execution',
              container: null,
              slug: 'exec-1',
            },
            elementCount: 2,
          },
        ],
      },
      elements: [
        {
          id: 'series-1@series-1',
          modelId: 'series-1',
          concept: 'Series',
          slug: 'series-1',
          name: 'Series 1',
          status: 'published',
        },
        {
          id: 'series-1/ep-1@ep-1',
          modelId: 'series-1/ep-1',
          concept: 'Video',
          slug: 'ep-1',
          name: 'Ep 1',
          status: 'delivered',
        },
        {
          id: 'series-1/ep-2@ep-2',
          modelId: 'series-1/ep-2',
          concept: 'Video',
          slug: 'ep-2',
          name: 'Ep 2',
          status: 'draft',
        },
        {
          id: 'exec-1@exec-1',
          modelId: 'exec-1',
          concept: 'Procedure Execution',
          slug: 'exec-1',
          name: 'Exec 1',
          fields: { state: 'completed' },
        },
      ],
      changes: [],
    }
    const schema = {
      concepts: [
        {
          name: 'Series',
          storage: { mode: 'distributed', placement: 'series/{slug}/' },
          declaredBy: { family: 'conntent', name: 'coNNtent_V_0-32-7' },
        },
        {
          name: 'Video',
          storage: {
            mode: 'distributed',
            container: 'Series',
            placement: 'series/{container}/episodes/{slug}/',
          },
          declaredBy: { family: 'conntent', name: 'coNNtent_V_0-32-7' },
        },
        {
          name: 'Procedure Execution',
          storage: { mode: 'distributed', placement: 'executions/{slug}/' },
          declaredBy: { family: 'executions', name: 'executions_V_0-7-2' },
        },
      ],
    }
    const { document } = bootConsole({ model, schema })
    const kpiElements = kpis(document)
    assert.equal(kpiElements.Models, '2')
    assert.equal(kpiElements.Instances, '4')

    // Subtitle checks
    const modelCard = [...document.querySelectorAll('#nn-tab-domain .nn-kpi-card')].find(
      (c) => c.querySelector('.kpi-label').textContent === 'Models',
    )
    assert.equal(modelCard.querySelector('.kpi-sub').textContent, 'structural documents')

    const instCard = [...document.querySelectorAll('#nn-tab-domain .nn-kpi-card')].find(
      (c) => c.querySelector('.kpi-label').textContent === 'Instances',
    )
    assert.equal(
      instCard.querySelector('.kpi-sub').textContent,
      'Series 1 · Video 2 · Procedure Execution 1',
    )

    // Section headers
    const sectionHeads = [
      ...document.querySelectorAll('#nn-tab-domain .nn-summary-section-head'),
    ].map((h) => [
      h.querySelector('.nn-summary-section').textContent,
      h.querySelector('.nn-summary-section-meta').textContent,
    ])
    assert.deepEqual(sectionHeads, [
      ['Models', '2 structural documents'],
      ['Instance Models', '4 documents · 3 distributed concepts'],
    ])

    // Instances grouping and nesting
    const rootGroups = [
      ...document.querySelectorAll(
        '#nn-tab-domain .nn-summary-instances > .nn-summary-instance-group',
      ),
    ]
    assert.equal(rootGroups.length, 2, 'Series and Procedure Execution root groups')

    // Series group
    const seriesGroup = rootGroups[0]
    assert.equal(seriesGroup.querySelector('.nn-summary-group-title').textContent, 'Series')
    assert.equal(seriesGroup.querySelector('.nn-summary-group-count').textContent, '1 instance')
    assert.equal(
      seriesGroup.querySelector('.nn-summary-group-blueprint').textContent,
      'coNNtent_V_0-32-7',
    )

    // Series instance row
    const seriesRow = seriesGroup.querySelector('.nn-summary-instance-row[data-model="series-1"]')
    assert.ok(seriesRow, 'series-1 row exists')
    assert.equal(seriesRow.querySelector('.nn-summary-instance-id').textContent, 'series-1')
    assert.equal(seriesRow.querySelector('.nn-summary-instance-elements').textContent, '1 element')
    assert.equal(seriesRow.querySelector('.nn-summary-instance-status').textContent, 'published')
    assert.equal(
      seriesRow.querySelector('.nn-summary-instance-link').getAttribute('href'),
      'artifacts/series-1_console/series-1_console.html',
    )

    // Nested Video group inside series-1
    const nestedVideoGroup = seriesGroup.querySelector('.nn-summary-instance-group--nested')
    assert.ok(nestedVideoGroup, 'nested video group exists inside series')
    assert.equal(nestedVideoGroup.querySelector('.nn-summary-group-title').textContent, 'Video')
    assert.equal(
      nestedVideoGroup.querySelector('.nn-summary-group-container').textContent,
      'container: Series',
    )
    assert.equal(
      nestedVideoGroup.querySelector('.nn-summary-group-count').textContent,
      '2 instances',
    )

    // Video instance rows
    const ep1Row = nestedVideoGroup.querySelector(
      '.nn-summary-instance-row[data-model="series-1/ep-1"]',
    )
    assert.ok(ep1Row, 'ep1 row exists')
    assert.equal(ep1Row.querySelector('.nn-summary-instance-id').textContent, 'series-1/ep-1')
    assert.equal(ep1Row.querySelector('.nn-summary-instance-status').textContent, 'delivered')

    const ep2Row = nestedVideoGroup.querySelector(
      '.nn-summary-instance-row[data-model="series-1/ep-2"]',
    )
    assert.ok(ep2Row, 'ep2 row exists')
    assert.equal(ep2Row.querySelector('.nn-summary-instance-status').textContent, 'draft')
  })

  it('handles edge case 1: distributed blueprint with 0 instances renders collapsed group (#947)', () => {
    const model = {
      meta: {
        title: 'Empty Domain',
        modelId: 'domain',
        models: [
          {
            id: 'settings',
            title: 'Settings',
            blueprint: 'base',
            storage: { kind: 'compact' },
            elementCount: 1,
          },
        ],
      },
      elements: [
        { id: 'settings@cfg', modelId: 'settings', concept: 'Setting', slug: 'cfg', name: 'Cfg' },
      ],
      changes: [],
    }
    const schema = {
      concepts: [
        { name: 'Setting' },
        {
          name: 'CustomInstance',
          storage: { mode: 'distributed', placement: 'custom/{slug}/' },
          declaredBy: { family: 'custom', name: 'custom_V_1-0-0' },
        },
      ],
    }
    const { document } = bootConsole({ model, schema })
    const group = document.querySelector('#nn-tab-domain .nn-summary-instance-group')
    assert.ok(group, 'group exists')
    assert.equal(group.hasAttribute('open'), false, 'group with 0 instances is collapsed')
    assert.equal(group.querySelector('.nn-summary-group-title').textContent, 'CustomInstance')
    assert.equal(group.querySelector('.nn-summary-group-count').textContent, '0 instances')
    assert.equal(group.querySelector('.nn-summary-group-blueprint').textContent, 'custom_V_1-0-0')
  })

  it('handles edge case 2: PLACEMENT_MISMATCH renders in Unplaced instances group with a warning (#947)', () => {
    const model = {
      meta: {
        title: 'Misplaced Domain',
        modelId: 'domain',
        models: [
          {
            id: 'cfg',
            title: 'Cfg',
            blueprint: 'base',
            storage: { kind: 'compact' },
            elementCount: 1,
          },
          {
            id: 'lost-ep',
            title: 'Lost Ep',
            blueprint: 'conntent',
            storage: {
              kind: 'instance',
              concept: 'Video',
              container: null,
              slug: 'lost-ep',
              placement: 'PLACEMENT_MISMATCH',
            },
            elementCount: 3,
          },
        ],
      },
      elements: [
        {
          id: 'lost-ep@lost-ep',
          modelId: 'lost-ep',
          concept: 'Video',
          slug: 'lost-ep',
          name: 'Lost Ep',
          status: 'draft',
        },
      ],
      changes: [],
    }
    const schema = {
      concepts: [
        {
          name: 'Series',
          storage: { mode: 'distributed', placement: 'series/{slug}/' },
          declaredBy: { family: 'conntent' },
        },
        {
          name: 'Video',
          storage: {
            mode: 'distributed',
            container: 'Series',
            placement: 'series/{container}/episodes/{slug}/',
          },
          declaredBy: { family: 'conntent' },
        },
      ],
    }
    const { document } = bootConsole({ model, schema })
    const warnGroup = document.querySelector('#nn-tab-domain .nn-summary-instance-group--warning')
    assert.ok(warnGroup, 'unplaced warning group exists')
    assert.ok(warnGroup.hasAttribute('open'), 'warning group is open')
    assert.equal(
      warnGroup.querySelector('.nn-summary-group-title').textContent,
      'Unplaced instances',
    )
    assert.equal(warnGroup.querySelector('.nn-summary-group-count').textContent, '1 instance')
    const row = warnGroup.querySelector('.nn-summary-instance-row[data-model="lost-ep"]')
    assert.ok(row, 'lost-ep row is in unplaced group')
    assert.ok(
      row.querySelector('.nn-summary-instance-warning-badge'),
      'row carries placement mismatch badge',
    )
  })

  it('handles edge case 3: compact model holding distributed elements renders warning (#947)', () => {
    const model = {
      meta: {
        title: 'Mixed Domain',
        modelId: 'domain',
        models: [
          {
            id: 'mixed-model',
            title: 'Mixed Model',
            blueprint: 'base',
            conceptNames: ['Video'],
            storage: { kind: 'compact', problem: 'mixed' },
            elementCount: 2,
          },
        ],
      },
      elements: [
        { id: 'mixed-model@v1', modelId: 'mixed-model', concept: 'Video', slug: 'v1', name: 'V1' },
      ],
      changes: [],
    }
    const schema = {
      concepts: [{ name: 'Video', storage: { mode: 'distributed', placement: 'videos/{slug}/' } }],
    }
    const { document } = bootConsole({ model, schema })
    const card = document.querySelector(
      '#nn-tab-domain .nn-summary-model[data-model="mixed-model"]',
    )
    assert.ok(card, 'mixed-model card exists')
    const warn = card.querySelector('.nn-summary-model-warning')
    assert.ok(warn, 'card carries mixed storage warning')
    assert.match(warn.textContent, /Holds distributed elements \(mixed storage\)/)
  })

  it('handles edge case 4: console scoped to a model shows single group with no section headers (#947)', () => {
    const model = {
      meta: {
        title: 'Scoped Domain',
        modelId: 'domain',
        consoleScope: { models: ['crm'] },
        models: [
          {
            id: 'crm',
            title: 'CRM',
            blueprint: 'business',
            storage: { kind: 'compact' },
            elementCount: 3,
          },
          {
            id: 'series-1',
            title: 'Series 1',
            blueprint: 'conntent',
            storage: { kind: 'instance', concept: 'Series', slug: 'series-1' },
            elementCount: 5,
          },
        ],
      },
      elements: [{ id: 'crm@c1', modelId: 'crm', concept: 'Client', slug: 'c1', name: 'C1' }],
      changes: [],
    }
    const schema = {
      concepts: [{ name: 'Client' }, { name: 'Series', storage: { mode: 'distributed' } }],
    }
    const { document } = bootConsole({ model, schema })
    const sectionHeads = document.querySelectorAll('#nn-tab-domain .nn-summary-section-head')
    assert.equal(sectionHeads.length, 0, 'no section headers when scoped to a single model')
    const card = document.querySelector('#nn-tab-domain .nn-summary-model[data-model="crm"]')
    assert.ok(card, 'scoped model card renders directly')
  })

  it('secondary defect: conceptHome resolves to blueprint rather than an instance (#947)', () => {
    const model = {
      meta: {
        title: 'Content Domain',
        modelId: 'domain',
        models: [
          // Instance model comes first
          {
            id: 'series/e01',
            title: 'E01',
            blueprint: 'conntent',
            declaredConcepts: ['Series', 'Video'],
            conceptNames: ['Video'],
            storage: { kind: 'instance', concept: 'Video', slug: 'e01' },
          },
          {
            id: 'settings',
            title: 'Settings',
            blueprint: 'admin',
            declaredConcepts: ['Config'],
            conceptNames: ['Config'],
            storage: { kind: 'compact' },
          },
        ],
      },
      elements: [
        { id: 'series/e01@e01', modelId: 'series/e01', concept: 'Video', slug: 'e01', name: 'E01' },
      ],
      changes: [{ path: 'changes/c1.md', status: 'proposed', changes: [] }],
    }
    const schema = {
      concepts: [
        {
          name: 'Video',
          storage: { mode: 'distributed' },
          declaredBy: { family: 'conntent', name: 'coNNtent_V_0-32-7' },
        },
        {
          name: 'Series',
          storage: { mode: 'distributed' },
          declaredBy: { family: 'conntent', name: 'coNNtent_V_0-32-7' },
        },
        { name: 'Config', declaredBy: { family: 'admin', name: 'admin_V_1-0-0' } },
      ],
    }
    const { document } = bootConsole({ model, schema })
    // Attention hint for empty concept 'Series': should target specs/conntent, never series/e01
    const seriesRef = document.querySelector(
      '#nn-tab-domain .nn-summary-attention [data-concept="Series"] .nn-ku',
    )
    assert.ok(seriesRef, 'Series badge in attention exists')
    seriesRef.click()
    const dialog = document.querySelector('dialog.nn-ku-info-panel')
    assert.ok(dialog, 'dialog opened')
    const addr = dialog.getAttribute('data-nn-address')
    assert.ok(!addr.startsWith('series/e01'), `address "${addr}" must not target the instance`)
    assert.ok(
      addr.includes('specs/conntent') || addr.includes('specs/coNNtent'),
      `address "${addr}" targets the blueprint`,
    )
  })
})
