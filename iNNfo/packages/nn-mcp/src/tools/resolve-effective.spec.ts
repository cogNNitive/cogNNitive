import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { explainEffective, resolveEffective } from './resolve-effective'
import type { ExplainResponse, ResolveEffectiveResponse, ToolFailure } from './resolve-effective'

/**
 * resolve_effective / explain over the nn-core scope fixtures. The tools are thin: every
 * value and trace comes from nn-core `resolve`, so these tests pin the contract of the
 * tools (inputs, floor location, structured errors), not the fold.
 */
const FIXTURES = resolve(import.meta.dirname!, '..', '..', '..', 'nn-core', 'tests', 'fixtures')
const FIX = join(FIXTURES, 'scoped-portfolio')
const GOLD = join(FIXTURES, 'video-golden')
const ELFIX = join(FIXTURES, 'programas-golden')

const P1 = 'programs/alpha/projects/p1/p1_NN.md'
const SCRIPT = 'series/innteresante/assets/bosco-verticale/bosco-verticale_video-script_innteresante_NN.md'
const TUTORIAS = 'kNNowledge/tutorias_NN.md'
const PRESTACION = 'Prestación de Servicios'

let scratch: string
let isolated: { globalDir: string; skillsDir: string }

beforeAll(() => {
  scratch = realpathSync(mkdtempSync(join(tmpdir(), 'nn-resolve-effective-')))
  // The package resolver falls back to the user's home: point both tiers at empty folders.
  isolated = { globalDir: join(scratch, 'global'), skillsDir: join(scratch, 'skills') }
  mkdirSync(isolated.globalDir)
  mkdirSync(isolated.skillsDir)
})

afterAll(() => rmSync(scratch, { recursive: true, force: true }))

function ok(r: ResolveEffectiveResponse | ToolFailure): ResolveEffectiveResponse {
  if (!r.ok) throw new Error(`expected a value, got ${r.code}: ${r.detail}`)
  return r
}

function okExplain(r: ExplainResponse | ToolFailure): ExplainResponse {
  if (!r.ok) throw new Error(`expected a trace, got ${r.code}: ${r.detail}`)
  return r
}

/** A throwaway copy of the portfolio fixture with a `settings` package whose defaults are the fixture floor. */
function portfolioWithPackage(defaults: string[]): string {
  const dir = join(scratch, `portfolio-${Math.random().toString(36).slice(2)}`)
  cpSync(FIX, dir, { recursive: true })
  const pkg = join(dir, 'specs', 'bluepriNNts', 'settings')
  mkdirSync(join(pkg, 'defaults'), { recursive: true })
  writeFileSync(join(pkg, 'spec_NN.md'), '---\nlevel: 2\nspec_version: "V_0-1-0"\n---\n')
  for (const name of defaults) {
    cpSync(
      join(FIXTURES, 'scoped-portfolio-blueprint', 'defaults', 'settings-defaults_NN.md'),
      join(pkg, 'defaults', name),
    )
  }
  return dir
}

describe('resolve_effective over folder scopes', () => {
  it('returns the nearest value, its winner and the overridden candidates', async () => {
    const r = ok(await resolveEffective(FIX, { path: P1, key: 'priority', strategy: 'override' }, isolated))
    expect(r).toMatchObject({ ok: true, key: 'priority', strategy: 'override', present: true, value: 'high' })
    expect(r.winner).toEqual({ scope: 'programs/alpha/projects/p1', doc: 'programs/alpha/projects/p1/p1_NN.md' })
    expect(r.trace.overridden.map((c) => [c.scope, c.value, c.by])).toEqual([['', 'medium', 'programs/alpha/projects/p1']])
  })

  it('inherits from the root for a scope that declares nothing', async () => {
    const r = ok(await resolveEffective(FIX, { path: 'programs/alpha/alpha_NN.md', key: 'priority', strategy: 'override' }, isolated))
    expect(r.value).toBe('medium')
    expect(r.winner?.scope).toBe('')
  })

  it('accepts an absolute path inside the domain and a scope directory', async () => {
    const byFile = ok(await resolveEffective(FIX, { path: join(FIX, P1), key: 'priority', strategy: 'override' }, isolated))
    const byDir = ok(await resolveEffective(FIX, { path: join(FIX, 'programs', 'alpha', 'projects', 'p1'), key: 'priority', strategy: 'override' }, isolated))
    expect(byFile.value).toBe('high')
    expect(byDir.value).toBe('high')
  })

  it('unions named entries across the chain', async () => {
    const r = ok(await resolveEffective(FIX, { path: 'programs/alpha/alpha_NN.md', key: 'glossary', strategy: 'union' }, isolated))
    expect(r.winner).toBeNull()
    expect(r.trace.entries?.map((e) => e.name).sort()).toEqual(['issue', 'milestone', 'risk'])
  })

  it('stops at an isolate: the parent value is not inherited', async () => {
    const r = ok(await resolveEffective(FIX, { path: 'programs/legacy/legacy_NN.md', key: 'priority', strategy: 'override' }, isolated))
    expect(r.present).toBe(false)
    expect(r.trace.cutAt).toBe('programs/legacy')
  })
})

describe('resolve_effective over element scopes', () => {
  it('resolves a scene value declared on the scene, naming the series it overrides', async () => {
    const r = ok(
      await resolveEffective(GOLD, { path: SCRIPT, key: 'music_volume', strategy: 'override', target: { concept: 'Scene', slug: '02-noticia' } }, isolated),
    )
    expect(r.value).toBe(0.06)
    expect(r.winner?.scope).toBe(`${SCRIPT}#Scene/02-noticia`)
    expect(r.trace.overridden.map((c) => [c.scope, c.value])).toEqual([['series/innteresante', 0.4]])
  })

  it('falls through to the series for a scene that declares nothing', async () => {
    const r = ok(
      await resolveEffective(GOLD, { path: SCRIPT, key: 'music_volume', strategy: 'override', target: { concept: 'Scene', slug: '03-cierre' } }, isolated),
    )
    expect([r.value, r.winner?.scope]).toEqual([0.4, 'series/innteresante'])
  })

  it('leaves an omitted none value absent and lists the root under notInherited', async () => {
    const r = ok(
      await resolveEffective(ELFIX, { path: TUTORIAS, key: 'precio_hora_tutoria', strategy: 'none', target: { concept: PRESTACION, slug: 'pedido-001' } }, isolated),
    )
    expect(r.present).toBe(false)
    expect(r.winner).toBeNull()
    expect(r.trace.notInherited?.map((c) => [c.scope, c.value])).toEqual([['', '84']])
    expect(r.trace.overridden).toEqual([])
  })

  it('returns the own none value of an element that declares one', async () => {
    const r = ok(
      await resolveEffective(ELFIX, { path: TUTORIAS, key: 'precio_hora_tutoria', strategy: 'none', target: { concept: PRESTACION, slug: 'pedido-002' } }, isolated),
    )
    expect([r.present, r.value]).toEqual([true, '90'])
  })
})

describe('the floor', () => {
  it('falls back to the single defaults document of the package named by parent_spec', async () => {
    const dir = portfolioWithPackage(['settings-defaults_NN.md'])
    const r = ok(await resolveEffective(dir, { path: P1, key: 'health', strategy: 'override' }, isolated))
    expect(r).toMatchObject({ present: true, value: 'green' })
    expect(r.winner).toEqual({ scope: 'bluepriNNt:settings', doc: 'settings-defaults_NN.md' })
  })

  it('is absent, not an error, when the package has no defaults or cannot be resolved', async () => {
    const none = ok(await resolveEffective(FIX, { path: P1, key: 'health', strategy: 'override' }, isolated))
    expect([none.present, none.winner]).toEqual([false, null])
    const dir = portfolioWithPackage([])
    const empty = ok(await resolveEffective(dir, { path: P1, key: 'health', strategy: 'override' }, isolated))
    expect(empty.present).toBe(false)
  })

  it('is a structured error when the package holds more than one defaults document', async () => {
    const dir = portfolioWithPackage(['one_NN.md', 'two_NN.md'])
    const r = await resolveEffective(dir, { path: P1, key: 'health', strategy: 'override' }, isolated)
    expect(r).toMatchObject({ ok: false, code: 'AMBIGUOUS_FLOOR' })
  })

  it('is never an ancestor value for none', async () => {
    const dir = portfolioWithPackage(['settings-defaults_NN.md'])
    const r = ok(await resolveEffective(dir, { path: P1, key: 'health', strategy: 'none' }, isolated))
    expect(r.present).toBe(false)
    expect(r.trace.notInherited?.map((c) => c.scope)).toEqual(['bluepriNNt:settings'])
  })
})

describe('explain', () => {
  it('returns the same trace as resolve_effective, plus the chain with node kinds', async () => {
    const input = { path: P1, key: 'priority', strategy: 'override' }
    const value = ok(await resolveEffective(FIX, input, isolated))
    const explained = okExplain(await explainEffective(FIX, input, isolated))
    expect(explained.trace).toEqual(value.trace)
    expect(explained.chain.map((n) => [n.id, n.kind])).toEqual([
      ['', 'root'],
      ['programs/alpha', 'scope'],
      ['programs/alpha/projects/p1', 'scope'],
    ])
    expect(explained.floor).toBeNull()
  })

  it('reports the floor supplier and element nodes', async () => {
    const dir = portfolioWithPackage(['settings-defaults_NN.md'])
    const e = okExplain(await explainEffective(dir, { path: P1, key: 'health', strategy: 'override' }, isolated))
    expect(e.floor).toEqual({ scope: 'bluepriNNt:settings', doc: 'settings-defaults_NN.md' })
    const el = okExplain(
      await explainEffective(ELFIX, { path: TUTORIAS, key: 'idioma', strategy: 'override', target: { concept: PRESTACION, slug: 'pedido-002' } }, isolated),
    )
    expect(el.chain.map((n) => n.kind)).toEqual(['root', 'element:Programa', `element:${PRESTACION}`])
  })

  it('keeps none traces equal between the two tools', async () => {
    const input = { path: TUTORIAS, key: 'precio_hora_tutoria', strategy: 'none', target: { concept: PRESTACION, slug: 'pedido-001' } }
    const a = ok(await resolveEffective(ELFIX, input, isolated))
    const b = okExplain(await explainEffective(ELFIX, input, isolated))
    expect(b.trace).toEqual(a.trace)
  })
})

describe('structured errors', () => {
  it('NO_DOMAIN_ROOT lists the directories searched', async () => {
    const bare = join(scratch, 'bare')
    mkdirSync(bare)
    writeFileSync(join(bare, 'note_NN.md'), '# NN Note\n')
    for (const tool of [resolveEffective, explainEffective]) {
      const r = await tool(bare, { path: 'note_NN.md', key: 'k', strategy: 'override' }, isolated)
      expect(r).toMatchObject({ ok: false, code: 'NO_DOMAIN_ROOT' })
      expect(!r.ok && r.searched?.length).toBeGreaterThan(0)
    }
  })

  it('PATH_OUTSIDE_SCOPE refuses a path outside the server domain root, absolute or by traversal', async () => {
    for (const path of [GOLD, join(FIX, '..', 'video-golden', 'domaiNN_NN.md'), '../video-golden/domaiNN_NN.md']) {
      const r = await resolveEffective(FIX, { path, key: 'k', strategy: 'override' }, isolated)
      expect(r).toMatchObject({ ok: false, code: 'PATH_OUTSIDE_SCOPE' })
    }
  })

  it('UNSUPPORTED_STRATEGY names the strategy and does not fall back', async () => {
    const r = await resolveEffective(FIX, { path: P1, key: 'priority', strategy: 'restrict' }, isolated)
    expect(r).toMatchObject({ ok: false, code: 'UNSUPPORTED_STRATEGY' })
    expect(!r.ok && r.detail).toContain('restrict')
  })

  it('reports element errors from the element adapter', async () => {
    const unknown = await resolveEffective(ELFIX, { path: TUTORIAS, key: 'k', strategy: 'override', target: { concept: PRESTACION, slug: 'pedido-999' } }, isolated)
    expect(unknown).toMatchObject({ ok: false, code: 'UNKNOWN_ELEMENT' })
    const noParent = await resolveEffective(ELFIX, { path: TUTORIAS, key: 'k', strategy: 'override', target: { concept: PRESTACION, slug: 'pedido-003' } }, isolated)
    expect(noParent).toMatchObject({ ok: false, code: 'UNKNOWN_PARENT_ELEMENT' })
  })

  it('UNREADABLE_DOCUMENT for a missing document when an element is targeted', async () => {
    const r = await resolveEffective(ELFIX, { path: 'kNNowledge/missing_NN.md', key: 'k', strategy: 'override', target: { concept: 'Programa', slug: 'x' } }, isolated)
    expect(r).toMatchObject({ ok: false, code: 'UNREADABLE_DOCUMENT' })
  })

  it('MALFORMED_FRONTMATTER names the document, domain-relative', async () => {
    const dir = join(scratch, 'malformed')
    mkdirSync(join(dir, 'prog'), { recursive: true })
    writeFileSync(join(dir, 'domaiNN_NN.md'), '---\ntitle: t\n---\n# t\n')
    writeFileSync(join(dir, 'prog', 'p_NN.md'), '---\nscope: [unclosed\n---\n# NN Settings\n')
    writeFileSync(join(dir, 'prog', 'a_NN.md'), '# NN Note\n')
    const r = await resolveEffective(dir, { path: 'prog/a_NN.md', key: 'k', strategy: 'override' }, isolated)
    expect(r).toMatchObject({ ok: false, code: 'MALFORMED_FRONTMATTER', path: 'prog/p_NN.md' })
  })

  it.each([
    ['no input', undefined],
    ['null input', null],
    ['a string input', 'priority'],
    ['an empty input', {}],
    ['a numeric path', { path: 42, key: 'k', strategy: 'override' }],
    ['an empty key', { path: P1, key: '', strategy: 'override' }],
    ['a missing strategy', { path: P1, key: 'k' }],
    ['a non-string strategy', { path: P1, key: 'k', strategy: 7 }],
    ['an array target', { path: P1, key: 'k', strategy: 'override', target: [] }],
    ['a target without slug', { path: P1, key: 'k', strategy: 'override', target: { concept: 'Scene' } }],
    ['a NUL in the path', { path: 'a\0b', key: 'k', strategy: 'override' }],
  ])('never throws on %s', async (_label, input) => {
    for (const tool of [resolveEffective, explainEffective]) {
      const r = await tool(FIX, input as never, isolated)
      expect(r.ok).toBe(false)
      expect(typeof (r as ToolFailure).code).toBe('string')
    }
  })
})

describe('containment', () => {
  it('PATH_OUTSIDE_SCOPE when the domaiNN root lies above the server root', async () => {
    const outer = join(scratch, 'outer')
    mkdirSync(join(outer, 'inner', 'sub'), { recursive: true })
    writeFileSync(join(outer, 'domaiNN_NN.md'), '---\ntitle: outer\n---\n# outer\n')
    writeFileSync(join(outer, 'inner', 'sub', 'a_NN.md'), '# NN Note\n')
    const r = await resolveEffective(join(outer, 'inner'), { path: 'sub/a_NN.md', key: 'k', strategy: 'override' }, isolated)
    expect(r).toMatchObject({ ok: false, code: 'PATH_OUTSIDE_SCOPE' })
  })

  it('PATH_OUTSIDE_SCOPE when a link inside the domaiNN points outside it', async (ctx) => {
    const dom = join(scratch, 'linked')
    const outside = join(scratch, 'linked-outside')
    mkdirSync(dom)
    mkdirSync(outside)
    writeFileSync(join(dom, 'domaiNN_NN.md'), '---\ntitle: t\n---\n# t\n')
    writeFileSync(join(outside, 'x_NN.md'), '# NN Note\n')
    try {
      symlinkSync(outside, join(dom, 'link'), 'junction')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EPERM') return ctx.skip()
      throw error
    }
    const r = await resolveEffective(dom, { path: 'link/x_NN.md', key: 'k', strategy: 'override' }, isolated)
    expect(r).toMatchObject({ ok: false, code: 'PATH_OUTSIDE_SCOPE' })
  })

  it.skipIf(process.platform !== 'win32')('PATH_OUTSIDE_SCOPE for another drive or a UNC path', async () => {
    for (const path of ['Z:\\elsewhere\\a_NN.md', '\\\\server\\share\\a_NN.md']) {
      const r = await resolveEffective(FIX, { path, key: 'k', strategy: 'override' }, isolated)
      expect(r).toMatchObject({ ok: false, code: 'PATH_OUTSIDE_SCOPE' })
    }
  })
})

describe('floor errors', () => {
  function domainWithParent(name: string): string {
    const dir = join(scratch, `parent-${Math.random().toString(36).slice(2)}`)
    mkdirSync(join(dir, 'prog'), { recursive: true })
    writeFileSync(join(dir, 'domaiNN_NN.md'), '---\ntitle: t\n---\n# t\n')
    writeFileSync(join(dir, 'prog', 'p_NN.md'), `---\nparent_spec:\n  name: ${JSON.stringify(name)}\nscope: true\n---\n# NN Settings\n`)
    return dir
  }

  it.each(['../evil', '..\\evil', 'a/b', 'a\\b', '..'])('INVALID_PARENT_SPEC for parent_spec name %s', async (name) => {
    const dir = domainWithParent(name)
    const r = await resolveEffective(dir, { path: 'prog/p_NN.md', key: 'k', strategy: 'override' }, isolated)
    expect(r).toMatchObject({ ok: false, code: 'INVALID_PARENT_SPEC', path: 'prog/p_NN.md' })
    expect(JSON.stringify(r)).not.toContain(dir.replaceAll('\\', '\\\\'))
  })
})

describe('no absolute paths in failures', () => {
  it('UNREADABLE_DOCUMENT carries no absolute machine path', async () => {
    const r = await resolveEffective(ELFIX, { path: 'kNNowledge/missing_NN.md', key: 'k', strategy: 'override', target: { concept: 'Programa', slug: 'x' } }, isolated)
    expect(r).toMatchObject({ ok: false, code: 'UNREADABLE_DOCUMENT' })
    const text = JSON.stringify(r)
    expect(text).not.toContain(ELFIX.replaceAll('\\', '\\\\'))
    expect(text).not.toContain(ELFIX)
    expect(text).not.toContain(ELFIX.replaceAll('\\', '/'))
  })

  it('INTERNAL_ERROR is generic', async () => {
    const hostile = {
      get path(): string {
        throw new Error(`boom at ${FIX}`)
      },
      key: 'k',
      strategy: 'override',
    }
    const r = await resolveEffective(FIX, hostile, isolated)
    expect(r).toMatchObject({ ok: false, code: 'INTERNAL_ERROR', detail: 'internal error' })
  })
})

describe('input and element parity', () => {
  it('keeps element-target traces equal between explain and resolve_effective', async () => {
    const input = { path: SCRIPT, key: 'music_volume', strategy: 'override', target: { concept: 'Scene', slug: '02-noticia' } }
    const a = ok(await resolveEffective(GOLD, input, isolated))
    const b = okExplain(await explainEffective(GOLD, input, isolated))
    expect(b.trace).toEqual(a.trace)
  })

  it.each([
    ['a string target', 'Scene'],
    ['a numeric target', 3],
    ['a numeric slug', { concept: 'Scene', slug: 2 }],
    ['an empty concept', { concept: '', slug: 's' }],
  ])('INVALID_ARGUMENT for %s', async (_label, target) => {
    for (const tool of [resolveEffective, explainEffective]) {
      const r = await tool(FIX, { path: P1, key: 'k', strategy: 'override', target } as never, isolated)
      expect(r).toMatchObject({ ok: false, code: 'INVALID_ARGUMENT' })
    }
  })

  it.each([['an array', []], ['a number', 5], ['undefined', undefined]])('INVALID_ARGUMENT for %s as the whole input', async (_label, input) => {
    for (const tool of [resolveEffective, explainEffective]) {
      expect(await tool(FIX, input as never, isolated)).toMatchObject({ ok: false, code: 'INVALID_ARGUMENT' })
    }
  })
})

describe('serialization', () => {
  it('every response round-trips through JSON', async () => {
    const dir = portfolioWithPackage(['settings-defaults_NN.md'])
    const calls: Array<Promise<unknown>> = [
      resolveEffective(FIX, { path: P1, key: 'priority', strategy: 'override' }, isolated),
      explainEffective(FIX, { path: P1, key: 'priority', strategy: 'override' }, isolated),
      resolveEffective(dir, { path: P1, key: 'health', strategy: 'override' }, isolated),
      explainEffective(GOLD, { path: SCRIPT, key: 'music_volume', strategy: 'override', target: { concept: 'Scene', slug: '02-noticia' } }, isolated),
      resolveEffective(ELFIX, { path: TUTORIAS, key: 'precio_hora_tutoria', strategy: 'none', target: { concept: PRESTACION, slug: 'pedido-001' } }, isolated),
      resolveEffective(FIX, { path: P1, key: 'priority', strategy: 'restrict' }, isolated),
      resolveEffective(FIX, { path: GOLD, key: 'k', strategy: 'override' }, isolated),
    ]
    for (const response of await Promise.all(calls)) {
      expect(JSON.parse(JSON.stringify(response))).toStrictEqual(response)
    }
  })

  it('carries no absolute machine path in a success response', async () => {
    const r = await explainEffective(GOLD, { path: join(GOLD, SCRIPT), key: 'music_volume', strategy: 'override', target: { concept: 'Scene', slug: '02-noticia' } }, isolated)
    expect(JSON.stringify(r)).not.toContain(GOLD.replaceAll('\\', '\\\\'))
    expect(JSON.stringify(r)).not.toContain(GOLD)
  })
})
