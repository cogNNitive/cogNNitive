export * from './types'

export {
  parseYaml,
  parseFrontmatter,
  parseModel,
  serializeModel,
  parseIndexBlock,
  parseMarkdownTable,
  getSectionType,
  slugify,
  uniqueSlugify,
  normalizeSeparators,
  deriveElementSlugs,
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
  canonicalizeDefinition,
  applyAliasToSchema,
} from './schema'
export type {
  TemplateSchema,
  SchemaCheckOptions,
  IncludeResolver,
  ResolvedTemplateSchema,
} from './schema'

export {
  getSpecForLevel,
  getTemplate,
  getFormatSpec,
  getDefiNNe,
  SpecResolutionError,
  resolveTemplatePath,
  getTemplateSearchPaths,
  UnresolvedTemplateError,
} from './resolver'
export type { SpecResolver, MultiStoreResolverOptions, SpecTemplateLocation } from './resolver'

export {
  validateModel,
  validateDocument,
  validateFormatContent,
  validateFormatSyntax,
  validateReferences,
  validateElementFieldReferences,
  validateTaxonomyHierarchy,
  QUALIFIED_REF_RE,
  parseQualifiedRef,
  validateWorkspaceReferences,
  validateWorkspaceSources,
} from './validator'
export type {
  ReferenceDiagnostic,
  DocumentValidation,
  SubmodelResolver,
  ValidateModelOptions,
  QualifiedRef,
  SourceResolver,
} from './validator'

export {
  parseSourceRef,
  slugifyHeading,
  extractHeadings,
  resolveHeadingSection,
  SOURCE_FIELD_NAMES,
} from './sourceRef'
export type { SourceRef, HeadingInfo, ResolvedHeadingSection } from './sourceRef'
export {
  parseKnowledgeUnitRef,
  serializeKnowledgeUnitRef,
  slugifyUnitHeading,
  normalizeName,
} from './sourceRef'
export type { KnowledgeUnit, HeaderUnit, RowUnit } from './sourceRef'
export { parseCsvTable } from './csvTable'
export type { CsvTable, CsvTableOptions } from './csvTable'
export { resolveUnit } from './unitResolve'
export type { ResolvedUnit } from './unitResolve'
export { parseKnowledgeQuery, runQuery } from './queryUnits'
export type { KnowledgeQuery, KnowledgeQueryFilter, FileSnapshot, QueryResult } from './queryUnits'
export { scanSections } from './querySections'
export type { SectionFields } from './querySections'

export * from './identity'
export * from './metamodel'
export * from './recursiveParser'
export * from './fs-types'
export { OWNERSHIP_MARKER, reconcileManifest } from './workspace/reconcileManifest'
export type { DiscoveredModel, ManifestChange } from './workspace/reconcileManifest'
export { isReconcilableModel } from './workspace/discoverModels'
export type { CandidateFile } from './workspace/discoverModels'
export {
  parseSemVer,
  compareVersions,
  gapKind,
  parsePinnedUrl,
  classifyAgainstCatalog,
} from './workspace/integrity/versionStatus'
export type {
  SemVerTriple,
  VersionStatus,
  VersionGap,
  VersionClassification,
  TemplateCatalog,
  TemplateCatalogEntry,
  TemplateCatalogVersion,
} from './workspace/integrity/versionStatus'
export {
  buildWorkspaceIntegrityReport,
  summarizeWorkspaceIntegrity,
} from './workspace/integrity/report'
export type {
  WorkspaceIntegrityPorts,
  WorkspaceModelRef,
  IntegrityDiagnostic,
  TemplateResolutionResult,
  ModelIntegrityReport,
  WorkspaceIntegrityReport,
  WorkspaceIntegrityAggregate,
  BuildWorkspaceIntegrityOptions,
  CatalogSource,
  FreshnessField,
  TemplateResolution,
} from './workspace/integrity/report'
export { listModels, resolveSpecVersionFromFilename } from './helpers'
export type { ModelInfo } from './helpers'
export { applyMutation, updateReferenceString, updateWikiLinks } from './mutate'
export type { MutationResult } from './mutate'
export { buildAgentModificationBlock } from './agentModification'
export type { AgentModificationContext } from './agentModification'
export { envelope, envelopeList, envelopeVersion, ENVELOPE_MAJOR } from './envelope'
export type { VersionedEnvelope } from './envelope'
export { Diagnostics } from './diagnostics'
export { loadBaseline, fingerprint, diffNewOnly, normalizeBaselinePath } from './validator/baseline'
export type { ValidationBaseline, BaselineEntry, BaselineDiff } from './validator/baseline'
export { deriveMatrixWidgetType, normalizeMatrixDecl, scaleRangeFor } from './matrix'
export type { MatrixWidgetType } from './matrix'
