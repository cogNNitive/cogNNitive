import type { Concept, ElementNode, ParsedKnowledge } from '../types/index.js'
import { IMPLICIT_REF_FIELDS } from './elementIndex.js'
import { matchesTargetBlueprint } from './blueprintMatching.js'

export interface ReferenceDiagnostic {
  path: string
  message: string
  severity: 'error' | 'warning'
  /** Stable machine-readable code (e.g. `KU_UNKNOWN_ROW`). Tests assert codes, not prose. */
  code?: string
  /** Inline fix hint naming the canonical form or repair step. Survives the
   *  `Diagnostics` accumulator and the model/document report mapping. */
  promptHint?: string
  /** Structured context for reporters (paths, template names, urls). */
  meta?: Record<string, unknown>
}

/**
 * Synchronous callback supplied by host environments (Node MCP or Browser Editor)
 * to resolve submodel files and inspect their template identities.
 */
export type SubmodelResolver = (
  refPath: string,
  referringPath?: string,
) => { exists: boolean; templateName?: string; templateUrl?: string } | null

export interface ElementResolutionResult {
  found: boolean
  ambiguous?: boolean
  matchedName?: string
  elements?: ElementNode[]
  matchedBy?: 'slug' | 'name'
}

export interface ElementIndexes {
  bySlug: Map<string, ElementNode[]>
  byName: Map<string, ElementNode[]>
}

export function buildElementIndexes(model: ParsedKnowledge): ElementIndexes {
  const bySlug = new Map<string, ElementNode[]>()
  const byName = new Map<string, ElementNode[]>()

  for (const [, elements] of model.elements.entries()) {
    for (const el of elements) {
      if (el.slug) {
        const lowerSlug = el.slug.toLowerCase()
        const sList = bySlug.get(lowerSlug) ?? []
        sList.push(el)
        bySlug.set(lowerSlug, sList)
      }
      const lowerName = el.name.toLowerCase()
      const nList = byName.get(lowerName) ?? []
      nList.push(el)
      byName.set(lowerName, nList)
    }
  }

  return { bySlug, byName }
}

export function resolveReferenceTarget(
  value: string,
  indexes: ElementIndexes,
): ElementResolutionResult {
  const trimmed = value.trim()
  const lower = trimmed.toLowerCase()

  // 1. Exact slug match
  const slugMatches = indexes.bySlug.get(lower)
  if (slugMatches && slugMatches.length > 0) {
    return {
      found: true,
      elements: slugMatches,
      matchedName: slugMatches[0].name,
      matchedBy: 'slug',
    }
  }

  // 2. Exact display name match (iNNfo grammar; ambiguity is an error, never an
  //    arbitrary pick). No separator-normalized, case-folded-beyond-lowercase, or
  //    fuzzy fallback is applied.
  const nameMatches = indexes.byName.get(lower)
  if (nameMatches && nameMatches.length > 0) {
    if (nameMatches.length > 1) {
      return {
        found: true,
        ambiguous: true,
        elements: nameMatches,
        matchedBy: 'name',
      }
    }
    return {
      found: true,
      elements: nameMatches,
      matchedName: nameMatches[0].name,
      matchedBy: 'name',
    }
  }

  return { found: false }
}

/**
 * Validate that all references in matrix cells point to existing element names.
 * Returns diagnostics for dangling references (R-IE-04).
 */
export function validateReferences(model: ParsedKnowledge): ReferenceDiagnostic[] {
  const diagnostics: ReferenceDiagnostic[] = []
  const indexes = buildElementIndexes(model)

  for (const matrix of model.matrices) {
    for (const cell of matrix.cells) {
      if (cell.row) {
        const resolved = resolveReferenceTarget(cell.row, indexes)
        if (!resolved.found) {
          diagnostics.push({
            path: `matrices.${matrix.name}.row`,
            message: `Dangling reference: matrix "${matrix.name}" row "${cell.row}" does not match any element name`,
            severity: 'error',
          })
        } else if (resolved.ambiguous) {
          diagnostics.push({
            path: `matrices.${matrix.name}.row`,
            message: `Ambiguous element reference "${cell.row}" in matrix "${matrix.name}": matches multiple elements across concepts (${resolved.elements!.map((e) => `${e.type}/${e.name}`).join(', ')}). Use element slug or qualify reference.`,
            severity: 'warning',
            code: 'AMBIGUOUS_ELEMENT_NAME',
          })
        }
      }
      if (cell.col) {
        const resolved = resolveReferenceTarget(cell.col, indexes)
        if (!resolved.found) {
          diagnostics.push({
            path: `matrices.${matrix.name}.col`,
            message: `Dangling reference: matrix "${matrix.name}" column "${cell.col}" does not match any element name`,
            severity: 'error',
          })
        } else if (resolved.ambiguous) {
          diagnostics.push({
            path: `matrices.${matrix.name}.col`,
            message: `Ambiguous element reference "${cell.col}" in matrix "${matrix.name}": matches multiple elements across concepts (${resolved.elements!.map((e) => `${e.type}/${e.name}`).join(', ')}). Use element slug or qualify reference.`,
            severity: 'warning',
            code: 'AMBIGUOUS_ELEMENT_NAME',
          })
        }
      }
    }
  }

  return diagnostics
}

/**
 * Validate that element fields declared as `reference` in the template point
 * to existing element names (model-wide, case-insensitive). When the field
 * declares `target_concepts`, the resolved element's owning concept(s) must
 * be among them (R-IE-04).
 */
export function validateElementFieldReferences(
  model: ParsedKnowledge,
  templateConcepts: Concept[],
  options?: {
    resolveSubmodel?: SubmodelResolver
    referringPath?: string
  },
): ReferenceDiagnostic[] {
  const diagnostics: ReferenceDiagnostic[] = []
  const indexes = buildElementIndexes(model)

  for (const [conceptName, elements] of model.elements.entries()) {
    const conceptDef = templateConcepts.find(
      (c) => c.name.toLowerCase() === conceptName.toLowerCase(),
    )
    const fieldDefs = conceptDef?.fields ?? []

    for (const el of elements) {
      for (const fieldName of Object.keys(el.fields)) {
        const fieldDef = fieldDefs.find((f) => f.name.toLowerCase() === fieldName.toLowerCase())

        const isRef =
            (fieldDef && (fieldDef.type === 'reference' || fieldDef.type === 'knowledge')) ||
          IMPLICIT_REF_FIELDS.has(fieldName.toLowerCase())
        if (!isRef) continue

        const raw = el.fields[fieldName]
        if (raw === undefined || raw === null || raw === '') continue

        const refs = Array.isArray(raw) ? raw.map(String) : [String(raw)]
        for (const ref of refs) {
          const rawValue = ref.trim()
          if (!rawValue) continue

          // Clean reference syntax: [[Name]] -> Name. Skip qualified cross-model references.
          let value = rawValue
          if (value.startsWith('[[') && value.endsWith(']]')) {
            value = value.slice(2, -2).trim()
          }

          if (fieldDef?.type === 'knowledge') {
            const cleanPath = value.trim()
            if (options?.resolveSubmodel) {
              const res = options.resolveSubmodel(cleanPath, options.referringPath)
              if (res) {
                if (!res.exists) {
                  diagnostics.push({
                    path: `elements.${conceptName}.${el.name}.fields.${fieldDef?.name ?? fieldName}`,
                    message: `Dangling submodel reference: field "${fieldDef?.name ?? fieldName}" references file "${cleanPath}" which does not exist`,
                    severity: 'warning',
                    code: 'SUBMODEL_NOT_FOUND',
                    promptHint: `Create the file "${cleanPath}" or fix the path in field "${fieldDef?.name ?? fieldName}".`,
                    meta: { refPath: cleanPath, field: fieldDef?.name ?? fieldName },
                  })
                } else if (fieldDef.target_blueprint) {
                  const matches = matchesTargetBlueprint(fieldDef.target_blueprint, {
                    name: res.templateName,
                    url: res.templateUrl,
                  })

                  if (!matches) {
                    const actualLabel = res.templateName || res.templateUrl || 'unknown'
                    diagnostics.push({
                      path: `elements.${conceptName}.${el.name}.fields.${fieldDef?.name ?? fieldName}`,
                      message: `Submodel template mismatch: field "${fieldDef?.name ?? fieldName}" expects template "${fieldDef.target_blueprint}", but referenced file "${cleanPath}" uses template "${actualLabel}"`,
                      severity: 'warning',
                      code: 'SUBMODEL_TEMPLATE_MISMATCH',
                      promptHint: `Field "${fieldDef?.name ?? fieldName}" expects template "${fieldDef.target_blueprint}" but "${cleanPath}" uses "${actualLabel}": update target_blueprint or fix parent_spec in the referenced file.`,
                      meta: {
                        expectedBlueprint: fieldDef.target_blueprint,
                        actualBlueprint: actualLabel,
                        refPath: cleanPath,
                      },
                    })
                  }
                }
              }
            }
            continue
          }

          let isCrossModel = false
          if (value.startsWith('[') && value.includes(']')) {
            isCrossModel = true
          } else if (value.includes('::')) {
            isCrossModel = true
          }

          if (isCrossModel) {
            // Deliberate delegation, not an omission (AD-06): the qualified
            // form `[[Model Title :: Element Name]]` is validated
            // workspace-wide by validator/workspaceReferences.ts, which is
            // the only pass that can see sibling models. This per-file
            // validator stays graph-free by design and keeps bypassing any
            // `::`/`[...]`-shaped value exactly as before.
            continue
          }

          const resolved = resolveReferenceTarget(value, indexes)
          if (!resolved.found) {
            diagnostics.push({
              path: `elements.${conceptName}.${el.name}.fields.${fieldDef?.name ?? fieldName}`,
              message: `Dangling reference: field "${fieldDef?.name ?? fieldName}" value "${rawValue}" does not match any element name`,
              severity: 'error',
            })
            continue
          }

          if (resolved.ambiguous) {
            diagnostics.push({
              path: `elements.${conceptName}.${el.name}.fields.${fieldDef?.name ?? fieldName}`,
              message: `Ambiguous element reference "${rawValue}": matches multiple elements across concepts (${resolved.elements!.map((e) => `${e.type}/${e.name}`).join(', ')}). Use element slug or qualify reference.`,
              severity: 'error',
              code: 'AMBIGUOUS_ELEMENT_NAME',
            })
            continue
          }

          if (fieldDef?.target_concepts && fieldDef.target_concepts.length > 0) {
            const owningConcepts = new Set(resolved.elements!.map((e) => e.type.toLowerCase()))
            const allowed = fieldDef.target_concepts.map((c) => c.toLowerCase())
            const allowedMatch = [...owningConcepts].some((c) => allowed.includes(c))
            if (!allowedMatch) {
              diagnostics.push({
                path: `elements.${conceptName}.${el.name}.fields.${fieldDef.name}`,
                message: `Reference "${rawValue}" in field "${fieldDef.name}" resolves to element "${resolved.matchedName ?? value}" but that element belongs to concept(s) "${[...resolved.elements!.map((e) => e.type)].join(', ')}" which is not in target_concepts of the field`,
                severity: 'error',
              })
            }
          }
        }
      }
    }
  }

  return diagnostics
}
