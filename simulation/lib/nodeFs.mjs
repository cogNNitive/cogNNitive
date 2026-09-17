/**
 * Minimal Node-backed `DirectoryHandleLike` / `FileHandleLike` so the
 * simulation can drive `recursiveParse()` over a real folder on disk.
 *
 * innfo-core's recursive parser is written against the File System Access API
 * shape (the editor's runtime). This adapter is the Node mirror of it, kept
 * local to the simulation so it exercises only the package's public contract.
 */
import { readdir, readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'

const DEFAULT_IGNORE = new Set(['node_modules', '.git', 'dist', '.spec-cache', 'backups', 'archive'])

function createFileHandle(filePath, name) {
  return {
    kind: 'file',
    name,
    async getFile() {
      const text = await readFile(filePath, 'utf-8')
      return { text: async () => text }
    },
  }
}

export function createNodeDirectoryHandle(dirPath, ignore = DEFAULT_IGNORE) {
  return {
    kind: 'directory',
    name: basename(dirPath) || dirPath,
    async *entries() {
      let dirents = []
      try {
        dirents = await readdir(dirPath, { withFileTypes: true })
      } catch {
        return
      }
      for (const d of dirents) {
        if (ignore.has(d.name)) continue
        const full = join(dirPath, d.name)
        yield [d.name, d.isDirectory() ? createNodeDirectoryHandle(full, ignore) : createFileHandle(full, d.name)]
      }
    },
    async getDirectoryHandle(name) {
      return createNodeDirectoryHandle(join(dirPath, name), ignore)
    },
    async getFileHandle(name) {
      const full = join(dirPath, name)
      await readFile(full, 'utf-8')
      return createFileHandle(full, name)
    },
  }
}
