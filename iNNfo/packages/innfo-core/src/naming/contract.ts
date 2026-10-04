/**
 * NN naming contract: the ONLY place that defines what a `*_NN.md` filename
 * means, which role a file plays, how write-once families are keyed and
 * ordered, and how UTC stamps are spelled.
 *
 * Browser-safe and pure: no `fs`, no `path`, no `process`. Consumers import the
 * predicates; `scripts/lib/nn-name-regex-guard.js` fails the build when a
 * second `_NN.md` pattern appears elsewhere.
 */

export const ENTRYPOINT_FILENAME = 'domaiNN_NN.md'
export const SPEC_FILENAME = 'spec_NN.md'
export const SIDECAR_BLUEPRINT = 'sidecar'

/** The single `_NN.md` filename pattern (case-insensitive). */
const NN_SUFFIX_RE = /_NN\.md$/i
/** `<file>.<ext>_sidecar_NN.md`: group 1 is the subject path (extension required). */
const SIDECAR_PATH_RE = /^(.*\.[^./\\]+)_sidecar_NN\.md$/i
/** Terminal write-once suffix of a stem: `_<YYYYMMDDTHHmmssZ>[-<seq>]`. */
const STAMP_SUFFIX_RE = /^(.+)_(\d{8}T\d{6}Z)(?:-(\d+))?$/

export interface UtcStamp {
  /** `YYYYMMDDTHHmmssZ` */
  stamp: string
  /** 1 means no tie-break number is spelled in the name. */
  seq: number
}

export type ParsedName =
  | { kind: 'nn'; basename: string; stem: string; sidecarOf?: string }
  | { kind: 'file'; basename: string; key: string; ext: string; stamp?: UtcStamp }

/** Last path segment, tolerating both separators. */
function baseOf(path: string): string {
  const i = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return i < 0 ? path : path.slice(i + 1)
}

export function parseName(basename: string): ParsedName {
  if (NN_SUFFIX_RE.test(basename)) {
    const stem = basename.replace(NN_SUFFIX_RE, '')
    const sidecar = SIDECAR_PATH_RE.exec(basename)
    return sidecar
      ? { kind: 'nn', basename, stem, sidecarOf: sidecar[1] }
      : { kind: 'nn', basename, stem }
  }
  const dot = basename.lastIndexOf('.')
  const hasExt = dot > 0
  const stem = hasExt ? basename.slice(0, dot) : basename
  const ext = hasExt ? basename.slice(dot + 1) : ''
  const m = STAMP_SUFFIX_RE.exec(stem)
  if (!m) return { kind: 'file', basename, key: stem, ext }
  return {
    kind: 'file',
    basename,
    key: m[1],
    ext,
    stamp: { stamp: m[2], seq: m[3] ? Number(m[3]) : 1 },
  }
}

/** `<stem>_NN.md`, appending `_<bp>` unless the stem already equals or ends with it. */
export function formatNNName(stem: string, blueprint: string): string {
  const s = stem.toLowerCase()
  const bp = blueprint.toLowerCase()
  const conforms = s === bp || s.endsWith(`_${bp}`)
  return conforms ? `${stem}_NN.md` : `${stem}_${blueprint}_NN.md`
}

export function formatMemberName(key: string, ext: string, stamp?: UtcStamp): string {
  const suffix = stamp ? `_${stamp.stamp}${stamp.seq > 1 ? `-${stamp.seq}` : ''}` : ''
  return `${key}${suffix}${ext ? `.${ext}` : ''}`
}

export function sidecarPathOf(rawPath: string): string {
  return `${rawPath}_sidecar_NN.md`
}

export function rawPathOfSidecar(sidecarPath: string): string | null {
  const m = SIDECAR_PATH_RE.exec(sidecarPath)
  return m ? m[1] : null
}

/** Display name of a document name or path: drops `_NN.md`, else a plain `.md`, else unchanged. */
export function displayStem(basename: string): string {
  if (NN_SUFFIX_RE.test(basename)) return basename.replace(NN_SUFFIX_RE, '')
  return basename.replace(/\.md$/i, '')
}

/** Procedure id: the stem minus a trailing `_procedures`, lower-cased, underscores to hyphens. */
export function procedureIdOf(basename: string): string {
  return displayStem(baseOf(basename)).replace(/_procedures$/i, '').toLowerCase().replace(/_/g, '-')
}

export type Role =
  | 'entrypoint'
  | 'spec'
  | 'sidecar'
  | 'lineage-record'
  | 'catalog'
  | 'procedure'
  | 'knowledge'
  | 'source'
  | 'artifact'

/**
 * Workspace roots whose contents are never discovered, cited, or projected.
 * Roots only: nested folders are not excluded by this set.
 */
export const IGNORED_DIRECTORIES: ReadonlySet<string> = new Set(['backups', 'archive', 'specs'])

/**
 * Parent-spec names whose Level-3 documents are never models (any version,
 * any `_suffix`). Maps the leading token to the role those documents play.
 */
const NON_KNOWLEDGE_BLUEPRINT_RE = /^(cognnitive|workspace|procedures|sources|artifacts|sidecar)(?:_|$)/i

function segmentsOf(path: string): string[] {
  return path.replace(/\\/g, '/').split('/').filter((s) => s && s !== '.')
}

/** Role of a file: a pure function of basename, `parent_spec` name, and sidecar presence. Never reads the folder. */
export function roleOf(i: { path: string; parentSpecName?: string; hasSidecar?: boolean }): Role {
  const base = baseOf(i.path)
  const parsed = parseName(base)
  if (parsed.kind === 'file') return i.hasSidecar ? 'source' : 'artifact'
  if (parsed.sidecarOf !== undefined) return 'sidecar'
  const lower = base.toLowerCase()
  if (lower === ENTRYPOINT_FILENAME.toLowerCase()) return 'entrypoint'
  if (lower === SPEC_FILENAME.toLowerCase()) return 'spec'
  const bp = NON_KNOWLEDGE_BLUEPRINT_RE.exec((i.parentSpecName ?? '').trim())?.[1].toLowerCase()
  switch (bp) {
    case 'cognnitive':
      return 'lineage-record'
    case 'sidecar':
      return 'sidecar'
    case 'procedures':
      return parsed.stem.toLowerCase() === 'procedures' ? 'catalog' : 'procedure'
    case 'workspace':
    case 'sources':
    case 'artifacts':
      return 'catalog'
    default:
      return 'knowledge'
  }
}

/** Scope rule (not a role): ignored roots, any `staging` segment, any dot-prefixed segment. */
export function isExcludedPath(path: string): boolean {
  const segs = segmentsOf(path)
  if (segs.length > 0 && IGNORED_DIRECTORIES.has(segs[0])) return true
  return segs.some((s) => s === 'staging' || (s.startsWith('.') && s !== '..'))
}

/** Family identity `(dir, key, ext)`; `null` for `_NN.md` documents, which are not write-once families. */
export function familyOf(path: string): { dir: string; key: string; ext: string } | null {
  const normalized = path.replace(/\\/g, '/')
  const parsed = parseName(baseOf(normalized))
  if (parsed.kind !== 'file') return null
  const slash = normalized.lastIndexOf('/')
  return { dir: slash < 0 ? '' : normalized.slice(0, slash), key: parsed.key, ext: parsed.ext }
}

/** Name-only order within a family: unsuffixed first, then `(stamp, seq)` numerically. Never reads mtime. */
export function compareMembers(a: string, b: string): number {
  const pa = parseName(baseOf(a))
  const pb = parseName(baseOf(b))
  const sa = pa.kind === 'file' ? pa.stamp : undefined
  const sb = pb.kind === 'file' ? pb.stamp : undefined
  if (!sa && !sb) return 0
  if (!sa) return -1
  if (!sb) return 1
  if (sa.stamp !== sb.stamp) return sa.stamp < sb.stamp ? -1 : 1
  return sa.seq - sb.seq
}

const pad = (n: number, width = 2): string => String(n).padStart(width, '0')

/** The only timestamp formatter: UTC, `YYYYMMDDTHHmmssZ`. */
export function formatUtcStamp(at: Date): string {
  return (
    `${pad(at.getUTCFullYear(), 4)}${pad(at.getUTCMonth() + 1)}${pad(at.getUTCDate())}` +
    `T${pad(at.getUTCHours())}${pad(at.getUTCMinutes())}${pad(at.getUTCSeconds())}Z`
  )
}

/**
 * Next write-once stamp: clamps to `max(now, latest.stamp)` so a new member
 * always sorts after the latest one, and bumps `seq` when the second is taken.
 */
export function nextStamp(at: Date, latest?: UtcStamp): UtcStamp {
  const now = formatUtcStamp(at)
  if (!latest || latest.stamp < now) return { stamp: now, seq: 1 }
  return { stamp: latest.stamp, seq: latest.seq + 1 }
}

/** Windows MAX_PATH (260) minus the terminator. */
const WIN32_PATH_LIMIT = 259

export function checkPathBudget(
  absPath: string,
  platform: string,
): { ok: true } | { ok: false; limit: 259; length: number } {
  if (platform === 'win32' && absPath.length > WIN32_PATH_LIMIT) {
    return { ok: false, limit: WIN32_PATH_LIMIT, length: absPath.length }
  }
  return { ok: true }
}

/** Reads `frontmatter.parent_spec.name`, tolerating a bare-string `parent_spec`. */
export function parentSpecNameOf(frontmatter: Record<string, unknown>): string | undefined {
  const parentSpec = frontmatter['parent_spec']
  if (!parentSpec) return undefined
  if (typeof parentSpec === 'string') return parentSpec
  if (typeof parentSpec === 'object') {
    const name = (parentSpec as { name?: unknown }).name
    return typeof name === 'string' ? name : undefined
  }
  return undefined
}

/**
 * THE discovery predicate: an `_NN.md` document of role `knowledge`, Level 3
 * with a `parent_spec`, outside every excluded path. Sidecars, lineage
 * records, catalogs, procedures, the entrypoint and specs are never models.
 */
export function isModelCandidate(f: { path: string; frontmatter: Record<string, unknown> }): boolean {
  if (f.frontmatter['level'] !== 3) return false
  if (!f.frontmatter['parent_spec']) return false
  if (isExcludedPath(f.path)) return false
  if (parseName(baseOf(f.path)).kind !== 'nn') return false
  return roleOf({ path: f.path, parentSpecName: parentSpecNameOf(f.frontmatter) }) === 'knowledge'
}

/** A published-spec style version token inside a stem: `_V_<major>-<minor>-<patch>`. */
const VERSION_TOKEN_RE = /_V_\d+-\d+-\d+/i
/** Stems of the Level 0 / Level 1 specifications, exempt from the invariant (optionally versioned). */
const STRUCTURAL_STEM_RE = /^(?:iNNfo|defiNNition|defiNNe|meta-bluepriNNt)(?:_V_\d+-\d+-\d+)?$/i

/** Blueprint name of a `parent_spec` name: trimmed, without a trailing `_V_x-y-z` version. */
export function blueprintNameOf(parentSpecName: string): string {
  return parentSpecName.trim().replace(/_V_\d+-\d+-\d+$/i, '')
}

/**
 * The `_NN` invariant: the stem of a `*_NN.md` document equals `<bp>` or ends
 * with `_<bp>` (case-insensitive) and carries no `_V_<version>` token.
 * Returns `null` when the name conforms, is exempt (entrypoint, `spec_NN.md`,
 * Level 0 / Level 1 specs), is not an `_NN.md` name, or `bp` is unknown and the
 * version rule is not violated. Otherwise returns the conforming file name.
 */
export function checkNameInvariant(path: string, bp?: string): { expected: string } | null {
  const base = baseOf(path)
  const parsed = parseName(base)
  if (parsed.kind !== 'nn') return null
  const lower = base.toLowerCase()
  if (lower === ENTRYPOINT_FILENAME.toLowerCase() || lower === SPEC_FILENAME.toLowerCase()) return null
  if (STRUCTURAL_STEM_RE.test(parsed.stem)) return null
  const hasVersion = VERSION_TOKEN_RE.test(parsed.stem)
  const stem = parsed.stem.replace(VERSION_TOKEN_RE, '')
  const blueprint = bp?.trim()
  if (!blueprint) return hasVersion ? { expected: `${stem}_NN.md` } : null
  const s = stem.toLowerCase()
  const b = blueprint.toLowerCase()
  const conforms = !hasVersion && (s === b || s.endsWith(`_${b}`))
  return conforms ? null : { expected: formatNNName(stem, blueprint) }
}

/** True for any `_NN.md` document name (sidecars included); reads the basename of a path. */
export function isNNName(nameOrPath: string): boolean {
  return NN_SUFFIX_RE.test(baseOf(nameOrPath))
}

/** True for a `<file>.<ext>_sidecar_NN.md` name or path. */
export function isSidecarName(nameOrPath: string): boolean {
  return SIDECAR_PATH_RE.test(nameOrPath)
}

/** Completes a bare name, or one ending in `_NN`, into a `_NN.md` filename. */
export function ensureNNFilename(name: string): string {
  if (NN_SUFFIX_RE.test(name)) return name
  return /_NN$/i.test(name) ? `${name}.md` : `${name}_NN.md`
}
