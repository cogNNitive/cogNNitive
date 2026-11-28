import { slugify } from '../parser/slug.js'
import { slugifyHeading } from '../sourceRef.js'
import { matchesElement } from '../mutate.js'
import { parsePropertyValue } from '../parser/sections.js'
import { hashParsedElement } from '../console/element-hash.js'
import { checkStaleTarget, loadStalenessHistory, type StalenessHistory } from './history.js'
import { extractModelSlug } from './utils.js'
import { transitionDiagnostic, transitionValue } from './transitions.js'
import { declaredTransitionsFor } from '../schema/transitions.js'
import type { DeclaredTransitions } from '../schema/transitions.js'
import type { ChangeItem } from './types.js'
import type { ParsedKnowledge } from '../types/index.js'

export interface PartitionResult {
  cleanSubset: ChangeItem[]
  conflictedSubset: ChangeItem[]
  conflictDiagnostics: Map<string, { code: string; message: string }>
}

/** The initial fields of an `add_element`, read from its `to` JSON object. */
function addElementInitialFields(to: string): Record<string, string> | undefined {
  const trimmed = to.trim()
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return undefined
  try {
    const parsed = JSON.parse(trimmed)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined
    const out: Record<string, string> = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      out[key] = String(value)
    }
    return out
  } catch {
    return undefined
  }
}

/**
 * The value the field was last written to by an earlier change of the same changeset, or
 * `undefined` when no earlier change touched it. A `select` lifecycle is validated in
 * changeset order: two changes on the same field chain, and the second starts where the
 * first left it.
 */
function lastWriteToField(
  changes: ChangeItem[],
  before: number,
  modelSlug: string,
  elementIdent: string,
  fieldName: string,
): string | undefined {
  let value: string | undefined
  for (let i = 0; i < before; i++) {
    const prior = changes[i]!
    if (prior.op !== 'update_field' || prior.to === undefined) continue
    if (extractModelSlug(prior.target).toLowerCase() !== modelSlug.toLowerCase()) continue
    const at = prior.target.indexOf('@')
    const rest = at !== -1 ? prior.target.slice(at + 1) : ''
    const amp = rest.lastIndexOf('&')
    if (amp === -1) continue
    const ident = rest.slice(0, amp).trim()
    const field = rest.slice(amp + 1).trim()
    const matchesIdent =
      ident.toLowerCase() === elementIdent.toLowerCase() ||
      slugify(ident).toLowerCase() === slugify(elementIdent).toLowerCase()
    if (matchesIdent && field.toLowerCase() === fieldName.toLowerCase()) value = prior.to
  }
  return value
}

/**
 * An atomic changeset (frontmatter `atomic: true`, design D8) is all or nothing: one
 * conflicted change conflicts every change of the changeset and nothing is written.
 * Returns every change as conflicted, each carrying the diagnostic of the first
 * conflict so the caller can report one reason per change. A non-atomic partition is
 * returned unchanged.
 *
 * Pure: this decides the partition, it does not touch the disk.
 */
export function applyAtomicity(
  partition: PartitionResult,
  atomic: boolean | undefined,
): PartitionResult {
  if (atomic !== true) return partition
  const { conflictedSubset, conflictDiagnostics } = partition
  if (conflictedSubset.length === 0) return partition

  const first = conflictDiagnostics.get(conflictedSubset[0]!.id)
  const conflictsAll = {
    code: 'ATOMIC_CHANGESET_CONFLICT',
    message:
      'ATOMIC_CHANGESET_CONFLICT: the changeset is atomic and at least one change conflicted' +
      (first ? ` (${first.code}: ${first.message})` : '') +
      '; no change of the changeset was written',
  }
  const everyChange = [...partition.cleanSubset, ...conflictedSubset]
  for (const change of everyChange) {
    change.status = 'conflict'
    change.resolution = conflictsAll.message
  }
  const diagnostics = new Map<string, { code: string; message: string }>()
  for (const change of everyChange) {
    diagnostics.set(change.id, conflictsAll)
  }
  return {
    cleanSubset: [],
    conflictedSubset: everyChange,
    conflictDiagnostics: diagnostics,
  }
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
  /**
   * Declared transitions per concept and field (lowercase keys). A `select` field listed
   * here accepts an `update_field`/`add_element` write only along a declared edge.
   */
  declaredTransitions?: DeclaredTransitions,
): Promise<PartitionResult> {
  const cleanSubset: ChangeItem[] = []
  const conflictedSubset: ChangeItem[] = []
  const conflictDiagnostics = new Map<string, { code: string; message: string }>()
  // One read of the applied log per apply, shared by every change of the batch.
  let history: StalenessHistory | undefined
  const stalenessHistory = async (dir: string): Promise<StalenessHistory> =>
    (history ??= await loadStalenessHistory(dir))

  for (const change of changes) {
    if (change.op === 'comment') {
      cleanSubset.push(change)
      continue
    }

    // produce_artifact addresses a workspace path, not a model: no model precondition
    if (change.op === 'produce_artifact') {
      const blockedArtifact = blockedChanges?.get(change.id)
      if (blockedArtifact) {
        conflictDiagnostics.set(change.id, blockedArtifact)
        change.status = 'conflict'
        change.resolution = blockedArtifact.message
        conflictedSubset.push(change)
      } else {
        cleanSubset.push(change)
      }
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

    // 0b. add_element writes its initial fields in `to` (a JSON object). A field with
    // declared transitions is entered from `""`, so an add must be a declared first edge.
    if (change.op === 'add_element' && change.to !== undefined && declaredTransitions) {
      const initial = addElementInitialFields(change.to)
      const concept = change.concept
      let refused: string | undefined
      if (initial && concept) {
        for (const [fieldName, value] of Object.entries(initial)) {
          const transitions = declaredTransitionsFor(declaredTransitions, concept, fieldName)
          if (!transitions) continue
          const diag = transitionDiagnostic(fieldName, transitions, '', value)
          if (diag) {
            refused = diag
            break
          }
        }
      }
      if (refused) {
        conflictDiagnostics.set(change.id, { code: 'TRANSITION_NOT_ALLOWED', message: refused })
        change.status = 'conflict'
        change.resolution = refused
        conflictedSubset.push(change)
        continue
      }
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
    // The field is the LAST segment: an element name may itself contain `&`.
    const fieldOp = change.op === 'update_field' || change.op === 'update_concept_field'
    const ampIdx = fieldOp ? remainder.lastIndexOf('&') : remainder.indexOf('&')
    const rawElementIdent = ampIdx !== -1 ? remainder.slice(0, ampIdx) : remainder
    const elementIdent = (rawElementIdent || change.slug || change.name || '').trim()

    // 3. Staleness check
    if (
      changesDir &&
      (change.op === 'update_field' ||
        change.op === 'update_element_text' ||
        change.op === 'remove_element' ||
        change.op === 'rename_element')
    ) {
      const baseVer =
        modelBaseVersions?.get(targetModelSlug) || model.frontmatter.knowledge_version || ''
      if (baseVer && elementIdent) {
        const staleRes = checkStaleTarget(
          await stalenessHistory(changesDir),
          targetModelSlug,
          elementIdent,
          baseVer,
        )
        if (staleRes.stale) {
          const code = staleRes.code ?? 'STALE_TARGET_DELETED'
          const msg =
            staleRes.message ||
            `STALE_TARGET_DELETED: Target element was deleted after base_version ${baseVer}`
          conflictDiagnostics.set(change.id, { code, message: msg })
          change.status = 'conflict'
          change.resolution = msg
          conflictedSubset.push(change)
          continue
        }
      }
    }

    // 4. Element existence check
    if (
      change.op === 'update_field' ||
      change.op === 'update_element_text' ||
      change.op === 'remove_element' ||
      change.op === 'rename_element'
    ) {
      let foundElement: {
        name: string
        slug?: string
        fields: Record<string, unknown>
        description?: string
      } | null = null
      // Set only for an element that exists in the model (not one an earlier add creates).
      let foundConcept = ''
      let foundIsLive = false
      if (model.elements) {
        const candidates: Array<{
          concept: string
          element: {
            name: string
            slug?: string
            fields: Record<string, unknown>
            description?: string
          }
        }> = []

        // If change.concept is specified, check that concept first
        if (change.concept && model.elements.has(change.concept)) {
          const list = model.elements.get(change.concept)!
          for (const el of list) {
            if (matchesElement(el, elementIdent)) {
              candidates.push({ concept: change.concept, element: el })
            }
          }
        }

        // If no candidate found in specified concept or no concept specified, scan all concepts
        if (candidates.length === 0) {
          for (const [conceptName, elements] of model.elements.entries()) {
            if (change.concept && conceptName === change.concept) continue
            for (const el of elements) {
              if (matchesElement(el, elementIdent)) {
                candidates.push({ concept: conceptName, element: el })
              }
            }
          }
        }

        if (candidates.length === 1) {
          foundElement = candidates[0].element
          foundConcept = candidates[0].concept
          foundIsLive = true
        } else if (candidates.length > 1) {
          // Disambiguate duplicate names across concepts using base_hash if present (#189)
          if (change.base_hash) {
            const normalizedBaseHash = change.base_hash.trim().toLowerCase()
            const matchByHash = candidates.find(
              (c) => hashParsedElement(c.concept, c.element as any) === normalizedBaseHash,
            )
            if (matchByHash) {
              foundElement = matchByHash.element
              foundConcept = matchByHash.concept
              foundIsLive = true
            }
          }
          if (!foundElement) {
            foundElement = candidates[0].element
            foundConcept = candidates[0].concept
            foundIsLive = true
          }
        }
      }

      if (!foundElement) {
        // Also check if an earlier add_element in this batch adds this element
        const earlierAdd = changes
          .slice(0, changes.indexOf(change))
          .find(
            (c) =>
              c.op === 'add_element' &&
              extractModelSlug(c.target).toLowerCase() === targetModelSlug.toLowerCase() &&
              (!change.concept ||
                !c.concept ||
                c.concept.toLowerCase() === change.concept.toLowerCase()) &&
              ((c.resolved_slug && c.resolved_slug.toLowerCase() === elementIdent.toLowerCase()) ||
                (c.slug && c.slug.toLowerCase() === elementIdent.toLowerCase()) ||
                (c.name && slugify(c.name).toLowerCase() === elementIdent.toLowerCase())),
          )
        if (earlierAdd) {
          foundElement = {
            name: earlierAdd.name || earlierAdd.slug || '',
            slug: earlierAdd.resolved_slug || earlierAdd.slug,
            fields: earlierAdd.fields || {},
            // A new element is created with an empty prose body.
            description: '',
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
        const currentHash = hashParsedElement(
          foundConcept,
          foundElement as Parameters<typeof hashParsedElement>[1],
        )
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

      // 5a. Declared transitions (iNNfo V_0-9-0, design D6): a `select` field whose
      // Field Definition declares `transitions` moves only along a declared edge. The
      // current value is the live one at this change, so an earlier change of the same
      // changeset already counted. Writing the value the field holds is always allowed.
      if (change.op === 'update_field' && change.to !== undefined) {
        const fieldName = ampIdx !== -1 ? remainder.slice(ampIdx + 1).trim() : ''
        const transitions = declaredTransitionsFor(
          declaredTransitions,
          foundConcept || change.concept,
          fieldName,
        )
        if (transitions) {
          // In changeset order an earlier change of this same file already moved the
          // field, so the current value is that change's `to`, not the live one.
          const priorTo = lastWriteToField(
            changes,
            changes.indexOf(change),
            targetModelSlug,
            elementIdent,
            fieldName,
          )
          const currentVal =
            priorTo !== undefined ? priorTo : transitionValue(foundElement.fields?.[fieldName])
          const diag = transitionDiagnostic(fieldName, transitions, currentVal, change.to)
          if (diag) {
            conflictDiagnostics.set(change.id, { code: 'TRANSITION_NOT_ALLOWED', message: diag })
            change.status = 'conflict'
            change.resolution = diag
            conflictedSubset.push(change)
            continue
          }
        }
      }

      if (change.op === 'update_element_text' && change.from !== undefined) {
        const currentProse = foundElement.description ?? ''
        if (currentProse !== change.from) {
          const msg = `PRECONDITION_FAILED: Precondition failed: current prose "${currentProse}" does not match from "${change.from}"`
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
          return a === r || slugify(a) === slugify(r) || slugifyHeading(a) === slugifyHeading(r)
        }
        const cell = mat?.cells?.find((c) => matchesCoord(c.row, row) && matchesCoord(c.col, col))
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

    // 7. update_concept_field precondition check
    if (change.op === 'update_concept_field') {
      let conceptIdent = remainder
      let fieldIdent = ''
      if (ampIdx !== -1) {
        conceptIdent = remainder.slice(0, ampIdx).trim()
        fieldIdent = remainder.slice(ampIdx + 1).trim()
      }
      if (conceptIdent.toLowerCase().startsWith('concept:')) {
        conceptIdent = conceptIdent.slice('concept:'.length).trim()
      }

      // Find concept in model
      const cFields =
        model.conceptFields?.[conceptIdent] ||
        (Object.keys(model.conceptFields || {}).find(
          (k) => k.toLowerCase() === conceptIdent.toLowerCase(),
        )
          ? model.conceptFields?.[
              Object.keys(model.conceptFields || {}).find(
                (k) => k.toLowerCase() === conceptIdent.toLowerCase(),
              )!
            ]
          : undefined)

      const currentRawVal = cFields?.[fieldIdent]

      const formatCanonical = (val: unknown): string => {
        if (val === undefined || val === null) return ''
        if (Array.isArray(val)) return `[${val.join(', ')}]`
        return String(val)
      }

      const currentCanonical = formatCanonical(currentRawVal)
      const expectedFrom = formatCanonical(
        change.from !== undefined
          ? change.from.trim().startsWith('[')
            ? parsePropertyValue(change.from)
            : change.from
          : undefined,
      )

      if (
        change.from !== undefined &&
        currentCanonical !== expectedFrom &&
        currentCanonical !== change.from.trim()
      ) {
        const msg = `PRECONDITION_FAILED: Precondition failed: current value "${currentCanonical}" does not match from "${change.from}"`
        conflictDiagnostics.set(change.id, { code: 'PRECONDITION_FAILED', message: msg })
        change.status = 'conflict'
        change.resolution = msg
        conflictedSubset.push(change)
        continue
      }
    }

    // 8. remove_matrix existence check
    if (change.op === 'remove_matrix') {
      let matrixIdent = remainder.trim()
      if (matrixIdent.toLowerCase().startsWith('matrix:')) {
        matrixIdent = matrixIdent.slice('matrix:'.length).trim()
      }
      const mIdentLower = matrixIdent.toLowerCase()

      const exists =
        (model.matrices &&
          model.matrices.some(
            (m) =>
              m.name.toLowerCase() === mIdentLower ||
              slugify(m.name).toLowerCase() === mIdentLower ||
              slugifyHeading(m.name).toLowerCase() === mIdentLower,
          )) ||
        (model.sectionOrder &&
          model.sectionOrder.some(
            (s) =>
              s.toLowerCase() === `matrices: ${mIdentLower}` || s.toLowerCase() === mIdentLower,
          ))

      if (!exists) {
        const msg = `PRECONDITION_FAILED: Matrix "${matrixIdent}" not found in model "${targetModelSlug}"`
        conflictDiagnostics.set(change.id, { code: 'PRECONDITION_FAILED', message: msg })
        change.status = 'conflict'
        change.resolution = msg
        conflictedSubset.push(change)
        continue
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
