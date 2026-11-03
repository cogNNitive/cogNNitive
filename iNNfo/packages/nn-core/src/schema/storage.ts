/**
 * Storage declaration of a Concept (design A1, A2). Pure and browser-safe:
 * no `fs`, no `path`.
 *
 * A Level-2 Concept Definition declares where its instances live through three
 * properties: `storage::` (`compact` | `distributed`), `container::` (the
 * distributed concept an instance is stored under) and `placement::` (the
 * folder template). A concept with no declaration is `compact`.
 */

export type StorageMode = 'compact' | 'distributed'

export const STORAGE_MODES: readonly StorageMode[] = ['compact', 'distributed']

export type PlacementSegment =
  | { kind: 'literal'; value: string }
  | { kind: 'slug' }
  | { kind: 'container' }

/** What a Concept Definition declares, as read from its three properties. */
export interface ConceptStorage {
  mode: StorageMode
  /** Name of the container concept (`container::`). */
  container?: string
  /** Raw placement template (`placement::`), validated by `parsePlacement`. */
  placement?: string
  /** The raw `storage::` value when it is not an accepted mode (mode stays `compact`). */
  unknownMode?: string
}

export type PlacementParse =
  | { ok: true; segments: PlacementSegment[]; slugIndex: number }
  | { ok: false; code: 'PLACEMENT_INVALID'; message: string }

/** A kebab-case literal folder segment. */
const LITERAL_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Literals no placement may name, at any position. */
const RESERVED_LITERALS = new Set(['archive', 'staging', 'specs', 'backups'])

const SLUG_TOKEN = '{slug}'
const CONTAINER_TOKEN = '{container}'

function invalid(template: string, why: string): PlacementParse {
  return {
    ok: false,
    code: 'PLACEMENT_INVALID',
    message: `placement "${template}" is invalid: ${why}`,
  }
}

/**
 * Parses and validates a placement template (design A2): a POSIX path relative
 * to the domaiNN root, ending in `/`, made of kebab-case literals, exactly one
 * `{slug}` and optionally `{container}` as the first segment (only when the
 * concept declares `container::`).
 */
export function parsePlacement(template: string, opts: { hasContainer: boolean }): PlacementParse {
  if (template.trim() === '') return invalid(template, 'the template is empty')
  if (template.includes('\\')) return invalid(template, 'use POSIX separators ("/"), not backslashes')
  if (template.startsWith('/')) return invalid(template, 'the path must be relative to the domaiNN root')
  if (!template.endsWith('/')) return invalid(template, 'the template must end with "/"')

  const parts = template.slice(0, -1).split('/')
  const segments: PlacementSegment[] = []
  let slugCount = 0

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (part === '') return invalid(template, 'it contains an empty segment')
    if (part === '..') return invalid(template, 'a ".." segment is not allowed')
    if (part.startsWith('.')) return invalid(template, `segment "${part}" starts with "." (a "."-prefixed segment is not allowed)`)

    if (part === SLUG_TOKEN) {
      slugCount++
      segments.push({ kind: 'slug' })
      continue
    }
    if (part === CONTAINER_TOKEN) {
      if (i !== 0) return invalid(template, '{container} is allowed only as the first segment')
      if (!opts.hasContainer) return invalid(template, '{container} requires the concept to declare container::')
      segments.push({ kind: 'container' })
      continue
    }
    if (part.includes('{') || part.includes('}')) {
      return invalid(template, `unknown token "${part}"; the only tokens are {slug} and {container}`)
    }

    const folded = part.toLowerCase()
    if (folded === 'knowledge') {
      return invalid(template, 'the literal "kNNowledge" is reserved for compact models')
    }
    if (RESERVED_LITERALS.has(part)) return invalid(template, `the literal "${part}" is reserved`)
    if (i === 0 && part === 'sources') return invalid(template, 'the literal "sources" is reserved at the domaiNN root')
    if (!LITERAL_RE.test(part)) {
      return invalid(template, `literal "${part}" must be kebab-case ([a-z0-9]+(-[a-z0-9]+)*)`)
    }
    segments.push({ kind: 'literal', value: part })
  }

  if (slugCount === 0) return invalid(template, 'it must contain exactly one {slug} (found none)')
  if (slugCount > 1) return invalid(template, `it must contain exactly one {slug} (found ${slugCount})`)

  return { ok: true, segments, slugIndex: segments.findIndex((s) => s.kind === 'slug') }
}

/** The effective storage of a concept: an undeclared concept is `compact`. */
export function storageOf(concept: { storage?: ConceptStorage }): ConceptStorage {
  return concept.storage ?? { mode: 'compact' }
}

function nonEmpty(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined
}

/**
 * Reads the three Concept Definition properties from an element's fields.
 * Returns `undefined` when none is present (the concept is compact). An
 * unrecognised `storage::` value is kept in `unknownMode` for `validateStorage`.
 */
export function readStorage(fields: Record<string, unknown>): ConceptStorage | undefined {
  const rawMode = nonEmpty(fields['storage'])
  const container = nonEmpty(fields['container'])
  const placement = nonEmpty(fields['placement'])
  if (!rawMode && !container && !placement) return undefined

  const storage: ConceptStorage = { mode: 'compact' }
  if (rawMode) {
    const mode = STORAGE_MODES.find((m) => m === rawMode.toLowerCase())
    if (mode) storage.mode = mode
    else storage.unknownMode = rawMode
  }
  if (container) storage.container = container
  if (placement) storage.placement = placement
  return storage
}

/** Minimal shape `validateStorage` needs; `Concept` satisfies it. */
export interface StorageConcept {
  name: string
  storage?: ConceptStorage
}

export type StorageDiagnosticCode =
  | 'STORAGE_UNKNOWN_MODE'
  | 'PLACEMENT_REQUIRED'
  | 'PLACEMENT_FORBIDDEN'
  | 'PLACEMENT_INVALID'
  | 'CONTAINER_NOT_DISTRIBUTED'
  | 'CONTAINER_CYCLE'
  | 'PLACEMENT_OVERLAP'

export interface StorageDiagnostic {
  path: string
  message: string
  severity: 'error'
  code: StorageDiagnosticCode
}

/** Folder shape of an expanded placement: `{container}` replaced by the container's instance root. */
type Expanded = PlacementSegment[]

/**
 * Validates the storage declarations of a composed concept set (design A1, A8):
 * known mode, placement present exactly when distributed, placement grammar,
 * a distributed container, no container cycle, and no two templates that can
 * match the same folder.
 */
export function validateStorage(concepts: readonly StorageConcept[]): StorageDiagnostic[] {
  const diagnostics: StorageDiagnostic[] = []
  const byName = new Map(concepts.map((c) => [c.name.toLowerCase(), c]))
  const report = (
    code: StorageDiagnosticCode,
    concept: string,
    property: string,
    detail: string,
  ): void => {
    diagnostics.push({
      code,
      severity: 'error',
      path: `Concept Definition.${concept}.${property}`,
      message: `${code}: concept "${concept}" - ${detail}`,
    })
  }

  const parsed = new Map<string, { segments: PlacementSegment[]; slugIndex: number }>()

  for (const concept of concepts) {
    const storage = concept.storage
    if (!storage) continue
    const name = concept.name

    if (storage.unknownMode !== undefined) {
      report(
        'STORAGE_UNKNOWN_MODE',
        name,
        'storage',
        `storage "${storage.unknownMode}" is not a known mode; use one of: ${STORAGE_MODES.join(', ')}`,
      )
      continue
    }

    if (storage.mode === 'compact') {
      if (storage.placement !== undefined || storage.container !== undefined) {
        const property = storage.placement !== undefined ? 'placement' : 'container'
        report(
          'PLACEMENT_FORBIDDEN',
          name,
          property,
          `a compact concept cannot declare ${property}::; declare storage:: distributed or remove it`,
        )
      }
      continue
    }

    if (storage.placement === undefined) {
      report(
        'PLACEMENT_REQUIRED',
        name,
        'placement',
        'a distributed concept must declare placement:: (for example placement:: "series/{slug}/"); add it',
      )
      continue
    }
    const result = parsePlacement(storage.placement, { hasContainer: storage.container !== undefined })
    if (!result.ok) {
      report('PLACEMENT_INVALID', name, 'placement', `${result.message}; fix the template`)
      continue
    }
    if (storage.container !== undefined && !result.segments.some((s) => s.kind === 'container')) {
      report(
        'PLACEMENT_INVALID',
        name,
        'placement',
        `container:: ${storage.container} is declared but placement "${storage.placement}" never names {container}; start the template with {container}/`,
      )
      continue
    }
    parsed.set(name.toLowerCase(), { segments: result.segments, slugIndex: result.slugIndex })
  }

  // Containers must exist and be distributed; the chain must not loop.
  const next = new Map<string, string>()
  for (const concept of concepts) {
    const storage = concept.storage
    if (!storage || storage.mode !== 'distributed' || storage.container === undefined) continue
    const target = byName.get(storage.container.toLowerCase())
    if (!target) {
      report(
        'CONTAINER_NOT_DISTRIBUTED',
        concept.name,
        'container',
        `container "${storage.container}" is not a concept of this schema; declare it distributed or fix the name`,
      )
    } else if (target.storage?.mode !== 'distributed') {
      report(
        'CONTAINER_NOT_DISTRIBUTED',
        concept.name,
        'container',
        `container "${target.name}" is not distributed, so it cannot hold instance models; declare storage:: distributed on "${target.name}"`,
      )
    } else {
      next.set(concept.name.toLowerCase(), target.name.toLowerCase())
    }
  }

  const cyclic = new Set<string>()
  const seenCycles = new Set<string>()
  for (const start of next.keys()) {
    const path: string[] = []
    let at: string | undefined = start
    while (at !== undefined && !path.includes(at)) {
      path.push(at)
      at = next.get(at)
    }
    if (at === undefined) continue
    const members = path.slice(path.indexOf(at))
    members.forEach((m) => cyclic.add(m))
    const key = [...members].sort().join('|')
    if (seenCycles.has(key)) continue
    seenCycles.add(key)
    const names = members.map((m) => byName.get(m)!.name)
    report(
      'CONTAINER_CYCLE',
      names[0],
      'container',
      `containers form a cycle (${[...names, names[0]].join(' -> ')}); break it so every chain ends at the domaiNN root`,
    )
  }

  // Expansion: substitute the container's instance root folder for {container}.
  const expand = (key: string): Expanded | null => {
    const own = parsed.get(key)
    if (!own || cyclic.has(key)) return null
    if (own.segments[0].kind !== 'container') return own.segments
    const containerKey = next.get(key)
    const container = containerKey ? parsed.get(containerKey) : undefined
    const containerFolder = containerKey ? expand(containerKey) : null
    if (!container || !containerFolder) return null
    return [...containerFolder.slice(0, container.slugIndex + 1), ...own.segments.slice(1)]
  }
  const folders = new Map<string, Expanded>()
  for (const key of parsed.keys()) {
    const folder = expand(key)
    if (folder) folders.set(key, folder)
  }

  const keys = [...folders.keys()]
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = folders.get(keys[i])!
      const b = folders.get(keys[j])!
      if (a.length !== b.length) continue
      const collide = a.every((seg, n) => {
        const other = b[n]
        if (seg.kind === 'slug' || other.kind === 'slug') return true
        return seg.kind === 'literal' && other.kind === 'literal' && seg.value === other.value
      })
      if (!collide) continue
      const first = byName.get(keys[i])!
      const second = byName.get(keys[j])!
      report(
        'PLACEMENT_OVERLAP',
        first.name,
        'placement',
        `placement "${first.storage?.placement}" can match the same folder as "${second.name}" ("${second.storage?.placement}"); give each concept its own folder shape`,
      )
    }
  }

  return diagnostics
}
