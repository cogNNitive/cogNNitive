// @jsdom — the Schema tab: the domaiNN's concepts as an entity-relationship diagram
// (SVG, drawn by renderGraph) plus the same schema in words, readable without it.
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { bootConsole } from './helpers/console-boot.mjs'

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

/** The diagram's boxes, by concept name: the rect each one is drawn with. */
function boxesOf(document) {
  const svg = document.querySelector('#nn-tab-metamodel .nn-schema-chart svg')
  return Object.fromEntries(
    [...svg.querySelectorAll('g.nn-graph-node')].map((g) => {
      const r = g.querySelector('rect')
      const n = (k) => Number(r.getAttribute(k))
      return [
        g.getAttribute('data-node-id'),
        { l: n('x'), t: n('y'), r: n('x') + n('width'), b: n('y') + n('height'), rect: r },
      ]
    }),
  )
}

describe('Schema tab', () => {
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
    const { document } = boot()
    const boxes = boxesOf(document)
    assert.deepEqual(Object.keys(boxes), ['Client', 'Deal', 'Metric'])
    assert.ok(
      boxes.Client.b - boxes.Client.t > boxes.Metric.b - boxes.Metric.t,
      'three fields need a taller box than one',
    )
    assert.equal(boxes.Client.rect.getAttribute('stroke'), '#2563eb')
    assert.match(
      document.querySelector('#nn-tab-metamodel [data-node-id="Client"] .nn-graph-header')
        .textContent,
      /^Client {2}· {2}2 elements$/,
    )
    const names = Object.keys(boxes)
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const a = boxes[names[i]]
        const b = boxes[names[j]]
        const overlap = a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b
        assert.equal(overlap, false, `${names[i]} overlaps ${names[j]}`)
      }
    }
  })

  it('draws matrices as solid lines and references as dashed lines, each labelled', () => {
    const { document } = boot()
    const svg = document.querySelector('#nn-tab-metamodel .nn-schema-chart svg')
    assert.deepEqual(
      [...svg.querySelectorAll('path.nn-graph-edge')].map((p) => [
        p.getAttribute('data-source'),
        p.getAttribute('data-target'),
        p.getAttribute('stroke-dasharray') ? 'dashed' : 'solid',
      ]),
      [
        ['Deal', 'Metric', 'solid'],
        ['Deal', 'Client', 'dashed'],
      ],
    )
    assert.deepEqual(
      [...svg.querySelectorAll('.nn-graph-edge-label')].map((l) => l.textContent),
      ['Coverage', 'client'],
    )
  })

  it('draws every box at its real size, inside the canvas', () => {
    const { document } = boot()
    const host = document.querySelector('#nn-tab-metamodel .nn-schema-chart')
    const svg = host.querySelector('svg')
    const [, , width, height] = svg.getAttribute('viewBox').split(' ').map(Number)
    assert.equal(parseInt(host.style.height, 10), height)
    assert.equal(parseInt(host.style.width, 10), width)
    for (const [name, box] of Object.entries(boxesOf(document))) {
      assert.equal(box.r - box.l, 230, name + ' keeps the box width')
      assert.ok(box.l >= 0 && box.r <= width, name + ' fits horizontally')
      assert.ok(box.t >= 0 && box.b <= height, name + ' fits vertically')
    }
  })

  it('opens Knowledge filtered by the concept whose box is clicked', () => {
    const { document } = boot()
    document
      .querySelector('#nn-tab-metamodel [data-node-id="Deal"]')
      .dispatchEvent(new document.defaultView.Event('click'))
    assert.equal(document.getElementById('nn-search').value, 'concept:Deal')
  })

  it('sizes the chart to its layout so boxes keep their real size', () => {
    const { document } = boot()
    const host = document.querySelector('#nn-tab-metamodel .nn-schema-chart')
    assert.match(host.style.height, /^\d+px$/)
    assert.ok(parseInt(host.style.height, 10) >= 200)
  })
})
