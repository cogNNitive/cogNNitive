import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { cognitivize, type RejectReason, type NormalizerAdapter } from '@cognnitive/innfo-core'
import { isInsideRoot, isSafeRelativeId } from './path-guard.js'
import { findRepoRoot } from './repo-root.js'

export type CognitivizeToolResult =
  | { status: 'written' | 'refreshed' | 'unchanged'; sidecar: string; sha256: string }
  | { status: 'requires-cli'; path: string; message: string }
  | { status: 'rejected'; path: string; reason: RejectReason | 'outside-root' }

/**
 * Resolves the normalizer adapter from nn-sources if available.
 * Searches:
 *  1. INNFO_SOURCES_DIR env var
 *  2. Skills under repo root (development worktree / checkout)
 *  3. ~/.agents/skills/nn-sources/scripts/lib/normalizer.js
 *  4. Inside rootDir/skills/nn-sources/...
 */
export function resolveNormalizer(rootDir: string): NormalizerAdapter | null {
  const candidates: string[] = []

  if (process.env.INNFO_SOURCES_DIR) {
    candidates.push(join(process.env.INNFO_SOURCES_DIR, 'scripts', 'lib', 'normalizer.js'))
  }

  const repo = findRepoRoot(rootDir) || findRepoRoot(process.cwd())
  if (repo) {
    candidates.push(join(repo, 'skills', 'nn-sources', 'scripts', 'lib', 'normalizer.js'))
  }

  candidates.push(join(homedir(), '.agents', 'skills', 'nn-sources', 'scripts', 'lib', 'normalizer.js'))
  candidates.push(join(rootDir, 'skills', 'nn-sources', 'scripts', 'lib', 'normalizer.js'))

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      try {
        const req = createRequire(candidate)
        const mod = req(candidate)
        if (typeof mod.createNormalizer === 'function') {
          return mod.createNormalizer({ projectDir: rootDir })
        }
      } catch {
        // Fall through to next candidate if require fails
      }
    }
  }

  return null
}

/**
 * `cognitivize` tool: creates or refreshes the sidecar of one raw file in place.
 *
 * Text-native files (md, csv, json) are handled directly. Binary formats (pdf, docx, ...)
 * are converted if the nn-sources normalizer adapter is available in the environment.
 * If no normalizer is available, it gracefully returns `requires-cli`.
 */
export async function cognitivizeTool(
  rootDir: string,
  path: string,
  options: { normalizer?: NormalizerAdapter } = {},
): Promise<CognitivizeToolResult> {
  if (!path || !isSafeRelativeId(path) || !isInsideRoot(rootDir, path)) {
    return { status: 'rejected', path, reason: 'outside-root' }
  }

  const normalizer = 'normalizer' in options ? (options.normalizer ?? undefined) : (resolveNormalizer(rootDir) ?? undefined)
  const result = await cognitivize(rootDir, path, { normalizer })

  if (result.status === 'requires-normalizer') {
    return {
      status: 'requires-cli',
      path: result.path,
      message: `"${result.path}" is a binary format; use the nn-sources CLI (--cognitivize ${result.path}) to convert it. The MCP server could not resolve a converter adapter.`,
    }
  }
  return result
}
