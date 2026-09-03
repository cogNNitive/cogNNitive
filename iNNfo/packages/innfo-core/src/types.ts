export type ConceptType = 'text' | 'list' | 'category' | 'weight' | 'steps' | 'sequence' | 'model'
export type SpecLevel = 0 | 1 | 2 | 3

export interface ParentRef {
  name: string
  url: string
}

export interface AliasMap {
  concepts?: Record<string, string>
  fields?: Record<string, string>
}

export interface IncludedTemplateRef {
  name: string
  url: string
  alias?: AliasMap
}

export interface TemplateProcedure {
  id: string
  name: string
  path: string
  source_template?: string
}

export interface TemplateSkill {
  name: string
  repo: string
  path: string
  source_template?: string
}

export interface TemplateViewer {
  id: string
  view_type: string
  target_concept?: string
  label?: string
  icon?: string
  description?: string
  source_template?: string
}

export interface ResolvedTemplatePackage {
  name: string
  version: string
  packagePath: string
  specFilePath: string
  isPackageDir: boolean
  tier: 'workspace-package' | 'workspace-flat' | 'global-cache' | 'installed-skill'
}

export interface ReachabilityGraph {
  /** Set of active spec identifiers using normalized '<name>@<version>' or '<name>' keys */
  activeSpecs: Set<string>
  referencedBy: Map<string, string[]>
  orphanedCandidates: string[]
}

export interface ConceptField {
  name: string
  type:
    | 'string'
    | 'select'
    | 'reference'
    | 'image'
    | 'file'
    | 'video'
    | 'audio'
    | 'markdown_inline'
    | 'markdown_file'
    | 'model'
  options?: string[]
  target_concepts?: string[]
  target_template?: string
}

export interface Concept {
  name: string
  parent?: string
  icon?: string
  type: ConceptType
  color?: string
  weight?: number
  fields?: ConceptField[]
  tags?: string[]
}

export interface Marker {
  name: string
  icon?: string
  symbol?: string
  color?: string
  weight?: number
  /** Which entities may be scored on this Marker. Defaults to ['Element']. */
  applies_to?: string[]
  /** Allowed scores (inline array). Omitted for a free numeric scale. */
  values?: string[]
  /** Cell interaction widget for the item-markers matrix column. */
  widgetType?: string
  /** Widget-specific configuration (inline JSON object). See iNNfo "Widget Configuration". */
  widgetConfig?: Record<string, unknown>
}

export interface MatrixDecl {
  name: string
  source: string
  target: string
  params: string
  /** Values array (V_0-1-0+). When `params` is present without `values`, it is auto-converted (reader tolerance). */
  values?: string[]
  /** Widget type for matrix cell interaction: 'boolean' | 'cycle' | 'scale' | 'set' | 'text'. */
  widgetType?: string
  /** Widget-specific configuration (inline JSON object). See iNNfo "Widget Configuration". */
  widgetConfig?: Record<string, unknown>
  /** Optional human-readable explanation of what the matrix represents. */
  description?: string
  /** Min heatmap color (CSS color) */
  min_color?: string
  /** Max heatmap color (CSS color) */
  max_color?: string
  /** Display label for the relationship */
  label?: string
}

export type RelationshipType = 'hierarchy' | 'evaluable_matrix' | 'graph_edge' | 'sequence'

export interface RelationshipDecl {
  enabled: boolean
  via?: string
}

export interface RelationshipTypeDef {
  name: RelationshipType
  description: string
  representation: string
}

export interface SpecFrontmatter {
  spec_version: string
  spec_url: string
  level: SpecLevel
  parent?: string | ParentRef
  parent_spec?: ParentRef
  /**
   * Level-2 only. Names + URLs of peer templates whose Concept / Field /
   * Marker / Matrix Definitions are composed into this template's effective
   * schema **additively** (see iNNfo "Level 2 Template Structure"). Distinct
   * from `parent_spec` (the vertical conformance chain) and from the inert
   * `specializes` field. Bare-string entries are tolerated on read and
   * normalized to `{ name, url: '' }`.
   */
  includes?: IncludedTemplateRef[]
  procedures?: TemplateProcedure[]
  skills?: TemplateSkill[]
  viewers?: TemplateViewer[]
  alias?: AliasMap
  /** Reserved, inert. Named base template for future structural inheritance. */
  specializes?: string
  title?: string
  description?: string
  author?: string
  status?: string
  concepts?: Concept[]
  markers?: Marker[]
  matrices?: MatrixDecl[]
  relationship_types?: RelationshipTypeDef[]
  relationship_declarations?: Partial<Record<RelationshipType, RelationshipDecl>>
  model_version?: string
  last_updated?: string
  [key: string]: unknown
}

export interface ElementNode {
  type: string
  name: string
  description: string
  fields: Record<string, unknown>
  markers: Record<string, number | string>
  /** Optional slug derived from YAML `slug` field or auto-derived from name. */
  slug?: string
  tags?: string[]
}

export interface MatrixCell {
  row: string
  col: string
  value: string
}

export interface MatrixData {
  name: string
  source: string
  target: string
  cells: MatrixCell[]
}

export interface TaxonomyEdge {
  parent: string
  child: string
}

/** Case-insensitive wrapper around Map<string, ElementNode[]> */
export class ElementsMap {
  private _map = new Map<string, { key: string; nodes: ElementNode[] }>()
  set(key: string, nodes: ElementNode[]) {
    this._map.set(key.toLowerCase(), { key, nodes })
  }
  delete(key: string): boolean {
    return this._map.delete(key.toLowerCase())
  }
  has(key: string): boolean {
    return this._map.has(key.toLowerCase())
  }
  get(key: string): ElementNode[] | undefined {
    return this._map.get(key.toLowerCase())?.nodes
  }
  keys(): string[] {
    return Array.from(this._map.values()).map((e) => e.key)
  }
  entries(): Array<[string, ElementNode[]]> {
    return Array.from(this._map.values()).map((e) => [e.key, e.nodes])
  }
  forEach(fn: (nodes: ElementNode[], key: string) => void) {
    for (const { key, nodes } of this._map.values()) {
      fn(nodes, key)
    }
  }
  get size() {
    return this._map.size
  }
  [Symbol.iterator]() {
    return this.entries()[Symbol.iterator]()
  }
  /** JSON serialization support — serializes as a plain record */
  toJSON(): Record<string, ElementNode[]> {
    const obj: Record<string, ElementNode[]> = {}
    for (const [key, nodes] of this.entries()) {
      obj[key] = nodes
    }
    return obj
  }
}

/** Raw section content preserved for round-trip fidelity */
export interface RawSection {
  rawTitle: string
  body: string
}

export interface ParsedModel {
  frontmatter: SpecFrontmatter
  taxonomy: TaxonomyEdge[]
  elements: ElementsMap
  matrices: MatrixData[]
  nodeMarkers: Record<string, Record<string, number | string>>
  rawContent: string
  /** Optional: raw body text per concept for round-trip fidelity */
  rawSections?: Record<string, string>
  /** Slug collisions detected during parsing (FR-002). */
  slugCollisions?: Array<{ slug: string; elements: string[]; concept: string }>
  /** Non-fatal parse warnings (e.g. deprecated features). */
  parseWarnings?: string[]
  /** Tags applied to Concept sections directly (not individual elements) */
  conceptTags?: Record<string, string[]>
}

export interface SpecCache {
  specs: Map<string, SpecDocument>
  chain: string[]
}

export interface SpecDocument {
  name: string
  level: SpecLevel
  parentName?: string
  parentUrl?: string
  frontmatter: SpecFrontmatter
  rawContent: string
}

export interface ValidationError {
  path: string
  message: string
  severity: 'error' | 'warning'
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

/* ── Validation check types (from app validator) ── */

/** A single check result within a validation report. */
export interface ValidationCheck {
  id: string
  label: string
  description: string
  category: 'frontmatter' | 'body' | 'convention'
  severity: 'error' | 'warning' | 'info'
  passed: boolean
  message?: string
}

export interface ValidationSummary {
  total: number
  passed: number
  errors: number
  warnings: number
}

export interface ValidationReport {
  checks: ValidationCheck[]
  summary: ValidationSummary
}

export interface SyntaxCheck {
  id: string
  label: string
  passed: boolean
  message?: string
}

export interface FileDriverOptions {
  encoding?: string
}

export interface ModelEntry {
  name: string
  uri: string
  kind: 'element' | 'asset' | 'concept'
}

/** Structural contract for pluggable model read/write backends (e.g. a caller-supplied write target). */
export interface ModelDriver {
  readModel(uri: string): Promise<ParsedModel>
  writeModel(uri: string, model: ParsedModel): Promise<void>
  listChildren(uri: string): Promise<ModelEntry[]>
  listAssets(uri: string): Promise<string[]>
}

export interface ResolverOptions {
  maxDepth?: number
  timeout?: number
}

/* ── Graph / App Model Types (moved from apps/innfo-editor/src/model/types.ts) ── */

/** Who/what produced a value change. */
export interface Author {
  kind: 'user' | 'ai' | 'system'
  id: string
}

/** Provenance stamp attached to every field write. */
export interface Provenance {
  author: Author
  timestamp: string // ISO-8601
}

/** A single field's value plus who set it and when. */
export interface FieldValue {
  value: unknown
  provenance: Provenance
}

/** A normalized relationship edge stored on a node. */
export interface ModelRelationship {
  targetId: string
  label: string
  value?: string | number
}

/** A single concept declaration, as declared in a document's frontmatter `concepts:` list. */
export interface MetamodelConcept {
  name: string
  icon?: string
  type: string
  color?: string
  weight?: number
  fields?: { name: string; type: string; options?: string[]; target_concepts?: string[] }[]
  tags?: string[]
}

/** A single marker declaration, as declared in a document's frontmatter `markers:` list. */
export interface MetamodelMarker {
  name: string
  icon?: string
  symbol?: string
  color?: string
  weight?: number
}

/**
 * The metamodel declared locally by a root node's own frontmatter
 * (`concepts`/`markers`). Nodes without their own file (nested elements)
 * declare no local metamodel (empty arrays); their effective metamodel is
 * resolved by walking up to their nearest ancestor (see `metamodel.ts`).
 */
export interface LocalMetamodel {
  concepts: MetamodelConcept[]
  markers: MetamodelMarker[]
  taxonomy: TaxonomyEdge[]
}

/**
 * Normalized graph node.
 */
export interface ModelNode {
  id: string // qualifiedId, e.g. "Process/Phase/Task"
  name: string // unique among siblings
  parentId: string | null
  childIds: string[]
  type: string // resolved concept type
  fields: Record<string, FieldValue>
  markers: Record<string, number | string>
  tags?: string[]
  conceptTags?: Record<string, string[]>
  /**
   * Concept-scoped Marker scores (Markers whose `applies_to` includes
   * `Concept`), keyed by Concept name. Present only on the document root;
   * element-scoped scores live in `markers` on each element node.
   */
  conceptMarkers?: Record<string, Record<string, number | string>>
  /**
   * Schema-conformance result for this model against its resolved Template
   * (including everything the Template `includes`). Populated by the host's
   * spec resolver so a synchronous validation pass can surface it without
   * re-resolving. Present only on document roots.
   */
  schemaValidation?: { errors: ValidationError[]; warnings: ValidationError[] }
  relationships: ModelRelationship[]
  rawSections: Record<string, string> // round-trip fidelity
  /**
   * Full original source text for root nodes (the node whose own
   * `_NN.md` file was parsed via `parseModel`). Undefined for
   * element nodes nested inside a document (they have no own file).
   * Used by the serializer for byte/structurally-equivalent no-edit
   * round-trip (R7) instead of re-deriving through `serializeModel`'s
   * canonical reformatting, which is not guaranteed to match source bytes.
   */
  rawContent?: string
  /**
   * This node's own locally-declared metamodel (frontmatter `concepts`/
   * `markers`), present only on root nodes (undefined for nested element
   * nodes, which declare nothing locally). The effective metamodel is
   * resolved by walking up the ancestor chain merging these declarations,
   * closest subtree override wins (R9) — see `metamodel.ts`.
   */
  localMetamodel?: LocalMetamodel
  /**
   * Optional node-kind discriminator.
   * - 'root': the top-level node of a workspace (parentId === null).
   * - 'concept': a `# NN` section representing a type/group.
   * - 'element': an index-block instance.
   * Undefined means the node was created before this discriminator existed
   * (backward-compatible with existing graphs).
   */
  kind?: 'root' | 'concept' | 'element'
  /**
   * Optional metamodel binding for concept/group nodes.
   * - `source: 'metamodel'`: the concept name matched a declared concept in
   *    the resolved metamodel.
   * - `source: 'structural'`: no matching concept found; the node is a
   *    structural concept/group placeholder.
   * Undefined means the node is not a concept node or pre-dates this field.
   */
  conceptBinding?: { name: string; source: 'metamodel' | 'structural' }
  /** Optional slug derived from element YAML `slug` or auto-derived from name. */
  slug?: string
  source: { path: string } // FS location for write-back
  /**
   * Indicates how this node was produced:
   * - 'parsed': created from parsing a real _NN.md document
   * - 'structural': created as a structural placeholder (concept group)
   * Undefined means the node pre-dates this field (backward compatible).
   */
  sourceMode?: 'parsed' | 'structural'
  /** Relative paths of physical assets for this node. */
  assets?: string[]
  /**
   * Workspace-scoped author/owner of this model, propagated from the `author::`
   * field on the workspace manifest's `## NN ModelRef:` entry. Not stored in the
   * model file itself — it is metadata of the workspace that references it.
   * Present only on root nodes reached through a workspace manifest.
   */
  author?: string
}
