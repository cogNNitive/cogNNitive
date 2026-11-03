/**
 * Classification of one discovered model against the declared placement rules
 * (design A5, A8): compact or instance model, and the path-derived id. Pure and
 * browser-safe; it reads no filesystem and no other model.
 */

import { SLUG_RE } from '../address/grammar.js'
import { blueprintNameOf, displayStem, instanceFileName, parentSpecNameOf } from '../naming/contract.js'
import type { PlacementRule, PlacementRules } from './placement.js'
import type { DomainModelInput } from './types.js'

export type Classification =
  | {
      kind: 'compact'
      /** Why a model that holds distributed elements is still compact (a layout error). */
      problem?:
        | { type: 'mixed'; concepts: string[] }
        | { type: 'registry'; concept: string; slugs: string[]; rule: PlacementRule }
    }
  | {
      kind: 'instance'
      rule: PlacementRule
      rootConcept: string
      rootSlug: string
      /** Slugs captured from the folder when the path matches the rule exactly; null when misplaced. */
      matched: string[] | null
      /** Container slugs recovered from the path prefix of a misplaced instance. */
      partial: string[]
    }

/** `parent_spec` name and url of a model; a bare-string `parent_spec` is the name. */
export function parentSpecOf(frontmatter: Record<string, unknown>): { name?: string; url?: string } {
  const url = (frontmatter['parent_spec'] as { url?: unknown } | undefined)?.url
  return { name: parentSpecNameOf(frontmatter), url: typeof url === 'string' ? url : undefined }
}

export function directoriesOf(path: string): string[] {
  return path.replace(/\\/g, '/').split('/').slice(0, -1).filter((s) => s !== '' && s !== '.')
}

/** Locale-independent ordering, so ids and paths sort the same on every machine. */
export const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

export const basenameOf = (path: string): string => path.replace(/\\/g, '/').split('/').pop() ?? path

/** Slugs of `dirs` when they match `rule`'s folder exactly, else null. */
export function matchFolder(dirs: readonly string[], rule: PlacementRule): string[] | null {
  if (dirs.length !== rule.folder.length) return null
  const slugs: string[] = []
  for (let i = 0; i < dirs.length; i++) {
    const segment = rule.folder[i]
    if (segment.kind === 'literal') {
      if (dirs[i] !== segment.value) return null
    } else if (SLUG_RE.test(dirs[i])) slugs.push(dirs[i])
    else return null
  }
  return slugs
}

function containerSlugs(dirs: readonly string[], rule: PlacementRule, rules: PlacementRules): string[] {
  const parent = rule.container ? rules.get(rule.container.toLowerCase()) : undefined
  if (!parent || dirs.length < parent.folder.length) return []
  return matchFolder(dirs.slice(0, parent.folder.length), parent) ?? []
}

export function classifyModel(input: DomainModelInput, rules: PlacementRules): Classification {
  const byRule = new Map<string, { rule: PlacementRule; slugs: string[] }>()
  for (const element of input.elements) {
    const rule = rules.get(element.concept.toLowerCase())
    if (!rule) continue
    const entry = byRule.get(rule.concept) ?? { rule, slugs: [] }
    entry.slugs.push(element.slug)
    byRule.set(rule.concept, entry)
  }
  const held = [...byRule.values()]
  if (held.length === 0) return { kind: 'compact' }
  if (held.length > 1) return { kind: 'compact', problem: { type: 'mixed', concepts: held.map((h) => h.rule.concept) } }

  const { rule, slugs } = held[0]
  if (slugs.length > 1) return { kind: 'compact', problem: { type: 'registry', concept: rule.concept, slugs, rule } }

  const dirs = directoriesOf(input.path)
  const matched = matchFolder(dirs, rule)
  const blueprint = blueprintNameOf(parentSpecOf(input.frontmatter).name ?? '')
  const namedAsInstance = basenameOf(input.path).toLowerCase() === instanceFileName(slugs[0], blueprint).toLowerCase()
  if (!matched && !namedAsInstance) {
    return { kind: 'compact', problem: { type: 'registry', concept: rule.concept, slugs, rule } }
  }
  return {
    kind: 'instance',
    rule,
    rootConcept: rule.concept,
    rootSlug: slugs[0],
    matched,
    partial: matched ? [] : containerSlugs(dirs, rule, rules),
  }
}

/** The path-derived id of a classified model (design A5). */
export function idOf(input: DomainModelInput, c: Classification): string {
  if (c.kind === 'compact') return displayStem(basenameOf(input.path))
  return (c.matched ?? [...c.partial, c.rootSlug]).join('/')
}
