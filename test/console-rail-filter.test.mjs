import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { bootConsole, nnConsole } from './helpers/console-boot.mjs'

const MODEL = {
  meta: { title: 'Rail Lab', modelId: 'rail-lab', modelVersion: 'V_1-0-0' },
  elements: [
    { id: 'a1', concept: 'Alpha', name: 'A', fields: {}, hash: '0123456789abcdef' },
    { id: 'b1', concept: 'Beta', name: 'B', fields: {}, hash: '0123456789abcdef' },
    { id: 'g1', concept: 'Gamma', name: 'G', fields: {}, hash: '0123456789abcdef' },
  ],
  matrices: [],
}

describe('console rail concept filter is multi-select (OR)', () => {
  it('accumulates concepts on click and toggles one off on re-click', () => {
    const { document } = bootConsole({
      model: MODEL,
      schema: { concepts: [{ name: 'Alpha' }, { name: 'Beta' }, { name: 'Gamma' }] },
    })
    const search = document.getElementById('nn-search')
    const cards = () =>
      document.querySelectorAll('#nn-content [data-nn-component="element-card"]').length
    const rail = (name) =>
      [...document.querySelectorAll('#nn-rail [data-concept]')].find(
        (a) => a.getAttribute('data-concept') === name,
      )

    rail('Alpha').click()
    assert.equal(search.value, 'concept:Alpha')
    assert.equal(cards(), 1)

    rail('Beta').click()
    assert.equal(search.value, 'concept:Alpha concept:Beta')
    assert.equal(cards(), 2, 'two concepts union their elements')

    rail('Beta').click()
    assert.equal(search.value, 'concept:Alpha', 're-clicking removes the concept')
    assert.equal(cards(), 1)
  })
})

describe('rail concept rows are scoped to their own model', () => {
  const TWO_MODELS = {
    meta: {
      title: 'Rail Lab',
      modelId: 'rail-lab',
      modelVersion: 'V_1-0-0',
      models: [
        { id: 'series/a/one_video-script', title: 'One', filePath: 'one.md', elementCount: 2, blueprint: 'video-script' },
        { id: 'series/b/two_video-script', title: 'Two', filePath: 'two.md', elementCount: 3, blueprint: 'video-script' },
      ],
    },
    elements: [
      { id: 'a1', concept: 'Video', name: 'A video', modelId: 'series/a/one_video-script', fields: {}, hash: '0'.repeat(16) },
      { id: 'a2', concept: 'Scene', name: 'A scene', modelId: 'series/a/one_video-script', fields: {}, hash: '0'.repeat(16) },
      { id: 'b1', concept: 'Video', name: 'B video 1', modelId: 'series/b/two_video-script', fields: {}, hash: '0'.repeat(16) },
      { id: 'b2', concept: 'Video', name: 'B video 2', modelId: 'series/b/two_video-script', fields: {}, hash: '0'.repeat(16) },
      { id: 'b3', concept: 'Video', name: 'B video 3', modelId: 'series/b/two_video-script', fields: {}, hash: '0'.repeat(16) },
    ],
    matrices: [],
  }

  it('reports the model-local count and filters by model, not the whole domaiNN', () => {
    const { document } = bootConsole({
      model: TWO_MODELS,
      schema: { concepts: [{ name: 'Video' }, { name: 'Scene' }] },
    })
    const search = document.getElementById('nn-search')
    const cards = () =>
      document.querySelectorAll('#nn-content [data-nn-component="element-card"]').length
    const rowFor = (model, concept) => {
      const summary = [...document.querySelectorAll('#nn-rail summary[data-model]')].find(
        (s) => s.getAttribute('data-model') === model,
      )
      return [...summary.parentNode.querySelectorAll('ul [data-concept]')].find(
        (a) => a.getAttribute('data-concept') === concept,
      )
    }
    const countOf = (model, concept) =>
      rowFor(model, concept).querySelector('.nn-rail-count').textContent

    // The row counts THIS model's elements, not the domaiNN-wide total for the concept.
    assert.equal(countOf('series/a/one_video-script', 'Video'), '1')
    assert.equal(countOf('series/a/one_video-script', 'Scene'), '1')
    assert.equal(countOf('series/b/two_video-script', 'Video'), '3')

    // Clicking narrows to the row's own model, so the sibling model's Videos stay out.
    rowFor('series/a/one_video-script', 'Video').click()
    assert.equal(search.value, 'model:series/a/one_video-script concept:Video')
    assert.equal(cards(), 1, "only model A's Video")

    // A sibling row keeps the model already selected and unions its concept, instead
    // of toggling the model off.
    rowFor('series/a/one_video-script', 'Scene').click()
    assert.equal(search.value, 'model:series/a/one_video-script concept:Video concept:Scene')
    assert.equal(cards(), 2, "model A's Video and its Scene")

    // Re-clicking one facet of the row drops just that facet; the model scope stays.
    rowFor('series/a/one_video-script', 'Video').click()
    assert.equal(search.value, 'model:series/a/one_video-script concept:Scene')
    assert.equal(cards(), 1)

    // Clearing the last concept leaves the model scope in place.
    rowFor('series/a/one_video-script', 'Scene').click()
    assert.equal(search.value, 'model:series/a/one_video-script')
    assert.equal(cards(), 2, "model A's two elements")

    // The model row owns the model facet.
    document
      .querySelector('#nn-rail summary[data-model="series/a/one_video-script"]')
      .click()
    assert.equal(search.value, '')
    assert.equal(cards(), 5, 'every element is back')
  })
})

describe('rail and facets render knowledge units', () => {
  it('paints rail items and concept facet entries as addressed section badges', () => {
    const { document } = bootConsole({
      model: MODEL,
      schema: { concepts: [{ name: 'Alpha' }, { name: 'Beta' }] },
    })
    const railBadge = document.querySelector('#nn-rail [data-ku-kind="section"]')
    assert.ok(railBadge, 'rail concept is a Ku section badge')
    assert.match(railBadge.getAttribute('data-ku-address'), /rail-lab@concept:alpha/i)
    assert.equal(railBadge.getAttribute('data-ku-home'), 'knowledge')
  })

  it('carries the concept icon on the rail badge and drops the dead rail pill', () => {
    const { document } = bootConsole({
      model: MODEL,
      schema: {
        concepts: [
          { name: 'Alpha', icon: 'swords' },
          { name: 'Beta' },
        ],
      },
    })
    const railBadge = document.querySelector('#nn-rail [data-ku-kind="section"]')
    const icon = railBadge.querySelector('.nn-ku-icon svg')
    assert.ok(icon, 'the rail concept badge renders the concept icon')
    assert.equal(
      document.querySelector('#nn-rail .nn-rail-concept-pill'),
      null,
      'the dead rail-concept-pill markup is gone',
    )
  })
})

describe('field facet: tags: is exact membership (AND), | is any-of', () => {
  const el = (id, tags, fields = {}) => ({ id, concept: 'C', name: id, fields: { ...fields, tags } })
  const ids = (list, q) => nnConsole.filterElements(list, q).map((e) => e.id)

  it('repeated tags: tokens narrow with AND', () => {
    const list = [el('A', ['ai', 'pricing']), el('B', ['ai'])]
    assert.deepEqual(ids(list, 'tags:ai tags:pricing'), ['A'])
    assert.deepEqual(ids(list, 'tags:ai'), ['A', 'B'])
  })

  it('tags: is exact membership, not substring, and case-insensitive', () => {
    const list = [el('R', ['retail']), el('A', ['ai'])]
    assert.deepEqual(ids(list, 'tags:ai'), ['A'])
    assert.deepEqual(ids(list, 'tags:AI'), ['A'])
  })

  it('tags:a|b widens with OR within one token', () => {
    const list = [el('A', ['ai']), el('B', ['pricing']), el('C', ['ops'])]
    assert.deepEqual(ids(list, 'tags:ai|pricing'), ['A', 'B'])
  })

  it('mixes AND and any-of', () => {
    const list = [el('A', ['core', 'ai']), el('B', ['core', 'pricing']), el('C', ['ai'])]
    assert.deepEqual(ids(list, 'tags:core tags:ai|pricing'), ['A', 'B'])
  })

  it('works for any multi-valued field', () => {
    const list = [
      { id: 'A', concept: 'C', name: 'A', fields: { labels: ['x', 'y'] } },
      { id: 'B', concept: 'C', name: 'B', fields: { labels: ['y'] } },
    ]
    assert.deepEqual(ids(list, 'labels:x'), ['A'])
  })

  it('matches inherited concept-level values', () => {
    const list = [
      { id: 'I', concept: 'C', name: 'I', fields: {}, inherited: { tags: { value: ['core'], from: 'C' } } },
    ]
    assert.deepEqual(ids(list, 'tags:core'), ['I'])
  })

  it('a Field named tags IS a facet source', () => {
    const list = [el('F', ['ai'])]
    assert.deepEqual(ids(list, 'tags:ai'), ['F'])
  })

  it('legacy tag: / tag-any: tokens are not special', () => {
    const list = [el('A', ['ai'])]
    assert.deepEqual(ids(list, 'tag:ai'), [], 'no Field named tag')
    assert.deepEqual(ids(list, 'tag-any:ai'), [], 'no Field named tag-any')
  })

  it('an operator with no value constrains nothing while typing', () => {
    const list = [el('A', ['ai']), el('B', ['pricing'])]
    assert.deepEqual(ids(list, 'tags:'), ['A', 'B'])
    assert.deepEqual(ids(list, 'tags:ai tags:'), ['A'])
  })
})

describe('element and dynamic field qualifiers', () => {
  const el = (id, name, fields = {}, relations = []) => ({ id, name, concept: 'Device', fields, relations })
  const ids = (list, q) => nnConsole.filterElements(list, q).map((e) => e.id)

  const items = [
    el('ecto-1', 'Ghost Mobile', { role: 'Interceptor', priority: 5, year: '1984' }),
    el('trap-1', 'Muon Trap', { role: 'Containment', priority: 3, year: '1984' }),
    el('pack-1', 'Proton Pack', { priority: 2, year: '1983' }, [{ field: 'assignedTo', targetLabel: 'Peter' }]),
  ]

  it('filters by element id or name', () => {
    assert.deepEqual(ids(items, 'element:ecto'), ['ecto-1'])
    assert.deepEqual(ids(items, 'element:"Ghost Mobile"'), ['ecto-1'])
    assert.deepEqual(ids(items, 'id:trap-1'), ['trap-1'])
    assert.deepEqual(ids(items, '-element:pack'), ['ecto-1', 'trap-1'])
  })

  it('filters by direct field name and value', () => {
    assert.deepEqual(ids(items, 'role:Interceptor'), ['ecto-1'])
    assert.deepEqual(ids(items, 'role:containment'), ['trap-1'])
    assert.deepEqual(ids(items, '-role:Interceptor'), ['trap-1', 'pack-1'])
  })

  it('filters using field:name=value syntax', () => {
    assert.deepEqual(ids(items, 'field:role=Interceptor'), ['ecto-1'])
    assert.deepEqual(ids(items, 'field:role:Containment'), ['trap-1'])
  })

  it('filters numbers with comparison operators', () => {
    assert.deepEqual(ids(items, 'priority:>3'), ['ecto-1'])
    assert.deepEqual(ids(items, 'priority:>=3'), ['ecto-1', 'trap-1'])
    assert.deepEqual(ids(items, 'priority:<3'), ['pack-1'])
    assert.deepEqual(ids(items, 'priority:<=3'), ['trap-1', 'pack-1'])
  })

  it('resolves field values from relations if field is empty', () => {
    assert.deepEqual(ids(items, 'assignedTo:Peter'), ['pack-1'])
  })

  it('supports negation with both - and ! prefixes', () => {
    assert.deepEqual(ids(items, '!role:Interceptor'), ['trap-1', 'pack-1'])
    assert.deepEqual(ids(items, '-priority:>3'), ['trap-1', 'pack-1'])
  })

  it('supports explicit OR and parentheses grouping (x OR y) AND z', () => {
    // (role:Interceptor OR role:Containment) AND priority:>3 -> only ecto-1 (priority 5, trap-1 is priority 3)
    assert.deepEqual(ids(items, '(role:Interceptor OR role:Containment) AND priority:>3'), ['ecto-1'])
    // role:Interceptor OR role:Containment without priority constraint -> ecto-1, trap-1
    assert.deepEqual(ids(items, 'role:Interceptor OR role:Containment'), ['ecto-1', 'trap-1'])
    // (year:1984 OR year:1983) AND priority:<=3 -> trap-1, pack-1
    assert.deepEqual(ids(items, '(year:1984 OR year:1983) AND priority:<=3'), ['trap-1', 'pack-1'])
  })
})

describe('filter help and field facet values (S4/U4)', () => {
  it('offers a two-step field facet and keeps the AND/OR help on hover', () => {
    const MODEL = {
      meta: { title: 'Rail Lab', modelId: 'rail-lab', modelVersion: 'V_1-0-0' },
      elements: [
        { id: 'a', concept: 'C', name: 'A', fields: { tags: ['ai', 'pricing'] }, hash: '0'.repeat(16) },
      ],
      matrices: [],
    }
    const schema = { concepts: [{ name: 'C', fields: [{ name: 'tags', type: 'select', multiple: true }] }] }
    const { document } = bootConsole({ model: MODEL, schema })
    const toolbar = document.querySelector('.nn-toolbar')
    const host = document.createElement('div')
    host.id = 'nn-filter-facets'
    toolbar.appendChild(host)

    // Two tokens so an AND/OR connector is rendered between them.
    nnConsole.renderFilterBar(
      document,
      { meta: MODEL.meta, elements: MODEL.elements, schema },
      () => {},
      'tags:ai role:Interceptor',
    )

    // The explanation is NOT visible UI any more. It lives on the AND/OR connector's
    // tooltip (a segmented control, asserted in the dedicated test below where two
    // clauses make the connector render).
    assert.equal(document.querySelector('[data-nn-filter-help]'), null, 'no visible help block')
    assert.doesNotMatch(toolbar.textContent || '', /combine with AND/, 'the sentence is out of the UI')

    // Level 1: only the FIELD name. Its values appear only after choosing it.
    const fieldsWrap = Array.from(host.querySelectorAll('.nn-facet-dropdown')).find((w) =>
      /Fields/.test(w.textContent),
    )
    assert.ok(fieldsWrap, 'the Fields facet dropdown')
    const fieldsBtn = fieldsWrap.querySelector('.nn-facet-btn')
    fieldsBtn.dispatchEvent(new document.defaultView.Event('click', { bubbles: true }))
    const firstField = fieldsWrap.querySelector('.nn-facet-menu .nn-facet-item')
    assert.ok(firstField, 'a field row in the first step')
    assert.match(firstField.textContent, /tags/)
    assert.doesNotMatch(host.textContent, /pricing/, 'values are not listed before picking the field')
    firstField.dispatchEvent(new document.defaultView.Event('click', { bubbles: true }))
    assert.match(host.textContent, /ai/, 'the tags value is listed after picking the field')
    assert.match(host.textContent, /pricing/, 'every value of the multi-valued field is listed')
  })

  it('renders the AND/OR segmented control with its tooltip hint and rewrites the query on toggle', () => {
    const MODEL = {
      meta: { title: 'Rail Lab', modelId: 'rail-lab', modelVersion: 'V_1-0-0' },
      elements: [
        { id: 'a', concept: 'C', name: 'A', fields: { tags: ['ai'] }, hash: '0'.repeat(16) },
      ],
      matrices: [],
    }
    const schema = { concepts: [{ name: 'C', fields: [{ name: 'tags', type: 'select', multiple: true }] }] }
    const { document } = bootConsole({ model: MODEL, schema })
    const toolbar = document.querySelector('.nn-toolbar')
    // The connector and the addressed pills live in the active-filters host, which
    // the shell provides but this minimal DOM does not: create it so the connector
    // path (rendered only with >= 2 clauses) runs.
    const facets = document.createElement('div')
    facets.id = 'nn-filter-facets'
    toolbar.appendChild(facets)
    const active = document.createElement('div')
    active.id = 'nn-active-filters'
    toolbar.appendChild(active)

    let nextQuery = null
    nnConsole.renderFilterBar(
      document,
      { meta: MODEL.meta, elements: MODEL.elements, schema },
      (q) => {
        nextQuery = q
      },
      // Two clauses so an AND/OR connector renders between them.
      'tags:ai role:Interceptor',
    )

    const toggle = active.querySelector('.nn-op-toggle')
    assert.ok(toggle, 'the connector is a segmented control (.nn-op-toggle)')
    assert.equal(toggle.getAttribute('role'), 'group', 'the connector is a labelled group')
    assert.match(
      toggle.getAttribute('title') || '',
      /combine with AND/i,
      'the AND/OR explanation lives on the tooltip',
    )
    assert.doesNotMatch(active.textContent || '', /combine with AND/i, 'and not in the visible text')

    const buttons = Array.from(toggle.querySelectorAll('.nn-op-btn'))
    assert.equal(buttons.length, 2, 'one button per connector value')
    assert.equal(toggle.querySelector('.nn-op-btn.active').textContent, 'AND')

    const orBtn = buttons.find((b) => b.textContent === 'OR')
    orBtn.dispatchEvent(new document.defaultView.Event('click', { bubbles: true }))
    assert.equal(nextQuery, '(tags:ai OR role:Interceptor)', 'clicking the opposite option rewrites the query')
  })
})


