/**
 * Node filesystem snapshot reader for workspace lineage.
 * Walks the whole domaiNN (excluded paths pruned), reads text formats, and
 * skips binaries: their sidecars represent them.
 * Node-only: NOT exported from browser.ts.
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { FileSnapshot } from '../queryUnits.js'
import { isExcludedPath, isNNName, isSidecarName, roleOf } from '../naming/contract.js'
import { SYNC_DIR } from '../sync/address.js'
import { parsedKnowledgeOf, type SnapshotParses } from './snapshot-parses.js'
import { isChangesetPath } from '../changelog/load.js'
import { indexedChangesets, type ChangesetListing } from '../changeset/changeset-index.js'

/** Formats read as text; any other extension is a binary represented by its sidecar. */
const TEXT_EXTENSIONS = new Set(['.md', '.csv', '.json', '.html', '.htm'])

/** The text files the lineage walk keeps, plus what it listed (for the changeset index). */
export interface LineageWalk {
  /** Workspace-relative POSIX paths of the text files the walk keeps, in walk order. */
  files: string[]
  listing: ChangesetListing
}

function walkDir(
  dir: string,
  baseDir: string,
  out: string[],
  dirs: Set<string>,
  seen: Set<string>,
): void {
  dirs.add(path.relative(baseDir, dir).split('\\').join('/'))
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    const relPath = path.relative(baseDir, fullPath).split('\\').join('/')
    seen.add(relPath)
    if (entry.name.startsWith('.')) continue
    if (isExcludedPath(relPath)) continue
    // Mirrors are models owned by an origin; their elements are not this domaiNN's lineage.
    if (relPath === SYNC_DIR) continue
    if (entry.isDirectory()) {
      walkDir(fullPath, baseDir, out, dirs, seen)
    } else if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      out.push(relPath)
    }
  }
}

/** Walks `rootDir` as the lineage snapshot does, without reading any file. */
export function walkLineage(rootDir: string): LineageWalk {
  const files: string[] = []
  const dirs = new Set<string>()
  const seen = new Set<string>()
  if (fs.existsSync(rootDir)) walkDir(rootDir, rootDir, files, dirs, seen)
  return { files, listing: { dirs, seen } }
}

/**
 * Reads the lineage snapshot of `root`. With `parses`, the `parseKnowledge` of every
 * `_NN.md` it reads is recorded there, so the readers of this snapshot reuse it, and the
 * `parseChangeset` of every changeset is taken from the persistent changeset index
 * (`changeset-index.ts`) instead of being parsed again.
 */
export function readLineageSnapshot(root: string, parses?: SnapshotParses): FileSnapshot[] {
  const rootDir = path.resolve(root)
  if (!fs.existsSync(rootDir)) return []

  const { files: rels, listing } = walkLineage(rootDir)

  // Stat (through the index) before reading the contents below.
  const indexed = parses
    ? indexedChangesets(rootDir, rels.filter(isChangesetPath), listing)
    : undefined

  const snapshots: FileSnapshot[] = []
  for (const rel of rels) {
    const content = fs.readFileSync(path.join(rootDir, rel), 'utf8')
    // `_NN.md` documents: sidecars, knowledge and changesets only (no record,
    // entrypoint, spec, catalog, or procedure). A changeset is a lineage node.
    if (isNNName(rel) && !isSidecarName(rel)) {
      const parsed = parsedKnowledgeOf(parses, rel, content)
      const role = roleOf({ path: rel, parentSpecName: parsed.frontmatter?.parent_spec?.name })
      if (role !== 'knowledge' && role !== 'changeset') {
        continue
      }
    }
    if (parses && indexed?.has(rel)) {
      const doc = indexed.get(rel)!
      // The same document `parseChangeset(content)` returns, raw text included.
      parses.changesets.set(rel, doc === null ? null : { ...doc, rawContent: content })
    }
    snapshots.push({ path: rel, content })
  }

  snapshots.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  return snapshots
}
