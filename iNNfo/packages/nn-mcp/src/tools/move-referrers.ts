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
  const addressing = await scanAddressingReferences(rootDir, check.fromId, {
    files: [check.fromPath],
    folders: [dirname(check.fromPath)],
  })
  const out: DanglingReference[] = []
  for (const hit of addressing) {
    if (clearedBy(hit, check.fromId, retargets)) continue
    out.push({ unit: hit.unit, value: hit.value, suggested: retargetValue(hit.value, check.fromId, check.toId) })
  }
  return out
}

/**
 * Every typed reference that would be left addressing a model a `remove_model` is
 * about to remove. A reference is cleared when the same changeset retargets its
 * unit away from the id; a suggestion cannot be computed (only the caller knows
 * whether the reference should point elsewhere or become empty), so `suggested` is
 * the cleared value `''`.
 */
export async function findDanglingReferrersForRemoval(
  rootDir: string,
  removal: { id: string; path: string },
  retargets: ReadonlyMap<string, string>,
): Promise<DanglingReference[]> {
  // Only the removed file is excluded: a sibling model in the same folder is a
  // genuine incoming referrer.
  const addressing = await scanAddressingReferences(rootDir, removal.id, { files: [removal.path], folders: [] })
  const out: DanglingReference[] = []
  for (const hit of addressing) {
    if (clearedBy(hit, removal.id, retargets)) continue
    out.push({ unit: hit.unit, value: hit.value, suggested: '' })
  }
  return out
}

/** One typed field whose value addresses the id being moved or removed. */
interface AddressingReference {
  unit: string
  value: string
}

/**
 * The typed fields of every other workspace model whose value addresses `id` (or one
 * of its descendants). `exclude.files` and `exclude.folders` name what belongs to the
 * model under change, so its own fields never count as incoming references.
 */
async function scanAddressingReferences(
  rootDir: string,
  id: string,
  exclude: { files: readonly string[]; folders: readonly string[] },
): Promise<AddressingReference[]> {
  const discovered = await discoverDomainModels(rootDir)
  const { index } = await buildNodeDomainIndex(rootDir)
  const out: AddressingReference[] = []
  for (const model of discovered) {
    if (exclude.files.includes(model.path)) continue
    if (exclude.folders.some((folder) => model.path.startsWith(`${folder}${sep}`))) continue
    const modelId = index.byPath(model.input.path)?.id
    if (!modelId) continue
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
          if (!tokensOf(value).some((token) => addressesModel(token, id))) continue
          out.push({ unit: `${modelId}@${element.slug}&${field}`, value })
        }
      }
    }
  }
  return out
}

/** True when `retargets` already clears this reference away from `id`. */
function clearedBy(
  hit: AddressingReference,
  id: string,
  retargets: ReadonlyMap<string, string>,
): boolean {
  const retarget = retargets.get(hit.unit)
  return retarget !== undefined && !tokensOf(retarget).some((token) => addressesModel(token, id))
}
