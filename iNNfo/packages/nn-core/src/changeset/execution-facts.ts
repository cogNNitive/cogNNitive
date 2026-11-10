/**
 * Batch-wide execution facts (change-provenance: Per-change execution facts).
 *
 * The apply engine writes `applied_at`, `batch`, `status` and the evidence sha map
 * once, in the changeset frontmatter; a change carries a fact only when its value
 * differs from the one it inherits. The change log resolves each fact back
 * (`resolveChangeFacts` in `changelog/load.ts`). Browser-safe: pure.
 */
import { parseCitation } from '../sourceRef.js'
import { splitEvidence } from './evidence.js'
import type { ChangeItem, ChangesetDocument } from './types.js'

/** The workspace-relative file an evidence entry cites (`decision` / `unknown` cite none). */
export function evidencePath(item: string): string | undefined {
  const lower = item.toLowerCase()
  if (lower === 'decision' || lower === 'unknown') return undefined
  return parseCitation(item)?.filePath ?? item.split('@')[0]
}

/** The cited files of an evidence value, in order, or `undefined` when it cites none. */
export function evidencePaths(evidence: string | undefined): string[] | undefined {
  let items: string[]
  try {
    items = splitEvidence(evidence)
  } catch {
    return undefined
  }
  if (items.length === 0) return undefined
  const paths: string[] = []
  for (const item of items) {
    const path = evidencePath(item)
    if (path === undefined) return undefined
    paths.push(path)
  }
  return paths
}

/**
 * The positional sha list a change inherits from the changeset map: one sha per
 * evidence entry, or `undefined` when an entry's file is not in the map.
 */
export function inheritedEvidenceShas(
  evidence: string | undefined,
  map: Readonly<Record<string, string>> | undefined,
): string[] | undefined {
  if (!map) return undefined
  const paths = evidencePaths(evidence)
  if (!paths) return undefined
  const shas: string[] = []
  for (const path of paths) {
    const sha = map[path]
    if (typeof sha !== 'string') return undefined
    shas.push(sha)
  }
  return shas
}

/**
 * Removes from every change the execution facts it inherits from the frontmatter:
 * `applied_at` and `batch` always; `status` when it equals the changeset status;
 * `resolution` when the change applied; `resolved_target` when it equals the target
 * the proposal wrote (`recordedTargets`, by change id); `evidence_sha256` when the
 * frontmatter map gives the same list. `author` is a sealed proposal key and is
 * never touched. Returns a new document; the input is not mutated.
 */
export function compactExecutionFacts(
  doc: ChangesetDocument,
  recordedTargets: ReadonlyMap<string, string>,
): ChangesetDocument {
  const fm = doc.frontmatter
  const changes = doc.changes.map((source): ChangeItem => {
    const change: ChangeItem = { ...source }
    delete change.applied_at
    delete change.batch
    if (change.status !== undefined && change.status === fm.status) delete change.status
    const status = change.status ?? fm.status
    if (status === 'applied') delete change.resolution
    const target = recordedTargets.get(change.id) ?? change.target
    if (change.resolved_target !== undefined && change.resolved_target === target) delete change.resolved_target
    if (change.evidence_sha256 !== undefined) {
      const inherited = inheritedEvidenceShas(change.evidence, fm.evidence_sha256)
      if (inherited && inherited.join(',') === change.evidence_sha256.join(',')) delete change.evidence_sha256
    }
    return change
  })
  return { ...doc, changes }
}
