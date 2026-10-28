import { readFile, writeFile, readdir, stat } from 'node:fs/promises'
import { join, relative, basename as pathBasename } from 'node:path'
import {
  ENTRYPOINT_FILENAME,
  reconcileManifest,
  isReconcilableModel,
  parseFrontmatter,
  parentSpecNameOf,
  displayStem,
} from '@cognnitive/nn-core'
import type { DiscoveredModel, ManifestChange, CandidateFile } from '@cognnitive/nn-core'

/**
 * sync_workspace_manifest — the headless (MCP) caller of `reconcileManifest`
 * (AD-09: an nn-mcp tool, not a new actioNN CLI binary). Mirrors the
 * editor's write-guard: only writes when a mutating change was computed.
 */

export interface SyncWorkspaceManifestInput {
  root?: string
  dry_run?: boolean
}

export interface SyncWorkspaceManifestResult {
  dry_run: boolean
  manifest_path: string
  changes: ManifestChange[]
  diff?: string
  written: boolean
}

/** Directories that are never worth walking into looking for model files. */
const SKIP_DIR_NAMES = new Set(['node_modules', '.git'])

function toRelative(root: string, filePath: string): string {
  return relative(root, filePath).replace(/\\/g, '/')
}

async function walkMarkdownFiles(dir: string, out: string[] = []): Promise<string[]> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (err) {
    /* v8 ignore start */
    // swallow deliberately: a workspace dir may legitimately not exist.
    if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      console.warn(`[workspace-sync] Failed to readdir ${dir}: ${err}`)
    }
    return out
    /* v8 ignore stop */
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) continue
      const child = join(dir, entry.name)
      // A nested domaiNN is its own root: the outer manifest does not absorb it.
      if (await hasEntrypoint(child)) continue
      await walkMarkdownFiles(child, out)
    } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
      out.push(join(dir, entry.name))
    }
  }
  return out
}

/** True when `dir` holds its own `domaiNN_NN.md`, i.e. it is a (nested) domaiNN root. */
async function hasEntrypoint(dir: string): Promise<boolean> {
  try {
    return (await stat(join(dir, ENTRYPOINT_FILENAME))).isFile()
  } catch {
    return false
  }
}

async function discoverCandidates(
  root: string,
  manifestRelPath: string,
): Promise<DiscoveredModel[]> {
  const files = await walkMarkdownFiles(root)
  const discovered: DiscoveredModel[] = []

  for (const filePath of files) {
    const relPath = toRelative(root, filePath)
    let content: string
    try {
      content = await readFile(filePath, 'utf-8')
    } catch (err) {
      /* v8 ignore start */
      // swallow deliberately: an unreadable md file is skipped.
      console.warn(`[workspace-sync] Failed to read ${filePath}: ${err}`)
      continue
      /* v8 ignore stop */
    }

    const frontmatter = (parseFrontmatter(content) ?? {}) as Record<string, unknown>
    const candidate: CandidateFile = { path: relPath, frontmatter }
    if (!isReconcilableModel(candidate, manifestRelPath)) continue

    const title =
      typeof frontmatter['title'] === 'string' ? (frontmatter['title'] as string).trim() : ''
    discovered.push({
      path: relPath,
      name: title !== '' ? title : displayStem(pathBasename(relPath)),
      template: parentSpecNameOf(frontmatter),
    })
  }

  return discovered
}

/**
 * Builds a single-hunk unified diff between two full-file strings. Not a
 * general Myers diff — sufficient for `reconcileManifest`'s always-localized
 * edits (status flips, appended blocks), which never touch more than one
 * contiguous region of the file.
 */
export function buildUnifiedDiff(oldContent: string, newContent: string, path: string): string {
  if (oldContent === newContent) return ''
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')

  let prefix = 0
  while (
    prefix < oldLines.length &&
    prefix < newLines.length &&
    oldLines[prefix] === newLines[prefix]
  ) {
    prefix++
  }

  let oldEnd = oldLines.length
  let newEnd = newLines.length
  while (oldEnd > prefix && newEnd > prefix && oldLines[oldEnd - 1] === newLines[newEnd - 1]) {
    oldEnd--
    newEnd--
  }

  const removed = oldLines.slice(prefix, oldEnd)
  const added = newLines.slice(prefix, newEnd)

  const header = [
    `--- a/${path}`,
    `+++ b/${path}`,
    `@@ -${prefix + 1},${removed.length} +${prefix + 1},${added.length} @@`,
  ]
  const body = [...removed.map((l) => `-${l}`), ...added.map((l) => `+${l}`)]
  return [...header, ...body].join('\n')
}

/**
 * Reconciles the workspace manifest against discovered Level-3 model files.
 * `dry_run` (default `true`) reports `changes`/`diff` without writing.
 */
export async function syncWorkspaceManifest(
  root: string,
  options: { dry_run?: boolean } = {},
): Promise<SyncWorkspaceManifestResult> {
  const dryRun = options.dry_run !== false

  if (!(await hasEntrypoint(root))) {
    return { dry_run: dryRun, manifest_path: '', changes: [], written: false }
  }
  const manifestPath = join(root, ENTRYPOINT_FILENAME)

  const manifestRelPath = toRelative(root, manifestPath)
  const manifestContent = await readFile(manifestPath, 'utf-8')
  const discovered = await discoverCandidates(root, manifestRelPath)
  const { content, changes } = reconcileManifest(manifestContent, discovered)

  const mutating = changes.some((c) => c.kind !== 'skipped-not-owned')
  let written = false
  let diff: string | undefined

  if (mutating) {
    diff = buildUnifiedDiff(manifestContent, content, manifestRelPath)
    if (!dryRun) {
      await writeFile(manifestPath, content, 'utf-8')
      written = true
    }
  }

  return {
    dry_run: dryRun,
    manifest_path: manifestRelPath,
    changes,
    ...(diff !== undefined ? { diff } : {}),
    written,
  }
}

export const syncDomainManifest = syncWorkspaceManifest

