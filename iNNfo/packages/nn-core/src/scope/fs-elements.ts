import { readFileSync } from 'node:fs'
import { relative, resolve as resolvePath, sep } from 'node:path'
import { parseKnowledge } from '../parser/index.js'
import { elementChain } from './elements.js'
import type { ElementErrorCode, ElementScopeDecl, ElementSource, ElementTarget, ScopeElement } from './elements.js'
import { findScopeChain } from './fs-chain.js'
import { loadChain } from './fs-layers.js'
import { asJson } from './json.js'
import type { LoadedChain } from './resolve.js'
import type { JsonValue, ScopeChain, ScopeChainResult } from './types.js'

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
  | 'UNREADABLE_DOCUMENT'

export interface ElementLoadFailure {
  ok: false
  code: ElementLoadErrorCode
  detail: string
  /** `NO_DOMAIN_ROOT`: the directories searched, nearest first. */
  searched?: string[]
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

function chainFailure(found: Exclude<ScopeChainResult, { ok: true }>): ElementLoadFailure {
  return found.code === 'NO_DOMAIN_ROOT'
    ? fail('NO_DOMAIN_ROOT', 'no domaiNN_NN.md in the ancestry', found.searched)
    : fail('DUPLICATE_SCOPE_MARKER', `${found.dir || '.'} holds more than one scope marker: ${found.markers.join(', ')}`)
}

interface Opened {
  chain: ScopeChain
  doc: string
  source: ElementSource
}

/** Finds the chain of `path` and reads the document into the shape `elementChain` takes. */
function open(path: string): Opened | ElementLoadFailure {
  const found = findScopeChain(path)
  if (!found.ok) return chainFailure(found)
  const { chain } = found
  const abs = resolvePath(path)
  const doc = relative(chain.root, abs).split(sep).join('/')
  let parsed: ReturnType<typeof parseKnowledge>
  try {
    parsed = parseKnowledge(readFileSync(abs, 'utf-8'))
  } catch (error) {
    return fail('UNREADABLE_DOCUMENT', `${doc}: ${error instanceof Error ? error.message : String(error)}`)
  }
  const decls = declsOf(parsed.frontmatter, doc)
  if (!Array.isArray(decls)) return decls

  // `elements` is keyed by concept, so the document order across concepts is the order of
  // the concept sections; only the listed concepts matter, under the spelling the marker uses.
  const elements: ScopeElement[] = []
  for (const [section, nodes] of parsed.elements.entries()) {
    const decl = decls.find((d) => typeof d.concept === 'string' && d.concept.toLowerCase() === section.toLowerCase())
    if (!decl) continue
    for (const node of nodes) {
      const fields: Record<string, JsonValue> = {}
      for (const [key, value] of Object.entries(node.fields)) fields[key] = asJson(value)
      elements.push({ concept: decl.concept, title: node.name, slug: node.slug ?? node.name, fields })
    }
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
 * error, never a guess.
 */
export function loadElementChain(
  path: string,
  target: ElementTarget | null,
  opts: { floorDoc?: { label: string; path: string } } = {},
): ElementChainLoad {
  if (target === null) {
    const found = findScopeChain(path)
    if (!found.ok) return chainFailure(found)
    return { ok: true, loaded: loadChain(found.chain, opts), chain: found.chain }
  }
  const opened = open(path)
  if (!('source' in opened)) return opened
  const placed = elementChain(opened.source, target)
  if (!placed.ok) return fail(placed.code, placed.detail)
  const folder = loadChain(opened.chain, opts)
  return {
    ok: true,
    loaded: { floor: folder.floor, nodes: [...folder.nodes, ...placed.nodes] },
    chain: opened.chain,
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
