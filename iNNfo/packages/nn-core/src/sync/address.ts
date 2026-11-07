/**
 * Mirror addresses: `sources/sync/<alias>/<path>_NN.md@<slug>[&field]`.
 *
 * A mirror is the local copy of a model owned by an origin domaiNN. The address
 * is a path (not a model id) because the mirror folder is outside model
 * discovery. Pure and browser-safe: no `fs`, no `path`.
 */

import { parseUnit } from '../address/parse.js'
import type { Unit } from '../address/index.js'
import type { DomainIndex } from '../domain/index.js'
import { isNNName } from '../naming/contract.js'

export const SYNC_DIR = 'sources/sync'

export interface MirrorAddress {
  alias: string
  /** Path of the mirrored model relative to the alias folder, posix form. */
  path: string
  unit: Unit
}

/** Resolves an alias to the index built over its mirror folder; `undefined` when the alias has no folder. */
export type MirrorLookup = (alias: string) => DomainIndex | undefined

/** Parse a mirror address; `null` when the value is not one. Never touches the filesystem. */
export function parseMirrorAddress(raw: string): MirrorAddress | null {
  const value = String(raw ?? '').trim()
  const at = value.indexOf('@')
  if (at === -1) return null
  const location = value.slice(0, at)
  if (location.includes('\\') || !location.startsWith(`${SYNC_DIR}/`)) return null

  const segments = location.slice(SYNC_DIR.length + 1).split('/')
  if (segments.length < 2) return null
  if (segments.some((s) => s === '' || s === '.' || s === '..')) return null
  const path = segments.slice(1).join('/')
  if (!isNNName(path) || !/\.md$/i.test(path)) return null

  const unit = parseUnit(value.slice(at + 1))
  if ('code' in unit) return null
  if (unit.kind !== 'element' && unit.kind !== 'body') return null
  return { alias: segments[0], path, unit }
}
