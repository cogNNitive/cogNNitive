/**
 * Write-once planning: pure and browser-safe. Resolves the latest member of a
 * family by name and proposes (never performs) garbage collection.
 */
import { compareMembers, familyOf, rawPathOfSidecar } from '../naming/contract.js'

export interface FamilyMember {
  path: string
  /** SHA-256 recorded in the member's sidecar, when it has one. */
  sha256?: string
}

/** Latest member of ONE family `(dir, key, ext)`, by name order only (never mtime). */
export function latestOfFamily(members: FamilyMember[]): FamilyMember | undefined {
  let latest: FamilyMember | undefined
  for (const member of members) {
    if (!latest || compareMembers(latest.path, member.path) <= 0) latest = member
  }
  return latest
}

/**
 * Members that are neither the latest of their family nor cited. A citation of
 * a sidecar counts as a citation of its subject. `_NN` documents (the lineage
 * record included) are not family members and are never proposed.
 */
export function planGc(i: {
  families: FamilyMember[][]
  citedPaths: ReadonlySet<string>
}): { candidates: string[] } {
  const cited = new Set<string>()
  for (const p of i.citedPaths) {
    cited.add(p)
    const subject = rawPathOfSidecar(p)
    if (subject) cited.add(subject)
  }
  const candidates: string[] = []
  for (const family of i.families) {
    const members = family.filter((member) => familyOf(member.path) !== null)
    const latest = latestOfFamily(members)
    for (const member of members) {
      if (member === latest || cited.has(member.path)) continue
      candidates.push(member.path)
    }
  }
  return { candidates: candidates.sort() }
}
