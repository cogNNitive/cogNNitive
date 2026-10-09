import { slugify } from '../parser/slug.js'
import type { ChangeItem } from './types.js'
import type { ParsedKnowledge } from '../types/index.js'

export interface SlugResolutionResult {
  changes: ChangeItem[]
  assignedSlugs: Map<string, string> // proposed -> resolved
  conflictedChanges: Map<string, string> // change.id -> reason
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractModelSlug(target: string): string {
  const atIdx = target.indexOf('@')
  if (atIdx !== -1) {
    return target.slice(0, atIdx).trim()
  }
  return target.trim()
}

function getClaimedSlugsForModel(
  modelSlug: string,
  loadedModels: Map<string, ParsedKnowledge>,
): Set<string> {
  const claimed = new Set<string>()
  const model =
    loadedModels.get(modelSlug) ||
    Array.from(loadedModels.values()).find(
      (m) => m.frontmatter.knowledge_slug?.toLowerCase() === modelSlug.toLowerCase(),
    )

  if (model?.elements) {
    for (const [, elements] of model.elements.entries()) {
      for (const el of elements) {
        if (el.slug) {
          claimed.add(el.slug.toLowerCase())
        } else if (el.name) {
          claimed.add(slugify(el.name).toLowerCase())
        }
      }
    }
  }
  return claimed
}

function rewriteReferencesInString(
  text: string,
  candidate: string,
  resolved: string,
  modelSlug: string,
): string {
  if (!text) return text

  // 1. Wikilinks: [[candidate]] or [[candidate|alias]]
  const escapedCand = escapeRegex(candidate)
  const wikilinkRe = new RegExp(`\\[\\[${escapedCand}(\\|[^\\]]+)?\\]\\]`, 'g')
  let rewritten = text.replace(wikilinkRe, (_match, alias) => `[[${resolved}${alias || ''}]]`)

  // 2. Cross-model addresses: model@candidate
  if (modelSlug) {
    const crossModelRe = new RegExp(`\\b${escapeRegex(modelSlug)}@${escapedCand}\\b`, 'g')
    rewritten = rewritten.replace(crossModelRe, `${modelSlug}@${resolved}`)
  }

  // 3. Exact standalone reference match
  if (rewritten === candidate) {
    return resolved
  }

  return rewritten
}

/**
 * Resolves proposed slugs for add_element operations in strict document order.
 * - Detects collisions against live model slugs and earlier additions in this batch.
 * - Auto-suffixes colliding slugs with -1, -2, ..., -N.
 * - Flags non-Latin names producing empty slug without explicit slug:: as EMPTY_SLUG conflict.
 * - Rewrites subsequent change targets and [[wikilink]] / reference values within the batch.
 */
export function resolveBatchSlugs(
  changes: ChangeItem[],
  loadedModels: Map<string, ParsedKnowledge>,
): SlugResolutionResult {
  // Shallow copy changes so we don't unexpectedly mutate caller's raw array
  const updatedChanges: ChangeItem[] = changes.map((c) => ({ ...c }))
  const assignedSlugs = new Map<string, string>()
  const conflictedChanges = new Map<string, string>()

  const claimedByModel = new Map<string, Set<string>>()

  const getModelSet = (modelSlug: string): Set<string> => {
    let set = claimedByModel.get(modelSlug.toLowerCase())
    if (!set) {
      set = getClaimedSlugsForModel(modelSlug, loadedModels)
      claimedByModel.set(modelSlug.toLowerCase(), set)
    }
    return set
  }

  for (let i = 0; i < updatedChanges.length; i++) {
    const change = updatedChanges[i]
    if (change.op !== 'add_element') {
      continue
    }

    const modelSlug = extractModelSlug(change.target)
    const modelClaimed = getModelSet(modelSlug)

    const explicitSlug = typeof change.slug === 'string' && change.slug.trim() ? change.slug.trim() : undefined
    const rawCandidate = explicitSlug ?? (change.name ? slugify(change.name) : '')

    if (!rawCandidate || !rawCandidate.trim()) {
      const reason = 'EMPTY_SLUG: Element name produces an empty slug; explicit slug:: required'
      conflictedChanges.set(change.id, reason)
      change.status = 'conflict'
      change.resolution = reason
      continue
    }

    const candidate = rawCandidate.trim().toLowerCase()
    let resolved = candidate
    if (modelClaimed.has(resolved)) {
      let counter = 1
      while (modelClaimed.has(`${candidate}-${counter}`)) {
        counter++
      }
      resolved = `${candidate}-${counter}`
    }

    modelClaimed.add(resolved)
    change.resolved_slug = resolved
    assignedSlugs.set(candidate, resolved)

    // Intra-batch target and value rewriting for subsequent changes
    if (resolved !== candidate) {
      for (let j = i + 1; j < updatedChanges.length; j++) {
        const next = updatedChanges[j]
        const nextModelSlug = extractModelSlug(next.target)

        // Only rewrite target if it matches the same model
        if (nextModelSlug.toLowerCase() === modelSlug.toLowerCase()) {
          const targetPrefixWithAmp = `${modelSlug}@${candidate}&`
          const targetExact = `${modelSlug}@${candidate}`

          if (next.target.startsWith(targetPrefixWithAmp)) {
            next.target = `${modelSlug}@${resolved}&` + next.target.slice(targetPrefixWithAmp.length)
          } else if (next.target === targetExact) {
            next.target = `${modelSlug}@${resolved}`
          } else if (next.target.startsWith(`${candidate}&`)) {
            next.target = `${resolved}&` + next.target.slice(`${candidate}&`.length)
          } else if (next.target === candidate) {
            next.target = resolved
          }
        }

        // Rewrite values in `to`
        if (typeof next.to === 'string') {
          next.to = rewriteReferencesInString(next.to, candidate, resolved, modelSlug)
        }

        // Rewrite values in `fields`
        if (next.fields && typeof next.fields === 'object') {
          const updatedFields: Record<string, string> = {}
          for (const [k, v] of Object.entries(next.fields)) {
            if (typeof v === 'string') {
              updatedFields[k] = rewriteReferencesInString(v, candidate, resolved, modelSlug)
            } else {
              updatedFields[k] = v
            }
          }
          next.fields = updatedFields
        }
      }
    }
  }

  return {
    changes: updatedChanges,
    assignedSlugs,
    conflictedChanges,
  }
}
