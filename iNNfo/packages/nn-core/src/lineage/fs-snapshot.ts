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
import { SYNC_DIR } from '../sync/address.js'

/** Formats read as text; any other extension is a binary represented by its sidecar. */
const TEXT_EXTENSIONS = new Set(['.md', '.csv', '.json', '.html', '.htm'])

function walkDir(dir: string, baseDir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const fullPath = path.join(dir, entry.name)
    const relPath = path.relative(baseDir, fullPath).split('\\').join('/')
    if (isExcludedPath(relPath)) continue
    // Mirrors are models owned by an origin; their elements are not this domaiNN's lineage.
    if (relPath === SYNC_DIR) continue
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
    // `_NN.md` documents: sidecars, knowledge and changesets only (no record,
    // entrypoint, spec, catalog, or procedure). A changeset is a lineage node.
    if (isNNName(rel) && !isSidecarName(rel)) {
      const parsed = parseKnowledge(content)
      const role = roleOf({ path: rel, parentSpecName: parsed.frontmatter?.parent_spec?.name })
      if (role !== 'knowledge' && role !== 'changeset') {
        continue
      }
    }
    snapshots.push({ path: rel, content })
  }

  snapshots.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  return snapshots
}
