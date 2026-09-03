/**
 * Minimal subset of the File System Access API we depend on, so tests
 * can supply lightweight fakes instead of real browser handles.
 */
export interface WritableStreamLike {
  write(data: string): Promise<void>
  close(): Promise<void>
}

export interface FileHandleLike {
  kind: 'file'
  name: string
  getFile(): Promise<{ text(): Promise<string> }>
  /** Optional: only handles obtained with write intent implement this (mirrors FileSystemFileHandle.createWritable). */
  createWritable?(): Promise<WritableStreamLike>
}

export interface DirectoryHandleLike {
  kind: 'directory'
  name: string
  entries(): AsyncIterableIterator<[string, FileHandleLike | DirectoryHandleLike]>
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandleLike>
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandleLike>
  /** Optional: mirrors FileSystemDirectoryHandle.removeEntry (may not be available in all environments). */
  removeEntry?(name: string, options?: { recursive?: boolean }): Promise<void>
}

export function isDirectoryHandle(
  h: FileHandleLike | DirectoryHandleLike,
): h is DirectoryHandleLike {
  return h.kind === 'directory'
}

export function isFileHandle(h: FileHandleLike | DirectoryHandleLike): h is FileHandleLike {
  return h.kind === 'file'
}
