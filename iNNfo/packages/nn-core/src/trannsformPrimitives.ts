/**
 * Trannsform primitives bundle entry.
 *
 * Single source of nn-core primitives needed by the distributed `nn-sources` skill.
 * Bundled into `skills/nn-sources/scripts/lib/nn-core.generated.cjs` by
 * `scripts/build-core-mirrors.mjs`.
 */

export {
  slugifyHeading,
  slugifyUnitHeading,
  normalizeName,
  headingSlugParts,
  parseCitation,
  parseCitationResult,
  extractHeadings,
  serializeKnowledgeUnitRef,
} from './sourceRef.js'

export { parseAddress, formatAddress, isAddressError } from './address/index.js'
export { versionSkew } from './domain/skew.js'

export {
  createFsSourceResolver,
} from './console/fs-source-resolver.js'

export {
  validateCitations,
} from './validator/workspaceSources.js'

export {
  projectLineage,
  extractDeclaredCitations,
  extractFileCitations,
  evidenceCitationSites,
  type LineageArtifact,
  type LineageChangeset,
  type LineageEdge,
  type LineageKnowledge,
  type LineageSource,
  type LineageView,
} from './lineage/project.js'

export {
  readLineageSnapshot,
} from './lineage/fs-snapshot.js'

export { buildChangeLog } from './changelog/load.js'
export { isRegenerableView } from './naming/contract.js'

export * from './naming/index.js'

export * from './writeOnce/index.js'

export * from './cognitivize/index.js'

export { readSynchronizations, refreshSynchronization, removeOrphanMirrors } from './sync/index.js'

export { resolveJsonPointer, isJsonPointer } from './jsonPointer.js'
