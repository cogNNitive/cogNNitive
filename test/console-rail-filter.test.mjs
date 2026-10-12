import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { bootConsole } from './helpers/console-boot.mjs'

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
