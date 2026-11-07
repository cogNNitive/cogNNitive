/**
 * Cognitivize in place (Node only; exported from `index.ts`, never from
 * `browser.ts`). The ONLY code that creates or refreshes a sidecar.
 */
import { promises as fsp } from 'node:fs'
import * as path from 'node:path'
import {
  checkPathBudget,
  isExcludedPath,
  isNNName,
  isSidecarName,
  parseName,
  sidecarPathOf,
} from '../naming/contract.js'
import { readOrNull, sha256Hex, writeOnce, type WriteOnceResult } from '../writeOnce/fs.js'
import {
  TEXT_NATIVE_FORMATS,
  buildSidecar,
  parseSidecarFrontmatter,
  type Normalizer,
} from './sidecar.js'

/** Where a copied file came from: merged into its sidecar as the origin keys. */
export interface ImportOrigin {
  synchronization: string
  origin_uri: string
  origin_path: string
}

export interface CognitivizeOptions {
  /** Origin keys for the sidecar; `retrieved_at` is the copy time. */
  origin?: ImportOrigin
  normalizer?: Normalizer
  now?: () => Date
  /** Platform whose path budget applies; defaults to `process.platform`. A test seam. */
  platform?: string
}

export type RejectReason =
  | 'sidecar'
  | 'nn-document'
  | 'excluded'
  | 'path-too-long'
  | 'not-found'
  | 'no-extension'

export type CognitivizeResult =
  | { status: 'written' | 'refreshed' | 'unchanged'; sidecar: string; sha256: string }
  | { status: 'requires-normalizer'; path: string }
  | { status: 'rejected'; path: string; reason: RejectReason }

const toPosix = (p: string): string => p.replace(/\\/g, '/')

/** ISO 8601 UTC at seconds precision. */
const isoSeconds = (at: Date): string => at.toISOString().replace(/\.\d{3}Z$/, 'Z')

export async function cognitivize(
  root: string,
  rel: string,
  o: CognitivizeOptions = {},
): Promise<CognitivizeResult> {
  const rootAbs = path.resolve(root)
  const abs = path.resolve(rootAbs, rel)
  const within = path.relative(rootAbs, abs)
  if (within === '' || within.startsWith('..') || path.isAbsolute(within)) {
    throw new RangeError(`${rel}: path escapes the workspace root`)
  }
  const relPath = toPosix(within)
  const reject = (reason: RejectReason): CognitivizeResult => ({ status: 'rejected', path: relPath, reason })

  if (isSidecarName(relPath)) return reject('sidecar')
  if (isNNName(relPath)) return reject('nn-document')
  if (isExcludedPath(relPath)) return reject('excluded')
  const sidecarRel = sidecarPathOf(relPath)
  if (!checkPathBudget(path.join(rootAbs, sidecarRel), o.platform ?? process.platform).ok) {
    return reject('path-too-long')
  }
  const parsed = parseName(relPath.slice(relPath.lastIndexOf('/') + 1))
  if (parsed.kind !== 'file' || parsed.ext === '') return reject('no-extension')
  const stat = await fsp.stat(abs).catch(() => null)
  if (!stat?.isFile()) return reject('not-found')

  const bytes = await fsp.readFile(abs)
  const sha256 = sha256Hex(bytes)
  const sidecarAbs = path.join(rootAbs, sidecarRel)
  const existing = await readOrNull(sidecarAbs)
  const previous = existing ? parseSidecarFrontmatter(existing.toString('utf8')) : null
  if (previous && String(previous['sha256'] ?? '').toLowerCase() === sha256) {
    return { status: 'unchanged', sidecar: sidecarRel, sha256 }
  }

  const format = parsed.ext.toLowerCase()
  // Text-native subjects are their own text, so the sidecar never gets a body;
  // an injected normalizer is still consulted for the metadata it adds.
  const textNative = TEXT_NATIVE_FORMATS.has(format)
  if (!textNative && !o.normalizer) return { status: 'requires-normalizer', path: relPath }
  const normalized = o.normalizer ? await o.normalizer({ path: relPath, ext: format, bytes }) : undefined
  const nowIso = isoSeconds((o.now ?? (() => new Date()))())
  const text = buildSidecar({
    sourceFile: relPath,
    sha256,
    sizeBytes: bytes.byteLength,
    sourceFormat: format,
    normalizedAt: nowIso,
    normalizedBy: normalized?.normalizedBy,
    previous,
    metadata: { ...normalized?.metadata, ...(o.origin ? { ...o.origin, retrieved_at: nowIso } : {}) },
    body: textNative ? undefined : normalized?.body,
  })
  await fsp.writeFile(sidecarAbs, text, 'utf8')
  return { status: existing ? 'refreshed' : 'written', sidecar: sidecarRel, sha256 }
}

export type ImportRawResult =
  | { status: 'imported' | 'deduplicated'; path: string; cognitivize: CognitivizeResult }
  | { status: 'rejected'; path: string; reason: 'sidecar' | 'nn-document' | 'not-found' }

/** Directory of the default raw-import location. */
const IMPORT_DIR = 'sources/import'

export interface ImportRawOptions extends CognitivizeOptions {
  /** Workspace-relative landing directory; defaults to `sources/import`. */
  dir?: string
}

/**
 * Copies an external file verbatim into `o.dir` (default `sources/import/`) as a new write-once
 * family member (always suffixed, identical bytes dedupe), then cognitivizes
 * the copy. The external location is only read.
 */
export async function importRaw(
  root: string,
  externalAbs: string,
  o: ImportRawOptions = {},
): Promise<ImportRawResult> {
  const base = path.basename(externalAbs)
  const rejected = (reason: 'sidecar' | 'nn-document' | 'not-found'): ImportRawResult => ({
    status: 'rejected',
    path: externalAbs,
    reason,
  })
  if (isSidecarName(base)) return rejected('sidecar')
  if (isNNName(base)) return rejected('nn-document')
  const bytes = await readOrNull(externalAbs).catch(() => null)
  const parsed = parseName(base)
  if (bytes === null || parsed.kind !== 'file') return rejected('not-found')

  const written: WriteOnceResult = await writeOnce(
    root,
    { dir: o.dir ?? IMPORT_DIR, key: parsed.key, ext: parsed.ext },
    bytes,
    { now: o.now, platform: o.platform },
  )
  const result = await cognitivize(root, written.path, o)
  return {
    status: written.status === 'written' ? 'imported' : 'deduplicated',
    path: written.path,
    cognitivize: result,
  }
}
