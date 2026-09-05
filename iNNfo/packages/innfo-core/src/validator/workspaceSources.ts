import type { RecursiveParseResult } from '../recursiveParser/types'
import type { ReferenceDiagnostic } from './references'
import { parseSourceRef, splitSourceFieldValue } from '../sourceRef'

/** Field names (case-insensitive) that hold source Citations. */
const SOURCE_FIELD_NAMES = new Set(['sources', 'source'])

/**
 * Host-supplied callback that resolves a workspace-relative source path
 * (`sources/nn/<path>.md` or `models/<path>.md`) to whether the file exists and,
 * when cheap to compute, the list of GitHub-style heading slugs it contains.
 *
 * - Node host (`innfo-mcp`): read the file from disk, return
 *   `extractHeadings(content).map(h => h.slug)`.
 * - Browser host (`innfo-editor`): look the file up in the in-memory workspace.
 *
 * Returning `null` is equivalent to `{ exists: false }`.
 */
export type SourceResolver = (
  refPath: string,
  referringPath?: string,
) => { exists: boolean; headings?: string[] } | null

/**
 * Validates every `sources::` / `source::` Citation across the parsed workspace.
 *
 * Runs after the host's `recursiveParse()`. Complements — never replaces —
 * per-file `validateModel`/`validateDocument`, which do not open other files.
 *
 * Severities:
 * - `error`  — malformed reference (line range, `src-NNN`, `sources/original/`,
 *              plain string) on a declared source field.
 * - `error`  — the referenced file is not present in the workspace.
 * - `warning`— the file resolves but the `#<slug>` anchor matches no heading.
 */
export function validateWorkspaceSources(
  result: RecursiveParseResult,
  resolver: SourceResolver,
): ReferenceDiagnostic[] {
  const diagnostics: ReferenceDiagnostic[] = []

  for (const node of Object.values(result.nodes)) {
    if (node.kind !== 'element') continue

    for (const [fieldName, fv] of Object.entries(node.fields)) {
      if (!SOURCE_FIELD_NAMES.has(fieldName.toLowerCase())) continue

      const path = `${node.source.path}#${node.name}.${fieldName}`

      for (const value of splitSourceFieldValue(fv.value)) {
        const ref = parseSourceRef(value)
        if (!ref) {
          diagnostics.push({
            path,
            message: `Malformed source reference "${value}" — use "<path>.md#<heading-slug>" (line ranges like #L10-L20 and src-NNN ids are not allowed, and sources/original/ is not citable)`,
            severity: 'error',
          })
          continue
        }

        const resolved = resolver(ref.filePath, node.source.path)
        if (!resolved || !resolved.exists) {
          diagnostics.push({
            path,
            message: `Dangling source reference: "${ref.filePath}" is not present in this workspace`,
            severity: 'error',
          })
          continue
        }

        if (ref.slug && resolved.headings && !resolved.headings.includes(ref.slug)) {
          diagnostics.push({
            path,
            message: `Source reference "${ref.raw}" points at heading "#${ref.slug}" which does not exist in "${ref.fileName}"`,
            severity: 'warning',
          })
        }
      }
    }
  }

  return diagnostics
}
