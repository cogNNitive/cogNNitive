import type { ElementNode, ParsedKnowledge } from '../types/index.js'
import type {
  Executor,
  GraphDiagnostic,
  ProcedureArtifact,
  ProcedureGraph,
  ProcedureStep,
} from './types.js'

const EXECUTORS: readonly string[] = ['human', 'agent', 'engine']

/** How many attempts a loop target may take when it declares no `max_attempts`. */
export const DEFAULT_MAX_ATTEMPTS = 3

/**
 * `tool` aliases (design §4.6): when a Work has no `executor`, one of these literals read
 * from `tool` is taken as its executor. `console` maps to `human`, because the console is
 * where a person acts. Any other `tool` value keeps its meaning as a Tool reference.
 */
const TOOL_ALIASES: ReadonlyMap<string, Executor> = new Map([
  ['engine', 'engine'],
  ['agent', 'agent'],
  ['human', 'human'],
  ['console', 'human'],
])

/** A `{name}` placeholder in prose or a command. */
const SLOT_RE = /\{([A-Za-z_][\w-]*)\}/g

/** The slot names a text declares through `{name}` placeholders, in order, unique. */
export function slotNames(...texts: Array<string | undefined>): string[] {
  const out: string[] = []
  for (const text of texts) {
    if (!text) continue
    for (const m of text.matchAll(SLOT_RE)) if (!out.includes(m[1])) out.push(m[1])
  }
  return out
}

/** Replaces every `{name}` whose value is known; `{run}` is the built-in one. */
export function fillSlots(text: string, values: Record<string, string>): string {
  return text.replace(SLOT_RE, (whole, name: string) => values[name] ?? whole)
}

/** The `{name}` placeholders still present after substitution, so the caller can refuse. */
export function unresolvedSlots(text: string): string[] {
  return slotNames(text)
}

/** Every reference token in a field value: `[[x]]`, `[[x, y]]`, `@x`, or plain comma-separated text. */
export function referenceTokens(value: unknown): string[] {
  if (value === undefined || value === null || value === '') return []
  if (Array.isArray(value)) return value.flatMap(referenceTokens)
  const text = String(value)
  const links = [...text.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1])
  const parts = links.length > 0 ? links : [text.replace(/^\[|\]$/g, '')]
  return parts
    .flatMap((p) => p.split(','))
    .map((p) => p.trim().replace(/^@/, ''))
    .filter((p) => p !== '')
}

/** Resolves a reference token to an element slug: slug first, then element name (case-insensitive). */
function resolver(nodes: ElementNode[]): (token: string) => string | undefined {
  const slugs = new Set(nodes.map((n) => n.slug ?? ''))
  const byName = new Map(nodes.map((n) => [n.name.toLowerCase(), n.slug ?? '']))
  return (token) => (slugs.has(token) ? token : byName.get(token.toLowerCase()))
}

const str = (v: unknown): string | undefined =>
  v === undefined || v === null || v === '' ? undefined : String(v)

/**
 * Parses a procedures-bluepriNNt model into its runnable steps (design §2, §3). A Work that is
 * the parent of another Work is a container, not a step. Structural problems are reported,
 * never thrown. A loop is runnable only when it is guarded (see `findCycles`); any other loop
 * is reported as CYCLE.
 *
 * `container` restricts the graph to one container's descendants (design §4.6): a file that
 * holds several sub-procedures is addressed as `<doc>@<container-slug>`, and starts, `next`
 * and artifacts are computed among those descendants only.
 */
export function procedureGraph(model: ParsedKnowledge, container?: string): ProcedureGraph {
  const allWork = model.elements.get('Work') ?? []
  const artifactNodes = model.elements.get('Artifact') ?? []
  const toAllWork = resolver(allWork)
  const containerSlug = container ? (toAllWork(container) ?? container) : undefined
  const work = containerSlug ? descendantsOf(allWork, containerSlug, resolver(allWork)) : allWork
  const toWork = resolver(work)
  const toArtifact = resolver(artifactNodes)
  const diagnostics: GraphDiagnostic[] = []

  const parentOf = (n: ElementNode) => referenceTokens(n.fields['parent']).map(toWork)[0]
  const containers = new Set(work.map(parentOf).filter((p): p is string => p !== undefined))
  const artifactRefs = (v: unknown) => referenceTokens(v).map((t) => toArtifact(t) ?? t)

  const steps: Record<string, ProcedureStep> = {}
  for (const n of work) {
    const slug = n.slug ?? ''
    if (containers.has(slug)) continue
    if (!n.slugExplicit) {
      diagnostics.push({
        code: 'MISSING_SLUG',
        severity: 'error',
        step: slug,
        detail: `Work "${n.name}" has no slug:: line; runs reference steps by slug (R4).`,
      })
    }
    const executor = str(n.fields['executor'])
    const toolAlias = str(n.fields['tool'])
    const resolvedExecutor: Executor | undefined =
      executor && EXECUTORS.includes(executor)
        ? (executor as Executor)
        : toolAlias
          ? TOOL_ALIASES.get(toolAlias.trim().toLowerCase())
          : undefined
    steps[slug] = {
      slug,
      name: n.name,
      stepType: str(n.fields['step_type']),
      executor: resolvedExecutor,
      parent: parentOf(n),
      next: [],
      condition: str(n.fields['condition']),
      decision: str(n.fields['decision']),
      command: str(n.fields['command']),
      produces: str(n.fields['produces']),
      ...(exitCodesOf(n.fields['exit_codes'])
        ? { exitCodes: exitCodesOf(n.fields['exit_codes'])! }
        : {}),
      inputs: artifactRefs(n.fields['input']),
      outputs: artifactRefs(n.fields['output']),
      ...(maxAttemptsOf(n.fields['max_attempts']) !== undefined
        ? { maxAttempts: maxAttemptsOf(n.fields['max_attempts'])! }
        : {}),
    }
  }

  for (const n of work) {
    const step = steps[n.slug ?? '']
    if (!step) continue
    for (const token of referenceTokens(n.fields['next'])) {
      const target = toWork(token)
      if (target && steps[target]) step.next.push(target)
      else
        diagnostics.push({
          code: 'UNKNOWN_NEXT',
          severity: 'error',
          step: step.slug,
          detail: `Step "${step.slug}" names next "${token}", which is not a step of this procedure.`,
        })
    }
  }

  const artifacts: Record<string, ProcedureArtifact> = {}
  for (const n of artifactNodes) {
    const slug = n.slug ?? ''
    const required = n.fields['required']
    const kindText = str(n.fields['kind'])
    const kind = kindText === 'element' || kindText === 'changeset' ? kindText : 'file'
    const at = str(n.fields['at'])
    artifacts[slug] = {
      slug,
      name: n.name,
      kind,
      ...(at !== undefined ? { at } : {}),
      verify: verifyOf(str(n.fields['verify']), kind, at),
      required: !(required === false || required === 'false'),
      producers: Object.values(steps)
        .filter((s) => s.outputs.includes(slug))
        .map((s) => s.slug),
    }
  }

  // A guarded loop's back-edge is not an entry: the step it returns to may be the start.
  const cycles = findCycles(steps)
  const incoming = new Set(
    Object.values(steps).flatMap((s) =>
      s.next.filter((t) => !cycles.backEdges.has(`${s.slug}>${t}`)),
    ),
  )
  const starts = Object.keys(steps).filter((s) => !incoming.has(s))
  if (starts.length === 0 && Object.keys(steps).length > 0)
    diagnostics.push({
      code: 'NO_START',
      severity: 'error',
      detail: 'Every step has an incoming next.',
    })
  if (starts.length > 1)
    diagnostics.push({
      code: 'MULTIPLE_STARTS',
      severity: 'error',
      detail: `Several steps have no incoming next: ${starts.join(', ')}.`,
    })
  diagnostics.push(...cycles.diagnostics)

  // Slots (design §4.6): the `{name}` placeholders the procedure declares, from the
  // frontmatter `slots` list and from every step command and every artifact `at`.
  const declaredSlots: string[] = Array.isArray(model.frontmatter['slots'])
    ? (model.frontmatter['slots'] as unknown[]).map((s) =>
        typeof s === 'string'
          ? s.replace(/^\{|\}$/g, '').trim()
          : typeof s === 'object' && s !== null && 'name' in s
            ? String((s as { name: unknown }).name).trim()
            : '',
      )
    : typeof model.frontmatter['slots'] === 'string'
      ? String(model.frontmatter['slots'])
          .replace(/^\[|\]$/g, '')
          .split(',')
          .map((s) => s.trim().replace(/^\{|\}$/g, ''))
      : []
  // A container is one sub-procedure: the document's declared slots belong to its siblings too,
  // so only the placeholders its own steps and artifacts carry are asked for.
  const slots = [
    ...new Set([
      ...(containerSlug ? [] : declaredSlots.filter((s) => s !== '')),
      ...slotNames(
        ...Object.values(steps).map((s) => s.command),
        ...Object.values(artifacts).map((a) => a.at),
      ),
    ]),
  ].filter((s) => s !== 'run')

  return {
    defRev: str(model.frontmatter.knowledge_version) ?? null,
    steps,
    artifacts,
    start: starts.length === 1 ? starts[0] : null,
    terminals: Object.values(steps)
      .filter((s) => s.next.length === 0)
      .map((s) => s.slug),
    slots,
    diagnostics,
  }
}

/** The Works that are the container's descendants (never the container itself). */
function descendantsOf(
  work: ElementNode[],
  container: string,
  toWork: (token: string) => string | undefined,
): ElementNode[] {
  const childrenOf = new Map<string, ElementNode[]>()
  for (const n of work) {
    const parent = referenceTokens(n.fields['parent']).map(toWork)[0]
    if (!parent) continue
    const list = childrenOf.get(parent)
    if (list) list.push(n)
    else childrenOf.set(parent, [n])
  }
  const out = new Set<ElementNode>()
  const todo = [...(childrenOf.get(container) ?? [])]
  for (let n = todo.pop(); n !== undefined; n = todo.pop()) {
    out.add(n)
    todo.push(...(childrenOf.get(n.slug ?? '') ?? []))
  }
  // In declaration order: loops are read from the start (see `findCycles`).
  return work.filter((n) => out.has(n))
}

/**
 * `exit_codes::` maps an exit code to an outcome name (design §4.6). A JSON object of
 * `"<code>": "<outcome>"`. Exit 0 is always `done`, and an unmapped nonzero exit is
 * `failed`; the map only overrides those, so a controlled gate stop can become a wait.
 */
function exitCodesOf(v: unknown): Record<string, string> | undefined {
  if (v === null || v === undefined || v === '') return undefined
  let value: unknown = v
  if (typeof v === 'string') {
    const trimmed = v.trim()
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return undefined
    try {
      value = JSON.parse(trimmed)
    } catch {
      return undefined
    }
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, val]) => [k, String(val)]),
  )
}

/**
 * An artifact's `verify` defaults from its `kind` (design §4.1): `file` verifies the file at
 * `at`, `element` the element at `at`, and `changeset` is satisfied by being applied. An
 * explicit `verify` wins.
 */
function verifyOf(
  declared: string | undefined,
  kind: ProcedureArtifact['kind'],
  at?: string,
): string | undefined {
  if (declared) return declared
  if (kind === 'changeset') return 'applied'
  if (kind === 'file' && at) return `file:${at}`
  if (kind === 'element' && at) return `element:${at}`
  return undefined
}

/** A positive integer `max_attempts`, or undefined. */
function maxAttemptsOf(v: unknown): number | undefined {
  const n = Number(str(v))
  return Number.isInteger(n) && n > 0 ? n : undefined
}

/**
 * Loops (design §10.2). A loop is runnable when it is guarded: one of its edges leaves a step
 * with several targets for a target that carries a `condition`, so the run only goes round
 * when an actor chooses that branch, and the other targets are the way out. Taking the loop's
 * back-edge reopens its span (the runner's `complete`), bounded by the target's attempts.
 * Every other loop is a CYCLE error. Back-edges are `from>to` keys. A loop back to the start
 * step has no step without an incoming edge, so its start is the first one declared.
 */
function findCycles(steps: Record<string, ProcedureStep>): {
  diagnostics: GraphDiagnostic[]
  backEdges: Set<string>
} {
  const diagnostics: GraphDiagnostic[] = []
  const backEdges = new Set<string>()
  const state = new Map<string, 'visiting' | 'done'>()
  const guarded = (loop: string[]): boolean =>
    loop
      .slice(0, -1)
      .some((from, i) => steps[from].next.length > 1 && steps[loop[i + 1]].condition !== undefined)
  const visit = (slug: string, trail: string[]): void => {
    state.set(slug, 'visiting')
    for (const t of steps[slug].next) {
      if (state.get(t) === 'visiting') {
        const walked = [...trail, slug]
        const loop = [...walked.slice(walked.indexOf(t)), t]
        if (guarded(loop)) backEdges.add(`${slug}>${t}`)
        else
          diagnostics.push({
            code: 'CYCLE',
            severity: 'error',
            step: slug,
            detail: `Loop ${loop.join(' -> ')} has no guarded branch: a loop needs a decision step whose target carries a condition, so the run can leave it.`,
          })
      } else if (!state.has(t)) visit(t, [...trail, slug])
    }
    state.set(slug, 'done')
  }
  // Walk from the steps nothing points at first, then in declaration order, so the edge that
  // closes a loop is the one that returns to a step walked earlier, as a run meets it.
  const incoming = new Set(Object.values(steps).flatMap((s) => s.next))
  const roots = [
    ...Object.keys(steps).filter((slug) => !incoming.has(slug)),
    ...Object.keys(steps).filter((slug) => incoming.has(slug)),
  ]
  for (const slug of roots) if (!state.has(slug)) visit(slug, [])
  return { diagnostics, backEdges }
}
