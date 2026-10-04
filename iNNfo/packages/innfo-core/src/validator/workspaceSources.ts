import type { RecursiveParseResult } from '../recursiveParser/types.js'
import type { ReferenceDiagnostic } from './references.js'
import { parseCsvTable } from '../csvTable.js'
import { assertNever } from '../assertNever.js'
import { resolveJsonPointer } from '../jsonPointer.js'
import { parseKnowledgeQuery } from '../queryUnits.js'
import {
  SOURCE_FIELD_NAMES,
  CONFLICT_FIELD_NAMES,
  extractHeadings,
  normalizeName,
  parseCitation,
  splitSourceFieldValue,
  type SourceRef,
} from '../sourceRef.js'
import { sidecarPathOf } from '../naming/index.js'
import { listSectionFields, resolveUnit } from '../unitResolve.js'
import type { KnowledgeNode } from '../types/index.js'
import type { BlueprintSchema } from '../schema/index.js'
import { findDeclaredField } from '../schema/index.js'
import { extractFileCitations } from '../lineage/project.js'
import type { FileSnapshot } from '../queryUnits.js'

export interface SourceResolution {
  exists: boolean
  headings?: string[]
  content?: string
  parentExists?: boolean
  suggestions?: string[]
}

/**
 * Host-supplied callback that resolves a workspace-relative source path
 * (for example `sources/import/<path>.csv` or `kNNowledge/<path>.md`) to
 * whether the file exists and, when cheap to compute, its heading slugs and/or
 * raw content (content unlocks row/column/field checks and precise `@` suggestions).
 */
export type SourceResolver = (
  refPath: string,
  referringPath?: string,
) => SourceResolution | null

export interface CitationSite {
  value: string
  referringPath: string
  field: string
  element?: string
}

export interface CitationDiagnostic extends ReferenceDiagnostic {
  site: CitationSite
  target?: string
}

/**
 * Validates a list of CitationSite locations against a SourceResolver.
 * THE single citation-validation loop shared by workspace validation,
 * artifacts validation, console meta validation, and skill checks.
 */
export function validateCitations(
  sites: CitationSite[],
  resolver: SourceResolver,
): CitationDiagnostic[] {
  const diagnostics: CitationDiagnostic[] = []
  const checkedCsvKeys = new Set<string>()

  for (const site of sites) {
    const value = site.value
    const path = site.element
      ? `${site.referringPath}#${site.element}.${site.field}`
      : `${site.referringPath}#${site.field}`

    // Queries select sets for retrieval tools — never a valid citation.
    if (value.includes('?') && parseKnowledgeQuery(value)) {
      diagnostics.push({
        path,
        message: `Queries are not valid citations: "${value}" selects a set, not a unit — resolve it to pointers first (e.g. run it as a query, then cite the resulting "@" references)`,
        severity: 'error',
        code: 'QU_NOT_PROVENANCE',
        site,
        target: value,
      })
      continue
    }

    const targetPath = citationTargetPath(value)
    if (targetPath && targetPath.split('/').includes('staging')) {
      diagnostics.push({
        path,
        message: `Excluded source reference "${value}" — "staging/" is scratch space and is not citable`,
        severity: 'error',
        code: 'KU_EXCLUDED_PATH',
        site,
        target: targetPath,
      })
      continue
    }

    if (targetPath && value.includes('@') && isBinaryTarget(targetPath)) {
      diagnostics.push({
        path,
        message: `Binary source reference "${value}" — a unit cannot address a binary file; cite its sidecar "${sidecarPathOf(targetPath)}" instead`,
        severity: 'error',
        code: 'KU_BINARY_TARGET',
        site,
        target: targetPath,
      })
      continue
    }

    const cit = parseCitation(value)
    if (!cit) {
      diagnostics.push({
        path,
        message: `Malformed source reference "${value}" — use "<path>@<unit>" (e.g. "file.md@## Section", "data.csv@104"); line ranges like #L10-L20 and src-NNN ids are not allowed`,
        severity: 'error',
        code: 'KU_MALFORMED',
        site,
        target: value,
      })
      continue
    }

    if (cit.unit) {
      validateUnitPointer(
        cit,
        site.referringPath,
        path,
        resolver,
        diagnostics,
        checkedCsvKeys,
        site,
      )
      continue
    }

    const resolved = resolver(cit.filePath, site.referringPath)
    if (!resolved || !resolved.exists) {
      diagnostics.push({
        path,
        message: formatDanglingMessage(cit, resolved),
        severity: 'error',
        code: 'KU_DANGLING_FILE',
        site,
        target: cit.filePath,
      })
      continue
    }

    if (cit.slug && resolved.headings && !resolved.headings.includes(cit.slug)) {
      diagnostics.push({
        path,
        message: `Source reference "${cit.raw}" points at heading "#${cit.slug}" which does not exist in "${cit.fileName}"`,
        severity: 'warning',
        code: 'KU_UNKNOWN_SLUG',
        site,
        target: cit.filePath,
      })
    }

    if (cit.legacyHash) {
      diagnostics.push({
        path,
        message: `Legacy "#slug" form is deprecated — prefer "@" pointers${suggestCanonical(resolved, cit)}`,
        severity: 'warning',
        code: 'KU_DEPRECATED_HASH',
        site,
        target: cit.filePath,
      })
    }
  }

  return diagnostics
}

function isCitationField(
  fieldName: string,
  conceptType: string | undefined,
  schema: BlueprintSchema | undefined,
): boolean {
  const declared = findDeclaredField(schema, conceptType, fieldName)
  if (declared) return declared.type === 'citation'
  return SOURCE_FIELD_NAMES.has(fieldName.toLowerCase())
}

function isConflictField(fieldName: string): boolean {
  return CONFLICT_FIELD_NAMES.has(fieldName.toLowerCase())
}

const LEGACY_DERIVATION_FIELD_NAMES = new Set(['derived_from', 'derived_from_inputs'])

function legacyDerivationKeyFor(
  fieldName: string,
  conceptType: string | undefined,
  schema: BlueprintSchema | undefined,
): string | undefined {
  const lower = fieldName.toLowerCase()
  if (!LEGACY_DERIVATION_FIELD_NAMES.has(lower)) return undefined
  if (!schema || !conceptType) return undefined
  const concept = schema.concepts.find((c) => c.name.toLowerCase() === conceptType.toLowerCase())
  if (!concept) return undefined
  const declaresField = concept.fields?.some((f) => f.name.toLowerCase() === lower)
  if (declaresField) return undefined
  return fieldName
}

export function validateWorkspaceSources(
  result: RecursiveParseResult,
  resolver: SourceResolver,
  snapshot?: FileSnapshot[],
): ReferenceDiagnostic[] {
  const diagnostics: ReferenceDiagnostic[] = []

  if (snapshot && Array.isArray(snapshot) && snapshot.length > 0) {
    const fileSites = extractFileCitations(snapshot)
    if (fileSites.length > 0) {
      diagnostics.push(...validateCitations(fileSites, resolver))
    }
  }

  const schemaFor = (node: KnowledgeNode): BlueprintSchema | undefined => {
    let current: KnowledgeNode | undefined = node
    while (current) {
      if (current.templateSchema) return current.templateSchema
      current = current.parentId ? result.nodes[current.parentId] : undefined
    }
    return undefined
  }

  for (const node of Object.values(result.nodes)) {
    if (node.kind !== 'element') continue
    const schema = schemaFor(node)

    for (const [fieldName, fv] of Object.entries(node.fields)) {
      const isConflict = isConflictField(fieldName)
      const legacyKey = legacyDerivationKeyFor(fieldName, node.type, schema)

      if (legacyKey) {
        const path = `${node.source.path}#${node.name}.${fieldName}`
        diagnostics.push({
          path,
          message: `"${legacyKey}" is deprecated — write "sources::" (pointer list); lineage is computed`,
          severity: 'warning',
          code: 'LEGACY_DERIVATION_KEY',
        })
      }

      if (!isConflict && !isCitationField(fieldName, node.type, schema)) continue

      const sites: CitationSite[] = []
      for (const value of splitSourceFieldValue(fv.value)) {
        sites.push({
          value,
          referringPath: node.source.path,
          element: node.name,
          field: fieldName,
        })
      }

      const fieldDiags = validateCitations(sites, resolver)
      diagnostics.push(...fieldDiags)

      if (isConflict) {
        const hasValid = sites.length > 0 && fieldDiags.every((d) => d.severity !== 'error')
        if (hasValid) {
          diagnostics.push({
            path: `${node.source.path}#${node.name}.${fieldName}`,
            message: `Element "${node.name}" flags a conflict via "conflicts::" — review and record the resolution in "rationale::"`,
            severity: 'warning',
            code: 'SRC_CONFLICT_FLAGGED',
          })
        }
      }
    }
  }

  return diagnostics
}

/** Forward-slash path part of a citation (text before the first `@` or `#`), or null. */
function citationTargetPath(value: string): string | null {
  const trimmed = value.trim()
  const cut = trimmed.search(/[@#]/)
  const path = (cut === -1 ? trimmed : trimmed.slice(0, cut)).replace(/\\/g, '/')
  return path || null
}

/** True when the path has an extension that is neither md, csv, nor json. */
function isBinaryTarget(path: string): boolean {
  const ext = /\.([A-Za-z0-9]+)$/.exec(path)?.[1]?.toLowerCase()
  return ext !== undefined && ext !== 'md' && ext !== 'csv' && ext !== 'json'
}

function formatDanglingMessage(ref: SourceRef, resolved?: SourceResolution | null): string {
  let msg = `Dangling source reference: "${ref.filePath}" is not present in this workspace`
  if (resolved?.parentExists === false) {
    msg += ' (parent directory does not exist)'
  } else if (resolved?.suggestions && resolved.suggestions.length > 0) {
    msg += ` — did you mean '${resolved.suggestions[0]}'?`
  }
  return msg
}

function suggestCanonical(
  resolved: { headings?: string[]; content?: string },
  ref: { filePath: string; slug?: string },
): string {
  if (ref.slug && resolved.content) {
    const found = extractHeadings(resolved.content).find((h) => h.slug === ref.slug)
    if (found) return ` (e.g. "${ref.filePath}@${'#'.repeat(found.level)}${found.slug}")`
  }
  return ` (e.g. "${ref.filePath}@## Section")`
}

function validateUnitPointer(
  ref: SourceRef,
  referringPath: string,
  path: string,
  resolver: SourceResolver,
  diagnostics: CitationDiagnostic[],
  checkedCsvKeys: Set<string>,
  site: CitationSite,
): void {
  const unit = ref.unit!
  const subunits = ref.subunits ?? []
  const resolved = resolver(ref.filePath, referringPath)
  if (!resolved || !resolved.exists) {
    diagnostics.push({
      path,
      message: formatDanglingMessage(ref, resolved),
      severity: 'error',
      code: 'KU_DANGLING_FILE',
      site,
      target: ref.filePath,
    })
    return
  }
  switch (unit.kind) {
    case 'header':
      validateHeaderUnit(ref, unit.slug, unit.level, subunits, resolved, path, diagnostics, site)
      return
    case 'row':
      validateRowUnit(ref, unit.id, subunits, resolved, path, diagnostics, checkedCsvKeys, site)
      return
    case 'pointer':
      validatePointerUnit(ref, unit.pointer, resolved, path, diagnostics, site)
      return
    default:
      return assertNever(unit, 'knowledge unit kind')
  }
}

function validatePointerUnit(
  ref: SourceRef,
  pointer: string,
  resolved: { content?: string },
  path: string,
  diagnostics: CitationDiagnostic[],
  site: CitationSite,
): void {
  if (!resolved.content) return // Degraded: file-existence-only without content.
  const found = resolveJsonPointer(resolved.content, pointer)
  if (found.ok) return
  if (found.reason === 'invalid-json') {
    diagnostics.push({
      path,
      message: `Source file "${ref.filePath}" cannot be parsed as JSON`,
      severity: 'error',
      code: 'KU_INVALID_JSON',
      site,
      target: ref.filePath,
    })
    return
  }
  diagnostics.push({
    path,
    message: `Source reference "${ref.raw}" points at pointer "${pointer}" which does not exist in "${ref.fileName}"`,
    severity: 'error',
    code: 'KU_UNKNOWN_POINTER',
    site,
    target: ref.filePath,
  })
}

function validateHeaderUnit(
  ref: SourceRef,
  slug: string,
  _level: number,
  subunits: string[],
  resolved: { headings?: string[]; content?: string },
  path: string,
  diagnostics: CitationDiagnostic[],
  site: CitationSite,
): void {
  const headings =
    resolved.headings ??
    (resolved.content ? extractHeadings(resolved.content).map((h) => h.slug) : undefined)
  const heading = resolved.content
    ? extractHeadings(resolved.content).find((h) => h.slug === slug)
    : undefined
  if (headings && !headings.includes(slug)) {
    diagnostics.push({
      path,
      message: `Source reference "${ref.raw}" points at heading "@${slug}" which does not exist in "${ref.fileName}"`,
      severity: 'warning',
      code: 'KU_UNKNOWN_SLUG',
      site,
      target: ref.filePath,
    })
    return
  }
  if (subunits.length === 0) return
  if (subunits.length === 1) {
    const fields =
      resolved.content && heading ? listSectionFieldsFor(resolved.content, heading) : undefined
    if (fields === undefined) return // Degraded: no content to check fields against.
    if (!fields.includes(normalizeName(subunits[0]))) {
      diagnostics.push({
        path,
        message: `Source reference "${ref.raw}" points at field "&${subunits[0]}" which does not exist in section "@${slug}" of "${ref.fileName}"`,
        severity: 'error',
        code: 'KU_FIELD_OUTSIDE_SECTION',
        site,
        target: ref.filePath,
      })
    }
    return
  }
  if (subunits.length === 2) {
    if (!resolved.content) return // Degraded: no content to resolve the cell against.
    if (!resolveUnit(resolved.content, ref)) {
      diagnostics.push({
        path,
        message: `Source reference "${ref.raw}" points at matrix cell "&${subunits[0]}&${subunits[1]}" which does not resolve in "${ref.fileName}"`,
        severity: 'error',
        code: 'KU_UNKNOWN_MATRIX_CELL',
        site,
        target: ref.filePath,
      })
    }
    return
  }
  diagnostics.push({
    path,
    message: `Malformed source reference "${ref.raw}" — a header pointer takes at most one field (&field) or one matrix cell (&row&column)`,
    severity: 'error',
    code: 'KU_MALFORMED',
    site,
    target: ref.filePath,
  })
}

function validateRowUnit(
  ref: SourceRef,
  id: string,
  subunits: string[],
  resolved: { content?: string },
  path: string,
  diagnostics: CitationDiagnostic[],
  checkedCsvKeys: Set<string>,
  site: CitationSite,
): void {
  if (!resolved.content) return // Degraded: file-existence-only without content.
  const table = parseCsvTable(resolved.content)
  if (table.malformed) {
    diagnostics.push({
      path,
      message: `Source file "${ref.filePath}" cannot be parsed as CSV`,
      severity: 'error',
      code: 'KU_MALFORMED',
      site,
      target: ref.filePath,
    })
    return
  }
  if (!checkedCsvKeys.has(ref.filePath)) {
    checkedCsvKeys.add(ref.filePath)
    const keys = table.rows.map((r) => (r[0] ?? '').trim())
    const seen = new Set<string>()
    for (const key of keys) {
      if (key === '') {
        diagnostics.push({
          path,
          message: `Source file "${ref.filePath}" has a row with an empty key in the first column`,
          severity: 'error',
          code: 'KU_EMPTY_KEY',
          site,
          target: ref.filePath,
        })
      } else if (seen.has(key)) {
        diagnostics.push({
          path,
          message: `Source file "${ref.filePath}" has duplicate key "${key}" in the first column`,
          severity: 'error',
          code: 'KU_DUPLICATE_KEY',
          site,
          target: ref.filePath,
        })
      }
      seen.add(key)
    }
  }
  const rowIdx = table.rows.findIndex((r) => (r[0] ?? '').trim() === id.trim())
  if (rowIdx === -1) {
    diagnostics.push({
      path,
      message: `Source reference "${ref.raw}" points at row "@${id}" which does not exist in "${ref.fileName}"`,
      severity: 'error',
      code: 'KU_UNKNOWN_ROW',
      site,
      target: ref.filePath,
    })
    return
  }
  if (subunits.length === 0) return
  if (subunits.length > 1) {
    diagnostics.push({
      path,
      message: `Malformed source reference "${ref.raw}" — a CSV row takes at most one column (&column)`,
      severity: 'error',
      code: 'KU_MALFORMED',
      site,
      target: ref.filePath,
    })
    return
  }
  if (!table.headers.includes(normalizeName(subunits[0]))) {
    diagnostics.push({
      path,
      message: `Source reference "${ref.raw}" points at column "&${subunits[0]}" which does not exist in "${ref.fileName}"`,
      severity: 'error',
      code: 'KU_UNKNOWN_COLUMN',
      site,
      target: ref.filePath,
    })
  }
}

function listSectionFieldsFor(content: string, heading: { slug: string }): string[] | undefined {
  const fields = listSectionFields(content, heading.slug)
  return fields ?? undefined
}
