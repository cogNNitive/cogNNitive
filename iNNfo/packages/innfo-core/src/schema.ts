import type {
  AliasMap,
  Concept,
  ConceptField,
  IncludedTemplateRef,
  Marker,
  MatrixDecl,
  ParsedModel,
  TaxonomyEdge,
  ValidationError,
} from './types'
import { parseModel } from './parser'

/**
 * Root primitives of the Metaplantilla Nivel 1 (V_0-1-0). A level-2 template
 * instantiates these four primitives as ordinary elements in its body, using
 * the unified syntax:
 *
 *   # NN Concept Definition
 *   ## NN Concept Definition: <Concept Name>
 *   type:: text
 *   weight:: 90
 *
 *   # NN Field Definition
 *   ## NN Field Definition: <Field Name>
 *   concept:: <Concept Name>
 *   type:: string
 *
 *   # NN Marker Definition
 *   ## NN Marker Definition: <Marker Name>
 *   symbol:: *
 *
 *   # NN Matrix Definition
 *   ## NN Matrix Definition: <Matrix Name>
 *   source:: A
 *   target:: B
 *   values:: [Max, High, Low]
 *
 * This module extracts a template's effective schema (concepts, markers,
 * matrices) from those elements. The legacy frontmatter blocks
 * (`concepts:` / `markers:` / `matrices:`) are still honoured when present.
 */

export const CONCEPT_DEFINITION = 'Concept Definition'
export const FIELD_DEFINITION = 'Field Definition'
export const MARKER_DEFINITION = 'Marker Definition'
export const MATRIX_DEFINITION = 'Matrix Definition'

export interface TemplateSchema {
  concepts: Concept[]
  markers: Marker[]
  matrices: MatrixDecl[]
  taxonomy: TaxonomyEdge[]
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v : undefined
}

function asStringArray(v: unknown): string[] | undefined {
  if (Array.isArray(v)) return v.map(String)
  return undefined
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Number(v)
  return undefined
}

function asObject(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined
}

function cleanWikilink(v: unknown): string | undefined {
  const str = asString(v)
  if (!str) return undefined
  const trimmed = str.trim()
  if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
    const inner = trimmed.slice(2, -2).trim()
    return inner !== '' ? inner : undefined
  }
  return trimmed !== '' ? trimmed : undefined
}

/**
 * Extracts a template schema from a parsed document's body elements.
 * Returns empty arrays when the document does not instantiate the root
 * primitives (e.g. a plain level-3 model).
 */
export function extractTemplateSchema(parsed: ParsedModel): TemplateSchema {
  const concepts: Concept[] = []
  const fieldsByConcept = new Map<string, ConceptField[]>()

  for (const el of parsed.elements.get(CONCEPT_DEFINITION) ?? []) {
    const parent = cleanWikilink(el.fields['parent'])
    const concept: Concept = {
      name: el.name,
      parent,
      type: (asString(el.fields['type']) as Concept['type']) ?? 'text',
      icon: asString(el.fields['icon']),
      color: asString(el.fields['color']),
      weight: asNumber(el.fields['weight']),
    }
    concepts.push(concept)
    fieldsByConcept.set(concept.name, [])
  }

  for (const el of parsed.elements.get(FIELD_DEFINITION) ?? []) {
    const owner = asString(el.fields['concept'])
    if (!owner) continue
    const field: ConceptField = {
      name: el.name,
      type: (asString(el.fields['type']) as ConceptField['type']) ?? 'string',
      options: asStringArray(el.fields['options']),
      target_concepts: asStringArray(el.fields['target_concepts']),
      target_template: asString(el.fields['target_template']),
    }
    const list = fieldsByConcept.get(owner)
    if (list) {
      list.push(field)
    } else {
      fieldsByConcept.set(owner, [field])
    }
  }

  for (const concept of concepts) {
    const fields = fieldsByConcept.get(concept.name)
    if (fields && fields.length > 0) concept.fields = fields
  }

  const markers: Marker[] = (parsed.elements.get(MARKER_DEFINITION) ?? []).map((el) => {
    const marker: Marker = {
      name: el.name,
      symbol: asString(el.fields['symbol']),
      icon: asString(el.fields['icon']),
      color: asString(el.fields['color']),
      weight: asNumber(el.fields['weight']),
    }
    const appliesTo = asStringArray(el.fields['applies_to'])
    if (appliesTo) marker.applies_to = appliesTo
    const values = asStringArray(el.fields['values'])
    if (values) marker.values = values
    const widget = asString(el.fields['widget'])
    if (widget) marker.widgetType = widget
    const widgetConfig = asObject(el.fields['widget_config'])
    if (widgetConfig) marker.widgetConfig = widgetConfig
    return marker
  })

  const matrices: MatrixDecl[] = (parsed.elements.get(MATRIX_DEFINITION) ?? []).map((el) => {
    const values = asStringArray(el.fields['values'])
    const widget = asString(el.fields['widget']) ?? asString(el.fields['widgetType'])
    const decl: MatrixDecl = {
      name: el.name,
      source: asString(el.fields['source']) ?? '',
      target: asString(el.fields['target']) ?? '',
      params: '',
    }
    if (values) decl.values = values
    if (widget) decl.widgetType = widget as MatrixDecl['widgetType']
    const widgetConfig = asObject(el.fields['widget_config'])
    if (widgetConfig) decl.widgetConfig = widgetConfig
    const description = asString(el.fields['description'])
    if (description) decl.description = description
    return decl
  })

  let taxonomy: TaxonomyEdge[] = []
  const hasParentField = concepts.some((c) => c.parent !== undefined)
  if (hasParentField) {
    for (const concept of concepts) {
      taxonomy.push({
        parent: concept.parent ?? '',
        child: concept.name,
      })
    }
  } else {
    taxonomy = parsed.taxonomy
  }

  return { concepts, markers, matrices, taxonomy }
}

/**
 * Extracts a template schema from raw document content.
 * Templates instantiate the root primitives in their body; there is no
 * legacy frontmatter fallback.
 */
export function extractTemplateSchemaFromContent(content: string): TemplateSchema {
  return extractTemplateSchema(parseModel(content))
}

/* ── Additive template composition (`includes`) ─────────────────
 *
 * A level-2 template MAY declare `includes: [{ name, url }, ...]` naming peer
 * templates whose Concept / Field / Marker / Matrix Definitions are merged
 * into its effective schema **additively** (iNNfo "Level 2 Template
 * Structure"). Resolution is depth-first, left to right; each included
 * template is itself composed through its own `includes`. Composition never
 * overrides or removes an inherited Definition.
 *
 * When two sources declare a Definition with the same name (case-insensitive):
 *   - AST-identical bodies  → the duplicate is silently merged (one entry).
 *   - bodies that differ    → a validation ERROR that names both sources.
 *
 * "AST-identical" is decided by `canonicalizeDefinition` (property order,
 * surrounding whitespace and the order of set-like arrays such as `applies_to`
 * / `options` / `target_concepts` do not count). `includes` is orthogonal to
 * the vertical `parent_spec` chain and to the inert `specializes` field.
 */

/** Resolve the raw content of an included template by name (and optionally
 *  URL). Returns null when it cannot be resolved. Supplied by the host
 *  (innfo-mcp / the editor) so this module stays I/O-free. */
export type IncludeResolver = (ref: IncludedTemplateRef) => string | null

export interface ResolvedTemplateSchema {
  schema: TemplateSchema
  /** Collisions, cycles and unresolved includes encountered while composing. */
  errors: ValidationError[]
}

/** Keys whose array values are sets (order carries no meaning). */
const SET_LIKE_KEYS = new Set(['applies_to', 'options', 'target_concepts'])

function canonicalValue(v: unknown, key?: string): unknown {
  if (Array.isArray(v)) {
    const items = v.map((x) => canonicalValue(x))
    if (key === 'fields') {
      return [...items]
        .map((x) => JSON.stringify(x))
        .sort()
        .map((s) => JSON.parse(s) as unknown)
    }
    if (key && SET_LIKE_KEYS.has(key)) {
      return [...items].map((x) => JSON.stringify(x)).sort()
    }
    return items
  }
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      const val = (v as Record<string, unknown>)[k]
      if (val === undefined || val === null) continue
      out[k] = canonicalValue(val, k)
    }
    return out
  }
  if (typeof v === 'string') return v.trim()
  return v
}

/**
 * A stable string form of a Concept / Marker / Matrix Definition, used to decide
 * whether two same-named Definitions coming from different `includes` sources are
 * "the same". Insensitive to property order, surrounding whitespace and the order
 * of set-like arrays; sensitive to every actual value.
 */
export function canonicalizeDefinition(def: Concept | Marker | MatrixDecl): string {
  return JSON.stringify(canonicalValue(def))
}

/**
 * Applies frontmatter `alias` map to a TemplateSchema, renaming concepts, field scopes,
 * matrix source/target concepts, marker applies_to concepts, and taxonomy edges.
 */
export function applyAliasToSchema(schema: TemplateSchema, alias?: AliasMap): TemplateSchema {
  if (!alias || (!alias.concepts && !alias.fields)) {
    return schema
  }

  const conceptMap = alias.concepts ?? {}
  const fieldMap = alias.fields ?? {}

  const conceptRenameLookup = new Map<string, string>()
  for (const [oldName, newName] of Object.entries(conceptMap)) {
    conceptRenameLookup.set(oldName.toLowerCase(), newName)
  }

  const fieldRenameLookup = new Map<string, string>()
  for (const [oldKey, newKey] of Object.entries(fieldMap)) {
    fieldRenameLookup.set(oldKey.toLowerCase(), newKey)
  }

  const concepts: Concept[] = schema.concepts.map((c) => {
    const oldName = c.name
    const newConceptName = conceptRenameLookup.get(oldName.toLowerCase()) ?? oldName

    const fields = c.fields?.map((f) => {
      const oldFieldKey = `${oldName.toLowerCase()}.${f.name.toLowerCase()}`
      const aliasVal = fieldRenameLookup.get(oldFieldKey)
      let newFieldName = f.name
      if (aliasVal) {
        newFieldName = aliasVal.includes('.') ? aliasVal.split('.').pop()! : aliasVal
      }

      let target_concepts = f.target_concepts
      if (target_concepts) {
        target_concepts = target_concepts.map(
          (tc) => conceptRenameLookup.get(tc.toLowerCase()) ?? tc,
        )
      }

      return {
        ...f,
        name: newFieldName,
        ...(target_concepts ? { target_concepts } : {}),
      }
    })

    return {
      ...c,
      name: newConceptName,
      ...(fields ? { fields } : {}),
    }
  })

  const markers: Marker[] = schema.markers.map((m) => {
    let applies_to = m.applies_to
    if (applies_to) {
      applies_to = applies_to.map((ac) => conceptRenameLookup.get(ac.toLowerCase()) ?? ac)
    }
    return {
      ...m,
      ...(applies_to ? { applies_to } : {}),
    }
  })

  const matrices: MatrixDecl[] = schema.matrices.map((mx) => {
    const source = conceptRenameLookup.get(mx.source.toLowerCase()) ?? mx.source
    const target = conceptRenameLookup.get(mx.target.toLowerCase()) ?? mx.target
    return {
      ...mx,
      source,
      target,
    }
  })

  const taxonomy: TaxonomyEdge[] = schema.taxonomy.map((edge) => {
    const parent = conceptRenameLookup.get(edge.parent.toLowerCase()) ?? edge.parent
    const child = conceptRenameLookup.get(edge.child.toLowerCase()) ?? edge.child
    return { parent, child }
  })

  return { concepts, markers, matrices, taxonomy }
}

interface Provenanced<T> {
  source: string
  def: T
}

interface Provenance {
  concept: Map<string, Provenanced<Concept>>
  marker: Map<string, Provenanced<Marker>>
  matrix: Map<string, Provenanced<MatrixDecl>>
  field: Map<string, string>
}

/**
 * Merge one already-resolved schema into the accumulator. A same-named
 * Definition from a different source is silently dropped when its body is
 * AST-identical to the one already merged, and is an ERROR (naming both
 * sources) when the bodies differ or un-aliased collisions occur.
 */
function mergeDefinition<T extends Concept | Marker | MatrixDecl>(
  incoming: T,
  incomingSource: string,
  kindLabel: 'Concept' | 'Marker' | 'Matrix',
  seen: Map<string, Provenanced<T>>,
  target: T[],
  errors: ValidationError[],
  isHost: boolean = false,
): boolean {
  const key = incoming.name.toLowerCase()
  const prior = seen.get(key)
  if (prior) {
    if (canonicalizeDefinition(prior.def) !== canonicalizeDefinition(incoming)) {
      if (!isHost && prior.source !== incomingSource) {
        errors.push({
          path: `includes.${kindLabel}.${incoming.name}`,
          message: `[COMPOSITION_COLLISION] ${kindLabel} Definition "${incoming.name}" collision detected between included templates "${prior.source}" and "${incomingSource}". Use frontmatter \`alias\` to resolve collisions.`,
          severity: 'error',
        })
      } else {
        errors.push({
          path: `includes.${kindLabel}.${incoming.name}`,
          message: `${kindLabel} Definition "${incoming.name}" is declared with different bodies by both "${prior.source}" and "${incomingSource}" — \`includes\` composition is additive and MUST NOT redeclare a Definition differently`,
          severity: 'error',
        })
      }
    }
    // AST-identical → deduplicate silently
    return false
  }
  seen.set(key, { source: incomingSource, def: incoming })
  target.push(incoming)
  return true
}

function mergeSchemaInto(
  acc: TemplateSchema,
  incoming: TemplateSchema,
  incomingSource: string,
  provenance: Provenance,
  errors: ValidationError[],
  isHost: boolean = false,
): void {
  for (const c of incoming.concepts) {
    mergeDefinition(c, incomingSource, 'Concept', provenance.concept, acc.concepts, errors, isHost)
    for (const f of c.fields ?? []) {
      const fieldKey = `${c.name.toLowerCase()}.${f.name.toLowerCase()}`
      const priorFieldSource = provenance.field.get(fieldKey)
      if (priorFieldSource && priorFieldSource !== incomingSource && !isHost) {
        const existingConcept = acc.concepts.find(
          (ac) => ac.name.toLowerCase() === c.name.toLowerCase(),
        )
        const existingField = existingConcept?.fields?.find(
          (af) => af.name.toLowerCase() === f.name.toLowerCase(),
        )
        if (existingField && JSON.stringify(existingField) !== JSON.stringify(f)) {
          errors.push({
            path: `includes.Field.${c.name}.${f.name}`,
            message: `[COMPOSITION_COLLISION] Field "${c.name}.${f.name}" collision detected between included templates "${priorFieldSource}" and "${incomingSource}". Use frontmatter \`alias\` to resolve collisions.`,
            severity: 'error',
          })
        }
      } else {
        provenance.field.set(fieldKey, incomingSource)
      }
    }
  }
  for (const m of incoming.markers) {
    mergeDefinition(m, incomingSource, 'Marker', provenance.marker, acc.markers, errors, isHost)
  }
  for (const mx of incoming.matrices) {
    mergeDefinition(mx, incomingSource, 'Matrix', provenance.matrix, acc.matrices, errors, isHost)
  }
  for (const edge of incoming.taxonomy) {
    const existingIndex = acc.taxonomy.findIndex(
      (e) => e.child.toLowerCase() === edge.child.toLowerCase(),
    )
    if (existingIndex !== -1) {
      if (isHost) {
        acc.taxonomy[existingIndex] = edge
      }
    } else {
      acc.taxonomy.push(edge)
    }
  }
}

/**
 * Resolve a level-2 template's effective schema, composing every template it
 * `includes` (recursively, depth-first, left to right up to depth 10) on top of a base of
 * the included schemas. Returns the merged schema plus any composition
 * errors (name collisions, cycles, unresolved includes). When the template
 * declares no `includes`, or no resolver is supplied, this is just
 * `extractTemplateSchema` with an empty error list.
 */
export function resolveTemplateSchema(
  templateContent: string,
  resolveInclude?: IncludeResolver,
  _seen: Set<string> = new Set(),
  _depth: number = 0,
): ResolvedTemplateSchema {
  const parsed = parseModel(templateContent)
  const local = extractTemplateSchema(parsed)
  const includes = parsed.frontmatter?.includes ?? []
  if (!resolveInclude || includes.length === 0) {
    return { schema: local, errors: [] }
  }

  if (_depth >= 10) {
    return {
      schema: local,
      errors: [
        {
          path: 'includes',
          message: 'Max inclusion depth of 10 exceeded',
          severity: 'error',
        },
      ],
    }
  }

  const selfLabel = String(parsed.frontmatter?.title ?? 'this template')
  const errors: ValidationError[] = []
  const base: TemplateSchema = { concepts: [], markers: [], matrices: [], taxonomy: [] }
  const provenance: Provenance = {
    concept: new Map(),
    marker: new Map(),
    matrix: new Map(),
    field: new Map(),
  }

  for (const ref of includes) {
    const key = ref.name.toLowerCase()
    if (_seen.has(key)) {
      errors.push({
        path: `includes.${ref.name}`,
        message: `Cyclic \`includes\`: "${ref.name}" is already being composed further up the chain`,
        severity: 'error',
      })
      continue
    }
    const content = resolveInclude(ref)
    if (content === null) {
      errors.push({
        path: `includes.${ref.name}`,
        message: `Included template "${ref.name}" could not be resolved${ref.url ? ` from "${ref.url}"` : ''}`,
        severity: 'error',
      })
      continue
    }
    const nested = resolveTemplateSchema(
      content,
      resolveInclude,
      new Set([..._seen, key]),
      _depth + 1,
    )
    errors.push(...nested.errors)
    const aliasedSchema = ref.alias ? applyAliasToSchema(nested.schema, ref.alias) : nested.schema
    const includedLabel = String(parseModel(content).frontmatter?.title ?? ref.name)
    mergeSchemaInto(base, aliasedSchema, includedLabel, provenance, errors, false)
  }

  // The composite template's own definitions apply on top of the union.
  mergeSchemaInto(base, local, selfLabel, provenance, errors, true)

  return { schema: base, errors }
}

/* ── Metaschema (Self-Description) ──────────────────────────────
 *
 * The level-1 iNNfo spec carries, under its "## Metaschema (Self-Description)"
 * section, a fenced ```markdown block that expresses the four root primitives
 * in iNNfo's own syntax. `validateTemplateAgainstMetaschema` resolves that
 * block and checks a level-2 template's `… Definition` elements against it —
 * the same code path (`extractTemplateSchema` + per-Field checks) used to
 * validate a level-3 Model against its level-2 Template.
 */

/**
 * Pull the fenced ```markdown block that follows the "The Metaschema" heading
 * inside the level-1 iNNfo spec content. Returns null when absent.
 */
export function extractMetaschema(specContent: string): string | null {
  const anchor = specContent.search(/^#{1,6}\s+The Metaschema\s*$/m)
  const region = anchor >= 0 ? specContent.slice(anchor) : specContent
  const fence = region.match(/```(?:markdown|md)?\s*\n([\s\S]*?)\n```/)
  return fence ? fence[1] : null
}

/** Field names REQUIRED on each primitive — transcribed from the "(required)"
 *  markers in the iNNfo spec's Metaschema section (source of truth). */
const REQUIRED_BY_PRIMITIVE: Record<string, string[]> = {
  [CONCEPT_DEFINITION]: ['type'],
  [FIELD_DEFINITION]: ['concept', 'type'],
  [MARKER_DEFINITION]: [],
  [MATRIX_DEFINITION]: ['source', 'target'],
}

export interface SchemaCheckOptions {
  /** How to report a property no Field Definition declares. Default `warning`. */
  unknownProperty?: 'error' | 'warning' | 'ignore'
  /** `<concept name>` → field names that MUST be present on every element. */
  requiredByConcept?: Record<string, string[]>
  /** Also flag element groups whose Concept is absent from the schema. */
  reportUnknownConcept?: boolean
}

/**
 * The one property/enum conformance pass shared by every level boundary.
 * Given element groups (`Concept name` → elements) and a resolved schema
 * (`Concept[]` with their `fields`), it reports:
 *   - properties not declared by any Field Definition of the owning Concept,
 *   - values outside a `select` Field's `options`,
 *   - missing required properties.
 * Level-2-against-L1 (primitive elements vs the metaschema) and
 * level-3-against-L2 (model elements vs the template) call this with the same
 * signature — they differ only in which schema is passed. Reference and
 * matrix-cell checks are model-only and layered on top by `validateModel`.
 */
export function checkElementsAgainstSchema(
  elementGroups: Iterable<[string, Array<{ name: string; fields: Record<string, unknown> }>]>,
  concepts: Concept[],
  opts: SchemaCheckOptions = {},
): ValidationError[] {
  const unknownProperty = opts.unknownProperty ?? 'warning'
  const conceptByName = new Map(concepts.map((c) => [c.name.toLowerCase(), c]))
  const diagnostics: ValidationError[] = []

  for (const [conceptName, elements] of elementGroups) {
    const def = conceptByName.get(conceptName.toLowerCase())
    if (!def) {
      if (opts.reportUnknownConcept) {
        diagnostics.push({
          path: `${conceptName}`,
          message: `Concept "${conceptName}" is not defined in the schema`,
          severity: 'error',
        })
      }
      continue
    }
    const fieldByName = new Map((def.fields ?? []).map((f) => [f.name.toLowerCase(), f]))
    const required =
      opts.requiredByConcept?.[def.name] ?? opts.requiredByConcept?.[conceptName] ?? []

    for (const el of elements) {
      for (const key of required) {
        const v = el.fields[key]
        if (v === undefined || v === null || v === '') {
          diagnostics.push({
            path: `${def.name}.${el.name}.${key}`,
            message: `${def.name} "${el.name}" is missing required property "${key}"`,
            severity: 'error',
          })
        }
      }

      for (const [key, rawVal] of Object.entries(el.fields)) {
        const fieldDef = fieldByName.get(key.toLowerCase())
        if (!fieldDef) {
          if (unknownProperty !== 'ignore') {
            diagnostics.push({
              path: `${def.name}.${el.name}.${key}`,
              message: `Property "${key}" is not declared on ${def.name} in the schema`,
              severity: unknownProperty,
            })
          }
          continue
        }
        if (fieldDef.type === 'select' && fieldDef.options && fieldDef.options.length > 0) {
          const val = String(rawVal)
          if (!fieldDef.options.includes(val)) {
            diagnostics.push({
              path: `${def.name}.${el.name}.${key}`,
              message: `Invalid value "${val}" for "${key}". Allowed: ${fieldDef.options.join(', ')}`,
              severity: 'error',
            })
          }
        }
      }
    }
  }

  return diagnostics
}

/** Allowed `widget_config` keys per `widget` value (iNNfo "Widget Configuration"). */
const WIDGET_CONFIG_KEYS: Record<string, string[]> = {
  scale: ['min', 'max', 'step'],
  cycle: ['order'],
  set: ['max_selections'],
  text: ['max_length'],
  boolean: [],
}

/**
 * Validate the `widget` / `widget_config` pair on Marker/Matrix Definition
 * elements: unknown keys for the declared widget are WARNINGs, a `scale`
 * missing `min`/`max` is an ERROR, `widget_config` without `widget` is a
 * WARNING.
 */
export function checkWidgetConfig(
  elementGroups: Iterable<[string, Array<{ name: string; fields: Record<string, unknown> }>]>,
): ValidationError[] {
  const diagnostics: ValidationError[] = []
  for (const [primitive, elements] of elementGroups) {
    for (const el of elements) {
      const widget = asString(el.fields['widget'])
      const cfg = asObject(el.fields['widget_config'])
      if (!cfg) continue
      if (!widget) {
        diagnostics.push({
          path: `${primitive}.${el.name}.widget_config`,
          message: `"${el.name}" declares widget_config but no widget`,
          severity: 'warning',
        })
        continue
      }
      const allowed = WIDGET_CONFIG_KEYS[widget.toLowerCase()]
      if (!allowed) continue
      for (const key of Object.keys(cfg)) {
        if (!allowed.includes(key)) {
          diagnostics.push({
            path: `${primitive}.${el.name}.widget_config.${key}`,
            message: `"${key}" is not a widget_config key for widget "${widget}". Allowed: ${allowed.join(', ') || '(none)'}`,
            severity: 'warning',
          })
        }
      }
      if (widget.toLowerCase() === 'scale') {
        for (const req of ['min', 'max']) {
          if (cfg[req] === undefined || cfg[req] === null || cfg[req] === '') {
            diagnostics.push({
              path: `${primitive}.${el.name}.widget_config.${req}`,
              message: `widget "scale" requires widget_config.${req}`,
              severity: 'error',
            })
          }
        }
      }
    }
  }
  return diagnostics
}

/**
 * Validate a level-2 template's root-primitive elements against the level-1
 * metaschema. `metaschemaSpecContent` is the raw content of the resolved
 * level-1 iNNfo spec. Unknown properties are warnings; bad enum values and
 * missing required properties are errors. When the spec carries no resolvable
 * metaschema block, a single warning is returned and the check is skipped.
 */
export function validateTemplateAgainstMetaschema(
  templateContent: string,
  metaschemaSpecContent: string,
): ValidationError[] {
  const metaMarkdown = extractMetaschema(metaschemaSpecContent)
  if (!metaMarkdown) {
    return [
      {
        path: 'metaschema',
        message:
          'Resolved level-1 spec has no "The Metaschema" block; template primitive validation skipped',
        severity: 'warning',
      },
    ]
  }

  const metaConcepts = extractTemplateSchema(parseModel(metaMarkdown)).concepts
  const template = parseModel(templateContent)
  const groups: Array<[string, Array<{ name: string; fields: Record<string, unknown> }>]> = [
    CONCEPT_DEFINITION,
    FIELD_DEFINITION,
    MARKER_DEFINITION,
    MATRIX_DEFINITION,
  ].map((primitive) => [primitive, template.elements.get(primitive) ?? []])

  return [
    ...checkElementsAgainstSchema(groups, metaConcepts, {
      unknownProperty: 'warning',
      requiredByConcept: REQUIRED_BY_PRIMITIVE,
    }),
    ...checkWidgetConfig([
      [MARKER_DEFINITION, template.elements.get(MARKER_DEFINITION) ?? []],
      [MATRIX_DEFINITION, template.elements.get(MATRIX_DEFINITION) ?? []],
    ]),
  ]
}
