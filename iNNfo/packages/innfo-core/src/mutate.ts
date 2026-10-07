import type { ParsedKnowledge, ElementNode, TaxonomyEdge } from './types/index.js'
import { ElementsMap } from './types/index.js'
import type { BlueprintSchema } from './schema/index.js'
import {
  CONCEPT_DEFINITION,
  FIELD_DEFINITION,
  MARKER_DEFINITION,
  MATRIX_DEFINITION,
} from './schema/index.js'
import { slugify } from './parser/slug.js'
import { RESERVED_CONCEPT_NAMES } from './validator/constants.js'
import { levenshteinDistance, slugifyHeading, splitSourceFieldValue } from './sourceRef.js'

export interface MutationResult {
  success: boolean
  errors?: Array<{ path: string; message: string }>
  warnings?: Array<{ path: string; message: string }>
  cascadedMatrixCells?: number
}

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


/** Builds the "unknown concept" rejection message for schema-aware element
 *  ops (`addElement`, and mirrored by `updateField`'s existing lookup
 *  failure): names the offending concept, suggests the nearest declared
 *  concept within Levenshtein distance <= 2, otherwise lists every declared
 *  concept (mutation-schema-conformance R2). */
function unknownConceptMessage(conceptName: string, declaredNames: string[]): string {
  let best: string | undefined
  let bestDistance = Infinity
  for (const name of declaredNames) {
    const dist = levenshteinDistance(conceptName.toLowerCase(), name.toLowerCase())
    if (dist < bestDistance) {
      bestDistance = dist
      best = name
    }
  }
  if (best !== undefined && bestDistance <= 2) {
    return `Concept "${conceptName}" is not declared in the template. Did you mean "${best}"?`
  }
  return `Concept "${conceptName}" is not declared in the template. Declared concepts: ${declaredNames.join(', ')}`
}

function getKnowledgeWideElementNames(model: ParsedKnowledge): Set<string> {
  const names = new Set<string>()
  for (const [, elements] of model.elements.entries()) {
    for (const el of elements) {
      names.add(el.name)
    }
  }
  return names
}

/**
 * Deep-copy a ParsedKnowledge. `elements` is an `ElementsMap` (a class), so it is
 * rebuilt by hand; every other field is a plain object/array/string and clones
 * with `structuredClone`.
 */
function cloneKnowledge(model: ParsedKnowledge): ParsedKnowledge {
  const { elements, ...rest } = model
  const clonedElements = new ElementsMap()
  for (const [key, nodes] of elements.entries()) {
    clonedElements.set(key, nodes.map((node) => structuredClone(node)))
  }
  return { ...structuredClone(rest), elements: clonedElements }
}

/**
 * Apply an intent-level mutation to `model`.
 *
 * The op runs against a deep copy; the caller's `model` is only updated (in
 * place, so existing references stay valid) when the op reports `success`. A
 * failed or throwing op therefore leaves `model` byte-identical to its
 * pre-call state — no half-applied renames.
 */
export function applyMutation(
  model: ParsedKnowledge,
  op: string,
  args: Record<string, unknown>,
  schema?: BlueprintSchema,
): MutationResult {
  const draft = cloneKnowledge(model)
  const result = runMutation(draft, op, args, schema)
  if (result.success) {
    Object.assign(model, draft)
  }
  return result
}

type MutationHandler = (
  model: ParsedKnowledge,
  args: Record<string, unknown>,
  schema?: BlueprintSchema,
) => MutationResult

export function freeze_slugs(model: ParsedKnowledge): MutationResult {
  const existingSlugs = new Set<string>()
  for (const [, elements] of model.elements.entries()) {
    for (const el of elements) {
      if (el.slugExplicit && el.slug) {
        existingSlugs.add(el.slug.toLowerCase())
      }
    }
  }
  for (const [, elements] of model.elements.entries()) {
    for (const el of elements) {
      if (!el.slugExplicit) {
        const baseSlug = el.slug || slugifyHeading(el.name)
        let candidate = baseSlug
        let counter = 1
        while (existingSlugs.has(candidate.toLowerCase())) {
          candidate = `${baseSlug}-${counter++}`
        }
        el.slug = candidate
        el.slugExplicit = true
        existingSlugs.add(candidate.toLowerCase())
      }
    }
  }
  return { success: true }
}

function modelHasUnfrozenElements(model: ParsedKnowledge): boolean {
  for (const [, elements] of model.elements.entries()) {
    for (const el of elements) {
      if (!el.slugExplicit) return true
    }
  }
  return false
}

const MUTATION_HANDLERS: Record<string, MutationHandler> = {
  add_concept: (model, args) => addConcept(model, args),
  add_field: (model, args) => addField(model, args),
  set_marker: (model, args) => setMarker(model, args),
  add_element: (model, args, schema) => addElement(model, args, schema),
  update_field: (model, args) => updateField(model, args),
  remove_element: (model, args) => removeElement(model, args),
  rename_concept: (model, args) => renameConcept(model, args),
  rename_element: (model, args, schema) => renameElement(model, args, schema),
  update_matrix_cell: (model, args) => updateMatrixCell(model, args),
  generate_index: (model, args) => generateIndex(model, args),
  freeze_slugs: (model) => freeze_slugs(model),
}

/**
 * Template-authoring primitives (`# NN Concept Definition`, `# NN Field
 * Definition` / `Marker Definition`) are only meaningful against a level-2
 * template. Running them against any other level structurally "works" but
 * produces an incoherent document that a later validation pass rejects with
 * an unrelated schema error (`checkElementGroups()`). Gate here, in core —
 * the enforcement engine — so every consumer (MCP, editor via
 * `src/browser.ts`) shares one contract instead of two.
 */
const LEVEL2_ONLY_OPS = new Set(['add_concept', 'add_field', 'set_marker'])

function runMutation(
  model: ParsedKnowledge,
  op: string,
  args: Record<string, unknown>,
  schema?: BlueprintSchema,
): MutationResult {
  try {
    const handler = MUTATION_HANDLERS[op]
    if (!handler) {
      return { success: false, errors: [{ path: '', message: `Unknown operation: ${op}` }] }
    }
    if (LEVEL2_ONLY_OPS.has(op) && model.frontmatter.level !== 2) {
      return {
        success: false,
        errors: [
          {
            path: 'frontmatter.level',
            message: `Operation "${op}" authors template primitives and is only valid on a level-2 template; this document is level ${model.frontmatter.level ?? 'unset'}. Use add_element/update_field on a level-3 model, or target the parent template.`,
          },
        ],
      }
    }
    if (op !== 'freeze_slugs' && modelHasUnfrozenElements(model)) {
      freeze_slugs(model)
    }
    return handler(model, args, schema)
  } catch (err) {
    return {
      success: false,
      errors: [{ path: '', message: err instanceof Error ? err.message : String(err) }],
    }
  }
}

/** A template declares concepts as `# NN Concept Definition` body elements. */
function addConcept(model: ParsedKnowledge, args: Record<string, unknown>): MutationResult {
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
function addField(model: ParsedKnowledge, args: Record<string, unknown>): MutationResult {
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
function setMarker(model: ParsedKnowledge, args: Record<string, unknown>): MutationResult {
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

function addElement(
  model: ParsedKnowledge,
  args: Record<string, unknown>,
  schema?: BlueprintSchema,
): MutationResult {
  const req = requireArgs(args, ['conceptName', 'elementName'])
  if (!req.ok) return req.result
  const { conceptName, elementName } = req.values

  // Schema conformance (mutation-schema-conformance R1/R2/R3): when a schema
  // is supplied, `conceptName` must resolve (case-insensitively) against a
  // declared concept. This is the back door LEVEL2_ONLY_OPS was meant to
  // close — `addElement` used to write straight into `model.elements`
  // without ever consulting `schema`. Absent a schema, behaviour is
  // unchanged (offline scaffolding / existing tests).
  if (schema) {
    const declared = schema.concepts.find((c) => c.name.toLowerCase() === conceptName.toLowerCase())
    if (!declared) {
      const declaredNames = schema.concepts.map((c) => c.name)
      return {
        success: false,
        errors: [{ path: 'conceptName', message: unknownConceptMessage(conceptName, declaredNames) }],
      }
    }
  }

  // Concept-scoped sibling uniqueness check (D3)
  const existingElements = model.elements.get(conceptName) ?? []
  if (existingElements.some((e) => e.name.toLowerCase() === elementName.toLowerCase())) {
    return {
      success: false,
      errors: [{ path: '', message: `Element "${elementName}" already exists in concept "${conceptName}"` }],
    }
  }

  // Slug uniqueness check if requested
  const requestedSlug = typeof args.slug === 'string' && args.slug.trim() ? args.slug.trim() : undefined
  if (requestedSlug) {
    for (const [, elements] of model.elements.entries()) {
      for (const el of elements) {
        if (el.slug?.toLowerCase() === requestedSlug.toLowerCase()) {
          return {
            success: false,
            errors: [{ path: 'slug', message: `Slug "${requestedSlug}" already exists in this model — element slugs must be unique model-wide` }],
          }
        }
      }
    }
  }

  // Support both nested args.fields and root-level fields passed in args
  const reservedArgsKeys = new Set([
    'conceptName',
    'elementName',
    'slug',
    'description',
    'fields',
    'sources',
    'rationale',
    'approved_by',
    'author',
    'recovered_after',
    'timestamp',
    'scope',
    'change',
  ])
  const fields: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(args)) {
    if (!reservedArgsKeys.has(k) && v !== undefined) {
      fields[k] = v
    }
  }
  if (args.fields && typeof args.fields === 'object') {
    Object.assign(fields, args.fields)
  }
  if (args.sources !== undefined) {
    fields['sources'] = args.sources
  }

  if (existingElements.length > 0) {
    const prevLast = existingElements[existingElements.length - 1]
    prevLast.trailingBlankLine = true
  }

  let elementSlug: string
  if (requestedSlug) {
    elementSlug = requestedSlug
  } else {
    const existingSlugs = new Set<string>()
    for (const [, elements] of model.elements.entries()) {
      for (const el of elements) {
        if (el.slug) existingSlugs.add(el.slug.toLowerCase())
      }
    }
    const baseSlug = slugifyHeading(elementName)
    let candidate = baseSlug
    let counter = 1
    while (existingSlugs.has(candidate.toLowerCase())) {
      candidate = `${baseSlug}-${counter++}`
    }
    elementSlug = candidate
  }

  const newElement: ElementNode = {
    type: conceptName,
    name: elementName,
    description: (args.description as string) ?? '',
    fields,
    markers: {},
    slug: elementSlug,
    slugExplicit: true,
    trailingBlankLine: true,
  }
  existingElements.push(newElement)
  model.elements.set(conceptName, existingElements)
  return { success: true }
}

function matchesElement(e: ElementNode, target: string): boolean {
  const tLower = target.toLowerCase()
  if (e.name.toLowerCase() === tLower) return true
  if (e.slug && e.slug.toLowerCase() === tLower) return true
  if (slugify(e.name).toLowerCase() === tLower) return true
  if (slugifyHeading(e.name).toLowerCase() === tLower) return true
  return false
}

/** Edits a single field on an already-existing element (overwrite semantics). */
function updateField(model: ParsedKnowledge, args: Record<string, unknown>): MutationResult {
  let elementName = (args.elementName as string) || (args.elementSlug as string) || (args.slug as string) || ''
  let fieldName = (args.fieldName as string) || ''
  let conceptName = (args.conceptName as string) || ''
  let val = args.value !== undefined ? args.value : args.to

  if (args.target && typeof args.target === 'string') {
    let clean = args.target.trim()
    if (clean.includes('@')) {
      clean = clean.slice(clean.indexOf('@') + 1)
    }
    const parts = clean.split('&')
    if (parts.length >= 2) {
      elementName = parts[0]
      fieldName = parts[1]
    } else if (parts.length === 1 && !elementName) {
      elementName = parts[0]
    }
  }

  if (!elementName || !fieldName) {
    const missing: string[] = []
    if (!elementName) missing.push('elementName')
    if (!fieldName) missing.push('fieldName')
    return {
      success: false,
      errors: [{ path: '', message: `${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} required` }],
    }
  }

  if (val === undefined) {
    return { success: false, errors: [{ path: '', message: 'value is required' }] }
  }

  let foundElement: ElementNode | undefined
  let foundConcept: string | undefined

  if (conceptName) {
    const existingElements = model.elements.get(conceptName)
    if (!existingElements) {
      return { success: false, errors: [{ path: '', message: `Concept "${conceptName}" not found` }] }
    }
    foundElement = existingElements.find((e) => matchesElement(e, elementName))
    foundConcept = conceptName
  } else {
    for (const [cName, elements] of model.elements.entries()) {
      const el = elements.find((e) => matchesElement(e, elementName))
      if (el) {
        foundElement = el
        foundConcept = cName
        break
      }
    }
  }

  if (!foundElement || !foundConcept) {
    return {
      success: false,
      errors: [
        {
          path: '',
          message: `Element "${elementName}" not found${conceptName ? ` in concept "${conceptName}"` : ''}`,
        },
      ],
    }
  }

  foundElement.fields[fieldName] = val
  if (foundElement.rawFields && fieldName in foundElement.rawFields) {
    delete foundElement.rawFields[fieldName]
  }
  return { success: true }
}

function updateMatrixCell(
  model: ParsedKnowledge,
  args: Record<string, unknown>,
): MutationResult {
  let matrixName = (args.matrixName as string) || ''
  let matrixSlug = (args.matrixSlug as string) || ''
  let row = (args.row as string) || ''
  let col = (args.col as string) || ''
  let val = args.value !== undefined ? String(args.value) : (args.to !== undefined ? String(args.to) : undefined)

  if (args.target && typeof args.target === 'string') {
    let clean = args.target.trim()
    if (clean.includes('@')) {
      clean = clean.slice(clean.indexOf('@') + 1)
    }
    const parts = clean.split('&')
    if (parts.length >= 3) {
      matrixSlug = parts[0]
      row = parts[1]
      col = parts[2]
    }
  }

  if (!row || !col) {
    return { success: false, errors: [{ path: '', message: 'row and col are required' }] }
  }
  if (val === undefined) {
    return { success: false, errors: [{ path: '', message: 'value is required' }] }
  }

  const matchesMatrix = (name: string, candidateSlug?: string): boolean => {
    if (matrixName && name.toLowerCase() === matrixName.toLowerCase()) return true
    if (matrixSlug) {
      if (candidateSlug && candidateSlug.toLowerCase() === matrixSlug.toLowerCase()) return true
      if (slugify(name).toLowerCase() === matrixSlug.toLowerCase()) return true
      if (slugifyHeading(name).toLowerCase() === matrixSlug.toLowerCase()) return true
    }
    if (matrixName) {
      if (slugify(name).toLowerCase() === slugify(matrixName).toLowerCase()) return true
      if (slugifyHeading(name).toLowerCase() === slugifyHeading(matrixName).toLowerCase()) return true
    }
    return false
  }

  let matrix = model.matrices.find((m) => matchesMatrix(m.name, (m as any).slug))

  if (!matrix && model.frontmatter?.matrices) {
    const decl = model.frontmatter.matrices.find((d) => matchesMatrix(d.name, d.slug))
    if (decl) {
      matrix = model.matrices.find((m) => m.name.toLowerCase() === decl.name.toLowerCase())
    }
  }

  if (!matrix) {
    return {
      success: false,
      errors: [{ path: '', message: `Matrix "${matrixName || matrixSlug}" not found` }],
    }
  }

  const matchesCoord = (actual: string, requested: string): boolean => {
    const a = actual.toLowerCase()
    const r = requested.toLowerCase()
    return a === r || slugify(a) === slugify(r) || slugifyHeading(a) === slugifyHeading(r)
  }

  const cell = matrix.cells.find((c) => matchesCoord(c.row, row) && matchesCoord(c.col, col))
  if (cell) {
    cell.value = val
  } else {
    matrix.cells.push({ row, col, value: val })
  }

  return { success: true }
}

function removeElement(model: ParsedKnowledge, args: Record<string, unknown>): MutationResult {
  const req = requireArgs(args, ['conceptName', 'elementName'])
  if (!req.ok) return req.result
  const { conceptName, elementName } = req.values

  const existingElements = model.elements.get(conceptName) ?? []
  const targetEl = existingElements.find(
    (e) =>
      e.name.toLowerCase() === elementName.toLowerCase() ||
      (e.slug && e.slug.toLowerCase() === elementName.toLowerCase()) ||
      slugifyHeading(e.name).toLowerCase() === elementName.toLowerCase(),
  )

  const filtered = existingElements.filter(
    (e) =>
      e.name.toLowerCase() !== elementName.toLowerCase() &&
      (!e.slug || e.slug.toLowerCase() !== elementName.toLowerCase()) &&
      slugifyHeading(e.name).toLowerCase() !== elementName.toLowerCase(),
  )
  if (filtered.length === existingElements.length) {
    return { success: false, errors: [{ path: '', message: `Element "${elementName}" not found in concept "${conceptName}"` }] }
  }
  model.elements.set(conceptName, filtered)

  // Cascade matrix cell deletion
  let cascadedCells = 0
  if (model.matrices) {
    const targetIdent = elementName.toLowerCase()
    const targetSlug = targetEl?.slug?.toLowerCase()
    const targetHeading = targetEl ? slugifyHeading(targetEl.name).toLowerCase() : undefined

    for (const matrix of model.matrices) {
      if (!matrix.cells) continue
      const initialCount = matrix.cells.length
      matrix.cells = matrix.cells.filter((c) => {
        const rLower = c.row.toLowerCase()
        const colLower = c.col.toLowerCase()
        const rowMatches =
          rLower === targetIdent ||
          (targetSlug !== undefined && rLower === targetSlug) ||
          (targetHeading !== undefined && rLower === targetHeading)
        const colMatches =
          colLower === targetIdent ||
          (targetSlug !== undefined && colLower === targetSlug) ||
          (targetHeading !== undefined && colLower === targetHeading)
        return !rowMatches && !colMatches
      })
      cascadedCells += (initialCount - matrix.cells.length)
    }
  }

  return { success: true, cascadedMatrixCells: cascadedCells }
}

/** Renames a `Concept Definition` element, re-pointing its `Field Definition`
 *  and `Matrix Definition` elements, taxonomy edges, and rawSections. */
function renameConcept(model: ParsedKnowledge, args: Record<string, unknown>): MutationResult {
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
  return updateWikiLinks(text, oldName, newName)
}

/** Rewrite only `[[...]]` wikilink references (Case 3 of `updateReferenceString`),
 *  leaving bare string values untouched. Used by the schema-aware rename pass
 *  for fields the parent template does NOT declare as `type:: reference`. */
export function updateWikiLinks(text: string, oldName: string, newName: string): string {
  if (!text || typeof text !== 'string') return text
  const oldSlug = slugify(oldName)

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

/** Which field names does the schema declare as `type:: reference` (or
 *  `type:: knowledge`) for each concept? Used to gate the rename rewrite. */
function referenceFieldsByConcept(schema: BlueprintSchema | undefined): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  if (!schema) return map
  for (const concept of schema.concepts) {
    const refs = new Set<string>()
    for (const f of concept.fields ?? []) {
      if (f.type === 'reference' || f.type === 'knowledge') refs.add(f.name.toLowerCase())
    }
    map.set(concept.name.toLowerCase(), refs)
  }
  return map
}

function renameElement(
  model: ParsedKnowledge,
  args: Record<string, unknown>,
  schema?: BlueprintSchema,
): MutationResult {
  const req = requireArgs(args, ['conceptName', 'elementName', 'newName'])
  if (!req.ok) return req.result
  const { conceptName, elementName, newName } = req.values

  let lowerOld = elementName.toLowerCase()
  const lowerNew = newName.toLowerCase()
  if (lowerOld === lowerNew) return { success: false, errors: [{ path: '', message: 'newName must differ from elementName' }] }

  // Concept-scoped sibling uniqueness check (D3)
  const existingElements = model.elements.get(conceptName)
  if (!existingElements) return { success: false, errors: [{ path: '', message: `Concept "${conceptName}" not found` }] }

  const element = existingElements.find((e) => matchesElement(e, elementName))
  if (!element) return { success: false, errors: [{ path: '', message: `Element "${elementName}" not found in concept "${conceptName}"` }] }

  const oldDisplayName = element.name
  lowerOld = oldDisplayName.toLowerCase()
  const duplicateSibling = existingElements.find(
    (e) => e !== element && e.name.toLowerCase() === lowerNew,
  )
  if (duplicateSibling) {
    return {
      success: false,
      errors: [{ path: '', message: `Element "${newName}" already exists in concept "${conceptName}"` }],
    }
  }

  element.name = newName
  // element.slug remains untouched and immutable (D1)

  // Update nodeMarkers key
  if (model.nodeMarkers[oldDisplayName] !== undefined) {
    model.nodeMarkers[newName] = model.nodeMarkers[oldDisplayName]
    delete model.nodeMarkers[oldDisplayName]
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

  // Rewrite references in element fields, description, and relationships.
  // Schema-aware: a string field is only rewritten as a scalar reference when
  // the parent template declares it `type:: reference` (or `type:: knowledge`);
  // otherwise only embedded `[[...]]` wikilinks are rewritten, never a bare
  // slug-matching string (which would clobber plain data like `category:: cost`).
  const refsByConcept = referenceFieldsByConcept(schema)

  for (const [, elements] of model.elements.entries()) {
    for (const el of elements) {
      // 1. Fields
      if (el.fields) {
        const conceptRefs = refsByConcept.get(el.type.toLowerCase())
        for (const [fKey, fVal] of Object.entries(el.fields)) {
          const isRefField = conceptRefs?.has(fKey.toLowerCase()) ?? false
          const rewrite = (s: string): string =>
            isRefField ? updateReferenceString(s, elementName, newName) : updateWikiLinks(s, elementName, newName)
          if (typeof fVal === 'string') {
            el.fields[fKey] = rewrite(fVal)
          } else if (Array.isArray(fVal)) {
            el.fields[fKey] = fVal.map((item) =>
              typeof item === 'string' ? rewrite(item) : item,
            )
          }
        }
      }

      // 2. Description
      if (el.description && typeof el.description === 'string') {
        el.description = updateWikiLinks(el.description, elementName, newName)
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
        model.rawSections[sKey] = updateWikiLinks(sVal, elementName, newName)
      }
    }
  }

  model.elements.set(conceptName, existingElements)
  return { success: true }
}

function generateIndex(model: ParsedKnowledge, args: Record<string, unknown>): MutationResult {
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

/**
 * Rewrites the field-level citation for a specific touched field on an element per D20.
 * Updates the companion citation field (e.g. `<fieldName>_source` or `<fieldName>_sources`),
 * preserves untouched fields on the element, and records the citation in element sources.
 */
export function rewriteFieldCitation(
  element: ElementNode,
  fieldName: string,
  citationRef: string,
): void {
  if (!element.fields) {
    element.fields = {}
  }

  const isSourcesField = fieldName.toLowerCase() === 'sources' || fieldName.toLowerCase() === 'source'
  let targetCitationField: string
  let oldCitation: string | undefined

  if (isSourcesField) {
    targetCitationField = fieldName
  } else if (element.fields[`${fieldName}_sources`] !== undefined) {
    targetCitationField = `${fieldName}_sources`
    oldCitation = typeof element.fields[targetCitationField] === 'string'
      ? (element.fields[targetCitationField] as string)
      : Array.isArray(element.fields[targetCitationField])
        ? (element.fields[targetCitationField] as string[])[0]
        : undefined
  } else if (element.fields[`${fieldName}_source`] !== undefined) {
    targetCitationField = `${fieldName}_source`
    oldCitation = typeof element.fields[targetCitationField] === 'string'
      ? (element.fields[targetCitationField] as string)
      : undefined
  } else {
    targetCitationField = `${fieldName}_source`
  }

  if (Array.isArray(element.fields[targetCitationField])) {
    element.fields[targetCitationField] = [citationRef]
  } else {
    element.fields[targetCitationField] = citationRef
  }

  const sourcesKey = element.fields['source'] !== undefined && element.fields['sources'] === undefined
    ? 'source'
    : 'sources'

  const existingSources = splitSourceFieldValue(element.fields[sourcesKey] ?? [])
  let newSources: string[]

  if (existingSources.length === 0) {
    newSources = [citationRef]
  } else if (oldCitation && existingSources.includes(oldCitation)) {
    newSources = existingSources.map((s) => (s === oldCitation ? citationRef : s))
  } else if (!existingSources.includes(citationRef)) {
    newSources = [...existingSources, citationRef]
  } else {
    newSources = existingSources
  }

  element.fields[sourcesKey] = newSources

  if (element.rawFields) {
    delete element.rawFields[targetCitationField]
    delete element.rawFields[sourcesKey]
  }
}

