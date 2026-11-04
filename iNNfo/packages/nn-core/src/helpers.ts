/**
 * Additive helpers for the format-core programmatic surface.
 * These do NOT change any existing behavior — they provide convenience
 * wrappers that the MCP server consumes.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { parseFrontmatter, parseKnowledge } from './parser/index.js'
import { buildDomainIndex, type DomainModelInput, type StorageDeclarationsResolver } from './domain/index.js'
import { isModelCandidate, isExcludedPath, parseName } from './naming/contract.js'
import { isDomainRoot } from './scope/root.js'

/* ── Version resolution ──────────────────────────────────────── */

/**
 * Read a model's own version from its frontmatter `knowledge_version`
 * (e.g. `V_1-0-0`). Returns `null` when absent or empty; the legacy version
 * key is not used as a source (the validator rejects it).
 */
export function resolveKnowledgeVersion(frontmatter: Record<string, unknown>): string | null {
  const v = frontmatter.knowledge_version
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null
}

/* ── Model scanning ──────────────────────────────────────────── */

export interface KnowledgeInfo {
  /** Hierarchical model id from the domain index (compact stem without `_NN`, or an instance id) */
  id: string
  /** Absolute filesystem path */
  path: string
  /** Version read from frontmatter `knowledge_version`, e.g. `V_0-1-2` */
  version: string | null
}

const MD_FILE_RE = /\.md$/i

/** Directories that must never be scanned for model files. */
const IGNORED_DIRS = new Set(['backups', 'archive', 'specs', 'node_modules', '.git'])

function isIgnoredDir(name: string): boolean {
  return name.startsWith('.') || IGNORED_DIRS.has(name.toLowerCase())
}

/**
 * `collectModels()` and `isReconcilableModel()` share ONE discoverable-model
 * predicate (`isModelCandidate`, `naming/contract.ts`) instead of two
 * divergent ones (H6). Walk-level directory pruning stays here: it walks
 * ABSOLUTE paths and prunes `node_modules`, `.git`, dot-dirs and
 * `IGNORED_DIRS` at every level, which `isIgnoredPath` (workspace-relative,
 * first-segment only) does not replace.
 *
 * Per-file order, cheapest checks first: extension -> `index.md` skip ->
 * `_NN.md` name (cheap, no I/O) -> read + parse frontmatter -> shared
 * predicate. Only `_NN.md` candidates are ever read from disk.
 */
interface RawModelCandidate {
  relPath: string
  path: string
  version: string | null
  input: DomainModelInput
}

/** `(concept, slug)` of every element of a document; a document that does not parse has none. */
function elementsOf(content: string): DomainModelInput['elements'] {
  try {
    const out: Array<{ concept: string; slug: string }> = []
    for (const [concept, nodes] of parseKnowledge(content).elements.entries()) {
      for (const node of nodes) if (node.slug) out.push({ concept, slug: node.slug })
    }
    return out
  } catch {
    return []
  }
}

async function collectModels(dir: string, rootDir: string, candidates: RawModelCandidate[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (isIgnoredDir(entry.name)) continue
      const child = join(dir, entry.name)
      // A nested domaiNN is its own root: its models are not the outer domaiNN's.
      if (isDomainRoot(child)) continue
      await collectModels(child, rootDir, candidates)
      continue
    }
    if (!entry.isFile()) continue
    if (!MD_FILE_RE.test(entry.name)) continue
    if (entry.name.toLowerCase() === 'index.md') continue
    if (parseName(entry.name).kind !== 'nn') continue

    const filePath = join(dir, entry.name)
    const relPath = relative(rootDir, filePath).split('\\').join('/')
    if (isExcludedPath(relPath)) continue

    let frontmatter: Record<string, unknown> | null = null
    let content = ''
    try {
      content = await readFile(filePath, 'utf-8')
      frontmatter = parseFrontmatter(content)
    } catch (err) {
      /* v8 ignore start */
      if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
        console.warn(`[helpers] Failed to read or parse candidate model ${filePath}: ${err}`)
      }
      /* v8 ignore stop */
      continue
    }
    if (!frontmatter) continue
    if (!isModelCandidate({ path: relPath, frontmatter })) continue

    const version = resolveKnowledgeVersion(frontmatter)

    candidates.push({ relPath, path: filePath, version, input: { path: relPath, frontmatter, elements: elementsOf(content) } })
  }
}

/** A discovered model: the plain-data input of the domain index plus its absolute path. */
export interface DiscoveredDomainModel {
  input: DomainModelInput
  path: string
  version: string | null
}

/**
 * Walk a domaiNN and describe every discoverable model as domain-index input
 * (skips `backups`, `archive`, `specs`, `node_modules`, `.git`, dot-directories
 * and nested domaiNNs). Discovery is path-agnostic: a misplaced instance is
 * still listed.
 */
export async function discoverDomainModels(rootDir: string): Promise<DiscoveredDomainModel[]> {
  const candidates: RawModelCandidate[] = []
  await collectModels(rootDir, rootDir, candidates)
  return candidates.map((c) => ({ input: c.input, path: c.path, version: c.version }))
}

/** Resolver used when the caller supplies none: no bluepriNNt declares storage, every model is compact. */
const NO_DECLARATIONS: StorageDeclarationsResolver = () => new Map()

/**
 * Scan a root directory (recursively) for discoverable iNNfo model files
 * (`_NN.md`, `level: 3`, resolvable `parent_spec` - see `isModelCandidate`).
 *
 * Ids come from the domain index: a compact model's id is its file stem
 * without `_NN`; an instance model's id is hierarchical. No id is a path, and
 * a stem shared by two files is never rewritten (the index reports
 * `DUPLICATE_MODEL_ID`; both files are listed under that id).
 * Returns an array of `KnowledgeInfo` sorted by id.
 */
export async function listKnowledge(
  rootDir: string,
  opts?: { declarations?: StorageDeclarationsResolver },
): Promise<KnowledgeInfo[]> {
  const found = await discoverDomainModels(rootDir)
  const byRel = new Map(found.map((f) => [f.input.path, f]))
  const index = buildDomainIndex(
    found.map((f) => f.input),
    opts?.declarations ?? NO_DECLARATIONS,
  )
  const models: KnowledgeInfo[] = []
  for (const m of index.models) {
    const f = byRel.get(m.path)
    if (f) models.push({ id: m.id, path: f.path, version: f.version })
  }
  models.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) || (a.path < b.path ? -1 : 1))
  return models
}
