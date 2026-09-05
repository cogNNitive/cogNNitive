import { normalizePathKey } from '../recursiveParser/paths'

/** Marks an entry as tool-owned. Ownership is EXPLICIT, never inferred. */
export const OWNERSHIP_MARKER = '<!-- nn:auto -->'

export interface DiscoveredModel {
  /** Workspace-relative path, exactly as it should be written into `path::`. */
  path: string
  /** Element name for `## NN ModelRef: <name>` — derived from frontmatter `title`, else the filename. */
  name: string
  /** Resolved `parent_spec.name`, written as `template:: [[<template>]]`. */
  template?: string
}

export interface ManifestChange {
  kind: 'added' | 'archived' | 'reactivated' | 'skipped-not-owned'
  path: string
  name: string
  reason?: string
}

/** `# NN ModelRef` — the section header, exactly one `#`. */
const SECTION_HEADER_RE = /^#\s+NN\s+ModelRef\s*$/
/** Any level-1 heading (single `#`, not `##`) — terminates the ModelRef section. */
const TOP_HEADER_RE = /^#(?!#)\s/
/** `## NN ModelRef: <name>` — one entry heading. */
const ENTRY_HEADER_RE = /^##\s+NN\s+ModelRef:\s*(.+?)\s*$/

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

function findModelRefSection(lines: string[]): { headerIdx: number; endIdx: number } | null {
  const headerIdx = lines.findIndex((l) => SECTION_HEADER_RE.test(stripCR(l)))
  if (headerIdx === -1) return null
  let endIdx = lines.length
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (TOP_HEADER_RE.test(stripCR(lines[i]))) {
      endIdx = i
      break
    }
  }
  return { headerIdx, endIdx }
}

function locateEntries(
  lines: string[],
  section: { headerIdx: number; endIdx: number },
): LocatedEntry[] {
  const headerIdxs: number[] = []
  for (let i = section.headerIdx + 1; i < section.endIdx; i++) {
    if (ENTRY_HEADER_RE.test(stripCR(lines[i]))) headerIdxs.push(i)
  }

  return headerIdxs.map((headerIdx, i) => {
    const blockEnd = headerIdxs[i + 1] ?? section.endIdx
    const match = stripCR(lines[headerIdx]).match(ENTRY_HEADER_RE)!
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

function buildEntryBlockLines(model: DiscoveredModel): string[] {
  const block = [`## NN ModelRef: ${model.name}`, OWNERSHIP_MARKER, `path:: ${model.path}`]
  if (model.template) block.push(`template:: [[${model.template}]]`)
  block.push('status:: active')
  return block
}

/**
 * Pure, additive reconciliation of `## NN ModelRef` entries against discovered
 * Level-3 model files. Never reorders, never regroups, never deletes.
 *
 * ROUND-TRIP GUARANTEE: `changes.length === 0` implies `content === manifestContent`
 * — the exact same string reference. Achieved by surgical splicing of the
 * original string, NOT by re-serializing (AD-08) — `rawSections` never
 * contains element-bearing sections like `# NN ModelRef`.
 */
export function reconcileManifest(
  manifestContent: string,
  discovered: DiscoveredModel[],
): { content: string; changes: ManifestChange[] } {
  const lines = manifestContent.split('\n')
  const section = findModelRefSection(lines)
  const entries = section ? locateEntries(lines, section) : []

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

  // Nothing mutates the string — return the ORIGINAL reference (headline
  // guarantee), even when non-mutating changes (e.g. skipped-not-owned) were
  // reported.
  if (statusEdits.length === 0 && toAdd.length === 0) {
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

  if (toAdd.length > 0) {
    // Re-scan the (possibly status-edited) content: an insert-missing-status
    // edit may have shifted the section end by one or more lines.
    const rescanLines = content.split('\n')
    const rescanSection = findModelRefSection(rescanLines)

    if (rescanSection) {
      const insertIdx = rescanSection.endIdx
      const blockLines: string[] = []
      for (const d of toAdd) {
        blockLines.push('', ...buildEntryBlockLines(d))
      }
      if (blockLines[0] === '' && insertIdx > 0 && stripCR(rescanLines[insertIdx - 1]).trim() === '') {
        blockLines.shift()
      }
      rescanLines.splice(insertIdx, 0, ...blockLines)
      content = rescanLines.join('\n')
    } else {
      // No `# NN ModelRef` section at all: append the whole section at EOF,
      // preceded by exactly one blank line.
      let base = content
      if (base.length > 0) {
        if (!base.endsWith('\n')) base += '\n'
        base += '\n'
      }
      const sectionLines = ['# NN ModelRef']
      for (const d of toAdd) {
        sectionLines.push('', ...buildEntryBlockLines(d))
      }
      content = base + sectionLines.join('\n') + '\n'
    }
  }

  return { content, changes }
}
