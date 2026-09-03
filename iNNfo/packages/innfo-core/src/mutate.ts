import type { ParsedModel, ElementNode, TaxonomyEdge } from './types'
import {
  CONCEPT_DEFINITION,
  FIELD_DEFINITION,
  MARKER_DEFINITION,
  MATRIX_DEFINITION,
} from './schema'
import { slugify } from './parser/slug'

export interface MutationResult {
  success: boolean
  errors?: Array<{ path: string; message: string }>
  warnings?: Array<{ path: string; message: string }>
}

const RESERVED_CONCEPT_NAMES = new Set(['Concepts', 'Elements', 'Markers'])

type RequireArgsResult =
  | { ok: true; values: Record<string, string> }
  | { ok: false; result: MutationResult }

/**
 * Validates that the given string args are present and non-empty.
 * On success returns the narrowed string values; on failure returns a ready
 * MutationResult error (`"<a>, <b> are required"`), collapsing the boilerplate
 * that every mutation used to repeat.
 */
function requireArgs(args: Record<string, unknown>, keys: string[]): RequireArgsResult {
  const values: Record<string, string> = {}
  const missing: string[] = []
  for (const key of keys) {
    const value = args[key]
    if (typeof value === 'string' && value.length > 0) {
      values[key] = value
    } else {
      missing.push(key)
    }
  }
  if (missing.length > 0) {
    return {
      ok: false,
      result: {
        success: false,
        errors: [
          {
            path: '',
            message: `${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} required`,
          },
        ],
      },
    }
  }
  return { ok: true, values }
}

function getModelWideElementNames(model: ParsedModel): Set<string> {
  const names = new Set<string>()
  for (const [, elements] of model.elements.entries()) {
    for (const el of elements) {
      names.add(el.name)
    }
  }
  return names
}

export function applyMutation(
  model: ParsedModel,
  op: string,
  args: Record<string, unknown>,
): MutationResult {
  try {
    switch (op) {
      case 'add_concept':
        return addConcept(model, args)
      case 'add_field':
        return addField(model, args)
      case 'set_marker':
        return setMarker(model, args)
      case 'add_element':
        return addElement(model, args)
      case 'update_field':
        return updateField(model, args)
      case 'remove_element':
        return removeElement(model, args)
      case 'rename_concept':
        return renameConcept(model, args)
      case 'rename_element':
        return renameElement(model, args)
      case 'generate_index':
        return generateIndex(model, args)
      default:
        return { success: false, errors: [{ path: '', message: `Unknown operation: ${op}` }] }
    }
  } catch (err) {
    return {
      success: false,
      errors: [{ path: '', message: err instanceof Error ? err.message : String(err) }],
    }
  }
}

/** A template declares concepts as `# NN Concept Definition` body elements. */
function addConcept(model: ParsedModel, args: Record<string, unknown>): MutationResult {
  const req = requireArgs(args, ['conceptName'])
  if (!req.ok) return req.result
  const { conceptName } = req.values

  if (RESERVED_CONCEPT_NAMES.has(conceptName)) {
    return {
      success: false,
      errors: [{
        path: 'Concept Definition',
        message: `"${conceptName}" is a reserved pseudo-concept name and MUST NOT be declared`,
      }],
    }
  }

  const defs = model.elements.get(CONCEPT_DEFINITION) ?? []
  if (defs.some((c) => c.name.toLowerCase() === conceptName.toLowerCase())) {
    return { success: false, errors: [{ path: '', message: `Concept "${conceptName}" already exists` }] }
  }

  const fields: Record<string, unknown> = { type: (args.type as string) ?? 'text' }
  if (args.icon !== undefined) fields['icon'] = args.icon
  if (args.color !== undefined) fields['color'] = args.color
  if (args.weight !== undefined) fields['weight'] = args.weight
  defs.push({ type: CONCEPT_DEFINITION, name: conceptName, description: '', fields, markers: {} })
  model.elements.set(CONCEPT_DEFINITION, defs)
  return { success: true }
}

/** A template declares fields as `# NN Field Definition` elements whose
 *  `concept` property references the owning `Concept Definition`. */
function addField(model: ParsedModel, args: Record<string, unknown>): MutationResult {
  const req = requireArgs(args, ['conceptName', 'fieldName'])
  if (!req.ok) return req.result
  const { conceptName, fieldName } = req.values

  const defs = model.elements.get(CONCEPT_DEFINITION) ?? []
  if (!defs.some((c) => c.name.toLowerCase() === conceptName.toLowerCase())) {
    return { success: false, errors: [{ path: '', message: `Concept "${conceptName}" not found` }] }
  }

  const fds = model.elements.get(FIELD_DEFINITION) ?? []
  if (
    fds.some(
      (f) =>
        f.name.toLowerCase() === fieldName.toLowerCase() &&
        f.fields['concept'] === conceptName,
    )
  ) {
    return { success: false, errors: [{ path: '', message: `Field "${fieldName}" already exists on concept "${conceptName}"` }] }
  }

  const fields: Record<string, unknown> = { concept: conceptName, type: (args.fieldType as string) ?? 'string' }
  if (args.options !== undefined) fields['options'] = args.options
  if (args.target_concepts !== undefined) fields['target_concepts'] = args.target_concepts
  fds.push({ type: FIELD_DEFINITION, name: fieldName, description: '', fields, markers: {} })
  model.elements.set(FIELD_DEFINITION, fds)
  return { success: true }
}

/** A template declares markers as `# NN Marker Definition` body elements. */
function setMarker(model: ParsedModel, args: Record<string, unknown>): MutationResult {
  const req = requireArgs(args, ['markerName'])
  if (!req.ok) return req.result
  const { markerName } = req.values

  const defs = model.elements.get(MARKER_DEFINITION) ?? []
  const existing = defs.find((m) => m.name.toLowerCase() === markerName.toLowerCase())
  if (existing) {
    if (args.symbol !== undefined) existing.fields['symbol'] = args.symbol
    if (args.icon !== undefined) existing.fields['icon'] = args.icon
    if (args.color !== undefined) existing.fields['color'] = args.color
  } else {
    const fields: Record<string, unknown> = {}
    if (args.symbol !== undefined) fields['symbol'] = args.symbol
    if (args.icon !== undefined) fields['icon'] = args.icon
    if (args.color !== undefined) fields['color'] = args.color
    defs.push({ type: MARKER_DEFINITION, name: markerName, description: '', fields, markers: {} })
  }
  model.elements.set(MARKER_DEFINITION, defs)
  return { success: true }
}

function addElement(model: ParsedModel, args: Record<string, unknown>): MutationResult {
  const req = requireArgs(args, ['conceptName', 'elementName'])
  if (!req.ok) return req.result
  const { conceptName, elementName } = req.values

  // Model-wide uniqueness check (R-IE-02)
  const existingNames = getModelWideElementNames(model)
  if (existingNames.has(elementName)) {
    return {
      success: false,
      errors: [{ path: '', message: `Element "${elementName}" already exists in this model — element names must be unique model-wide` }],
    }
  }

  const existingElements = model.elements.get(conceptName) ?? []
  const newElement: ElementNode = {
    type: conceptName,
    name: elementName,
    description: (args.description as string) ?? '',
    fields: (args.fields as Record<string, unknown>) ?? {},
    markers: {},
  }
  existingElements.push(newElement)
  model.elements.set(conceptName, existingElements)
  return { success: true }
}

/** Edits a single field on an already-existing element (overwrite semantics). */
function updateField(model: ParsedModel, args: Record<string, unknown>): MutationResult {
  const req = requireArgs(args, ['conceptName', 'elementName', 'fieldName'])
  if (!req.ok) return req.result
  const { conceptName, elementName, fieldName } = req.values
  if (args.value === undefined) {
    return { success: false, errors: [{ path: '', message: 'value is required' }] }
  }

  const existingElements = model.elements.get(conceptName)
  if (!existingElements) {
    return { success: false, errors: [{ path: '', message: `Concept "${conceptName}" not found` }] }
  }

  const element = existingElements.find((e) => e.name.toLowerCase() === elementName.toLowerCase())
  if (!element) {
    return { success: false, errors: [{ path: '', message: `Element "${elementName}" not found in concept "${conceptName}"` }] }
  }

  element.fields[fieldName] = args.value
  model.elements.set(conceptName, existingElements)
  return { success: true }
}

function removeElement(model: ParsedModel, args: Record<string, unknown>): MutationResult {
  const req = requireArgs(args, ['conceptName', 'elementName'])
  if (!req.ok) return req.result
  const { conceptName, elementName } = req.values

  const existingElements = model.elements.get(conceptName) ?? []
  const filtered = existingElements.filter((e) => e.name.toLowerCase() !== elementName.toLowerCase())
  if (filtered.length === existingElements.length) {
    return { success: false, errors: [{ path: '', message: `Element "${elementName}" not found in concept "${conceptName}"` }] }
  }
  model.elements.set(conceptName, filtered)
  return { success: true }
}

/** Renames a `Concept Definition` element, re-pointing its `Field Definition`
 *  and `Matrix Definition` elements, taxonomy edges, and rawSections. */
function renameConcept(model: ParsedModel, args: Record<string, unknown>): MutationResult {
  const req = requireArgs(args, ['conceptName', 'newName'])
  if (!req.ok) return req.result
  const { conceptName, newName } = req.values

  if (RESERVED_CONCEPT_NAMES.has(newName)) {
    return {
      success: false,
      errors: [{ path: 'Concept Definition', message: `"${newName}" is a reserved pseudo-concept name` }],
    }
  }

  const lowerOld = conceptName.toLowerCase()
  const lowerNew = newName.toLowerCase()
  if (lowerOld === lowerNew) return { success: false, errors: [{ path: '', message: 'newName must differ from conceptName' }] }

  const defs = model.elements.get(CONCEPT_DEFINITION) ?? []
  const def = defs.find((c) => c.name.toLowerCase() === lowerOld)
  if (!def) {
    return { success: false, errors: [{ path: '', message: `Concept "${conceptName}" not found in Concept Definition elements` }] }
  }
  if (defs.some((c) => c.name.toLowerCase() === lowerNew && c !== def)) {
    return { success: false, errors: [{ path: '', message: `Concept "${newName}" already exists in Concept Definition elements` }] }
  }
  def.name = newName

  // Re-point Field Definition owners.
  const fds = model.elements.get(FIELD_DEFINITION) ?? []
  for (const f of fds) {
    if (typeof f.fields['concept'] === 'string' && f.fields['concept'].toLowerCase() === lowerOld) {
      f.fields['concept'] = newName
    }
  }
  if (fds.length > 0) model.elements.set(FIELD_DEFINITION, fds)

  // Re-point Matrix Definition source/target.
  const mds = model.elements.get(MATRIX_DEFINITION) ?? []
  for (const m of mds) {
    if (typeof m.fields['source'] === 'string' && m.fields['source'].toLowerCase() === lowerOld) {
      m.fields['source'] = newName
    }
    if (typeof m.fields['target'] === 'string' && m.fields['target'].toLowerCase() === lowerOld) {
      m.fields['target'] = newName
    }
  }
  if (mds.length > 0) model.elements.set(MATRIX_DEFINITION, mds)

  model.elements.set(CONCEPT_DEFINITION, defs)

  // Rename the element group keyed by the concept name (if present).
  const nodes = model.elements.get(conceptName)
  if (nodes) {
    for (const node of nodes) node.type = newName
    model.elements.set(newName, nodes)
    model.elements.delete(conceptName)
  }

  // Update taxonomy edges.
  for (const edge of model.taxonomy) {
    if (edge.parent.toLowerCase() === lowerOld) edge.parent = newName
    if (edge.child.toLowerCase() === lowerOld) edge.child = newName
  }

  // Update rawSections key.
  if (model.rawSections) {
    const raw = model.rawSections[conceptName]
    if (raw !== undefined) {
      delete model.rawSections[conceptName]
      model.rawSections[newName] = raw
    }
  }

  return { success: true }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function updateReferenceString(text: string, oldName: string, newName: string): string {
  if (!text || typeof text !== 'string') return text
  const oldSlug = slugify(oldName)

  // Case 1: Exact match (scalar reference field value without wikilink brackets)
  if (!text.trim().startsWith('[[') && !text.trim().endsWith(']]')) {
    if (slugify(text.trim()) === oldSlug) {
      const leadingSpaces = text.match(/^\s*/)?.[0] || ''
      const trailingSpaces = text.match(/\s*$/)?.[0] || ''
      return `${leadingSpaces}${newName}${trailingSpaces}`
    }
  }

  // Case 2: Qualified scalar string, e.g. "[Model] OldName" or "Model :: OldName"
  if (!text.trim().startsWith('[[') && !text.trim().endsWith(']]')) {
    const qualifiedBracketRegex = new RegExp(`^(\\s*\\[[^\\]]+\\]\\s*)(.+)$`, 'i')
    const matchBracket = text.match(qualifiedBracketRegex)
    if (matchBracket && slugify(matchBracket[2].trim()) === oldSlug) {
      const trailingSpaces = matchBracket[2].match(/\s*$/)?.[0] || ''
      return `${matchBracket[1]}${newName}${trailingSpaces}`
    }

    const qualifiedColonRegex = new RegExp(`^(\\s*[^:]+::\\s*)(.+)$`, 'i')
    const matchColon = text.match(qualifiedColonRegex)
    if (matchColon && slugify(matchColon[2].trim()) === oldSlug) {
      const trailingSpaces = matchColon[2].match(/\s*$/)?.[0] || ''
      return `${matchColon[1]}${newName}${trailingSpaces}`
    }
  }

  // Case 3: Embedded wikilinks: [[Target]] or [[Target|Alias]] or [[Qualified Target]]
  return text.replace(/\[\[\s*([^\|]+?)(\s*\|[^\]]+)?\s*\]\]/gi, (match, target, alias) => {
    const trimmedTarget = target.trim()

    // Direct match inside wikilink
    if (slugify(trimmedTarget) === oldSlug) {
      return `[[${newName}${alias ?? ''}]]`
    }

    // Qualified match inside wikilink: e.g. "[Model] OldName" or "Model :: OldName"
    const qBracket = new RegExp(`^(\\[[^\\]]+\\]\\s*)(.+)$`, 'i')
    const mBracket = trimmedTarget.match(qBracket)
    if (mBracket && slugify(mBracket[2]) === oldSlug) {
      return `[[${mBracket[1]}${newName}${alias ?? ''}]]`
    }

    const qColon = new RegExp(`^(.*::\\s*)(.+)$`, 'i')
    const mColon = trimmedTarget.match(qColon)
    if (mColon && slugify(mColon[2]) === oldSlug) {
      return `[[${mColon[1]}${newName}${alias ?? ''}]]`
    }

    return match
  })
}

function renameElement(model: ParsedModel, args: Record<string, unknown>): MutationResult {
  const req = requireArgs(args, ['conceptName', 'elementName', 'newName'])
  if (!req.ok) return req.result
  const { conceptName, elementName, newName } = req.values

  const lowerOld = elementName.toLowerCase()
  const lowerNew = newName.toLowerCase()
  if (lowerOld === lowerNew) return { success: false, errors: [{ path: '', message: 'newName must differ from elementName' }] }

  // Model-wide uniqueness check (R-IE-02)
  const existingNames = getModelWideElementNames(model)
  existingNames.delete(elementName) // Remove current name for rename check
  if (existingNames.has(newName)) {
    return {
      success: false,
      errors: [{ path: '', message: `Element "${newName}" already exists in this model — element names must be unique model-wide` }],
    }
  }

  const existingElements = model.elements.get(conceptName)
  if (!existingElements) return { success: false, errors: [{ path: '', message: `Concept "${conceptName}" not found` }] }

  const element = existingElements.find((e) => e.name.toLowerCase() === lowerOld)
  if (!element) return { success: false, errors: [{ path: '', message: `Element "${elementName}" not found in concept "${conceptName}"` }] }

  element.name = newName
  element.slug = undefined

  // Update nodeMarkers key
  if (model.nodeMarkers[elementName] !== undefined) {
    model.nodeMarkers[newName] = model.nodeMarkers[elementName]
    delete model.nodeMarkers[elementName]
  }

  // Update taxonomy entries (R-IE-03)
  for (const edge of model.taxonomy) {
    if (edge.parent.toLowerCase() === lowerOld) edge.parent = newName
    if (edge.child.toLowerCase() === lowerOld) edge.child = newName
  }

  // Update matrix cell row/col labels (R-IE-03)
  for (const matrix of model.matrices) {
    for (const cell of matrix.cells) {
      if (cell.row.toLowerCase() === lowerOld) cell.row = newName
      if (cell.col.toLowerCase() === lowerOld) cell.col = newName
    }
  }

  // Rewrite references in element fields, description, and relationships
  for (const [, elements] of model.elements.entries()) {
    for (const el of elements) {
      // 1. Fields
      if (el.fields) {
        for (const [fKey, fVal] of Object.entries(el.fields)) {
          if (typeof fVal === 'string') {
            el.fields[fKey] = updateReferenceString(fVal, elementName, newName)
          } else if (Array.isArray(fVal)) {
            el.fields[fKey] = fVal.map((item) =>
              typeof item === 'string' ? updateReferenceString(item, elementName, newName) : item,
            )
          }
        }
      }

      // 2. Description
      if (el.description && typeof el.description === 'string') {
        el.description = updateReferenceString(el.description, elementName, newName)
      }

      // 3. Relationships array (if present)
      if (Array.isArray((el as any).relationships)) {
        for (const rel of (el as any).relationships) {
          if (rel && typeof rel.target === 'string' && rel.target.toLowerCase() === lowerOld) {
            rel.target = newName
          }
        }
      }
    }
  }

  // 4. Model rawSections (if present)
  if (model.rawSections) {
    for (const [sKey, sVal] of Object.entries(model.rawSections)) {
      if (typeof sVal === 'string') {
        model.rawSections[sKey] = updateReferenceString(sVal, elementName, newName)
      }
    }
  }

  model.elements.set(conceptName, existingElements)
  return { success: true }
}

function generateIndex(model: ParsedModel, args: Record<string, unknown>): MutationResult {
  const templateTaxonomy = args.taxonomy as Array<{ parent: string; child: string }> | undefined

  // Collect all concepts present in the model
  const presentConcepts = new Set<string>()
  for (const c of model.elements.keys()) {
    if (
      c.toLowerCase() !== 'concept definition' &&
      c.toLowerCase() !== 'field definition' &&
      c.toLowerCase() !== 'marker definition' &&
      c.toLowerCase() !== 'matrix definition'
    ) {
      presentConcepts.add(c)
    }
  }
  if (model.rawSections) {
    for (const c of Object.keys(model.rawSections)) {
      if (c.toLowerCase() !== 'index') {
        presentConcepts.add(c)
      }
    }
  }

  // Also include template concepts if declared as Concept Definition elements
  const conceptDefs = model.elements.get(CONCEPT_DEFINITION)
  if (conceptDefs) {
    for (const cd of conceptDefs) {
      presentConcepts.add(cd.name)
    }
  }

  let finalEdges: TaxonomyEdge[] = []

  if (templateTaxonomy && Array.isArray(templateTaxonomy) && templateTaxonomy.length > 0) {
    // Keep edges where both parent and child are present
    const edgesToKeep = templateTaxonomy.filter(
      (edge) => presentConcepts.has(edge.parent) && presentConcepts.has(edge.child)
    )

    // For any present concept, check if it has a parent in the kept edges
    const childNodesInKept = new Set(edgesToKeep.map((e) => e.child))

    for (const concept of presentConcepts) {
      if (!childNodesInKept.has(concept)) {
        edgesToKeep.push({ parent: '', child: concept })
      }
    }
    finalEdges = edgesToKeep
  } else {
    // Fallback: list all present concepts flatly as root-level nodes
    for (const concept of presentConcepts) {
      finalEdges.push({ parent: '', child: concept })
    }
  }

  model.taxonomy = finalEdges
  return { success: true }
}
