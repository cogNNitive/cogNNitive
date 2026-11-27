/**
 * `read_lineage` tool (computed-lineage-view): the domain's computed lineage,
 * read-only and paginated.
 *
 * Inventory from the filesystem, edges and diagnostics from the change log. It
 * never writes: the persisted lineage record no longer exists (S4), and nothing
 * here depends on it.
 *
 * Pagination lives here, at the tool layer; the projection is untouched. The
 * projection is a pure function of the path-sorted file snapshot, so its order
 * is deterministic and an offset cursor is stable while the domain is unchanged.
 * A page is bounded twice: by `limit` items and by a byte budget, so one call
 * never answers more than an agent can read whatever the domain's size.
 */
import {
  projectLineage,
  type LineageArtifact,
  type LineageChangeset,
  type LineageDiagnostic,
  type LineageEdge,
  type LineageKnowledge,
  type LineageSource,
  type LineageView,
} from '@cognnitive/nn-core'
import { readDomainLineage } from './domain-lineage.js'

export const LINEAGE_SECTIONS = [
  'sources',
  'models',
  'artifacts',
  'changes',
  'edges',
  'diagnostics',
] as const
export type LineageSection = (typeof LINEAGE_SECTIONS)[number]

/** Items per section in the overview (no `section`). */
export const OVERVIEW_LIMIT = 25
/** Items per page when one `section` is requested. */
export const SECTION_LIMIT = 200
/** Largest `limit` a caller may ask for. */
export const MAX_LIMIT = 1000
/**
 * Serialized bytes of all items in one response. The overview splits it evenly
 * across the six sections. A page always carries at least one item, so a page
 * exceeds the budget only when a single item does.
 */
export const PAGE_BYTE_BUDGET = 150_000

export interface ReadLineageInput {
  /** Substring filter applied to every section's refs (case-insensitive). */
  focus?: string
  /** `live` (default) uses the last applied change of each unit; `all-time` every change. */
  scope?: 'live' | 'all-time'
  /** One section to page through; omitted, the overview returns the first page of each. */
  section?: unknown
  /** Items per page: default OVERVIEW_LIMIT or SECTION_LIMIT, at most MAX_LIMIT. */
  limit?: unknown
  /** The `next_cursor` of the previous page of the same `section`. */
  cursor?: unknown
}

/** The whole (filtered) view, one array per section. */
export interface LineageSections {
  sources: LineageSource[]
  /** Models, named `models` in this contract (`knowledge` in the projection). */
  models: LineageKnowledge[]
  artifacts: LineageArtifact[]
  /** Changesets, named `changes` in this contract (`changesets` in the projection). */
  changes: LineageChangeset[]
  edges: LineageEdge[]
  diagnostics: LineageDiagnostic[]
}

/** No `section`: every total and the first page of every section. */
export interface ReadLineageOverview extends LineageSections {
  scope: 'live' | 'all-time'
  limit: number
  totals: Record<LineageSection, number>
  /** Per section: the cursor of its next page, or null when the page holds the rest. */
  next_cursor: Record<LineageSection, string | null>
}

/** One `section`: one page of it, with its total and the cursor of the next page. */
export interface ReadLineagePage extends Partial<LineageSections> {
  scope: 'live' | 'all-time'
  section: LineageSection
  limit: number
  cursor: string
  total: number
  next_cursor: string | null
}

export type ReadLineageResult = ReadLineageOverview | ReadLineagePage

/** A caller error in `section`, `limit` or `cursor`. */
export class LineagePageError extends Error {
  readonly code = 'INVALID_LINEAGE_PAGE'
}

function matches(focus: string | undefined, ...values: Array<string | undefined>): boolean {
  if (!focus) return true
  const needle = focus.toLowerCase()
  return values.some((value) => typeof value === 'string' && value.toLowerCase().includes(needle))
}

/** The projection reshaped to the `read_lineage` sections, optionally narrowed. Unpaginated. */
export function lineageSections(
  rootDir: string,
  input: Pick<ReadLineageInput, 'focus' | 'scope'> = {},
): LineageSections {
  // One snapshot, its change log and the parses both made: every file parsed once, and
  // the changesets taken from the persistent changeset index.
  const { files, log, parses } = readDomainLineage(rootDir)
  const view: LineageView = projectLineage(files, log, {
    scope: input.scope ?? 'live',
    parses,
  })
  const focus = input.focus

  return {
    sources: view.sources.filter((source) =>
      matches(focus, source.raw_filename, source.normalized_content, source.name),
    ),
    models: view.knowledge.filter((model) => matches(focus, model.model_ref, model.name)),
    artifacts: view.artifacts.filter((artifact) =>
      matches(focus, artifact.artifact_ref, artifact.name),
    ),
    changes: view.changesets.filter((changeset) =>
      matches(focus, changeset.changeset_ref, changeset.name),
    ),
    edges: view.edges.filter((edge) => matches(focus, edge.from, edge.to)),
    diagnostics: view.diagnostics.filter((diagnostic) => matches(focus, diagnostic.path)),
  }
}

function parseSection(value: unknown): LineageSection | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string' && (LINEAGE_SECTIONS as readonly string[]).includes(value)) {
    return value as LineageSection
  }
  throw new LineagePageError(
    `Invalid section ${JSON.stringify(value)}: expected one of ${LINEAGE_SECTIONS.join(', ')}`,
  )
}

function parseLimit(value: unknown, fallback: number): number {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_LIMIT) {
    return value
  }
  throw new LineagePageError(
    `Invalid limit ${JSON.stringify(value)}: expected an integer from 1 to ${MAX_LIMIT}`,
  )
}

function parseCursor(value: unknown, total: number): number {
  if (value === undefined || value === null || value === '') return 0
  const text = typeof value === 'number' ? String(value) : value
  if (typeof text !== 'string' || !/^\d+$/.test(text)) {
    throw new LineagePageError(
      `Invalid cursor ${JSON.stringify(value)}: pass the next_cursor of the previous page unchanged`,
    )
  }
  const offset = Number(text)
  if (offset > total) {
    throw new LineagePageError(
      `Invalid cursor ${JSON.stringify(value)}: past the end of the section (${total} items); the domain changed or the cursor belongs to another section, so start again without a cursor`,
    )
  }
  return offset
}

/** Bytes an item takes once pretty-printed two levels deep in the response. */
function itemBytes(item: unknown): number {
  const text = JSON.stringify(item, null, 2)
  let lines = 1
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) lines++
  return Buffer.byteLength(text, 'utf-8') + 4 * lines + 2
}

/** Up to `limit` items from `offset`, stopping before the byte budget (at least one item). */
function page<T>(items: T[], offset: number, limit: number, budget: number) {
  const out: T[] = []
  let bytes = 0
  for (let i = offset; i < items.length && out.length < limit; i++) {
    const cost = itemBytes(items[i])
    if (out.length > 0 && bytes + cost > budget) break
    out.push(items[i])
    bytes += cost
  }
  const end = offset + out.length
  return { items: out, next: end < items.length ? String(end) : null }
}

/** The `read_lineage` response: the overview, or one page of one section. */
export async function readLineageTool(
  rootDir: string,
  input: ReadLineageInput = {},
): Promise<ReadLineageResult> {
  const section = parseSection(input.section)
  if (section === undefined && input.cursor !== undefined && input.cursor !== null) {
    throw new LineagePageError('A cursor pages one section: pass the section it belongs to')
  }
  const limit = parseLimit(input.limit, section ? SECTION_LIMIT : OVERVIEW_LIMIT)
  const scope = input.scope ?? 'live'
  const all = lineageSections(rootDir, { focus: input.focus, scope })

  if (section) {
    const offset = parseCursor(input.cursor, all[section].length)
    const { items, next } = page(all[section] as unknown[], offset, limit, PAGE_BYTE_BUDGET)
    return {
      scope,
      section,
      limit,
      cursor: String(offset),
      total: all[section].length,
      next_cursor: next,
      [section]: items,
    } as ReadLineagePage
  }

  const totals = {} as Record<LineageSection, number>
  const nextCursor = {} as Record<LineageSection, string | null>
  const firstPages = {} as Record<LineageSection, unknown[]>
  const budget = Math.floor(PAGE_BYTE_BUDGET / LINEAGE_SECTIONS.length)
  for (const name of LINEAGE_SECTIONS) {
    const { items, next } = page(all[name] as unknown[], 0, limit, budget)
    totals[name] = all[name].length
    nextCursor[name] = next
    firstPages[name] = items
  }
  return {
    scope,
    limit,
    totals,
    next_cursor: nextCursor,
    ...(firstPages as unknown as LineageSections),
  }
}
