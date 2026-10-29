import { realpathSync } from 'node:fs'
import { isAbsolute, relative, resolve as resolvePath, sep } from 'node:path'
import { findScopeChain, loadElementChain, resolve } from '@cognnitive/nn-core'
import type {
  ElementLoadErrorCode,
  ScopeChain,
  ExplainTrace,
  JsonValue,
  LoadedChain,
  MergeStrategy,
  Supplier,
} from '@cognnitive/nn-core'
import { locateFloor } from './floor-doc.js'
import type { PackageOptions } from './floor-doc.js'

/**
 * `resolve_effective` and `explain`: which value applies at a document (or at one scope
 * element of it), and why. Both tools are thin: scopes come from nn-core's adapters, the
 * floor from `locateFloor`, and the value and trace from nn-core `resolve`. There is no
 * second fold here. Nothing is written, nothing throws: every failure is a `ToolFailure`.
 */

export type ToolErrorCode =
  | ElementLoadErrorCode
  | 'INVALID_ARGUMENT'
  | 'PATH_OUTSIDE_SCOPE'
  | 'UNSUPPORTED_STRATEGY'
  | 'AMBIGUOUS_FLOOR'
  | 'INVALID_PARENT_SPEC'
  | 'FLOOR_UNREADABLE'
  | 'INTERNAL_ERROR'

export interface ToolFailure {
  ok: false
  code: ToolErrorCode
  detail: string
  /** `NO_DOMAIN_ROOT`: the directories searched, nearest first. */
  searched?: string[]
  /** Document failures: the offending document, domain-relative. */
  path?: string
}

/** One scope of the chain the fold read, outermost first. */
export interface ChainNodeView {
  id: string
  kind: string
  doc: string | null
  isolate: boolean
}

export interface ResolveEffectiveResponse {
  ok: true
  key: string
  strategy: MergeStrategy
  present: boolean
  value: JsonValue
  winner: Supplier | null
  trace: ExplainTrace
}

export interface ExplainResponse {
  ok: true
  key: string
  strategy: MergeStrategy
  trace: ExplainTrace
  chain: ChainNodeView[]
  floor: Supplier | null
}

interface Parsed {
  path: string
  key: string
  strategy: string
  target: { concept: string; slug: string } | null
}

type Outcome =
  | { ok: true; loaded: LoadedChain; resolution: Extract<ReturnType<typeof resolve>, { ok: true }> }
  | ToolFailure

const invalid = (detail: string): ToolFailure => ({ ok: false, code: 'INVALID_ARGUMENT', detail })

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v)

const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v !== ''

function parseInput(input: unknown): Parsed | ToolFailure {
  if (!isPlainObject(input)) return invalid('the input must be an object with path, key and strategy')
  const { path, key, strategy, target } = input
  if (!nonEmpty(path) || path.includes('\0')) return invalid('path must be a non-empty string')
  if (!nonEmpty(key)) return invalid('key must be a non-empty string')
  if (!nonEmpty(strategy)) return invalid('strategy must be a non-empty string')
  if (target === undefined || target === null) return { path, key, strategy, target: null }
  if (!isPlainObject(target) || !nonEmpty(target['concept']) || !nonEmpty(target['slug'])) {
    return invalid('target must be an object with a non-empty concept and slug')
  }
  return { path, key, strategy, target: { concept: target['concept'], slug: target['slug'] } }
}

/** True when `abs` is `root` or lies inside it (pure path logic). */
function within(root: string, abs: string): boolean {
  const rel = relative(root, abs)
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel)
}

/** The real location of `abs`: links resolved. A path that does not exist keeps its lexical form. */
function realOrSelf(abs: string): string {
  try {
    return realpathSync(abs)
  } catch {
    return abs
  }
}

/** True when `abs` is the server root or lies inside it, lexically and once links are resolved. */
function insideRoot(rootDir: string, abs: string): boolean {
  const root = resolvePath(rootDir)
  return within(root, abs) && within(realOrSelf(root), realOrSelf(abs))
}

/** Replaces the absolute root prefix in `text` (either separator) with nothing: domain-relative. */
export function scrub(text: string, rootDir: string): string {
  const root = resolvePath(rootDir)
  const flags = process.platform === 'win32' ? 'gi' : 'g'
  let out = text
  for (const prefix of new Set([root, realOrSelf(root)])) {
    for (const variant of new Set([prefix, prefix.replaceAll('\\', '/'), prefix.replaceAll('/', '\\')])) {
      const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      out = out.replace(new RegExp(`${escaped}[\\\\/]?`, flags), '')
    }
  }
  return out
}

/**
 * The scope chain of a document or scope directory, bounded by the server root. Shared by
 * the scope tools: every failure is a `ToolFailure` with domain-relative text.
 */
export function locateChain(rootDir: string, path: string): { ok: true; chain: ScopeChain; abs: string } | ToolFailure {
  const abs = resolvePath(rootDir, path)
  if (!insideRoot(rootDir, abs)) {
    return { ok: false, code: 'PATH_OUTSIDE_SCOPE', detail: `${path} is outside the domain root` }
  }

  const found = findScopeChain(abs)
  if (!found.ok) {
    if (found.code === 'NO_DOMAIN_ROOT') {
      return { ok: false, code: 'NO_DOMAIN_ROOT', detail: 'no domaiNN_NN.md in the ancestry', searched: found.searched }
    }
    if (found.code === 'DUPLICATE_SCOPE_MARKER') {
      return { ok: false, code: 'DUPLICATE_SCOPE_MARKER', detail: `${found.dir || '.'} holds more than one scope marker: ${found.markers.join(', ')}` }
    }
    return { ok: false, code: found.code, detail: scrub(found.detail, rootDir), path: found.path }
  }
  if (!within(realOrSelf(resolvePath(rootDir)), realOrSelf(found.chain.root))) {
    return { ok: false, code: 'PATH_OUTSIDE_SCOPE', detail: `${path} belongs to a domaiNN that is not inside the domain root` }
  }
  return { ok: true, chain: found.chain, abs }
}

async function run(rootDir: string, input: unknown, opts: PackageOptions): Promise<Outcome> {
  const parsed = parseInput(input)
  if ('ok' in parsed) return parsed

  const located = locateChain(rootDir, parsed.path)
  if (!located.ok) return located
  const { abs } = located
  const found = { chain: located.chain }

  const floor = await locateFloor(found.chain, opts)
  if (!floor.ok) return floor

  const element = loadElementChain(abs, parsed.target, floor.floorDoc ? { floorDoc: floor.floorDoc } : {})
  if (!element.ok) {
    const { ok, code, detail, searched, path } = element
    return { ok, code, detail: scrub(detail, rootDir), ...(searched ? { searched } : {}), ...(path ? { path } : {}) }
  }

  const resolution = resolve(element.loaded, parsed.key, parsed.strategy)
  if (!resolution.ok) {
    return { ok: false, code: resolution.code, detail: `unsupported strategy "${resolution.strategy}"` }
  }
  return { ok: true, loaded: element.loaded, resolution }
}

async function guarded(rootDir: string, input: unknown, opts: PackageOptions): Promise<Outcome> {
  try {
    return await run(rootDir, input, opts)
  } catch (error) {
    return { ok: false, code: 'INTERNAL_ERROR', detail: 'internal error' }
  }
}

/**
 * The effective value of `key` at `input.path` (optionally at the scope element
 * `input.target`), with the merge strategy `input.strategy`, and the trace that explains it.
 * `rootDir` is the server's domain root: paths outside it are refused. `opts` points the
 * bluepriNNt package resolver at other global/skills folders (tests); the server passes none.
 */
export async function resolveEffective(
  rootDir: string,
  input: unknown,
  opts: PackageOptions = {},
): Promise<ResolveEffectiveResponse | ToolFailure> {
  const outcome = await guarded(rootDir, input, opts)
  if (!outcome.ok) return outcome
  const { resolution } = outcome
  return {
    ok: true,
    key: resolution.key,
    strategy: resolution.strategy,
    present: resolution.present,
    value: resolution.value,
    winner: resolution.explain.winner,
    trace: resolution.explain,
  }
}

/** The same trace as `resolveEffective`, plus the chain of scopes it was computed over. */
export async function explainEffective(
  rootDir: string,
  input: unknown,
  opts: PackageOptions = {},
): Promise<ExplainResponse | ToolFailure> {
  const outcome = await guarded(rootDir, input, opts)
  if (!outcome.ok) return outcome
  const { loaded, resolution } = outcome
  return {
    ok: true,
    key: resolution.key,
    strategy: resolution.strategy,
    trace: resolution.explain,
    chain: loaded.nodes.map((n) => ({ id: n.id, kind: n.kind, doc: n.doc, isolate: n.isolate })),
    floor: loaded.floor ? { scope: loaded.floor.id, doc: loaded.floor.doc } : null,
  }
}
