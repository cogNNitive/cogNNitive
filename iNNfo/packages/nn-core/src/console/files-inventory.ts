/**
 * Pure inventory, lineage, sidecar validation, and gap calculation helpers
 * for the Domain Console Files section.
 *
 * Sidecars follow the workspace convention `<file>.<ext>_sidecar_NN.md`
 * (see naming/contract.ts `isSidecarName`), not a `.source.json` blob.
 */

import { createHash } from 'node:crypto'
import { isSidecarName } from '../naming/contract.js'

export type FileCategory = 'source' | 'asset' | 'evidence' | 'artifact' | 'unclassified'

export interface FileSidecarStatus {
  path: string
  exists: boolean
  valid: boolean
  sourceFile?: string
  sha256?: string
  /** True when the sidecar's recorded digest matches the subject file. */
  sha256Matches?: boolean
  sourceFormat?: string
  author?: string
  normalizedAt?: string
  /** Alias of the Synchronization that landed the file (sidecar key `synchronization`). */
  synchronization?: string
  /** Where the file came from (sidecar key `origin_uri`). */
  originUri?: string
  /** Path of the file at its origin (sidecar key `origin_path`). */
  originPath?: string
  error?: string
}

export interface FileInventoryEntry {
  /** POSIX path relative to the workspace root (e.g. "sources/import/interview.pdf"). */
  id: string
  path: string
  category: FileCategory
  size: number
  /** Full lowercase hex SHA-256 of the file bytes. */
  sha256: string
  mimeType: string
  mtime?: string
  sidecar?: FileSidecarStatus
  /** Knowledge unit citations targeting this file. */
  citationsCount: number
  /** Citations that carry an excerpt (the "used section" signal). */
  excerptCount: number
  /** Changesets referencing this file as evidence. */
  changesCount: number
  /** True for source-like files no unit cites and no changeset references. */
  uncited: boolean
  /** Bounded text preview. Never raw binary. */
  snippet?: string
  /** True when the preview was cut at the per-file byte cap. */
  snippetTruncated?: boolean
}

/** A Synchronization origin, or an origin known only from sidecar keys (`adhoc`). */
export interface OriginDescriptor {
  id: string
  alias?: string
  origin: string
  kind: 'file' | 'folder' | 'url'
  state: 'active' | 'paused' | 'adhoc'
  /** Inventory ids attributed to the origin. */
  files: string[]
}

export interface FilesStats {
  totalFiles: number
  totalBytes: number
  categoryCounts: Record<FileCategory, number>
  storageByCategory: Record<FileCategory, number>
  /** Cited source-like files / source-like files, 0..1. */
  sourceCoverageRate: number
  uncitedSourceCount: number
  sidecarMissingCount: number
  sidecarInvalidCount: number
  sidecarMismatchCount: number
  /** Total citations that carry an excerpt. */
  excerptCount: number
}

export interface ArtifactReverseLineageEntry {
  artifactId: string
  artifactPath: string
  unitIds: string[]
  changesetIds: string[]
  sourcePaths: string[]
}

export interface ConsolePayloadFiles {
  inventory: FileInventoryEntry[]
  origins: OriginDescriptor[]
  stats: FilesStats
  lineage: Record<string, ArtifactReverseLineageEntry>
}

export function isSourceLike(category: FileCategory): boolean {
  return category === 'source'
}

/**
 * Models that live under `sources/` have no sidecar by design: the mirrored
 * models under `sources/sync/` and the `sources/sources_NN.md` catalog.
 */
export function isMirrorFile(relPath: string): boolean {
  const p = relPath.replace(/\\/g, '/').replace(/^\/+/, '')
  return p.startsWith('sources/sync/') || p === 'sources/sources_NN.md'
}

/**
 * Classifies a workspace relative path into one of the canonical categories.
 *
 * Real workspace layout (see nn-sources): `sources/import/` holds the raw
 * imported documents, `sources/sync/` the mirrored models, `sources/assets/`
 * the media, `sources/conversations/` the transcripts and `sources/archive/`
 * the retired items. A path that matches no known layout is `unclassified`.
 */
export function classifyFileCategory(relPath: string): FileCategory {
  const norm = relPath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (norm.startsWith('artifacts/') || norm === 'domaiNN_console.html') return 'artifact'
  if (norm.startsWith('assets/') || norm.startsWith('sources/assets/')) return 'asset'
  if (norm.startsWith('evidence/') || norm.startsWith('sources/evidence/')) return 'evidence'
  if (norm.startsWith('sources/') || norm.startsWith('conversations/')) return 'source'
  return 'unclassified'
}

/**
 * Computes SHA-256 over raw bytes. Never round-trips through UTF-8, so binary
 * files (pdf, mp3, png) hash exactly.
 */
export function computeFileSha256(content: string | Uint8Array): string {
  return createHash('sha256').update(content).digest('hex')
}

/** Returns the canonical MIME type for a given file path. */
export function mimeTypeFromPath(filePath: string): string {
  const lower = filePath.toLowerCase()
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'text/markdown'
  if (lower.endsWith('.txt')) return 'text/plain'
  if (lower.endsWith('.json')) return 'application/json'
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html'
  if (lower.endsWith('.css')) return 'text/css'
  if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) return 'text/javascript'
  if (lower.endsWith('.ts')) return 'text/typescript'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.csv')) return 'text/csv'
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return 'application/yaml'
  return 'application/octet-stream'
}

export function isTextMime(mimeType: string): boolean {
  return (
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/yaml'
  )
}

/** Suffix of a sidecar document. Kept as a string: the naming contract owns the pattern. */
const SIDECAR_SUFFIX = '_sidecar_NN.md'

/** True for the canonical sidecar document name (delegates to the naming contract). */
export function isSidecarPath(relPath: string): boolean {
  return isSidecarName(relPath)
}

/** `sources/import/a.pdf_sidecar_NN.md` -> `sources/import/a.pdf` */
export function sidecarSubjectPath(sidecarRel: string): string {
  if (!isSidecarName(sidecarRel)) return sidecarRel
  return sidecarRel.slice(0, sidecarRel.length - SIDECAR_SUFFIX.length)
}

/** `sources/import/a.pdf` -> `sources/import/a.pdf_sidecar_NN.md` */
export function sidecarPathFor(relPath: string): string {
  return relPath + SIDECAR_SUFFIX
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/

function frontmatterEntry(block: string, key: string): string | undefined {
  const m = new RegExp('^' + key + ':\\s*(.+?)\\s*$', 'm').exec(block)
  if (!m) return undefined
  return m[1].replace(/^["']|["']$/g, '').trim()
}

/**
 * Parses and validates a sidecar markdown document.
 * Never throws on malformed input or schema violations.
 */
export function parseAndValidateSidecar(
  sidecarContent: string | null | undefined,
  sidecarPath: string,
  subjectSha256?: string,
): FileSidecarStatus {
  if (sidecarContent === null || sidecarContent === undefined) {
    return { path: sidecarPath, exists: false, valid: false }
  }
  const match = String(sidecarContent).match(FRONTMATTER_RE)
  if (!match) {
    return { path: sidecarPath, exists: true, valid: false, error: 'Missing YAML frontmatter' }
  }
  const block = match[1]
  const sourceFile = frontmatterEntry(block, 'source_file')
  const sha256 = (frontmatterEntry(block, 'sha256') || '').toLowerCase()
  if (!sourceFile) {
    return { path: sidecarPath, exists: true, valid: false, error: 'Missing source_file' }
  }
  if (!/^[0-9a-f]{64}$/.test(sha256)) {
    return {
      path: sidecarPath,
      exists: true,
      valid: false,
      sourceFile,
      error: 'Missing or malformed sha256',
    }
  }
  return {
    path: sidecarPath,
    exists: true,
    valid: true,
    sourceFile,
    sha256,
    sha256Matches: subjectSha256 ? sha256 === subjectSha256.toLowerCase() : undefined,
    sourceFormat: frontmatterEntry(block, 'source_format'),
    author: frontmatterEntry(block, 'author'),
    normalizedAt: frontmatterEntry(block, 'normalized_at'),
    synchronization: frontmatterEntry(block, 'synchronization'),
    originUri: frontmatterEntry(block, 'origin_uri'),
    originPath: frontmatterEntry(block, 'origin_path'),
  }
}

function normalizePosix(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\/+/, '').split('#')[0].trim()
}

export interface FileLineageArtifact {
  id: string
  path: string
  unitIds?: string[]
  content?: string
}

export interface FileLineageElement {
  id: string
  slug?: string
  citations?: Record<string, Array<{ path?: string; href?: string }>>
  history?: Array<{ changeset?: string; changesetId?: string; changeId?: string }>
}

export interface FileLineageChangeset {
  id?: string
  path?: string
  changes?: Array<{ id: string; target?: string; evidence?: string }>
  evidence?: string
}

/**
 * Resolves the 4-tier reverse lineage for artifacts:
 * Artifact <- Units <- Changes <- Original Files.
 */
export function resolveArtifactReverseLineage(
  artifacts: FileLineageArtifact[],
  elements: FileLineageElement[],
  changes: FileLineageChangeset[],
  sources: Array<{ id: string; path: string }>,
): Record<string, ArtifactReverseLineageEntry> {
  const result: Record<string, ArtifactReverseLineageEntry> = {}
  if (!Array.isArray(artifacts)) return result
  const sourcePaths = new Set((sources || []).map((s) => normalizePosix(s.path || s.id || '')))

  const elementMap = new Map<string, FileLineageElement>()
  for (const el of elements || []) {
    if (!el || !el.id) continue
    elementMap.set(el.id, el)
    if (el.slug) elementMap.set(el.slug, el)
  }

  const changeTargetToChangeset = new Map<string, Set<string>>()
  const changesetToEvidence = new Map<string, Set<string>>()
  for (const cs of changes || []) {
    const csId =
      cs.id || (cs.path ? cs.path.split(/[/\\]/).pop()?.replace(/\.[^/.]+$/, '') : '') || ''
    if (!changesetToEvidence.has(csId)) changesetToEvidence.set(csId, new Set())
    if (cs.evidence) changesetToEvidence.get(csId)!.add(normalizePosix(cs.evidence))
    if (Array.isArray(cs.changes)) {
      for (const c of cs.changes) {
        if (c.target) {
          if (!changeTargetToChangeset.has(c.target)) changeTargetToChangeset.set(c.target, new Set())
          if (csId) changeTargetToChangeset.get(c.target)!.add(csId)
        }
        if (c.evidence && csId) changesetToEvidence.get(csId)!.add(normalizePosix(c.evidence))
      }
    }
  }

  for (const art of artifacts) {
    const artifactId = art.id
    const unitIdSet = new Set<string>()
    for (const u of art.unitIds || []) unitIdSet.add(u)
    if (art.content) {
      const patterns = [/\[\[([a-zA-Z0-9_\-:]+)\]\]/g, /(?:data-nn-unit|data-unit)=["']([a-zA-Z0-9_\-:]+)["']/g]
      for (const re of patterns) {
        let m: RegExpExecArray | null
        while ((m = re.exec(art.content)) !== null) {
          const candidate = m[1].trim()
          if (elementMap.has(candidate)) unitIdSet.add(candidate)
        }
      }
    }

    const unitIds = Array.from(unitIdSet)
    const changesetIdSet = new Set<string>()
    const sourcePathSet = new Set<string>()

    for (const uid of unitIds) {
      const el = elementMap.get(uid)
      if (!el) continue
      for (const h of el.history || []) {
        const csId = h.changesetId || h.changeset || h.changeId
        if (csId) changesetIdSet.add(csId)
      }
      const targets = changeTargetToChangeset.get(el.id) || changeTargetToChangeset.get(el.slug || '')
      if (targets) for (const csId of targets) changesetIdSet.add(csId)
      for (const fieldCits of Object.values(el.citations || {})) {
        if (!Array.isArray(fieldCits)) continue
        for (const cit of fieldCits) {
          const citPath = cit.path || cit.href
          if (citPath) sourcePathSet.add(normalizePosix(citPath))
        }
      }
    }

    for (const csId of changesetIdSet) {
      const evidences = changesetToEvidence.get(csId)
      if (!evidences) continue
      for (const ev of evidences) {
        if (!sourcePaths.size || sourcePaths.has(ev)) sourcePathSet.add(ev)
      }
    }

    result[artifactId] = {
      artifactId,
      artifactPath: art.path,
      unitIds,
      changesetIds: Array.from(changesetIdSet).sort(),
      sourcePaths: Array.from(sourcePathSet).sort(),
    }
  }

  return result
}

/**
 * Origins of the workspace: one per Synchronization element, plus the origins
 * known only from sidecar origin keys (`adhoc`). A folder name never makes one.
 */
export function buildOrigins(
  synchronizations: Array<{ alias: string; origin: string; kind: 'file' | 'folder'; state: 'active' | 'paused' }>,
  inventory: FileInventoryEntry[],
): OriginDescriptor[] {
  const declared = new Set(synchronizations.map((s) => s.alias))
  const byAlias = new Map<string, string[]>()
  const adhoc = new Map<string, { origin: string; files: string[] }>()

  for (const entry of inventory) {
    const sc = entry.sidecar
    const alias = sc?.synchronization
    if (alias && declared.has(alias)) {
      byAlias.set(alias, [...(byAlias.get(alias) ?? []), entry.id])
      continue
    }
    const mirror = /^sources\/sync\/([^/]+)\//.exec(entry.path)
    if (mirror && declared.has(mirror[1])) {
      byAlias.set(mirror[1], [...(byAlias.get(mirror[1]) ?? []), entry.id])
      continue
    }
    const key = alias || sc?.originUri
    if (!key) continue
    const group = adhoc.get(key) ?? { origin: sc?.originUri ?? '', files: [] }
    group.files.push(entry.id)
    adhoc.set(key, group)
  }

  const origins: OriginDescriptor[] = synchronizations.map((s) => ({
    id: s.alias,
    alias: s.alias,
    origin: s.origin,
    kind: s.kind,
    state: s.state,
    files: (byAlias.get(s.alias) ?? []).sort(),
  }))
  for (const id of [...adhoc.keys()].sort()) {
    const group = adhoc.get(id)!
    origins.push({
      id,
      origin: group.origin,
      kind: /^https?:\/\//i.test(group.origin) ? 'url' : 'file',
      state: 'adhoc',
      files: group.files.sort(),
    })
  }
  return origins
}

/** Calculates aggregate stats and coverage rates across the file inventory. */
export function calculateFilesStats(inventory: FileInventoryEntry[]): FilesStats {
  const empty = (): Record<FileCategory, number> => ({
    source: 0,
    asset: 0,
    evidence: 0,
    artifact: 0,
    unclassified: 0,
  })
  const categoryCounts = empty()
  const storageByCategory = empty()

  let totalBytes = 0
  let sourceLikeCount = 0
  let uncitedSourceCount = 0
  let sidecarMissingCount = 0
  let sidecarInvalidCount = 0
  let sidecarMismatchCount = 0
  let excerptCount = 0

  for (const entry of inventory) {
    totalBytes += entry.size || 0
    if (categoryCounts[entry.category] !== undefined) {
      categoryCounts[entry.category]++
      storageByCategory[entry.category] += entry.size || 0
    }
    if (isSourceLike(entry.category)) {
      sourceLikeCount++
      if (entry.uncited) uncitedSourceCount++
    }
    excerptCount += entry.excerptCount || 0

    const sidecar = entry.sidecar
    if (sidecar && isSourceLike(entry.category)) {
      if (!sidecar.exists) {
        if (!isMirrorFile(entry.path)) sidecarMissingCount++
      } else if (!sidecar.valid) sidecarInvalidCount++
      else if (sidecar.sha256Matches === false) sidecarMismatchCount++
    }
  }

  return {
    totalFiles: inventory.length,
    totalBytes,
    categoryCounts,
    storageByCategory,
    sourceCoverageRate:
      sourceLikeCount === 0
        ? 1
        : Number(((sourceLikeCount - uncitedSourceCount) / sourceLikeCount).toFixed(4)),
    uncitedSourceCount,
    sidecarMissingCount,
    sidecarInvalidCount,
    sidecarMismatchCount,
    excerptCount,
  }
}
