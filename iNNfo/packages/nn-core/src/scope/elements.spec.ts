import { describe, it, expect } from 'vitest'
import { elementChain } from './elements.js'
import type { ElementSource, ScopeElement } from './elements.js'
import { resolve } from './resolve.js'
import type { ScopeNode } from './types.js'

/**
 * The element adapter is pure: literal parsed elements in, `ScopeNode`s out. Concept
 * names below are data (`Outer`, `Inner`, `Leaf`), never core vocabulary.
 */
const DOC = 'docs/plan_NN.md'

const el = (concept: string, title: string, fields: ScopeElement['fields'] = {}, slug?: string): ScopeElement => ({
  concept,
  title,
  slug: slug ?? title.toLowerCase().replace(/\s+/g, '-'),
  fields,
})

const source = (elements: ScopeElement[], overrides: Partial<ElementSource> = {}): ElementSource => ({
  doc: DOC,
  decls: [{ concept: 'Outer' }, { concept: 'Inner' }],
  elements,
  ...overrides,
})

function chainOf(src: ElementSource, concept: string, slug: string) {
  const r = elementChain(src, { concept, slug })
  if (!r.ok) throw new Error(`${r.code}: ${r.detail}`)
  return r.nodes
}

describe('elementChain: nodes', () => {
  it('turns each listed element on the path into a node, outermost first', () => {
    const src = source([el('Outer', 'One'), el('Outer', 'Two'), el('Inner', 'Leaf one')])
    const nodes = chainOf(src, 'Inner', 'leaf-one')
    expect(nodes.map((n) => n.id)).toEqual([`${DOC}#Outer/two`, `${DOC}#Inner/leaf-one`])
    expect(nodes.map((n) => n.kind)).toEqual(['element:Outer', 'element:Inner'])
    expect(nodes.every((n) => n.doc === DOC)).toBe(true)
  })

  it('a first-listed element is a chain of one node', () => {
    const nodes = chainOf(source([el('Outer', 'One')]), 'Outer', 'one')
    expect(nodes.map((n) => n.id)).toEqual([`${DOC}#Outer/one`])
  })

  it('nests by document order: each inner element hangs from the nearest preceding outer one', () => {
    const src = source([
      el('Outer', 'First'),
      el('Inner', 'Early'),
      el('Outer', 'Second'),
      el('Inner', 'Late'),
    ])
    expect(chainOf(src, 'Inner', 'early').map((n) => n.id)).toEqual([`${DOC}#Outer/first`, `${DOC}#Inner/early`])
    expect(chainOf(src, 'Inner', 'late').map((n) => n.id)).toEqual([`${DOC}#Outer/second`, `${DOC}#Inner/late`])
  })

  it('an unlisted concept is neither a node nor a parent', () => {
    const src = source([el('Outer', 'One'), el('Inner', 'Mid'), el('Leaf', 'Deep')])
    expect(chainOf(src, 'Inner', 'mid').map((n) => n.kind)).toEqual(['element:Outer', 'element:Inner'])
    const r = elementChain(src, { concept: 'Leaf', slug: 'deep' })
    expect(r).toMatchObject({ ok: false, code: 'UNKNOWN_ELEMENT' })
  })

  it('values are the element fields, without slug and isolate', () => {
    const src = source([el('Outer', 'One', { colour: 'red', size: 3, slug: 'one', isolate: false })])
    const [node] = chainOf(src, 'Outer', 'one')
    expect(node.values).toEqual({ colour: 'red', size: 3 })
    expect(Object.hasOwn(node.values, 'slug')).toBe(false)
    expect(Object.hasOwn(node.values, 'isolate')).toBe(false)
  })
})

describe('elementChain: isolate', () => {
  it('isolate:: true (strict boolean) marks the node isolated', () => {
    const src = source([el('Outer', 'One', { isolate: true })])
    expect(chainOf(src, 'Outer', 'one')[0].isolate).toBe(true)
  })

  it('isolate:: "true" (text) does not', () => {
    const src = source([el('Outer', 'One', { isolate: 'true' })])
    expect(chainOf(src, 'Outer', 'one')[0].isolate).toBe(false)
  })
})

describe('elementChain: parent reference', () => {
  const withRef = (ref: ElementSource['elements'][number]['fields'][string] | undefined, extra: ScopeElement[] = []) =>
    source([el('Inner', 'Early', ref === undefined ? {} : { outer_ref: ref }), el('Outer', 'Target'), ...extra], {
      decls: [{ concept: 'Outer' }, { concept: 'Inner', parent: 'outer_ref' }],
    })

  it('resolves a [[title]] reference whatever the document order', () => {
    const src = withRef('[[Target]]')
    expect(chainOf(src, 'Inner', 'early').map((n) => n.id)).toEqual([`${DOC}#Outer/target`, `${DOC}#Inner/early`])
  })

  it('a reference names the parent even when a nearer outer element exists', () => {
    const src = source([el('Outer', 'Far'), el('Outer', 'Near'), el('Inner', 'Leaf', { outer_ref: '[[Far]]' })], {
      decls: [{ concept: 'Outer' }, { concept: 'Inner', parent: 'outer_ref' }],
    })
    expect(chainOf(src, 'Inner', 'leaf')[0].id).toBe(`${DOC}#Outer/far`)
  })

  it.each([
    ['field absent', undefined],
    ['not a [[title]] reference', 'Target'],
    ['not a string', 7],
    ['names no element', '[[Nobody]]'],
  ])('%s is UNKNOWN_PARENT_ELEMENT', (_label, ref) => {
    const r = elementChain(withRef(ref as never), { concept: 'Inner', slug: 'early' })
    expect(r).toMatchObject({ ok: false, code: 'UNKNOWN_PARENT_ELEMENT' })
    expect(r.ok ? '' : r.detail).toContain('outer_ref')
  })

  it('a title shared by two outer elements is AMBIGUOUS_PARENT_ELEMENT, never a pick', () => {
    const src = withRef('[[Target]]', [el('Outer', 'Target', {}, 'target-2')])
    const r = elementChain(src, { concept: 'Inner', slug: 'early' })
    expect(r).toMatchObject({ ok: false, code: 'AMBIGUOUS_PARENT_ELEMENT' })
  })

  it('without parent, an inner element before every outer one has no parent to guess', () => {
    const src = source([el('Inner', 'Orphan'), el('Outer', 'Later')])
    expect(elementChain(src, { concept: 'Inner', slug: 'orphan' })).toMatchObject({
      ok: false,
      code: 'UNKNOWN_PARENT_ELEMENT',
    })
  })
})

describe('elementChain: declarations and targets', () => {
  it('scope: true together with scope_elements is AMBIGUOUS_SCOPE_DECLARATION', () => {
    const src = source([el('Outer', 'One')], { scopeFlag: true })
    expect(elementChain(src, { concept: 'Outer', slug: 'one' })).toMatchObject({
      ok: false,
      code: 'AMBIGUOUS_SCOPE_DECLARATION',
    })
  })

  it('a malformed declaration list is INVALID_SCOPE_DECLARATION', () => {
    const dup = source([el('Outer', 'One')], { decls: [{ concept: 'Outer' }, { concept: 'Outer' }] })
    expect(elementChain(dup, { concept: 'Outer', slug: 'one' })).toMatchObject({
      ok: false,
      code: 'INVALID_SCOPE_DECLARATION',
    })
    const firstParent = source([el('Outer', 'One')], { decls: [{ concept: 'Outer', parent: 'x' }] })
    expect(elementChain(firstParent, { concept: 'Outer', slug: 'one' })).toMatchObject({
      ok: false,
      code: 'INVALID_SCOPE_DECLARATION',
    })
  })

  it('a target that matches no element is UNKNOWN_ELEMENT', () => {
    const src = source([el('Outer', 'One')])
    expect(elementChain(src, { concept: 'Outer', slug: 'nope' })).toMatchObject({ ok: false, code: 'UNKNOWN_ELEMENT' })
  })

  it('a slug shared by two elements of the concept is AMBIGUOUS_ELEMENT', () => {
    const src = source([el('Outer', 'One'), el('Outer', 'One again', {}, 'one')])
    expect(elementChain(src, { concept: 'Outer', slug: 'one' })).toMatchObject({
      ok: false,
      code: 'AMBIGUOUS_ELEMENT',
    })
  })

  it('is deterministic and JSON-safe, and does not mutate its input', () => {
    const src = source([el('Outer', 'One', { colour: 'red', tags: ['a', 'b'] }), el('Inner', 'Leaf')])
    const before = JSON.stringify(src)
    const a = elementChain(src, { concept: 'Inner', slug: 'leaf' })
    const b = elementChain(src, { concept: 'Inner', slug: 'leaf' })
    expect(a).toEqual(b)
    expect(JSON.parse(JSON.stringify(a))).toEqual(a)
    expect(JSON.stringify(src)).toBe(before)
    const err = elementChain(src, { concept: 'Inner', slug: 'missing' })
    expect(JSON.parse(JSON.stringify(err))).toEqual(err)
  })
})

describe('element nodes in the fold', () => {
  const folder = (id: string, values: ScopeNode['values'], isolate = false): ScopeNode => ({
    id,
    kind: id === '' ? 'root' : 'scope',
    doc: id === '' ? 'root_NN.md' : `${id}/values_NN.md`,
    isolate,
    values,
  })
  const floor: ScopeNode = { id: 'bluepriNNt:demo', kind: 'floor', doc: 'defaults_NN.md', isolate: false, values: { level: 'floor' } }

  const src = source([el('Outer', 'One', { level: 'outer' }), el('Inner', 'Leaf', { level: 'inner' })])

  it('the innermost element wins and the folder scope it displaces is reported', () => {
    const folderNodes = [folder('', { level: 'root' }), folder('group', { level: 'group' })]
    const nodes = [...folderNodes, ...chainOf(src, 'Inner', 'leaf')]
    const r = resolve({ floor, nodes }, 'level', 'override')
    if (!r.ok) throw new Error(r.code)
    expect(r.value).toBe('inner')
    expect(r.explain.winner).toEqual({ scope: `${DOC}#Inner/leaf`, doc: DOC })
    expect(r.explain.overridden.map((c) => c.scope)).toEqual([`${DOC}#Outer/one`, 'group', '', 'bluepriNNt:demo'])
  })

  it('an element without the key inherits it from the folder scope that has it', () => {
    const plain = source([el('Outer', 'One'), el('Inner', 'Leaf')])
    const nodes = [folder('', { level: 'root' }), folder('group', { level: 'group' }), ...chainOf(plain, 'Inner', 'leaf')]
    const r = resolve({ floor, nodes }, 'level', 'override')
    if (!r.ok) throw new Error(r.code)
    expect(r.value).toBe('group')
    expect(r.explain.winner?.scope).toBe('group')
  })

  it('an isolated element hides the folder nodes but not the floor', () => {
    const iso = source([el('Outer', 'One', { isolate: true }), el('Inner', 'Leaf')])
    const nodes = [folder('', { level: 'root', only_root: 'x' }), folder('group', { level: 'group' }), ...chainOf(iso, 'Inner', 'leaf')]
    const hidden = resolve({ floor, nodes }, 'only_root', 'override')
    if (!hidden.ok) throw new Error(hidden.code)
    expect(hidden.present).toBe(false)
    expect(hidden.explain.cutAt).toBe(`${DOC}#Outer/one`)
    const viaFloor = resolve({ floor, nodes }, 'level', 'override')
    if (!viaFloor.ok) throw new Error(viaFloor.code)
    expect(viaFloor.value).toBe('floor')
    expect(viaFloor.explain.winner?.scope).toBe('bluepriNNt:demo')
  })
})
