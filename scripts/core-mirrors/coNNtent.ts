/**
 * scripts/core-mirrors/coNNtent.ts
 *
 * Entry point for the `coNNtent` core mirror: the single surface the nn-conntent
 * skill consumes so it keeps no parser, writer or apply engine of its own (design A10).
 * The generated artifact is `scripts/lib/nn-core.generated.cjs` inside the skill.
 */

export * from '../../iNNfo/packages/nn-core/src/scope/index.js'
export {
  parseKnowledge,
  slugify,
  serializeKnowledge,
} from '../../iNNfo/packages/nn-core/src/parser/index.js'
export {
  parseChangeset,
  serializeChangeset,
  computeProposalSha,
} from '../../iNNfo/packages/nn-core/src/changeset/index.js'
export { executeChangesetApply } from '../../iNNfo/packages/nn-mcp/src/tools/apply-change.js'
export { writeProposedChangeset } from '../../iNNfo/packages/nn-mcp/src/tools/propose-changeset.js'
