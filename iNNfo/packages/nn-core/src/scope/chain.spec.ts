import { describe, it, expect } from 'vitest'
import { buildScopeChain } from './chain.js'
import type { DirProbe } from './chain.js'

/**
 * In-memory directory tree: keys are absolute-style directory names, values what a
 * probe would report for that directory. A directory absent from the tree is empty.
 */
type Tree = Record<string, Partial<DirProbe>>

function build(tree: Tree, start: string) {
  const probe = (dir: string): DirProbe => ({
    hasEntrypoint: false,
    scopeMarkers: [],
    ...tree[dir],
  })
  const parentOf = (dir: string): string | null => {
    if (dir === '/') return null
    const i = dir.lastIndexOf('/')
    return i <= 0 ? '/' : dir.slice(0, i)
  }
  return buildScopeChain(start, probe, parentOf)
}

const marker = (path: string, isolate = false) => ({ path, isolate })

const PORTFOLIO: Tree = {
  '/pf': { hasEntrypoint: true },
  '/pf/programs/alpha': { scopeMarkers: [marker('/pf/programs/alpha/alpha_NN.md')] },
  '/pf/programs/alpha/projects/p1': {
    scopeMarkers: [marker('/pf/programs/alpha/projects/p1/p1_NN.md')],
  },
  '/pf/programs/legacy': { scopeMarkers: [marker('/pf/programs/legacy/legacy_NN.md', true)] },
  '/pf/programs/legacy/projects/old': {
    scopeMarkers: [marker('/pf/programs/legacy/projects/old/old_NN.md')],
  },
}

function okChain(result: ReturnType<typeof build>) {
  if (!result.ok) throw new Error(`expected a chain, got ${result.code}`)
  return result.chain
}

describe('buildScopeChain', () => {
  it('returns the chain outermost first for a three-level portfolio', () => {
    const chain = okChain(build(PORTFOLIO, '/pf/programs/alpha/projects/p1'))
    expect(chain.root).toBe('/pf')
    expect(chain.cutAt).toBeNull()
    expect(chain.links).toEqual([
      { dir: '/pf', valuesDoc: null, kind: 'root', isolate: false },
      {
        dir: '/pf/programs/alpha',
        valuesDoc: '/pf/programs/alpha/alpha_NN.md',
        kind: 'scope',
        isolate: false,
      },
      {
        dir: '/pf/programs/alpha/projects/p1',
        valuesDoc: '/pf/programs/alpha/projects/p1/p1_NN.md',
        kind: 'scope',
        isolate: false,
      },
    ])
  })

  it('returns just the root link when the start is the root itself', () => {
    const chain = okChain(build(PORTFOLIO, '/pf'))
    expect(chain.links.map((l) => l.dir)).toEqual(['/pf'])
  })

  it('does not put a folder without a marker in the chain', () => {
    const chain = okChain(build(PORTFOLIO, '/pf/programs/alpha/notes'))
    expect(chain.links.map((l) => l.dir)).toEqual(['/pf', '/pf/programs/alpha'])
  })

  it('carries the values document of a root that holds a scope marker', () => {
    const tree: Tree = { '/pf': { hasEntrypoint: true, scopeMarkers: [marker('/pf/values_NN.md')] } }
    const chain = okChain(build(tree, '/pf/docs'))
    expect(chain.links[0]).toEqual({
      dir: '/pf',
      valuesDoc: '/pf/values_NN.md',
      kind: 'root',
      isolate: false,
    })
  })

  it('reports DUPLICATE_SCOPE_MARKER naming both documents', () => {
    const tree: Tree = {
      ...PORTFOLIO,
      '/pf/programs/delta': {
        scopeMarkers: [marker('/pf/programs/delta/a_NN.md'), marker('/pf/programs/delta/b_NN.md')],
      },
    }
    const result = build(tree, '/pf/programs/delta/docs')
    expect(result).toEqual({
      ok: false,
      code: 'DUPLICATE_SCOPE_MARKER',
      dir: '/pf/programs/delta',
      markers: ['/pf/programs/delta/a_NN.md', '/pf/programs/delta/b_NN.md'],
    })
  })

  it('reports DUPLICATE_SCOPE_MARKER for two markers in the root directory', () => {
    const tree: Tree = {
      '/pf': {
        hasEntrypoint: true,
        scopeMarkers: [marker('/pf/a_NN.md'), marker('/pf/b_NN.md')],
      },
    }
    const result = build(tree, '/pf/docs')
    expect(result).toMatchObject({ ok: false, code: 'DUPLICATE_SCOPE_MARKER', dir: '/pf' })
  })

  it('reports NO_DOMAIN_ROOT with every directory searched, start first', () => {
    const result = build({ '/repo/docs': {} }, '/repo/docs/deep')
    expect(result).toEqual({
      ok: false,
      code: 'NO_DOMAIN_ROOT',
      searched: ['/repo/docs/deep', '/repo/docs', '/repo', '/'],
    })
  })

  it('cuts the chain at an isolated scope and records cutAt', () => {
    const chain = okChain(build(PORTFOLIO, '/pf/programs/legacy/projects/old'))
    expect(chain.links.map((l) => l.dir)).toEqual([
      '/pf/programs/legacy',
      '/pf/programs/legacy/projects/old',
    ])
    expect(chain.links[0].isolate).toBe(true)
    expect(chain.cutAt).toBe('/pf/programs/legacy')
    expect(chain.root).toBe('/pf')
  })

  it('leaves the chain of a sibling of an isolated scope untouched', () => {
    const chain = okChain(build(PORTFOLIO, '/pf/programs/alpha/projects/p1'))
    expect(chain.links[0].dir).toBe('/pf')
    expect(chain.cutAt).toBeNull()
  })

  it('ignores a directory with two markers when it lies above an isolated scope', () => {
    const tree: Tree = {
      '/pf': { hasEntrypoint: true, scopeMarkers: [marker('/pf/a_NN.md'), marker('/pf/b_NN.md')] },
      '/pf/legacy': { scopeMarkers: [marker('/pf/legacy/l_NN.md', true)] },
    }
    const chain = okChain(build(tree, '/pf/legacy/docs'))
    expect(chain.links.map((l) => l.dir)).toEqual(['/pf/legacy'])
  })

  it('still reports a miss when an isolated scope has no domaiNN root above it', () => {
    const tree: Tree = { '/x/legacy': { scopeMarkers: [marker('/x/legacy/l_NN.md', true)] } }
    const result = build(tree, '/x/legacy/docs')
    expect(result).toMatchObject({ ok: false, code: 'NO_DOMAIN_ROOT' })
  })

  it('treats a nested domaiNN as its own root and never reaches the outer one', () => {
    const tree: Tree = {
      '/outer': { hasEntrypoint: true, scopeMarkers: [marker('/outer/o_NN.md')] },
      '/outer/vendor/inner': { hasEntrypoint: true },
    }
    const chain = okChain(build(tree, '/outer/vendor/inner/docs'))
    expect(chain.root).toBe('/outer/vendor/inner')
    expect(chain.links.map((l) => l.dir)).toEqual(['/outer/vendor/inner'])
  })
})
