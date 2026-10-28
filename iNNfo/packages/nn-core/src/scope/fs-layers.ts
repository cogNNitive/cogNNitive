import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { parseKnowledge } from '../parser/index.js'
import type { LoadedChain } from './resolve.js'
import type { JsonValue, ScopeChain, ScopeNode } from './types.js'

/** Keeps what JSON can carry; anything else (a Date, undefined, a function) becomes its text. */
function asJson(value: unknown): JsonValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value)
  if (Array.isArray(value)) return value.map(asJson)
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, asJson(v)]))
  }
  return String(value)
}

/**
 * The local values of a document: the `key:: value` fields of the first element of its
 * first concept section, in document order (an `# NN index` section holds no element).
 */
function localValues(path: string): Record<string, JsonValue> {
  const parsed = parseKnowledge(readFileSync(path, 'utf-8'))
  for (const [, elements] of parsed.elements.entries()) {
    const first = elements[0]
    if (first) return Object.fromEntries(Object.entries(first.fields).map(([k, v]) => [k, asJson(v)]))
  }
  return {}
}

/**
 * Loads the nodes of a folder chain: one `ScopeNode` per link, values read through
 * nn-core's parser. `floorDoc` is the blueprint's defaults document, located and injected
 * by the caller (only the caller knows which blueprint package applies); it becomes the
 * floor node, named `bluepriNNt:<label>`. Nothing is read beyond the marker documents
 * and the floor document.
 */
export function loadChain(
  chain: ScopeChain,
  opts: { floorDoc?: { label: string; path: string } } = {},
): LoadedChain {
  const nodes: ScopeNode[] = chain.links.map((link) => ({
    id: link.dir,
    kind: link.kind,
    doc: link.valuesDoc,
    isolate: link.isolate,
    values: link.valuesDoc === null ? {} : localValues(join(chain.root, link.valuesDoc)),
  }))
  const { floorDoc } = opts
  const floor: ScopeNode | null = floorDoc
    ? {
        id: `bluepriNNt:${floorDoc.label}`,
        kind: 'floor',
        doc: basename(floorDoc.path),
        isolate: false,
        values: localValues(floorDoc.path),
      }
    : null
  return { floor, nodes }
}
