#!/usr/bin/env node
// legacy:lineage-single-edge/hash-slug-migrate

/**
 * scripts/migrate-hash-citations.mjs
 *
 * Codemod: Migrates legacy `#slug` citations to canonical `@` single-edge grammar
 * across non-frozen workspace and repository content.
 *
 * Uses `innfo-core` primitives (`extractHeadings`, `serializeKnowledgeUnitRef`,
 * `parseCitation`) from the committed skill mirror.
 *
 * Excludes frozen historical specs/samples (`_V_*`, `docs/innfo/samples/`,
 * `_samples_nn/`, and test fixtures).
 *
 * Enforces LF line endings on all modified files.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { resolve, relative, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const req = createRequire(import.meta.url)
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')

function loadCoreMirror() {
  const mirrorPath = join(REPO_ROOT, 'skills', 'nn-trannsform', 'scripts', 'lib', 'innfo-core.generated.cjs')
  return req(mirrorPath)
}

const mirror = loadCoreMirror()
const {
  parseCitation,
  extractHeadings,
  serializeKnowledgeUnitRef,
} = mirror

const INCLUDED_EXTENSIONS = new Set([
  '.md',
  '.json',
  '.vue',
  '.ts',
  '.js',
  '.mjs',
  '.html',
  '.yaml',
  '.yml',
])

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'archive',
  'dist',
  'temp',
  '.claude',
])

/**
 * Checks if a relative path should be skipped from migration.
 * @param {string} relPath - Relative path from workspace/repo root.
 * @param {boolean} [_isDir=false] - Whether the path is a directory.
 * @returns {boolean}
 */
export function shouldSkip(relPath, _isDir = false) {
  const normalized = relPath.replace(/\\/g, '/')
  const segments = normalized.split('/')

  for (const seg of segments) {
    if (EXCLUDED_DIRS.has(seg)) return true
  }

  if (normalized.startsWith('openspec/changes/archive/') || normalized.startsWith('openspec/archive/')) {
    return true
  }

  // Skip frozen historical versions, samples, and test fixtures per spec
  if (normalized.includes('_V_')) return true
  if (normalized.startsWith('docs/innfo/samples/') || normalized.includes('/docs/innfo/samples/')) return true
  if (normalized.startsWith('_samples_nn/') || normalized.includes('/_samples_nn/')) return true
  if (normalized.includes('/fixtures/') || normalized.startsWith('fixtures/') || normalized.endsWith('/fixtures')) {
    return true
  }

  if (normalized === 'legacy-ledger.yaml') return true
  if (normalized.endsWith('.bundle.js')) return true

  return false
}

/**
 * Collect all candidate files matching inclusion and skip filters.
 * @param {string} dir - Absolute directory path to walk.
 * @param {string} root - Base root directory.
 * @returns {string[]} Absolute file paths.
 */
export function collectFiles(dir, root) {
  const files = []
  if (!existsSync(dir)) return files

  const entries = readdirSync(dir)

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const relPath = relative(root, fullPath)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      if (!shouldSkip(relPath, true)) {
        files.push(...collectFiles(fullPath, root))
      }
    } else {
      if (!shouldSkip(relPath, false)) {
        const ext = extname(entry)
        if (INCLUDED_EXTENSIONS.has(ext)) {
          files.push(fullPath)
        }
      }
    }
  }

  return files
}

const HASH_CITATION_RE = /((?:sources\/(?:nn|export)\/|kNNowledge\/|[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.md)#([a-z0-9]+(?:-[a-z0-9]+)*)/g

/**
 * Rewrites #slug citations in content to canonical @ citations.
 * @param {string} content - Original text content.
 * @param {string} relPath - Relative path of the file being processed.
 * @param {(refPath: string) => string | null} resolveSourceFile - Helper to read referenced source text.
 * @returns {{ updated: string, count: number }}
 */
export function migrateContent(content, relPath, resolveSourceFile) {
  let count = 0

  const updated = content.replace(HASH_CITATION_RE, (match, filePathPart, slugPart) => {
    const rawCandidate = `${filePathPart}#${slugPart}`
    const parsed = /** @type {any} */ (parseCitation(rawCandidate))
    if (!parsed || !parsed.legacyHash || !parsed.slug) {
      return match
    }

    // Try to resolve target file content
    let targetText = resolveSourceFile(parsed.filePath)
    if (!targetText && filePathPart !== parsed.filePath) {
      targetText = resolveSourceFile(filePathPart)
    }

    if (!targetText) {
      return match
    }

    const headings = extractHeadings(targetText)
    const targetHeading = headings.find((h) => h.slug === parsed.slug)

    if (!targetHeading) {
      return match
    }

    const unit = {
      kind: 'header',
      level: targetHeading.level,
      text: targetHeading.text,
      slug: targetHeading.slug,
    }

    const canonical = serializeKnowledgeUnitRef(parsed.filePath, unit)
    count++
    return canonical
  })

  return { updated, count }
}

/**
 * Runs migration across the workspace.
 * @param {{ workspaceRoot?: string, dryRun?: boolean, verbose?: boolean }} options
 * @returns {{ modifiedFiles: number, totalReplacements: number }}
 */
export function runMigration({ workspaceRoot = REPO_ROOT, dryRun = false, verbose = false } = {}) {
  const root = resolve(workspaceRoot)
  const files = collectFiles(root, root)

  // Cache for source files
  const fileCache = new Map()
  const resolveSource = (rel) => {
    const normalized = rel.replace(/\\/g, '/')
    if (fileCache.has(normalized)) return fileCache.get(normalized)

    const candidatePaths = [
      join(root, normalized),
      join(root, 'sources', 'nn', normalized),
      join(root, 'sources', normalized),
    ]

    for (const cand of candidatePaths) {
      if (existsSync(cand) && !statSync(cand).isDirectory()) {
        const text = readFileSync(cand, 'utf8')
        fileCache.set(normalized, text)
        return text
      }
    }

    fileCache.set(normalized, null)
    return null
  }

  let modifiedFiles = 0
  let totalReplacements = 0

  for (const file of files) {
    const relPath = relative(root, file)
    const content = readFileSync(file, 'utf8')
    const { updated, count } = migrateContent(content, relPath, resolveSource)

    if (count > 0) {
      modifiedFiles++
      totalReplacements += count
      if (verbose || !dryRun) {
        console.log(`  [MIGRATE] (${count} replacements) ${relPath}`)
      }

      if (!dryRun) {
        const lfContent = updated.replace(/\r\n/g, '\n')
        writeFileSync(file, lfContent, 'utf8')
      }
    }
  }

  return { modifiedFiles, totalReplacements }
}

// CLI execution
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const dryRun = process.argv.includes('--dry-run')
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v')

  let wsRoot = REPO_ROOT
  const wsIdx = process.argv.indexOf('--workspace')
  if (wsIdx !== -1 && wsIdx + 1 < process.argv.length) {
    wsRoot = process.argv[wsIdx + 1]
  }

  console.log(`[migrate-hash-citations] Scanning ${wsRoot}${dryRun ? ' (DRY RUN)' : ''}...`)
  const report = runMigration({ workspaceRoot: wsRoot, dryRun, verbose: true })
  console.log(
    `\n[migrate-hash-citations] Complete: ${report.modifiedFiles} files modified, ${report.totalReplacements} citations migrated.${
      dryRun ? ' (DRY RUN - no files written)' : ''
    }`
  )
}
