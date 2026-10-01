/**
 * Filesystem-backed SourceResolver for console subsystem and CLI export.
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, isAbsolute } from 'node:path'
import { extractHeadings } from '../sourceRef.js'
import type { SourceResolver } from '../index.js'

/**
 * Creates a disk-backed SourceResolver that resolves sources relative to the referring
 * document by walking ancestor directories up to rootDir looking for sources/ directories,
 * with strict containment guards preventing path traversal.
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

    return { exists: false }
  }
}
