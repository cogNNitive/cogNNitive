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
