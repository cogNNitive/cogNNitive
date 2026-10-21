/**
 * Trannsform primitives bundle entry.
 *
 * Single source of nn-core primitives needed by the distributed `nn-sources` skill.
 * Bundled into `skills/nn-sources/scripts/lib/nn-core.generated.cjs` by
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
  extractDeclaredCitations,
  extractFileCitations,
} from './lineage/project.js'

export {
  renderLineageSections,
} from './lineage/render.js'

export {
  readLineageSnapshot,
  readLineageRecord,
} from './lineage/fs-snapshot.js'

export {
  RECORD_TEMPLATE_URL,
  RECORD_INNFO_URL,
  RECORD_BLUEPRINT,
  splitTopLevelSections,
  renderRecordFrontmatter,
  refreshExistingModel,
  findLineageRecord,
} from './lineage/record.js'

export { checkLineageDrift } from './lineage/drift.js'

export * from './naming/index.js'

export * from './writeOnce/index.js'

export * from './cognitivize/index.js'

export { resolveJsonPointer, isJsonPointer } from './jsonPointer.js'
