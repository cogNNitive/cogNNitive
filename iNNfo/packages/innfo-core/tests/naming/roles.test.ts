import { describe, it, expect } from 'vitest'
import { roleOf, isExcludedPath, familyOf, compareMembers } from '../../src/naming/contract.js'

describe('roleOf', () => {
  it('derives structural roles from the basename', () => {
    expect(roleOf({ path: 'domaiNN_NN.md' })).toBe('entrypoint')
    expect(roleOf({ path: 'specs/bluepriNNts/sidecar/spec_NN.md' })).toBe('spec')
  })

  it('returns sidecar regardless of folder, level, or parent_spec', () => {
    expect(roleOf({ path: 'sources/import/prices.csv_sidecar_NN.md' })).toBe('sidecar')
    expect(roleOf({ path: 'kNNowledge/prices.csv_sidecar_NN.md', parentSpecName: 'business' })).toBe('sidecar')
  })

  it('maps catalog and record blueprints to their roles', () => {
    expect(roleOf({ path: 'x/Acme_cogNNitive_NN.md', parentSpecName: 'cogNNitive' })).toBe('lineage-record')
    expect(roleOf({ path: 'sources/sources_NN.md', parentSpecName: 'sources' })).toBe('catalog')
    expect(roleOf({ path: 'artifacts_NN.md', parentSpecName: 'artifacts' })).toBe('catalog')
    expect(roleOf({ path: 'workspace_NN.md', parentSpecName: 'workspace' })).toBe('catalog')
    expect(roleOf({ path: 'procedures/procedures_NN.md', parentSpecName: 'procedures' })).toBe('catalog')
  })

  it('treats a procedures document that is not the catalog as a procedure', () => {
    expect(roleOf({ path: 'procedures/generate_video_script_procedures_NN.md', parentSpecName: 'procedures' })).toBe(
      'procedure',
    )
  })

  it('treats any other _NN.md document as knowledge', () => {
    expect(roleOf({ path: 'kNNowledge/Client_business_NN.md', parentSpecName: 'business' })).toBe('knowledge')
    expect(roleOf({ path: 'kNNowledge/Client_business_NN.md' })).toBe('knowledge')
  })

  it('is folder-blind: same bytes, same role in any folder', () => {
    expect(roleOf({ path: 'sources/import/report.md' })).toBe('artifact')
    expect(roleOf({ path: 'artifacts/report.md' })).toBe('artifact')
    expect(roleOf({ path: 'anywhere/at/all/report.md' })).toBe('artifact')
  })

  it('cognitivizing changes the role without moving the file', () => {
    const path = 'artifacts/Market_Analysis_20261002T101500Z.md'
    expect(roleOf({ path })).toBe('artifact')
    expect(roleOf({ path, hasSidecar: true })).toBe('source')
  })

  it('tolerates backslash paths', () => {
    expect(roleOf({ path: 'sources\\import\\prices.csv_sidecar_NN.md' })).toBe('sidecar')
  })
})

describe('isExcludedPath', () => {
  it('excludes the ignored workspace roots', () => {
    expect(isExcludedPath('backups/a.md')).toBe(true)
    expect(isExcludedPath('archive/a.md')).toBe(true)
    expect(isExcludedPath('specs/a.md')).toBe(true)
  })

  it('excludes roots only at the first segment', () => {
    expect(isExcludedPath('sources/archive/a.md')).toBe(false)
    expect(isExcludedPath('kNNowledge/specs/a_NN.md')).toBe(false)
  })

  it('excludes any staging segment', () => {
    expect(isExcludedPath('staging/a.md')).toBe(true)
    expect(isExcludedPath('sources/import/staging/a.md')).toBe(true)
  })

  it('excludes dot-prefixed segments but not ./ or ../ navigation', () => {
    expect(isExcludedPath('.cogNNitive/a.md')).toBe(true)
    expect(isExcludedPath('a/.hidden/b.md')).toBe(true)
    expect(isExcludedPath('./kNNowledge/a_NN.md')).toBe(false)
  })

  it('includes ordinary paths and tolerates backslashes', () => {
    expect(isExcludedPath('kNNowledge/Client_business_NN.md')).toBe(false)
    expect(isExcludedPath('staging\\a.md')).toBe(true)
  })
})

describe('familyOf', () => {
  it('keys a family by (dir, key, ext)', () => {
    expect(familyOf('artifacts/balance_2026_20261002T101500Z.csv')).toEqual({
      dir: 'artifacts',
      key: 'balance_2026',
      ext: 'csv',
    })
    expect(familyOf('balance_2026.csv')).toEqual({ dir: '', key: 'balance_2026', ext: 'csv' })
  })

  it('separates same key across extensions and folders', () => {
    expect(familyOf('a/report.pdf')).not.toEqual(familyOf('a/report.docx'))
    expect(familyOf('a/report.pdf')).not.toEqual(familyOf('b/report.pdf'))
  })

  it('returns null for _NN.md documents', () => {
    expect(familyOf('kNNowledge/Client_business_NN.md')).toBeNull()
    expect(familyOf('x/report.pdf_sidecar_NN.md')).toBeNull()
  })
})

describe('compareMembers', () => {
  const order = (names: string[]) => [...names].sort(compareMembers)

  it('sorts the unsuffixed member first, then by stamp, then numeric seq', () => {
    const expected = [
      'report.md',
      'report_20261002T101500Z.md',
      'report_20261002T101500Z-2.md',
      'report_20261002T101500Z-10.md',
      'report_20261002T101501Z.md',
    ]
    expect(order([...expected].reverse())).toEqual(expected)
  })

  it('orders -2 before -10 (numeric, not lexical)', () => {
    expect(compareMembers('r_20261002T101500Z-2.md', 'r_20261002T101500Z-10.md')).toBeLessThan(0)
  })

  it('ignores the directory part and compares names only', () => {
    expect(compareMembers('a/r_20261002T101500Z.md', 'z/r_20261002T101501Z.md')).toBeLessThan(0)
  })

  it('returns 0 for equal names', () => {
    expect(compareMembers('r_20261002T101500Z.md', 'r_20261002T101500Z.md')).toBe(0)
  })
})
