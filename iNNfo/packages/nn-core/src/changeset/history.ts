/**
 * Staleness of a pending change against the applied history, answered by the
 * change log (change-provenance: one reader for lifecycle).
 *
 * The log already folds every applied change into element lifecycles: the last
 * `add_element` or `remove_element` of an element decides whether the element is
 * alive, and a later `add_element` resets it (the epoch cut). This module scans
 * the newest `maxScan` changesets into a log and asks it, instead of keeping its
 * own reverse-scan matching.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseChangeset } from './parser.js'
import { compareVersions } from '../workspace/integrity/versionStatus.js'
import { slugify } from '../parser/slug.js'
import { buildChangeLogFromChangesets, type ChangesetLike } from '../changelog/load.js'
import type { LoggedChange } from '../changelog/index.js'
import type { ModelId } from '../address/index.js'

export interface StalenessCheckResult {
  stale: boolean
  code?: 'STALE_TARGET_DELETED' | 'STALE_TARGET_MOVED'
  message?: string
}

/** A model's version transition, as the changeset frontmatter records it. */
interface VersionTransition {
  base_version?: string
  result_version?: string
}

interface ScannedHistory {
  changesets: ChangesetLike[]
  /** Changeset path -> authored model key (lowercase) -> version transition. */
  transitions: Map<string, Map<string, VersionTransition>>
}

/** Reads the newest `maxScan` `changes/` documents, newest filename first. */
async function scanHistory(changesDir: string, maxScan: number): Promise<ScannedHistory> {
  const history: ScannedHistory = { changesets: [], transitions: new Map() }
  let entries: string[]
  try {
    entries = await readdir(changesDir)
  } catch {
    return history
  }

  const files = entries
    .filter((file) => file.endsWith('.md') && !file.startsWith('.'))
    .sort((a, b) => b.localeCompare(a))
    .slice(0, Math.max(0, maxScan))

  for (const filename of files) {
    let content: string
    try {
      content = await readFile(join(changesDir, filename), 'utf-8')
    } catch {
      continue
    }
    let doc
    try {
      doc = parseChangeset(content)
    } catch {
      continue
    }
    const path = `changes/${filename}`
    const fm = doc.frontmatter
    history.changesets.push({
      path,
      status: fm.status,
      author: fm.author,
      appliedAt: fm.applied_at,
      changes: doc.changes,
    })
    const transitions = new Map<string, VersionTransition>()
    for (const [modelKey, transition] of Object.entries(fm.models ?? {})) {
      transitions.set(modelKey.toLowerCase(), transition as VersionTransition)
    }
    history.transitions.set(path, transitions)
  }

  return history
}

/**
 * The ids a pending change's model id has carried: the id itself plus every id a
 * recorded `move_model` mapped it to, forward through the chain. `final` is the
 * id the instance carries today (design A10).
 */
function identityChain(
  log: { all: readonly LoggedChange[]; identities(id: ModelId): readonly ModelId[] },
  modelId: string,
): { ids: Set<string>; final: string } {
  const ids = new Set<string>([modelId.toLowerCase()])
  // A pending change authored after the move names the new id: the former ids
  // keep the pre-move lifecycle attached.
  for (const former of log.identities(modelId as ModelId)) ids.add(former.toLowerCase())
  let current = modelId.toLowerCase()
  for (const change of log.all) {
    if (!change.applied || change.op !== 'move_model') continue
    const from = change.target.toLowerCase()
    const to = (change.to ?? '').toLowerCase()
    if (!to) continue
    if (current === from) current = to
    else if (current.startsWith(`${from}/`)) current = `${to}${current.slice(from.length)}`
    else continue
    ids.add(current)
  }
  return { ids, final: current }
}

/** True when `address` names the element `<one of modelIds>@elementSlug` (slug-insensitive). */
function matchesElementAddress(address: string, modelIds: ReadonlySet<string>, elementSlug: string): boolean {
  const at = address.indexOf('@')
  if (at === -1) return false
  if (!modelIds.has(address.slice(0, at).toLowerCase())) return false
  const element = address.slice(at + 1).toLowerCase()
  const wanted = elementSlug.toLowerCase()
  return element === wanted || slugify(element) === slugify(wanted)
}

/** The last applied lifecycle change (`add_element` / `remove_element`) of an element. */
function lifecycleOf(log: { all: readonly LoggedChange[] }, modelIds: ReadonlySet<string>, elementSlug: string): LoggedChange | undefined {
  let lifecycle: LoggedChange | undefined
  for (const change of log.all) {
    if (!change.applied) continue
    if (change.op !== 'add_element' && change.op !== 'remove_element') continue
    if (!matchesElementAddress(change.resolvedTarget ?? change.target, modelIds, elementSlug)) continue
    lifecycle = change
  }
  return lifecycle
}

/**
 * Checks whether the target element was deleted by an applied change after the
 * pending changeset's `base_version`. A later `add_element` resets the
 * lifecycle, so the element is alive again. Only the newest `maxScan`
 * changesets are inspected.
 */
export async function checkStaleTarget(
  changesDir: string,
  modelSlug: string,
  elementSlug: string,
  baseVersion: string,
  maxScan: number = 50,
): Promise<StalenessCheckResult> {
  const { changesets, transitions } = await scanHistory(changesDir, maxScan)
  const log = buildChangeLogFromChangesets(changesets)
  // The scan is keyed by model id plus slug; a recorded move keeps the pending
  // change attached to the same instance under every id it carried (design A10).
  const { ids, final } = identityChain(log, modelSlug)
  const lifecycle = lifecycleOf(log, ids, elementSlug)

  if (lifecycle && lifecycle.op === 'remove_element') {
    const byId = transitions.get(lifecycle.changeset)
    const transition = [...ids].map((id) => byId?.get(id)).find((t) => t !== undefined)
    if (transition?.base_version && baseVersion) {
      const deletedAtOrAfterBase =
        compareVersions(transition.base_version, baseVersion) >= 0 ||
        (transition.result_version !== undefined && compareVersions(transition.result_version, baseVersion) > 0)
      if (!deletedAtOrAfterBase) return { stale: false }
    }

    return {
      stale: true,
      code: 'STALE_TARGET_DELETED',
      message: `Target element "${elementSlug}" in model "${modelSlug}" was deleted after base_version ${baseVersion}`,
    }
  }

  if (final !== modelSlug.toLowerCase()) {
    return {
      stale: true,
      code: 'STALE_TARGET_MOVED',
      message: `STALE_TARGET_MOVED: model "${modelSlug}" was renamed to "${final}" after base_version ${baseVersion}; retarget the change to "${final}"`,
    }
  }

  return { stale: false }
}
