import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { listScopeElements, loadElementChain } from './fs-elements.js'
import { resolve } from './resolve.js'
import type { Resolution } from './resolve.js'

/**
 * The element adapter's filesystem side, on synthetic fixtures only:
 * `programas-golden` (ELFIX, two Programas, three Prestaciones) and `video-golden`
 * (GOLD, a script with a Video and three Scenes) plus throwaway domaiNNs.
 */
const ELFIX = fileURLToPath(new URL('../../tests/fixtures/programas-golden', import.meta.url))
const GOLD = fileURLToPath(new URL('../../tests/fixtures/video-golden', import.meta.url))
const TUTORIAS = join(ELFIX, 'kNNowledge', 'tutorias_NN.md')
const SCRIPT = join(GOLD, 'series', 'innteresante', 'assets', 'bosco-verticale', 'bosco-verticale_video-script_innteresante_NN.md')
const FLOOR = {
  label: 'video-golden',
  path: fileURLToPath(
    new URL('../../tests/fixtures/video-golden-blueprint/defaults/video-defaults_NN.md', import.meta.url),
  ),
}
const TUTORIAS_DOC = 'kNNowledge/tutorias_NN.md'
const PRESTACION = 'Prestación de Servicios'

function loaded(path: string, concept: string, slug: string, opts?: Parameters<typeof loadElementChain>[2]) {
  const r = loadElementChain(path, { concept, slug }, opts)
  if (!r.ok) throw new Error(`expected a chain, got ${r.code}: ${r.detail}`)
  return r
}

function one(r: Resolution) {
  if (!r.ok) throw new Error(r.code)
  return r
}

describe('loadElementChain over the tutorias fixture', () => {
  it('returns the folder node, then the Programa, then the Prestacion (outermost first)', () => {
    const { loaded: l } = loaded(TUTORIAS, PRESTACION, 'pedido-001')
    expect(l.nodes.map((n) => [n.id, n.kind])).toEqual([
      ['', 'root'],
      [`${TUTORIAS_DOC}#Programa/programa-alfa`, 'element:Programa'],
      [`${TUTORIAS_DOC}#${PRESTACION}/pedido-001`, `element:${PRESTACION}`],
    ])
  })

  it('reads the element values through the parser: references stay [[Title]] text, slug is not a value', () => {
    const { loaded: l } = loaded(TUTORIAS, PRESTACION, 'pedido-002')
    const target = l.nodes.at(-1)
    expect(target?.values).toEqual({ programa_ref: '[[Programa Beta]]', numero_pedido: 2, precio_hora_tutoria: '90' })
    expect(l.nodes[1].values).toEqual({ idioma: 'ca' })
  })

  it('uses domain-relative POSIX ids and documents, never an absolute path', () => {
    const { loaded: l } = loaded(TUTORIAS, PRESTACION, 'pedido-001')
    for (const n of l.nodes) {
      expect(n.id).not.toContain('\\')
      expect(n.id).not.toContain(ELFIX)
      expect(n.doc === null || (!n.doc.includes('\\') && !n.doc.includes(ELFIX))).toBe(true)
    }
    expect(l.nodes[1].doc).toBe(TUTORIAS_DOC)
  })

  it('returns a structured error for an unresolved programa_ref instead of guessing a parent', () => {
    const r = loadElementChain(TUTORIAS, { concept: PRESTACION, slug: 'pedido-003' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.code).toBe('UNKNOWN_PARENT_ELEMENT')
      expect(r.detail).toContain('Programa Fantasma')
    }
  })

  it('reports an element that does not exist', () => {
    const r = loadElementChain(TUTORIAS, { concept: PRESTACION, slug: 'pedido-999' })
    expect(r.ok === false && r.code).toBe('UNKNOWN_ELEMENT')
  })

  it('injects the floor when the caller supplies one', () => {
    const withFloor = loaded(SCRIPT, 'Scene', '02-noticia', { floorDoc: FLOOR })
    expect(withFloor.loaded.floor?.id).toBe('bluepriNNt:video-golden')
    expect(loaded(SCRIPT, 'Scene', '02-noticia').loaded.floor).toBeNull()
  })

  it('serializes to plain JSON', () => {
    const r = loadElementChain(TUTORIAS, { concept: PRESTACION, slug: 'pedido-001' })
    expect(JSON.parse(JSON.stringify(r))).toStrictEqual(r)
  })
})

describe('loadElementChain without an element target', () => {
  it('yields only the folder nodes for a document that declares no scope_elements', () => {
    const series = join(GOLD, 'series', 'innteresante', 'innteresante_scope_NN.md')
    const r = loadElementChain(series, null)
    expect(r.ok && r.loaded.nodes.map((n) => n.id)).toEqual(['', 'series/innteresante'])
  })

  it('names the folder chain of a document that does declare elements', () => {
    const r = loadElementChain(SCRIPT, null)
    expect(r.ok && r.loaded.nodes.map((n) => n.id)).toEqual(['', 'series/innteresante'])
  })

  it('asks for an element of a document that declares none as UNKNOWN_ELEMENT', () => {
    const series = join(GOLD, 'series', 'innteresante', 'innteresante_scope_NN.md')
    const r = loadElementChain(series, { concept: 'Scene', slug: '02-noticia' })
    expect(r.ok === false && r.code).toBe('UNKNOWN_ELEMENT')
  })

  it('returns NO_DOMAIN_ROOT with the searched directories outside any domaiNN', () => {
    const outside = mkdtempSync(join(tmpdir(), 'nn-el-outside-'))
    try {
      writeFileSync(join(outside, 'x_NN.md'), '---\nscope_elements:\n  - concept: A\n---\n# NN A\n\n## NN A: one\n')
      const r = loadElementChain(join(outside, 'x_NN.md'), { concept: 'A', slug: 'one' })
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(r.code).toBe('NO_DOMAIN_ROOT')
        expect(r.searched?.length).toBeGreaterThan(0)
      }
    } finally {
      rmSync(outside, { recursive: true, force: true })
    }
  })

  it('returns a structured error, not an exception, for a path that is not a document', () => {
    const r = loadElementChain(join(ELFIX, 'kNNowledge', 'missing_NN.md'), { concept: 'Programa', slug: 'x' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('UNREADABLE_DOCUMENT')
  })
})

describe('listScopeElements', () => {
  it('lists every scope element in document order, listed concepts only', () => {
    const r = listScopeElements(TUTORIAS)
    if (!r.ok) throw new Error(r.code)
    expect(r.doc).toBe(TUTORIAS_DOC)
    expect(r.elements.map((e) => [e.concept, e.slug, e.title])).toEqual([
      ['Programa', 'programa-alfa', 'Programa Alfa'],
      ['Programa', 'programa-beta', 'Programa Beta'],
      [PRESTACION, 'pedido-001', 'Pedido 001'],
      [PRESTACION, 'pedido-002', 'Pedido 002'],
      [PRESTACION, 'pedido-003', 'Pedido 003'],
    ])
  })

  it('lists the video script elements (Video, then Scenes) and leaves Layers out', () => {
    const r = listScopeElements(SCRIPT)
    if (!r.ok) throw new Error(r.code)
    expect(r.elements.map((e) => `${e.concept}/${e.slug}`)).toEqual([
      'Video/bosco-verticale',
      'Scene/01-intro',
      'Scene/02-noticia',
      'Scene/03-cierre',
    ])
  })

  it('lists nothing for a document that declares no scope_elements', () => {
    const r = listScopeElements(join(GOLD, 'series', 'innteresante', 'innteresante_scope_NN.md'))
    expect(r.ok && r.elements).toEqual([])
  })
})

describe('resolution over the loaded element chain', () => {
  it('resolves the scene volume from the scene, naming the series as overridden', () => {
    const { loaded: l } = loaded(SCRIPT, 'Scene', '02-noticia', { floorDoc: FLOOR })
    const r = one(resolve(l, 'music_volume', 'override'))
    expect(r.value).toBe(0.06)
    expect(r.explain.winner?.scope).toBe('series/innteresante/assets/bosco-verticale/bosco-verticale_video-script_innteresante_NN.md#Scene/02-noticia')
    expect(r.explain.overridden.map((o) => [o.scope, o.value])).toEqual([
      ['series/innteresante', 0.4],
      ['bluepriNNt:video-golden', 0.2],
    ])
  })

  it('resolves none against the Prestacion alone', () => {
    const omitted = one(resolve(loaded(TUTORIAS, PRESTACION, 'pedido-001').loaded, 'precio_hora_tutoria', 'none'))
    expect(omitted.present).toBe(false)
    expect(omitted.explain.notInherited?.map((c) => [c.scope, c.value])).toEqual([['', '84']])
    const own = one(resolve(loaded(TUTORIAS, PRESTACION, 'pedido-002').loaded, 'precio_hora_tutoria', 'none'))
    expect(own.value).toBe('90')
  })
})

describe('element isolate and declaration conflicts (throwaway domaiNN)', () => {
  let dir: string
  beforeEach(() => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), 'nn-el-')))
    writeFileSync(join(dir, 'domaiNN_NN.md'), '---\ntitle: t\n---\n# t\n')
    writeFileSync(
      join(dir, 'root_scope_NN.md'),
      '---\nlevel: 3\nscope: true\n---\n\n# NN Settings\n\n## NN Settings: Root\ncolor:: red\n',
    )
  })
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  const doc = (name: string, frontmatter: string, body: string) => {
    const path = join(dir, name)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, `---\nlevel: 3\n${frontmatter}---\n\n${body}`)
    return path
  }
  const nested = (inner: string) =>
    doc(
      'plan_NN.md',
      'scope_elements:\n  - concept: Outer\n  - concept: Inner\n',
      `# NN Outer\n\n## NN Outer: o1\ncolor:: blue\n\n# NN Inner\n\n## NN Inner: i1\n${inner}`,
    )

  it('an element declaring isolate:: true ends the chain: the root value is not inherited', () => {
    const path = nested('isolate:: true\n')
    const l = loaded(path, 'Inner', 'i1').loaded
    expect(l.nodes.map((n) => [n.id, n.isolate])).toEqual([
      ['', false],
      ['plan_NN.md#Outer/o1', false],
      ['plan_NN.md#Inner/i1', true],
    ])
    const r = one(resolve(l, 'color', 'override'))
    expect(r.present).toBe(false)
    expect(r.explain.cutAt).toBe('plan_NN.md#Inner/i1')
  })

  it('the text "true" is not an isolate', () => {
    const l = loaded(nested('isolate:: "true"\n'), 'Inner', 'i1').loaded
    expect(l.nodes.at(-1)?.isolate).toBe(false)
    expect(one(resolve(l, 'color', 'override')).value).toBe('blue')
  })

  it('a document with both scope: true and scope_elements is AMBIGUOUS_SCOPE_DECLARATION', () => {
    const path = doc(
      'sub/both_NN.md',
      'scope: true\nscope_elements:\n  - concept: Outer\n',
      '# NN Outer\n\n## NN Outer: o1\ncolor:: blue\n',
    )
    const r = loadElementChain(path, { concept: 'Outer', slug: 'o1' })
    expect(r.ok === false && r.code).toBe('AMBIGUOUS_SCOPE_DECLARATION')
  })

  it('a scope_elements value that is not a list of declarations is INVALID_SCOPE_DECLARATION', () => {
    const path = doc('bad_NN.md', 'scope_elements: Outer\n', '# NN Outer\n\n## NN Outer: o1\n')
    const r = loadElementChain(path, { concept: 'Outer', slug: 'o1' })
    expect(r.ok === false && r.code).toBe('INVALID_SCOPE_DECLARATION')
  })
})
