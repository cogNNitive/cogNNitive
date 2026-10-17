import { slugify } from '../parser/slug.js'
import type { ChangeItem } from './types.js'
import type { ParsedKnowledge } from '../types/index.js'
import { escapeRegex, extractModelSlug } from './utils.js'

export interface CascadedMatrixCell {
  matrixName: string
  row: string
  col: string
}

export interface IncomingReferenceHit {
  referencingModelSlug: string
  referencingElementIdent: string
  field: string
  referenceType: 'field' | 'wikilink' | 'cross-model'
  rawReference: string
}

export interface DeleteImpact {
  cascadedCells: CascadedMatrixCell[]
  unresolvedReferences: IncomingReferenceHit[]
}

/**
 * Scans matrices in target model for cells whose row or column matches target element.
 */
export function computeMatrixCascade(
  model: ParsedKnowledge,
  elementSlug: string,
  elementName: string,
): CascadedMatrixCell[] {
  const cascaded: CascadedMatrixCell[] = []
  const slugLower = elementSlug.toLowerCase()
  const nameLower = elementName.toLowerCase()

  if (!model.matrices) return cascaded

  for (const matrix of model.matrices) {
    if (!matrix.cells) continue
    for (const cell of matrix.cells) {
      const rowLower = cell.row.toLowerCase()
      const colLower = cell.col.toLowerCase()
      if (
        rowLower === slugLower ||
        rowLower === nameLower ||
        colLower === slugLower ||
        colLower === nameLower
      ) {
        cascaded.push({
          matrixName: matrix.name,
          row: cell.row,
          col: cell.col,
        })
      }
    }
  }

  return cascaded
}

/**
 * Scans all workspace models for active incoming references to target element:
 * 1. Fields declared as reference/knowledge type or cross-model pointer
 * 2. Prose wikilinks [[slug]], [[name]], [[slug|alias]]
 * 3. Cross-model addresses model@slug
 * Filters out references that are satisfied by companion updates/deletes in the same batch.
 */
export function scanIncomingReferences(
  workspaceModels: Map<string, ParsedKnowledge>,
  targetModelSlug: string,
  targetElementSlug: string,
  targetElementName: string,
  batchChanges: ChangeItem[],
): IncomingReferenceHit[] {
  const hits: IncomingReferenceHit[] = []
  const tModelLower = targetModelSlug.toLowerCase()
  const tSlugLower = targetElementSlug.toLowerCase()
  const tNameLower = targetElementName.toLowerCase()

  // Companion removals: set of model@element being removed
  const companionRemovals = new Set<string>()
  // Companion updates: map of model@element&field -> new value
  const companionFieldUpdates = new Map<string, string>()

  for (const change of batchChanges) {
    if (change.op === 'remove_element') {
      const mSlug = extractModelSlug(change.target).toLowerCase()
      const atIdx = change.target.indexOf('@')
      const targetRemainder = atIdx !== -1 ? change.target.slice(atIdx + 1).toLowerCase() : ''
      const elIdent = (change.slug || change.name || targetRemainder).toLowerCase()
      companionRemovals.add(`${mSlug}@${elIdent}`)
    } else if (change.op === 'update_field') {
      const mSlug = extractModelSlug(change.target).toLowerCase()
      const atIdx = change.target.indexOf('@')
      const targetRemainder = atIdx !== -1 ? change.target.slice(atIdx + 1) : ''
      const ampIdx = targetRemainder.indexOf('&')
      if (ampIdx !== -1) {
        const elIdent = targetRemainder.slice(0, ampIdx).toLowerCase()
        const fieldIdent = targetRemainder.slice(ampIdx + 1)
        companionFieldUpdates.set(`${mSlug}@${elIdent}&${fieldIdent}`, String(change.to ?? ''))
      }
    }
  }

  const crossModelTarget = `${tModelLower}@${tSlugLower}`
  const crossModelTargetName = `${tModelLower}@${tNameLower}`

  for (const [mKey, model] of workspaceModels.entries()) {
    const currentModelSlug = (model.frontmatter.knowledge_slug || mKey).toLowerCase()
    if (!model.elements) continue

    for (const [, elements] of model.elements.entries()) {
      for (const el of elements) {
        const elIdent = (el.slug || slugify(el.name) || el.name).toLowerCase()
        const elKey = `${currentModelSlug}@${elIdent}`

        // If the referencing element is being removed in the same batch, skip it
        if (companionRemovals.has(elKey) || companionRemovals.has(`${currentModelSlug}@${el.name.toLowerCase()}`)) {
          continue
        }

        // Helper to check string content
        const checkContent = (
          fieldName: string,
          valStr: string,
        ): IncomingReferenceHit | null => {
          // Check if this field is updated in companion updates
          const fieldKey = `${currentModelSlug}@${elIdent}&${fieldName}`
          if (companionFieldUpdates.has(fieldKey)) {
            const newVal = companionFieldUpdates.get(fieldKey)!
            // If the new value does NOT point to the target element, it is satisfied!
            const stillMatches =
              newVal.toLowerCase().includes(crossModelTarget) ||
              newVal.toLowerCase().includes(`[[${tSlugLower}]]`) ||
              (currentModelSlug === tModelLower && newVal.toLowerCase() === tSlugLower)
            if (!stillMatches) {
              return null
            }
          }

          const valLower = valStr.toLowerCase()

          // 1. Cross-model address: model@slug
          if (valLower.includes(crossModelTarget) || valLower.includes(crossModelTargetName)) {
            return {
              referencingModelSlug: currentModelSlug,
              referencingElementIdent: elIdent,
              field: fieldName,
              referenceType: 'cross-model',
              rawReference: valStr,
            }
          }

          // 2. Wikilinks: [[slug]], [[slug|alias]], [[name]]
          const wikilinkRe = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
          let match: RegExpExecArray | null
          while ((match = wikilinkRe.exec(valStr)) !== null) {
            const linkTarget = match[1].trim().toLowerCase()
            if (
              linkTarget === tSlugLower ||
              linkTarget === tNameLower ||
              linkTarget === crossModelTarget ||
              linkTarget === crossModelTargetName
            ) {
              return {
                referencingModelSlug: currentModelSlug,
                referencingElementIdent: elIdent,
                field: fieldName,
                referenceType: 'wikilink',
                rawReference: match[0],
              }
            }
          }

          // 3. Same-model direct field reference
          if (currentModelSlug === tModelLower) {
            if (valLower === tSlugLower || valLower === tNameLower) {
              return {
                referencingModelSlug: currentModelSlug,
                referencingElementIdent: elIdent,
                field: fieldName,
                referenceType: 'field',
                rawReference: valStr,
              }
            }
          }

          return null
        }

        // Inspect description
        if (el.description) {
          const hit = checkContent('description', el.description)
          if (hit) hits.push(hit)
        }

        // Inspect fields
        if (el.fields) {
          for (const [fName, fVal] of Object.entries(el.fields)) {
            if (typeof fVal === 'string') {
              const hit = checkContent(fName, fVal)
              if (hit) hits.push(hit)
            } else if (Array.isArray(fVal)) {
              for (const item of fVal) {
                if (typeof item === 'string') {
                  const hit = checkContent(fName, item)
                  if (hit) {
                    hits.push(hit)
                    break
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return hits
}

/**
 * Evaluates impact for all remove_element operations in the changeset batch.
 * Returns map of change ID to matrix cascade cells and map of change ID to blocking reference conflict message.
 */
export function evaluateBatchDeleteImpact(
  changes: ChangeItem[],
  loadedModels: Map<string, ParsedKnowledge>,
  workspaceModels: Map<string, ParsedKnowledge>,
): {
  matrixCascades: Map<string, CascadedMatrixCell[]>
  referenceConflicts: Map<string, string>
} {
  const matrixCascades = new Map<string, CascadedMatrixCell[]>()
  const referenceConflicts = new Map<string, string>()

  // Intra-batch collision check for update_concept_field and remove_matrix / update_matrix_cell
  const seenConceptFields = new Map<string, string>()
  const seenMatrices = new Map<string, string>()

  for (const change of changes) {
    if (change.op === 'update_concept_field') {
      const atIdx = change.target.indexOf('@')
      const mSlug = extractModelSlug(change.target).toLowerCase()
      const remainder = atIdx !== -1 ? change.target.slice(atIdx + 1) : ''
      const ampIdx = remainder.indexOf('&')
      let conceptIdent = ampIdx !== -1 ? remainder.slice(0, ampIdx).trim() : remainder.trim()
      if (conceptIdent.toLowerCase().startsWith('concept:')) {
        conceptIdent = conceptIdent.slice('concept:'.length).trim()
      }
      const fieldIdent = ampIdx !== -1 ? remainder.slice(ampIdx + 1).trim() : ''
      const key = `${mSlug}@${conceptIdent.toLowerCase()}&${fieldIdent.toLowerCase()}`

      if (seenConceptFields.has(key)) {
        referenceConflicts.set(
          change.id,
          `CONFLICT: Multiple changes in the same batch target concept field "${key}" (conflicts with change "${seenConceptFields.get(key)}")`,
        )
      } else {
        seenConceptFields.set(key, change.id)
      }
    } else if (change.op === 'remove_matrix') {
      const atIdx = change.target.indexOf('@')
      const mSlug = extractModelSlug(change.target).toLowerCase()
      let remainder = atIdx !== -1 ? change.target.slice(atIdx + 1).trim() : ''
      if (remainder.toLowerCase().startsWith('matrix:')) {
        remainder = remainder.slice('matrix:'.length).trim()
      }
      const key = `${mSlug}@${remainder.toLowerCase()}`

      if (seenMatrices.has(key)) {
        referenceConflicts.set(
          change.id,
          `CONFLICT: Multiple changes in the same batch target matrix "${key}" (conflicts with change "${seenMatrices.get(key)}")`,
        )
      } else {
        seenMatrices.set(key, change.id)
      }
    }

    if (change.op !== 'remove_element') continue

    const targetModelSlug = extractModelSlug(change.target)
    const model =
      loadedModels.get(targetModelSlug) ||
      Array.from(loadedModels.values()).find(
        (m) => m.frontmatter.knowledge_slug?.toLowerCase() === targetModelSlug.toLowerCase(),
      )

    let elementIdent = ''
    const atIdx = change.target.indexOf('@')
    if (atIdx !== -1) {
      const rem = change.target.slice(atIdx + 1).trim()
      const ampIdx = rem.indexOf('&')
      elementIdent = ampIdx !== -1 ? rem.slice(0, ampIdx) : rem
    }
    if (change.slug) elementIdent = change.slug
    else if (change.name) elementIdent = change.name

    let targetSlug = elementIdent
    let targetName = elementIdent

    if (model?.elements) {
      for (const [, elements] of model.elements.entries()) {
        const found = elements.find(
          (e) =>
            e.name.toLowerCase() === elementIdent.toLowerCase() ||
            (e.slug && e.slug.toLowerCase() === elementIdent.toLowerCase()) ||
            slugify(e.name).toLowerCase() === elementIdent.toLowerCase(),
        )
        if (found) {
          targetSlug = found.slug || slugify(found.name) || found.name
          targetName = found.name
          break
        }
      }
    }

    if (model) {
      const cascades = computeMatrixCascade(model, targetSlug, targetName)
      matrixCascades.set(change.id, cascades)
    }

    const hits = scanIncomingReferences(
      workspaceModels,
      targetModelSlug,
      targetSlug,
      targetName,
      changes,
    )

    if (hits.length > 0) {
      const details = hits
        .map((h) => `${h.referencingModelSlug}@${h.referencingElementIdent}&${h.field}`)
        .join(', ')
      referenceConflicts.set(change.id, `REFERENCED_BY: ${details}`)
    }
  }

  return {
    matrixCascades,
    referenceConflicts,
  }
}
