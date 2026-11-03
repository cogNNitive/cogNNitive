/**
 * The canonical unit address a change resolved to at apply time
 * (change-provenance: Frozen-slug target identity).
 *
 * `resolved_target` is an execution fact: built from the model id (no version
 * token) and the frozen slugs the change addressed, so history survives a
 * rename and never collides across punctuation or models. History and origin
 * match by exact string equality on these addresses. Every builder delegates to
 * `formatAddress`, the one serializer of the unified address grammar, so a value
 * the grammar would reject is never recorded.
 */
import { formatAddress } from '../address/index.js'
import type { ModelId, Unit } from '../address/index.js'
import { slugifyHeading } from '../sourceRef.js'

/** `acme_V_0-1-0` → `acme`. A version token is never part of a unit address. */
const VERSION_TOKEN_RE = /_V_\d+-\d+-\d+$/

export function canonicalUnitModelId(model: string): string {
  return String(model ?? '')
    .trim()
    .replace(VERSION_TOKEN_RE, '')
}

function assertPresent(value: string, name: string): string {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) throw new TypeError(`resolvedTarget: ${name} cannot be empty`)
  return trimmed
}

function unitTarget(model: string, unit: Unit): string {
  return formatAddress({ kind: 'unit', model: canonicalUnitModelId(model) as ModelId, unit })
}

/**
 * An axis slug: the frozen slug of the element named by the label, else the
 * label slugified.
 */
export function axisSlug(label: string, frozenSlug?: string): string {
  const frozen = String(frozenSlug ?? '').trim()
  return frozen.length > 0 ? frozen : slugifyHeading(assertPresent(label, 'label'))
}

export const resolvedTarget = {
  /** `model@frozen-slug&field` */
  field(model: string, elementSlug: string, field: string): string {
    return unitTarget(model, {
      kind: 'element',
      slug: assertPresent(elementSlug, 'elementSlug'),
      field: assertPresent(field, 'field'),
    })
  },

  /** `model@frozen-slug&#body` */
  body(model: string, elementSlug: string): string {
    return unitTarget(model, { kind: 'body', slug: assertPresent(elementSlug, 'elementSlug') })
  },

  /** `model@matrix-slug&row-slug&col-slug` */
  cell(model: string, matrixSlug: string, rowSlug: string, colSlug: string): string {
    return unitTarget(model, {
      kind: 'cell',
      matrix: assertPresent(matrixSlug, 'matrixSlug'),
      row: assertPresent(rowSlug, 'rowSlug'),
      col: assertPresent(colSlug, 'colSlug'),
    })
  },

  /** `model@concept:<Name>` or `model@concept:<Name>&field` (the concept name as the change carried it). */
  concept(model: string, conceptName: string, field?: string): string {
    return unitTarget(model, {
      kind: 'concept',
      concept: assertPresent(conceptName, 'conceptName'),
      ...(field ? { field: assertPresent(field, 'field') } : {}),
    })
  },

  /** `model@frozen-slug` (an element-level change) */
  element(model: string, elementSlug: string): string {
    return unitTarget(model, { kind: 'element', slug: assertPresent(elementSlug, 'elementSlug') })
  },

  /** A workspace-relative artifact path, POSIX separators. */
  artifact(path: string): string {
    return assertPresent(path, 'path').replace(/\\/g, '/')
  },
}
