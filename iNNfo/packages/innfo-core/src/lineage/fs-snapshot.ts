/**
 * Node filesystem snapshot reader for workspace lineage.
 * Walks the whole domaiNN (excluded paths pruned), reads text formats, and
 * skips binaries: their sidecars represent them.
 * Node-only: NOT exported from browser.ts.
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { parseKnowledge } from '../parser/core.js'
import type { FileSnapshot } from '../queryUnits.js'
import { isExcludedPath, isNNName, isSidecarName, roleOf } from '../naming/contract.js'
import { findLineageRecord } from './record.js'

/** Formats read as text; any other extension is a binary represented by its sidecar. */
const TEXT_EXTENSIONS = new Set(['.md', '.csv', '.json', '.html', '.htm'])

function walkDir(dir: string, baseDir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const fullPath = path.join(dir, entry.name)
    const relPath = path.relative(baseDir, fullPath).split('\\').join('/')
    if (isExcludedPath(relPath)) continue
    if (entry.isDirectory()) {
      walkDir(fullPath, baseDir, out)
    } else if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      out.push(relPath)
    }
  }
}

export function readLineageSnapshot(root: string): FileSnapshot[] {
  const rootDir = path.resolve(root)
  if (!fs.existsSync(rootDir)) return []

  const rels: string[] = []
  walkDir(rootDir, rootDir, rels)

  const snapshots: FileSnapshot[] = []
  for (const rel of rels) {
    const content = fs.readFileSync(path.join(rootDir, rel), 'utf8')
    // `_NN.md` documents: sidecars and knowledge only (no record, entrypoint, spec, catalog, or procedure).
    if (isNNName(rel) && !isSidecarName(rel)) {
      const parsed = parseKnowledge(content)
      if (roleOf({ path: rel, parentSpecName: parsed.frontmatter?.parent_spec?.name }) !== 'knowledge') {
        continue
      }
    }
    snapshots.push({ path: rel, content })
  }

  snapshots.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  return snapshots
}

/**
 * The lineage record of the domaiNN (role `lineage-record`, at most one), read
 * as-is with no line-ending conversion, or `null` when there is none.
 * `readLineageSnapshot` skips the record, so the gate reads it here.
 */
export function readLineageRecord(root: string): FileSnapshot | null {
  const rootDir = path.resolve(root)
  if (!fs.existsSync(rootDir)) return null

  const rels: string[] = []
  walkDir(rootDir, rootDir, rels)
  const candidates = rels
    .filter((rel) => isNNName(rel))
    .map((rel) => ({ path: rel, content: fs.readFileSync(path.join(rootDir, rel), 'utf8') }))
  return findLineageRecord(candidates)
}
