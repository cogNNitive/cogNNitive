/**
 * Node filesystem snapshot reader for workspace lineage.
 * Scans sources/nn, sources/archive, sources/export, kNNowledge, and artifacts.
 * Node-only: NOT exported from browser.ts.
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { parseKnowledge } from '../parser/core.js'
import type { FileSnapshot } from '../queryUnits.js'
import { isNNName, isSidecarName, roleOf } from '../naming/contract.js'

function walkDir(
  dir: string,
  filter: (relPath: string, name: string, isDir: boolean) => boolean,
  baseDir = dir,
): string[] {
  if (!fs.existsSync(dir)) return []
  const results: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const fullPath = path.join(dir, entry.name)
    const relPath = path.relative(baseDir, fullPath).split('\\').join('/')

    if (entry.isDirectory()) {
      if (filter(relPath, entry.name, true)) {
        results.push(...walkDir(fullPath, filter, baseDir))
      }
    } else if (entry.isFile()) {
      if (filter(relPath, entry.name, false)) {
        results.push(relPath)
      }
    }
  }

  return results
}

export function readLineageSnapshot(root: string): FileSnapshot[] {
  const snapshots: FileSnapshot[] = []
  const rootDir = path.resolve(root)

  // 1. sources/nn: .md and .csv files, excluding staging/ and archive/
  const sourcesNnDir = path.join(rootDir, 'sources', 'nn')
  if (fs.existsSync(sourcesNnDir)) {
    const rels = walkDir(sourcesNnDir, (rel, name, isDir) => {
      const lower = name.toLowerCase()
      if (isDir) {
        return lower !== 'staging' && lower !== 'archive'
      }
      if (isSidecarName(name)) return false
      return name.endsWith('.md') || name.endsWith('.csv')
    })
    for (const rel of rels) {
      const p = `sources/nn/${rel}`
      const full = path.join(sourcesNnDir, rel)
      snapshots.push({
        path: p,
        content: fs.readFileSync(full, 'utf8'),
      })
    }
  }

  // 2. sources/archive: **/*.md
  const sourcesArchiveDir = path.join(rootDir, 'sources', 'archive')
  if (fs.existsSync(sourcesArchiveDir)) {
    const rels = walkDir(sourcesArchiveDir, (_, name, isDir) => {
      if (isDir) return true
      return name.endsWith('.md')
    })
    for (const rel of rels) {
      const p = `sources/archive/${rel}`
      const full = path.join(sourcesArchiveDir, rel)
      snapshots.push({
        path: p,
        content: fs.readFileSync(full, 'utf8'),
      })
    }
  }

  // 3. sources/export: **/*.md
  const sourcesExportDir = path.join(rootDir, 'sources', 'export')
  if (fs.existsSync(sourcesExportDir)) {
    const rels = walkDir(sourcesExportDir, (_, name, isDir) => {
      if (isDir) return true
      return name.endsWith('.md')
    })
    for (const rel of rels) {
      const p = `sources/export/${rel}`
      const full = path.join(sourcesExportDir, rel)
      snapshots.push({
        path: p,
        content: fs.readFileSync(full, 'utf8'),
      })
    }
  }

  // 4. kNNowledge: **/*_NN.md of role `knowledge` (no cogNNitive records, catalogs, or sidecars)
  const knowledgeDir = path.join(rootDir, 'kNNowledge')
  if (fs.existsSync(knowledgeDir)) {
    const rels = walkDir(knowledgeDir, (_, name, isDir) => {
      if (isDir) return true
      return isNNName(name) && !isSidecarName(name)
    })
    for (const rel of rels) {
      const full = path.join(knowledgeDir, rel)
      const content = fs.readFileSync(full, 'utf8')
      const parsed = parseKnowledge(content)
      if (roleOf({ path: rel, parentSpecName: parsed.frontmatter?.parent_spec?.name }) !== 'knowledge') {
        continue
      }
      snapshots.push({
        path: `kNNowledge/${rel}`,
        content,
      })
    }
  }

  // 5. artifacts: **/*.{md,html,csv,json}
  const artifactsDir = path.join(rootDir, 'artifacts')
  if (fs.existsSync(artifactsDir)) {
    const rels = walkDir(artifactsDir, (_, name, isDir) => {
      if (isDir) return true
      const ext = path.extname(name).toLowerCase()
      if (isSidecarName(name)) return false
      return ['.md', '.html', '.htm', '.csv', '.json'].includes(ext)
    })
    for (const rel of rels) {
      const p = `artifacts/${rel}`
      const full = path.join(artifactsDir, rel)
      snapshots.push({
        path: p,
        content: fs.readFileSync(full, 'utf8'),
      })
    }
  }

  snapshots.sort((a, b) => a.path.localeCompare(b.path))
  return snapshots
}
