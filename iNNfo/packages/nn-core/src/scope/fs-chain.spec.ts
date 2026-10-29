import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { findScopeChain, findInChain } from './fs-chain.js'
import { findDomainRoot } from './root.js'
import type { ScopeChain } from './types.js'

const FIX = fileURLToPath(new URL('../../tests/fixtures/scoped-portfolio', import.meta.url))

function chainOf(path: string): ScopeChain {
  const result = findScopeChain(path)
  if (!result.ok) throw new Error(`expected a chain for ${path}, got ${result.code}`)
  return result.chain
}

describe('findScopeChain over the scoped-portfolio fixture', () => {
  it('returns the three-level chain, domain-relative, root first', () => {
    const chain = chainOf(join(FIX, 'programs', 'alpha', 'projects', 'p1', 'risks_NN.md'))
    expect(chain.root).toBe(FIX)
    expect(chain.cutAt).toBeNull()
    expect(chain.links).toEqual([
      { dir: '', valuesDoc: 'portfolio_settings_NN.md', kind: 'root', isolate: false },
      {
        dir: 'programs/alpha',
        valuesDoc: 'programs/alpha/alpha_NN.md',
        kind: 'scope',
        isolate: false,
      },
      {
        dir: 'programs/alpha/projects/p1',
        valuesDoc: 'programs/alpha/projects/p1/p1_NN.md',
        kind: 'scope',
        isolate: false,
      },
    ])
  })

  it('agrees with findDomainRoot on the root', () => {
    const start = join(FIX, 'programs', 'beta', 'status_NN.md')
    expect(chainOf(start).root).toBe(findDomainRoot(start))
  })

  it('skips a folder without a marker', () => {
    const chain = chainOf(join(FIX, 'programs', 'alpha', 'notes', 'notes_NN.md'))
    expect(chain.links.map((l) => l.dir)).toEqual(['', 'programs/alpha'])
  })

  it('does not treat `scope: "yes"` as a scope', () => {
    const chain = chainOf(join(FIX, 'programs', 'gamma', 'gamma_NN.md'))
    expect(chain.links.map((l) => l.dir)).toEqual([''])
  })

  it('lets a tag naming another program create no parent', () => {
    const tagged = chainOf(join(FIX, 'programs', 'alpha', 'tagged_NN.md'))
    const sibling = chainOf(join(FIX, 'programs', 'alpha', 'status_NN.md'))
    expect(tagged.links.map((l) => l.dir)).toEqual(['', 'programs/alpha'])
    expect(tagged).toEqual(sibling)
  })

  it('names both documents when a directory holds two markers', () => {
    const result = findScopeChain(join(FIX, 'programs', 'delta', 'a_NN.md'))
    expect(result).toEqual({
      ok: false,
      code: 'DUPLICATE_SCOPE_MARKER',
      dir: 'programs/delta',
      markers: ['programs/delta/a_NN.md', 'programs/delta/b_NN.md'],
    })
  })

  it('cuts the chain at an isolated scope and keeps the sibling program whole', () => {
    const cut = chainOf(join(FIX, 'programs', 'legacy', 'projects', 'old', 'old_NN.md'))
    expect(cut.links.map((l) => l.dir)).toEqual(['programs/legacy', 'programs/legacy/projects/old'])
    expect(cut.cutAt).toBe('programs/legacy')
    expect(cut.links[0].isolate).toBe(true)
    expect(cut.root).toBe(FIX)

    const sibling = chainOf(join(FIX, 'programs', 'beta', 'beta_NN.md'))
    expect(sibling.links.map((l) => l.dir)).toEqual(['', 'programs/beta'])
    expect(sibling.cutAt).toBeNull()
  })

  it('makes a nested domaiNN its own root', () => {
    const chain = chainOf(join(FIX, 'vendor', 'inner', 'docs', 'a_NN.md'))
    expect(chain.root).toBe(join(FIX, 'vendor', 'inner'))
    expect(chain.links).toEqual([
      { dir: '', valuesDoc: 'inner_settings_NN.md', kind: 'root', isolate: false },
    ])
  })
})

describe('findScopeChain over a temporary tree', () => {
  let base: string

  beforeEach(() => {
    base = realpathSync(mkdtempSync(join(tmpdir(), 'nn-scope-chain-')))
  })
  afterEach(() => {
    rmSync(base, { recursive: true, force: true })
  })

  function write(rel: string, content: string): string {
    const path = join(base, rel)
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, content, 'utf-8')
    return path
  }
  const marker = (flags: string) => `---\nlevel: 3\ntitle: "m"\n${flags}---\n# NN Settings\n`

  it('works with no .git anywhere and ignores a .git above the root', () => {
    mkdirSync(join(base, '.git'), { recursive: true })
    write('acme/domaiNN_NN.md', '# acme\n')
    const doc = write('acme/docs/a_NN.md', '# NN Note\n')
    const chain = chainOf(doc)
    expect(chain.root).toBe(join(base, 'acme'))
    expect(chain.links.map((l) => l.dir)).toEqual([''])
  })

  it('reports NO_DOMAIN_ROOT listing the directories searched, start first', () => {
    mkdirSync(join(base, 'repo', '.git'), { recursive: true })
    const doc = write('repo/docs/a_NN.md', '# NN Note\n')
    const result = findScopeChain(doc)
    expect(result.ok).toBe(false)
    if (result.ok || result.code !== 'NO_DOMAIN_ROOT') throw new Error('expected NO_DOMAIN_ROOT')
    expect(result.searched.slice(0, 3)).toEqual([
      join(base, 'repo', 'docs'),
      join(base, 'repo'),
      base,
    ])
  })

  it('only counts a `_NN.md` kNNowledge document as a marker', () => {
    write('acme/domaiNN_NN.md', '# acme\n')
    write('acme/prog/notes.md', marker('scope: true\n'))
    const doc = write('acme/prog/a_NN.md', '# NN Note\n')
    expect(chainOf(doc).links.map((l) => l.dir)).toEqual([''])
  })

  it('requires isolate to be the boolean true', () => {
    write('acme/domaiNN_NN.md', '# acme\n')
    write('acme/prog/p_NN.md', marker('scope: true\nisolate: "true"\n'))
    const chain = chainOf(write('acme/prog/a_NN.md', '# NN Note\n'))
    expect(chain.cutAt).toBeNull()
    expect(chain.links.map((l) => l.dir)).toEqual(['', 'prog'])
    expect(chain.links[1].isolate).toBe(false)
  })

  it('returns MALFORMED_FRONTMATTER naming the document instead of dropping a scope', () => {
    write('acme/domaiNN_NN.md', '# acme\n')
    write('acme/prog/p_NN.md', '---\nscope: [unclosed\nisolate: true\n---\n# NN Settings\n')
    const result = findScopeChain(write('acme/prog/a_NN.md', '# NN Note\n'))
    expect(result).toMatchObject({ ok: false, code: 'MALFORMED_FRONTMATTER', path: 'prog/p_NN.md' })
  })

  it('does not take domaiNN_NN.md itself for a marker', () => {
    write('acme/domaiNN_NN.md', marker('scope: true\n'))
    const chain = chainOf(write('acme/a_NN.md', '# NN Note\n'))
    expect(chain.links).toEqual([{ dir: '', valuesDoc: null, kind: 'root', isolate: false }])
  })
})

function foundIn(chain: ScopeChain, rel: string) {
  const r = findInChain(chain, { rel })
  if (!r.ok) throw new Error(`${r.code}: ${r.detail}`)
  return r
}

describe('findInChain', () => {
  const p1 = () => chainOf(join(FIX, 'programs', 'alpha', 'projects', 'p1', 'risks_NN.md'))

  it('rejects a relative path that climbs out of the domaiNN with PATH_OUTSIDE_SCOPE', () => {
    const r = findInChain(p1(), { rel: '../../../../../outside_NN.md' })
    expect(r).toMatchObject({ ok: false, code: 'PATH_OUTSIDE_SCOPE' })
  })

  it('rejects an absolute path with PATH_OUTSIDE_SCOPE', () => {
    const r = findInChain(p1(), { rel: join(FIX, 'portfolio_settings_NN.md') })
    expect(r).toMatchObject({ ok: false, code: 'PATH_OUTSIDE_SCOPE' })
  })

  it('rejects a path that climbs above an isolated scope', () => {
    const cut = chainOf(join(FIX, 'programs', 'legacy', 'projects', 'old', 'old_NN.md'))
    const r = findInChain(cut, { rel: '../../../../portfolio_settings_NN.md' })
    expect(r).toMatchObject({ ok: false, code: 'PATH_OUTSIDE_SCOPE' })
  })

  it('finds a document in the nearest scope that holds it, searching nearest first', () => {
    const found = foundIn(p1(), 'p1_NN.md')
    expect(found.path).toBe(join(FIX, 'programs', 'alpha', 'projects', 'p1', 'p1_NN.md'))
    expect(found.searched).toEqual([join(FIX, 'programs', 'alpha', 'projects', 'p1', 'p1_NN.md')])
  })

  it('climbs the chain to the root when nearer scopes lack the document', () => {
    const found = foundIn(p1(), 'portfolio_settings_NN.md')
    expect(found.path).toBe(join(FIX, 'portfolio_settings_NN.md'))
    expect(found.searched).toEqual([
      join(FIX, 'programs', 'alpha', 'projects', 'p1', 'portfolio_settings_NN.md'),
      join(FIX, 'programs', 'alpha', 'portfolio_settings_NN.md'),
      join(FIX, 'portfolio_settings_NN.md'),
    ])
  })

  it('does not climb above an isolated scope', () => {
    const cut = chainOf(join(FIX, 'programs', 'legacy', 'projects', 'old', 'old_NN.md'))
    const found = foundIn(cut, 'portfolio_settings_NN.md')
    expect(found.path).toBeNull()
    expect(found.searched).toHaveLength(2)
  })
})
