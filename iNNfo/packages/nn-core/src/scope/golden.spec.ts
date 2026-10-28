import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { findScopeChain } from './fs-chain.js'
import { loadChain } from './fs-layers.js'
import { loadScopeProcedures } from './fs-procedures.js'
import { resolveProcedures } from './procedures.js'
import { resolve } from './resolve.js'
import type { LoadedChain, Resolution } from './resolve.js'
import type { JsonValue } from './types.js'

/**
 * Golden validation on a REDUCED copy of the video domain (tests/fixtures/video-golden):
 * one root, two series, one episode each, the two music settings and a reduced slotted
 * procedure. The same assertions run by hand against a temp copy of the real backup in
 * `scripts/dev/validate-scope-golden.mjs`. CI never reads the real path.
 */
const GOLD = fileURLToPath(new URL('../../tests/fixtures/video-golden', import.meta.url))
const FLOOR = {
  label: 'video-golden',
  path: fileURLToPath(
    new URL('../../tests/fixtures/video-golden-blueprint/defaults/video-defaults_NN.md', import.meta.url),
  ),
}

const EPISODES = {
  innteresante: join(GOLD, 'series', 'innteresante', 'assets', 'bosco-verticale', 'bosco-verticale_video-script_innteresante_NN.md'),
  'villabotijos-today': join(
    GOLD,
    'series',
    'villabotijos-today',
    'assets',
    'boa-constrictor-suelta',
    'boa-constrictor-suelta_video-script_villabotijos-today_NN.md',
  ),
}

function load(path: string) {
  const found = findScopeChain(path)
  if (!found.ok) throw new Error(`no chain for ${path}: ${found.code}`)
  const withFloor = loadChain(found.chain, { floorDoc: FLOOR })
  const { loaded, diagnostics } = loadScopeProcedures(found.chain, withFloor)
  return { chain: found.chain, loaded, loadDiagnostics: diagnostics }
}

function value(loaded: LoadedChain, key: string): Extract<Resolution, { ok: true }> {
  const r = resolve(loaded, key, 'override')
  if (!r.ok) throw new Error(r.code)
  return r
}

describe('chain shape', () => {
  // The episode script declares `scope_elements` instead of `scope: true`, so the episode
  // FOLDER is no longer a scope (L1.4 finding 3); the episode appears as element nodes.
  it.each(Object.entries(EPISODES))('%s episode: the folder chain is root, series (outermost first)', (slug, path) => {
    const { chain } = load(path)
    expect(chain.links.map((l) => l.dir)).toEqual(['', `series/${slug}`])
    expect(chain.root).toBe(GOLD)
    expect(chain.cutAt).toBeNull()
  })
})

describe('music and voice reproduce the values of the series today', () => {
  it('innteresante resolves jazz.mp3, volume 0.4 and its voice; the transition comes from the floor', () => {
    const { loaded } = load(EPISODES.innteresante)
    expect(basename(String(value(loaded, 'music').value))).toBe('jazz.mp3')
    expect(value(loaded, 'music_volume').value).toBe(0.4)
    expect(value(loaded, 'voice_id').value).toBe('LucasCervera02')
    const transition = value(loaded, 'transition')
    expect(transition.value).toBe('none')
    expect(transition.explain.winner).toEqual({ scope: 'bluepriNNt:video-golden', doc: 'video-defaults_NN.md' })
  })

  it('villabotijos-today resolves pasodoble-loop.m4a at volume 0.06, its voice and its own transition', () => {
    const { loaded } = load(EPISODES['villabotijos-today'])
    expect(basename(String(value(loaded, 'music').value))).toBe('pasodoble-loop.m4a')
    expect(value(loaded, 'music_volume').value).toBe(0.06)
    expect(value(loaded, 'voice_id').value).toBe('Villabotijos01')
    expect(value(loaded, 'transition').value).toBe('fade')
  })

  it('names the series marker as the supplier of a value declared there', () => {
    const { loaded } = load(EPISODES['villabotijos-today'])
    expect(value(loaded, 'music').explain.winner).toEqual({
      scope: 'series/villabotijos-today',
      doc: 'series/villabotijos-today/villabotijos-today_scope_NN.md',
    })
    expect(value(loaded, 'music_volume').explain.overridden.map((o) => [o.scope, o.value])).toEqual([
      ['bluepriNNt:video-golden', 0.2],
    ])
  })

  it('unions the floor components, the series adding none', () => {
    const { loaded } = load(EPISODES.innteresante)
    const r = resolve(loaded, 'components', 'union')
    if (!r.ok) throw new Error(r.code)
    expect(r.value).toEqual([
      { name: 'title', value: 'title' },
      { name: 'lower-third', value: 'lower-third' },
      { name: 'caption', value: 'caption' },
    ])
  })

  it('serializes every explain trace', () => {
    for (const path of Object.values(EPISODES)) {
      const { loaded } = load(path)
      for (const key of ['music', 'music_volume', 'voice_id', 'transition', 'absent_key']) {
        const r = resolve(loaded, key, 'override')
        expect(JSON.parse(JSON.stringify(r))).toStrictEqual(r)
      }
      const u = resolve(loaded, 'components', 'union')
      expect(JSON.parse(JSON.stringify(u))).toStrictEqual(u)
    }
  })
})

/** Strips naming noise so two series copies of one procedure can be compared: frontmatter, banner, names. */
function normalize(text: string): string {
  return text
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .split('\n')
    .filter((line) => !line.startsWith('> This is an **iNNfo document**'))
    .map((line) =>
      line
        .replace(/Villabotijos Today|iNNteresante/g, '{{series_name}}')
        .replace(/villabotijos-today|innteresante/g, '{{series_slug}}')
        .replace(/\bCeledonio\b|\bLucas\b/g, '{{presenter}}')
        .trimEnd(),
    )
    .join('\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

/** Fills the `{{slot:name}}` markers of a procedure body from the resolved bindings. */
function compose(body: string, bindings: Record<string, { value: JsonValue }>): string {
  return body.replace(/\{\{slot:([a-z_]+)\}\}/g, (_, name: string) => {
    const bound = bindings[name]
    if (!bound || typeof bound.value !== 'string') throw new Error(`slot ${name} is not bound to text`)
    return bound.value
  })
}

describe('one slotted draft_scene_visuals equals both series copies', () => {
  const composed = (slug: keyof typeof EPISODES) => {
    const { loaded, loadDiagnostics } = load(EPISODES[slug])
    const result = resolveProcedures(loaded)
    const procedure = result.procedures.find((p) => p.def.id === 'draft-scene-visuals')
    if (!procedure) throw new Error('procedure not selected')
    const body = readFileSync(join(GOLD, procedure.def.doc), 'utf-8')
    return { text: normalize(compose(body, procedure.bindings)), procedure, result, loadDiagnostics }
  }
  const expected = (slug: string) =>
    normalize(readFileSync(join(GOLD, '_expected', `${slug}.draft-scene-visuals.md`), 'utf-8'))

  it.each(Object.keys(EPISODES))('%s: composed text equals the existing copy modulo naming noise', (slug) => {
    expect(composed(slug as keyof typeof EPISODES).text).toBe(expected(slug))
  })

  it('both series share the single root definition and the composition raises no diagnostic', () => {
    const a = composed('innteresante')
    const b = composed('villabotijos-today')
    expect(a.procedure.def).toEqual(b.procedure.def)
    expect(a.procedure.def.scope).toBe('')
    expect(a.procedure.def.doc).toBe('procedures/draft-scene-visuals_procedures_NN.md')
    for (const c of [a, b]) {
      expect(c.result.diagnostics).toEqual([])
      expect(c.loadDiagnostics).toEqual([])
    }
  })

  it('the two copies differ only where the fills differ', () => {
    expect(composed('innteresante').text).not.toBe(composed('villabotijos-today').text)
    expect(Object.keys(composed('innteresante').procedure.bindings)).toEqual([
      'presenter_persona',
      'scene_structure',
      'tools_invocation',
    ])
  })

  it('names the series marker as the supplier of each slot', () => {
    const { procedure } = composed('villabotijos-today')
    for (const binding of Object.values(procedure.bindings)) {
      expect(binding.from.scope).toBe('series/villabotijos-today')
    }
  })
})
