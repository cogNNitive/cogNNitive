/**
 * The single source of the address segment patterns, shared by `parse.ts` and
 * `format.ts`. Pure and browser-safe: no `fs`, no `path`.
 */

/** Model-id head: a compact stem or a top-level instance slug (`LC_programas_Tutorias`, `intro_coNNtent`). */
export const HEAD = '[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*'
/**
 * Element, matrix, row and column slug; also every model-id segment after the head.
 * Lowercase letters of any script and digits, joined by hyphens; a run of hyphens is the
 * Concept/Element boundary (`nn-person--dr-egon`) that `slugifyHeading` writes.
 */
export const SLUG = '[\\p{Ll}\\p{Lo}\\p{N}]+(?:-+[\\p{Ll}\\p{Lo}\\p{N}]+)*'
/** Field name. */
export const FIELD = '[\\p{L}\\p{N}]+(?:[-_][\\p{L}\\p{N}]+)*'
/** Concept name in `concept:<Name>`. */
export const CONCEPT = '[\\p{L}\\p{N}]+(?:(?:[ _]|-+)[\\p{L}\\p{N}]+)*'

export const HEAD_RE = new RegExp(`^${HEAD}$`)
export const SLUG_RE = new RegExp(`^${SLUG}$`, 'u')
export const FIELD_RE = new RegExp(`^${FIELD}$`, 'u')
export const CONCEPT_RE = new RegExp(`^${CONCEPT}$`, 'u')

/** The blueprint-definition head. A model id cannot start with it (A-6). */
export const RESERVED_HEAD = 'specs'
export const BODY_MARKER = '#body'
export const CONCEPT_PREFIX = 'concept:'
export const MATRIX_PREFIX = 'matrix:'
