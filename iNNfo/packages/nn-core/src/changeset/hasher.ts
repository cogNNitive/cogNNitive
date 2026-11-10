import { createHash } from 'node:crypto'
import type { ChangeItem, ChangesetDocument } from './types.js'

/**
 * The apply-written execution facts, as one exported list. They are annotation
 * lines, never proposal input, and they are excluded from `proposal_sha`.
 */
export const EXECUTION_FACT_KEYS = [
  'resolved_slug',
  'resolved_target',
  'evidence_sha256',
  'extracted_slugs',
] as const

export type ExecutionFactKey = (typeof EXECUTION_FACT_KEYS)[number]

/**
 * The frontmatter keys apply writes: execution facts of the whole batch, never
 * proposal input. The seal covers only the changes (and the provenance markers),
 * so none of these is part of `proposal_sha`.
 */
export const FRONTMATTER_EXECUTION_KEYS = [
  'status',
  'resolution',
  'applied_at',
  'batch',
  'models',
  'evidence_sha256',
] as const

/**
 * List of normative proposal property keys included in cryptographic proposal_sha.
 * Execution annotations (status, resolution, resolved_slug, resolved_target,
 * evidence_sha256, applied_at, batch) and the frontmatter execution fields
 * (applied_at, models) are strictly excluded.
 */
export const PROPOSAL_KEYS = [
  'id',
  'op',
  'target',
  'from',
  'to',
  'concept',
  'name',
  'slug',
  'seed',
  'author',
  'notes',
  'base_hash',
  'evidence',
  'blueprint_name',
  'blueprint_url',
  'knowledge_version',
  'gate',
  'verdict',
  'reviewed_hash',
  'plan_hash',
] as const

/**
 * Canonicalizes an object into a deterministic string representation.
 */
function canonicalizeValue(val: unknown): unknown {
  if (val === null || val === undefined) return undefined
  if (typeof val !== 'object') return val
  if (Array.isArray(val)) {
    return val.map(canonicalizeValue)
  }
  const obj = val as Record<string, unknown>
  const sortedKeys = Object.keys(obj).sort()
  const out: Record<string, unknown> = {}
  for (const k of sortedKeys) {
    const v = canonicalizeValue(obj[k])
    if (v !== undefined) {
      out[k] = v
    }
  }
  return out
}

/**
 * Extracts and canonicalizes the proposed change item fields for hashing.
 */
function canonicalizeChangeItem(change: ChangeItem): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const key of PROPOSAL_KEYS) {
    const val = change[key as keyof ChangeItem]
    if (val !== undefined && val !== null) {
      result[key] = canonicalizeValue(val)
    }
  }
  return result
}

/**
 * Computes a deterministic SHA-256 seal (64-char lowercase hex) over an array of
 * proposed changes, plus the human-provenance markers (`author_kind`, `origin`,
 * `reviewer`) when present, so a verdict seal covers them
 * (changeset-review-gate "The seal covers verdict keys and provenance").
 */
export function computeProposalSha(changes: ChangeItem[], frontmatter?: { author_kind?: string; origin?: string; reviewer?: string }): string {
  const canonicalItems = changes.map(canonicalizeChangeItem)
  const serialized = JSON.stringify(canonicalItems)
  const hash = createHash('sha256').update(serialized, 'utf8')
  if (frontmatter && (frontmatter.author_kind !== undefined || frontmatter.origin !== undefined || frontmatter.reviewer !== undefined)) {
    const markers: Record<string, unknown> = {}
    for (const key of ['author_kind', 'origin', 'reviewer'] as const) {
      if (frontmatter[key] !== undefined) markers[key] = frontmatter[key]
    }
    hash.update('\n:::provenance:::\n').update(JSON.stringify(markers))
  }
  return hash.digest('hex').toLowerCase()
}

/**
 * Verifies that the proposed changes in a changeset document match its frontmatter proposal_sha seal.
 */
export function verifyProposalSha(doc: ChangesetDocument): boolean {
  if (!doc.frontmatter?.proposal_sha) return false
  const expectedSha = doc.frontmatter.proposal_sha.trim().toLowerCase()
  const computedSha = computeProposalSha(doc.changes, doc.frontmatter)
  return expectedSha === computedSha
}
