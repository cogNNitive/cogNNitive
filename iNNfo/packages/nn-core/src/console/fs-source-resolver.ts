/**
 * Filesystem-backed SourceResolver for console subsystem and CLI export.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, join, relative, resolve, isAbsolute } from 'node:path'
import { extractHeadings, levenshteinDistance } from '../sourceRef.js'
import { parseDomainImports } from '../imports/parser.js'
import { CANONICAL_DOMAIN_ENTRYPOINT } from '../layout.js'
import type { SourceResolver } from '../index.js'

/**
 * Read the domaiNN entrypoint's `## NN Imported Domain: <alias>` / `path::` declarations
 * and map each alias to the absolute directory it points at. An alias-prefixed citation
 * (`inbox>sources/import/x/article.md`) reaches a sibling domain that lives OUTSIDE
 * rootDir, which a plain `..` path may not do (the citation parser and the containment
 * guard both reject traversal). Returns an empty map when the workspace declares none.
 */
function readDomainAliases(rootDir: string): Map<string, string> {
  const aliases = new Map<string, string>()
  const entryPath = join(rootDir, CANONICAL_DOMAIN_ENTRYPOINT)
  let content: string
  try {
    content = readFileSync(entryPath, 'utf-8')
  } catch {
    return aliases
  }
  for (const domain of parseDomainImports(content).domains) {
    if (!domain.alias || !domain.path) continue
    if (/^[a-zA-Z]+:\/\//.test(domain.path) || isAbsolute(domain.path)) continue
    aliases.set(domain.alias.toLowerCase(), resolve(rootDir, domain.path))
  }
  return aliases
}

/** Split `alias>rest` into its parts, or null when the value carries no alias prefix. */
function splitAliasRef(refPath: string): { alias: string; rest: string } | null {
  const gt = refPath.indexOf('>')
  if (gt <= 0) return null
  const alias = refPath.slice(0, gt).trim()
  const rest = refPath.slice(gt + 1).trim()
  if (!alias || !rest) return null
  return { alias, rest }
}

/**
 * Resolve `rest` inside `dir`, refusing anything that escapes it. `refPath` outside an
 * imported domain has no meaning here: an imported domain is a root, not a parent.
 */
function resolveInside(
  dir: string,
  rest: string,
): { exists: boolean; content?: string; headings?: string[]; parentExists?: boolean } | null {
  const abs = resolve(dir, rest)
  const rel = relative(dir, abs)
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) return null
  try {
    const content = readFileSync(abs, 'utf-8')
    return { exists: true, headings: extractHeadings(content).map((h) => h.slug), content }
  } catch {
    return { exists: false, parentExists: existsSync(dirname(abs)) }
  }
}

/**
 * Creates a disk-backed SourceResolver that resolves sources relative to the referring
 * document by walking ancestor directories up to rootDir looking for sources/ directories,
 * with strict containment guards preventing path traversal, and reports parent directory
 * existence and fuzzy suggestions on failure.
 *
 * A citation prefixed with a declared imported-domain alias (`<alias>><workspace path>`)
 * resolves inside that sibling domain instead, with the same containment guard.
 */
export function createFsSourceResolver(rootDir: string): SourceResolver {
  const rootResolved = resolve(rootDir)
  let domainAliases: Map<string, string> | undefined
  return (refPath, referringPath) => {
    const aliased = splitAliasRef(refPath)
    if (aliased) {
      domainAliases ??= readDomainAliases(rootResolved)
      const aliasDir = domainAliases.get(aliased.alias.toLowerCase())
      if (aliasDir) {
        const inside = resolveInside(aliasDir, aliased.rest)
        if (inside) return inside
      }
    }

    const candidateDirs: string[] = []

    if (referringPath) {
      const absReferring = isAbsolute(referringPath)
        ? referringPath
        : resolve(rootDir, referringPath)
      let cur = dirname(absReferring)
      while (true) {
        const sourcesDir = join(cur, 'sources')
        if (existsSync(sourcesDir)) {
          candidateDirs.push(cur)
        }
        if (cur === rootResolved || dirname(cur) === cur) {
          break
        }
        const relToRoot = relative(rootResolved, cur)
        if (relToRoot.startsWith('..')) {
          break
        }
        cur = dirname(cur)
      }
    }

    if (!candidateDirs.includes(rootResolved)) {
      candidateDirs.push(rootResolved)
    }

    for (const dir of candidateDirs) {
      const abs = resolve(dir, refPath)
      const rel = relative(dir, abs)
      if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
        continue
      }
      if (existsSync(abs)) {
        try {
          const content = readFileSync(abs, 'utf-8')
          return {
            exists: true,
            headings: extractHeadings(content).map((h) => h.slug),
            content,
          }
        } catch {
          return { exists: false }
        }
      }
    }

    const primaryDir = candidateDirs[0] ?? rootResolved
    const targetAbs = resolve(primaryDir, refPath)
    const targetParent = dirname(targetAbs)
    const parentExists = existsSync(targetParent)

    if (!parentExists) {
      return { exists: false, parentExists: false }
    }

    let suggestions: string[] | undefined
    try {
      const entries = readdirSync(targetParent, { withFileTypes: true })
      const targetBase = basename(refPath)
      const targetStem = targetBase.replace(/\.[^.]+$/, '')
      const files = entries.filter((e) => e.isFile()).map((e) => e.name)
      const maxAllowed = Math.max(1, Math.min(3, Math.floor(targetStem.length / 3)))
      const scored = files
        .map((name) => {
          const candStem = name.replace(/\.[^.]+$/, '')
          return { name, dist: levenshteinDistance(targetStem, candStem) }
        })
        .filter((item) => item.dist > 0 && item.dist <= maxAllowed)
        .sort((a, b) => a.dist - b.dist)
      if (scored.length > 0) {
        suggestions = scored.map((s) => s.name)
      }
    } catch {
      // directory read error
    }

    return {
      exists: false,
      parentExists: true,
      suggestions,
    }
  }
}
