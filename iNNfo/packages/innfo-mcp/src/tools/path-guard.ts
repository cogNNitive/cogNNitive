/**
 * Workspace containment guards.
 *
 * MCP tool arguments (model ids, paths) and model frontmatter fields are
 * untrusted: they are composed by an LLM and can be steered by the content of
 * any document the agent reads. Every filesystem path derived from them must
 * be proven to stay inside the workspace root BEFORE it reaches `stat`,
 * `readFile`, `writeFile` or `mkdir`.
 *
 * `path.join` does NOT confine — `join('D:/ws/models', '../../Windows/win.ini')`
 * escapes to `D:\Windows\win.ini`. Use `isInsideRoot` on the joined result.
 *
 * This is the canonical implementation of the check that `query-units.ts` and
 * `validate.ts` already perform inline; new call sites should import it rather
 * than re-deriving it.
 */

import { isAbsolute, relative, resolve } from 'node:path'

/**
 * True when `candidate` resolves to a path strictly inside `rootDir`.
 *
 * `rootDir` itself is rejected: callers always target a file within the
 * workspace, never the workspace directory entry itself.
 */
export function isInsideRoot(rootDir: string, candidate: string): boolean {
  const abs = resolve(rootDir, candidate)
  const rel = relative(resolve(rootDir), abs)
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}

/**
 * True when `id` is safe to interpolate into a workspace-relative path.
 *
 * Rejects the three ways a path string escapes a root: parent-directory
 * segments, POSIX/UNC absolute paths, and Windows drive-qualified paths.
 * Nested ids (`sub/dir/model`) stay legal — containment of the joined result
 * is still enforced separately by `isInsideRoot`.
 */
export function isSafeRelativeId(id: string): boolean {
  if (!id) return false
  const normalized = id.replace(/\\/g, '/')
  if (normalized.split('/').includes('..')) return false
  if (normalized.startsWith('/')) return false
  if (isAbsolute(id)) return false
  if (/^[a-zA-Z]:[/\\]/.test(id)) return false
  if (/^[/\\]{2}/.test(id)) return false
  return true
}

/** True for `C:\x` / `C:/x`, and for the `/C:/x` form `fileURLToPath` yields off Windows. */
export function isDriveQualified(path: string): boolean {
  return /^\/?[a-zA-Z]:[/\\]/.test(path)
}

/**
 * Normalize a possibly drive-qualified path to the `drive:/segments` form.
 *
 * `fileURLToPath` prepends a POSIX slash when it decodes a Windows `file://`
 * URL on a non-Windows host (`file:///C:/x` becomes `/C:/x`), which would
 * otherwise hide the drive from {@link isDriveQualified}.
 */
function normalizeDrivePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\/(?=[a-zA-Z]:\/)/, '')
}

/**
 * True when a drive-qualified `candidate` resolves strictly inside a
 * drive-qualified `rootDir`, proven on the string form.
 *
 * `isInsideRoot` resolves against the host, so off Windows it does not see
 * `C:\x` as absolute and accepts it as a harmless relative name — which would
 * hand back a path that was never proven contained. Drive qualification is
 * absolute on every host, so containment is decided here instead: same drive
 * (case-insensitive) and a real path-segment prefix.
 *
 * A non-drive-qualified root (a POSIX root) can never contain a drive path.
 */
export function isDriveContained(rootDir: string | undefined, candidate: string): boolean {
  if (!rootDir) return false
  const root = normalizeDrivePath(rootDir).replace(/\/+$/, '')
  if (!isDriveQualified(root) || root.endsWith(':')) return false
  const path = normalizeDrivePath(candidate)
  return path.length > root.length && path.toLowerCase().startsWith(`${root.toLowerCase()}/`)
}
