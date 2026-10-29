import { readFileSync } from 'node:fs'
import { relative, resolve as resolvePath, sep } from 'node:path'
import { normalizeSource, parseElementHeadingFull, parseKnowledge } from '../parser/index.js'
import type { ElementNode } from '../types/index.js'
import { elementChain } from './elements.js'
import type { ElementErrorCode, ElementScopeDecl, ElementSource, ElementTarget, ScopeElement } from './elements.js'
import { findScopeChain } from './fs-chain.js'
import { loadChain } from './fs-layers.js'
import { asJson } from './json.js'
import type { LoadedChain } from './resolve.js'
import type { DocumentFailure, JsonValue, ScopeChain, ScopeChainResult } from './types.js'

/**
 * The element adapter's filesystem side: finds the folder chain of a document, reads the
 * document through nn-core's parser, builds the structural shape `elementChain` expects
 * and appends the element nodes to the folder nodes. All paths in results are
 * domain-relative POSIX; errors are structured and nothing here throws on bad data.
 */

export type ElementLoadErrorCode =
  | ElementErrorCode
  | 'NO_DOMAIN_ROOT'
  | 'DUPLICATE_SCOPE_MARKER'
  | 'MALFORMED_FRONTMATTER'
  | 'UNREADABLE_DOCUMENT'

export interface ElementLoadFailure {
  ok: false
  code: ElementLoadErrorCode
  detail: string
  /** `NO_DOMAIN_ROOT`: the directories searched, nearest first. */
  searched?: string[]
  /** `MALFORMED_FRONTMATTER`, `UNREADABLE_DOCUMENT` from the folder chain: the domain-relative document. */
  path?: string
}

export type ElementChainLoad =
  | { ok: true; loaded: LoadedChain; chain: ScopeChain }
  | ElementLoadFailure

export interface ScopeElementRef {
  concept: string
  title: string
  slug: string
}

export type ScopeElementList =
  | { ok: true; doc: string; elements: ScopeElementRef[] }
  | ElementLoadFailure

/** One element of a document and the chain that places it (or why it cannot be placed). */
export interface ElementChainEntry extends ScopeElementRef {
  result: ElementChainLoad
}

export type ElementChainsLoad = { ok: true; doc: string; chains: ElementChainEntry[] } | ElementLoadFailure

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v)

const fail = (code: ElementLoadErrorCode, detail: string, searched?: string[]): ElementLoadFailure =>
  searched ? { ok: false, code, detail, searched } : { ok: false, code, detail }

/** The `scope_elements` declarations of a frontmatter; undefined means none were declared. */
function declsOf(frontmatter: unknown, doc: string): ElementScopeDecl[] | ElementLoadFailure {
  const raw = isPlainObject(frontmatter) ? frontmatter['scope_elements'] : undefined
  if (raw === undefined || raw === null) return []
  if (!Array.isArray(raw) || !raw.every(isPlainObject)) {
    return fail('INVALID_SCOPE_DECLARATION', `${doc}: scope_elements must be a list of { concept, parent? } entries`)
  }
  // Entries are handed on as written: elementChain rejects an empty or repeated concept.
  return raw.map((entry) => entry as unknown as ElementScopeDecl)
}

const documentFailure = (f: DocumentFailure): ElementLoadFailure => ({ ok: false, code: f.code, detail: f.detail, path: f.path })

function chainFailure(found: Exclude<ScopeChainResult, { ok: true }>): ElementLoadFailure {
  if (found.code === 'NO_DOMAIN_ROOT') return fail('NO_DOMAIN_ROOT', 'no domaiNN_NN.md in the ancestry', found.searched)
  if (found.code === 'DUPLICATE_SCOPE_MARKER') {
    return fail('DUPLICATE_SCOPE_MARKER', `${found.dir || '.'} holds more than one scope marker: ${found.markers.join(', ')}`)
  }
  return documentFailure(found)
}

/**
 * The elements of `parsed` in the order their headings appear in `text`. `parsed.elements`
 * is keyed by concept, which loses the order across concepts (and across repeated sections
 * of one concept); each heading is matched to the next unplaced element of its concept and
 * name, so only the order comes from the text. Anything the scan cannot place keeps the
 * parser's order, after the rest.
 */
function inDocumentOrder(text: string, parsed: ReturnType<typeof parseKnowledge>): ElementNode[] {
  const queues = new Map<string, { nodes: ElementNode[]; next: number }>()
  for (const [concept, nodes] of parsed.elements.entries()) queues.set(concept.toLowerCase(), { nodes, next: 0 })
  const ordered: ElementNode[] = []
  for (const line of normalizeSource(text).split('\n')) {
    const heading = parseElementHeadingFull(line)
    const queue = heading ? queues.get(heading.concept.toLowerCase()) : undefined
    const node = queue?.nodes[queue.next]
    if (queue && node && node.name === heading?.name) {
      ordered.push(node)
      queue.next += 1
    }
  }
  for (const queue of queues.values()) ordered.push(...queue.nodes.slice(queue.next))
  return ordered
}

interface Opened {
  chain: ScopeChain
  doc: string
  source: ElementSource
}

/** The declaration for `concept`: one rule, case-insensitive, for sections and for targets alike. */
const declared = (decls: readonly ElementScopeDecl[], concept: string): ElementScopeDecl | undefined =>
  decls.find((d) => typeof d.concept === 'string' && d.concept.toLowerCase() === concept.toLowerCase())

/** Finds the chain of `path` and reads the document into the shape `elementChain` takes. */
function open(path: string): Opened | ElementLoadFailure {
  const found = findScopeChain(path)
  if (!found.ok) return chainFailure(found)
  const { chain } = found
  const abs = resolvePath(path)
  const doc = relative(chain.root, abs).split(sep).join('/')
  let parsed: ReturnType<typeof parseKnowledge>
  let text: string
  try {
    text = readFileSync(abs, 'utf-8')
    parsed = parseKnowledge(text)
  } catch (error) {
    return fail('UNREADABLE_DOCUMENT', `${doc}: ${error instanceof Error ? error.message : String(error)}`)
  }
  const decls = declsOf(parsed.frontmatter, doc)
  if (!Array.isArray(decls)) return decls

  // Document order across concepts; only the listed concepts matter, under the spelling the marker uses.
  const elements: ScopeElement[] = []
  for (const node of inDocumentOrder(text, parsed)) {
    const decl = declared(decls, node.type)
    if (!decl) continue
    const fields: Record<string, JsonValue> = {}
    for (const [key, value] of Object.entries(node.fields)) fields[key] = asJson(value)
    elements.push({ concept: decl.concept, title: node.name, slug: node.slug ?? node.name, fields })
  }
  const scopeFlag = isPlainObject(parsed.frontmatter) && parsed.frontmatter['scope'] === true
  return { chain, doc, source: { doc, decls, elements, scopeFlag } }
}

/**
 * The scopes that apply to `path`: the folder nodes, then (when `target` names an element
 * of the document) the element nodes, outermost first. `target: null` returns the folder
 * nodes only, which is what a document without `scope_elements` has. `floorDoc` is the
 * blueprint defaults document, injected by the caller as in `loadChain`. An element that
 * cannot be placed (unknown, ambiguous, or an unresolved parent reference) is a structured
 * error, never a guess. The target concept matches the declared one case-insensitively and
 * the nodes answer under the declared spelling.
 */
export function loadElementChain(
  path: string,
  target: ElementTarget | null,
  opts: { floorDoc?: { label: string; path: string } } = {},
): ElementChainLoad {
  if (target === null) {
    const found = findScopeChain(path)
    if (!found.ok) return chainFailure(found)
    const folder = loadChain(found.chain, opts)
    return folder.ok ? { ok: true, loaded: folder.loaded, chain: found.chain } : documentFailure(folder)
  }
  const opened = open(path)
  if (!('source' in opened)) return opened
  const folder = loadChain(opened.chain, opts)
  if (!folder.ok) return documentFailure(folder)
  return placeOn(opened, folder.loaded, target)
}

/** The element chain of `target` appended to an already loaded folder chain. */
function placeOn(opened: Opened, folder: LoadedChain, target: ElementTarget): ElementChainLoad {
  const concept = declared(opened.source.decls, target.concept)?.concept ?? target.concept
  const placed = elementChain(opened.source, { ...target, concept })
  if (!placed.ok) return fail(placed.code, placed.detail)
  return { ok: true, loaded: { floor: folder.floor, nodes: [...folder.nodes, ...placed.nodes] }, chain: opened.chain }
}

/**
 * Every element chain of one document, in document order: the document is parsed once and
 * the folder chain loaded once, then each element is placed on it. Each entry holds what
 * `loadElementChain` would return for that element, so one element that cannot be placed
 * does not hide the others. A failure of the document or of its folder chain fails the lot.
 */
export function loadElementChains(
  path: string,
  opts: { floorDoc?: { label: string; path: string } } = {},
): ElementChainsLoad {
  const opened = open(path)
  if (!('source' in opened)) return opened
  const { source, doc } = opened
  if (source.scopeFlag === true && source.decls.length > 0) {
    return fail('AMBIGUOUS_SCOPE_DECLARATION', `${doc} declares both scope: true and scope_elements`)
  }
  const folder = loadChain(opened.chain, opts)
  if (!folder.ok) return documentFailure(folder)
  return {
    ok: true,
    doc,
    chains: source.elements.map((e) => ({
      concept: e.concept,
      title: e.title,
      slug: e.slug,
      result: placeOn(opened, folder.loaded, { concept: e.concept, slug: e.slug }),
    })),
  }
}

/** Every scope element of a document, in document order, restricted to the listed concepts. */
export function listScopeElements(path: string): ScopeElementList {
  const opened = open(path)
  if (!('source' in opened)) return opened
  const { source, doc } = opened
  if (source.scopeFlag === true && source.decls.length > 0) {
    return fail('AMBIGUOUS_SCOPE_DECLARATION', `${doc} declares both scope: true and scope_elements`)
  }
  return {
    ok: true,
    doc,
    elements: source.elements.map((e) => ({ concept: e.concept, title: e.title, slug: e.slug })),
  }
}
