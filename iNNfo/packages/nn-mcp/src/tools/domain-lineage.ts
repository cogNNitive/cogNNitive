import {
  buildChangeLog,
  createSnapshotParses,
  readLineageSnapshot,
  type ChangeLog,
  type FileSnapshot,
  type SnapshotParses,
} from '@cognnitive/nn-core'

/**
 * The lineage of one domaiNN as one tool call reads it: the snapshot, the change log
 * built over it, and the parses both made (changes-ledger-scaling S3). A caller that
 * runs several lineage readers (`check_domain`) builds it once and passes it to each.
 * Never outlives the call: a later call reads the domain again.
 */
export interface DomainLineage {
  files: FileSnapshot[]
  log: ChangeLog
  parses: SnapshotParses
}

/** Reads the snapshot of `rootDir` and builds its change log, each file parsed once. */
export function readDomainLineage(rootDir: string): DomainLineage {
  const parses = createSnapshotParses()
  const files = readLineageSnapshot(rootDir, parses)
  return { files, log: buildChangeLog(files, parses), parses }
}
