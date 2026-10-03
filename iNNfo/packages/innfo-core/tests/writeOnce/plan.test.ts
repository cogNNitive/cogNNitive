import { describe, it, expect } from 'vitest'
import { latestOfFamily, planGc, type FamilyMember } from '../../src/writeOnce/plan.js'

const m = (path: string, sha256?: string): FamilyMember => (sha256 ? { path, sha256 } : { path })

describe('latestOfFamily', () => {
  it('returns undefined for an empty family', () => {
    expect(latestOfFamily([])).toBeUndefined()
  })

  it('resolves the latest member from names, not from input order', () => {
    const members = [
      m('artifacts/x_20261003T080000Z.csv'),
      m('artifacts/x.csv'),
      m('artifacts/x_20261002T101500Z.csv'),
    ]
    expect(latestOfFamily(members)?.path).toBe('artifacts/x_20261003T080000Z.csv')
  })

  it('compares tie-break numbers numerically (-10 after -2)', () => {
    const members = [
      m('a/x_20261002T101500Z-10.md'),
      m('a/x_20261002T101500Z-2.md'),
      m('a/x_20261002T101500Z.md'),
    ]
    expect(latestOfFamily(members)?.path).toBe('a/x_20261002T101500Z-10.md')
  })

  it('treats an unsuffixed member as the oldest', () => {
    expect(latestOfFamily([m('x.csv'), m('x_20261002T101500Z.csv')])?.path).toBe('x_20261002T101500Z.csv')
    expect(latestOfFamily([m('x.csv')])?.path).toBe('x.csv')
  })

  it('keeps the member payload (sha256) untouched', () => {
    const latest = latestOfFamily([m('x_20261002T101500Z.csv', 'abc'), m('x.csv', 'def')])
    expect(latest).toEqual({ path: 'x_20261002T101500Z.csv', sha256: 'abc' })
  })
})

describe('planGc', () => {
  const family = [
    m('artifacts/r.md'),
    m('artifacts/r_20261001T000000Z.md'),
    m('artifacts/r_20261002T000000Z.md'),
  ]

  it('proposes non-latest uncited members, sorted', () => {
    const { candidates } = planGc({ families: [family], citedPaths: new Set() })
    expect(candidates).toEqual(['artifacts/r.md', 'artifacts/r_20261001T000000Z.md'])
  })

  it('never proposes a cited member', () => {
    const { candidates } = planGc({
      families: [family],
      citedPaths: new Set(['artifacts/r_20261001T000000Z.md']),
    })
    expect(candidates).toEqual(['artifacts/r.md'])
  })

  it('never proposes the latest member, cited or not', () => {
    const { candidates } = planGc({ families: [family], citedPaths: new Set() })
    expect(candidates).not.toContain('artifacts/r_20261002T000000Z.md')
  })

  it('counts a citation of the sidecar as a citation of its subject', () => {
    const { candidates } = planGc({
      families: [family],
      citedPaths: new Set(['artifacts/r.md_sidecar_NN.md']),
    })
    expect(candidates).toEqual(['artifacts/r_20261001T000000Z.md'])
  })

  it('is deterministic regardless of family and member order', () => {
    const other = [m('b/z_20261001T000000Z.pdf'), m('b/z_20261002T000000Z.pdf')]
    const a = planGc({ families: [family, other], citedPaths: new Set() })
    const b = planGc({ families: [[...other].reverse(), [...family].reverse()], citedPaths: new Set() })
    expect(a).toEqual(b)
    expect(a.candidates).toEqual([
      'artifacts/r.md',
      'artifacts/r_20261001T000000Z.md',
      'b/z_20261001T000000Z.pdf',
    ])
  })

  it('exempts the lineage record and other _NN documents', () => {
    const record = [m('kNNowledge/Acme_cogNNitive_NN.md'), m('kNNowledge/Other_cogNNitive_NN.md')]
    const { candidates } = planGc({ families: [record], citedPaths: new Set() })
    expect(candidates).toEqual([])
  })

  it('proposes nothing for a single-member family', () => {
    expect(planGc({ families: [[m('only.md')]], citedPaths: new Set() }).candidates).toEqual([])
  })
})

describe('entry points', () => {
  it('the browser entry carries the pure plan but never the fs adapter', async () => {
    const browser = await import('../../src/browser.js')
    expect(browser).toHaveProperty('latestOfFamily')
    expect(browser).toHaveProperty('planGc')
    expect(browser).not.toHaveProperty('writeOnce')
    expect(browser).not.toHaveProperty('applyGc')
  })

  it('the node entry carries both', async () => {
    const node = await import('../../src/index.js')
    for (const name of ['latestOfFamily', 'planGc', 'writeOnce', 'applyGc']) expect(node).toHaveProperty(name)
  })
})
