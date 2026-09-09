import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'
import {
  parseKnowledgeQuery,
  runQuery,
  type FileSnapshot,
  type QueryResult,
} from '@cognnitive/innfo-core'

/** Hard cap on returned URIs; beyond it the tool reports `truncated: true`. */
export const QUERY_RESULT_CAP = 100

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
 */
export async function queryUnits(
  rootDir: string,
  query: string,
  options?: QueryUnitsOptions,
): Promise<QueryUnitsResult> {
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
 */
export function capValuesChars(
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
