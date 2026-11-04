export * from './types/index.js'
export * from './layout.js'

export {
  parseYaml,
  parseFrontmatter,
  parseKnowledge,
  serializeKnowledge,
  parseIndexBlock,
  parseMarkdownTable,
  getSectionType,
  slugify,
  uniqueSlugify,
  normalizeSeparators,
  deriveElementSlugs,
} from './parser/index.js'

export {
  CONCEPT_DEFINITION,
  FIELD_DEFINITION,
  MATRIX_DEFINITION,
  extractBlueprintSchema,
  extractBlueprintSchemaFromContent,
  extractMetaschema,
  validateBlueprintAgainstMetaschema,
  checkElementsAgainstSchema,
  checkWidgetConfig,
  resolveBlueprintSchema,
  canonicalizeDefinition,
  applyAliasToSchema,
  findDeclaredField,
  CANONICAL_BLUEPRINTS,
  findCanonicalBlueprint,
  getCanonicalSpecContent,
  listCanonicalBlueprints,
} from './schema/index.js'
export type {
  BlueprintSchema,
  SchemaCheckOptions,
  IncludeResolver,
  ResolvedBlueprintSchema,
  CanonicalBlueprint,
} from './schema/index.js'

export {
  getSpecForLevel,
  getBlueprint,
  getFormatSpec,
  getDefiNNe,
  SpecResolutionError,
  resolveBlueprintPath,
  getBlueprintSearchPaths,
  UnresolvedBlueprintError,
  resolveBlueprintPackage,
  normalizeVersion,
  parseSpecName,
  findSpecInPackageDir,
  findLocalSpec,
  versionFromFrontmatter,
} from './resolver.js'
export type { SpecResolver, MultiStoreResolverOptions, SpecBlueprintLocation } from './resolver.js'

export {
  validateKnowledge,
  validateDocument,
  validateFormatContent,
  validateFormatSyntax,
  validateReferences,
  validateElementFieldReferences,
  validateTaxonomyHierarchy,
  domainIndexOfResult,
  validateWorkspaceReferences,
  validateWorkspaceSources,
  validateCitations,
  checkRemovedMarkerConstructs,
} from './validator/index.js'
export type {
  ReferenceDiagnostic,
  DocumentValidation,
  SubmodelResolver,
  ValidateKnowledgeOptions,
  SourceResolver,
  SourceResolution,
  CitationSite,
  CitationDiagnostic,
} from './validator/index.js'

export { parseAddress, formatAddress, isAddressError } from './address/index.js'
export type { Address, AddressError, AddressErrorCode, ModelId, Unit } from './address/index.js'
export { buildDomainIndex, fileLocalDiagnostics, versionSkew } from './domain/index.js'
export type {
  AddressResolution,
  CollectionMember,
  DomainIndex,
  DomainModelInput,
  IndexedModel,
  LayoutCode,
  LayoutDiagnostic,
  StorageDeclarationsResolver,
} from './domain/index.js'
export {
  parseCitation,
  parseCitationResult,
  resolveUnitPath,
  resolveUnitPathResult,
  splitSourceFieldValue,
  levenshteinDistance,
  slugifyHeading,
  extractHeadings,
  resolveHeadingSection,
} from './sourceRef.js'
export type { Citation, CitationResult, UnitPathResult, SourceRef, HeadingInfo, ResolvedHeadingSection } from './sourceRef.js'
export { serializeKnowledgeUnitRef, slugifyUnitHeading, normalizeName } from './sourceRef.js'
export type { KnowledgeUnit, HeaderUnit, RowUnit, PointerUnit } from './sourceRef.js'
export { unitLabel } from './sourceRef.js'
export { assertNever } from './assertNever.js'
export { resolveJsonPointer, isJsonPointer } from './jsonPointer.js'
export type { JsonPointerResult } from './jsonPointer.js'
export { parseCsvTable } from './csvTable.js'
export type { CsvTable, CsvTableOptions } from './csvTable.js'
export { resolveUnit } from './unitResolve.js'
export type { ResolvedUnit } from './unitResolve.js'
export { parseKnowledgeQuery, runQuery } from './queryUnits.js'
export type {
  KnowledgeQuery,
  KnowledgeQueryFilter,
  FileSnapshot,
  QueryResult,
} from './queryUnits.js'
export { scanSections } from './querySections.js'
export type { SectionFields } from './querySections.js'

export * from './identity.js'
export * from './metamodel.js'
export * from './recursiveParser/index.js'
export * from './fs-types.js'
export { OWNERSHIP_MARKER, reconcileManifest } from './workspace/reconcileManifest.js'
export type { DiscoveredModel, ManifestChange } from './workspace/reconcileManifest.js'
export { isReconcilableModel } from './workspace/discoverModels.js'
export type { CandidateFile } from './workspace/discoverModels.js'
export {
  parseSemVer,
  compareVersions,
  gapKind,
  parsePinnedUrl,
  classifyAgainstCatalog,
} from './workspace/integrity/versionStatus.js'
export type {
  SemVerTriple,
  VersionStatus,
  VersionGap,
  VersionClassification,
  TemplateCatalog,
  TemplateCatalogEntry,
  TemplateCatalogVersion,
} from './workspace/integrity/versionStatus.js'
export {
  buildWorkspaceIntegrityReport,
  summarizeWorkspaceIntegrity,
} from './workspace/integrity/report.js'
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
} from './workspace/integrity/report.js'
export { listKnowledge, discoverDomainModels, resolveKnowledgeVersion } from './helpers.js'
export type { KnowledgeInfo, DiscoveredDomainModel } from './helpers.js'
export {
  applyMutation,
  listMutationOperations,
  freeze_slugs,
  replayMutations,
  subtreeOf,
  updateReferenceString,
  updateWikiLinks,
} from './mutate.js'
export type { ExtractedSubtree, MutationResult, ReplayOperation, ReplayResult } from './mutate.js'
export { envelope, envelopeList, envelopeVersion, ENVELOPE_MAJOR } from './envelope.js'
export type { VersionedEnvelope } from './envelope.js'
export { Diagnostics } from './diagnostics.js'
export {
  loadBaseline,
  fingerprint,
  diffNewOnly,
  normalizeBaselinePath,
} from './validator/baseline.js'
export type { ValidationBaseline, BaselineEntry, BaselineDiff } from './validator/baseline.js'
export { deriveMatrixWidgetType, normalizeMatrixDecl, scaleRangeFor } from './matrix.js'
export type { MatrixWidgetType } from './matrix.js'
export { mergeKnowledge } from './merge.js'
export * from './console/index.js'
export * from './changelog/index.js'
export * from './changelog/load.js'
export { loadChangeLog } from './changelog/node.js'
export { canonicalUnitModelId } from './changeset/resolved-target.js'
export * from './lineage/index.js'
export { readLineageSnapshot } from './lineage/fs-snapshot.js'

export * from './naming/index.js'
export * from './writeOnce/index.js'
export * from './cognitivize/index.js'
export * from './changeset/index.js'
export * from './scaffold/index.js'
export * from './imports/index.js'
export * from './scope/index.js'
