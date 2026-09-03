/**
 * Additive helpers for the format-core programmatic surface.
 * These do NOT change any existing behavior — they provide convenience
 * wrappers that the MCP server consumes.
 */
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

/* ── Version resolution ──────────────────────────────────────── */

/**
 * SemVer pattern as used in iNNfo filenames: `_V_MAJOR-MINOR-PATCH_`
 */
const VERSION_FILENAME_RE = /_V_(\d+-\d+-\d+)_/

/**
 * Extract the SemVer (e.g. `0-1-1`) from an iNNfo filename like
 * `Ghostbusters_V_0-1-0_business_NN.md` → `0-1-0`.
 * Returns `null` if no version marker is found.
 */
export function resolveSpecVersionFromFilename(filename: string): string | null {
  const match = filename.match(VERSION_FILENAME_RE)
  return match ? match[1] : null
}

/* ── Model scanning ──────────────────────────────────────────── */

export interface ModelInfo {
  /** Short model identifier (filename stem, used as `id` in MCP tools) */
  id: string
  /** Absolute filesystem path */
  path: string
  /** SemVer extracted from filename, e.g. `0-1-2` */
  version: string | null
}

const MD_FILE_RE = /\.md$/i

/** Directories that must never be scanned for model files. */
const IGNORED_DIRS = new Set(['backups', 'archive', 'specs', 'node_modules', '.git'])

function isIgnoredDir(name: string): boolean {
  return name.startsWith('.') || IGNORED_DIRS.has(name.toLowerCase())
}

async function collectModels(dir: string, models: ModelInfo[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (isIgnoredDir(entry.name)) continue
      await collectModels(join(dir, entry.name), models)
      continue
    }
    if (!entry.isFile()) continue
    if (!MD_FILE_RE.test(entry.name)) continue
    if (entry.name.toLowerCase() === 'index.md') continue

    const filePath = join(dir, entry.name)
    const id = entry.name.replace(MD_FILE_RE, '')
    const version = resolveSpecVersionFromFilename(entry.name)

    models.push({ id, path: filePath, version })
  }
}

/**
 * Scan a root directory (recursively) for iNNfo model files (`*.md`).
 * Skips `backups`, `archive`, `specs`, `node_modules`, `.git`,
 * and any dot-directory. Returns an array of `ModelInfo` sorted by id.
 */
export async function listModels(rootDir: string): Promise<ModelInfo[]> {
  const models: ModelInfo[] = []
  await collectModels(rootDir, models)
  models.sort((a, b) => a.id.localeCompare(b.id))
  return models
}
