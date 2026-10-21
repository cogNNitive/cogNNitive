import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

/**
 * Walk up from `startDir` looking for a `.git` entry — a directory in a
 * normal checkout, a file in a git worktree/submodule — and return the
 * first directory that contains one. Returns null if none is found before
 * reaching the filesystem root, so callers can fall back to `process.cwd()`.
 */
export function findRepoRoot(startDir: string): string | null {
  let dir = startDir
  for (;;) {
    if (existsSync(join(dir, '.git'))) return dir
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}
