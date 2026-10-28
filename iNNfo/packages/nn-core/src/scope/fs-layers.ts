import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { parseKnowledge } from '../parser/index.js'
import { asJson } from './json.js'
import type { LoadedChain } from './resolve.js'
import type { JsonValue, ScopeChain, ScopeNode } from './types.js'

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v)

/**
 * Slot fillers declared in a marker's frontmatter: `fills.<procedure id>.<slot>`. Only
 * the well-formed shape is kept; a procedure entry that is not a map is not a fill table.
 */
function fillsOf(frontmatter: unknown): Record<string, Record<string, JsonValue>> | null {
  const raw = isPlainObject(frontmatter) ? frontmatter['fills'] : undefined
  if (!isPlainObject(raw)) return null
  const fills: Record<string, Record<string, JsonValue>> = {}
  for (const [procedure, slots] of Object.entries(raw)) {
    if (!isPlainObject(slots)) continue
    fills[procedure] = Object.fromEntries(Object.entries(slots).map(([slot, v]) => [slot, asJson(v)]))
  }
  return Object.keys(fills).length > 0 ? fills : null
}

/**
 * What a values document supplies: the `key:: value` fields of the first element of its
 * first concept section, in document order (an `# NN index` section holds no element),
 * and the slot fills of its frontmatter.
 */
function readValuesDoc(path: string): {
  values: Record<string, JsonValue>
  fills: Record<string, Record<string, JsonValue>> | null
} {
  const parsed = parseKnowledge(readFileSync(path, 'utf-8'))
  const fills = fillsOf(parsed.frontmatter)
  for (const [, elements] of parsed.elements.entries()) {
    const first = elements[0]
    if (first) {
      return { values: Object.fromEntries(Object.entries(first.fields).map(([k, v]) => [k, asJson(v)])), fills }
    }
  }
  return { values: {}, fills }
}

function nodeOf(
  base: Pick<ScopeNode, 'id' | 'kind' | 'doc' | 'isolate'>,
  path: string | null,
): ScopeNode {
  if (path === null) return { ...base, values: {} }
  const { values, fills } = readValuesDoc(path)
  return fills ? { ...base, values, fills } : { ...base, values }
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
  const nodes = chain.links.map((link) =>
    nodeOf(
      { id: link.dir, kind: link.kind, doc: link.valuesDoc, isolate: link.isolate },
      link.valuesDoc === null ? null : join(chain.root, link.valuesDoc),
    ),
  )
  const { floorDoc } = opts
  const floor = floorDoc
    ? nodeOf(
        { id: `bluepriNNt:${floorDoc.label}`, kind: 'floor', doc: basename(floorDoc.path), isolate: false },
        floorDoc.path,
      )
    : null
  return { floor, nodes }
}
