/**
 * Loading changesets into the change log. Browser-safe: it parses in-memory
 * snapshots and never touches the filesystem (that is `node.ts`).
 */
import { setFieldsEntries, type ChangeItem, type ChangeOp, type ChangeStatus } from '../changeset/types.js'
import type { FileSnapshot } from '../queryUnits.js'
import { isNNName, isSidecarName, isUnderRootSources, parseName } from '../naming/contract.js'
import { parseChangeset } from '../changeset/parser.js'
import { splitEvidence } from '../changeset/evidence.js'
import { createChangeLog, type ChangeLog, type LoggedChange } from './index.js'

export type { ChangeLog, LoggedChange } from './index.js'

/**
 * A parsed changeset, reduced to what the log needs. `ChangesetRecord` (the
 * console transport) is structurally assignable to it, so both the filesystem
 * path and the console path feed the same builder.
 */
export interface ChangesetLike {
  /** Workspace-relative path, POSIX separators. */
  path: string
  status?: string
  author?: string
  appliedAt?: string
  changes: ReadonlyArray<ChangeLike>
}

/** A change as a parsed changeset or a console record carries it. */
export interface ChangeLike {
  id: string
  op: string
  target: string
  status?: string
  applied_at?: string
  batch?: string
  author?: string
  evidence?: string
  evidence_sha256?: readonly string[]
  resolved_target?: string
  extracted_slugs?: readonly string[]
  from?: string
  to?: string
  concept?: string
  name?: string
  slug?: string
  resolved_slug?: string
  blueprint_name?: string
  blueprint_url?: string
  knowledge_version?: string
  notes?: string
  resolution?: string
  fields?: Record<string, string>
}

/**
 * A changeset document: an `_NN.md` file (not a sidecar) whose stem ends in `_changes`,
 * outside the root `sources/` folder. A changeset copied there (an import, a mirror) is
 * evidence, never a record of this domaiNN.
 */
export function isChangesetPath(path: string): boolean {
  if (isUnderRootSources(path)) return false
  const name = path.split('/').pop() ?? ''
  if (!isNNName(name) || isSidecarName(name)) return false
  const parsed = parseName(name)
  return parsed.kind === 'nn' && parsed.stem.endsWith('_changes')
}

/** Parses the changeset documents of a workspace snapshot; other files are ignored. */
export function parseChangesetSnapshots(files: ReadonlyArray<FileSnapshot>): ChangesetLike[] {
  const changesets: ChangesetLike[] = []
  for (const file of files) {
    if (!isChangesetPath(file.path)) continue
    let doc
    try {
      doc = parseChangeset(file.content)
    } catch {
      continue
    }
    const fm = doc.frontmatter
    changesets.push({
      path: file.path,
      status: fm.status,
      author: fm.author,
      appliedAt: fm.applied_at,
      changes: doc.changes,
    })
  }
  return changesets
}

/**
 * An applied `set_fields` is logged as one `update_field` entry per field it set:
 * the same id, hop, evidence and document index, the unit `model@slug&field`, and a
 * `subIndex` that keeps the canonical order total. This is the ONE place the op is
 * expanded; every consumer reads plain field units.
 */
function expandSetFields(change: LoggedChange): LoggedChange[] {
  if (change.op !== 'set_fields' || !change.applied) return [change]
  const entries = setFieldsEntries(change)
  if (entries.length === 0) return [change]
  const element = change.resolvedTarget ?? change.target
  return entries.map((entry, subIndex) => {
    const { from: _from, ...rest } = change
    return {
      ...rest,
      op: 'update_field' as ChangeOp,
      target: `${change.target}&${entry.field}`,
      resolvedTarget: `${element}&${entry.field}`,
      to: entry.to,
      ...(entry.from !== undefined ? { from: entry.from } : {}),
      subIndex,
    }
  })
}

function loggedChanges(cs: ChangesetLike): LoggedChange[] {
  const changesetStatus = (cs.status ?? 'proposed') as ChangeStatus
  return cs.changes.flatMap((change, index) => {
    const status = (change.status ?? changesetStatus) as ChangeStatus
    return expandSetFields({
      id: change.id,
      changeset: cs.path,
      index,
      status,
      changesetStatus,
      appliedAt: change.applied_at ?? cs.appliedAt,
      batch: change.batch,
      author: change.author ?? cs.author,
      op: change.op as ChangeOp,
      target: change.target,
      resolvedTarget: change.resolved_target,
      evidence: change.evidence,
      evidenceItems: splitEvidence(change.evidence),
      evidenceSha256: change.evidence_sha256,
      extractedSlugs: change.extracted_slugs,
      from: change.from,
      to: change.to,
      concept: change.concept,
      name: change.name,
      slug: change.slug,
      blueprintName: change.blueprint_name,
      blueprintUrl: change.blueprint_url,
      knowledgeVersion: change.knowledge_version,
      resolvedSlug: change.resolved_slug,
      notes: change.notes,
      resolution: change.resolution,
      fields: change.fields,
      applied: status === 'applied',
    })
  })
}

/** Builds the log over parsed changesets (the console transport). */
export function buildChangeLogFromChangesets(changesets: ReadonlyArray<ChangesetLike>): ChangeLog {
  const changes: LoggedChange[] = []
  for (const cs of changesets) changes.push(...loggedChanges(cs))
  return createChangeLog(changes)
}

/** Builds the log over a workspace snapshot. */
export function buildChangeLog(files: ReadonlyArray<FileSnapshot>): ChangeLog {
  return buildChangeLogFromChangesets(parseChangesetSnapshots(files))
}

export type { ChangeItem }
