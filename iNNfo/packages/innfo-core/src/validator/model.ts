import { ParsedModel, SpecDocument, ValidationResult } from '../types'
import { resolveTemplateSchema } from '../schema'
import type { IncludeResolver } from '../schema'
import { Diagnostics } from '../diagnostics'
import { validateReferences, validateElementFieldReferences } from './references'
import type { SubmodelResolver } from './references'
import { validateTaxonomyHierarchy } from './hierarchy'
import {
  checkFrontmatterInvariants,
  checkTemplateDocumentation,
  checkElementGroups,
  checkSchemaConformance,
  checkMatrixCells,
  checkNodeMarkers,
} from './model-checks'

export interface ValidateModelOptions {
  resolveInclude?: IncludeResolver
  resolveSubmodel?: SubmodelResolver
  referringPath?: string
}

/**
 * Validates model contents against its template specification (level 2/3).
 *
 * Orchestrates the individual checks in `model-checks.ts`, routing every
 * diagnostic through a single `Diagnostics` accumulator. `resolveInclude`
 * returns the raw content of a template named in the resolved template's
 * `includes` list (supplied by the host — innfo-mcp / the editor — which owns
 * spec I/O); when omitted, `includes` composition is skipped.
 *
 * `_formatSpec` is retained for call-site compatibility and unused; the
 * `resolveIncludeOrOptions` position accepts either a bare `IncludeResolver`
 * (legacy) or a `ValidateModelOptions` object.
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

  const d = new Diagnostics()

  checkFrontmatterInvariants(model, d)

  if (!template) {
    d.error(
      'parent',
      '[PARENT_RESOLUTION_FAILED] Parent specification template could not be resolved or loaded',
    )
    return d.result()
  }

  // Level-2 templates declare their schema as `… Definition` body elements;
  // when the template declares `includes`, the effective schema is the
  // additive union of every composed template plus its own definitions.
  const composed = resolveTemplateSchema(template.rawContent, opts.resolveInclude)
  for (const diag of composed.errors) {
    d.add({ ...diag, path: `parent.${diag.path}` })
  }
  const { concepts: templateConcepts, markers: templateMarkers, matrices: templateMatrices } =
    composed.schema

  checkTemplateDocumentation(templateConcepts, template.rawContent || '', d)

  const knownConceptGroups = checkElementGroups(model, templateConcepts, d)
  checkSchemaConformance(knownConceptGroups, templateConcepts, d)

  checkMatrixCells(model, templateMatrices, d)
  checkNodeMarkers(model, templateConcepts, templateMarkers, d)

  // R-IE-04: reference-typed element fields must resolve to element names
  // model-wide, respecting each field's `target_concepts` when declared.
  d.addAll(
    validateElementFieldReferences(model, templateConcepts, {
      resolveSubmodel: opts.resolveSubmodel,
      referringPath: opts.referringPath,
    }),
  )

  // R-IE-04: matrix cell row/col labels. WARNING only (never blocking) — real
  // published fixtures use numbered/abbreviated label variants; field-level
  // references above are the hard errors. See hierarchy.ts / references.ts.
  for (const diag of validateReferences(model)) d.addAsWarning(diag)
  for (const diag of validateTaxonomyHierarchy(model, templateConcepts, composed.schema.taxonomy)) {
    d.addAsWarning(diag)
  }

  return d.result()
}
