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
  markers?: any[]
  [key: string]: any
}

export interface ConsoleSchemaSlot {
  concepts: ConsoleSchemaConcept[]
  fields: any[]
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

/**
 * Builds the canonical array-based schema slot for console payloads.
 */
export function buildConsoleSchemaSlot(
  schema?: BlueprintSchema | any,
  elements?: ConsolePayloadElement[],
  procedures?: ConsoleProcedureSlot[],
): ConsoleSchemaSlot {
  const procList = Array.isArray(procedures) ? procedures : []
  if (schema) {
    const concepts = Array.isArray(schema.concepts)
      ? schema.concepts
      : typeof schema.concepts === 'object' && schema.concepts !== null
        ? Object.values(schema.concepts)
        : []

    const fields = Array.isArray(schema.fields)
      ? schema.fields
      : typeof schema.fields === 'object' && schema.fields !== null
        ? Object.values(schema.fields)
        : []

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
    concepts: Array.from(conceptNames).map((name) => ({ name })),
    fields: [],
    markers: [],
    matrices: [],
    procedures: procList,
  }
}
