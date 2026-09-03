/**
 * App re-export — fs-types now live in @cognnitive/innfo-core.
 * This file preserves import paths for existing app code.
 */
export type { WritableStreamLike, FileHandleLike, DirectoryHandleLike } from '@cognnitive/innfo-core'
export { isDirectoryHandle, isFileHandle } from '@cognnitive/innfo-core'
