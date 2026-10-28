import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { ENTRYPOINT_FILENAME, parseName } from '../naming/contract.js'
import { parseFrontmatter } from '../parser/index.js'
import { buildScopeChain } from './chain.js'
import type { DirProbe } from './chain.js'
import { findDomainRoot } from './root.js'
import type { ScopeChain, ScopeChainResult } from './types.js'

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

function probeDir(dir: string, root: string): DirProbe {
  const scopeMarkers: Array<{ path: string; isolate: boolean }> = []
  for (const name of knowledgeDocsOf(dir)) {
    const path = join(dir, name)
    let text: string
    try {
      text = readFileSync(path, 'utf-8')
    } catch {
      continue
    }
    const fm = parseFrontmatter(text) as unknown as Record<string, unknown> | null
    if (fm?.['scope'] === true) scopeMarkers.push({ path, isolate: fm['isolate'] === true })
  }
  return { hasEntrypoint: dir === root, scopeMarkers }
}

function posix(root: string, path: string): string {
  return relative(root, path).split(sep).join('/')
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
 * Link directories and documents are domain-relative POSIX; `root` is absolute.
 */
export function findScopeChain(path: string): ScopeChainResult {
  const start = startDirOf(path)
  const root = findDomainRoot(start)
  if (root === null) return buildScopeChain(start, () => NO_MARKERS, parentOf)

  const result = buildScopeChain(start, (dir) => probeDir(dir, root), parentOf)
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

/**
 * Named lookup along a chain: the first existing `<scope dir>/<rel>`, nearest scope
 * first, never above the chain's outermost link (the root, or the isolated scope that
 * cut it). `searched` lists every candidate path tried, in order.
 */
export function findInChain(
  chain: ScopeChain,
  target: { rel: string },
): { path: string | null; searched: string[] } {
  const searched: string[] = []
  for (let i = chain.links.length - 1; i >= 0; i--) {
    const candidate = join(chain.root, chain.links[i].dir, target.rel)
    searched.push(candidate)
    try {
      if (statSync(candidate).isFile()) return { path: candidate, searched }
    } catch {
      // not here: keep climbing
    }
  }
  return { path: null, searched }
}
