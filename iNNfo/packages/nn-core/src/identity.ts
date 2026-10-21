/** Error thrown when an identity collision is detected. */
export class DuplicateNameError extends Error {
  constructor(
    public readonly duplicateName: string,
    public readonly parentQualifiedId: string | null,
  ) {
    super(`Duplicate name "${duplicateName}" under ${parentQualifiedId ?? '<root>'}`)
    this.name = 'DuplicateNameError'
  }
}

/**
 * Tracks sibling name uniqueness per parent and builds qualified ids
 * (ancestor chain joined `Parent/Child`). Node identity is name-unique
 * among siblings; qualified path disambiguates across branches.
 * Collisions throw a DuplicateNameError instead of silently disambiguating.
 */
export class IdentityRegistry {
  private siblingNames = new Map<string | null, Set<string>>()

  /**
   * Registers a node name under its parent's qualified id (null for root).
   * Returns the qualified id for this node. If the sibling name already
   * exists (collision), throws a DuplicateNameError.
   */
  register(parentQualifiedId: string | null, name: string): string {
    const siblings = this.siblingNames.get(parentQualifiedId) ?? new Set<string>()
    const baseQualifiedId = buildQualifiedId(parentQualifiedId, name)

    if (siblings.has(name)) {
      throw new DuplicateNameError(name, parentQualifiedId)
    }

    siblings.add(name)
    this.siblingNames.set(parentQualifiedId, siblings)

    return baseQualifiedId
  }
}

/** Builds a qualified id by joining the parent's qualified id and this node's name. */
export function buildQualifiedId(parentQualifiedId: string | null, name: string): string {
  return parentQualifiedId ? `${parentQualifiedId}/${name}` : name
}
