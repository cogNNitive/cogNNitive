/**
 * Refresh of a Synchronization from a local origin (Node only; never exported
 * from `browser.ts`). URL origins are downloaded by the skill, not here.
 *
 * Two landings, one origin:
 * - models (the files the origin itself would discover) are mirrored in place
 *   under `sources/sync/<alias>/<origin-relative path>`;
 * - every other file becomes a write-once member under
 *   `sources/import/<alias>/<origin-relative dir>/`, unless the origin is a
 *   domaiNN (then only its models matter).
 * The refresh plans every change first and writes afterwards, so a failed plan
 * leaves the workspace untouched. The origin is only ever read.
 */
import { promises as fsp, type Dirent } from 'node:fs'
import * as path from 'node:path'
import { SLUG_RE } from '../address/grammar.js'
import { importRaw, type Normalizer } from '../cognitivize/index.js'
import { parseFrontmatter } from '../parser/yaml.js'
import {
  ENTRYPOINT_FILENAME,
  checkPathBudget,
  isExcludedPath,
  isModelCandidate,
  isNNName,
  isSidecarName,
  isUnderRootSources,
  parseName,
  sidecarPathOf,
} from '../naming/contract.js'
import { latestOfFamily } from '../writeOnce/plan.js'
import { readOrNull, sha256Hex } from '../writeOnce/fs.js'
import { SYNC_DIR } from './address.js'
import type { Synchronization } from './declarations.js'

const IMPORT_DIR = 'sources/import'

export interface RefreshResult {
  alias: string
  status: 'refreshed' | 'unchanged' | 'unreachable' | 'skipped' | 'removed'
  /** Only the files that changed; `path` is relative to the origin, `null` means absent. */
  files: Array<{ path: string; before: string | null; after: string | null }>
  /** sha256 of the sorted `origin_path<TAB>sha256` lines of the landed content. */
  digestBefore: string
  digestAfter: string
}

export interface RefreshOptions {
  now?: () => Date
  /** Platform whose path budget applies; defaults to `process.platform`. A test seam. */
  platform?: string
  /** Converts non-text raw files into their sidecar body; without it they land without a sidecar. */
  normalizer?: Normalizer
}

interface OriginFile {
  rel: string
  abs: string
  bytes: Buffer
  sha: string
  model: boolean
}

const digestOf = (entries: Map<string, string>): string =>
  sha256Hex(
    [...entries]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([p, s]) => `${p}\t${s}\n`)
      .join(''),
  )

const isInside = (child: string, parent: string): boolean => {
  const rel = path.relative(parent, child)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

/** Files under `dir` (symlinks skipped), as posix paths relative to `dir` mapped to their sha256. */
async function shaTree(dir: string): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const walk = async (rel: string): Promise<void> => {
    let entries: Dirent[]
    try {
      entries = await fsp.readdir(path.join(dir, rel), { withFileTypes: true })
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return
      throw e
    }
    for (const entry of entries) {
      const entryRel = rel ? `${rel}/${entry.name}` : entry.name
      if (entry.isDirectory()) await walk(entryRel)
      else if (entry.isFile()) out.set(entryRel, sha256Hex(await fsp.readFile(path.join(dir, entryRel))))
    }
  }
  await walk('')
  return out
}

async function classify(rel: string, abs: string, inDomain: boolean): Promise<OriginFile | null> {
  const base = rel.slice(rel.lastIndexOf('/') + 1)
  const bytes = await fsp.readFile(abs)
  const file = { rel, abs, bytes, sha: sha256Hex(bytes) }
  if (isNNName(base)) {
    if (isSidecarName(base)) return null
    let frontmatter: Record<string, unknown> | null = null
    try {
      frontmatter = parseFrontmatter(bytes.toString('utf8')) as Record<string, unknown> | null
    } catch {
      return null
    }
    return frontmatter && isModelCandidate({ path: rel, frontmatter }) ? { ...file, model: true } : null
  }
  return inDomain ? null : { ...file, model: false }
}

async function enumerateOrigin(s: Synchronization, originAbs: string): Promise<OriginFile[]> {
  if (s.kind === 'file') {
    const found = await classify(path.basename(originAbs), originAbs, false)
    return found ? [found] : []
  }
  const inDomain = await fsp
    .lstat(path.join(originAbs, ENTRYPOINT_FILENAME))
    .then((st) => st.isFile())
    .catch(() => false)
  const out: OriginFile[] = []
  // Dirent reports a symlink as neither a file nor a directory, so links are never followed.
  const walk = async (rel: string): Promise<void> => {
    for (const entry of await fsp.readdir(path.join(originAbs, rel), { withFileTypes: true })) {
      const entryRel = rel ? `${rel}/${entry.name}` : entry.name
      if (isExcludedPath(entryRel) || isUnderRootSources(entryRel)) continue
      if (entry.isDirectory()) await walk(entryRel)
      else if (entry.isFile()) {
        const found = await classify(entryRel, path.join(originAbs, entryRel), inDomain)
        if (found) out.push(found)
      }
    }
  }
  await walk('')
  return out
}

/** The latest write-once member of the family `(dir, key, ext)`, as its sha256. */
async function latestMemberSha(root: string, dirRel: string, key: string, ext: string): Promise<string | null> {
  let names: string[]
  try {
    names = await fsp.readdir(path.join(root, dirRel))
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw e
  }
  const members = names
    .filter((name) => {
      const parsed = parseName(name)
      return parsed.kind === 'file' && parsed.key === key && parsed.ext === ext
    })
    .map((name) => ({ path: `${dirRel}/${name}` }))
  const latest = latestOfFamily(members)
  const bytes = latest ? await readOrNull(path.join(root, latest.path)) : null
  return bytes ? sha256Hex(bytes) : null
}

async function pruneEmptyDirs(from: string, stop: string): Promise<void> {
  let dir = from
  while (dir !== stop && isInside(dir, stop)) {
    const left = await fsp.readdir(dir).catch(() => null)
    if (!left || left.length > 0) return
    await fsp.rmdir(dir)
    dir = path.dirname(dir)
  }
}

export async function refreshSynchronization(
  root: string,
  s: Synchronization,
  o: RefreshOptions = {},
): Promise<RefreshResult> {
  if (!SLUG_RE.test(s.alias)) throw new RangeError(`SYNC_ALIAS_INVALID: "${s.alias}" is not a folder-safe slug`)
  const rootAbs = path.resolve(root)
  const mirrorDir = path.join(rootAbs, SYNC_DIR, s.alias)
  const platform = o.platform ?? process.platform
  const existing = await shaTree(mirrorDir)
  const idle = (status: 'skipped' | 'unreachable'): RefreshResult => {
    const digest = digestOf(existing)
    return { alias: s.alias, status, files: [], digestBefore: digest, digestAfter: digest }
  }

  if (s.state === 'paused') return idle('skipped')
  const originAbs = path.resolve(s.origin)
  const stat = await fsp.stat(originAbs).catch(() => null)
  if (!stat || (s.kind === 'file' ? !stat.isFile() : !stat.isDirectory())) return idle('unreachable')

  const [originReal, rootReal] = await Promise.all([fsp.realpath(originAbs), fsp.realpath(rootAbs)])
  if (isInside(originReal, rootReal)) {
    throw new RangeError(`SYNC_SELF_LOOP: origin ${s.origin} is inside the domaiNN; a mirror would recurse`)
  }
  if (isInside(rootReal, originReal)) {
    throw new RangeError(`SYNC_SELF_LOOP: the domaiNN is inside origin ${s.origin}; a mirror would recurse`)
  }

  // Plan: classify every origin file, compare with what already landed, check the path budget.
  const originFiles = await enumerateOrigin(s, originAbs)
  const before = new Map<string, string>()
  const after = new Map<string, string>()
  const files: RefreshResult['files'] = []
  const writes: Array<() => Promise<void>> = []
  const note = (p: string, b: string | null, a: string | null): void => {
    if (b !== null) before.set(p, b)
    if (a !== null) after.set(p, a)
  }
  const overBudget = (abs: string, rel: string): never | void => {
    const budget = checkPathBudget(abs, platform)
    if (!budget.ok) {
      throw new RangeError(`SYNC_PATH_TOO_LONG: ${rel} (${budget.length} characters exceeds the ${budget.limit} limit)`)
    }
  }

  const models = originFiles.filter((f) => f.model)
  for (const f of models) {
    const prior = existing.get(f.rel) ?? null
    note(f.rel, prior, f.sha)
    if (prior === f.sha) continue
    const target = path.join(mirrorDir, ...f.rel.split('/'))
    overBudget(target, f.rel)
    files.push({ path: f.rel, before: prior, after: f.sha })
    writes.push(async () => {
      await fsp.mkdir(path.dirname(target), { recursive: true })
      await fsp.writeFile(target, f.bytes)
    })
  }
  const planned = new Set(models.map((f) => f.rel))
  for (const [rel, prior] of existing) {
    if (planned.has(rel)) continue
    before.set(rel, prior)
    files.push({ path: rel, before: prior, after: null })
    writes.push(async () => {
      const target = path.join(mirrorDir, ...rel.split('/'))
      await fsp.rm(target, { force: true })
      await pruneEmptyDirs(path.dirname(target), mirrorDir)
    })
  }

  for (const f of originFiles.filter((x) => !x.model)) {
    const base = f.rel.slice(f.rel.lastIndexOf('/') + 1)
    const parsed = parseName(base)
    if (parsed.kind !== 'file' || parsed.ext === '') continue
    const folder = f.rel.includes('/') ? `/${f.rel.slice(0, f.rel.lastIndexOf('/'))}` : ''
    const dirRel = `${IMPORT_DIR}/${s.alias}${folder}`
    const prior = await latestMemberSha(rootAbs, dirRel, parsed.key, parsed.ext)
    note(f.rel, prior, f.sha)
    if (prior === f.sha) continue
    // Longest name this member can take: the stamp plus the sidecar suffix.
    overBudget(path.join(rootAbs, sidecarPathOf(`${dirRel}/${parsed.key}_00000000T000000Z-99.${parsed.ext}`)), f.rel)
    files.push({ path: f.rel, before: prior, after: f.sha })
    writes.push(async () => {
      const r = await importRaw(rootAbs, f.abs, {
        dir: dirRel,
        origin: { synchronization: s.alias, origin_uri: s.origin, origin_path: f.rel },
        now: o.now,
        platform: o.platform,
        normalizer: o.normalizer,
      })
      if (r.status === 'rejected') throw new Error(`SYNC_IMPORT_REJECTED: ${f.rel} (${r.reason})`)
    })
  }

  // Write.
  for (const write of writes) await write()

  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  return {
    alias: s.alias,
    status: files.length === 0 ? 'unchanged' : 'refreshed',
    files,
    digestBefore: digestOf(before),
    digestAfter: digestOf(after),
  }
}

/**
 * Removes every mirror whose alias has no Synchronization any more. Raw members
 * under `sources/import` are write-once and stay.
 */
export async function removeOrphanMirrors(root: string, aliases: string[]): Promise<RefreshResult[]> {
  const syncDir = path.join(path.resolve(root), SYNC_DIR)
  const entries = await fsp.readdir(syncDir, { withFileTypes: true }).catch(() => [] as Dirent[])
  const results: RefreshResult[] = []
  for (const entry of entries) {
    if (!entry.isDirectory() || aliases.includes(entry.name)) continue
    const dir = path.join(syncDir, entry.name)
    const tree = await shaTree(dir)
    await fsp.rm(dir, { recursive: true, force: true })
    results.push({
      alias: entry.name,
      status: 'removed',
      files: [...tree].map(([p, before]) => ({ path: p, before, after: null })),
      digestBefore: digestOf(tree),
      digestAfter: digestOf(new Map()),
    })
  }
  return results
}
