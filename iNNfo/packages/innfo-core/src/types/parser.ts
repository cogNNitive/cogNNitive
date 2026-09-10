/** Concept `type::` values. The `as const` array is the single source of
 *  truth; `ConceptType` is derived from it so the two cannot drift. */
export const CONCEPT_TYPES = [
  'text',
  'list',
  'category',
  'weight',
  'steps',
  'sequence',
  'model',
] as const
export type ConceptType = (typeof CONCEPT_TYPES)[number]

/** Field Definition `type::` values (single source of truth for `FieldType`). */
export const FIELD_TYPES = [
  'string',
  'select',
  'reference',
  'image',
  'file',
  'video',
  'audio',
  'markdown_inline',
  'markdown_file',
  'model',
] as const
export type FieldType = (typeof FIELD_TYPES)[number]

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
  type: FieldType
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
