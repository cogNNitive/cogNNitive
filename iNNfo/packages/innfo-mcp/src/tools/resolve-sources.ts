/**
 * `resolve_sources` tool: read-only resolution of an element's citations to
 * their underlying file, anchor, and content — "where did this value come
 * from?" without manually tracing `sources::` values by hand.
 *
 * Reuses the canonical citation resolution logic from `@cognnitive/innfo-core`.
 */
import {
  SOURCE_FIELD_NAMES,
  findDeclaredField,
  splitSourceFieldValue,
  resolveCitation,
  EXCERPT_CHAR_CAP,
  AGENT_MODIFICATION_CONCEPT,
  KNOWN_AGENT_TOOL_IDS,
} from '@cognnitive/innfo-core'
import type {
  ParsedKnowledge,
  BlueprintSchema,
  CitationOrigin,
  ResolvedCitation,
} from '@cognnitive/innfo-core'
import { readKnowledge } from './list-read.js'
import { findKnowledgeFile, resolveBlueprintWithCache } from './spec.js'
import { createWorkspaceSourceResolver, buildBlueprintSchemaResolverFromCache } from './validate.js'

export {
  EXCERPT_CHAR_CAP,
  AGENT_MODIFICATION_CONCEPT,
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
  input: { model: string; elementId: string; fieldName?: string },
): Promise<ResolvedCitation[]> {
  const modelPath = await findKnowledgeFile(rootDir, input.model)
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
  const resolver = createWorkspaceSourceResolver(rootDir)

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
 * — a single-model read, never a full `recursiveParse` — and falls back to
 * `SOURCE_FIELD_NAMES` only when no schema resolves.
 */
async function resolveFieldNames(
  rootDir: string,
  model: ParsedKnowledge,
  element: FoundElement,
  explicitFieldName?: string,
): Promise<string[]> {
  if (explicitFieldName) return [explicitFieldName]

  const candidateNames = Object.keys(element.fields)
  const nameBased = candidateNames.filter((f) => SOURCE_FIELD_NAMES.has(f.toLowerCase()))

  const schema = await resolveSchemaForModel(rootDir, model)
  if (!schema) return nameBased

  const schemaTyped = candidateNames.filter(
    (f) =>
      !SOURCE_FIELD_NAMES.has(f.toLowerCase()) &&
      findDeclaredField(schema, element.concept, f)?.type === 'citation',
  )
  return [...nameBased, ...schemaTyped]
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
