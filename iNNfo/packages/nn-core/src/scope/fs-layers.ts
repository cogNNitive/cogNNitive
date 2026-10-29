import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { parseKnowledge } from '../parser/index.js'
import { asJson } from './json.js'
import type { LoadedChain } from './resolve.js'
import type { DocumentFailure, JsonValue, ScopeChain, ScopeNode } from './types.js'

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v)

/**
 * Slot fillers declared in a marker's frontmatter: `fills.<procedure id>.<slot>`. Only
 * the well-formed shape is kept; a procedure entry that is not a map is not a fill table.
 */
function fillsOf(frontmatter: unknown): Record<string, Record<string, JsonValue>> | null {
  const raw = isPlainObject(frontmatter) ? frontmatter['fills'] : undefined
  if (!isPlainObject(raw)) return null
  // `fromEntries` defines own properties, so a procedure named `__proto__` is data, not a prototype swap.
  const fills = Object.fromEntries(
    Object.entries(raw)
      .filter((entry): entry is [string, Record<string, unknown>] => isPlainObject(entry[1]))
      .map(([procedure, slots]) => [
        procedure,
        Object.fromEntries(Object.entries(slots).map(([slot, v]) => [slot, asJson(v)])),
      ]),
  )
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
  shown: string,
): ScopeNode | DocumentFailure {
  if (path === null) return { ...base, values: {} }
  let read: ReturnType<typeof readValuesDoc>
  try {
    read = readValuesDoc(path)
  } catch (error) {
    return { ok: false, code: 'UNREADABLE_DOCUMENT', path: shown, detail: error instanceof Error ? error.message : String(error) }
  }
  return read.fills ? { ...base, values: read.values, fills: read.fills } : { ...base, values: read.values }
}

const failed = (n: ScopeNode | DocumentFailure): n is DocumentFailure => 'ok' in n

export type ChainLoad = { ok: true; loaded: LoadedChain } | DocumentFailure

/**
 * Loads the nodes of a folder chain: one `ScopeNode` per link, values read through
 * nn-core's parser. `floorDoc` is the blueprint's defaults document, located and injected
 * by the caller (only the caller knows which blueprint package applies); it becomes the
 * floor node, named `bluepriNNt:<label>`. Nothing is read beyond the marker documents
 * and the floor document. A document that cannot be read is an `UNREADABLE_DOCUMENT`
 * result naming it (domain-relative; the floor by its file name), never an exception.
 */
export function loadChain(
  chain: ScopeChain,
  opts: { floorDoc?: { label: string; path: string } } = {},
): ChainLoad {
  const nodes: ScopeNode[] = []
  for (const link of chain.links) {
    const node = nodeOf(
      { id: link.dir, kind: link.kind, doc: link.valuesDoc, isolate: link.isolate },
      link.valuesDoc === null ? null : join(chain.root, link.valuesDoc),
      link.valuesDoc ?? link.dir,
    )
    if (failed(node)) return node
    nodes.push(node)
  }
  const { floorDoc } = opts
  if (!floorDoc) return { ok: true, loaded: { floor: null, nodes } }
  const floor = nodeOf(
    { id: `bluepriNNt:${floorDoc.label}`, kind: 'floor', doc: basename(floorDoc.path), isolate: false },
    floorDoc.path,
    basename(floorDoc.path),
  )
  if (failed(floor)) return floor
  return { ok: true, loaded: { floor, nodes } }
}
