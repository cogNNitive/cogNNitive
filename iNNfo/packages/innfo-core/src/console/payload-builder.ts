/**
 * Console Payload Builder.
 * THE single payload builder shared by the CLI exporter and compile procedures.
 */
import { createHash } from 'node:crypto'
import {
  parseFrontmatter,
  parseKnowledge,
  slugify,
  splitSourceFieldValue,
  SOURCE_FIELD_NAMES,
} from '../index.js'
import type { SourceResolver } from '../index.js'
import { resolveCitation } from './citations.js'
import type { ResolvedCitation } from './citations.js'
import { feedbackStateFor } from './feedback-ledger.js'
import type { FeedbackVerdictEntry, FeedbackStateItem } from './feedback-ledger.js'

export function computeSha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

/**
 * Computes canonical JSON string with sorted keys recursively.
 */
export function canonicalJsonStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalJsonStringify).join(',') + ']'
  }
  const obj = value as Record<string, unknown>
  const sortedKeys = Object.keys(obj).sort()
  const pairs: string[] = []
  for (const k of sortedKeys) {
    if (obj[k] !== undefined) {
      pairs.push(JSON.stringify(k) + ':' + canonicalJsonStringify(obj[k]))
    }
  }
  return '{' + pairs.join(',') + '}'
}

/**
 * Computes 16-hex-character element content hash.
 */
export function computeElementHash(element: {
  concept: string
  name: string
  description?: string
  fields?: Record<string, unknown>
  markers?: Record<string, unknown>
}): string {
  const canonical = canonicalJsonStringify({
    concept: element.concept,
    description: element.description ?? '',
    fields: element.fields ?? {},
    markers: element.markers ?? {},
    name: element.name,
  })
  return computeSha256(canonical).slice(0, 16)
}

export interface ConsolePayloadElement {
  id: string
  concept: string
  name: string
  description?: string
  fields: Record<string, unknown>
  markers: Record<string, unknown>
  hash: string
  citations?: ResolvedCitation[]
}

export interface ConsolePayloadMatrix {
  name: string
  source: string
  target: string
  values?: string[]
  cells: Record<string, Record<string, unknown>>
  widget?: string
  description?: string
}

export interface ConsolePayloadMeta {
  modelId: string
  title: string
  modelVersion: string
  sha256: string
  generated: string
  feedbackState: FeedbackStateItem[]
}

export interface ConsolePayload {
  schema: {
    concepts: Record<string, any>
    fields: Record<string, any[]>
    markers: any[]
    matrices: any[]
  }
  model: {
    meta: ConsolePayloadMeta
    elements: ConsolePayloadElement[]
    matrices: ConsolePayloadMatrix[]
  }
}

export interface BuildConsolePayloadOptions {
  content: string
  path?: string
  schema?: any
  resolver?: SourceResolver
  ledgerEntries?: FeedbackVerdictEntry[]
  generated?: string
}

/**
 * Normalizes modelId to domain-relative POSIX path minus extension.
 */
export function normalizeModelId(filePath?: string, fallbackTitle?: string): string {
  if (!filePath) return fallbackTitle ? slugify(fallbackTitle) : 'model'
  const normalized = filePath.split('\\').join('/')
  return normalized
    .replace(/^.*?\/(kNNowledge|models)\//i, '$1/')
    .replace(/(\.md|_NN\.md)$/i, '')
}

/**
 * Builds the canonical 2-slot console payload (schema + model).
 */
export function buildConsolePayload(options: BuildConsolePayloadOptions): ConsolePayload {
  const { content, path: modelPath, schema: inputSchema, resolver, ledgerEntries, generated } = options
  const rawSha256 = computeSha256(content)
  const parsed = parseKnowledge(content)
  const fm = (parsed.frontmatter || parseFrontmatter(content) || {}) as Record<string, any>

  const title = fm.title || fm.name || (modelPath ? modelPath.split(/[/\\]/).pop()?.replace(/(\.md|_NN\.md)$/i, '') : 'Model') || 'Model'
  const modelVersion = fm.knowledge_version || fm.version || 'V_0-1-0'
  const modelId = normalizeModelId(modelPath, title)

  // Elements
  const seenIds = new Map<string, number>()
  const elements: ConsolePayloadElement[] = []

  // Flatten parsed elements map into element objects
  for (const [conceptName, nodes] of parsed.elements.entries()) {
    for (const node of nodes) {
      const concept = conceptName
      const name = node.name || 'Element'
      const baseId = slugify(`${concept} ${name}`)
      const occurrence = seenIds.get(baseId) ?? 0
      seenIds.set(baseId, occurrence + 1)
      const id = occurrence === 0 ? baseId : `${baseId}-${occurrence}`

      const fields: Record<string, unknown> = { ...(node.fields || {}) }
      delete fields.concept
      delete fields.name

      const markers: Record<string, unknown> = { ...(node.markers || {}) }
      const description = (node.description || (fields.description as string) || '')
      if (fields.description) delete fields.description

      const hash = computeElementHash({
        concept,
        name,
        description,
        fields,
        markers,
      })

      const elem: ConsolePayloadElement = {
        id,
        concept,
        name,
        description,
        fields,
        markers,
        hash,
      }

      // Resolve citations if resolver injected
      if (resolver) {
        const citations: ResolvedCitation[] = []
        for (const [fieldName, val] of Object.entries(fields)) {
          if (SOURCE_FIELD_NAMES.has(fieldName.toLowerCase())) {
            for (const raw of splitSourceFieldValue(val)) {
              citations.push(resolveCitation(raw, fieldName, resolver, modelPath || ''))
            }
          }
        }
        if (citations.length > 0) {
          elem.citations = citations
        }
      }

      elements.push(elem)
    }
  }

  // Matrices
  const matrices: ConsolePayloadMatrix[] = []
  if (Array.isArray(parsed.matrices)) {
    for (const mat of parsed.matrices) {
      const cellsObj: Record<string, Record<string, unknown>> = {}
      if (Array.isArray(mat.cells)) {
        for (const cell of mat.cells) {
          if (!cellsObj[cell.row]) {
            cellsObj[cell.row] = {}
          }
          cellsObj[cell.row][cell.col] = cell.value
        }
      }
      matrices.push({
        name: mat.name,
        source: mat.source || '',
        target: mat.target || '',
        cells: cellsObj,
      })
    }
  }

  // Schema slot
  const schema = {
    concepts: inputSchema?.concepts || {},
    fields: inputSchema?.fields || {},
    markers: Array.isArray(inputSchema?.markers) ? inputSchema.markers : [],
    matrices: Array.isArray(inputSchema?.matrices) ? inputSchema.matrices : [],
  }

  const payload: ConsolePayload = {
    schema,
    model: {
      meta: {
        modelId,
        title,
        modelVersion,
        sha256: rawSha256,
        generated: generated || new Date().toISOString(),
        feedbackState: feedbackStateFor(ledgerEntries || [], modelId),
      },
      elements,
      matrices,
    },
  }

  return payload
}
