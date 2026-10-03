/**
 * Trannsform primitives bundle entry.
 *
 * Single source of innfo-core primitives needed by the distributed `nn-trannsform` skill.
 * Bundled into `skills/nn-trannsform/scripts/lib/innfo-core.generated.cjs` by
 * `scripts/build-trannsform-core-mirror.mjs`.
 */

export {
  slugifyHeading,
  slugifyUnitHeading,
  normalizeName,
  headingSlugParts,
  parseCitation,
  extractHeadings,
  serializeKnowledgeUnitRef,
} from './sourceRef.js'

export {
  createFsSourceResolver,
} from './console/fs-source-resolver.js'

export {
  validateCitations,
} from './validator/workspaceSources.js'

export {
  projectLineage,
  extractFileCitations,
} from './lineage/project.js'

export {
  renderLineageSections,
} from './lineage/render.js'

export {
  readLineageSnapshot,
} from './lineage/fs-snapshot.js'

export * from './naming/index.js'

export * from './writeOnce/index.js'

export * from './cognitivize/index.js'

export { resolveJsonPointer, isJsonPointer } from './jsonPointer.js'
