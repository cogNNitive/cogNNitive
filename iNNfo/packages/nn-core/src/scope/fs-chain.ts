import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { ENTRYPOINT_FILENAME, parseName } from '../naming/contract.js'
import { parseFrontmatter } from '../parser/index.js'
import { buildScopeChain } from './chain.js'
import type { DirProbe } from './chain.js'
import { findDomainRoot } from './root.js'
import type { DocumentFailure, ScopeChain, ScopeChainResult } from './types.js'

const NO_MARKERS: DirProbe = { hasEntrypoint: false, scopeMarkers: [] }

function startDirOf(path: string): string {
  const abs = resolve(path)
  try {
    return statSync(abs).isFile() ? dirname(abs) : abs
  } catch {
    return abs
  }
}

function parentOf(dir: string): string | null {
  const parent = dirname(dir)
  return parent === dir ? null : parent
}

/** The `_NN.md` documents of `dir` (the entrypoint and sidecars excluded), sorted by name. */
function knowledgeDocsOf(dir: string): string[] {
  let names: string[]
  try {
    names = readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name)
  } catch {
    return []
  }
  return names
    .filter((name) => {
      if (name === ENTRYPOINT_FILENAME) return false
      const parsed = parseName(name)
      return parsed.kind === 'nn' && parsed.sidecarOf === undefined
    })
    .sort()
}

function posix(root: string, path: string): string {
  return relative(root, path).split(sep).join('/')
}

/**
 * Reads the `_NN.md` documents of `dir` for scope markers. A document that cannot be read
 * or whose frontmatter does not parse is recorded in `failures` rather than skipped: a
 * silent skip would drop a scope, or the `isolate` that ends the chain.
 */
function probeDir(dir: string, root: string, failures: DocumentFailure[]): DirProbe {
  const scopeMarkers: Array<{ path: string; isolate: boolean }> = []
  for (const name of knowledgeDocsOf(dir)) {
    const path = join(dir, name)
    let text: string
    try {
      text = readFileSync(path, 'utf-8')
    } catch (error) {
      failures.push({
        ok: false,
        code: 'UNREADABLE_DOCUMENT',
        path: posix(root, path),
        detail: error instanceof Error ? error.message : String(error),
      })
      continue
    }
    const problems: string[] = []
    const fm = parseFrontmatter(text, (message) => problems.push(message)) as unknown as Record<string, unknown> | null
    if (problems.length > 0) {
      failures.push({ ok: false, code: 'MALFORMED_FRONTMATTER', path: posix(root, path), detail: problems.join('; ') })
      continue
    }
    if (fm?.['scope'] === true) scopeMarkers.push({ path, isolate: fm['isolate'] === true })
  }
  return { hasEntrypoint: dir === root, scopeMarkers }
}

function toRelative(chain: ScopeChain): ScopeChain {
  const { root } = chain
  return {
    root,
    cutAt: chain.cutAt === null ? null : posix(root, chain.cutAt),
    links: chain.links.map((l) => ({
      ...l,
      dir: posix(root, l.dir),
      valuesDoc: l.valuesDoc === null ? null : posix(root, l.valuesDoc),
    })),
  }
}

/**
 * The folder adapter's entry point: the chain of scopes enclosing `path` (a document or
 * a directory), outermost first. The root comes from `findDomainRoot`, the only root
 * finder; a sub-scope is a directory holding exactly one `_NN.md` document whose
 * frontmatter declares `scope: true` (strict boolean). `isolate: true` ends the chain.
 * Link directories and documents are domain-relative POSIX; `root` is absolute. A `_NN.md`
 * on the way that cannot be read, or whose frontmatter does not parse, is an error naming
 * it (`UNREADABLE_DOCUMENT`, `MALFORMED_FRONTMATTER`): the chain it might have shaped is
 * unknown, so none is returned.
 */
export function findScopeChain(path: string): ScopeChainResult {
  const start = startDirOf(path)
  const root = findDomainRoot(start)
  if (root === null) return buildScopeChain(start, () => NO_MARKERS, parentOf)

  const failures: DocumentFailure[] = []
  const result = buildScopeChain(start, (dir) => probeDir(dir, root, failures), parentOf)
  if (failures.length > 0) return failures[0]
  if (result.ok) return { ok: true, chain: toRelative(result.chain) }
  if (result.code === 'DUPLICATE_SCOPE_MARKER') {
    return {
      ok: false,
      code: 'DUPLICATE_SCOPE_MARKER',
      dir: posix(root, result.dir),
      markers: result.markers.map((m) => posix(root, m)),
    }
  }
  return result
}

function isInside(base: string, path: string): boolean {
  const rel = relative(base, path)
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel)
}

export type ChainLookup =
  | { ok: true; path: string | null; searched: string[] }
  | { ok: false; code: 'PATH_OUTSIDE_SCOPE'; detail: string }

/**
 * Named lookup along a chain: the first existing `<scope dir>/<rel>`, nearest scope
 * first, never above the chain's outermost link (the root, or the isolated scope that
 * cut it). `searched` lists every candidate path tried, in order. A `rel` that is
 * absolute, or that resolves outside the outermost link from any scope, is refused with
 * `PATH_OUTSIDE_SCOPE` before anything is looked up.
 */
export function findInChain(chain: ScopeChain, target: { rel: string }): ChainLookup {
  const outermost = chain.links.length > 0 ? resolve(chain.root, chain.links[0].dir) : chain.root
  const candidates = chain.links.map((link) => resolve(chain.root, link.dir, target.rel)).reverse()
  if (isAbsolute(target.rel) || !candidates.every((c) => isInside(outermost, c))) {
    return { ok: false, code: 'PATH_OUTSIDE_SCOPE', detail: `"${target.rel}" leaves the scope chain rooted at ${chain.links[0]?.dir || '.'}` }
  }
  const searched: string[] = []
  for (const candidate of candidates) {
    searched.push(candidate)
    try {
      if (statSync(candidate).isFile()) return { ok: true, path: candidate, searched }
    } catch {
      // not here: keep climbing
    }
  }
  return { ok: true, path: null, searched }
}
