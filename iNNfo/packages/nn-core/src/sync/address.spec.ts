import { describe, it, expect } from 'vitest'
import { parseMirrorAddress, SYNC_DIR } from './address.js'

describe('parseMirrorAddress', () => {
  it('exposes the mirror folder', () => {
    expect(SYNC_DIR).toBe('sources/sync')
  })

  it('parses an element address', () => {
    expect(parseMirrorAddress('sources/sync/org/organization_NN.md@gerente')).toEqual({
      alias: 'org',
      path: 'organization_NN.md',
      unit: { kind: 'element', slug: 'gerente' },
    })
  })

  it('parses a field unit and a nested origin path', () => {
    expect(parseMirrorAddress('sources/sync/org/teams/ops_NN.md@gerente&name')).toEqual({
      alias: 'org',
      path: 'teams/ops_NN.md',
      unit: { kind: 'element', slug: 'gerente', field: 'name' },
    })
  })

  it('parses a body unit', () => {
    expect(parseMirrorAddress('sources/sync/org/organization_NN.md@gerente&#body')?.unit).toEqual({
      kind: 'body',
      slug: 'gerente',
    })
  })

  it.each([
    ['parent traversal', 'sources/sync/org/../x_NN.md@a'],
    ['missing unit', 'sources/sync/org/organization_NN.md'],
    ['matrix unit', 'sources/sync/org/organization_NN.md@matrix:raci'],
    ['cell unit', 'sources/sync/org/organization_NN.md@m&r&c'],
    ['concept unit', 'sources/sync/org/organization_NN.md@concept:Role'],
    ['outside the mirror folder', 'sources/import/org/organization_NN.md@gerente'],
    ['no alias', 'sources/sync/organization_NN.md@gerente'],
    ['non-model file', 'sources/sync/org/report.pdf@gerente'],
    ['empty', ''],
  ])('rejects %s', (_label, raw) => {
    expect(parseMirrorAddress(raw)).toBeNull()
  })
})
