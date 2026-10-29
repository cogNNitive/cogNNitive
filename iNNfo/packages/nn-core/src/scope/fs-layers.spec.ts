import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { findScopeChain } from './fs-chain.js'
import { loadChain } from './fs-layers.js'
import { resolve } from './resolve.js'
import type { LoadedChain, Resolution } from './resolve.js'
import type { ScopeChain } from './types.js'

const FIX = fileURLToPath(new URL('../../tests/fixtures/scoped-portfolio', import.meta.url))
const FLOOR = {
  label: 'settings',
  path: fileURLToPath(
    new URL('../../tests/fixtures/scoped-portfolio-blueprint/defaults/settings-defaults_NN.md', import.meta.url),
  ),
}

function chainOf(path: string): ScopeChain {
  const result = findScopeChain(path)
  if (!result.ok) throw new Error(`expected a chain for ${path}, got ${result.code}`)
  return result.chain
}

function loadOk(chain: ScopeChain, opts?: Parameters<typeof loadChain>[1]): LoadedChain {
  const r = loadChain(chain, opts)
  if (!r.ok) throw new Error(`${r.code}: ${r.detail}`)
  return r.loaded
}

function valueOf(r: Resolution) {
  if (!r.ok) throw new Error(r.code)
  return r
}

describe('loadChain over the scoped-portfolio fixture', () => {
  const p1 = () => chainOf(join(FIX, 'programs', 'alpha', 'projects', 'p1', 'risks_NN.md'))

  it('turns each link into a node holding the fields of the marker document', () => {
    const { nodes } = loadOk(p1())
    expect(nodes.map((n) => [n.id, n.kind, n.doc, n.isolate])).toEqual([
      ['', 'root', 'portfolio_settings_NN.md', false],
      ['programs/alpha', 'scope', 'programs/alpha/alpha_NN.md', false],
      ['programs/alpha/projects/p1', 'scope', 'programs/alpha/projects/p1/p1_NN.md', false],
    ])
    expect(nodes[0].values).toEqual({
      priority: 'medium',
      glossary: ['risk=any threat', 'issue=something broken'],
      owner: 'portfolio-office',
    })
    expect(nodes[1].values).toEqual({ glossary: ['milestone=a dated checkpoint', 'risk=schedule threat'] })
    expect(nodes[2].values).toEqual({ priority: 'high' })
  })

  it('carries the isolate flag of an isolated scope', () => {
    const cut = chainOf(join(FIX, 'programs', 'legacy', 'projects', 'old', 'old_NN.md'))
    expect(loadOk(cut).nodes.map((n) => [n.id, n.isolate])).toEqual([
      ['programs/legacy', true],
      ['programs/legacy/projects/old', false],
    ])
  })

  it('injects the floor from the given blueprint defaults document, without a machine path', () => {
    const { floor } = loadOk(p1(), { floorDoc: FLOOR })
    expect(floor).toEqual({
      id: 'bluepriNNt:settings',
      kind: 'floor',
      doc: 'settings-defaults_NN.md',
      isolate: false,
      values: { health: 'green', priority: 'none', glossary: ['floor=lowest layer'] },
    })
  })

  it('has no floor when none is injected', () => {
    expect(loadOk(p1()).floor).toBeNull()
  })

  it('resolves the generic three-level fixture end to end', () => {
    const loaded = loadOk(p1(), { floorDoc: FLOOR })
    const priority = valueOf(resolve(loaded, 'priority', 'override'))
    expect(priority.value).toBe('high')
    expect(priority.explain.winner).toEqual({
      scope: 'programs/alpha/projects/p1',
      doc: 'programs/alpha/projects/p1/p1_NN.md',
    })

    const alphaLoaded = loadOk(chainOf(join(FIX, 'programs', 'alpha', 'status_NN.md')), { floorDoc: FLOOR })
    const inherited = valueOf(resolve(alphaLoaded, 'priority', 'override'))
    expect(inherited.value).toBe('medium')
    expect(inherited.explain.winner).toEqual({ scope: '', doc: 'portfolio_settings_NN.md' })

    expect(valueOf(resolve(loaded, 'health', 'override')).explain.winner?.scope).toBe('bluepriNNt:settings')
  })

  it('does not inherit across an isolate: the floor answers instead of the portfolio', () => {
    const legacy = loadOk(chainOf(join(FIX, 'programs', 'legacy', 'legacy_NN.md')), { floorDoc: FLOOR })
    const r = valueOf(resolve(legacy, 'priority', 'override'))
    expect(r.value).toBe('none')
    expect(r.explain.winner?.scope).toBe('bluepriNNt:settings')
    expect(r.explain.cutAt).toBe('programs/legacy')
  })

  it('unions the glossary across the chain with the nearer entry shadowing the farther', () => {
    const loaded = loadOk(chainOf(join(FIX, 'programs', 'alpha', 'status_NN.md')), { floorDoc: FLOOR })
    const r = valueOf(resolve(loaded, 'glossary', 'union'))
    expect(r.value).toEqual([
      { name: 'floor', value: 'lowest layer' },
      { name: 'issue', value: 'something broken' },
      { name: 'milestone', value: 'a dated checkpoint' },
      { name: 'risk', value: 'schedule threat' },
    ])
  })

  it('lets a consumer-appended node sort after the folder nodes and win', () => {
    const loaded = loadOk(p1(), { floorDoc: FLOOR })
    const extended: LoadedChain = {
      ...loaded,
      nodes: [
        ...loaded.nodes,
        { id: 'programs/alpha/projects/p1#now', kind: 'element', doc: null, isolate: false, values: { priority: 'urgent' } },
      ],
    }
    const r = valueOf(resolve(extended, 'priority', 'override'))
    expect(r.value).toBe('urgent')
    expect(r.explain.overridden.map((o) => o.scope)).toEqual([
      'programs/alpha/projects/p1',
      '',
      'bluepriNNt:settings',
    ])
  })

  it('produces plain JSON nodes', () => {
    const loaded = loadOk(p1(), { floorDoc: FLOOR })
    expect(JSON.parse(JSON.stringify(loaded))).toStrictEqual(loaded)
  })
})

describe('loadChain over a temporary tree', () => {
  let base: string

  beforeEach(() => {
    base = realpathSync(mkdtempSync(join(tmpdir(), 'nn-scope-layers-')))
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
  const marker = (body: string) => `---\nlevel: 3\ntitle: "m"\nscope: true\n---\n${body}`

  it('gives a root without a values document a node with no values', () => {
    write('acme/domaiNN_NN.md', '# acme\n')
    const { nodes } = loadOk(chainOf(write('acme/a_NN.md', '# NN Note\n')))
    expect(nodes).toEqual([{ id: '', kind: 'root', doc: null, isolate: false, values: {} }])
  })

  it('reads only the first element, skipping a leading index section', () => {
    write('acme/domaiNN_NN.md', '# acme\n')
    write(
      'acme/g/g_NN.md',
      marker(
        '\n# NN index\n\n* [[First]]\n\n# NN Settings\n\n## NN Settings: First\nowner:: one\n\n## NN Settings: Second\nowner:: two\nextra:: yes\n',
      ),
    )
    const { nodes } = loadOk(chainOf(write('acme/g/x_NN.md', '# NN Note\n')))
    expect(nodes[1].values).toEqual({ owner: 'one' })
  })

  it('gives a marker with no concept element a node with no values', () => {
    write('acme/domaiNN_NN.md', '# acme\n')
    write('acme/g/g_NN.md', marker('\nJust prose, no element.\n'))
    const { nodes } = loadOk(chainOf(write('acme/g/x_NN.md', '# NN Note\n')))
    expect(nodes[1]).toEqual({ id: 'g', kind: 'scope', doc: 'g/g_NN.md', isolate: false, values: {} })
  })

  it('reads a `__proto__` procedure key in fills as plain data', () => {
    write('acme/domaiNN_NN.md', '# acme\n')
    write('acme/g/g_NN.md', '---\nlevel: 3\nscope: true\nfills:\n  __proto__:\n    slot: x\n  real:\n    slot: y\n---\n\nprose\n')
    const { nodes } = loadOk(chainOf(write('acme/g/x_NN.md', '# NN Note\n')))
    const fills = nodes[1].fills ?? {}
    expect(Object.keys(fills).sort()).toEqual(['__proto__', 'real'])
    expect(Object.getPrototypeOf(fills)).toBe(Object.prototype)
  })

  it('returns UNREADABLE_DOCUMENT, not an exception, for a values document that cannot be read', () => {
    write('acme/domaiNN_NN.md', '# acme\n')
    const chain: ScopeChain = {
      root: join(base, 'acme'),
      links: [{ dir: '', valuesDoc: 'gone_NN.md', kind: 'root', isolate: false }],
      cutAt: null,
    }
    const r = loadChain(chain)
    expect(r).toMatchObject({ ok: false, code: 'UNREADABLE_DOCUMENT', path: 'gone_NN.md' })
  })

  it('returns UNREADABLE_DOCUMENT for a floor document that cannot be read', () => {
    write('acme/domaiNN_NN.md', '# acme\n')
    const r = loadChain(chainOf(write('acme/a_NN.md', '# NN Note\n')), {
      floorDoc: { label: 'kit', path: join(base, 'nope_NN.md') },
    })
    expect(r).toMatchObject({ ok: false, code: 'UNREADABLE_DOCUMENT', path: 'nope_NN.md' })
  })
})
