import type { Concept, Marker, MatrixDecl, ParsedKnowledge } from '../types/index.js'
import type { Diagnostics } from '../diagnostics.js'
import { checkElementsAgainstSchema } from '../schema/index.js'
import { validateFieldValue } from '../schema/field-values.js'
import { RESERVED_CONCEPT_NAMES } from './constants.js'
import { checkRemovedMarkerConstructs } from './removed-constructs.js'

/** One element group as consumed by `checkElementsAgainstSchema`. */
export type ElementGroup = [string, Array<{ name: string; fields: Record<string, unknown> }>]

/**
 * Frontmatter-level invariants that do not need the resolved template:
 * `level`, `parent_spec`, level-3 `knowledge_version` + no-schema-in-frontmatter,
 * slug collisions, reserved concept names, and the removed FOLDER mode.
 */
export function checkFrontmatterInvariants(model: ParsedKnowledge, d: Diagnostics): void {
  const fm = model.frontmatter

  if (!fm.level) {
    d.error('frontmatter.level', 'Missing level')
  } else if (fm.level !== 3 && fm.level !== 2) {
    d.error(
      'frontmatter.level',
      `Expected level 2 or 3 for model/template validation, got ${fm.level}`,
    )
  }

  if (!fm.parent_spec) {
    d.error('frontmatter.parent_spec', 'Missing parent_spec')
  }

  if (fm.level === 3) {
    if (!fm.knowledge_version) {
      d.error('frontmatter.knowledge_version', 'Missing knowledge_version')
    }
    if (
      fm.matrices !== undefined ||
      fm.concepts !== undefined ||
      fm.markers !== undefined ||
      fm.relationship_types !== undefined
    ) {
      d.error(
        'frontmatter',
        'Level 3 models MUST NOT declare schema components (matrices, concepts, markers, relationship_types) in their frontmatter. Move them to the template.',
        {
          code: 'L3_SCHEMA_COMPONENTS',
          promptHint:
            'Move the schema components from the model frontmatter into the parent template (e.g. declare the matrix under "# NN Matrix Definition" in the level-2 template); level-3 models must not declare schema components.',
        },
      )
    }
  }

  // D4: slug/name collisions are ERRORs per N1 (Identity & Naming).
  for (const col of model.slugCollisions ?? []) {
    d.error(
      `elements.${col.concept}`,
      `Slug collision: "${col.slug}" is shared by elements: ${col.elements.join(', ')}. Element names must be unique across the whole model`,
    )
  }

  // Stable Element Identity: explicit slug uniqueness per model (DUPLICATE_SLUG)
  const elementsBySlug = new Map<string, string[]>()
  for (const [, elements] of model.elements.entries()) {
    for (const el of elements) {
      if (el.slug) {
        const list = elementsBySlug.get(el.slug) ?? []
        list.push(el.name)
        elementsBySlug.set(el.slug, list)
      }
    }
  }
  for (const [slug, names] of elementsBySlug.entries()) {
    if (names.length > 1) {
      d.error(
        'elements',
        `Duplicate slug "${slug}" shared by elements: ${names.join(', ')}. Slugs are immutable and unique per model; ` +
          `a copy-pasted element repeats its original's "slug::" line. On the copy, delete the "slug::" line and give it ` +
          `a unique name, or add elements with the apply_change add_element operation instead of copy-pasting`,
        { code: 'DUPLICATE_SLUG' },
      )
    }
  }

  // Stable Element Identity: unfrozen level-3 models trigger warning (UNFROZEN_MODEL)
  if (fm.level === 3 && model.elements.size > 0) {
    let hasUnfrozen = false
    for (const [, elements] of model.elements.entries()) {
      for (const el of elements) {
        if (!el.slugExplicit) {
          hasUnfrozen = true
          break
        }
      }
      if (hasUnfrozen) break
    }
    if (hasUnfrozen) {
      d.warn(
        'model',
        'Model contains elements without explicit slugs and is not frozen. Any mutation will automatically freeze slugs.',
        { code: 'UNFROZEN_MODEL' },
      )
    }
  }

  // R-MM-02: reserved concept names in the template frontmatter.
  for (const concept of fm.concepts ?? []) {
    if (RESERVED_CONCEPT_NAMES.has(concept.name)) {
      d.error(
        `frontmatter.concepts.${concept.name}`,
        `Reserved concept name "${concept.name}" — Concepts, Elements, and Markers are reserved pseudo-concepts and MUST NOT be declared`,
        {
          code: 'RESERVED_CONCEPT_NAME',
          promptHint: `Rename the concept (e.g. "${concept.name}" -> "${concept.name}Catalog"); Concepts, Elements, and Markers are reserved pseudo-concepts and must not be declared as normal concepts.`,
        },
      )
    }
  }

  // FR-007: FOLDER mode is removed.
  if (fm.mode === 'FOLDER') {
    d.error(
      'frontmatter.mode',
      'FOLDER mode is removed in V_0-1-3. Use index.md-based workspace with single-file models.',
    )
  }
}

interface H2Section {
  title: string
  subheadings: string[]
}

/**
 * Scan `## ` / `### ` headings out of a template's raw content into a flat
 * list of H2 sections each carrying its immediate H3 subheadings. Used for the
 * per-concept guidance-documentation check (R-MVW-01 / R-MVW-02).
 */
export function scanGuidanceSections(rawContent: string): H2Section[] {
  const sections: H2Section[] = []
  let current: H2Section | null = null
  for (const line of rawContent.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed.startsWith('## ')) {
      current = { title: trimmed.substring(3).trim(), subheadings: [] }
      sections.push(current)
    } else if (trimmed.startsWith('### ') && current) {
      current.subheadings.push(trimmed.substring(4).trim())
    }
  }
  return sections
}

const REQUIRED_GUIDANCE_H3S = ['Summary', 'Description', 'Methodologies', 'Prompts']

/**
 * Warn (never error) when a template Concept has no `## <Concept>` guidance
 * section, or one that is missing required `### ` subsections.
 */
export function checkBlueprintDocumentation(
  templateConcepts: Concept[],
  templateRawContent: string,
  d: Diagnostics,
): void {
  const sections = scanGuidanceSections(templateRawContent)
  const incomplete: Array<{ name: string; missing: string[] }> = []

  for (const concept of templateConcepts) {
    const section = sections.find((s) => s.title === concept.name)
    const missing = section
      ? REQUIRED_GUIDANCE_H3S.filter((req) => !section.subheadings.includes(req))
      : [...REQUIRED_GUIDANCE_H3S]
    if (missing.length > 0) incomplete.push({ name: concept.name, missing })
  }

  if (incomplete.length === 0) return

  const describe = (c: { name: string; missing: string[] }) =>
    `'${c.name}' (missing: ${c.missing.join(', ')})`
  const message =
    incomplete.length === 1
      ? `Concept ${describe(incomplete[0])} lacks complete guidance section in parent template`
      : `${incomplete.length} template concepts lack complete guidance sections: ${incomplete.map(describe).join('; ')}`

  const headings = REQUIRED_GUIDANCE_H3S.map((h) => `\`### ${h}\``).join(', ')
  d.warn('parent.concepts', message, {
    code: 'PARENT_CONCEPT_GUIDANCE_INCOMPLETE',
    promptHint: `In the parent template, add a \`## <ConceptName>\` section for each listed concept containing the subsections ${headings}.`,
    meta: { concepts: incomplete },
  })
}

/**
 * Match a concept name against template concepts, tolerating singular/plural forms.
 */
export function matchConcept(name: string, concepts: Concept[]): Concept | undefined {
  const lower = name.toLowerCase()
  const exact = concepts.find((c) => c.name.toLowerCase() === lower)
  if (exact) return exact

  return concepts.find((c) => {
    const cLower = c.name.toLowerCase()
    if (lower + 's' === cLower || lower + 'es' === cLower) return true
    if (cLower + 's' === lower || cLower + 'es' === lower) return true
    return false
  })
}

/**
 * Match each model element group to a template Concept. Unknown concepts are
 * ERRORs (and dropped from the returned groups); `text`-type concepts that
 * carry element headings get a WARNING. Returns the groups that resolved to a
 * known Concept, for the shared schema-conformance pass.
 */
export function checkElementGroups(
  model: ParsedKnowledge,
  templateConcepts: Concept[],
  d: Diagnostics,
): ElementGroup[] {
  const known: ElementGroup[] = []
  for (const [conceptName, elements] of model.elements) {
    if (conceptName.toLowerCase() === 'marker definition') {
      continue
    }
    const conceptDef = matchConcept(conceptName, templateConcepts)
    if (!conceptDef) {
      d.error(`elements.${conceptName}`, `Concept "${conceptName}" is not defined in template`)
      continue
    }
    if (conceptDef.type === 'text' && elements.length > 0) {
      d.warn(
        `elements.${conceptName}`,
        `Text-type concept "${conceptName}" should use plain Markdown content, not element headings (## NN ${conceptName}:). Found ${elements.length} element(s).`,
      )
    }
    known.push([conceptDef.name, elements])
  }
  return known
}

/**
 * Shared property/enum conformance pass (the same check `validateBlueprint` runs
 * against the level-1 metaschema). Undeclared properties are ignored at the
 * model level; bad `select` values are ERRORs.
 */
export function checkSchemaConformance(
  groups: ElementGroup[],
  templateConcepts: Concept[],
  d: Diagnostics,
): void {
  for (const diag of checkElementsAgainstSchema(groups, templateConcepts, {
    unknownProperty: 'ignore',
  })) {
    d.add({ ...diag, path: `elements.${diag.path}` })
  }
}

/**
 * Validate concept-level field values once against the concept's declared Field (R-CF-01).
 * Invalid values report ERROR with path naming the concept and Field.
 */
export function checkConceptFields(
  model: ParsedKnowledge,
  templateConcepts: Concept[],
  d: Diagnostics,
): void {
  if (!model.conceptFields) return

  for (const [conceptName, fields] of Object.entries(model.conceptFields)) {
    const conceptDef = matchConcept(conceptName, templateConcepts)
    if (!conceptDef) continue

    const fieldByName = new Map((conceptDef.fields || []).map((f) => [f.name.toLowerCase(), f]))

    for (const [key, rawVal] of Object.entries(fields)) {
      const fieldDef = fieldByName.get(key.toLowerCase())
      if (!fieldDef) continue

      const fieldDiags = validateFieldValue(fieldDef, rawVal, `concepts.${conceptDef.name}.${key}`)
      for (const diag of fieldDiags) {
        d.add(diag)
      }
    }
  }
}

/**
 * Matrix cell values must belong to the declared `values` set (R-MM-08). The
 * empty cell `-` and the boolean marker `X` are always accepted; an undeclared
 * matrix is a WARNING.
 */
export function checkMatrixCells(
  model: ParsedKnowledge,
  templateMatrices: MatrixDecl[],
  d: Diagnostics,
): void {
  for (const matrix of model.matrices) {
    if (matrix.name.toLowerCase() === 'item-markers matrix') {
      continue
    }
    const decl = templateMatrices.find((m) => m.name.toLowerCase() === matrix.name.toLowerCase())
    if (!decl) {
      d.warn(`matrices.${matrix.name}`, `Matrix "${matrix.name}" is not declared in template`)
      continue
    }
    const declaredValues = Array.isArray(decl.values)
      ? (decl.values as string[]).map((v) => v.toLowerCase())
      : undefined
    if (!declaredValues || declaredValues.length === 0) continue
    for (const cell of matrix.cells) {
      const raw = cell.value
      if (raw === '-' || raw === '' || raw === 'X' || raw === 'x') continue
      if (!declaredValues.includes(raw.toLowerCase())) {
        d.warn(
          `matrices.${matrix.name}.cells["${cell.row}"]["${cell.col}"]`,
          `Matrix "${matrix.name}" cell value "${raw}" is not in the declared value set: ${(decl.values as string[]).join(', ')}`,
        )
      }
    }
  }
}

/**
 * Node-marker scores: an undeclared Marker is a WARNING; a score on an entity
 * outside the Marker's `applies_to` (default `[Element]`) is an ERROR; a score
 * outside the Marker's declared `values` set is a WARNING.
 */
export function checkNodeMarkers(
  model: ParsedKnowledge,
  templateConcepts: Concept[],
  templateMarkers: Marker[],
  d: Diagnostics,
): void {
  for (const [itemName, markers] of Object.entries(model.nodeMarkers)) {
    const rowScope: 'Concept' | 'Element' = matchConcept(itemName, templateConcepts)
      ? 'Concept'
      : 'Element'
    for (const [markerName, score] of Object.entries(markers)) {
      const decl = templateMarkers.find((m) => m.name.toLowerCase() === markerName.toLowerCase())
      if (!decl) {
        d.warn(
          `nodeMarkers.${itemName}.${markerName}`,
          `Marker "${markerName}" is not defined in template`,
        )
        continue
      }

      const appliesTo = (
        decl.applies_to && decl.applies_to.length > 0 ? decl.applies_to : ['Element']
      ).map((s) => s.toLowerCase())
      if (!appliesTo.includes(rowScope.toLowerCase())) {
        d.error(
          `nodeMarkers.${itemName}.${markerName}`,
          `Marker "${markerName}" is scored on ${rowScope} "${itemName}", but its applies_to is [${(decl.applies_to ?? ['Element']).join(', ')}]`,
        )
      }

      if (decl.values && decl.values.length > 0) {
        const raw = String(score)
        const allowed = decl.values.map((v) => v.toLowerCase())
        if (raw !== '-' && raw !== '' && !allowed.includes(raw.toLowerCase())) {
          d.warn(
            `nodeMarkers.${itemName}.${markerName}`,
            `Marker "${markerName}" score "${raw}" on "${itemName}" is not in its declared value set: ${decl.values.join(', ')}`,
          )
        }
      }
    }
  }
}
