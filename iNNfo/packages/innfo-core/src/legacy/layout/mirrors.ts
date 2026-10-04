// legacy:cognitivize-in-place/layout-migrate
// Resolution of the retired `sources/nn/` mirror tree. Pure and browser-safe: it only plans.

import { sidecarPathOf } from '../../naming/contract.js'
import type { Op, Problem } from '../index.js'

const NN_ROOT = 'sources/nn/'
const INDEX_PATH = 'sources/nn/index.md'
/** Scratch directory read by `cognitivizePreservedBodies`: `<dir>/<subject path>.md`. */
const STAGING_ROOT = 'staging/migration/'
/** Formats whose file is its own text, so their sidecar carries no body (mirrors core `TEXT_NATIVE_FORMATS`). */
const TEXT_NATIVE = new Set(['md', 'csv', 'json'])
/** Staged for a subject whose sidecar needs no body: its presence is what makes `cognitivize` run. */
const STAGED_MARKER = 'Sidecar created by the layout migration.\n'

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/
const DECLARED_RAW_RE = /^(?:source_file|raw_path):\s*(.*?)\s*$/m

export interface MirrorPlanInput {
  text: ReadonlyMap<string, string>
  opaque: ReadonlySet<string>
  /** Final location of every path the folder moves relocate (`from` to `to`). */
  finalPath: Map<string, string>
  /** Old raw folder to its new folder, applied to a declared `source_file`. */
  remap(path: string): string
}

export interface MirrorPlan {
  ops: Op[]
  problems: Problem[]
  moved: Array<{ from: string; to: string }>
  deleted: string[]
  /** Subjects whose old mirror body is staged for their sidecar. */
  preserved: string[]
  /** `sources/nn/<rel>` path to the path a citation of it must name afterwards. */
  citationTargets: Map<string, string>
}

const extOf = (p: string): string => {
  const base = p.slice(p.lastIndexOf('/') + 1)
  const dot = base.lastIndexOf('.')
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : ''
}
const dirOf = (p: string): string => p.slice(0, Math.max(0, p.lastIndexOf('/')))
const stemOf = (p: string): string => {
  const base = p.slice(p.lastIndexOf('/') + 1)
  const dot = base.lastIndexOf('.')
  return dot > 0 ? base.slice(0, dot) : base
}
const isDocument = (p: string): boolean => /(_sidecar_NN|_NN)\.md$/.test(p)

function declaredRaw(content: string): string | null {
  const fm = FRONTMATTER_RE.exec(content)
  const raw = fm ? DECLARED_RAW_RE.exec(fm[1]) : null
  return raw ? raw[1].replace(/^["']|["']$/g, '').replace(/\\/g, '/') : null
}

function stripFrontmatter(content: string): string {
  return content.replace(FRONTMATTER_RE, '').replace(/^\r?\n/, '')
}

/** New home of a standalone mirror: `import/` and `conversations/` map onto the raw folders. */
function standaloneDestination(rel: string): string {
  if (rel.startsWith('import/')) return `sources/${rel}`
  if (rel.startsWith('conversations/')) return `sources/${rel}`
  return `sources/import/${rel}`
}

export function planMirrors(i: MirrorPlanInput): MirrorPlan {
  const plan: MirrorPlan = { ops: [], problems: [], moved: [], deleted: [], preserved: [], citationTargets: new Map() }
  const present = new Set([...i.text.keys(), ...i.opaque])
  const taken = new Set([...present].map((p) => i.finalPath.get(p) ?? p))
  const staged = new Set<string>()

  function rawFor(mirror: string, rel: string, content: string): string | null {
    const declared = declaredRaw(content)
    if (declared) {
      for (const candidate of [declared, i.remap(declared)]) {
        if (candidate !== mirror && present.has(candidate)) return candidate
      }
    }
    // A same-name, same-extension file is a collision (handled below), never a raw/mirror pair.
    const folders = /^(import|conversations)(\/|$)/.test(rel)
      ? [`sources/${dirOf(rel)}`.replace(/\/$/, '')]
      : [`sources/import/${dirOf(rel)}`.replace(/\/$/, ''), `sources/original/${dirOf(rel)}`.replace(/\/$/, '')]
    const found = new Set<string>()
    for (const p of present) {
      if (p === mirror || p.startsWith(NN_ROOT) || isDocument(p) || extOf(p) === extOf(mirror)) continue
      if (folders.includes(dirOf(p)) && stemOf(p) === stemOf(rel)) found.add(p)
    }
    return found.size === 1 ? [...found][0] : null
  }

  function stage(subject: string, body: string): void {
    if (staged.has(subject)) return
    staged.add(subject)
    plan.preserved.push(subject)
    plan.ops.push({ op: 'write', path: `${STAGING_ROOT}${subject}.md`, content: body })
  }

  for (const mirror of [...present].filter((p) => p.startsWith(NN_ROOT)).sort()) {
    const rel = mirror.slice(NN_ROOT.length)
    const content = i.text.get(mirror)

    if (mirror === INDEX_PATH) {
      plan.ops.push({ op: 'delete', path: mirror })
      plan.deleted.push(mirror)
      continue
    }

    const raw = content === undefined ? null : rawFor(mirror, rel, content)
    if (raw !== null && content !== undefined) {
      const subject = i.finalPath.get(raw) ?? raw
      const native = TEXT_NATIVE.has(extOf(subject))
      plan.ops.push({ op: 'delete', path: mirror })
      plan.deleted.push(mirror)
      stage(subject, native ? STAGED_MARKER : stripFrontmatter(content))
      plan.citationTargets.set(mirror, native ? subject : sidecarPathOf(subject))
      continue
    }

    const dest = standaloneDestination(rel)
    if (taken.has(dest)) {
      if (content !== undefined && i.text.get(dest) === content) {
        plan.ops.push({ op: 'delete', path: mirror })
        plan.deleted.push(mirror)
        plan.citationTargets.set(mirror, dest)
      } else {
        plan.problems.push({
          path: mirror,
          message: `Cannot move '${mirror}' to '${dest}': the destination already exists with different (or unreadable) content`,
          severity: 'error',
        })
      }
      continue
    }
    taken.add(dest)
    plan.ops.push({ op: 'move', from: mirror, to: dest })
    plan.moved.push({ from: mirror, to: dest })
    i.finalPath.set(mirror, dest)
    plan.citationTargets.set(mirror, dest)
    if (content !== undefined && TEXT_NATIVE.has(extOf(dest))) stage(dest, STAGED_MARKER)
  }
  return plan
}

const SOURCES_LINE_RE = /^[ \t]*(?:-[ \t]*)?(?:sources|source|derived_from)::?[^\n]*$/gm

/**
 * Old unqualified citations (`market.md@## H`) implied the `sources/nn/` prefix. Rewrite them, in
 * `sources::`/`derived_from::` lines only, to the path their mirror now resolves to.
 */
export function bareCitationRewriter(citationTargets: ReadonlyMap<string, string>): (content: string) => string {
  const targets = new Map<string, string>()
  for (const [mirror, target] of citationTargets) targets.set(mirror.slice(NN_ROOT.length), target)
  if (targets.size === 0) return (content) => content
  const escaped = [...targets.keys()]
    .sort((a, b) => b.length - a.length)
    .map((rel) => rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const bare = new RegExp(`(?<![\\w/.-])(${escaped.join('|')})(?=[@#,\\]\\s"']|$)`, 'g')
  return (content) =>
    content.replace(SOURCES_LINE_RE, (line) => line.replace(bare, (rel) => targets.get(rel) ?? rel))
}
