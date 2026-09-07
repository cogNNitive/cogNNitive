export * from './types'
export {
  parseYaml,
  parseFrontmatter,
  parseModel,
  serializeModel,
  parseIndexBlock,
  parseMarkdownTable,
  getSectionType,
  normalizeSeparators,
} from './parser'
export {
  CONCEPT_DEFINITION,
  FIELD_DEFINITION,
  MARKER_DEFINITION,
  MATRIX_DEFINITION,
  extractTemplateSchema,
  extractTemplateSchemaFromContent,
  extractMetaschema,
  validateTemplateAgainstMetaschema,
  checkElementsAgainstSchema,
  checkWidgetConfig,
  resolveTemplateSchema,
} from './schema'
export type {
  TemplateSchema,
  SchemaCheckOptions,
  IncludeResolver,
  ResolvedTemplateSchema,
} from './schema'
export {
  validateModel,
  validateDocument,
  validateFormatContent,
  validateFormatSyntax,
  validateWorkspaceReferences,
  validateWorkspaceSources,
} from './validator'
export type { DocumentValidation, ReferenceDiagnostic, SourceResolver } from './validator'

export { parseSourceRef, slugifyHeading, extractHeadings, resolveHeadingSection } from './sourceRef'
export type { SourceRef, HeadingInfo, ResolvedHeadingSection } from './sourceRef'
export { applyMutation, updateReferenceString } from './mutate'
export type { MutationResult } from './mutate'
export { buildAgentModificationBlock } from './agentModification'
export type { AgentModificationContext } from './agentModification'
export { deriveMatrixWidgetType, normalizeMatrixDecl, scaleRangeFor } from './matrix'
export type { MatrixWidgetType } from './matrix'
export * from './identity'
export * from './metamodel'
export * from './fs-types'
export {
  recursiveParse,
  normalizeSingleModel,
  resolveGraphEdgeTarget,
  resolveQualifiedIdToPath,
  buildWorkspaceIndex,
  type ParseIssue,
  type RecursiveParseResult,
  type WorkspaceIndex,
} from './recursiveParser'
export {
  OWNERSHIP_MARKER,
  reconcileManifest,
  type DiscoveredModel,
  type ManifestChange,
} from './workspace/reconcileManifest'
export { isReconcilableModel, type CandidateFile } from './workspace/discoverModels'
export {
  parseSemVer,
  compareVersions,
  gapKind,
  parsePinnedUrl,
  classifyAgainstCatalog,
  type SemVerTriple,
  type VersionStatus,
  type VersionGap,
  type VersionClassification,
  type TemplateCatalog,
  type TemplateCatalogEntry,
  type TemplateCatalogVersion,
} from './workspace/integrity/versionStatus'
export {
  buildWorkspaceIntegrityReport,
  summarizeWorkspaceIntegrity,
  type WorkspaceIntegrityPorts,
  type WorkspaceModelRef,
  type IntegrityDiagnostic,
  type TemplateResolutionResult,
  type ModelIntegrityReport,
  type WorkspaceIntegrityReport,
  type WorkspaceIntegrityAggregate,
  type BuildWorkspaceIntegrityOptions,
  type CatalogSource,
  type FreshnessField,
  type TemplateResolution,
} from './workspace/integrity/report'
export {
  getSpecForLevel,
  getTemplate,
  getFormatSpec,
  getDefiNNe,
  SpecResolutionError,
} from './resolver'
export type { SpecResolver } from './resolver'
