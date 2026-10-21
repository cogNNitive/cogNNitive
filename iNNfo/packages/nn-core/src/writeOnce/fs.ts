/**
 * Write-once filesystem adapter (Node only; exported from `index.ts`, never
 * from `browser.ts`). `writeOnce` is the only producer write path: it never
 * opens an existing file for writing.
 */
import { promises as fsp } from 'node:fs'
import * as path from 'node:path'
import { createHash } from 'node:crypto'
import { parseSidecarFrontmatter } from '../cognitivize/sidecar.js'
import {
  checkPathBudget,
  familyOf,
  formatMemberName,
  isExcludedPath,
  nextStamp,
  parseName,
  sidecarPathOf,
  type UtcStamp,
} from '../naming/contract.js'
import { latestOfFamily, planGc, type FamilyMember } from './plan.js'

export type WriteOnceErrorCode = 'HASH_MISMATCH' | 'PATH_TOO_LONG' | 'OUTSIDE_ROOT'

export class WriteOnceError extends Error {
  readonly code: WriteOnceErrorCode
  /** The offending workspace-relative path (the stale input, or the over-long target). */
  readonly path: string
  constructor(code: WriteOnceErrorCode, offending: string, detail: string) {
    super(`${code}: ${offending}: ${detail}`)
    this.name = 'WriteOnceError'
    this.code = code
    this.path = offending
  }
}

export interface WriteOnceTarget {
  dir: string
  key: string
  ext: string
}

export interface WriteOnceOptions {
  /** Workspace-relative files the artifact derives from; the hash guard covers those with a sidecar. */
  inputs?: string[]
  now?: () => Date
  /** Platform whose path budget applies; defaults to `process.platform`. A test seam. */
  platform?: string
}

export type WriteOnceResult =
  | { status: 'written'; path: string }
  | { status: 'deduplicated'; path: string }

export function sha256Hex(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex')
}

const toPosix = (p: string): string => p.replace(/\\/g, '/')

function resolveInside(root: string, rel: string): string {
  const rootAbs = path.resolve(root)
  const target = path.resolve(rootAbs, rel)
  const within = path.relative(rootAbs, target)
  if (within.startsWith('..') || path.isAbsolute(within)) {
    throw new WriteOnceError('OUTSIDE_ROOT', rel, 'path escapes the workspace root')
  }
  return target
}

async function readOrNull(file: string): Promise<Buffer | null> {
  try {
    return await fsp.readFile(file)
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw e
  }
}

/** `sha256` recorded in the sidecar of `rawRel`; `null` when there is no sidecar; `''` when it carries none. */
export async function readSidecarSha256(root: string, rawRel: string): Promise<string | null> {
  const text = await readOrNull(resolveInside(root, sidecarPathOf(rawRel)))
  if (text === null) return null
  const value = parseSidecarFrontmatter(text.toString('utf8'))?.['sha256']
  return typeof value === 'string' ? value.toLowerCase() : ''
}

async function guardInputs(root: string, inputs: string[]): Promise<void> {
  for (const input of inputs) {
    const recorded = await readSidecarSha256(root, input)
    if (recorded === null) continue
    const raw = await readOrNull(resolveInside(root, input))
    const actual = raw === null ? '(missing)' : sha256Hex(raw)
    if (recorded !== actual) {
      throw new WriteOnceError('HASH_MISMATCH', toPosix(input), 'raw bytes differ from the sidecar sha256; cognitivize it again')
    }
  }
}

async function listFamily(root: string, t: WriteOnceTarget): Promise<FamilyMember[]> {
  let names: string[]
  try {
    names = await fsp.readdir(resolveInside(root, t.dir))
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw e
  }
  const dir = toPosix(t.dir).replace(/^\/+|\/+$/g, '')
  return names
    .filter((name) => {
      const parsed = parseName(name)
      return parsed.kind === 'file' && parsed.key === t.key && parsed.ext === t.ext
    })
    .map((name) => ({ path: dir ? `${dir}/${name}` : name }))
}

function stampOf(member: FamilyMember | undefined): UtcStamp | undefined {
  if (!member) return undefined
  const parsed = parseName(member.path.slice(member.path.lastIndexOf('/') + 1))
  return parsed.kind === 'file' ? parsed.stamp : undefined
}

function budgetOrThrow(root: string, rel: string, platform: string): void {
  const abs = resolveInside(root, rel)
  const budget = checkPathBudget(abs, platform)
  if (!budget.ok) {
    throw new WriteOnceError('PATH_TOO_LONG', toPosix(rel), `${budget.length} characters exceeds the ${budget.limit} limit`)
  }
}

/**
 * Writes `bytes` as a new, suffixed member of the family `(dir, key, ext)`.
 * Order: path budget, input hash guard, dedup against the latest member,
 * exclusive-create write (retrying with the next tie-break on `EEXIST`).
 */
export async function writeOnce(
  root: string,
  t: WriteOnceTarget,
  bytes: Uint8Array | string,
  o: WriteOnceOptions = {},
): Promise<WriteOnceResult> {
  const now = o.now ?? (() => new Date())
  const platform = o.platform ?? process.platform
  const dirRel = toPosix(t.dir).replace(/^\/+|\/+$/g, '')
  const memberRel = (stamp: UtcStamp): string => {
    const name = formatMemberName(t.key, t.ext, stamp)
    return dirRel ? `${dirRel}/${name}` : name
  }
  const buffer = typeof bytes === 'string' ? Buffer.from(bytes, 'utf8') : Buffer.from(bytes)

  // 1. path budget
  budgetOrThrow(root, memberRel(nextStamp(now())), platform)
  // 2. input hash guard
  await guardInputs(root, o.inputs ?? [])
  // 3. dedup against the latest member only
  const latest = latestOfFamily(await listFamily(root, t))
  if (latest) {
    const recorded = await readSidecarSha256(root, latest.path)
    const stored = recorded ? recorded : sha256Hex((await readOrNull(resolveInside(root, latest.path))) ?? Buffer.alloc(0))
    if (stored === sha256Hex(buffer)) return { status: 'deduplicated', path: latest.path }
  }
  // 4. exclusive-create write
  await fsp.mkdir(resolveInside(root, dirRel), { recursive: true })
  let stamp = nextStamp(now(), stampOf(latest))
  for (;;) {
    const rel = memberRel(stamp)
    budgetOrThrow(root, rel, platform)
    try {
      const handle = await fsp.open(resolveInside(root, rel), 'wx')
      try {
        await handle.writeFile(buffer)
      } finally {
        await handle.close()
      }
      return { status: 'written', path: rel }
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e
      stamp = { stamp: stamp.stamp, seq: stamp.seq + 1 }
    }
  }
}

/** Every write-once family in the workspace (excluded paths pruned; `_NN` documents are not members). */
export async function collectFamilies(root: string): Promise<FamilyMember[][]> {
  const rootAbs = path.resolve(root)
  const families = new Map<string, FamilyMember[]>()
  const walk = async (rel: string): Promise<void> => {
    const entries = await fsp.readdir(path.join(rootAbs, rel), { withFileTypes: true })
    for (const entry of entries) {
      const entryRel = rel ? `${rel}/${entry.name}` : entry.name
      if (isExcludedPath(entryRel)) continue
      if (entry.isDirectory()) {
        await walk(entryRel)
      } else if (entry.isFile()) {
        const family = familyOf(entryRel)
        if (!family) continue
        const id = JSON.stringify([family.dir, family.key, family.ext])
        const members = families.get(id) ?? []
        members.push({ path: entryRel })
        families.set(id, members)
      }
    }
  }
  await walk('')
  return [...families.values()]
}

/**
 * Deletes the intersection of the user-confirmed list and a freshly computed
 * plan, each member together with its sidecar. `citedPaths` is a provider so
 * the plan is recomputed at apply time (a member cited since the proposal
 * survives). With no confirmed paths nothing is deleted.
 */
export async function applyGc(
  root: string,
  confirmed: string[],
  o: { citedPaths: () => ReadonlySet<string> | Promise<ReadonlySet<string>> },
): Promise<{ deleted: string[] }> {
  if (confirmed.length === 0) return { deleted: [] }
  const plan = planGc({ families: await collectFamilies(root), citedPaths: await o.citedPaths() })
  const allowed = new Set(plan.candidates)
  const deleted: string[] = []
  for (const rel of confirmed.map(toPosix)) {
    if (!allowed.has(rel)) continue
    await fsp.rm(resolveInside(root, rel), { force: true })
    await fsp.rm(resolveInside(root, sidecarPathOf(rel)), { force: true })
    deleted.push(rel)
  }
  return { deleted: deleted.sort() }
}
