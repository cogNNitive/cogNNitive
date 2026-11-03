/**
 * Placement rules of distributed concepts (design A2, A4, A8): expansion of the
 * declared templates, derivation of an instance's folder and file name. Pure and
 * browser-safe. The file-name derivation itself lives in `naming/contract.ts`.
 */

import { HEAD_RE, SLUG_RE } from '../address/grammar.js'
import { formatNNName, instanceFileName } from '../naming/contract.js'
import { parsePlacement, type ConceptStorage, type PlacementSegment } from '../schema/storage.js'
import type { LayoutCode, LayoutDiagnostic } from './types.js'

export type FolderSegment = { kind: 'literal'; value: string } | { kind: 'slug' }

/** A distributed concept's folder with `{container}` already expanded to the container's instance root. */
export interface PlacementRule {
  concept: string
  /** Name of the container concept, when the template starts with `{container}`. */
  container: string | null
  folder: readonly FolderSegment[]
  /** Index of the concept's own `{slug}` segment in `folder`. */
  slugIndex: number
}

/** Rules keyed by lower-cased concept name. Concepts with no valid placement have no rule. */
export type PlacementRules = ReadonlyMap<string, PlacementRule>

export function layoutDiagnostic(
  code: LayoutCode,
  message: string,
  paths: string[],
  extra: Pick<LayoutDiagnostic, 'id' | 'meta'> & { severity?: 'error' | 'warning' } = {},
): LayoutDiagnostic {
  const { severity = 'error', ...rest } = extra
  return { code, severity, message: `${code}: ${message}`, paths, ...rest }
}

export function buildRules(declarations: ReadonlyMap<string, ConceptStorage>): PlacementRules {
  const parsed = new Map<string, { name: string; container?: string; segments: PlacementSegment[]; slugIndex: number }>()
  for (const [name, storage] of declarations) {
    if (storage.mode !== 'distributed' || storage.placement === undefined) continue
    const result = parsePlacement(storage.placement, { hasContainer: storage.container !== undefined })
    if (result.ok) {
      const { segments, slugIndex } = result
      parsed.set(name.toLowerCase(), { name, container: storage.container, segments, slugIndex })
    }
  }

  const rules = new Map<string, PlacementRule>()
  const expand = (key: string, seen: ReadonlySet<string>): PlacementRule | null => {
    const known = rules.get(key)
    if (known) return known
    const own = parsed.get(key)
    if (!own || seen.has(key)) return null
    const { segments, slugIndex } = own
    let rule: PlacementRule
    if (segments[0].kind === 'container') {
      const parent = own.container ? expand(own.container.toLowerCase(), new Set([...seen, key])) : null
      if (!parent) return null
      rule = {
        concept: own.name,
        container: parent.concept,
        folder: [...parent.folder.slice(0, parent.slugIndex + 1), ...(segments.slice(1) as FolderSegment[])],
        slugIndex: parent.slugIndex + slugIndex,
      }
    } else {
      rule = { concept: own.name, container: null, folder: segments as FolderSegment[], slugIndex }
    }
    rules.set(key, rule)
    return rule
  }
  for (const key of parsed.keys()) expand(key, new Set())
  return rules
}

const slugCount = (rule: PlacementRule): number => rule.folder.filter((s) => s.kind === 'slug').length

/** Folder of `rule` with each `{slug}` position filled from `slugs` (a missing slug stays `{slug}`). */
export function expectedFolder(rule: PlacementRule, slugs: readonly string[]): string {
  let next = 0
  const parts = rule.folder.map((s) => (s.kind === 'literal' ? s.value : (slugs[next++] ?? '{slug}')))
  return `${parts.join('/')}/`
}

/**
 * Folder and file name of the model of `concept` with id `id` under `blueprint`.
 * A concept with no placement rule is compact: its model lives in `kNNowledge/` and its id has no `/`.
 */
export function placementFor(
  declarations: ReadonlyMap<string, ConceptStorage>,
  concept: string,
  id: string,
  blueprint: string,
): { folder: string; file: string } | LayoutDiagnostic {
  const invalid = (why: string) =>
    layoutDiagnostic('MODEL_ID_INVALID', `id "${id}" for ${concept} - ${why}; fix the id`, [])
  const declared = [...declarations].find(([name]) => name.toLowerCase() === concept.toLowerCase())
  const rule = buildRules(declarations).get(concept.toLowerCase())
  const segments = id.split('/')

  if (!rule) {
    if (declared?.[1].mode === 'distributed') return invalid(`${concept} is distributed but declares no valid placement`)
    if (segments.length > 1) return invalid(`${concept} is compact, so its id has no "/"`)
    if (!HEAD_RE.test(id)) return invalid('it is not a valid model id')
    return { folder: 'kNNowledge/', file: formatNNName(id, blueprint) }
  }

  const depth = slugCount(rule)
  if (segments.length !== depth) {
    const shape = rule.container ? `<${rule.container.toLowerCase()}-id>/<slug>` : '<slug>'
    return invalid(`${concept} ids have ${depth} segment(s) (${shape})`)
  }
  const bad = segments.find((s) => !SLUG_RE.test(s))
  if (bad !== undefined) return invalid(`segment "${bad}" is not a lowercase slug`)
  return { folder: expectedFolder(rule, segments), file: instanceFileName(segments[depth - 1], blueprint) }
}
