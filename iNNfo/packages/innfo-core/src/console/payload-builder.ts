/**
 * Console Payload Builder.
 * THE single payload builder shared by the CLI exporter and compile procedures.
 */
import {
  parseFrontmatter,
  parseKnowledge,
  slugify,
  splitSourceFieldValue,
} from '../index.js'
import { computeSha256 } from '../validator/crypto.js'
import { findCanonicalBlueprint } from '../schema/canonical-registry.js'
import { displayStem } from '../naming/contract.js'
import type { SourceResolver } from '../index.js'
import {
  resolveCitation,
  groupCitationsByField,
  citationFieldsFor,
} from './citations.js'
import type { ResolvedCitation } from './citations.js'
import { canonicalJsonStringify, computeElementHash } from './element-hash.js'
import { buildConsoleSchemaSlot } from './slot.js'
import type { ConsoleSchemaSlot, ConsoleProcedureSlot } from './slot.js'
import { inheritConceptValues } from '../schema/field-values.js'
import { attachChangesetHistory } from './element-history.js'
import type { ChangesetRecord, ElementHistoryItem } from './element-history.js'

export { computeSha256 }

export { canonicalJsonStringify, computeElementHash }

export interface ConsolePayloadElementRelation {
  field: string
  target: string
  targetLabel: string
}

export interface ConsolePayloadElement {
  id: string
  /** Element slug as the engine resolves it (`apply_change` target element part). */
  slug?: string
  concept: string
  name: string
  description?: string
  fields: Record<string, unknown>
  markers: Record<string, unknown>
  hash: string
  /** Own `tags::` then the concept-level ones, lowercase, de-duplicated. Not hashed. */
  tags: string[]
  inherited?: Record<string, { value: unknown; from: string }>
  relations?: ConsolePayloadElementRelation[]
  citations?: Record<string, Omit<ResolvedCitation, 'field'>[]>
  history?: ElementHistoryItem[]
}

export interface ConsoleMatrixHeadEntry {
  label?: string
  concept?: string
  kind?: 'element' | 'marker'
}

export interface ConsolePayloadMatrix {
  name: string
  source: string
  target: string
  rows: string[]
  cols: string[]
  head?: {
    rows: Record<string, ConsoleMatrixHeadEntry>
    cols: Record<string, ConsoleMatrixHeadEntry>
  }
  values?: string[]
  cells: Record<string, Record<string, unknown>>
  widget?: string
  description?: string
}

export interface ConsolePayloadMeta {
  modelId: string
  title: string
  template?: string
  modelVersion: string
  sha256: string
  sources: string[]
  generated: string
  citationsResolvedAt?: string
  /**
   * Version of the `changes` bluepriNNt a console changeset export conforms to
   * (its `blueprint_version`, from the canonical registry).
   */
  changesBlueprintVersion: string
}

export interface ConsolePayload {
  schema: ConsoleSchemaSlot
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
  changesets?: ChangesetRecord[]
  generated?: string
  /** Blueprint procedure catalog to attach to the schema slot (parent + includes). */
  procedures?: ConsoleProcedureSlot[]
}

const WIKILINK_TARGET_RE = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g

function extractWikilinksFromValue(val: unknown): { target: string; label?: string }[] {
  if (typeof val === 'string') {
    const results: { target: string; label?: string }[] = []
    const matches = val.matchAll(WIKILINK_TARGET_RE)
    for (const match of matches) {
      const target = match[1].trim()
      const label = match[2] ? match[2].trim() : undefined
      if (target) {
        results.push({ target, label })
      }
    }
    return results
  }
  if (Array.isArray(val)) {
    return val.flatMap(extractWikilinksFromValue)
  }
  return []
}

/**
 * Normalizes modelId to domain-relative POSIX path minus extension.
 */
export function normalizeModelId(filePath?: string, fallbackTitle?: string): string {
  if (!filePath) return fallbackTitle ? slugify(fallbackTitle) : 'model'
  const normalized = filePath.split('\\').join('/')
  return displayStem(normalized.replace(/^.*?\/(kNNowledge|models)\//i, '$1/'))
}

/**
 * Builds the canonical 2-slot console payload (schema + model).
 */
export function buildConsolePayload(options: BuildConsolePayloadOptions): ConsolePayload {
  const { content, path: modelPath, schema: inputSchema, resolver, changesets, generated } = options
  const rawSha256 = computeSha256(content)
  const parsed = parseKnowledge(content)
  const fm = (parsed.frontmatter || parseFrontmatter(content) || {}) as Record<string, any>

  const title = fm.title || fm.name || (modelPath ? displayStem(modelPath.split(/[/\\]/).pop() ?? '') : 'Model') || 'Model'
  const template = fm.target_blueprint || fm.blueprint || fm.template || undefined
  const modelVersion = fm.knowledge_version || fm.version || 'V_0-1-0'
  const modelId = normalizeModelId(modelPath, title)

  // Elements (Pass 1: instantiate elements and compute hashes)
  const rawElements: {
    elem: ConsolePayloadElement
    rawFields: Record<string, unknown>
  }[] = []

  const elementsByName = new Map<string, ConsolePayloadElement>()
  const elementsById = new Map<string, ConsolePayloadElement>()
  const unfrozen: string[] = []

  for (const [conceptName, nodes] of parsed.elements.entries()) {
    for (const node of nodes) {
      const concept = conceptName
      const name = node.name || 'Element'
      // D1: an element id IS its frozen (explicit) slug. A derived slug is not frozen;
      // no id is ever invented from a display name.
      if (!node.slug || !node.slugExplicit) {
        unfrozen.push(`${concept}: ${name}`)
        continue
      }
      const id = node.slug

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

      // Tags are display metadata: kept out of computeElementHash so `hash` stays equal to
      // hashParsedElement and every base_hash precondition holds.
      const tags = [...new Set([...(node.tags ?? []), ...(parsed.conceptTags?.[concept] ?? [])])]

      // In S1: if node has own tags, expose them on fields.tags as well
      if (node.tags && node.tags.length > 0) {
        fields.tags = [...node.tags]
      }

      // Compute inherited field values delta
      const conceptDefs = inputSchema?.concepts
        ? (Array.isArray(inputSchema.concepts) ? inputSchema.concepts : Object.values(inputSchema.concepts))
            .find((c: any) => c?.name?.toLowerCase() === concept.toLowerCase())?.fields
        : undefined
      const conceptVals = parsed.conceptFields?.[concept]
      const inheritedDelta = inheritConceptValues(fields, conceptVals, conceptDefs, concept)

      const elem: ConsolePayloadElement = {
        id,
        slug: node.slug,
        concept,
        name,
        description,
        fields,
        markers,
        hash,
        tags,
        ...(Object.keys(inheritedDelta).length > 0 ? { inherited: inheritedDelta } : {}),
      }

      rawElements.push({ elem, rawFields: { ...fields } })
      if (!elementsByName.has(name.toLowerCase())) {
        elementsByName.set(name.toLowerCase(), elem)
      }
      if (!elementsById.has(id.toLowerCase())) {
        elementsById.set(id.toLowerCase(), elem)
      }
    }
  }

  // D1: a model whose elements are not all frozen cannot produce a console. Reject it
  // with an actionable message rather than inventing ids.
  if (unfrozen.length > 0) {
    const shown = unfrozen.slice(0, 3).join('; ')
    throw new Error(
      `UNFROZEN_MODEL: model "${modelId}" has ${unfrozen.length} element(s) without a frozen slug ` +
        `(${shown}${unfrozen.length > 3 ? '; …' : ''}). ` +
        `Freeze the model's slugs first (freeze_slugs, or ` +
        `node skills/nn-upgrade/scripts/migrate-domain.js --domain-dir <dir> --freeze-slugs).`,
    )
  }

  // Pass 2: resolve intra-model relations and citations
  let citationsResolved = false
  const elements: ConsolePayloadElement[] = []

  for (const { elem, rawFields } of rawElements) {
    // Relations
    const relations: ConsolePayloadElementRelation[] = []
    for (const [fieldName, val] of Object.entries(rawFields)) {
      const links = extractWikilinksFromValue(val)
      for (const link of links) {
        const targetEl =
          elementsByName.get(link.target.toLowerCase()) ||
          elementsById.get(link.target.toLowerCase()) ||
          elementsById.get(slugify(link.target).toLowerCase())
        if (targetEl) {
          relations.push({
            field: fieldName,
            target: targetEl.id,
            targetLabel: link.label || targetEl.name,
          })
        }
      }
    }
    if (relations.length > 0) {
      elem.relations = relations
    }

    // Citations
    if (resolver) {
      const citationFields = citationFieldsFor(elem.concept, rawFields, inputSchema)
      const flatCitations: ResolvedCitation[] = []
      for (const fieldName of citationFields) {
        const val = rawFields[fieldName]
        for (const raw of splitSourceFieldValue(val)) {
          flatCitations.push(resolveCitation(raw, fieldName, resolver, modelPath || ''))
        }
      }
      if (flatCitations.length > 0) {
        elem.citations = groupCitationsByField(flatCitations)
        citationsResolved = true
      }
    }

    elements.push(elem)
  }

  // Matrices
  const matrices: ConsolePayloadMatrix[] = []
  if (Array.isArray(parsed.matrices)) {
    for (const mat of parsed.matrices) {
      const rows: string[] = []
      const cols: string[] = []
      const cellsObj: Record<string, Record<string, unknown>> = {}
      if (Array.isArray(mat.cells)) {
        for (const cell of mat.cells) {
          if (!rows.includes(cell.row)) rows.push(cell.row)
          if (!cols.includes(cell.col)) cols.push(cell.col)
          if (!cellsObj[cell.row]) {
            cellsObj[cell.row] = {}
          }
          cellsObj[cell.row][cell.col] = cell.value
        }
      }
      const isItemMarkers =
        mat.name === 'item-markers matrix' || (mat.target || '').toLowerCase() === 'markers'
      const headRows: Record<string, ConsoleMatrixHeadEntry> = {}
      const headCols: Record<string, ConsoleMatrixHeadEntry> = {}
      for (const r of rows) {
        headRows[r] = { label: r, concept: mat.source || undefined, kind: 'element' }
      }
      for (const c of cols) {
        headCols[c] = {
          label: c,
          concept: mat.target || undefined,
          kind: isItemMarkers ? 'marker' : 'element',
        }
      }
      matrices.push({
        name: mat.name,
        source: mat.source || '',
        target: mat.target || '',
        rows,
        cols,
        head: { rows: headRows, cols: headCols },
        cells: cellsObj,
      })
    }
  }

  const schemaSlot = buildConsoleSchemaSlot(
    inputSchema,
    elements,
    options.procedures,
    parsed.conceptFields,
  )
  // Attach changeset lineage AFTER the schema slot so the schema is unaffected by
  // history (only the model slot carries it).
  attachChangesetHistory(elements, changesets)
  const genTime = generated || new Date().toISOString()

  const normalizedSource = modelPath
    ? modelPath.split('\\').join('/').replace(/^models\//i, 'kNNowledge/').replace(/^.*?\/(kNNowledge\/)/i, '$1')
    : (fm.title ? `kNNowledge/${slugify(fm.title)}_NN.md` : 'kNNowledge/Model_NN.md')
  const sourceFile = normalizedSource.startsWith('kNNowledge/') ? normalizedSource : `kNNowledge/${normalizedSource}`

  const meta: ConsolePayloadMeta = {
    modelId,
    title,
    modelVersion,
    sha256: rawSha256,
    sources: [sourceFile],
    generated: genTime,
    changesBlueprintVersion: findCanonicalBlueprint('changes')?.version ?? '',
  }

  if (template) {
    meta.template = template
  }
  if (citationsResolved) {
    meta.citationsResolvedAt = genTime
  }

  return {
    schema: schemaSlot,
    model: {
      meta,
      elements,
      matrices,
    },
  }
}
