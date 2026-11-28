/**
 * Console Payload Builder.
 * THE single payload builder shared by the CLI exporter and compile procedures.
 */
import { parseFrontmatter, parseKnowledge, slugify, splitSourceFieldValue } from '../index.js'
import { computeSha256 } from '../validator/crypto.js'
import { findCanonicalBlueprint } from '../schema/canonical-registry.js'
import { natureOfBlueprint } from '../schema/nature.js'
import { coreBlueprintKey, displayStem, parentSpecNameOf } from '../naming/contract.js'
import type { SourceResolver } from '../index.js'
import {
  resolveCitation,
  groupCitationsByField,
  citationFieldsFor,
  resolveEvidenceCitation,
} from './citations.js'
import type { ResolvedCitation } from './citations.js'
import { canonicalJsonStringify, computeElementHash } from './element-hash.js'
import { buildConsoleSchemaSlot } from './slot.js'
import type { ConsoleSchemaSlot, ConsoleProcedureSlot } from './slot.js'
import { inheritConceptValues } from '../schema/field-values.js'
import { resolveBlueprintSchema } from '../schema/compose.js'
import { attachChangesetHistory } from './element-history.js'
import { buildChangeLogFromChangesets, type ChangesetLike } from '../changelog/load.js'
import { matrixAxes } from '../matrix.js'
import type { ChangesetRecord, ElementHistoryItem } from './element-history.js'
import type {
  FileCategory,
  FileSidecarStatus,
  FileInventoryEntry,
  OriginDescriptor,
  FilesStats,
  ArtifactReverseLineageEntry,
  ConsolePayloadFiles,
  FileLineageArtifact,
  FileLineageChangeset,
  FileLineageElement,
} from './files-inventory.js'

export type {
  FileCategory,
  FileSidecarStatus,
  FileInventoryEntry,
  OriginDescriptor,
  FilesStats,
  ArtifactReverseLineageEntry,
  ConsolePayloadFiles,
  FileLineageArtifact,
  FileLineageChangeset,
  FileLineageElement,
}
export {
  classifyFileCategory,
  computeFileSha256,
  mimeTypeFromPath,
  isSidecarPath,
  isSourceLike,
  isTextMime,
  parseAndValidateSidecar,
  resolveArtifactReverseLineage,
  sidecarPathFor,
  sidecarSubjectPath,
  calculateFilesStats,
  buildOrigins,
  isMirrorFile,
} from './files-inventory.js'

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
  /** Human-readable header location, e.g. `file_NN.md@## NN Concept: Name`. */
  location?: string
  fields: Record<string, unknown>
  markers: Record<string, unknown>
  hash: string
  inherited?: Record<string, { value: unknown; from: string }>
  relations?: ConsolePayloadElementRelation[]
  citations?: Record<string, Omit<ResolvedCitation, 'field'>[]>
  history?: ElementHistoryItem[]
}

export interface ConsoleMatrixHeadEntry {
  label?: string
  concept?: string
  kind?: 'element' | 'marker'
  slug?: string
}

export interface ConsolePayloadMatrix {
  name: string
  slug?: string
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
  /**
   * The blueprint's declared ownership: `derived` collections are read-only (no
   * edit affordance), `authored` models are proposable. Defaults to `authored`
   * when the blueprint declares no `nature` (change A).
   */
  ownership?: 'authored' | 'derived'
}

export interface ConsolePayload {
  schema: ConsoleSchemaSlot
  model: {
    meta: ConsolePayloadMeta
    elements: ConsolePayloadElement[]
    matrices: ConsolePayloadMatrix[]
    /**
     * One collection per concept: the member addresses of `collection(C)`, as the
     * domain index resolved them. Filled by the caller that HAS the index; the
     * builder never reads a domaiNN itself.
     */
    collections?: Record<string, string[]>
    changes?: ChangesetRecord[]
    files?: ConsolePayloadFiles
  }
}

export interface BuildConsolePayloadOptions {
  content: string
  path?: string
  /**
   * The model's hierarchical `ModelId`, from the domain index. Identity is the
   * index's job: a model discovered under `series/x/assets/intro/` is
   * `x/intro`, which no path apple can derive. When absent the caller has no
   * index (a standalone single-file build), and `standaloneModelId` derives the
   * compact stem from the file name.
   */
  modelId?: string
  schema?: any
  resolver?: SourceResolver
  changesets?: ChangesetRecord[]
  generated?: string
  /** Blueprint procedure catalog to attach to the schema slot (parent + includes). */
  procedures?: ConsoleProcedureSlot[]
  /** `collection(Concept)` member addresses, resolved by the caller from the index. */
  collections?: Record<string, string[]>
  /** Model identifiers (or filter predicate) to restrict which changeset targets attach history. */
  modelKeys?: Set<string> | string[]
  modelFilter?: Set<string> | string[] | ((modelPart: string) => boolean)
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
 * The id of a model the caller could not give an index id for: the compact stem
 * of the file name (`pepper-mapache_coNNtent_NN.md` -> `pepper-mapache`), or
 * the title slug when there is no file name. A standalone single-file build can
 * know this much and no more; a placed instance model needs the domain index
 * (its id is its container chain, not its file name), so callers with an index
 * MUST pass `modelId`.
 */
function standaloneModelId(filePath?: string, fallbackTitle?: string): string {
  if (filePath) {
    const base = filePath.split(/[\\/]/).pop() ?? ''
    const stem = displayStem(base)
    if (stem) return stem
  }
  return fallbackTitle ? slugify(fallbackTitle) : 'model'
}

/**
 * Builds the canonical 2-slot console payload (schema + model).
 */
export function buildConsolePayload(options: BuildConsolePayloadOptions): ConsolePayload {
  const { content, path: modelPath, schema: inputSchema, resolver, changesets, generated } = options
  const rawSha256 = computeSha256(content)
  const parsed = parseKnowledge(content)
  const fm = (parsed.frontmatter || parseFrontmatter(content) || {}) as Record<string, any>

  const title =
    fm.title ||
    fm.name ||
    (modelPath ? displayStem(modelPath.split(/[/\\]/).pop() ?? '') : 'Model') ||
    'Model'
  const template = fm.target_blueprint || fm.blueprint || fm.template || undefined
  const modelVersion = fm.knowledge_version || fm.version || 'V_0-1-0'
  const modelId = options.modelId || standaloneModelId(modelPath, title)

  const modelKeys = options.modelKeys
    ? options.modelKeys instanceof Set
      ? options.modelKeys
      : new Set(options.modelKeys.map((k) => String(k).toLowerCase()))
    : options.modelFilter
      ? options.modelFilter
      : options.modelId
        ? new Set([
            options.modelId.toLowerCase(),
            options.modelId.replace(/_V_[0-9].*$/i, '').toLowerCase(),
            ...(options.modelId.includes('/')
              ? [
                  options.modelId.split('/').pop()!.toLowerCase(),
                  options.modelId
                    .split('/')
                    .pop()!
                    .replace(/_V_[0-9].*$/i, '')
                    .toLowerCase(),
                ]
              : []),
            ...(title ? [title.toLowerCase(), slugify(title).toLowerCase()] : []),
            ...(modelPath
              ? [
                  modelPath.replace(/\\/g, '/').toLowerCase(),
                  (modelPath.split(/[/\\]/).pop() ?? '')
                    .replace(/(_NN)?\.[^.]+$/, '')
                    .toLowerCase(),
                  (modelPath.split(/[/\\]/).pop() ?? '')
                    .replace(/(_NN)?\.[^.]+$/, '')
                    .replace(/_V_[0-9].*$/i, '')
                    .toLowerCase(),
                  (modelPath.split(/[/\\]/).pop() ?? '').replace(/\.[^.]+$/, '').toLowerCase(),
                  (modelPath.split(/[/\\]/).pop() ?? '')
                    .replace(/\.[^.]+$/, '')
                    .replace(/_V_[0-9].*$/i, '')
                    .toLowerCase(),
                ]
              : []),
            ...(fm.id ? [String(fm.id).toLowerCase()] : []),
            ...(fm.modelId ? [String(fm.modelId).toLowerCase()] : []),
          ])
        : undefined

  // One log for the whole payload: the element history reads it (built once, never
  // per element).
  const changeLog =
    Array.isArray(changesets) && changesets.length > 0
      ? buildChangeLogFromChangesets(changesets as unknown as ChangesetLike[])
      : undefined

  // Elements (Pass 1: instantiate elements and compute hashes)
  const rawElements: {
    elem: ConsolePayloadElement
    rawFields: Record<string, unknown>
  }[] = []

  const elementsByName = new Map<string, ConsolePayloadElement>()
  const elementsById = new Map<string, ConsolePayloadElement>()
  const unfrozen: string[] = []

  const resolvedBlueprintSchema =
    typeof inputSchema === 'string'
      ? resolveBlueprintSchema(inputSchema).schema
      : (inputSchema as any)

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
      const description = node.description || (fields.description as string) || ''
      if (fields.description) delete fields.description

      const hash = computeElementHash({
        concept,
        name,
        description,
        fields,
        markers,
      })

      // Compute inherited field values delta
      const conceptDefs = resolvedBlueprintSchema?.concepts
        ? (Array.isArray(resolvedBlueprintSchema.concepts)
            ? resolvedBlueprintSchema.concepts
            : Object.values(resolvedBlueprintSchema.concepts)
          ).find((c: any) => c?.name?.toLowerCase() === concept.toLowerCase())?.fields
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
        `node skills/nn-update/scripts/migrate-domain.js --domain-dir <dir> --freeze-slugs).`,
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
      // Table order, rows and columns holding only `-` included.
      const { rows, cols } = matrixAxes({
        ...mat,
        cells: Array.isArray(mat.cells) ? mat.cells : [],
      })
      const cellsObj: Record<string, Record<string, unknown>> = {}
      if (Array.isArray(mat.cells)) {
        for (const cell of mat.cells) {
          if (!cellsObj[cell.row]) {
            cellsObj[cell.row] = {}
          }
          cellsObj[cell.row][cell.col] = cell.value
        }
      }
      const headRows: Record<string, ConsoleMatrixHeadEntry> = {}
      const headCols: Record<string, ConsoleMatrixHeadEntry> = {}
      for (const r of rows) {
        headRows[r] = {
          label: r,
          concept: mat.source || undefined,
          kind: 'element',
          slug: elementsByName.get(r.toLowerCase())?.slug || slugify(r),
        }
      }
      for (const c of cols) {
        headCols[c] = {
          label: c,
          concept: mat.target || undefined,
          kind: 'element',
          slug: elementsByName.get(c.toLowerCase())?.slug || slugify(c),
        }
      }
      // A matrix ships its definition and its cells. It carries no per-cell
      // `{history, origin}` map: the export used to derive one per non-empty cell
      // (`<model-id>@<matrix-slug>&<row-slug>&<col-slug>`) and no browser-side
      // console source read it — every view renders the cell VALUE. The element
      // `history` map the Changes tab does read is attached below, on elements.
      matrices.push({
        name: mat.name,
        slug: slugify(mat.name),
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
    resolvedBlueprintSchema,
    elements,
    options.procedures,
    parsed.conceptFields,
  )
  // Attach changeset lineage AFTER the schema slot so the schema is unaffected by
  // history (only the model slot carries it).
  attachChangesetHistory(
    elements,
    changesets,
    resolver
      ? (evidence: string) => resolveEvidenceCitation(evidence, resolver, modelPath || '')
      : undefined,
    changeLog,
    modelKeys,
  )
  const genTime = generated || new Date().toISOString()

  const normalizedSource = modelPath
    ? modelPath
        .split('\\')
        .join('/')
        .replace(/^models\//i, 'kNNowledge/')
        .replace(/^.*?\/(kNNowledge\/)/i, '$1')
    : fm.title
      ? `kNNowledge/${slugify(fm.title)}_NN.md`
      : 'kNNowledge/Model_NN.md'
  const sourceFile =
    modelPath && (modelPath.includes('/') || modelPath.includes('\\'))
      ? normalizedSource
      : normalizedSource.startsWith('kNNowledge/')
        ? normalizedSource
        : `kNNowledge/${normalizedSource}`

  const ownership =
    natureOfBlueprint(coreBlueprintKey(parentSpecNameOf(fm)))?.ownership ?? 'authored'
  const meta: ConsolePayloadMeta = {
    modelId,
    title,
    modelVersion,
    sha256: rawSha256,
    sources: [sourceFile],
    generated: genTime,
    changesBlueprintVersion: findCanonicalBlueprint('changes')?.version ?? '',
    ownership,
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
      ...(options.collections ? { collections: options.collections } : {}),
    },
  }
}
