import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'
import {
  parseKnowledgeQuery,
  runQuery,
  type FileSnapshot,
  type QueryResult,
} from '@cognnitive/nn-core'
import { buildNodeDomainIndex } from './domain-index.js'

/** Hard cap on returned URIs; beyond it the tool reports `truncated: true`. */
export const QUERY_RESULT_CAP = 100

/** `collection:<Concept>?<filters>` — the distribution-aware selector (S5a). */
const COLLECTION_SELECTOR = /^collection:([A-Za-z][A-Za-z0-9_-]*)\?(.+)$/i

export interface QueryUnitsResult {
  uris: string[]
  values?: string[]
  truncated: boolean
  diagnostics: QueryResult['diagnostics']
}

/** Bounded projection options for `queryUnits` (all optional, no-op when omitted). */
export interface QueryUnitsOptions {
  /**
   * Cap on total projected value characters (joined by `\n`).
   * Values beyond the cap are cut and `truncated` is set, so projections
   * cannot smuggle whole files into surgical prompts.
   */
  max_values_chars?: number
}

/**
 * `query_units` tool implementation (read-only): parse `path?filter[&...][&projection]`,
 * read the single target file under `rootDir`, and return matching knowledge-unit
 * URIs (or projected values). Never writes files.
 *
 * `collection:<Concept>?…` is the distribution-aware form: the query runs over
 * every member of that concept's collection — instance models and compact
 * copies alike — and the returned URIs carry the owning model's id
 * (`<model-id>@<slug>`), not the file path.
 */
export async function queryUnits(
  rootDir: string,
  query: string,
  options?: QueryUnitsOptions,
): Promise<QueryUnitsResult> {
  const collection = COLLECTION_SELECTOR.exec(query.trim())
  if (collection) return queryCollection(rootDir, collection[1], collection[2], options)

  const parsed = parseKnowledgeQuery(query)
  if (!parsed) {
    return {
      uris: [],
      truncated: false,
      diagnostics: [
        {
          path: query,
          message: `Malformed query "${query}" — use "path?filter=value[&filter...][&projection]" (@ and ? never mix)`,
          severity: 'error',
        },
      ],
    }
  }
  const abs = resolve(rootDir, parsed.path)
  const rel = relative(rootDir, abs)
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel) || !existsSync(abs)) {
    return {
      uris: [],
      truncated: false,
      diagnostics: [
        {
          path: parsed.path,
          message: `Query file "${parsed.path}" is not present in this workspace`,
          severity: 'error',
        },
      ],
    }
  }
  const snapshots: FileSnapshot[] = [
    { path: parsed.path.replace(/\\/g, '/'), content: readFileSync(abs, 'utf-8') },
  ]
  const result = runQuery(parsed, snapshots)
  const uris = result.uris.slice(0, QUERY_RESULT_CAP)
  let values = result.values ? result.values.slice(0, QUERY_RESULT_CAP) : undefined
  let truncated = result.uris.length > QUERY_RESULT_CAP
  if (values !== undefined) {
    const capped = capValuesChars(values, options?.max_values_chars)
    values = capped.values
    truncated = truncated || capped.truncated
  }
  return {
    uris,
    ...(values ? { values } : {}),
    truncated,
    diagnostics: result.diagnostics,
  }
}

/**
 * Enforce the `max_values_chars` projection cap (pure): cut values so the
 * `\n`-joined payload fits the cap, keeping whole leading values and
 * truncating mid-value only when a single value exceeds it.
 */export function capValuesChars(
  values: string[],
  maxChars?: number,
): { values: string[]; truncated: boolean } {
  if (maxChars === undefined || !Number.isInteger(maxChars) || maxChars < 0) {
    return { values, truncated: false }
  }
  const joined = values.join('\n')
  if (joined.length <= maxChars) return { values, truncated: false }
  const kept: string[] = []
  let used = 0
  for (const value of values) {
    const prefix = kept.length === 0 ? 0 : 1
    if (used + prefix + value.length <= maxChars) {
      kept.push(value)
      used += prefix + value.length
    } else {
      const room = maxChars - used - prefix
      if (room > 0 && kept.length === 0) kept.push(value.slice(0, room))
      break
    }
  }
  return { values: kept, truncated: true }
}

/** `Scene` -> `scene`: the concept key a heading slug carries. */
function conceptSlugOf(concept: string): string {
  return concept
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Run `collection:<Concept>?<filters>` over every member of a concept's
 * collection. Members come from the domain index, so a compact copy and a
 * distributed instance answer the same query with the same shape; the URI is
 * `<model-id>@<slug>` because the file path stops being an identity once
 * storage distributes.
 */
async function queryCollection(
  rootDir: string,
  concept: string,
  rest: string,
  options?: QueryUnitsOptions,
): Promise<QueryUnitsResult> {
  const { index } = await buildNodeDomainIndex(rootDir)
  const members = index.collection(concept)
  if (members.length === 0) {
    return {
      uris: [],
      truncated: false,
      diagnostics: [
        {
          path: `collection:${concept}`,
          message: `Collection "${concept}" has no member in this domaiNN - the concept is unknown, or no model holds it`,
          severity: 'error',
        },
      ],
    }
  }

  const uris: string[] = []
  const values: string[] = []
  const diagnostics: QueryResult['diagnostics'] = []
  for (const member of members) {
    const abs = resolve(rootDir, member.path)
    if (!existsSync(abs)) continue
    const parsed = parseKnowledgeQuery(`${member.modelId}?${rest}`)
    if (!parsed) {
      return {
        uris: [],
        truncated: false,
        diagnostics: [
          {
            path: `collection:${concept}`,
            message: `Malformed query "collection:${concept}?${rest}" - use "collection:{Concept}?filter=value[&filter...][&projection]"`,
            severity: 'error',
          },
        ],
      }
    }
    // The snapshot is keyed by the model ID, so the URIs runQuery builds already
    // carry the address (`<model-id>@<slug>`) instead of a file path.
    // Scope to the concept: a Video instance also holds its Scenes, and a bare
    // `status=` filter would otherwise match a Scene and report the Video twice.
    const scoped = { ...parsed, conceptSlug: conceptSlugOf(concept) }
    const result = runQuery(scoped, [{ path: member.modelId, content: readFileSync(abs, 'utf-8') }])
    diagnostics.push(...result.diagnostics)
    uris.push(...result.uris)
    if (result.values) values.push(...result.values)
  }

  const cappedUris = uris.slice(0, QUERY_RESULT_CAP)
  let cappedValues = values.length > 0 ? values.slice(0, QUERY_RESULT_CAP) : undefined
  let truncated = uris.length > QUERY_RESULT_CAP
  if (cappedValues !== undefined) {
    const capped = capValuesChars(cappedValues, options?.max_values_chars)
    cappedValues = capped.values
    truncated = truncated || capped.truncated
  }
  return {
    uris: cappedUris,
    ...(cappedValues ? { values: cappedValues } : {}),
    truncated,
    diagnostics,
  }
}