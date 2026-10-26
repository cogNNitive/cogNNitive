import { computeOriginHash } from './snapshot.js'
import type {
  ComputeImportDiffOptions,
  ImportDiffResult,
  ProposedChangeset,
} from './types.js'

export function computeImportDiff(opts: ComputeImportDiffOptions): ImportDiffResult {
  const newHash = computeOriginHash(opts.newElements)
  const oldHash = opts.currentHash

  if (oldHash && oldHash === newHash) {
    return {
      hasChanges: false,
      oldHash,
      newHash,
    }
  }

  let changeset: ProposedChangeset | undefined
  if (opts.targetFile && opts.sourceAddress) {
    changeset = {
      status: 'proposed',
      target: opts.targetFile,
      evidence: opts.sourceAddress,
      author: opts.author,
      timestamp: new Date().toISOString(),
    }
  }

  return {
    hasChanges: true,
    oldHash,
    newHash,
    changeset,
  }
}
