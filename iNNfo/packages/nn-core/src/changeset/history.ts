/**
 * Staleness of a pending change against the applied history, answered by the
 * change log (change-provenance: one reader for lifecycle).
 *
 * The log already folds every applied change into element lifecycles: the last
 * `add_element` or `remove_element` of an element decides whether the element is
 * alive, and a later `add_element` resets it (the epoch cut). This module reads
 * every changeset once into a log (`loadStalenessHistory`) and answers each
 * pending change from it (`checkStaleTarget`). The log orders changes with
 * `compareChanges`, never by filename, and is never bounded by a count.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseChangeset } from './parser.js'
import { compareVersions } from '../workspace/integrity/versionStatus.js'
import { slugify } from '../parser/slug.js'
import { buildChangeLogFromChangesets, type ChangesetLike } from '../changelog/load.js'
import type { ChangeLog, LoggedChange } from '../changelog/index.js'
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

/** The applied history of a domaiNN, read once per apply. */
export interface StalenessHistory {
  log: ChangeLog
  /** Changeset path -> authored model key (lowercase) -> version transition. */
  transitions: Map<string, Map<string, VersionTransition>>
}

/**
 * Reads every `changes/` document once and builds the change log the staleness
 * check answers from. Read it once per apply and pass it to every
 * `checkStaleTarget` call of that apply.
 */
export async function loadStalenessHistory(changesDir: string): Promise<StalenessHistory> {
  const changesets: ChangesetLike[] = []
  const transitionsByPath: StalenessHistory['transitions'] = new Map()
  let entries: string[]
  try {
    entries = await readdir(changesDir)
  } catch {
    return { log: buildChangeLogFromChangesets([]), transitions: transitionsByPath }
  }

  const files = entries.filter((file) => file.endsWith('.md') && !file.startsWith('.'))

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
    changesets.push({
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
    transitionsByPath.set(path, transitions)
  }

  return { log: buildChangeLogFromChangesets(changesets), transitions: transitionsByPath }
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
 * lifecycle, so the element is alive again. Every applied changeset counts.
 */
export function checkStaleTarget(
  history: StalenessHistory,
  modelSlug: string,
  elementSlug: string,
  baseVersion: string,
): StalenessCheckResult {
  const { log, transitions } = history
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
