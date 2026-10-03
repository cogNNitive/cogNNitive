// legacy:cognitivize-in-place/layout-migrate

import type { DomainReader } from '../detect.js'
import type { Op, Problem } from '../index.js'
import { computePlanHash } from '../language-map.js'
import { bareCitationRewriter, planMirrors } from './mirrors.js'

export interface LayoutPlanDeps {
  /**
   * Convert an old local-time stamp (`YYYYMMDD-HHmmss`) to the contract UTC stamp
   * (`YYYYMMDDTHHmmssZ`). Injected because the planner is pure and browser-safe;
   * return null when the stamp cannot be converted.
   */
  localToUtc(localStamp: string): string | null
}

export interface LayoutMigrationReport {
  moved: Array<{ from: string; to: string }>
  deleted: string[]
  /** Subjects whose old `sources/nn/` mirror body is staged to become their sidecar body. */
  preservedBodies: string[]
  rewrittenFiles: string[]
  /** Retired content with no destination in the new layout, left in place. */
  unmigrated: string[]
  /** Citations whose target is under `sources/archive/` (never rewritten). */
  archiveCitations: Array<{ file: string; citation: string; target: string }>
  summary: string
}

export interface LayoutPlanResult {
  status: 'ready' | 'noop' | 'blocked'
  ops: Op[]
  problems: Problem[]
  report: LayoutMigrationReport
  planHash: string
}

/** Retired root folder -> destination folder. */
const FOLDER_MAP: ReadonlyArray<readonly [string, string]> = [
  ['export/', 'artifacts/'],
  ['sources/original/', 'sources/import/'],
  ['sources/export/', 'artifacts/'],
]

/** Retired content with no destination in the new layout; reported, never touched. */
const UNMIGRATED_PREFIXES = ['sources/archive/']

const IGNORED_ROOT_DIRS = new Set(['.git', 'node_modules', 'dist', 'coverage', 'backups'])
const OLD_STAMP = /_(\d{8}-\d{6})(?=\.[^./]+$)/
const TEXT_POLICY_LINE = '* -text'

// A path-like token: stops at whitespace, quotes, brackets, and the citation unit separators.
const PATH_CHARS = '[^\\s"\'`)\\]\\[<>,;|#@]'
const PATH_TOKEN = `${PATH_CHARS}*`
const MOVED_PATH_RE = new RegExp(
  `(?<![\\w/.-])(?:export|sources/original|sources/export|sources/nn)/${PATH_TOKEN}`,
  'g',
)
/** The workspace field naming the sources folder; the retired default pointed at the mirror tree. */
const SOURCES_DIR_RE = /^(sources_dir::[ \t]*)sources\/nn\/?[ \t]*$/gm
const ARCHIVE_CITATION_RE = new RegExp(
  `(?<![\\w/.-])(sources/archive/${PATH_CHARS}+)(@[^"'\`\\]\\n,]*)?`,
  'g',
)

interface DomainFiles {
  text: Map<string, string>
  opaque: Set<string>
}

async function readDomain(r: DomainReader): Promise<DomainFiles> {
  const text = new Map<string, string>()
  const opaque = new Set<string>()

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > 12) return
    for (const entry of await r.list(dir)) {
      if (!dir && IGNORED_ROOT_DIRS.has(entry)) continue
      const rel = dir ? `${dir}/${entry}` : entry
      if (r.isOpaque && (await r.isOpaque(rel))) {
        opaque.add(rel)
        continue
      }
      const content = await r.read(rel)
      if (content !== null) text.set(rel, content)
      else await walk(rel, depth + 1)
    }
  }

  await walk('', 0)
  return { text, opaque }
}

function destinationOf(from: string, deps: LayoutPlanDeps, problems: Problem[]): string | null {
  const folder = FOLDER_MAP.find(([retired]) => from.startsWith(retired))
  if (!folder) return null
  let rest = from.slice(folder[0].length)
  const stamp = rest.match(OLD_STAMP)
  if (stamp) {
    const utc = deps.localToUtc(stamp[1])
    if (utc) {
      rest = rest.replace(OLD_STAMP, `_${utc}`)
    } else {
      problems.push({
        path: from,
        message: `Old local-time stamp '${stamp[1]}' in '${from}' could not be converted to UTC; the name is kept`,
        severity: 'warning',
      })
    }
  }
  return `${folder[1]}${rest}`
}

function isInert(path: string): boolean {
  return path.startsWith('sources/archive/') || path.startsWith('staging/')
}

export async function planLayoutMigration(
  r: DomainReader,
  deps: LayoutPlanDeps,
): Promise<LayoutPlanResult> {
  const { text, opaque } = await readDomain(r)
  const problems: Problem[] = []
  const ops: Op[] = []
  const moved: Array<{ from: string; to: string }> = []
  const deleted: string[] = []
  const finalPath = new Map<string, string>()

  // 1. Moves, and deletes for byte-identical duplicates.
  const sources = [...text.keys(), ...opaque].sort()
  for (const from of sources) {
    const to = destinationOf(from, deps, problems)
    if (to === null) continue
    const taken = text.has(to) || opaque.has(to)
    if (taken) {
      const identical = text.has(from) && text.has(to) && text.get(from) === text.get(to)
      if (identical) {
        ops.push({ op: 'delete', path: from })
        deleted.push(from)
      } else {
        problems.push({
          path: from,
          message: `Cannot move '${from}' to '${to}': the destination already exists with different (or unreadable) content`,
          severity: 'error',
        })
      }
      continue
    }
    ops.push({ op: 'move', from, to })
    moved.push({ from, to })
    finalPath.set(from, to)
  }

  // 1b. The retired `sources/nn/` mirror tree: relocated or retired, bodies staged for sidecars.
  const mirrors = planMirrors({
    text,
    opaque,
    finalPath,
    remap: (p) => destinationOf(p, deps, []) ?? p,
  })
  ops.push(...mirrors.ops)
  moved.push(...mirrors.moved)
  deleted.push(...mirrors.deleted)
  problems.push(...mirrors.problems)

  const rewriteToken = (token: string): string => {
    if (!token.startsWith('sources/nn/')) return destinationOf(token, deps, []) ?? token
    const rest = token.slice('sources/nn/'.length)
    if (rest === '') return token
    const trailing = /\.+$/.exec(rest)?.[0] ?? ''
    const target = mirrors.citationTargets.get(token.slice(0, token.length - trailing.length))
    return target === undefined ? token : `${target}${trailing}`
  }

  const rewriteBare = bareCitationRewriter(mirrors.citationTargets)

  // 2. Citation rewrites in markdown (archive snapshots and staging are inert).
  const rewrittenFiles: string[] = []
  for (const [path, content] of [...text.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (isInert(path) || !path.endsWith('.md')) continue
    if (deleted.includes(path)) continue
    const rewritten = rewriteBare(content.replace(MOVED_PATH_RE, rewriteToken)).replace(
      SOURCES_DIR_RE,
      '$1sources/',
    )
    if (rewritten === content) continue
    const target = finalPath.get(path) ?? path
    ops.push({ op: 'write', path: target, content: rewritten })
    rewrittenFiles.push(target)
  }

  // 3. Text policy, only alongside real migration work.
  if (ops.length > 0) {
    const existing = text.get('.gitattributes') ?? ''
    if (!existing.split(/\r?\n/).includes(TEXT_POLICY_LINE)) {
      const separator = existing === '' || existing.endsWith('\n') ? '' : '\n'
      ops.push({ op: 'write', path: '.gitattributes', content: `${existing}${separator}${TEXT_POLICY_LINE}\n` })
      rewrittenFiles.push('.gitattributes')
    }
  }

  // 4. Report inert retired content and citations into the archive.
  const unmigrated = sources.filter((p) => UNMIGRATED_PREFIXES.some((prefix) => p.startsWith(prefix)))
  const archiveCitations: LayoutMigrationReport['archiveCitations'] = []
  for (const [path, content] of [...text.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (isInert(path) || !/\.(md|html?)$/.test(path)) continue
    for (const match of content.matchAll(ARCHIVE_CITATION_RE)) {
      const target = match[1]
      const citation = `${target}${match[2] ?? ''}`.trimEnd()
      archiveCitations.push({ file: path, citation, target })
      problems.push({
        path,
        message: `Citation '${citation}' targets archived snapshot '${target}'; it is left unchanged and still resolves as a plain path`,
        severity: 'warning',
      })
    }
  }

  const blocked = problems.some((p) => p.severity === 'error')
  const sorted = [...ops].sort((a, b) => opKey(a).localeCompare(opKey(b)))
  const status: LayoutPlanResult['status'] = blocked ? 'blocked' : ops.length === 0 ? 'noop' : 'ready'

  return {
    status,
    ops: sorted,
    problems,
    report: {
      moved,
      deleted,
      preservedBodies: mirrors.preserved,
      rewrittenFiles,
      unmigrated,
      archiveCitations,
      summary:
        status === 'noop'
          ? 'Layout is already up to date.'
          : `Layout migration ${blocked ? 'blocked' : 'planned'}: ${moved.length} moves, ${deleted.length} deletes, ${rewrittenFiles.length} rewrites, ${unmigrated.length} unmigrated.`,
    },
    planHash: computePlanHash(blocked ? [] : sorted),
  }
}

function opKey(op: Op): string {
  if (op.op === 'move') return `1:${op.from}->${op.to}`
  if (op.op === 'write') return `2:${op.path}`
  return `0:${op.path}`
}
