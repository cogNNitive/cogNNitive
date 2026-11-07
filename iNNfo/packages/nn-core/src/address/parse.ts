import { parseName, roleOf } from '../naming/contract.js'
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
import type { Address, AddressError, ModelId, Unit } from './index.js'

const GRAMMAR_HINT = 'use `<hierarchical-id>@<slug>` (for example `series-a/episode-1@scene-1`)'
const URL_RE = /^[a-z][a-z0-9+.-]*:\/\//i
const WINDOWS_ABSOLUTE_RE = /^[a-zA-Z]:[/\\]/
const LINE_ANCHOR_RE = /[#@]L\d+(-L\d+)?$/i
const SOURCE_EXTENSION_RE = /\.(md|csv|json)$/i
const CHANGES_STEM_RE = /_changes$/i

function malformed(segment: string, expected: string, removed?: string): AddressError {
  const shown = segment === '' ? 'an empty segment' : `\`${segment}\``
  const error: AddressError = {
    kind: 'error',
    code: 'ADDRESS_MALFORMED',
    segment,
    message: `Malformed address: ${shown} is not ${expected}; ${GRAMMAR_HINT}.`,
  }
  return removed ? { ...error, removed } : error
}

function removedForm(raw: string, form: string, shape: string): AddressError {
  return {
    kind: 'error',
    code: 'ADDRESS_MALFORMED',
    segment: raw,
    removed: form,
    message: `The ${form} \`${shape}\` is removed and is never resolved by title; ${GRAMMAR_HINT}.`,
  }
}

function parseSourceClass(path: string, raw: string): Address | AddressError {
  const base = path.slice(path.lastIndexOf('/') + 1)
  const parsed = parseName(base)
  const sourcePrefix = path.startsWith('sources/')
  if (!sourcePrefix && parsed.kind === 'nn' && parsed.sidecarOf === undefined) {
    const isChangeset = CHANGES_STEM_RE.test(parsed.stem)
    const role = roleOf({ path: base, parentSpecName: isChangeset ? 'changes' : undefined })
    if (role === 'changeset') {
      return {
        kind: 'error',
        code: 'NN_DOCUMENT_CITED_BY_HEADING',
        segment: raw,
        message: `A changeset is not cited by heading (\`@## NN Change: <id>\` is removed); address a change by its model id and slug, ${GRAMMAR_HINT}.`,
      }
    }
    if (role === 'knowledge') {
      return {
        kind: 'error',
        code: 'MODEL_CITED_BY_PATH',
        segment: path,
        message: `A model is not cited by file path (\`${path}\`); ${GRAMMAR_HINT}.`,
      }
    }
  }
  return { kind: 'source', raw }
}

function parseModelId(part: string): ModelId | AddressError {
  const segments = part.split('/')
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    if (i === 0) {
      if (!HEAD_RE.test(segment)) return malformed(segment, 'a valid model-id head')
    } else if (!SLUG_RE.test(segment)) {
      return malformed(segment, 'a lowercase slug')
    }
  }
  return part as ModelId
}

export function parseUnit(rest: string): Unit | AddressError {
  const parts = rest.split('&')
  const [head, second, third, ...extra] = parts
  if (extra.length > 0) return malformed(rest, 'a unit with at most three parts')

  if (head.startsWith(CONCEPT_PREFIX)) {
    const concept = head.slice(CONCEPT_PREFIX.length)
    if (!CONCEPT_RE.test(concept)) return malformed(head, 'a concept name')
    if (third !== undefined) return malformed(rest, 'a concept unit with at most one field')
    if (second === undefined) return { kind: 'concept', concept }
    if (!FIELD_RE.test(second)) return malformed(second, 'a field name')
    return { kind: 'concept', concept, field: second }
  }

  if (head.startsWith(MATRIX_PREFIX)) {
    const matrix = head.slice(MATRIX_PREFIX.length)
    if (!SLUG_RE.test(matrix)) return malformed(head, 'a matrix slug')
    if (second !== undefined) return malformed(rest, 'a matrix unit with no sub-unit')
    return { kind: 'matrix', matrix }
  }

  if (!SLUG_RE.test(head)) return malformed(head, 'a lowercase slug')
  if (second === undefined) return { kind: 'element', slug: head }
  if (third !== undefined) {
    for (const segment of [second, third]) {
      if (!SLUG_RE.test(segment)) return malformed(segment, 'a lowercase slug')
    }
    return { kind: 'cell', matrix: head, row: second, col: third }
  }
  if (second === BODY_MARKER) return { kind: 'body', slug: head }
  if (!FIELD_RE.test(second)) return malformed(second, 'a field name')
  return { kind: 'element', slug: head, field: second }
}

function parseBlueprint(modelPart: string, rest: string | null): Address | AddressError {
  const family = modelPart.slice(RESERVED_HEAD.length + 1)
  if (!HEAD_RE.test(family)) return malformed(family, 'a blueprint family')
  if (rest === null) return { kind: 'blueprint', family, unit: null }
  const unit = parseUnit(rest)
  if ('code' in unit) return unit
  if (unit.kind !== 'concept' && unit.kind !== 'matrix') {
    return malformed(rest, 'a `concept:` or `matrix:` unit of a blueprint')
  }
  return { kind: 'blueprint', family, unit }
}

/**
 * Parse one address. Rules run in the order of design section 6: value hygiene,
 * source-citation classification, then the model grammar. Never touches the filesystem.
 */
export function parseAddress(input: string): Address | AddressError {
  const raw = String(input ?? '').trim()
  if (raw === '') return malformed('', 'a value')

  if (raw.startsWith('[[') || raw.endsWith(']]')) {
    return raw.includes('::')
      ? removedForm(raw, 'title-qualified reference', '[[Title :: Name]]')
      : removedForm(raw, 'wikilink reference', '[[Name]]')
  }
  if (raw.includes(' :: ')) return removedForm(raw, 'title-qualified reference', '[[Title :: Name]]')

  if (URL_RE.test(raw) || raw.startsWith('/') || raw.startsWith('\\') || WINDOWS_ABSOLUTE_RE.test(raw)) {
    return malformed(raw, 'a model address (URLs and absolute paths are not addresses)')
  }
  if (LINE_ANCHOR_RE.test(raw)) return malformed(raw, 'a model address (line anchors are not addresses)')

  const at = raw.indexOf('@')
  const modelPart = at === -1 ? raw : raw.slice(0, at)
  const rest = at === -1 ? null : raw.slice(at + 1)

  if (modelPart.includes('\\')) return malformed(modelPart, 'a model id (path separators are not allowed)')
  if (modelPart.split('/').includes('..')) return malformed('..', 'a model-id segment')

  if (SOURCE_EXTENSION_RE.test(modelPart)) return parseSourceClass(modelPart, raw)

  if (modelPart === RESERVED_HEAD) {
    return malformed(modelPart, 'a model id (`specs` is reserved for blueprint addresses)')
  }
  if (modelPart.startsWith(`${RESERVED_HEAD}/`)) return parseBlueprint(modelPart, rest)

  if (modelPart === '') {
    if (rest === null || rest === '') return malformed('', 'a unit after `@`')
    const unit = parseUnit(rest)
    return 'code' in unit ? unit : { kind: 'unit', model: null, unit }
  }

  const model = parseModelId(modelPart)
  if (typeof model !== 'string') return model
  if (rest === null) return { kind: 'model', model }
  if (rest === '') return malformed('', 'a unit after `@`')
  const unit = parseUnit(rest)
  return 'code' in unit ? unit : { kind: 'unit', model, unit }
}
