import type { JsonValue, ScopeNode } from './types.js'

/**
 * The element adapter: turns the declared scope elements of ONE document into
 * `ScopeNode`s, outermost first, ready to be appended to the folder nodes of the same
 * document. Pure: it receives elements the caller already parsed, so it needs no parser
 * and no filesystem, and it names no concept (concepts are data).
 */

/** One entry of the document frontmatter key `scope_elements`, outermost concept first. */
export interface ElementScopeDecl {
  concept: string
  /** Field holding a `[[title]]` reference to the parent element (previous listed concept). */
  parent?: string
}

/** A parsed element, as a plain structural shape. `elements` of a source are in document order. */
export interface ScopeElement {
  concept: string
  title: string
  slug: string
  fields: Readonly<Record<string, JsonValue>>
}

export interface ElementSource {
  /** Domain-relative path of the document. */
  doc: string
  decls: readonly ElementScopeDecl[]
  elements: readonly ScopeElement[]
  /** The document also carries the folder-scope flag (`scope: true`). */
  scopeFlag?: boolean
}

export interface ElementTarget {
  concept: string
  slug: string
}

export type ElementErrorCode =
  | 'AMBIGUOUS_SCOPE_DECLARATION'
  | 'INVALID_SCOPE_DECLARATION'
  | 'UNKNOWN_ELEMENT'
  | 'AMBIGUOUS_ELEMENT'
  | 'UNKNOWN_PARENT_ELEMENT'
  | 'AMBIGUOUS_PARENT_ELEMENT'

export type ElementChainResult =
  | { ok: true; nodes: ScopeNode[] }
  | { ok: false; code: ElementErrorCode; detail: string }

/** Fields that identify or mark an element rather than carry a value. */
const RESERVED_FIELDS = new Set(['slug', 'isolate'])

const fail = (code: ElementErrorCode, detail: string): { ok: false; code: ElementErrorCode; detail: string } => ({
  ok: false,
  code,
  detail,
})

const idOf = (doc: string, e: ScopeElement): string => `${doc}#${e.concept}/${e.slug}`

function nodeOf(doc: string, e: ScopeElement): ScopeNode {
  const values: Record<string, JsonValue> = {}
  for (const [key, value] of Object.entries(e.fields)) {
    if (!RESERVED_FIELDS.has(key)) values[key] = value
  }
  return { id: idOf(doc, e), kind: `element:${e.concept}`, doc, isolate: e.fields.isolate === true, values }
}

function checkDecls(decls: readonly ElementScopeDecl[]): string | null {
  const seen = new Set<string>()
  for (const [i, d] of decls.entries()) {
    if (typeof d.concept !== 'string' || d.concept.trim() === '') return `entry ${i} has no concept`
    if (seen.has(d.concept)) return `concept ${d.concept} is listed twice`
    seen.add(d.concept)
    if (d.parent !== undefined && (i === 0 || typeof d.parent !== 'string' || d.parent.trim() === '')) {
      return i === 0
        ? `${d.concept} is the first listed concept and cannot name a parent field`
        : `${d.concept} has an empty parent field`
    }
  }
  return null
}

const REFERENCE = /^\[\[([^\]]+)\]\]$/

type Parent = { ok: true; index: number } | { ok: false; code: ElementErrorCode; detail: string }

/** The index of the parent of `elements[index]`, whose concept is listed at `declIndex > 0`. */
function parentIndex(source: ElementSource, index: number, declIndex: number): Parent {
  const decl = source.decls[declIndex]
  const parentConcept = source.decls[declIndex - 1].concept
  const child = source.elements[index]
  const label = `${child.concept} "${child.title}"`

  if (decl.parent === undefined) {
    for (let i = index - 1; i >= 0; i--) {
      if (source.elements[i].concept === parentConcept) return { ok: true, index: i }
    }
    return fail('UNKNOWN_PARENT_ELEMENT', `${label} has no preceding ${parentConcept} element`)
  }

  const field = decl.parent
  const raw = child.fields[field]
  const match = typeof raw === 'string' ? REFERENCE.exec(raw.trim()) : null
  if (!match) return fail('UNKNOWN_PARENT_ELEMENT', `${label}: field ${field} is not a [[title]] reference`)
  const title = match[1].trim()
  const candidates = source.elements
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.concept === parentConcept && e.title === title)
  if (candidates.length === 0) {
    return fail('UNKNOWN_PARENT_ELEMENT', `${label}: field ${field} names no ${parentConcept} titled "${title}"`)
  }
  if (candidates.length > 1) {
    return fail('AMBIGUOUS_PARENT_ELEMENT', `${label}: field ${field} matches ${candidates.length} ${parentConcept} elements titled "${title}"`)
  }
  return { ok: true, index: candidates[0].i }
}

/**
 * The scope nodes that contain `target`, outermost first, the target last. Parents are
 * never guessed: an unresolved or ambiguous parent, an unlisted concept or a declaration
 * that cannot be read is a structured error. Same input, same output; the input is not
 * mutated and the result is plain JSON.
 */
export function elementChain(source: ElementSource, target: ElementTarget): ElementChainResult {
  if (source.scopeFlag === true && source.decls.length > 0) {
    return fail('AMBIGUOUS_SCOPE_DECLARATION', `${source.doc} declares both scope: true and scope_elements`)
  }
  const invalid = checkDecls(source.decls)
  if (invalid) return fail('INVALID_SCOPE_DECLARATION', `${source.doc}: ${invalid}`)

  const declIndex = source.decls.findIndex((d) => d.concept === target.concept)
  if (declIndex === -1) {
    return fail('UNKNOWN_ELEMENT', `${target.concept} is not a scope element concept of ${source.doc}`)
  }
  const matches = source.elements
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.concept === target.concept && e.slug === target.slug)
  if (matches.length === 0) {
    return fail('UNKNOWN_ELEMENT', `${source.doc} has no ${target.concept} element with slug ${target.slug}`)
  }
  if (matches.length > 1) {
    return fail('AMBIGUOUS_ELEMENT', `${source.doc} has ${matches.length} ${target.concept} elements with slug ${target.slug}`)
  }

  const nodes: ScopeNode[] = []
  let index = matches[0].i
  let level = declIndex
  for (;;) {
    nodes.unshift(nodeOf(source.doc, source.elements[index]))
    if (level === 0) break
    const parent = parentIndex(source, index, level)
    if (!parent.ok) return parent
    index = parent.index
    level -= 1
  }
  return { ok: true, nodes }
}
