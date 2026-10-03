/**
 * Filesystem-backed SourceResolver for console subsystem and CLI export.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, join, relative, resolve, isAbsolute } from 'node:path'
import { extractHeadings, levenshteinDistance } from '../sourceRef.js'
import type { SourceResolver } from '../index.js'

/**
 * Creates a disk-backed SourceResolver that resolves sources relative to the referring
 * document by walking ancestor directories up to rootDir looking for sources/ directories,
 * with strict containment guards preventing path traversal, and reports parent directory
 * existence and fuzzy suggestions on failure.
 */
export function createFsSourceResolver(rootDir: string): SourceResolver {
  const rootResolved = resolve(rootDir)
  return (refPath, referringPath) => {
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
