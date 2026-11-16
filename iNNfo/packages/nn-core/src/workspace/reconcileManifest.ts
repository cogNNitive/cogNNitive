import { normalizePathKey } from '../recursiveParser/paths.js'
import { CATALOG_KINDS, type CatalogKind } from './discoverModels.js'

/** Marks an entry as tool-owned. Ownership is EXPLICIT, never inferred. */
export const OWNERSHIP_MARKER = '<!-- nn:auto -->'

export interface DiscoveredModel {
  /** Workspace-relative path, exactly as it should be written into `path::`. */
  path: string
  /** Element name for `## NN Models: <name>` — derived from frontmatter `title`, else the filename. */
  name: string
  /** Resolved `parent_spec.name`, written as `template:: [[<template>]]`. */
  template?: string
}

/**
 * A catalog document a `# NN Sources`, `# NN Procedures` or `# NN Artifacts`
 * section links. Unlike a model, a catalog carries no `status::` lifecycle:
 * the section is a pointer, not an inventory.
 */
export interface DiscoveredCatalog {
  kind: CatalogKind
  /** Workspace-relative path, written into `path::`. */
  path: string
  /** Element name for `## NN Sources: <name>`, from frontmatter `title`, else the filename. */
  name: string
}

export interface ManifestChange {
  kind: 'added' | 'archived' | 'reactivated' | 'skipped-not-owned' | 'missing-target'
  path: string
  name: string
  reason?: string
}

/** `# NN kNNowledge` or legacy `# NN Models` — the section header, exactly one `#`. */
const SECTION_HEADER_RE = /^#\s+NN\s+(?:kNNowledge|Models)\s*$/
/** Any level-1 heading (single `#`, not `##`) — terminates a section. */
const TOP_HEADER_RE = /^#(?!#)\s/
/** `## NN kNNowledge: <name>` or legacy `## NN Models: <name>` — one entry heading. */
const ENTRY_HEADER_RE = /^##\s+NN\s+(?:kNNowledge|Models):\s*(.+?)\s*$/

/**
 * Section header and entry heading of each catalog section. The label is the
 * one the `workspace` bluepriNNt spells (`## NN Sources: Sources Catalog`).
 */
const CATALOG_SECTIONS: Record<CatalogKind, { header: RegExp; entry: RegExp; label: string }> = {
  sources: {
    header: /^#\s+NN\s+Sources\s*$/,
    entry: /^##\s+NN\s+Sources:\s*(.+?)\s*$/,
    label: 'Sources',
  },
  procedures: {
    header: /^#\s+NN\s+Procedures\s*$/,
    entry: /^##\s+NN\s+Procedures:\s*(.+?)\s*$/,
    label: 'Procedures',
  },
  artifacts: {
    header: /^#\s+NN\s+Artifacts\s*$/,
    entry: /^##\s+NN\s+Artifacts:\s*(.+?)\s*$/,
    label: 'Artifacts',
  },
}

interface SectionInfo {
  headerIdx: number
  endIdx: number
  kind: 'kNNowledge' | 'Models'
}

/** A located section: its header line and the line where the next top heading starts. */
interface SectionRange {
  headerIdx: number
  endIdx: number
}

interface LocatedEntry {
  name: string
  headerIdx: number
  blockEnd: number
  isOwned: boolean
  path?: string
  status?: string
  statusLineIdx?: number
  /** Insertion point for a missing `status::` line — never precedes the ownership marker. */
  lastFieldLineIdx: number
}

function stripCR(line: string): string {
  return line.endsWith('\r') ? line.slice(0, -1) : line
}

/** Reads a `key:: value` line's value, tolerating surrounding quotes. */
function extractField(line: string, key: string): string | null {
  const re = new RegExp(`^\\s*${key}::\\s*(.*)$`)
  const m = stripCR(line).match(re)
  if (!m) return null
  let value = m[1].trim()
  if (
    (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
    (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
  ) {
    value = value.slice(1, -1)
  }
  return value
}

function isFieldLine(line: string): boolean {
  return /^\s*[A-Za-z_][A-Za-z0-9_-]*::/.test(stripCR(line))
}

/** First top-level heading after `headerIdx`, or EOF — the end of that section. */
function sectionEnd(lines: string[], headerIdx: number): number {
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (TOP_HEADER_RE.test(stripCR(lines[i]))) return i
  }
  return lines.length
}

function findModelsSection(lines: string[]): SectionInfo | null {
  const headerIdx = lines.findIndex((l) => SECTION_HEADER_RE.test(stripCR(l)))
  if (headerIdx === -1) return null
  const headerText = stripCR(lines[headerIdx])
  const kind: 'kNNowledge' | 'Models' = /Models/i.test(headerText) ? 'Models' : 'kNNowledge'
  return { headerIdx, endIdx: sectionEnd(lines, headerIdx), kind }
}

function findCatalogSection(lines: string[], kind: CatalogKind): SectionRange | null {
  const { header } = CATALOG_SECTIONS[kind]
  const headerIdx = lines.findIndex((l) => header.test(stripCR(l)))
  if (headerIdx === -1) return null
  return { headerIdx, endIdx: sectionEnd(lines, headerIdx) }
}

function locateEntries(
  lines: string[],
  section: SectionRange,
  entryHeaderRe: RegExp,
): LocatedEntry[] {
  const headerIdxs: number[] = []
  for (let i = section.headerIdx + 1; i < section.endIdx; i++) {
    if (entryHeaderRe.test(stripCR(lines[i]))) headerIdxs.push(i)
  }

  return headerIdxs.map((headerIdx, i) => {
    const blockEnd = headerIdxs[i + 1] ?? section.endIdx
    const match = stripCR(lines[headerIdx]).match(entryHeaderRe)!
    const name = match[1].trim()

    let firstNonBlank = headerIdx + 1
    while (firstNonBlank < blockEnd && stripCR(lines[firstNonBlank]).trim() === '') {
      firstNonBlank++
    }
    const isOwned =
      firstNonBlank < blockEnd && stripCR(lines[firstNonBlank]).trim() === OWNERSHIP_MARKER

    let path: string | undefined
    let status: string | undefined
    let statusLineIdx: number | undefined
    // A missing status:: line is always inserted AFTER the ownership marker
    // (when owned) so the marker stays "the line immediately following the
    // block header" — never let an insertion push it down.
    let lastFieldLineIdx = isOwned ? firstNonBlank : headerIdx

    for (let idx = headerIdx + 1; idx < blockEnd; idx++) {
      const p = extractField(lines[idx], 'path')
      if (p !== null) path = p
      const s = extractField(lines[idx], 'status')
      if (s !== null) {
        status = s
        statusLineIdx = idx
      }
      if (isFieldLine(lines[idx])) lastFieldLineIdx = idx
    }

    return { name, headerIdx, blockEnd, isOwned, path, status, statusLineIdx, lastFieldLineIdx }
  })
}

function buildEntryBlockLines(
  model: DiscoveredModel,
  kind: 'kNNowledge' | 'Models' = 'kNNowledge',
): string[] {
  if (kind === 'Models') {
    const block = [`## NN Models: ${model.name}`, OWNERSHIP_MARKER, `path:: ${model.path}`]
    if (model.template) block.push(`template:: [[${model.template}]]`)
    block.push('status:: active')
    return block
  }
  const block = [`## NN kNNowledge: ${model.name}`, OWNERSHIP_MARKER, `path:: ${model.path}`]
  if (model.template) block.push(`blueprint:: [[${model.template}]]`)
  block.push('status:: active')
  return block
}

/**
 * A catalog entry is a pointer, not an inventory: `path::` only. The
 * `workspace` bluepriNNt gives the catalog sections no `status::` field, so
 * there is nothing to archive or reactivate.
 */
function buildCatalogBlockLines(catalog: DiscoveredCatalog): string[] {
  return [
    `## NN ${CATALOG_SECTIONS[catalog.kind].label}: ${catalog.name}`,
    OWNERSHIP_MARKER,
    `path:: ${catalog.path}`,
  ]
}

/**
 * Splices entry blocks in at `insertIdx`, keeping exactly one blank line
 * between the block and whatever the author already wrote around it.
 */
function insertEntryBlocks(lines: string[], insertIdx: number, blockLines: string[]): void {
  const block = [...blockLines]
  if (block.length === 0) return
  if (insertIdx > 0 && stripCR(lines[insertIdx - 1]).trim() === '' && block[0] === '') {
    block.shift()
  }
  if (
    insertIdx < lines.length &&
    stripCR(lines[insertIdx]).trim() !== '' &&
    block[block.length - 1] !== ''
  ) {
    block.push('')
  }
  lines.splice(insertIdx, 0, ...block)
}

/**
 * Pure, additive reconciliation of the manifest's sections against discovered
 * documents. Never reorders, never regroups, never deletes.
 *
 * The `workspace` bluepriNNt declares four sections and all four are owned:
 * `# NN kNNowledge` (legacy `# NN Models`) is an inventory of discovered models
 * with a `status::` lifecycle, and `# NN Sources`, `# NN Procedures`,
 * `# NN Artifacts` are single pointers to the catalog document of their kind,
 * with no lifecycle and never created when absent.
 *
 * ROUND-TRIP GUARANTEE: `changes.length === 0` implies `content === manifestContent`
 * — the exact same string reference. Also holds when the only changes are
 * report-only records (`skipped-not-owned`, `missing-target`). Achieved by
 * surgical splicing of the original string, NOT by re-serializing (AD-08).
 */
export function reconcileManifest(
  manifestContent: string,
  discovered: DiscoveredModel[],
  catalogs: readonly DiscoveredCatalog[] = [],
): { content: string; changes: ManifestChange[] } {
  const lines = manifestContent.split('\n')
  const section = findModelsSection(lines)
  const entries = section ? locateEntries(lines, section, ENTRY_HEADER_RE) : []

  const discoveredByKey = new Map<string, DiscoveredModel>()
  for (const d of discovered) {
    discoveredByKey.set(normalizePathKey(d.path), d)
  }
  const existingKeys = new Set(entries.filter((e) => e.path).map((e) => normalizePathKey(e.path!)))

  const changes: ManifestChange[] = []
  const statusEdits: Array<{ entry: LocatedEntry; nextStatus: 'active' | 'archived' }> = []

  for (const entry of entries) {
    if (!entry.path) continue
    const key = normalizePathKey(entry.path)
    const stillPresent = discoveredByKey.has(key)
    const currentlyArchived = (entry.status ?? '').toLowerCase() === 'archived'

    if (!stillPresent && !currentlyArchived) {
      if (entry.isOwned) {
        statusEdits.push({ entry, nextStatus: 'archived' })
        changes.push({ kind: 'archived', path: entry.path, name: entry.name })
      } else {
        changes.push({
          kind: 'skipped-not-owned',
          path: entry.path,
          name: entry.name,
          reason: 'file missing, entry not tool-owned',
        })
      }
    } else if (stillPresent && currentlyArchived) {
      if (entry.isOwned) {
        statusEdits.push({ entry, nextStatus: 'active' })
        changes.push({ kind: 'reactivated', path: entry.path, name: entry.name })
      } else {
        changes.push({
          kind: 'skipped-not-owned',
          path: entry.path,
          name: entry.name,
          reason: 'file present, entry not tool-owned',
        })
      }
    }
  }

  const toAdd = discovered.filter((d) => !existingKeys.has(normalizePathKey(d.path)))
  for (const d of toAdd) {
    changes.push({ kind: 'added', path: d.path, name: d.name })
  }

  // Catalog sections: pointers to the catalog document of their kind. A section
  // the manifest does not declare stays out of reach — the `domaiNN` template
  // declares none of them, so declaring one is the author's choice.
  const catalogAdds: Array<{ kind: CatalogKind; missing: DiscoveredCatalog[] }> = []
  for (const kind of CATALOG_KINDS) {
    const range = findCatalogSection(lines, kind)
    if (!range) continue
    const catalogEntries = locateEntries(lines, range, CATALOG_SECTIONS[kind].entry)
    const linkedKeys = new Set(
      catalogEntries.filter((e) => e.path).map((e) => normalizePathKey(e.path!)),
    )
    const ofKind = catalogs.filter((c) => c.kind === kind)
    const discoveredKeys = new Set(ofKind.map((c) => normalizePathKey(c.path)))

    for (const entry of catalogEntries) {
      if (!entry.path) continue
      if (discoveredKeys.has(normalizePathKey(entry.path))) continue
      // No lifecycle to flip here, so an unresolvable pointer is reported and
      // left exactly as the author (or an earlier run) wrote it.
      changes.push({
        kind: 'missing-target',
        path: entry.path,
        name: entry.name,
        reason: entry.isOwned
          ? 'no catalog document discovered, entry tool-owned'
          : 'no catalog document discovered, entry not tool-owned',
      })
    }

    const missing = ofKind.filter((c) => !linkedKeys.has(normalizePathKey(c.path)))
    for (const c of missing) {
      changes.push({ kind: 'added', path: c.path, name: c.name })
    }
    if (missing.length > 0) catalogAdds.push({ kind, missing })
  }

  // Nothing mutates the string — return the ORIGINAL reference (headline
  // guarantee), even when only non-mutating changes were reported.
  if (statusEdits.length === 0 && toAdd.length === 0 && catalogAdds.length === 0) {
    return { content: manifestContent, changes }
  }

  const nextLines = [...lines]

  // Apply status edits highest-index-first so earlier indices stay valid
  // when a missing status:: line needs to be inserted.
  const sortedEdits = [...statusEdits].sort((a, b) => b.entry.headerIdx - a.entry.headerIdx)
  for (const { entry, nextStatus } of sortedEdits) {
    if (entry.statusLineIdx !== undefined) {
      const original = nextLines[entry.statusLineIdx]
      const cr = original.endsWith('\r') ? '\r' : ''
      const leading = stripCR(original).match(/^\s*/)?.[0] ?? ''
      nextLines[entry.statusLineIdx] = `${leading}status:: ${nextStatus}${cr}`
    } else {
      nextLines.splice(entry.lastFieldLineIdx + 1, 0, `status:: ${nextStatus}`)
    }
  }

  let content = nextLines.join('\n')

  // Each insertion re-locates its own section: a status edit above it may have
  // shifted the section end by one or more lines.
  for (const { kind, missing } of catalogAdds) {
    const rescanLines = content.split('\n')
    const rescanRange = findCatalogSection(rescanLines, kind)
    if (!rescanRange) continue
    const blockLines: string[] = []
    for (const c of missing) blockLines.push('', ...buildCatalogBlockLines(c))
    insertEntryBlocks(rescanLines, rescanRange.endIdx, blockLines)
    content = rescanLines.join('\n')
  }

  if (toAdd.length > 0) {
    const rescanLines = content.split('\n')
    const rescanSection = findModelsSection(rescanLines)

    if (rescanSection) {
      const blockLines: string[] = []
      for (const d of toAdd) {
        blockLines.push('', ...buildEntryBlockLines(d, rescanSection.kind))
      }
      insertEntryBlocks(rescanLines, rescanSection.endIdx, blockLines)
      content = rescanLines.join('\n')
    } else {
      // No `# NN kNNowledge` or `# NN Models` section at all: append the canonical
      // `# NN kNNowledge` section at EOF, preceded by exactly one blank line.
      let base = content
      if (base.length > 0) {
        if (!base.endsWith('\n')) base += '\n'
        base += '\n'
      }
      const sectionLines = ['# NN kNNowledge']
      for (const d of toAdd) {
        sectionLines.push('', ...buildEntryBlockLines(d, 'kNNowledge'))
      }
      content = base + sectionLines.join('\n') + '\n'
    }
  }

  return { content, changes }
}
