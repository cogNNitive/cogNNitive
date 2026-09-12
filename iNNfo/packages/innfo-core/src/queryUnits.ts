import {
  normalizeName,
  resolveUnitPath,
  serializeKnowledgeUnitRef,
  type KnowledgeUnit,
} from './sourceRef'
import { parseCsvTable } from './csvTable'
import { scanSections } from './querySections'
import type { ReferenceDiagnostic } from './validator/references'

export interface KnowledgeQueryFilter {
  name: string
  value: string
}

export interface KnowledgeQuery {
  /** Workspace-relative file path (resolved, e.g. unqualified names under `sources/nn/`). */
  path: string
  filters: KnowledgeQueryFilter[]
  /** Optional trailing bare segment: project one column/field over the matches. */
  projection?: string
}

export interface FileSnapshot {
  path: string
  content: string
}

export interface QueryResult {
  /** Canonical `@` pointers in document order. Empty set is a valid result. */
  uris: string[]
  /** Projected values 1:1 with `uris`, present only when requested. */
  values?: string[]
  /** Always false from core (caps live in adapters). */
  truncated: boolean
  diagnostics: ReferenceDiagnostic[]
}

/** Lenient search comparison: NFC, trim, case-fold. Identity stays strict elsewhere. */
function canonicalFilterValue(value: string): string {
  return value.normalize('NFC').trim().toLowerCase()
}

/**
 * Parse `path "?" filter *("&" filter) ["&" projection]` with
 * `filter = name "=" value`. `@` and `?` are mutually exclusive in v1; a bare
 * `path?`, empty names/values, and non-trailing bare segments are parse errors.
 * Values are literal in v1 (the `op.` operator namespace is reserved for v2).
 */
export function parseKnowledgeQuery(input: string): KnowledgeQuery | null {
  if (!input || typeof input !== 'string') return null
  const clean = input.trim()
  if (clean.includes('@')) return null
  const q = clean.indexOf('?')
  if (q === -1) return null
  const resolved = resolveUnitPath(clean.slice(0, q))
  if (!resolved) return null
  const rest = clean.slice(q + 1)
  if (!rest.trim()) return null
  const rawSegments = rest.split('&')
  if (rawSegments.some((s) => s.trim() === '')) return null
  const decoded: string[] = []
  for (const part of rawSegments) {
    let text: string
    try {
      text = decodeURIComponent(part.trim())
    } catch {
      // propagate deliberately: a malformed URI segment makes the query invalid.
      return null
    }
    if (text.trim() === '') return null
    decoded.push(text.trim())
  }
  const filters: KnowledgeQueryFilter[] = []
  let projection: string | undefined
  for (let i = 0; i < decoded.length; i++) {
    const seg = decoded[i]
    const eq = seg.indexOf('=')
    if (eq === -1) {
      if (i !== decoded.length - 1 || projection !== undefined) return null
      projection = seg
      continue
    }
    const name = seg.slice(0, eq).trim()
    const value = seg.slice(eq + 1).trim()
    if (!name || !value) return null
    filters.push({ name, value })
  }
  if (filters.length === 0) return null
  return { path: resolved.filePath, filters, projection }
}

/**
 * Run a parsed query over injected file snapshots. Pure and synchronous:
 * adapters own I/O and pass snapshots with paths in document order (the result
 * preserves that order). Returns URI sets; a query never fails on empty matches.
 */
export function runQuery(parsed: KnowledgeQuery, files: FileSnapshot[]): QueryResult {
  const want = parsed.path.normalize('NFC')
  const file = files.find((f) => f.path.normalize('NFC') === want)
  if (!file) {
    return {
      uris: [],
      truncated: false,
      diagnostics: [
        {
          path: parsed.path,
          message: `Query file "${parsed.path}" is not in the snapshot set`,
          severity: 'error',
        },
      ],
    }
  }
  return /\.csv$/i.test(file.path) ? runCsvQuery(parsed, file) : runMarkdownQuery(parsed, file)
}

function unknownNameError(
  path: string,
  kind: 'column' | 'field',
  name: string,
  fileName: string,
): ReferenceDiagnostic {
  return {
    path,
    message: `Query ${kind} "&${name}" does not exist in "${fileName}"`,
    severity: 'error',
  }
}

function runCsvQuery(parsed: KnowledgeQuery, file: FileSnapshot): QueryResult {
  const diagnostics: ReferenceDiagnostic[] = []
  const fileName = file.path.split('/').pop() ?? file.path
  const table = parseCsvTable(file.content)
  if (table.malformed) {
    return {
      uris: [],
      truncated: false,
      diagnostics: [
        {
          path: file.path,
          message: `Query file "${file.path}" cannot be parsed as CSV`,
          severity: 'error',
        },
      ],
    }
  }
  const wanted = [
    ...parsed.filters.map((f) => f.name),
    ...(parsed.projection ? [parsed.projection] : []),
  ]
  const unknown = [
    ...new Set(wanted.map((n) => normalizeName(n)).filter((n) => !table.headers.includes(n))),
  ]
  if (unknown.length > 0) {
    return {
      uris: [],
      truncated: false,
      diagnostics: unknown.map((n) => unknownNameError(file.path, 'column', n, fileName)),
    }
  }
  const matches = table.rows
    .map((cells, index) => ({ cells, index }))
    .filter((row) =>
      parsed.filters.every((f) => {
        const colIdx = table.headers.indexOf(normalizeName(f.name))
        return canonicalFilterValue(row.cells[colIdx] ?? '') === canonicalFilterValue(f.value)
      }),
    )
  const uris = matches.map((row) => {
    const unit: KnowledgeUnit = { kind: 'row', id: (row.cells[0] ?? '').trim() }
    return serializeKnowledgeUnitRef(file.path, unit, [])
  })
  const result: QueryResult = { uris, truncated: false, diagnostics }
  if (parsed.projection) {
    const colIdx = table.headers.indexOf(normalizeName(parsed.projection))
    result.values = matches.map((row) => row.cells[colIdx] ?? '')
  }
  return result
}

function runMarkdownQuery(parsed: KnowledgeQuery, file: FileSnapshot): QueryResult {
  const diagnostics: ReferenceDiagnostic[] = []
  const fileName = file.path.split('/').pop() ?? file.path
  const sections = scanSections(file.content)
  const knownFields = new Set<string>()
  for (const s of sections) for (const name of s.fields.keys()) knownFields.add(name)
  const wanted = [
    ...parsed.filters.map((f) => f.name),
    ...(parsed.projection ? [parsed.projection] : []),
  ]
  const unknown = [
    ...new Set(wanted.map((n) => normalizeName(n)).filter((n) => !knownFields.has(n))),
  ]
  if (unknown.length > 0) {
    return {
      uris: [],
      truncated: false,
      diagnostics: unknown.map((n) => unknownNameError(file.path, 'field', n, fileName)),
    }
  }
  const matches = sections.filter((s) =>
    parsed.filters.every((f) => {
      const items = s.fields.get(normalizeName(f.name))
      if (!items) return false
      return items.some((item) => canonicalFilterValue(item) === canonicalFilterValue(f.value))
    }),
  )
  const uris = matches.map((s) => {
    const unit: KnowledgeUnit = {
      kind: 'header',
      level: Math.min(6, Math.max(1, s.level)) as 1 | 2 | 3 | 4 | 5 | 6,
      text: s.text,
      slug: s.slug,
    }
    return serializeKnowledgeUnitRef(file.path, unit, [])
  })
  const result: QueryResult = { uris, truncated: false, diagnostics }
  if (parsed.projection) {
    const name = normalizeName(parsed.projection)
    result.values = matches.map((s) => s.rawFields.get(name) ?? '')
  }
  return result
}
