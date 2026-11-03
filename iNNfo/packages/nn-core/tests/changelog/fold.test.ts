import { describe, it, expect } from 'vitest'
import { buildChangeLogFromChangesets } from '../../src/changelog/load.js'
import type { ChangeLike, ChangesetLike } from '../../src/changelog/load.js'
import type { UnitState } from '../../src/changelog/units.js'

/**
 * change-provenance A4: the fold rule table.
 *
 * One case per row: add_element (alive, no units), update_field, prose/concept/
 * cell updates, rename_element relink, rename_concept rekey, remove_element and
 * remove_matrix tombstones, epoch reuse, non-applied ignored, produce_artifact.
 */

let stamp = 0
function logOf(changesets: Array<{ status?: string; changes: Array<Partial<ChangeLike> & Pick<ChangeLike, 'id' | 'op' | 'target'>> }>) {
  const records: ChangesetLike[] = changesets.map((cs) => {
    stamp += 1
    return {
      path: `changes/t_20260101T0000${String(stamp).padStart(2, '0')}Z_changes_NN.md`,
      status: cs.status ?? 'applied',
      author: 'agent',
      changes: cs.changes,
    }
  })
  return buildChangeLogFromChangesets(records)
}

const unitsOf = (log: ReturnType<typeof logOf>, model = 'm'): UnitState[] => [...log.units(model)]

describe('fold: elements and fields', () => {
  it('add_element marks the element alive with no units', () => {
    const log = logOf([
      { changes: [{ id: 'c-01', op: 'add_element', target: 'm@Grow', name: 'Grow', resolved_target: 'm@grow' }] },
    ])
    expect(unitsOf(log)).toEqual([])
    expect(log.elementOrigin('m@grow')?.id).toBe('c-01')
    expect(log.origin('m@grow&owner')).toBeUndefined()
  })

  it('update_field sets the unit value; an empty to removes the unit', () => {
    const log = logOf([
      {
        changes: [
          { id: 'c-01', op: 'update_field', target: 'm@grow&owner', to: 'Ana', resolved_target: 'm@grow&owner' },
          { id: 'c-02', op: 'update_field', target: 'm@grow&amount', to: '5', resolved_target: 'm@grow&amount' },
        ],
      },
      {
        changes: [{ id: 'c-03', op: 'update_field', target: 'm@grow&owner', to: '', resolved_target: 'm@grow&owner' }],
      },
    ])
    const units = unitsOf(log)
    expect(units.map((u) => u.key)).toEqual(['m@grow&amount'])
    // Serialized form absorbs the number typing.
    expect(units[0]).toMatchObject({ kind: 'field', value: '5' })
    expect(log.origin('m@grow&owner')).toBeUndefined()
  })

  it('prose, concept and cell units use to; an empty body/cell equals absent', () => {
    const log = logOf([
      {
        changes: [
          { id: 'c-01', op: 'update_element_text', target: 'm@grow', to: 'Prose', resolved_target: 'm@grow&#body' },
          { id: 'c-02', op: 'update_concept_text', target: 'm@concept:Goal', to: 'Concept prose', resolved_target: 'm@concept:Goal' },
          { id: 'c-03', op: 'update_concept_field', target: 'm@concept:Goal&color', to: 'blue', resolved_target: 'm@concept:Goal&color' },
          { id: 'c-04', op: 'update_matrix_cell', target: 'm@risk&a&b', to: 'High', resolved_target: 'm@risk&a&b' },
        ],
      },
      {
        changes: [{ id: 'c-05', op: 'update_element_text', target: 'm@grow', to: '', resolved_target: 'm@grow&#body' }],
      },
    ])
    const byKey = new Map(unitsOf(log).map((u) => [u.key, u]))
    expect(byKey.get('m@grow&#body')).toBeUndefined()
    expect(byKey.get('m@concept:Goal')).toMatchObject({ kind: 'concept', value: 'Concept prose' })
    expect(byKey.get('m@concept:Goal&color')).toMatchObject({ kind: 'concept', value: 'blue' })
    expect(byKey.get('m@risk&a&b')).toMatchObject({ kind: 'cell', value: 'High' })
  })

  it('ignores non-applied changes', () => {
    const log = logOf([
      {
        status: 'proposed',
        changes: [{ id: 'c-01', op: 'update_field', target: 'm@grow&owner', to: 'Ana', resolved_target: 'm@grow&owner' }],
      },
    ])
    expect(unitsOf(log)).toEqual([])
  })
})

describe('fold: rename_element relinks', () => {
  it('relinks wikilinks in fields and bodies, keeps the origin and does not touch cells', () => {
    const log = logOf([
      {
        changes: [
          { id: 'c-01', op: 'update_field', target: 'm@grow&owner', to: '[[Alpha]] owns it', resolved_target: 'm@grow&owner' },
          { id: 'c-02', op: 'update_element_text', target: 'm@grow', to: 'See [[Alpha]].', resolved_target: 'm@grow&#body' },
          { id: 'c-03', op: 'update_matrix_cell', target: 'm@risk&alpha&beta', to: '[[Alpha]]', resolved_target: 'm@risk&alpha&beta' },
        ],
      },
      {
        changes: [{ id: 'c-04', op: 'rename_element', target: 'm@alpha', name: 'Beta', from: 'Alpha', resolved_target: 'm@alpha' }],
      },
    ])
    const byKey = new Map(unitsOf(log).map((u) => [u.key, u]))
    expect(byKey.get('m@grow&owner')?.value).toBe('[[Beta]] owns it')
    expect(byKey.get('m@grow&owner')?.origin.id).toBe('c-01')
    expect(byKey.get('m@grow&#body')?.value).toBe('See [[Beta]].')
    // Cell values are not relinked (mutate.ts rename pass).
    expect(byKey.get('m@risk&alpha&beta')?.value).toBe('[[Alpha]]')
    expect(byKey.get('m@grow&owner')?.relinks.map((r) => r.to)).toEqual(['Beta'])
  })

  it('relinks bare reference values with updateReferenceString', () => {
    const log = logOf([
      {
        changes: [
          { id: 'c-01', op: 'update_field', target: 'm@grow&owner', to: 'Alpha', resolved_target: 'm@grow&owner' },
        ],
      },
      {
        changes: [{ id: 'c-02', op: 'rename_element', target: 'm@alpha', name: 'Beta', from: 'Alpha', resolved_target: 'm@alpha' }],
      },
    ])
    expect(unitsOf(log)[0].value).toBe('Beta')
  })
})

describe('fold: rename_concept', () => {
  it('rekeys concept units and relinks concept definition fields', () => {
    const log = logOf([
      {
        changes: [
          { id: 'c-01', op: 'update_concept_text', target: 'm@concept:Goal', to: 'About [[Goal]]', resolved_target: 'm@concept:Goal' },
          { id: 'c-02', op: 'update_concept_field', target: 'm@concept:Goal&source', to: '[[Goal]]', resolved_target: 'm@concept:Goal&source' },
        ],
      },
      {
        changes: [{ id: 'c-03', op: 'rename_concept', target: 'm@concept:Goal', name: 'Objective', resolved_target: 'm@concept:Goal' }],
      },
    ])
    const byKey = new Map(unitsOf(log).map((u) => [u.key, u]))
    expect(byKey.has('m@concept:Goal')).toBe(false)
    expect(byKey.get('m@concept:Objective')?.value).toBe('About [[Objective]]')
    expect(byKey.get('m@concept:Objective&source')?.value).toBe('[[Objective]]')
  })
})

describe('fold: removal and epoch cut', () => {
  it('remove_element tombstones its units and every cell on its row or column', () => {
    const log = logOf([
      {
        changes: [
          { id: 'c-01', op: 'update_field', target: 'm@grow&owner', to: 'Ana', resolved_target: 'm@grow&owner' },
          { id: 'c-02', op: 'update_matrix_cell', target: 'm@risk&grow&beta', to: 'High', resolved_target: 'm@risk&grow&beta' },
          { id: 'c-03', op: 'update_matrix_cell', target: 'm@risk&alpha&grow', to: 'Low', resolved_target: 'm@risk&alpha&grow' },
          { id: 'c-04', op: 'update_matrix_cell', target: 'm@risk&alpha&beta', to: 'Mid', resolved_target: 'm@risk&alpha&beta' },
        ],
      },
      {
        changes: [{ id: 'c-05', op: 'remove_element', target: 'm@grow', name: 'Grow', resolved_target: 'm@grow' }],
      },
    ])
    expect(unitsOf(log).map((u) => u.key)).toEqual(['m@risk&alpha&beta'])
    const tombstones = log.tombstones
    expect(tombstones.map((t) => t.id)).toEqual(['c-05'])
    expect(log.elementOrigin('m@grow')?.id).toBe('c-05')
  })

  it('remove_matrix tombstones every cell of that matrix', () => {
    const log = logOf([
      {
        changes: [
          { id: 'c-01', op: 'update_matrix_cell', target: 'm@risk&a&b', to: 'High', resolved_target: 'm@risk&a&b' },
          { id: 'c-02', op: 'update_matrix_cell', target: 'm@other&a&b', to: 'Low', resolved_target: 'm@other&a&b' },
        ],
      },
      {
        changes: [{ id: 'c-03', op: 'remove_matrix', target: 'm@matrix:risk', name: 'risk', resolved_target: 'm@risk' }],
      },
    ])
    expect(unitsOf(log).map((u) => u.key)).toEqual(['m@other&a&b'])
    expect(log.tombstones.map((t) => t.id)).toEqual(['c-03'])
  })

  it('epoch cut: a later add_element with the same slug starts with no units and no history', () => {
    const log = logOf([
      {
        changes: [
          { id: 'c-01', op: 'update_field', target: 'm@grow&owner', to: 'Ana', resolved_target: 'm@grow&owner' },
          { id: 'c-02', op: 'remove_element', target: 'm@grow', name: 'Grow', resolved_target: 'm@grow' },
          { id: 'c-03', op: 'add_element', target: 'm@Grow2', name: 'Grow2', resolved_target: 'm@grow' },
        ],
      },
    ])
    expect(unitsOf(log)).toEqual([])
    expect(log.history('m@grow&owner')).toEqual([])
    expect(log.elementOrigin('m@grow')?.id).toBe('c-03')
  })
})

describe('fold: move_model rekeys the identity (distributed-storage S6b)', () => {
  it('re-keys units and element origins, and history follows the chain', () => {
    const log = logOf([
      {
        changes: [
          { id: 'c-01', op: 'add_element', target: 'innteresante/intro@Video', name: 'Intro', resolved_target: 'innteresante/intro@intro' },
          { id: 'c-02', op: 'update_field', target: 'innteresante/intro@intro&title', to: 'Intro', resolved_target: 'innteresante/intro@intro&title' },
        ],
      },
      { changes: [{ id: 'c-03', op: 'move_model', target: 'innteresante/intro', to: 'villabotijos-today/intro' }] },
      {
        changes: [
          { id: 'c-04', op: 'update_field', target: 'villabotijos-today/intro@intro&title', to: 'Intro v2', resolved_target: 'villabotijos-today/intro@intro&title' },
        ],
      },
    ])

    const units = [...log.units('villabotijos-today/intro')]
    expect(units.map((u) => u.key)).toEqual(['villabotijos-today/intro@intro&title'])
    expect(units[0]!.value).toBe('Intro v2')
    // The old id no longer owns a unit: the fold re-keyed it.
    expect([...log.units('innteresante/intro')]).toEqual([])
    expect(log.elementOrigin('villabotijos-today/intro@intro')?.id).toBe('c-01')

    // Both the old and the new address resolve to the full chain.
    expect(log.history('villabotijos-today/intro@intro&title').map((c) => c.id)).toEqual(['c-02', 'c-04'])
    expect(log.history('innteresante/intro@intro&title').map((c) => c.id)).toEqual(['c-02', 'c-04'])
    expect(log.identities('villabotijos-today/intro')).toEqual(['innteresante/intro'])
  })

  it('maps old@old-slug units to new@new-slug when the slug changes', () => {
    const log = logOf([
      {
        changes: [
          { id: 'c-01', op: 'add_element', target: 'innteresante/intro@Video', name: 'Intro', resolved_target: 'innteresante/intro@intro' },
          { id: 'c-02', op: 'update_field', target: 'innteresante/intro@intro&title', to: 'Intro', resolved_target: 'innteresante/intro@intro&title' },
        ],
      },
      { changes: [{ id: 'c-03', op: 'move_model', target: 'innteresante/intro', to: 'innteresante/welcome' }] },
    ])

    const units = [...log.units('innteresante/welcome')]
    expect(units.map((u) => u.key)).toEqual(['innteresante/welcome@welcome&title'])
    // The root element slug changed with the model slug; the old key is gone.
    expect([...log.units('innteresante/intro')]).toEqual([])
    expect(log.history('innteresante/welcome@welcome&title').map((c) => c.id)).toEqual(['c-02'])
    expect(log.history('innteresante/intro@intro&title').map((c) => c.id)).toEqual(['c-02'])
  })

  it('rewrites the prefix of descendant instances and re-keys tombstones', () => {
    const log = logOf([
      {
        changes: [
          { id: 'c-01', op: 'update_field', target: 'innteresante/intro@00-gancho&voice', to: 'warm', resolved_target: 'innteresante/intro@00-gancho&voice' },
          { id: 'c-02', op: 'remove_element', target: 'innteresante/old', name: 'Old', resolved_target: 'innteresante/old' },
        ],
      },
      { changes: [{ id: 'c-03', op: 'move_model', target: 'innteresante', to: 'villabotijos-today' }] },
    ])

    expect([...log.units('villabotijos-today/intro')].map((u) => u.key)).toEqual([
      'villabotijos-today/intro@00-gancho&voice',
    ])
    const tombstone = log.tombstones[0]!
    expect(tombstone.resolvedTarget ?? tombstone.target).toBe('villabotijos-today/old')
  })

  it('identities returns the former ids oldest first, and an unmoved id has none', () => {
    const log = logOf([
      { changes: [{ id: 'c-01', op: 'move_model', target: 'a', to: 'b' }] },
      { changes: [{ id: 'c-02', op: 'move_model', target: 'b', to: 'c' }] },
    ])
    expect(log.identities('c')).toEqual(['a', 'b'])
    expect(log.identities('b')).toEqual(['a'])
    expect(log.identities('a')).toEqual([])
    expect(log.identities('unrelated')).toEqual([])
  })
})

describe('fold: artifacts', () => {
  it('produce_artifact is an artifact unit, not a model unit', () => {
    const log = logOf([
      {
        changes: [
          { id: 'c-01', op: 'produce_artifact', target: 'artifacts/r_20261002T101500Z.md', resolved_target: 'artifacts/r_20261002T101500Z.md' },
        ],
      },
    ])
    expect(unitsOf(log, 'm')).toEqual([])
    const all = [...log.units()]
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({ key: 'artifacts/r_20261002T101500Z.md', kind: 'artifact' })
  })
})
