/**
 * The fold: one pass over the APPLIED changes into `Map<UnitKey, UnitState>`
 * (change-provenance A3/A4). O(C+U): every change is visited once and no model
 * file is read. The rules are the A4 table; values are stored in serialized form
 * (`canonicalValue`) so number, boolean and array typing never produce a
 * false mismatch.
 *
 * Browser-safe: pure over the log, no filesystem.
 */
import type { LoggedChange } from './index.js'
import { parsePropertyValue } from '../parser/sections.js'
import { slugifyHeading } from '../sourceRef.js'
import { updateReferenceString, updateWikiLinks } from '../references.js'

export type FoldUnitKind = 'field' | 'body' | 'cell' | 'concept' | 'artifact'

/** A rename event, applied lazily by consumers recorded AFTER the unit's origin. */
export interface Relink {
  readonly model: string
  readonly from: string
  readonly to: string
  /** Position of the rename change in the canonical order. */
  readonly order: number
}

/**
 * A `move_model` or `extract_instance` recorded as an identity change: every unit,
 * element origin and tombstone keyed under `from` (or a descendant `from/...`) is
 * re-keyed to `to` from `order` on. Recorded targets are never rewritten on disk
 * (design A10, A11).
 */
export interface Rekey {
  readonly from: string
  readonly to: string
  /** Position of the change in the canonical order. */
  readonly order: number
  /**
   * `extract_instance` only: the slugs the cut moved (root first, then the
   * descendants). Only units of the source model whose element part is one of
   * them re-key; everything the source kept stays put.
   */
  readonly slugs?: readonly string[]
  /** `move` (an id change) or `extract` (a compact element that became a model). */
  readonly kind?: 'move' | 'extract'
}

/**
 * Re-keys one unit key through a move or an extraction. The model part is the
 * prefix before `@`; a descendant instance shares the prefix. When the model slug
 * changes, the root element's slug changes with it (`old@old-slug...` ->
 * `new@new-slug...`). An extraction carries a slug set instead: only those
 * elements move and each keeps its own slug.
 */
export function rekeyKey(
  key: string,
  from: string,
  to: string,
  slugs?: readonly string[],
): string {
  const at = key.indexOf('@')
  const model = at === -1 ? key : key.slice(0, at)
  const rest = at === -1 ? '' : key.slice(at)
  let newModel: string
  if (model === from) newModel = to
  else if (model.startsWith(`${from}/`)) newModel = `${to}${model.slice(from.length)}`
  else return key
  if (at === -1) {
    // A bare model key names the model itself: an extraction moves elements, it
    // never renames the source.
    return slugs ? key : newModel
  }
  if (slugs) {
    const first = rest.slice(1).split('&')[0] ?? ''
    const moved = slugs.some((slug) => slug.toLowerCase() === first.toLowerCase())
    return moved ? `${newModel}${rest}` : key
  }
  const oldSlug = from.split('/').pop() ?? ''
  const newSlug = to.split('/').pop() ?? ''
  if (oldSlug !== newSlug) {
    const [first, ...others] = rest.slice(1).split('&')
    if (first === oldSlug) return `${newModel}@${[newSlug, ...others].join('&')}`
  }
  return `${newModel}${rest}`
}

/** A unit as the fold stores it: the canonical value and the change that set it. */
export interface FoldedUnit {
  readonly key: string
  readonly kind: FoldUnitKind
  readonly value: string
  readonly origin: LoggedChange
  /** Canonical position of the change that set the value. */
  readonly setOrder: number
}

export interface FoldResult {
  /** Live units after the epoch cut, in first-set order. */
  readonly units: Map<string, FoldedUnit>
  /** Unit keys whose last applied change cleared them (`to:: ''`), expected absent. */
  readonly cleared: ReadonlySet<string>
  /** remove_element / remove_matrix changes, in canonical order. */
  readonly tombstones: readonly LoggedChange[]
  /** Element key -> position of the latest add_element (the epoch cut). */
  readonly epochs: Map<string, number>
  /** Element key -> the change that created or removed it (add wins until a later remove). */
  readonly elements: Map<string, LoggedChange>
  /** Model -> rename events, in canonical order. */
  readonly relinks: Map<string, Relink[]>
  /** `move_model` identity changes, in canonical order. */
  readonly rekeys: readonly Rekey[]
}

/**
 * The canonical serialized form of a change `to` (A4): parse through the shared
 * property grammar and re-serialize so `5` (typed number in the file) equals
 * `to:: 5`, `true` equals `to:: true`, and `[a, b]` lists compare element-wise.
 */
export function canonicalValue(raw: string | undefined): string {
  if (raw === undefined || raw === null) return ''
  const parsed = parsePropertyValue(String(raw))
  if (parsed === null || parsed === undefined) return ''
  if (typeof parsed === 'string') return parsed
  if (Array.isArray(parsed)) {
    return `[${parsed
      .map((v) => (typeof v === 'string' ? v : String(v)))
      .join(', ')}]`
  }
  if (typeof parsed === 'number' || typeof parsed === 'boolean') return String(parsed)
  return JSON.stringify(parsed)
}

/** Splits `model@element&part...` (or a bare artifact path). */
export function splitUnitKey(key: string): { model: string; parts: string[] } {
  const at = key.indexOf('@')
  if (at === -1) return { model: '', parts: [] }
  return {
    model: key.slice(0, at),
    parts: key
      .slice(at + 1)
      .split('&')
      .map((p) => p.trim()),
  }
}

/** The element/matrix part of a unit key: `model@slug` for any unit under it. */
export function elementKeyOf(unitKey: string): string {
  const amp = unitKey.indexOf('&')
  return amp === -1 ? unitKey : unitKey.slice(0, amp)
}

/** The kind a unit key names, from its shape (A6). */
export function unitKindOf(key: string): FoldUnitKind {
  const { parts } = splitUnitKey(key)
  if (parts.length === 0) return 'artifact'
  if (parts[0].startsWith('concept:')) return 'concept'
  if (parts.length >= 3) return 'cell'
  if (parts[1] === '#body') return 'body'
  return 'field'
}

function setUnit(
  units: Map<string, FoldedUnit>,
  cleared: Set<string>,
  key: string,
  kind: FoldUnitKind,
  raw: string | undefined,
  origin: LoggedChange,
  order: number,
): void {
  const value = canonicalValue(raw)
  if (value === '') {
    // An empty value is the same as absent (A4); remember it so a hand re-add is drift.
    units.delete(key)
    cleared.add(key)
    return
  }
  units.set(key, { key, kind, value, origin, setOrder: order })
  cleared.delete(key)
}

/** Collects the log into unit state. `changes` MUST already be in canonical order. */
export function foldChanges(changes: readonly LoggedChange[]): FoldResult {
  const units = new Map<string, FoldedUnit>()
  const cleared = new Set<string>()
  const tombstones: LoggedChange[] = []
  const epochs = new Map<string, number>()
  const elements = new Map<string, LoggedChange>()
  const relinks = new Map<string, Relink[]>()
  const rekeys: Rekey[] = []

  const addRelink = (model: string, from: string, to: string, order: number): void => {
    if (!from || !to) return
    const bucket = relinks.get(model)
    if (bucket) bucket.push({ model, from, to, order })
    else relinks.set(model, [{ model, from, to, order }])
  }

  changes.forEach((change, order) => {
    if (!change.applied) return
    const address = change.resolvedTarget ?? change.target
    switch (change.op) {
      case 'add_element': {
        const { model, parts } = splitUnitKey(address)
        const key = change.resolvedTarget
          ? address
          : model
            ? `${model}@${slugifyHeading(change.name ?? change.slug ?? parts[0] ?? '')}`
            : address
        epochs.set(key, order)
        elements.set(key, change)
        // Epoch cut: a reused slug starts empty.
        for (const unitKey of [...units.keys()]) {
          if (unitKey.startsWith(`${key}&`)) units.delete(unitKey)
        }
        for (const unitKey of [...cleared]) {
          if (unitKey.startsWith(`${key}&`)) cleared.delete(unitKey)
        }
        return
      }
      case 'update_field':
        setUnit(units, cleared, address, 'field', change.to, change, order)
        return
      case 'update_element_text':
        setUnit(units, cleared, address, 'body', change.to, change, order)
        return
      case 'update_concept_text':
      case 'update_concept_field':
        setUnit(units, cleared, address, 'concept', change.to, change, order)
        return
      case 'update_matrix_cell':
        setUnit(units, cleared, address, 'cell', change.to, change, order)
        return
      case 'rename_element': {
        const { model, parts } = splitUnitKey(address)
        addRelink(model, change.from ?? parts[0] ?? '', change.name ?? change.to ?? '', order)
        return
      }
      case 'rename_concept': {
        const { model, parts } = splitUnitKey(address)
        const oldName = parts[0]?.startsWith('concept:')
          ? parts[0].slice('concept:'.length)
          : (change.from ?? parts[0] ?? '')
        const newName = change.name ?? change.to ?? ''
        if (!oldName || !newName) return
        const oldPrefix = `${model}@concept:${oldName}`
        const newPrefix = `${model}@concept:${newName}`
        for (const key of [...units.keys()]) {
          if (key !== oldPrefix && !key.startsWith(`${oldPrefix}&`)) continue
          const unit = units.get(key)!
          units.delete(key)
          units.set(`${newPrefix}${key.slice(oldPrefix.length)}`, { ...unit, key: `${newPrefix}${key.slice(oldPrefix.length)}` })
        }
        addRelink(model, oldName, newName, order)
        return
      }
      case 'move_model':
      case 'extract_instance': {
        // The recorded target stays as written (the seal is immutable); the fold
        // carries the identity forward from this order on (design A10). An
        // extraction re-keys only the slugs it moved (design A11).
        const slugs = change.op === 'extract_instance' ? change.extractedSlugs : undefined
        if (change.op === 'extract_instance' && (!slugs || slugs.length === 0)) return
        const fromId =
          change.op === 'extract_instance' ? change.target.split('@')[0]!.trim() : change.target
        const toId = change.to ?? ''
        if (!fromId || !toId || fromId === toId) return
        const rekey = (key: string): string => rekeyKey(key, fromId, toId, slugs)
        const rekeyMap = <V>(map: Map<string, V>, withKey: (value: V, key: string) => V): void => {
          for (const [key, value] of [...map]) {
            const next = rekey(key)
            if (next === key) continue
            map.delete(key)
            map.set(next, withKey(value, next))
          }
        }
        rekeyMap(units, (unit, key) => ({ ...unit, key }))
        rekeyMap(epochs, (_value) => _value)
        rekeyMap(elements, (_value) => _value)
        for (const key of [...cleared]) {
          const next = rekey(key)
          if (next === key) continue
          cleared.delete(key)
          cleared.add(next)
        }
        for (let i = 0; i < tombstones.length; i++) {
          const tombstone = tombstones[i]!
          const target = rekey(tombstone.target)
          if (target === tombstone.target) continue
          tombstones[i] = {
            ...tombstone,
            target,
            ...(tombstone.resolvedTarget !== undefined ? { resolvedTarget: rekey(tombstone.resolvedTarget) } : {}),
          }
        }
        rekeys.push({
          from: fromId,
          to: toId,
          order,
          kind: change.op === 'extract_instance' ? 'extract' : 'move',
          ...(slugs ? { slugs } : {}),
        })
        return
      }
      case 'remove_element': {
        const { model, parts } = splitUnitKey(address)
        const key = elementKeyOf(address) || (parts[0] ? `${model}@${parts[0]}` : address)
        elements.set(key, change)
        tombstones.push(change)
        const slug = key.slice(key.indexOf('@') + 1)
        for (const unitKey of [...units.keys()]) {
          if (unitKey.startsWith(`${key}&`)) {
            units.delete(unitKey)
            continue
          }
          const cell = splitUnitKey(unitKey)
          if (cell.parts.length >= 3 && cell.model === model && (cell.parts[1] === slug || cell.parts[2] === slug)) {
            units.delete(unitKey)
          }
        }
        return
      }
      case 'remove_matrix': {
        const { model, parts } = splitUnitKey(address)
        const raw = parts[0] ?? ''
        const matrixSlug = raw.startsWith('matrix:') ? raw.slice('matrix:'.length) : raw
        const key = `${model}@${matrixSlug}`
        tombstones.push(change)
        for (const unitKey of [...units.keys()]) {
          if (unitKey.startsWith(`${key}&`)) units.delete(unitKey)
        }
        return
      }
      case 'produce_artifact':
        setUnit(units, cleared, address, 'artifact', address, change, order)
        return
      default:
        return
    }
  })

  return { units, cleared, tombstones, epochs, elements, relinks, rekeys }
}

/**
 * Applies the rename events recorded after `unit` to its canonical value.
 * Cells are never relinked (their keys are slugs and their values are data);
 * a field may hold a bare reference, so it uses `updateReferenceString`.
 */
export function applyRelinks(unit: FoldedUnit, relinks: readonly Relink[]): string {
  if (unit.kind === 'cell' || unit.kind === 'artifact') return unit.value
  const later = relinks.filter((r) => r.order > unit.setOrder)
  if (later.length === 0) return unit.value
  let value = unit.value
  for (const relink of later) {
    value = unit.kind === 'field'
      ? updateReferenceString(value, relink.from, relink.to)
      : updateWikiLinks(value, relink.from, relink.to)
  }
  return value
}
