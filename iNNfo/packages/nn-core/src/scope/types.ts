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

export type ScopeChainResult =
  | { ok: true; chain: ScopeChain }
  | { ok: false; code: 'NO_DOMAIN_ROOT'; searched: string[] }
  | { ok: false; code: 'DUPLICATE_SCOPE_MARKER'; dir: string; markers: string[] }

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
}
