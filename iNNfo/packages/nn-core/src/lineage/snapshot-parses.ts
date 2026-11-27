/**
 * The parses of one lineage snapshot, shared by every reader of that snapshot so each
 * file is parsed once (changes-ledger-scaling S3). Browser-safe.
 *
 * Entries are keyed by the snapshot path and are valid only for that snapshot's
 * content: the owner (one tool call) creates it next to the snapshot and drops it with
 * the snapshot. It is never a module-level or cross-call cache.
 */
import { parseKnowledge } from '../parser/core.js'
import { parseChangeset } from '../changeset/parser.js'
import type { ChangesetDocument } from '../changeset/types.js'
import type { ParsedKnowledge } from '../types/parser.js'

export interface SnapshotParses {
  /** `parseKnowledge` of each `_NN.md` document already parsed. */
  knowledge: Map<string, ParsedKnowledge>
  /** `parseChangeset` of each changeset already parsed; `null` when it does not parse. */
  changesets: Map<string, ChangesetDocument | null>
}

export function createSnapshotParses(): SnapshotParses {
  return { knowledge: new Map(), changesets: new Map() }
}

/** `parseKnowledge(content)`, reusing (and recording) the parse of `path` when `parses` is given. */
export function parsedKnowledgeOf(
  parses: SnapshotParses | undefined,
  path: string,
  content: string,
): ParsedKnowledge {
  const known = parses?.knowledge.get(path)
  if (known) return known
  const parsed = parseKnowledge(content)
  parses?.knowledge.set(path, parsed)
  return parsed
}

/**
 * `parseChangeset(content)`, reusing (and recording) the parse of `path` when `parses`
 * is given. Returns `null` instead of throwing for a document that does not parse.
 */
export function parsedChangesetOf(
  parses: SnapshotParses | undefined,
  path: string,
  content: string,
): ChangesetDocument | null {
  if (parses?.changesets.has(path)) return parses.changesets.get(path)!
  let doc: ChangesetDocument | null
  try {
    doc = parseChangeset(content)
  } catch {
    doc = null
  }
  parses?.changesets.set(path, doc)
  return doc
}
