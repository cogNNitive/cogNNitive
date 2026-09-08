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

/**
 * `query_units` tool implementation (read-only): parse `path?filter[&...][&projection]`,
 * read the single target file under `rootDir`, and return matching knowledge-unit
 * URIs (or projected values). Never writes files.
 */
export async function queryUnits(rootDir: string, query: string): Promise<QueryUnitsResult> {
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
  return {
    uris: result.uris.slice(0, QUERY_RESULT_CAP),
    ...(result.values ? { values: result.values.slice(0, QUERY_RESULT_CAP) } : {}),
    truncated: result.uris.length > QUERY_RESULT_CAP,
    diagnostics: result.diagnostics,
  }
}
