import { createHash } from 'node:crypto'
import type { ChangeItem, ChangesetDocument } from './types.js'

/**
 * List of normative proposal property keys included in cryptographic proposal_sha.
 * Execution annotations (status, resolution, resolved_slug) are strictly excluded.
 */
const PROPOSAL_KEYS = [
  'id',
  'op',
  'target',
  'from',
  'to',
  'concept',
  'name',
  'slug',
  'fields',
  'author',
  'notes',
  'base_hash',
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
 * Computes a deterministic SHA-256 seal (64-char lowercase hex) over an array of proposed changes.
 */
export function computeProposalSha(changes: ChangeItem[]): string {
  const canonicalItems = changes.map(canonicalizeChangeItem)
  const serialized = JSON.stringify(canonicalItems)
  return createHash('sha256').update(serialized, 'utf8').digest('hex').toLowerCase()
}

/**
 * Verifies that the proposed changes in a changeset document match its frontmatter proposal_sha seal.
 */
export function verifyProposalSha(doc: ChangesetDocument): boolean {
  if (!doc.frontmatter?.proposal_sha) return false
  const expectedSha = doc.frontmatter.proposal_sha.trim().toLowerCase()
  const computedSha = computeProposalSha(doc.changes)
  return expectedSha === computedSha
}
