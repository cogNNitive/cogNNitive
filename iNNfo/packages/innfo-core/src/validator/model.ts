import { ParsedModel, SpecDocument, ValidationResult, ValidationError } from '../types'
import { checkElementsAgainstSchema, resolveTemplateSchema } from '../schema'
import type { IncludeResolver } from '../schema'
import { validateReferences, validateElementFieldReferences } from './references'
import type { SubmodelResolver } from './references'
import { validateTaxonomyHierarchy } from './hierarchy'

export interface ValidateModelOptions {
  resolveInclude?: IncludeResolver
  resolveSubmodel?: SubmodelResolver
  referringPath?: string
}

/**
 * Validates model contents against template specification (level 2).
 *
 * `resolveInclude` is an optional callback that returns the raw content of a
 * template named in the resolved template's `includes` list (supplied by the
 * host — innfo-mcp / the editor — which owns spec I/O). When omitted, `includes`
 * composition is skipped and only the template's own definitions are used.
 */
export function validateModel(
  model: ParsedModel,
  template: SpecDocument | null,
  _formatSpec: SpecDocument | null,
  resolveIncludeOrOptions?: IncludeResolver | ValidateModelOptions,
  options?: ValidateModelOptions,
): ValidationResult {
  const opts: ValidateModelOptions =
    typeof resolveIncludeOrOptions === 'function'
      ? { resolveInclude: resolveIncludeOrOptions, ...options }
      : (resolveIncludeOrOptions ?? options ?? {})
  const resolveInclude = opts.resolveInclude
  const resolveSubmodel = opts.resolveSubmodel
  const referringPath = opts.referringPath

  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  const fm = model.frontmatter

  if (!fm.level) {
    errors.push({ path: 'frontmatter.level', message: 'Missing level', severity: 'error' })
  } else if (fm.level !== 3 && fm.level !== 2) {
    errors.push({
      path: 'frontmatter.level',
      message: `Expected level 2 or 3 for model/template validation, got ${fm.level}`,
      severity: 'error',
    })
  }
  if (!fm.parent_spec) {
    errors.push({
      path: 'frontmatter.parent_spec',
      message: 'Missing parent_spec',
      severity: 'error',
    })
  }
  if (fm.level === 3) {
    if (!fm.model_version) {
      errors.push({
        path: 'frontmatter.model_version',
        message: 'Missing model_version',
        severity: 'error',
      })
    }
    if (
      fm.matrices !== undefined ||
      fm.concepts !== undefined ||
      fm.markers !== undefined ||
      fm.relationship_types !== undefined
    ) {
      errors.push({
        path: 'frontmatter',
        message:
          'Level 3 models MUST NOT declare schema components (matrices, concepts, markers, relationship_types) in their frontmatter. Move them to the template.',
        severity: 'error',
      })
    }
  }

  // D4: Slug/name collisions are validation ERRORs per N1 specification (Identity & Naming)
  if (model.slugCollisions && model.slugCollisions.length > 0) {
    for (const col of model.slugCollisions) {
      errors.push({
        path: `elements.${col.concept}`,
        message: `Slug collision: "${col.slug}" is shared by elements: ${col.elements.join(', ')}. Element names must be unique across the whole model`,
        severity: 'error',
      })
    }
  }

  // R-MM-02: Reject reserved concept names in template
  const RESERVED_CONCEPT_NAMES = new Set(['Concepts', 'Elements', 'Markers'])
  for (const concept of fm.concepts ?? []) {
    if (RESERVED_CONCEPT_NAMES.has(concept.name)) {
      errors.push({
        path: `frontmatter.concepts.${concept.name}`,
        message: `Reserved concept name "${concept.name}" — Concepts, Elements, and Markers are reserved pseudo-concepts and MUST NOT be declared`,
        severity: 'error',
      })
    }
  }

  // FR-007: Reject FOLDER mode
  if (fm.mode === 'FOLDER') {
    errors.push({
      path: 'frontmatter.mode',
      message:
        'FOLDER mode is removed in V_0-1-3. Use index.md-based workspace with single-file models.',
      severity: 'error',
    })
  }

  if (!template) {
    errors.push({
      path: 'parent',
      message: '[PARENT_RESOLUTION_FAILED] Parent specification template could not be resolved or loaded',
      severity: 'error',
    })
    return { valid: false, errors, warnings }
  }

  const templateFm = template.frontmatter
  // Level-2 templates declare their schema as body elements that instantiate
  // `Concept Definition` / `Field Definition` / `Matrix Definition` /
  // `Marker Definition`. There is no frontmatter fallback. When the template
  // declares `includes`, the effective schema is the additive union of every
  // composed template plus its own definitions.
  const composed = resolveTemplateSchema(template.rawContent, resolveInclude)
  for (const diag of composed.errors) {
    ;(diag.severity === 'error' ? errors : warnings).push({ ...diag, path: `parent.${diag.path}` })
  }
  const bodySchema = composed.schema
  const templateConcepts = bodySchema.concepts
  const templateMarkers = bodySchema.markers
  const templateMatrices = bodySchema.matrices

  // Check concept documentation in template rawContent (R-MVW-01 & R-MVW-02)
  const rawContent = template.rawContent || ''
  const lines = rawContent.split(/\r?\n/)
  interface H2Section {
    title: string
    subheadings: string[]
  }
  const h2Sections: H2Section[] = []
  let currentH2: H2Section | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('## ')) {
      const title = trimmed.substring(3).trim()
      currentH2 = { title, subheadings: [] }
      h2Sections.push(currentH2)
    } else if (trimmed.startsWith('### ') && currentH2) {
      const subtitle = trimmed.substring(4).trim()
      currentH2.subheadings.push(subtitle)
    }
  }

  const requiredH3s = ['Summary', 'Description', 'Methodologies', 'Prompts']
  for (const concept of templateConcepts) {
    const conceptName = concept.name
    const section = h2Sections.find((s) => s.title === conceptName)
    if (!section) {
      warnings.push({
        path: `parent.concepts.${conceptName}`,
        message: `Concept '${conceptName}' lacks optional guidance section '### ${conceptName}' in parent template`,
        severity: 'warning',
      })
    } else {
      const missing = requiredH3s.filter((req) => !section.subheadings.includes(req))
      if (missing.length > 0) {
        warnings.push({
          path: `parent.concepts.${conceptName}`,
          message: `Concept '${conceptName}' has incomplete documentation in parent template (missing: ${missing.join(', ')})`,
          severity: 'warning',
        })
      }
    }
  }

  const knownConceptGroups: Array<[string, Array<{ name: string; fields: Record<string, unknown> }>]> = []
  for (const [conceptName, elements] of model.elements) {
    const conceptDef = templateConcepts.find(
      (c) => c.name.toLowerCase() === conceptName.toLowerCase(),
    )
    if (!conceptDef) {
      errors.push({
        path: `elements.${conceptName}`,
        message: `Concept "${conceptName}" is not defined in template`,
        severity: 'error',
      })
      continue
    }

    const conceptType = conceptDef.type
    if (conceptType === 'text' && elements.length > 0) {
      warnings.push({
        path: `elements.${conceptName}`,
        message: `Text-type concept "${conceptName}" should use plain Markdown content, not element headings (## NN ${conceptName}:). Found ${elements.length} element(s).`,
        severity: 'warning',
      })
    }

    knownConceptGroups.push([conceptDef.name, elements])
  }

  // Shared property/enum conformance pass — the same check `validateTemplate`
  // runs against the level-1 metaschema. Values outside a `select` field's
  // `options` are ERRORs. Undeclared properties are NOT flagged at the model
  // level: extra per-element metadata (notes, custom keys) is a legitimate
  // authoring pattern here, unlike at the template-definition boundary.
  for (const diag of checkElementsAgainstSchema(knownConceptGroups, templateConcepts, {
    unknownProperty: 'ignore',
  })) {
    ;(diag.severity === 'error' ? errors : warnings).push({
      ...diag,
      path: `elements.${diag.path}`,
    })
  }

  for (const matrix of model.matrices) {
    const decl = templateMatrices.find((m) => m.name.toLowerCase() === matrix.name.toLowerCase())
    if (!decl) {
      warnings.push({
        path: `matrices.${matrix.name}`,
        message: `Matrix "${matrix.name}" is not declared in template`,
        severity: 'warning',
      })
      continue
    }

    // Cell values must belong to the matrix's declared `values` set
    // (R-MM-08). The empty cell `-` and the boolean marker `X` are always
    // accepted. When no `values` are declared, any text is allowed.
    const declaredValues = Array.isArray(decl.values)
      ? (decl.values as string[]).map((v) => v.toLowerCase())
      : undefined
    if (declaredValues && declaredValues.length > 0) {
      for (const cell of matrix.cells) {
        const raw = cell.value
        if (raw === '-' || raw === '' || raw === 'X' || raw === 'x') continue
        if (!declaredValues.includes(raw.toLowerCase())) {
          warnings.push({
            path: `matrices.${matrix.name}.cells["${cell.row}"]["${cell.col}"]`,
            message: `Matrix "${matrix.name}" cell value "${raw}" is not in the declared value set: ${(decl.values as string[]).join(', ')}`,
            severity: 'warning',
          })
        }
      }
    }
  }

  const conceptNameSet = new Set(templateConcepts.map((c) => c.name.toLowerCase()))
  for (const [itemName, markers] of Object.entries(model.nodeMarkers)) {
    // A row in the `item-markers matrix` may be an Element or a Concept.
    const rowScope: 'Concept' | 'Element' = conceptNameSet.has(itemName.toLowerCase())
      ? 'Concept'
      : 'Element'
    for (const [markerName, score] of Object.entries(markers)) {
      const decl = templateMarkers.find((m) => m.name.toLowerCase() === markerName.toLowerCase())
      if (!decl) {
        warnings.push({
          path: `nodeMarkers.${itemName}.${markerName}`,
          message: `Marker "${markerName}" is not defined in template`,
          severity: 'warning',
        })
        continue
      }

      // `applies_to` (default `[Element]`) gates which entities may be scored.
      // A row whose scope is not permitted is a validation ERROR (iNNfo
      // "Marker Definition").
      const appliesTo = (decl.applies_to && decl.applies_to.length > 0
        ? decl.applies_to
        : ['Element']
      ).map((s) => s.toLowerCase())
      if (!appliesTo.includes(rowScope.toLowerCase())) {
        errors.push({
          path: `nodeMarkers.${itemName}.${markerName}`,
          message: `Marker "${markerName}" is scored on ${rowScope} "${itemName}", but its applies_to is [${(decl.applies_to ?? ['Element']).join(', ')}]`,
          severity: 'error',
        })
      }

      // When the Marker declares a `values` set, scores must belong to it
      // (empty cell `-` is already dropped at parse time).
      if (decl.values && decl.values.length > 0) {
        const raw = String(score)
        const allowed = decl.values.map((v) => v.toLowerCase())
        if (raw !== '-' && raw !== '' && !allowed.includes(raw.toLowerCase())) {
          warnings.push({
            path: `nodeMarkers.${itemName}.${markerName}`,
            message: `Marker "${markerName}" score "${raw}" on "${itemName}" is not in its declared value set: ${decl.values.join(', ')}`,
            severity: 'warning',
          })
        }
      }
    }
  }

  // R-IE-04: reference-typed element fields must resolve to element names
  // model-wide, respecting each field's `target_concepts` when declared.
  for (const diag of validateElementFieldReferences(model, templateConcepts, {
    resolveSubmodel,
    referringPath,
  })) {
    ;(diag.severity === 'error' ? errors : warnings).push(diag)
  }

  // R-IE-04: matrix cell row/col labels must resolve to element names.
  // Reported as WARNINGS here (not errors): real V_0-1-0 fixtures use matrix
  // labels that are numbered/abbreviated variants of element names (e.g.
  // `## NN Journey: 1. Paranormal Incident` with row `Paranormal Incident`,
  // or row `Open PR` vs element `Open Pull Request`), so failing hard would
  // reject legitimate published templates. Field-level references above are
  // the hard errors; matrix label drift stays visible but non-blocking.
  for (const diag of validateReferences(model)) {
    warnings.push(diag)
  }

  // Cross-check the # NN index taxonomy against reference-typed element
  // fields (e.g. parent_component). WARNING only — see hierarchy.ts.
  for (const diag of validateTaxonomyHierarchy(model, templateConcepts, bodySchema.taxonomy)) {
    warnings.push(diag)
  }

  return { valid: errors.length === 0, errors, warnings }
}
