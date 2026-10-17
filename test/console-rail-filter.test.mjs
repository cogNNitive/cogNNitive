import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { bootConsole, InnfoConsole } from './helpers/console-boot.mjs'

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
    const search = document.getElementById('innfo-search')
    const cards = () =>
      document.querySelectorAll('#innfo-content [data-innfo-component="element-card"]').length
    const rail = (name) =>
      [...document.querySelectorAll('#innfo-rail [data-concept]')].find(
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

describe('field facet: tags: is exact membership (AND), | is any-of', () => {
  const el = (id, tags, fields = {}) => ({ id, concept: 'C', name: id, fields: { ...fields, tags } })
  const ids = (list, q) => InnfoConsole.filterElements(list, q).map((e) => e.id)

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
  const ids = (list, q) => InnfoConsole.filterElements(list, q).map((e) => e.id)

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


