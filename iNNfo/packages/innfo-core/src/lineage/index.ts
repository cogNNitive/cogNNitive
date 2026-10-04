export {
  projectLineage,
  extractDeclaredCitations,
  extractFileCitations,
  type LineageDiagnostic,
  type LineageSource,
  type LineageKnowledge,
  type LineageArtifact,
  type LineageProjection,
} from './project.js'

export {
  renderLineageSections,
  renderSourcesSection,
  renderModelsSection,
  renderArtifactsSection,
} from './render.js'

export {
  RECORD_BLUEPRINT,
  RECORD_TEMPLATE_URL,
  RECORD_INNFO_URL,
  splitFrontmatter,
  splitTopLevelSections,
  managedSections,
  renderRecordFrontmatter,
  refreshExistingModel,
  findLineageRecord,
  type RenderedSections,
  type TopLevelBlock,
  type ManagedSection,
} from './record.js'

export { checkLineageDrift, type LineageSectionDiff, type LineageDriftResult } from './drift.js'
