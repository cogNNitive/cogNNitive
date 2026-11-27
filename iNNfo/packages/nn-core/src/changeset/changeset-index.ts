/**
 * The persistent changeset index (changes-ledger-scaling S7): a derived, rebuildable
 * cache of `parseChangeset` outcomes, so a tool call parses only the changesets that are
 * new or changed since the last call. Node-only: NOT exported from `browser.ts`.
 *
 * Where it lives: `<defaultCacheDir()>/changeset-index/<root>-<version>.json`, where
 * `<root>` hashes the canonical absolute domaiNN root and `<version>` the index format.
 * `defaultCacheDir()` is the OS temp dir (`innfo-specs`) unless `INNFO_CACHE_DIR` says
 * otherwise, so the index is never inside the domaiNN tree and can never be committed
 * with it. The version is part of the name so two builds that parse differently (the
 * MCP bundle and the `dist` the scripts load) each keep their own warm index instead of
 * rebuilding each other's.
 *
 * It is never a source of truth: an entry is reused only while its file still has the
 * same size, mtime and ctime; a missing, corrupt, foreign or older-format index is
 * ignored and rebuilt from a scan. Deleting the file (or the whole folder) at any time
 * is safe: the next call parses every changeset again and returns the same result.
 * Writes go to a temp file renamed over the index, so a reader never sees a torn file;
 * concurrent writers race and the last rename wins, which only costs re-parses.
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createHash, randomBytes } from 'node:crypto'
import { parseChangeset } from './parser.js'
import type { ChangesetDocument } from './types.js'
import { defaultCacheDir } from '../cache-dir.js'

/**
 * Bump when the stored shape or what `parseChangeset` returns changes in a way its own
 * source text does not show (a helper it calls). The source text of `parseChangeset` is
 * part of the version too, so an edit to the parser itself rebuilds every index.
 */
const INDEX_FORMAT = 1
const INDEX_VERSION = `${INDEX_FORMAT}-${createHash('sha256').update(String(parseChangeset)).digest('hex').slice(0, 12)}`

/** One cached parse: the file identity it was taken from and the parse (`null` = does not parse). */
interface IndexEntry {
  s: number
  m: number
  c: number
  d: ChangesetDocument | null
}

interface IndexFile {
  version: string
  root: string
  entries: Record<string, IndexEntry>
}

/**
 * What a reader listed in this call: the directories it read (workspace-relative,
 * POSIX, `''` for the root) and every entry it saw in them. An index entry under a
 * listed directory that was not seen is a vanished file and is dropped.
 */
export interface ChangesetListing {
  dirs: ReadonlySet<string>
  seen: ReadonlySet<string>
}

function canonicalRoot(rootDir: string): string {
  const resolved = path.resolve(rootDir)
  let real = resolved
  try {
    real = fs.realpathSync.native(resolved)
  } catch {
    // a root that does not resolve keeps its resolved spelling
  }
  return process.platform === 'win32' ? real.toLowerCase() : real
}

/** The index file of the domaiNN at `rootDir`. Outside the domaiNN tree by construction. */
export function changesetIndexFile(rootDir: string): string {
  const key = createHash('sha256').update(canonicalRoot(rootDir)).digest('hex').slice(0, 32)
  return path.join(defaultCacheDir(), 'changeset-index', `${key}-${INDEX_VERSION}.json`)
}

function isEntry(value: unknown): value is IndexEntry {
  if (typeof value !== 'object' || value === null) return false
  const e = value as Record<string, unknown>
  return (
    typeof e.s === 'number' &&
    typeof e.m === 'number' &&
    typeof e.c === 'number' &&
    (e.d === null || (typeof e.d === 'object' && e.d !== undefined))
  )
}

/** The stored entries, or an empty map when the index is missing, unreadable, corrupt or foreign. */
function readIndex(file: string, root: string): Map<string, IndexEntry> {
  let parsed: unknown
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return new Map()
  }
  if (typeof parsed !== 'object' || parsed === null) return new Map()
  const index = parsed as Partial<IndexFile>
  if (index.version !== INDEX_VERSION || index.root !== root) return new Map()
  if (typeof index.entries !== 'object' || index.entries === null) return new Map()
  const entries = new Map<string, IndexEntry>()
  for (const [rel, entry] of Object.entries(index.entries)) {
    if (isEntry(entry)) entries.set(rel, entry)
  }
  return entries
}

/** Temp file + rename: a reader sees the old index or the new one, never a torn one. Best effort. */
function writeIndex(file: string, root: string, entries: Map<string, IndexEntry>): void {
  const body: IndexFile = { version: INDEX_VERSION, root, entries: Object.fromEntries(entries) }
  const tmp = `${file}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(tmp, JSON.stringify(body))
    fs.renameSync(tmp, file)
  } catch {
    // The index is an optimization: an unwritable cache, or a rename another writer
    // holds open (Windows), leaves the previous index in place.
    try {
      fs.rmSync(tmp, { force: true })
    } catch {
      // nothing left to clean
    }
  }
}

/** `parseChangeset(content)` without the raw text, or `null` when it does not parse. */
function parseForIndex(content: string): ChangesetDocument | null {
  try {
    const { rawContent: _raw, ...doc } = parseChangeset(content)
    return doc
  } catch {
    return null
  }
}

/**
 * The `parseChangeset` outcome of each candidate (workspace-relative POSIX path), read
 * through the persistent index. A candidate whose stat matches its entry is not read or
 * parsed; any other is read, parsed and stored. An unreadable candidate is absent from
 * the result and from the index. Returned documents carry no `rawContent` and are fresh
 * objects per call, so a caller may keep or mutate them.
 */
export function indexedChangesets(
  rootDir: string,
  candidates: readonly string[],
  listing: ChangesetListing,
): Map<string, ChangesetDocument | null> {
  const root = canonicalRoot(rootDir)
  const file = changesetIndexFile(rootDir)
  const entries = readIndex(file, root)
  let dirty = false
  const out = new Map<string, ChangesetDocument | null>()

  for (const rel of candidates) {
    const abs = path.join(rootDir, rel)
    // Stat before reading: a write after the stat leaves an entry keyed by the older
    // identity, which the next call re-parses. Never the reverse.
    let stat: fs.Stats | undefined
    try {
      stat = fs.statSync(abs, { throwIfNoEntry: false })
    } catch {
      stat = undefined
    }
    if (!stat || !stat.isFile()) {
      if (entries.delete(rel)) dirty = true
      continue
    }
    const known = entries.get(rel)
    if (known && known.s === stat.size && known.m === stat.mtimeMs && known.c === stat.ctimeMs) {
      out.set(rel, known.d)
      continue
    }
    let content: string
    try {
      content = fs.readFileSync(abs, 'utf8')
    } catch {
      if (entries.delete(rel)) dirty = true
      continue
    }
    const doc = parseForIndex(content)
    entries.set(rel, { s: stat.size, m: stat.mtimeMs, c: stat.ctimeMs, d: doc })
    dirty = true
    // The caller gets the same shape a warm call returns (a JSON round trip).
    out.set(rel, doc === null ? null : (JSON.parse(JSON.stringify(doc)) as ChangesetDocument))
  }

  for (const rel of [...entries.keys()]) {
    if (listing.seen.has(rel)) continue
    const slash = rel.lastIndexOf('/')
    if (!listing.dirs.has(slash === -1 ? '' : rel.slice(0, slash))) continue
    entries.delete(rel)
    dirty = true
  }

  if (dirty) writeIndex(file, root, entries)
  return out
}

/** A document of a changes folder, as the folder readers consume it. */
export interface ChangesDirChangeset {
  /** File name inside the folder. */
  name: string
  /** The `parseChangeset` outcome; `null` when the file does not parse. */
  doc: ChangesetDocument | null
}

/**
 * THE reader of a domaiNN's changes folder (`<root>/changes`): every entry `accept`
 * keeps, in directory order, with its `parseChangeset` outcome through the persistent
 * index of the folder's parent (the domaiNN root, shared with `loadChangeLog`). One
 * readdir plus one stat per accepted file; only new or changed files are read and
 * parsed. An unreadable entry is skipped; a missing folder is empty. Ordering is the
 * caller's (`compareChanges` for the log), never this list's.
 */
export function readChangesDir(
  changesDir: string,
  accept: (name: string) => boolean,
): ChangesDirChangeset[] {
  let names: string[]
  try {
    names = fs.readdirSync(changesDir)
  } catch {
    return []
  }
  const dir = path.basename(path.resolve(changesDir))
  const relOf = (name: string): string => `${dir}/${name}`
  const accepted = names.filter((name) => accept(name))
  const parses = indexedChangesets(path.dirname(path.resolve(changesDir)), accepted.map(relOf), {
    dirs: new Set([dir]),
    seen: new Set(names.map(relOf)),
  })
  const out: ChangesDirChangeset[] = []
  for (const name of accepted) {
    const rel = relOf(name)
    if (!parses.has(rel)) continue
    out.push({ name, doc: parses.get(rel)! })
  }
  return out
}
