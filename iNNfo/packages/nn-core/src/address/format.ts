import {
  BODY_MARKER,
  CONCEPT_PREFIX,
  CONCEPT_RE,
  FIELD_RE,
  HEAD_RE,
  MATRIX_PREFIX,
  RESERVED_HEAD,
  SLUG_RE,
} from './grammar.js'
import type { Address, Unit } from './index.js'

function check(value: string, pattern: RegExp, what: string): string {
  if (!pattern.test(value)) throw new TypeError(`formatAddress: \`${value}\` is not ${what}`)
  return value
}

function formatModel(model: string): string {
  return model
    .split('/')
    .map((segment, i) =>
      i === 0 ? check(segment, HEAD_RE, 'a valid model-id head') : check(segment, SLUG_RE, 'a lowercase slug'),
    )
    .join('/')
}

function withField(base: string, field: string | undefined): string {
  return field === undefined ? base : `${base}&${check(field, FIELD_RE, 'a field name')}`
}

function formatUnit(unit: Unit): string {
  switch (unit.kind) {
    case 'element':
      return withField(check(unit.slug, SLUG_RE, 'a lowercase slug'), unit.field)
    case 'body':
      return `${check(unit.slug, SLUG_RE, 'a lowercase slug')}&${BODY_MARKER}`
    case 'cell':
      return [unit.matrix, unit.row, unit.col].map((s) => check(s, SLUG_RE, 'a lowercase slug')).join('&')
    case 'concept':
      return withField(`${CONCEPT_PREFIX}${check(unit.concept, CONCEPT_RE, 'a concept name')}`, unit.field)
    case 'matrix':
      return `${MATRIX_PREFIX}${check(unit.matrix, SLUG_RE, 'a lowercase slug')}`
  }
}

/**
 * Canonical serializer; `parse(format(parse(x))) == parse(x)`. Throws a
 * `TypeError` when a segment could not be parsed back, so a caller cannot
 * write a value the grammar rejects.
 */
export function formatAddress(address: Address): string {
  switch (address.kind) {
    case 'model':
      return formatModel(address.model)
    case 'unit':
      return `${address.model === null ? '' : formatModel(address.model)}@${formatUnit(address.unit)}`
    case 'blueprint': {
      const base = `${RESERVED_HEAD}/${check(address.family, HEAD_RE, 'a blueprint family')}`
      return address.unit === null ? base : `${base}@${formatUnit(address.unit)}`
    }
    case 'source':
      return address.raw
  }
}
