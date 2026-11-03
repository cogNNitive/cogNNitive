/**
 * Placement rules of distributed concepts (design A2, A4, A8): expansion of the
 * declared templates, derivation of an instance's folder and file name. Pure and
 * browser-safe. The file-name derivation itself lives in `naming/contract.ts`.
 */

import { HEAD_RE, SLUG_RE } from '../address/grammar.js'
import { blueprintNameOf, checkInstanceName, formatNNName, instanceFileName } from '../naming/contract.js'
import { parsePlacement, type ConceptStorage, type PlacementSegment } from '../schema/storage.js'
import { classifyModel, idOf, parentSpecOf, type Classification } from './classify.js'
import type { DomainModelInput, LayoutCode, LayoutDiagnostic } from './types.js'

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

/**
 * Folder of `rule` with the `{slug}` positions filled from `slugs`, aligned to the end so the
 * concept's own slug comes last; a container slug that is not known stays `{slug}`.
 */
export function expectedFolder(rule: PlacementRule, slugs: readonly string[]): string {
  const unknown = slugCount(rule) - slugs.length
  let position = 0
  const parts = rule.folder.map((s) => (s.kind === 'literal' ? s.value : (slugs[position++ - unknown] ?? '{slug}')))
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

type Registry = Extract<NonNullable<Extract<Classification, { kind: 'compact' }>['problem']>, { type: 'registry' }>

/** A distributed concept stored inside a compact model (a registry, or two roots in one model). */
export function registryDiagnostic(path: string, problem: Registry, alsoStoredAt: readonly string[]): LayoutDiagnostic {
  const { concept, slugs, rule } = problem
  const would = slugs.map((s) => (rule.container ? `<${rule.container.toLowerCase()}>/${s}` : s))
  const plural = slugs.length > 1 ? 's' : ''
  const also = alsoStoredAt.length > 0 ? ` (also stored as instance model ${alsoStoredAt.join(', ')})` : ''
  return layoutDiagnostic(
    'DISTRIBUTED_CONCEPT_IN_COMPACT_MODEL',
    `${path} - ${concept} is distributed but this model holds ${slugs.length} ${concept} element${plural} (${slugs.join(', ')}), which would be instance${plural} ${would.join(', ')}${also}; run extract_instance for each or remove_element`,
    [path, ...alsoStoredAt],
    { meta: { concept, slugs } },
  )
}

/**
 * Findings that depend on one file only (design A12, A-10): placement, naming,
 * slug, cardinality and mixed storage. Container existence, duplicate ids and
 * double storage need the whole domaiNN and are added by `buildDomainIndex`.
 */
export function localDiagnostics(
  input: DomainModelInput,
  c: Classification,
  rules: PlacementRules,
  alsoStoredAt: (concept: string, slugs: readonly string[]) => string[] = () => [],
): LayoutDiagnostic[] {
  const path = input.path
  if (c.kind === 'compact') {
    if (c.problem?.type === 'mixed') {
      return [
        layoutDiagnostic(
          'MIXED_INSTANCE_MODEL',
          `${path} - holds elements of two distributed concepts (${c.problem.concepts.join(', ')}); each distributed concept is its own model`,
          [path],
        ),
      ]
    }
    if (c.problem?.type === 'registry') {
      return [registryDiagnostic(path, c.problem, alsoStoredAt(c.problem.concept, c.problem.slugs))]
    }
    return []
  }

  const id = idOf(input, c)
  const { rule, rootConcept, rootSlug, matched } = c
  if (!matched) {
    const expected = expectedFolder(rule, [...c.partial, rootSlug])
    return [
      layoutDiagnostic(
        'PLACEMENT_MISMATCH',
        `${path} holds ${rootConcept} "${rootSlug}" - ${rootConcept} instances live at ${expected}; move the file there`,
        [path],
        { id },
      ),
    ]
  }
  const out: LayoutDiagnostic[] = []
  const folderSlug = matched[matched.length - 1]
  if (rootSlug !== folderSlug) {
    out.push(
      layoutDiagnostic(
        'INSTANCE_SLUG_MISMATCH',
        `${path} - root ${rootConcept} has slug "${rootSlug}" but its folder is "${folderSlug}"; set slug:: ${folderSlug} or move the folder`,
        [path],
        { id },
      ),
    )
  }
  const blueprint = blueprintNameOf(parentSpecOf(input.frontmatter).name ?? '')
  const name = checkInstanceName(path, folderSlug, blueprint)
  if (name) {
    out.push(
      layoutDiagnostic(
        'INSTANCE_NAME_MISMATCH',
        `${path} - the instance in folder ${folderSlug}/ must be named ${name.expected}; rename the file`,
        [path],
        { id },
      ),
    )
  }
  return out
}

/** File-local layout findings of one model, with no domaiNN needed (`validate_knowledge` on one file). */
export function fileLocalDiagnostics(
  input: DomainModelInput,
  declarations: ReadonlyMap<string, ConceptStorage>,
): LayoutDiagnostic[] {
  const rules = buildRules(declarations)
  return localDiagnostics(input, classifyModel(input, rules), rules)
}
