/**
 * Console slot serialization and schema slot construction.
 */
import type { BlueprintSchema } from '../index.js'
import type { ConsolePayloadElement } from './payload-builder.js'

export interface ConsoleSchemaConcept {
  name: string
  label?: string
  description?: string
  fields?: any[]
  conceptFields?: Record<string, unknown>
  markers?: any[]
  [key: string]: any
}

export interface ConsoleFieldDef {
  concept: string
  name: string
  type?: string
  options?: string[]
  target_concepts?: string[]
  target_blueprint?: string
  [key: string]: any
}

export interface ConsoleSchemaSlot {
  concepts: ConsoleSchemaConcept[]
  fields: ConsoleFieldDef[]
  markers: any[]
  matrices: any[]
  /** Blueprint procedure catalog (parent + includes); `usage` reads first. */
  procedures: ConsoleProcedureSlot[]
}

export interface ConsoleProcedureSlot {
  id: string
  name: string
  path: string
}

/**
 * Serializes a console slot object to formatted JSON with `<` escaped as `\u003c`
 * to prevent breaking `<script>` tags when embedded in HTML.
 */
export function serializeConsoleSlot(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(/</g, '\\u003c')
}

/** Flattens `concept.fields` into `{concept, name, type, options?, target_concepts?, ...}` entries. */
function flattenConceptFields(concepts: ConsoleSchemaConcept[]): ConsoleFieldDef[] {
  const out: ConsoleFieldDef[] = []
  for (const concept of concepts) {
    if (!concept || !concept.name || !Array.isArray(concept.fields)) continue
    for (const field of concept.fields) {
      if (field && field.name) out.push({ concept: concept.name, ...field })
    }
  }
  return out
}

/**
 * Builds the canonical array-based schema slot for console payloads.
 */
export function buildConsoleSchemaSlot(
  schema?: BlueprintSchema | any,
  elements?: ConsolePayloadElement[],
  procedures?: ConsoleProcedureSlot[],
  modelConceptFields?: Record<string, Record<string, unknown>>,
): ConsoleSchemaSlot {
  const procList = Array.isArray(procedures) ? procedures : []
  if (schema) {
    const rawConcepts = Array.isArray(schema.concepts)
      ? schema.concepts
      : typeof schema.concepts === 'object' && schema.concepts !== null
        ? Object.values(schema.concepts)
        : []

    const concepts = rawConcepts.map((c: any) => {
      if (!c || !c.name) return c
      const cf = modelConceptFields?.[c.name]
      return cf ? { ...c, conceptFields: cf } : c
    })

    // Field definitions live on `concept.fields` (extractBlueprintSchema has no
    // top-level `fields`); flatten them into one entry per (concept, field).
    const fields = flattenConceptFields(concepts as ConsoleSchemaConcept[])

    const markers = Array.isArray(schema.markers)
      ? schema.markers
      : typeof schema.markers === 'object' && schema.markers !== null
        ? Object.values(schema.markers)
        : []

    const matrices = Array.isArray(schema.matrices)
      ? schema.matrices
      : typeof schema.matrices === 'object' && schema.matrices !== null
        ? Object.values(schema.matrices)
        : []

    return {
      concepts: concepts as ConsoleSchemaConcept[],
      fields,
      markers,
      matrices,
      procedures: procList,
    }
  }

  // Derive concepts from elements if no schema provided
  const conceptNames = new Set<string>()
  if (Array.isArray(elements)) {
    for (const el of elements) {
      if (el && el.concept) {
        conceptNames.add(el.concept)
      }
    }
  }

  return {
    concepts: Array.from(conceptNames).map((name) => {
      const cf = modelConceptFields?.[name]
      return cf ? { name, conceptFields: cf } : { name }
    }),
    fields: [],
    markers: [],
    matrices: [],
    procedures: procList,
  }
}
