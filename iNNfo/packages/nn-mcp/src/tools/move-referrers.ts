/**
 * Referrer scan of `move_model` (design A10). A move changes a model id, so every
 * typed reference that addresses the old id (or one of its descendants) must be
 * retargeted by an `update_field` change in the SAME changeset. Recorded targets
 * are never rewritten: the fold carries them through the rekey instead.
 *
 * The scan reads the workspace, so both `apply_change` and `propose_changeset`
 * use this one implementation and report the same set of dangling references.
 */
import { readFile } from 'node:fs/promises'
import { dirname, sep } from 'node:path'
import { discoverDomainModels, parseKnowledge } from '@cognnitive/nn-core'
import { buildNodeDomainIndex } from './domain-index.js'

/** The move under check: the old id, the new id and the folder that moves with it. */
export interface MoveReferenceCheck {
  fromId: string
  toId: string
  /** Absolute path of the moved model file. */
  fromPath: string
}

/** One reference that would be left pointing at the old id. */
export interface DanglingReference {
  /** Canonical unit address (`<model-id>@<slug>&<field>`) the update_field must target. */
  unit: string
  /** The value as it is on disk today. */
  value: string
  /** The same value with the old id replaced by the new one (a ready-to-merge `to`). */
  suggested: string
}

/** The model part of one address token (before `@`). */
function modelPartOf(token: string): string {
  const at = token.indexOf('@')
  return (at === -1 ? token : token.slice(0, at)).trim()
}

/** True when `token` addresses `id` itself or one of its descendants. */
export function addressesModel(token: string, id: string): boolean {
  const model = modelPartOf(token.replace(/^\[+|\]+$/g, '').trim())
  return model === id || model.startsWith(`${id}/`)
}

/** The tokens of a field value: a `[a, b]` list or a single value. */
function tokensOf(value: string): string[] {
  const trimmed = value.trim()
  const inner = trimmed.startsWith('[') && trimmed.endsWith(']') ? trimmed.slice(1, -1) : trimmed
  return inner
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
}

/**
 * Rewrites every address token that addresses `fromId` (or a descendant) to the
 * new id, preserving the element part and the list form. Never guesses: a token
 * that addresses another model is returned unchanged.
 */
export function retargetValue(value: string, fromId: string, toId: string): string {
  const rewrite = (token: string): string => {
    const at = token.indexOf('@')
    const model = modelPartOf(token)
    let next: string
    if (model === fromId) next = toId
    else if (model.startsWith(`${fromId}/`)) next = `${toId}${model.slice(fromId.length)}`
    else return token
    return at === -1 ? next : `${next}${token.slice(at)}`
  }
  const trimmed = value.trim()
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return `[${tokensOf(value).map(rewrite).join(', ')}]`
  }
  return rewrite(trimmed)
}

/**
 * Every typed reference in the workspace (outside the moved folder) that addresses
 * the old id and is not retargeted by `retargets` (unit -> new value).
 */
export async function findDanglingReferrers(
  rootDir: string,
  check: MoveReferenceCheck,
  retargets: ReadonlyMap<string, string>,
): Promise<DanglingReference[]> {
  const discovered = await discoverDomainModels(rootDir)
  const { index } = await buildNodeDomainIndex(rootDir)
  const movedDir = dirname(check.fromPath)
  const out: DanglingReference[] = []
  for (const model of discovered) {
    if (model.path === check.fromPath || model.path.startsWith(`${movedDir}${sep}`)) continue
    const id = index.byPath(model.input.path)?.id
    if (!id) continue
    let parsed
    try {
      parsed = parseKnowledge(await readFile(model.path, 'utf-8'))
    } catch {
      continue
    }
    for (const [, elements] of parsed.elements) {
      for (const element of elements) {
        if (!element.slug) continue
        for (const [field, raw] of Object.entries(element.fields ?? {})) {
          const value = Array.isArray(raw)
            ? `[${raw.map(String).join(', ')}]`
            : String(raw ?? '')
          if (!tokensOf(value).some((token) => addressesModel(token, check.fromId))) continue
          const unit = `${id}@${element.slug}&${field}`
          const retarget = retargets.get(unit)
          if (retarget !== undefined && !tokensOf(retarget).some((token) => addressesModel(token, check.fromId))) {
            continue
          }
          out.push({ unit, value, suggested: retargetValue(value, check.fromId, check.toId) })
        }
      }
    }
  }
  return out
}
