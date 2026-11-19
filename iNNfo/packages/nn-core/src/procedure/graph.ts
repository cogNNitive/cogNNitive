import type { ElementNode, ParsedKnowledge } from '../types/index.js'
import type {
  Executor,
  GraphDiagnostic,
  ProcedureArtifact,
  ProcedureGraph,
  ProcedureStep,
} from './types.js'

const EXECUTORS: readonly string[] = ['human', 'agent', 'engine']

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
 * never thrown; loops are out of slice 1 and reported as CYCLE.
 */
export function procedureGraph(model: ParsedKnowledge): ProcedureGraph {
  const work = model.elements.get('Work') ?? []
  const artifactNodes = model.elements.get('Artifact') ?? []
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
    steps[slug] = {
      slug,
      name: n.name,
      stepType: str(n.fields['step_type']),
      executor: executor && EXECUTORS.includes(executor) ? (executor as Executor) : undefined,
      parent: parentOf(n),
      next: [],
      condition: str(n.fields['condition']),
      decision: str(n.fields['decision']),
      command: str(n.fields['command']),
      produces: str(n.fields['produces']),
      inputs: artifactRefs(n.fields['input']),
      outputs: artifactRefs(n.fields['output']),
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
    artifacts[slug] = {
      slug,
      name: n.name,
      verify: str(n.fields['verify']),
      required: !(required === false || required === 'false'),
      producers: Object.values(steps)
        .filter((s) => s.outputs.includes(slug))
        .map((s) => s.slug),
    }
  }

  const incoming = new Set(Object.values(steps).flatMap((s) => s.next))
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
  diagnostics.push(...findCycles(steps))

  return {
    defRev: str(model.frontmatter.knowledge_version) ?? null,
    steps,
    artifacts,
    start: starts.length === 1 ? starts[0] : null,
    terminals: Object.values(steps)
      .filter((s) => s.next.length === 0)
      .map((s) => s.slug),
    diagnostics,
  }
}

function findCycles(steps: Record<string, ProcedureStep>): GraphDiagnostic[] {
  const found: GraphDiagnostic[] = []
  const state = new Map<string, 'visiting' | 'done'>()
  const visit = (slug: string, trail: string[]): void => {
    state.set(slug, 'visiting')
    for (const t of steps[slug].next) {
      if (state.get(t) === 'visiting') {
        const walked = [...trail, slug]
        const loop = [...walked.slice(walked.indexOf(t)), t]
        found.push({
          code: 'CYCLE',
          severity: 'error',
          step: slug,
          detail: `Loop ${loop.join(' -> ')}; loops are not runnable yet.`,
        })
      } else if (!state.has(t)) visit(t, [...trail, slug])
    }
    state.set(slug, 'done')
  }
  for (const slug of Object.keys(steps)) if (!state.has(slug)) visit(slug, [])
  return found
}
