/**
 * `resolve_sources` tool: read-only resolution of an element's citations to
 * their underlying file, anchor, and content — "where did this value come
 * from?" without manually tracing `sources::` values by hand.
 *
 * Reuses the canonical citation resolution logic from `@cognnitive/nn-core`.
 */
import {
  findDeclaredField,
  splitSourceFieldValue,
  resolveCitation,
  EXCERPT_CHAR_CAP,
  CHANGE_CONCEPT,
  KNOWN_AGENT_TOOL_IDS,
  createFsSourceResolver,
  buildChangeLog,
  readLineageSnapshot,
  splitEvidence,
} from '@cognnitive/nn-core'
import type {
  ParsedKnowledge,
  BlueprintSchema,
  CitationOrigin,
  ResolvedCitation,
} from '@cognnitive/nn-core'
import { readKnowledge } from './list-read.js'
import { findKnowledgeFile, resolveBlueprintWithCache, ModelIdError } from './spec.js'
import { buildBlueprintSchemaResolverFromCache } from './validate.js'

export {
  EXCERPT_CHAR_CAP,
  CHANGE_CONCEPT,
  KNOWN_AGENT_TOOL_IDS,
}
export type { CitationOrigin, ResolvedCitation }

/**
 * Resolve every citation on an element's citation-typed field(s) to its
 * underlying file/anchor/content. Never writes files; never throws on a
 * dangling reference (that is reported as an entry with `exists: false`).
 */
export async function resolveSources(
  rootDir: string,
  input: { model: string; elementId: string; fieldName?: string; target?: string },
): Promise<ResolvedCitation[]> {
  // A unit address answers "where did THIS value come from?" through the change
  // log: the evidence of the last applied change of that unit (change-provenance,
  // consumers read the log). Superseded evidence never wins.
  if (input.target) return resolveTargetEvidence(rootDir, input.model, input.target)

  let modelPath: string | null = null
  try {
    modelPath = await findKnowledgeFile(rootDir, input.model)
  } catch (err) {
    if (err instanceof ModelIdError) {
      return [
        {
          path: input.model,
          exists: false,
          field: input.fieldName ?? '',
          origin: 'document',
          error: 'MODEL_NOT_FOUND',
        },
      ]
    }
    throw err
  }
  const model = modelPath ? await readKnowledge(rootDir, input.model) : null
  if (!modelPath || !model) {
    return [
      {
        path: input.model,
        exists: false,
        field: input.fieldName ?? '',
        origin: 'document',
        error: 'MODEL_NOT_FOUND',
      },
    ]
  }

  const element = findElement(model, input.elementId)
  if (!element) {
    return [
      {
        path: input.elementId,
        exists: false,
        field: input.fieldName ?? '',
        origin: 'document',
        error: 'ELEMENT_NOT_FOUND',
      },
    ]
  }

  const fieldNames = await resolveFieldNames(rootDir, model, element, input.fieldName)
  const resolver = createFsSourceResolver(rootDir)

  const results: ResolvedCitation[] = []
  for (const fieldName of fieldNames) {
    const value = element.fields[fieldName]
    if (value === undefined) continue
    for (const raw of splitSourceFieldValue(value)) {
      results.push(resolveCitation(raw, fieldName, resolver, modelPath))
    }
  }
  return results
}

interface FoundElement {
  concept: string
  fields: Record<string, unknown>
}

/** The unit part of a target address (`owner`, `#body`, `row&col`). */function unitLabelOf(target: string): string {
  const at = target.indexOf('@')
  if (at === -1) return ''
  const rest = target.slice(at + 1)
  const amp = rest.indexOf('&')
  return amp === -1 ? '' : rest.slice(amp + 1)
}

/**
 * The evidence of the origin change of a unit address, resolved to citations.
 * Keyword evidence (`decision`, `unknown`) is not a source and yields nothing;
 * a unit with no applied change yields nothing.
 */
async function resolveTargetEvidence(
  rootDir: string,
  model: string,
  target: string,
): Promise<ResolvedCitation[]> {
  const log = buildChangeLog(readLineageSnapshot(rootDir))
  const origin = log.origin(target)
  if (!origin) return []

  let modelPath: string | null = null
  try {
    modelPath = await findKnowledgeFile(rootDir, model)
  } catch {
    modelPath = null
  }

  const resolver = createFsSourceResolver(rootDir)
  const label = unitLabelOf(target)
  const citations: ResolvedCitation[] = []
  for (const item of origin.evidenceItems ?? splitEvidence(origin.evidence)) {
    const keyword = item.toLowerCase()
    if (keyword === 'decision' || keyword === 'unknown') continue
    citations.push({
      ...resolveCitation(item, label, resolver, modelPath ?? ''),
      changeId: origin.id,
    })
  }
  return citations
}
function findElement(model: ParsedKnowledge, elementId: string): FoundElement | undefined {
  for (const [concept, nodes] of model.elements.entries()) {
    const match = nodes.find((n) => n.name.toLowerCase() === elementId.toLowerCase())
    if (match) return { concept, fields: match.fields }
  }
  return undefined
}

/**
 * Field selection (design D6): explicit `fieldName` skips schema resolution
 * entirely (works standalone, no A3 dependency). When omitted, the schema
 * comes from `resolveBlueprintWithCache` + `buildBlueprintSchemaResolverFromCache`
 * — a single-model read, never a full `recursiveParse` — and returns no field
 * when no schema resolves (`sources::` is no longer read).
 */
async function resolveFieldNames(
  rootDir: string,
  model: ParsedKnowledge,
  element: FoundElement,
  explicitFieldName?: string,
): Promise<string[]> {
  if (explicitFieldName) return [explicitFieldName]

  const candidateNames = Object.keys(element.fields)
  const schema = await resolveSchemaForModel(rootDir, model)
  if (!schema) return []

  return candidateNames.filter(
    (f) => findDeclaredField(schema, element.concept, f)?.type === 'citation',
  )
}

async function resolveSchemaForModel(
  rootDir: string,
  model: ParsedKnowledge,
): Promise<BlueprintSchema | undefined> {
  const parent = model.frontmatter.parent_spec
  if (!parent?.url || !parent?.name) return undefined
  const { cache } = await resolveBlueprintWithCache(rootDir, parent.url, parent.name)
  if (!cache) return undefined
  const resolveSchema = buildBlueprintSchemaResolverFromCache(cache)
  return (
    resolveSchema({ path: '', name: parent.name, content: '', frontmatter: model.frontmatter }) ??
    undefined
  )
}
