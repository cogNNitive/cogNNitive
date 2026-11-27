/**
 * Node-backed change log reader. Node-only: NOT exported from `browser.ts`.
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { walkLineage } from '../lineage/fs-snapshot.js'
import { indexedChangesets } from '../changeset/changeset-index.js'
import {
  buildChangeLogFromChangesets,
  changesetLikeOf,
  isChangesetPath,
  type ChangeLog,
  type ChangesetLike,
} from './load.js'

/**
 * The change log of the domaiNN at `rootDir`: the same log as
 * `buildChangeLog(readLineageSnapshot(rootDir))`, read without the snapshot. It walks the
 * domaiNN as the snapshot does and takes every changeset's parse from the persistent
 * changeset index, so only new or changed changesets are read and parsed. A changeset
 * that parses names the `changes` bluepriNNt, so the snapshot's role filter always keeps
 * it; one that does not parse is skipped by both. Ordering is `compareChanges`
 * (`createChangeLog`), never the file order.
 */
export function loadChangeLog(rootDir: string): ChangeLog {
  const root = path.resolve(rootDir)
  if (!fs.existsSync(root)) return buildChangeLogFromChangesets([])
  const { files, listing } = walkLineage(root)
  const paths = files.filter(isChangesetPath).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  const parses = indexedChangesets(root, paths, listing)
  const changesets: ChangesetLike[] = []
  for (const rel of paths) {
    const doc = parses.get(rel)
    if (doc) changesets.push(changesetLikeOf(rel, doc))
  }
  return buildChangeLogFromChangesets(changesets)
}
