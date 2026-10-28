import { statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { ENTRYPOINT_FILENAME } from '../naming/contract.js'

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

/**
 * The domaiNN root of `path`: the nearest directory (the path's own directory
 * included) that holds a `domaiNN_NN.md`. `path` may be a document or a directory.
 *
 * This is the only root finder. It never reads `.git` or any version-control
 * metadata, so a domaiNN needs no repository. Returns null when no marker exists
 * in the ancestry; it never throws and never falls back to another root marker.
 */
export function findDomainRoot(path: string): string | null {
  let dir = resolve(path)
  if (isFile(dir)) dir = dirname(dir)
  for (;;) {
    if (isFile(join(dir, ENTRYPOINT_FILENAME))) return dir
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}
