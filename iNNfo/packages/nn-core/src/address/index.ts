/**
 * The unified address grammar: `<hierarchical-id>[@<unit>]` (design section 6).
 * Pure and browser-safe. `parse.ts` and `format.ts` are the only implementation.
 */

export type ModelId = string & { readonly __brand: 'ModelId' }

export type Unit =
  | { kind: 'element'; slug: string; field?: string }
  | { kind: 'body'; slug: string }
  | { kind: 'cell'; matrix: string; row: string; col: string }
  | { kind: 'concept'; concept: string; field?: string }
  | { kind: 'matrix'; matrix: string }

export type Address =
  /** A model id with no unit. */
  | { kind: 'model'; model: ModelId }
  /** A unit of a model; `model: null` is a relative address (same model as the containing document). */
  | { kind: 'unit'; model: ModelId | null; unit: Unit }
  /** A blueprint definition: `specs/<family>[@concept:<Name>[&field] | @matrix:<slug>]`. */
  | { kind: 'blueprint'; family: string; unit: Extract<Unit, { kind: 'concept' | 'matrix' }> | null }
  /** A raw-file citation (non-model file); classified here, parsed by the source-citation branch. */
  | { kind: 'source'; raw: string }

export type AddressErrorCode =
  | 'ADDRESS_MALFORMED'
  | 'MODEL_CITED_BY_PATH'
  | 'NN_DOCUMENT_CITED_BY_HEADING'

export interface AddressError {
  kind: 'error'
  code: AddressErrorCode
  /** The offending segment (empty string when the value or a segment is empty). */
  segment: string
  message: string
  /** Set when the input is a form this grammar removed. */
  removed?: string
}

export function isAddressError(value: Address | AddressError): value is AddressError {
  return value.kind === 'error'
}

export { parseAddress } from './parse.js'
export { formatAddress } from './format.js'
