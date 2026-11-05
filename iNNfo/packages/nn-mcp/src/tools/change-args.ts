/**
 * Change -> mutation arguments (changeset-apply-engine).
 *
 * A change names a unit address (`model@element&field`, `model@matrix&row&col`,
 * …); the mutation engine takes structured arguments. This mapping used to live
 * inside the apply engine only. Strict drift (`provenance-strict.ts`) replays the
 * same changes, so the mapping is extracted here: one definition, two callers,
 * no chance of the replay drifting from apply.
 */
import { isAddressError, parseAddress } from '@cognnitive/nn-core'
import type { AddressError, BlueprintSchema, ChangeItem, ParsedKnowledge } from '@cognnitive/nn-core'

/**
 * Splits a change target into its model id and remaining address parts. The unified
 * address grammar decides whether the target is valid: a violation is reported in
 * `error` (a file path, a wikilink, a non-canonical segment) while the split itself
 * stays lenient, so a legacy display-name target keeps resolving until the engine
 * rejects on `error` (the index-backed resolution lands with the domain index).
 */
export function parseTargetAddress(target: string): {
  modelSlug: string
  remainder: string
  parts: string[]
  error?: AddressError
} {
  const parsed = parseAddress(target)
  const invalid: AddressError | undefined = isAddressError(parsed)
    ? parsed
    : parsed.kind === 'source'
      ? {
          kind: 'error',
          code: 'ADDRESS_MALFORMED',
          segment: parsed.raw,
          message: `Malformed target: \`${parsed.raw}\` is a file path, not a model address; use \`<hierarchical-id>@<slug>\`.`,
        }
      : undefined
  const atIdx = target.indexOf('@')
  const error = invalid ? { error: invalid } : {}
  if (atIdx === -1) {
    return { modelSlug: target.trim(), remainder: '', parts: [], ...error }
  }
  const modelSlug = target.slice(0, atIdx).trim()
  const remainder = target.slice(atIdx + 1).trim()
  const parts = remainder.split('&').map((p) => p.trim())
  return { modelSlug, remainder, parts, ...error }
}

/** Finds an element by name or slug, optionally scoped to a concept. */
export function findElementInModel(
  model: ParsedKnowledge,
  conceptName?: string,
  elementIdent?: string,
): { concept: string; element: Record<string, any> } | null {
  if (!elementIdent) return null
  const lowerIdent = elementIdent.toLowerCase()
  const matches = (el: Record<string, any>): boolean =>
    String(el.name ?? '').toLowerCase() === lowerIdent ||
    (el.slug !== undefined && String(el.slug).toLowerCase() === lowerIdent)

  if (conceptName) {
    const list = model.elements.get(conceptName)
    if (list) {
      for (const el of list) {
        if (matches(el)) return { concept: conceptName, element: el }
      }
    }
  }
  for (const [concept, list] of model.elements.entries()) {
    for (const el of list) {
      if (matches(el)) return { concept, element: el }
    }
  }
  return null
}

/**
 * The mutation arguments for a change. `model` is the CURRENT model, used to
 * resolve a concept name the change does not carry (remove/rename). Ops that are
 * not mutations (`add_model`, `bump_version`, `freeze_slugs`, `comment`,
 * `produce_artifact`) are handled by the caller and must not reach this function.
 */
export function mutationArgsForChange(
  change: ChangeItem,
  model: ParsedKnowledge,
  schema?: BlueprintSchema,
): Record<string, unknown> {
  const { parts, remainder } = parseTargetAddress(change.target)

  if (change.op === 'update_field') {
    // The field is the LAST segment of the address: an element name may contain
    // `&` (issue 491 C), so splitting on the first one targets the wrong field.
    const atIdx = change.target.indexOf('@')
    const remainder = atIdx !== -1 ? change.target.slice(atIdx + 1) : change.target
    const ampIdx = remainder.lastIndexOf('&')
    const elIdent = ampIdx !== -1 ? remainder.slice(0, ampIdx) : remainder
    const fieldIdent = ampIdx !== -1 ? remainder.slice(ampIdx + 1) : ''
    return {
      conceptName: change.concept,
      elementName: elIdent,
      fieldName: fieldIdent,
      value: change.to,
      to: change.to,
      target: change.target,
    }
  }

  if (change.op === 'update_element_text') {
    // The prose body is a unit: `to` is the new text, `from` was checked when the
    // changeset was partitioned.
    return { target: change.target, text: change.to }
  }

  if (change.op === 'add_element') {
    const conceptName = change.concept || (remainder && !remainder.includes('&') ? remainder : '')
    const elementName = change.name || change.slug || ''
    const args: Record<string, unknown> = {
      conceptName,
      elementName,
      slug: change.resolved_slug || change.slug,
    }
    // Use the declared spelling of the concept (matching is case-insensitive).
    const declaredConcept = schema?.concepts.find(
      (c) => c.name.toLowerCase() === String(conceptName).toLowerCase(),
    )
    if (declaredConcept) args.conceptName = declaredConcept.name
    return args
  }

  if (change.op === 'update_matrix_cell') {
    return {
      // The console emits the matrix display name (`Concept 1-Concept 2
      // Matrix`), not a slug. Pass it as BOTH: `matchesMatrix` accepts an exact
      // name or a slugified name/slug, so name and slug targets both resolve.
      matrixName: parts[0],
      matrixSlug: parts[0],
      row: parts[1],
      col: parts[2],
      value: change.to,
      to: change.to,
    }
  }

  if (change.op === 'repin_blueprint') {
    // The lineage operation that replaces the legacy regex repin: `to` is the
    // target parent_spec.name and `blueprint_url` the target url. `from` is an
    // optional precondition on the current pin.
    return { to: change.to, blueprintUrl: change.blueprint_url, from: change.from }
  }

  if (change.op === 'rename_field') {
    return { from: change.from, to: change.to, conceptName: change.concept }
  }

  if (change.op === 'set_field_default') {
    return { fieldName: change.name, to: change.to, conceptName: change.concept }
  }

  if (change.op === 'remove_element') {    const elIdent = change.name || parts[0] || remainder
    const conceptName = change.concept ?? findElementInModel(model, undefined, elIdent)?.concept
    return { conceptName, elementName: elIdent }
  }

  if (change.op === 'extract_instance') {
    // The target is the source element address; the cut moves the element and
    // every descendant (`parentSlug`) out of the source model (design A11).
    const elIdent = parts[0] || remainder
    const conceptName = change.concept ?? findElementInModel(model, undefined, elIdent)?.concept
    return { conceptName, elementName: elIdent }
  }

  if (change.op === 'rename_element') {
    const elIdent = parts[0] || remainder
    const conceptName = change.concept ?? findElementInModel(model, undefined, elIdent)?.concept
    return { conceptName, elementName: elIdent, newName: change.name || change.to }
  }

  if (change.op === 'rename_concept') {
    return { conceptName: change.concept || remainder, newName: change.name || change.to }
  }

  if (change.op === 'update_concept_text') {
    return {
      conceptName: change.concept || remainder,
      text: change.to || (change as Record<string, any>).text || (change as Record<string, any>).content || '',
    }
  }

  if (change.op === 'update_concept_field') {
    let conceptName = change.concept || remainder
    let fieldName = ''
    const ampIdx = remainder.indexOf('&')
    if (ampIdx !== -1) {
      conceptName = remainder.slice(0, ampIdx).trim()
      fieldName = remainder.slice(ampIdx + 1).trim()
    }
    if (conceptName.toLowerCase().startsWith('concept:')) {
      conceptName = conceptName.slice('concept:'.length).trim()
    }
    return {
      conceptName,
      fieldName,
      value: change.to,
      to: change.to,
      target: change.target,
    }
  }

  if (change.op === 'remove_matrix') {
    let matrixName = remainder.trim()
    if (matrixName.toLowerCase().startsWith('matrix:')) {
      matrixName = matrixName.slice('matrix:'.length).trim()
    }
    return { matrixName, target: change.target }
  }

  if (change.op === 'add_matrix') {
    let matrixName = change.name || remainder.trim()
    if (matrixName.toLowerCase().startsWith('matrix:')) {
      matrixName = matrixName.slice('matrix:'.length).trim()
    }
    return {
      matrixName,
      source: change.concept,
      targetConcept: change.to,
      columns: change.seed?.columns,
      rows: change.seed?.rows,
      target: change.target,
    }
  }

  return { target: change.target, value: change.to, to: change.to }
}
