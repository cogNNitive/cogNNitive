import { parseCsvTable } from './csvTable'
import { extractHeadings, normalizeName, resolveHeadingSection, type SourceRef } from './sourceRef'

export type ResolvedUnit =
  | { kind: 'section'; startLine: number; endLine: number }
  | { kind: 'field'; lines: number[] }
  | { kind: 'row'; index: number }
  | { kind: 'cell'; row: number; column: string; value: string }

export const FIELD_LINE = /^\s*([^\s:][^:]*?)\s*::/

function resolveHeaderUnit(
  content: string,
  unit: { level: number; slug: string },
  subunits: string[],
): ResolvedUnit | null {
  const headings = extractHeadings(content)
  const match = headings.find((h) => h.slug === unit.slug && h.level === unit.level)
  if (!match) return null
  if (subunits.length === 0) {
    const section = resolveHeadingSection(content, unit.slug)
    if (!section) return null
    return { kind: 'section', startLine: section.startLine, endLine: section.endLine }
  }
  const lines = content.split('\n')
  const section = resolveHeadingSection(content, unit.slug)
  if (!section) return null
  if (subunits.length === 1) {
    // Nearest-section ownership (shared with validation): child subsections
    // do not donate their fields.
    const owned = sectionOwnLines(content, unit.slug)
    if (!owned) return null
    const wanted = normalizeName(subunits[0])
    const found: number[] = []
    for (const i of owned) {
      const field = lines[i].match(FIELD_LINE)
      if (field && normalizeName(field[1]) === wanted) found.push(i)
    }
    return found.length > 0 ? { kind: 'field', lines: found } : null
  }
  if (subunits.length === 2) {
    const table = parseMarkdownTable(lines.slice(section.startLine, section.endLine))
    if (!table) return null
    const wantedRow = normalizeName(subunits[0])
    const wantedCol = normalizeName(subunits[1])
    const rowIdx = table.rows.findIndex((r) => normalizeName(r[0] ?? '') === wantedRow)
    if (rowIdx === -1) return null
    const colIdx = table.headers.findIndex((h) => normalizeName(h) === wantedCol)
    if (colIdx === -1) return null
    const value = table.rows[rowIdx][colIdx]
    if (value === undefined) return null
    return { kind: 'cell', row: rowIdx, column: table.headers[colIdx], value }
  }
  return null
}

function splitTableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim())
}

function parseMarkdownTable(lines: string[]): { headers: string[]; rows: string[][] } | null {
  const tableLines = lines.filter((l) => l.trim().startsWith('|'))
  if (tableLines.length < 2) return null
  const headers = splitTableCells(tableLines[0])
  const body = tableLines
    .slice(1)
    .filter((l) => !/^[\s|:.-]+$/.test(splitTableCells(l).join('')))
    .map(splitTableCells)
  if (body.length === 0) return null
  return { headers, rows: body }
}

function resolveCsvUnit(content: string, id: string, subunits: string[]): ResolvedUnit | null {
  const table = parseCsvTable(content)
  if (table.malformed || table.headers.length === 0) return null
  // Key match is exact-after-trim, case-SENSITIVE (key semantics).
  const rowIdx = table.rows.findIndex((r) => (r[0] ?? '').trim() === id.trim())
  if (rowIdx === -1) return null
  if (subunits.length === 0) return { kind: 'row', index: rowIdx }
  if (subunits.length > 1) return null
  const colIdx = table.headers.findIndex((h) => h === normalizeName(subunits[0]))
  if (colIdx === -1) return null
  const value = table.rows[rowIdx][colIdx]
  if (value === undefined) return null
  return { kind: 'cell', row: rowIdx, column: table.headers[colIdx], value }
}

/**
 * Resolve a parsed knowledge-unit pointer against file content. Deterministic for
 * identical bytes; at most one result (`null` when the unit is absent or stale).
 */
export function resolveUnit(content: string, ref: SourceRef): ResolvedUnit | null {
  const unit = ref.unit
  if (!unit) return null
  const subunits = ref.subunits ?? []
  if (unit.kind === 'row') return resolveCsvUnit(content, unit.id, subunits)
  return resolveHeaderUnit(content, unit, subunits)
}

/**
 * List normalized `key::` field names inside a heading section (by slug).
 * Returns `null` when the section is absent. Shared by unit resolution and validation.
 */
export function listSectionFields(content: string, slug: string): string[] | null {
  const owned = sectionOwnLines(content, slug)
  if (!owned) return null
  const lines = content.split('\n')
  const names: string[] = []
  for (const i of owned) {
    const field = lines[i].match(FIELD_LINE)
    if (field) names.push(normalizeName(field[1]))
  }
  return names
}

/**
 * 0-based line numbers owned by a heading section: its lines excluding any
 * descendant subsection ranges. Fields belong to their NEAREST section — a
 * parent Concept never inherits its Elements' fields. Returns `null` when the
 * section slug is absent. Shared by validation and the query engine.
 */
export function sectionOwnLines(content: string, slug: string): number[] | null {
  const headings = extractHeadings(content)
  const target = headings.find((h) => h.slug === slug)
  if (!target) return null
  const lines = content.split('\n')
  let end = lines.length
  for (const o of headings) {
    if (o.line > target.line && o.level <= target.level) {
      end = o.line
      break
    }
  }
  const skip: Array<[number, number]> = []
  for (const o of headings) {
    if (o.line > target.line && o.line < end && o.level > target.level) {
      let oEnd = lines.length
      for (const p of headings) {
        if (p.line > o.line && p.level <= o.level) {
          oEnd = p.line
          break
        }
      }
      skip.push([o.line, Math.min(oEnd, end)])
    }
  }
  const owned: number[] = []
  for (let i = target.line + 1; i < end; i++) {
    if (!skip.some(([a, b]) => i >= a && i < b)) owned.push(i)
  }
  return owned
}
