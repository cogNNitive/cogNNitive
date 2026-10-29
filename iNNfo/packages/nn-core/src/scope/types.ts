/** Plain JSON data. Everything the scope module returns is made of these. */
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

/**
 * One link of a folder chain. Directory and document names are in the caller's
 * path space: `buildScopeChain` keeps whatever its probe speaks, `findScopeChain`
 * converts to domain-relative POSIX ('' is the root).
 */
export interface ScopeLink {
  dir: string
  /** The `scope: true` document that supplies this link's values, or null. */
  valuesDoc: string | null
  kind: 'root' | 'scope'
  isolate: boolean
}

/** Links run outermost first; the last link is the scope nearest the start. */
export interface ScopeChain {
  /** The domaiNN root (the directory holding `domaiNN_NN.md`), even when the chain is cut below it. */
  root: string
  links: ScopeLink[]
  /** The isolated scope directory that ended the chain, or null when it reaches the root. */
  cutAt: string | null
}

/** A document the adapters could not use. `path` is domain-relative POSIX. */
export interface DocumentFailure {
  ok: false
  code: 'MALFORMED_FRONTMATTER' | 'UNREADABLE_DOCUMENT'
  path: string
  detail: string
}

export type ScopeChainResult =
  | { ok: true; chain: ScopeChain }
  | { ok: false; code: 'NO_DOMAIN_ROOT'; searched: string[] }
  | { ok: false; code: 'DUPLICATE_SCOPE_MARKER'; dir: string; markers: string[] }
  | DocumentFailure

/**
 * One scope of the chain, as the fold sees it. The fold never sees paths: an adapter
 * (folder today, element later) turns a location into an ordered `ScopeNode[]`,
 * outermost first.
 */
export interface ScopeNode {
  /** Stable, domain-relative and JSON-safe: '' is the root, 'groups/x' a folder scope. */
  id: string
  /** Adapter-defined label ('root' | 'scope' | 'element'). The core never branches on it. */
  kind: string
  /** Supplier document, domain-relative, or null when the node has none. */
  doc: string | null
  isolate: boolean
  values: Readonly<Record<string, JsonValue>>
  /** Slot fillers this scope supplies: procedure id, then slot name. */
  fills?: Readonly<Record<string, Readonly<Record<string, JsonValue>>>>
  /** Procedures this scope defines. */
  procedures?: readonly ProcedureDef[]
}

/**
 * A named extension point of a procedure. `value` slots take plain data; `procedure`
 * slots take a reference to another procedure of the same chain, `{ procedure: id }`.
 */
export interface SlotDecl {
  name: string
  kind: 'value' | 'procedure'
  required: boolean
  default?: JsonValue
  /** Where in the procedure the slot sits: the slug of a step element of the procedure document. */
  step?: string
}

/** A nearer procedure's claim to replace an ancestor procedure as a whole. */
export interface ForkRecord {
  /** Id of the original procedure. */
  procedure: string
  /** Node id of the scope that defines the original ('' is the root). */
  scope: string
  /** The original's version when the fork was made. */
  version: string
}

export interface ProcedureDef {
  id: string
  /** Node id of the defining scope. */
  scope: string
  /** Defining document, domain-relative. */
  doc: string
  version: string | null
  slots: readonly SlotDecl[]
  forkOf?: ForkRecord
}
