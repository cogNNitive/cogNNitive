import { changesetLikeOf, resolveChangeFacts } from '@cognnitive/nn-core'
import type { ChangesetDocument } from '@cognnitive/nn-core'

/**
 * The execution facts of change `index` as the change log resolves them: the
 * change's own value, else the one its changeset frontmatter carries
 * (change-provenance: batch-wide facts are written once).
 */
export function resolvedFacts(doc: ChangesetDocument, index = 0) {
  return resolveChangeFacts(doc.changes[index]!, changesetLikeOf('changes/written_NN.md', doc))
}
