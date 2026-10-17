import type {
  Concept,
  ConceptField,
  GlobalField,
  MatrixDecl,
  ParsedKnowledge,
  TaxonomyEdge,
} from '../types/index.js'
import { parseKnowledge } from '../parser/index.js'

/**
 * Root primitives of the Metaplantilla Nivel 1 (V_0-5-0). A level-2 template
 * instantiates these primitives as ordinary elements in its body, using
 * the unified syntax:
 *
 *   # NN Concept Definition
 *   ## NN Concept Definition: <Concept Name>
 *   type:: text
 *
 *   # NN Field Definition
 *   ## NN Field Definition: <Field Name>
 *   concept:: <Concept Name>
 *   type:: string
 *
 *   # NN Matrix Definition
 *   ## NN Matrix Definition: <Matrix Name>
 *   source:: <Concept Name>
 *   target:: <Concept Name>
 */

export const CONCEPT_DEFINITION = 'Concept Definition'
export const FIELD_DEFINITION = 'Field Definition'
export const MATRIX_DEFINITION = 'Matrix Definition'

export interface BlueprintSchema {
  concepts: Concept[]
  matrices: MatrixDecl[]
  taxonomy: TaxonomyEdge[]
  globalFields?: GlobalField[]
}

export function asString(v: unknown): string | undefined {
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

export function asObject(v: unknown): Record<string, unknown> | undefined {
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
export function extractBlueprintSchema(parsed: ParsedKnowledge): BlueprintSchema {
  const concepts: Concept[] = []
  const fieldsByConcept = new Map<string, ConceptField[]>()
  const globalFields: GlobalField[] = []

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
    const conceptDescription = asString(el.fields['description'])
    if (conceptDescription) concept.description = conceptDescription
    concepts.push(concept)
    fieldsByConcept.set(concept.name, [])
  }

  for (const el of parsed.elements.get(FIELD_DEFINITION) ?? []) {
    const rawConcept = el.fields['concept']
    let scope: 'concept' | 'list' | '*' = 'concept'
    let targets: string[] | undefined
    let owner: string | undefined

    if (
      rawConcept === '*' ||
      (Array.isArray(rawConcept) && rawConcept.length === 1 && String(rawConcept[0]).trim() === '*')
    ) {
      scope = '*'
    } else if (Array.isArray(rawConcept)) {
      scope = 'list'
      targets = rawConcept.map(String).map((s) => s.trim()).filter(Boolean)
    } else if (typeof rawConcept === 'string') {
      const trimmed = rawConcept.trim()
      if (trimmed === '*') {
        scope = '*'
      } else if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        scope = 'list'
        targets = trimmed.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean)
      } else if (trimmed !== '') {
        scope = 'concept'
        owner = trimmed
      }
    }

    if (!owner && !targets && scope !== '*') continue

    const targetBlueprint = asString(el.fields['target_blueprint'])
    const multiple = el.fields['multiple'] === true || el.fields['multiple'] === 'true'
    const widget = asString(el.fields['widget'])
    const widgetConfig = asObject(el.fields['widget_config'])
    const field: ConceptField = {
      name: el.name,
      type: (asString(el.fields['type']) as ConceptField['type']) ?? 'string',
      options: asStringArray(el.fields['options']),
      target_concepts: asStringArray(el.fields['target_concepts']),
      target_blueprint: targetBlueprint,
      scope,
    }
    if (multiple) field.multiple = true
    if (widget) field.widget = widget
    if (widgetConfig) field.widgetConfig = widgetConfig
    const fieldDescription = asString(el.fields['description'])
    if (fieldDescription) field.description = fieldDescription

    if (scope === 'concept' && owner) {
      const list = fieldsByConcept.get(owner)
      if (list) {
        list.push(field)
      } else {
        fieldsByConcept.set(owner, [field])
      }
    } else {
      globalFields.push({
        field,
        scope: scope === 'list' ? 'list' : '*',
        targets,
      })
    }
  }

  for (const concept of concepts) {
    const fields = fieldsByConcept.get(concept.name)
    if (fields && fields.length > 0) concept.fields = fields
  }

  const matrices: MatrixDecl[] = (parsed.elements.get(MATRIX_DEFINITION) ?? []).map((el) => {
    const decl: MatrixDecl = {
      name: el.name,
      source: asString(el.fields['source']) ?? '',
      target: asString(el.fields['target']) ?? '',
      params: asString(el.fields['params']) ?? '',
    }
    const values = asStringArray(el.fields['values'])
    if (values) decl.values = values
    const widget = asString(el.fields['widget'])
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

  const result: BlueprintSchema = {
    concepts,
    matrices,
    taxonomy,
  }
  if (globalFields.length > 0) {
    result.globalFields = globalFields
  }

  return result
}

/**
 * Extracts a template schema from raw document content.
 * Templates instantiate the root primitives in their body; there is no
 * legacy frontmatter fallback.
 */
export function extractBlueprintSchemaFromContent(content: string): BlueprintSchema {
  return extractBlueprintSchema(parseKnowledge(content))
}
