/**
 * Loading changesets into the change log. Browser-safe: it parses in-memory
 * snapshots and never touches the filesystem (that is `node.ts`).
 */
import {
  setFieldsEntries,
  type ChangeItem,
  type ChangeOp,
  type ChangesetDocument,
  type ChangeStatus,
} from '../changeset/types.js'
import { inheritedEvidenceShas } from '../changeset/execution-facts.js'
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
  /** Frontmatter `batch`: the batch identity every change inherits. */
  batch?: string
  /** Frontmatter `evidence_sha256`: cited path -> sha256, inherited per evidence entry. */
  evidenceSha256?: Readonly<Record<string, string>>
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
    changesets.push(changesetLikeOf(file.path, doc))
  }
  return changesets
}

/** A parsed changeset document as the log reads it: its frontmatter facts and changes. */
export function changesetLikeOf(path: string, doc: ChangesetDocument): ChangesetLike {
  const fm = doc.frontmatter
  return {
    path,
    status: fm.status,
    author: fm.author,
    appliedAt: fm.applied_at,
    ...(typeof fm.batch === 'string' ? { batch: fm.batch } : {}),
    ...(fm.evidence_sha256 && typeof fm.evidence_sha256 === 'object' ? { evidenceSha256: fm.evidence_sha256 } : {}),
    changes: doc.changes,
  }
}

/** The execution facts of one change, resolved against its changeset. */
export interface ResolvedChangeFacts {
  status: ChangeStatus
  appliedAt?: string
  batch?: string
  author?: string
  resolvedTarget?: string
  evidenceSha256?: readonly string[]
  resolution?: string
}

/**
 * THE resolution of a change's execution facts (change-provenance): each fact is
 * the change's own value when it carries one, else the value its changeset carries.
 * An applied change without `resolved_target` resolves to its `target`: every applied
 * changeset, compact or per-change, names the address it wrote. Every reader of these
 * facts (the log, the console records) goes through this function.
 */
export function resolveChangeFacts(change: ChangeLike, cs: Omit<ChangesetLike, 'changes' | 'path'>): ResolvedChangeFacts {
  const status = (change.status ?? cs.status ?? 'proposed') as ChangeStatus
  const resolvedTarget =
    change.resolved_target ?? (status === 'applied' ? change.target : undefined)
  const evidenceSha256 =
    change.evidence_sha256 ?? (status === 'applied' ? inheritedEvidenceShas(change.evidence, cs.evidenceSha256) : undefined)
  const facts: ResolvedChangeFacts = { status }
  const appliedAt = change.applied_at ?? cs.appliedAt
  const batch = change.batch ?? cs.batch
  const author = change.author ?? cs.author
  if (appliedAt !== undefined) facts.appliedAt = appliedAt
  if (batch !== undefined) facts.batch = batch
  if (author !== undefined) facts.author = author
  if (resolvedTarget !== undefined) facts.resolvedTarget = resolvedTarget
  if (evidenceSha256 !== undefined) facts.evidenceSha256 = evidenceSha256
  if (change.resolution !== undefined) facts.resolution = change.resolution
  return facts
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
    const facts = resolveChangeFacts(change, cs)
    const status = facts.status
    return expandSetFields({
      id: change.id,
      changeset: cs.path,
      index,
      status,
      changesetStatus,
      appliedAt: facts.appliedAt,
      batch: facts.batch,
      author: facts.author,
      op: change.op as ChangeOp,
      target: change.target,
      resolvedTarget: facts.resolvedTarget,
      evidence: change.evidence,
      evidenceItems: splitEvidence(change.evidence),
      evidenceSha256: facts.evidenceSha256,
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
