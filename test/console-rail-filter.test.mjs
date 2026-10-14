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

describe('tag facet: tag: is AND + exact, tag-any: is OR', () => {
  const el = (id, tags, fields = {}) => ({ id, concept: 'C', name: id, fields, tags })
  const ids = (list, q) => InnfoConsole.filterElements(list, q).map((e) => e.id)

  it('tag: tokens narrow with AND', () => {
    const list = [el('A', ['ai', 'pricing']), el('B', ['ai'])]
    assert.deepEqual(ids(list, 'tag:ai tag:pricing'), ['A'])
    assert.deepEqual(ids(list, 'tag:ai'), ['A', 'B'])
  })

  it('tag: is exact, not a substring, and case-insensitive', () => {
    const list = [el('R', ['retail']), el('A', ['ai'])]
    assert.deepEqual(ids(list, 'tag:ai'), ['A'])
    assert.deepEqual(ids(list, 'tag:AI'), ['A'])
  })

  it('tag-any: widens with OR', () => {
    const list = [el('A', ['ai']), el('B', ['pricing']), el('C', ['ops'])]
    assert.deepEqual(ids(list, 'tag-any:ai tag-any:pricing'), ['A', 'B'])
  })

  it('mixes AND and OR groups', () => {
    const list = [el('A', ['core', 'ai']), el('B', ['core', 'pricing']), el('C', ['ai'])]
    assert.deepEqual(ids(list, 'tag:core tag-any:ai tag-any:pricing'), ['A', 'B'])
  })

  it('a field named tags is not a tag source', () => {
    const list = [{ id: 'F', concept: 'C', name: 'F', fields: { tags: 'ai' }, tags: [] }]
    assert.deepEqual(ids(list, 'tag:ai'), [])
    assert.deepEqual(ids(list, 'tag-any:ai'), [])
    assert.deepEqual(ids(list, 'ai'), ['F'], 'full-text search still finds the value')
  })
})
