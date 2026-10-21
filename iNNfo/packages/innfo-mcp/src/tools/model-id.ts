import { canonicalModelId, type ChangeItem } from '@cognnitive/nn-core'

/**
 * A new model is always created under its canonical id (`<name>_<blueprint>`, no
 * version token; see `canonicalModelId`). Inside one changeset the caller may keep
 * addressing it by the id it passed to `add_model` OR by the canonical id: both
 * resolve to the canonical one. Aliases are scoped to the changeset; they never
 * reach models that already exist on disk.
 */
export type ModelIdAliases = Map<string, string>

/** Lower-cased alias -> canonical id, for every `add_model` change that names a bluepriNNt. */
export function modelIdAliases(changes: ReadonlyArray<Pick<ChangeItem, 'op' | 'target' | 'blueprint_name'>>): ModelIdAliases {
  const aliases: ModelIdAliases = new Map()
  const created: Array<{ original: string; canonical: string }> = []
  for (const change of changes) {
    if (change.op !== 'add_model' || !change.target || !change.blueprint_name) continue
    const original = change.target.trim()
    created.push({ original, canonical: canonicalModelId(original, change.blueprint_name) })
  }
  // Canonical ids win over another model's original id, so an alias can never hijack a sibling.
  for (const { canonical } of created) aliases.set(canonical.toLowerCase(), canonical)
  for (const { original, canonical } of created) {
    if (!aliases.has(original.toLowerCase())) aliases.set(original.toLowerCase(), canonical)
  }
  return aliases
}

/** The model-id portion of a change target (`model` or `model@element&field`). */
export function modelIdOfTarget(target: string): string {
  const at = target.indexOf('@')
  return (at === -1 ? target : target.slice(0, at)).trim()
}

/** Rewrite the model-id portion of `target` to its canonical id when it is an alias. */
export function canonicalizeTarget(target: string, aliases: ModelIdAliases): string {
  const modelId = modelIdOfTarget(target)
  const canonical = aliases.get(modelId.toLowerCase())
  if (!canonical || canonical === modelId) return target
  const at = target.indexOf('@')
  return at === -1 ? canonical : `${canonical}${target.slice(at)}`
}
