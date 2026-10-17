import { slugify } from '../parser/slug.js'
import { slugifyHeading } from '../sourceRef.js'
import { hashParsedElement } from '../console/element-hash.js'
import { checkStaleTarget } from './history.js'
import { extractModelSlug } from './utils.js'
import type { ChangeItem } from './types.js'
import type { ParsedKnowledge } from '../types/index.js'

export interface PartitionResult {
  cleanSubset: ChangeItem[]
  conflictedSubset: ChangeItem[]
  conflictDiagnostics: Map<string, { code: string; message: string }>
}

/**
 * Evaluates preconditions for each change item individually:
 * - from value mismatches
 * - missing target elements
 * - staleness via checkStaleTarget
 * - reference conflicts from impact analysis
 * Partitions items into clean and conflicted subsets.
 */
export async function partitionChangeset(
  changes: ChangeItem[],
  loadedModels: Map<string, ParsedKnowledge>,
  changesDir?: string,
  modelBaseVersions?: Map<string, string>,
  referenceConflicts?: Map<string, string>,
  /**
   * Changes the caller already knows cannot apply (change id -> diagnostic), such as an
   * `add_model` whose target exists and the changes that depend on it.
   */
  blockedChanges?: Map<string, { code: string; message: string }>,
): Promise<PartitionResult> {
  const cleanSubset: ChangeItem[] = []
  const conflictedSubset: ChangeItem[] = []
  const conflictDiagnostics = new Map<string, { code: string; message: string }>()

  for (const change of changes) {
    if (change.op === 'comment') {
      cleanSubset.push(change)
      continue
    }

    // 0. Changes the caller blocked up front (add_model conflicts and their dependants)
    const blocked = blockedChanges?.get(change.id)
    if (blocked) {
      conflictDiagnostics.set(change.id, blocked)
      change.status = 'conflict'
      change.resolution = blocked.message
      conflictedSubset.push(change)
      continue
    }

    // add_model creates a model: no existing target, no precondition to evaluate
    if (change.op === 'add_model') {
      cleanSubset.push(change)
      continue
    }

    // 1. Reference conflicts from impact analysis
    if (referenceConflicts?.has(change.id)) {
      const msg = referenceConflicts.get(change.id)!
      conflictDiagnostics.set(change.id, { code: 'REFERENCED_BY', message: msg })
      change.status = 'conflict'
      change.resolution = msg
      conflictedSubset.push(change)
      continue
    }

    // 2. Already flagged as EMPTY_SLUG in batch slug resolution
    if (change.status === 'conflict' && change.resolution?.includes('EMPTY_SLUG')) {
      conflictDiagnostics.set(change.id, { code: 'EMPTY_SLUG', message: change.resolution })
      conflictedSubset.push(change)
      continue
    }

    const targetModelSlug = extractModelSlug(change.target)
    if (!targetModelSlug) {
      // Modeless target: skipped without mutating
      cleanSubset.push(change)
      continue
    }

    const model =
      loadedModels.get(targetModelSlug) ||
      Array.from(loadedModels.values()).find(
        (m) => m.frontmatter.knowledge_slug?.toLowerCase() === targetModelSlug.toLowerCase(),
      )

    if (!model) {
      const msg = `PRECONDITION_FAILED: Model "${targetModelSlug}" not found in workspace`
      conflictDiagnostics.set(change.id, { code: 'PRECONDITION_FAILED', message: msg })
      change.status = 'conflict'
      change.resolution = msg
      conflictedSubset.push(change)
      continue
    }

    // Extract target remainder
    const atIdx = change.target.indexOf('@')
    const remainder = atIdx !== -1 ? change.target.slice(atIdx + 1) : ''
    const ampIdx = remainder.indexOf('&')
    const rawElementIdent = ampIdx !== -1 ? remainder.slice(0, ampIdx) : remainder
    const elementIdent = (rawElementIdent || change.slug || change.name || '').trim()

    // 3. Staleness check
    if (changesDir && (change.op === 'update_field' || change.op === 'remove_element' || change.op === 'rename_element')) {
      const baseVer =
        modelBaseVersions?.get(targetModelSlug) ||
        model.frontmatter.knowledge_version ||
        ''
      if (baseVer && elementIdent) {
        const staleRes = await checkStaleTarget(changesDir, targetModelSlug, elementIdent, baseVer)
        if (staleRes.stale) {
          const msg = staleRes.message || `STALE_TARGET_DELETED: Target element was deleted after base_version ${baseVer}`
          conflictDiagnostics.set(change.id, { code: 'STALE_TARGET_DELETED', message: msg })
          change.status = 'conflict'
          change.resolution = msg
          conflictedSubset.push(change)
          continue
        }
      }
    }

    // 4. Element existence check
    if (change.op === 'update_field' || change.op === 'remove_element' || change.op === 'rename_element') {
      let foundElement: { name: string; slug?: string; fields: Record<string, unknown>; description?: string } | null = null
      // Set only for an element that exists in the model (not one an earlier add creates).
      let foundConcept = ''
      let foundIsLive = false
      if (model.elements) {
        for (const [conceptName, elements] of model.elements.entries()) {
          const el = elements.find(
            (e) =>
              e.name.toLowerCase() === elementIdent.toLowerCase() ||
              (e.slug && e.slug.toLowerCase() === elementIdent.toLowerCase()) ||
              slugify(e.name).toLowerCase() === elementIdent.toLowerCase(),
          )
          if (el) {
            foundElement = el
            foundConcept = conceptName
            foundIsLive = true
            break
          }
        }
      }

      if (!foundElement) {
        // Also check if an earlier add_element in this batch adds this element
        const earlierAdd = changes.slice(0, changes.indexOf(change)).find(
          (c) =>
            c.op === 'add_element' &&
            extractModelSlug(c.target).toLowerCase() === targetModelSlug.toLowerCase() &&
            ((c.resolved_slug && c.resolved_slug.toLowerCase() === elementIdent.toLowerCase()) ||
              (c.slug && c.slug.toLowerCase() === elementIdent.toLowerCase()) ||
              (c.name && slugify(c.name).toLowerCase() === elementIdent.toLowerCase())),
        )
        if (earlierAdd) {
          foundElement = {
            name: earlierAdd.name || earlierAdd.slug || '',
            slug: earlierAdd.resolved_slug || earlierAdd.slug,
            fields: earlierAdd.fields || {},
          }
        }
      }

      if (!foundElement) {
        const msg = `PRECONDITION_FAILED: Target element "${elementIdent}" not found in model "${targetModelSlug}"`
        conflictDiagnostics.set(change.id, { code: 'PRECONDITION_FAILED', message: msg })
        change.status = 'conflict'
        change.resolution = msg
        conflictedSubset.push(change)
        continue
      }

      // 4b. base_hash precondition: the element changed since the change was written.
      if (change.base_hash && foundIsLive) {
        const currentHash = hashParsedElement(foundConcept, foundElement as Parameters<typeof hashParsedElement>[1])
        if (currentHash !== change.base_hash.trim().toLowerCase()) {
          const msg = `PRECONDITION_FAILED: Target element "${elementIdent}" changed since the change was written (base_hash ${change.base_hash} does not match current ${currentHash})`
          conflictDiagnostics.set(change.id, { code: 'STALE_BASE_HASH', message: msg })
          change.status = 'conflict'
          change.resolution = msg
          conflictedSubset.push(change)
          continue
        }
      }

      // 5. from precondition check for update_field
      if (change.op === 'update_field' && change.from !== undefined) {
        const fieldName = ampIdx !== -1 ? remainder.slice(ampIdx + 1).trim() : ''
        const currentVal =
          foundElement.fields?.[fieldName] !== undefined
            ? String(foundElement.fields[fieldName])
            : fieldName === 'description'
              ? foundElement.description
              : undefined

        if (currentVal !== change.from) {
          const hint =
            fieldName.toLowerCase() === 'name'
              ? ' Hint: name is the element identity, not a field — to rename an element use rename_element on the bare unit target, not update_field on &name.'
              : ''
          const msg = `PRECONDITION_FAILED: Precondition failed: current value "${currentVal ?? ''}" does not match from "${change.from}".${hint}`
          conflictDiagnostics.set(change.id, { code: 'PRECONDITION_FAILED', message: msg })
          change.status = 'conflict'
          change.resolution = msg
          conflictedSubset.push(change)
          continue
        }
      }
    }

    // 6. from precondition check for update_matrix_cell
    if (change.op === 'update_matrix_cell' && change.from !== undefined) {
      const parts = remainder.split('&')
      if (parts.length >= 3 && model.matrices) {
        const mName = parts[0].trim()
        const row = parts[1].trim()
        const col = parts[2].trim()
        const mat = model.matrices.find(
          (m) =>
            m.name.toLowerCase() === mName.toLowerCase() ||
            slugify(m.name) === mName.toLowerCase() ||
            slugifyHeading(m.name) === mName.toLowerCase(),
        )
        const matchesCoord = (actual: string, requested: string): boolean => {
          const a = actual.toLowerCase()
          const r = requested.toLowerCase()
          return (
            a === r ||
            slugify(a) === slugify(r) ||
            slugifyHeading(a) === slugifyHeading(r)
          )
        }
        const cell = mat?.cells?.find(
          (c) => matchesCoord(c.row, row) && matchesCoord(c.col, col),
        )
        const currentVal = cell?.value !== undefined ? String(cell.value) : undefined
        if (currentVal !== change.from) {
          const msg = `PRECONDITION_FAILED: Precondition failed: current value "${currentVal ?? ''}" does not match from "${change.from}"`
          conflictDiagnostics.set(change.id, { code: 'PRECONDITION_FAILED', message: msg })
          change.status = 'conflict'
          change.resolution = msg
          conflictedSubset.push(change)
          continue
        }
      }
    }

    cleanSubset.push(change)
  }

  return {
    cleanSubset,
    conflictedSubset,
    conflictDiagnostics,
  }
}
