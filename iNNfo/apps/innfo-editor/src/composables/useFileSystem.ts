/**
 * useFileSystem — File System Access API utilities.
 *
 * Provides helpers for scanning directories, reading file content, and
 * verifying handle permissions. All functions are designed for the
 * File System Access API (Chromium-based browsers).
 */
import type { DirectoryHandleLike, FileHandleLike } from '../model/fs-types'

export interface FileSystemEntry {
  name: string
  kind: 'file' | 'directory'
  handle: FileHandleLike | DirectoryHandleLike
}

export interface ScanResult {
  files: FileSystemEntry[]
  errors: string[]
}

/**
 * Checks whether the browser supports the File System Access API.
 * Returns true when `showDirectoryPicker` exists on `window`.
 */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

/**
 * Recursively scans a directory handle and returns all entries.
 *
 * - `maxDepth` prevents infinite loops on symlink cycles (default 10).
 * - Errors for individual sub-trees are collected (not thrown) so a
 *   partial scan result is still usable.
 */
export async function scanDirectory(
  handle: DirectoryHandleLike,
  maxDepth = 10,
  currentDepth = 0,
): Promise<ScanResult> {
  const result: ScanResult = { files: [], errors: [] }

  if (currentDepth > maxDepth) {
    result.errors.push(`Max depth (${maxDepth}) exceeded at "${handle.name}"`)
    return result
  }

  try {
    for await (const [name, entry] of handle.entries()) {
      result.files.push({ name, kind: entry.kind, handle: entry })

      if (entry.kind === 'directory') {
        const sub = await scanDirectory(entry as DirectoryHandleLike, maxDepth, currentDepth + 1)
        result.files.push(...sub.files)
        result.errors.push(...sub.errors)
      }
    }
  } catch (err) {
    result.errors.push(
      `Failed to scan "${handle.name}": ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  return result
}

/**
 * Reads the full text content from a file handle via `getFile().text()`.
 * Throws on network / permission errors propagated by the API.
 */
export async function readFileContent(handle: FileHandleLike): Promise<string> {
  const file = await handle.getFile()
  return await file.text()
}

/**
 * Verifies the directory handle is usable by requesting read permission
 * and performing a single-entry iteration check.
 *
 * Returns `true` when the handle is ready to use, `false` when permission
 * was denied or the handle is stale.
 */
export async function connectDirectory(handle: DirectoryHandleLike): Promise<boolean> {
  try {
    const perm = await (
      handle as unknown as { requestPermission?: (opts: { mode: string }) => Promise<string> }
    ).requestPermission?.({ mode: 'read' })

    if (perm === 'denied' || perm === 'prompt') return false

    // Quick sanity check: verify we can iterate at least one entry
    for await (const _ of handle.entries()) {
      break
    }

    return true
  } catch {
    return false
  }
}
