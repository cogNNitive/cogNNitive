import { ParsedKnowledge, ElementNode, MatrixData, SpecFrontmatter } from '../types/index.js'
import { parseFrontmatter } from './yaml.js'
import { stringify as yamlStringify } from 'yaml'
import { printTaxonomyNode } from './taxonomy.js'
import { parsePropertyValue, parseTagList } from './sections.js'
import {
  SOURCE_FIELD_NAMES,
  parseCitation,
  serializeKnowledgeUnitRef,
} from '../sourceRef.js'

/**
 * Serializes a property value into the unified `key:: value` form.
 *
 * `rawText`, when provided, is the exact RHS text `parseKnowledge` originally
 * read for this field (`ElementNode.rawFields[key]`). When re-parsing it
 * still produces the current `value` — i.e. the field was not touched by a
 * mutation since it was read — it is re-emitted byte-for-byte, preserving
 * the author's own quoting and bracket choices (Requirement 5). Only a field
 * with no matching raw text (new, or changed by a mutation) falls through to
 * the canonical rules below.
 */
function serializePropertyValue(value: unknown, rawText?: string): string {
  if (rawText !== undefined && rawTextStillMatches(rawText, value)) {
    return rawText
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    // WikiLinks [[Name]]
    if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
      return trimmed
    }
    return serializeScalarString(value)
  }
  if (Array.isArray(value)) {
    // If it contains a WikiLink, serialize elements individually
    const hasWikiLink = value.some(
      (v) => typeof v === 'string' && v.trim().startsWith('[[') && v.trim().endsWith(']]'),
    )
    if (hasWikiLink) {
      return `[${value.map((v) => serializePropertyValue(v)).join(', ')}]`
    }
    const list = serializeListValue(value)
    if (list !== null) return list
  }
  return JSON.stringify(value)
}

/** True when re-parsing `rawText` yields the same value currently held —
 *  i.e. nothing mutated this field since `parseKnowledge` read it. */
function rawTextStillMatches(rawText: string, value: unknown): boolean {
  try {
    return JSON.stringify(parsePropertyValue(rawText)) === JSON.stringify(value)
  } catch {
    return false
  }
}

/**
 * Canonical scalar-string grammar (Level-1 spec, "Unified Syntax"): plain
 * unquoted text by default, quoted only when the bare form would round-trip
 * through `parsePropertyValue` as something else (a number, boolean, `null`,
 * an empty value, a bracket/object literal, or leading/trailing whitespace).
 */
function serializeScalarString(value: string): string {
  if (needsQuoting(value)) return JSON.stringify(value)
  return value
}

function needsQuoting(value: string): boolean {
  if (value === '') return true
  if (value !== value.trim()) return true
  if (/\n/.test(value)) return true
  if (/^[[{"']/.test(value)) return true
  const lower = value.toLowerCase()
  if (lower === 'true' || lower === 'false' || lower === 'null') return true
  if (/^-?\d+$/.test(value) || /^-?\d+\.\d+$/.test(value)) return true
  return false
}

/**
 * Bracket-list grammar (Requirement 5), generalized from the citation-only
 * form it originally shipped as: a bracketed list of bare, unquoted items
 * joined with `, `. Returns `null` (caller falls through to the default
 * `JSON.stringify` path) when any item is not a plain string/number/boolean,
 * or a string item contains a character (`,` `[` `]`) that the naive
 * comma-split reader (`parsePropertyValue`) cannot round-trip safely.
 */
function serializeListValue(value: unknown[]): string | null {
  if (value.length === 0) return '[]'
  if (!value.every(isSafeListItem)) return null
  return `[${value.map(String).join(', ')}]`
}

/**
 * Emits a `tags::` value, preferring the author's exact source text when it
 * still parses to the tags currently held. `parseTagList` lowercases, so
 * without this the authored casing (`PR`) is destroyed on every save while
 * the tag's meaning never changed.
 */
function serializeTagsValue(tags: string[], rawText?: string): string {
  if (rawText !== undefined) {
    try {
      if (JSON.stringify(parseTagList(rawText)) === JSON.stringify(tags)) return rawText
    } catch {
      // fall through to the canonical bracket form
    }
  }
  return `[${tags.join(', ')}]`
}

/**
 * Requirement 6: a citation list never carries the same pointer twice.
 *
 * Comparison is on the PARSED pointer, so `file.md@## X` and
 * `file.md@##x` are recognised as one citation. Returns the value
 * unchanged when nothing was duplicated, which is what keeps this compatible
 * with round-trip identity (Requirement 1): only an already-malformed document
 * is rewritten, and its raw text is deliberately discarded in that one case.
 *
 * The serializer has no schema, so citation fields are recognised by name here
 * — the documented fallback of AD-5.
 */
function dedupeCitationList(value: unknown): unknown {
  if (!Array.isArray(value)) return value
  const seen = new Set<string>()
  const kept: unknown[] = []
  for (const item of value) {
    const text = String(item).trim()
    const parsed = parseCitation(text)
    const key = parsed?.unit
      ? serializeKnowledgeUnitRef(parsed.filePath, parsed.unit, parsed.subunits ?? [])
      : parsed?.filePath
        ? (parsed.slug ? `${parsed.filePath}#${parsed.slug}` : parsed.filePath)
        : text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    kept.push(item)
  }
  return kept.length === value.length ? value : kept
}

function isSafeListItem(v: unknown): boolean {
  if (typeof v === 'number' || typeof v === 'boolean') return true
  return typeof v === 'string' && !/[,[\]]/.test(v)
}

/**
 * True when re-parsing `rawFrontmatter` yields the frontmatter currently
 * held — i.e. nothing mutated it since `parseKnowledge` read it, so the author's
 * own text (key order, quoting, and any key outside the constructed path's
 * allow-list) can be re-emitted verbatim.
 */
function rawFrontmatterStillMatches(rawFrontmatter: string, fm: SpecFrontmatter): boolean {
  try {
    const reparsed = parseFrontmatter(rawFrontmatter, () => {})
    return JSON.stringify(reparsed) === JSON.stringify(fm)
  } catch {
    return false
  }
}

export function serializeKnowledge(model: ParsedKnowledge): string {
  const lines: string[] = []
  const fm = model.frontmatter
  const useRawFrontmatter =
    model.rawFrontmatter !== undefined && rawFrontmatterStillMatches(model.rawFrontmatter, fm)
  if (useRawFrontmatter) {
    lines.push(...model.rawFrontmatter!.split('\n'))
  } else {
    lines.push('---')
    if (fm.level !== 3 || fm.spec_version) {
      // Fallback only reached for a non-level-3 doc that somehow lacks an
      // explicit spec_version; track the adopted L1 (iNNfo_V_0-5-0), not superseded.
      lines.push(`spec_version: "${fm.spec_version || 'V_0-5-0'}"`)
    }
    if (fm.spec_url) {
      lines.push(`spec_url: "${fm.spec_url}"`)
    }
    if (fm.knowledge_slug) {
      lines.push(`knowledge_slug: "${fm.knowledge_slug}"`)
    }
    if (fm.workspace_id) {
      lines.push(`workspace_id: "${fm.workspace_id}"`)
    }
    if (fm.level !== undefined) lines.push(`level: ${fm.level}`)
    if (fm.parent_spec) {
      lines.push('parent_spec:')
      lines.push(`  name: "${fm.parent_spec.name}"`)
      lines.push(`  url: "${fm.parent_spec.url}"`)
    } else if (fm.parent !== undefined) {
      const val = fm.parent
      if (typeof val === 'string') {
        lines.push(`parent: "${val}"`)
      } else {
        lines.push(yamlStringify({ parent: val }).trim())
      }
    }
    if (fm.knowledge_version) {
      lines.push(`knowledge_version: "${fm.knowledge_version}"`)
    }
    if (fm.blueprint_version) lines.push(`blueprint_version: "${fm.blueprint_version}"`)
    if (fm.blueprint_name) lines.push(`blueprint_name: "${fm.blueprint_name}"`)
    if (fm.knowledge_dir) lines.push(`knowledge_dir: "${fm.knowledge_dir}"`)
    if (fm.blueprints_dir) lines.push(`blueprints_dir: "${fm.blueprints_dir}"`)
    if (fm.title) lines.push(`title: "${fm.title}"`)
    if (fm.mode) lines.push(`mode: "${fm.mode}"`)
    if (fm.template !== undefined) {
      const val = fm.template
      lines.push(yamlStringify({ template: val }).trim())
    }
    // `parent` is already emitted above, in the `else if` paired with
    // `parent_spec`. A second unconditional emit here produced a duplicate
    // `parent:` key (invalid YAML) whenever the frontmatter carried `parent`.
    if (fm.last_saved !== undefined) {
      lines.push(`last_saved: "${fm.last_saved}"`)
    }
    if (fm.last_updated !== undefined) {
      lines.push(`last_updated: "${fm.last_updated}"`)
    }

    // Matrix declarations
    const matrices = fm.matrices as
      | Array<{
          name: string
          slug?: string
          source: string
          target: string
          params?: string
          values?: string[]
          widgetType?: string
          description?: string
          label?: string
          min_color?: string
          max_color?: string
        }>
      | undefined
    if (matrices && matrices.length > 0) {
      lines.push('matrices:')
      for (const m of matrices) {
        lines.push(`  - name: "${m.name}"`)
        if (m.slug) lines.push(`    slug: "${m.slug}"`)
        lines.push(`    source: "${m.source}"`)
        lines.push(`    target: "${m.target}"`)
        if (m.values && m.values.length > 0) {
          lines.push(`    values: [${m.values.join(', ')}]`)
        } else if (m.params) {
          lines.push(`    params: "${m.params}"`)
        }
        if (m.widgetType) lines.push(`    widget: "${m.widgetType}"`)
        if (m.description) lines.push(`    description: "${m.description}"`)
        if (m.label) lines.push(`    label: "${m.label}"`)
        if (m.min_color) lines.push(`    min_color: "${m.min_color}"`)
        if (m.max_color) lines.push(`    max_color: "${m.max_color}"`)
      }
    }

    // Concept declarations (level-2 templates, legacy frontmatter form)
    if (fm.concepts && fm.concepts.length > 0) {
      lines.push('concepts:')
      for (const c of fm.concepts) {
        lines.push(`  - name: "${c.name}"`)
        if (c.slug) lines.push(`    slug: "${c.slug}"`)
        if (c.icon) lines.push(`    icon: "${c.icon}"`)
        if (c.type) lines.push(`    type: "${c.type}"`)
        if (c.color) lines.push(`    color: "${c.color}"`)
        if (c.weight !== undefined) lines.push(`    weight: ${c.weight}`)
      }
    }

    // Marker declarations (level-2 templates, legacy frontmatter form)
    if (fm.markers && fm.markers.length > 0) {
      lines.push('markers:')
      for (const m of fm.markers) {
        lines.push(`  - name: "${m.name}"`)
        if (m.symbol) lines.push(`    symbol: "${m.symbol}"`)
        if (m.icon) lines.push(`    icon: "${m.icon}"`)
        if (m.color) lines.push(`    color: "${m.color}"`)
      }
    }

    lines.push('---')
  }
  lines.push('')
  if (model.rawPreamble) {
    // The author's own banner block, which may carry more than the standard
    // note (template-specific callouts, experimental-feature warnings).
    lines.push(...model.rawPreamble.split('\n'))
  } else {
    lines.push('> [!NOTE]')
    lines.push(
      '> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor; [cogNNitive](https://cognnitive.com/innfo/) shows it in the domain console.',
    )
  }
  lines.push('')

  // AD-2: `model.sectionOrder` (when present) drives emission order, so a
  // `# NN Analysis` text section authored above the element sections stays
  // above them. Each `emit*` below is idempotent (guarded by an "already
  // emitted" set) so the same entry can be dispatched twice — once while
  // walking `sectionOrder`, once while appending anything sectionOrder
  // didn't cover (sections created by a mutation after parsing) — without
  // double-printing.
  // Whether this document put a blank line between a `# NN` heading and the
  // first line of its body. `fallback` is what a programmatically built model
  // (no recorded source) gets for that kind of section.
  const headingBlankLine = (sectionKey: string, fallback: boolean) =>
    model.sectionBlankLine?.[sectionKey.toLowerCase()] ?? fallback

  let indexEmitted = false
  const emitIndex = () => {
    if (indexEmitted) return
    indexEmitted = true
    if (model.taxonomy.length === 0) return
    lines.push('# NN index')
    if (headingBlankLine('index', false)) lines.push('')
    const hasEmptyParent = model.taxonomy.some((e) => e.parent === '')
    if (hasEmptyParent) {
      printTaxonomyNode('', model.taxonomy, lines, -1)
    } else {
      const allParents = new Set(model.taxonomy.map((e) => e.parent))
      const allChildren = new Set(model.taxonomy.map((e) => e.child))
      const rootNames = [...allParents].filter((p) => !allChildren.has(p))
      for (const rootName of rootNames) {
        printTaxonomyNode(rootName, model.taxonomy, lines, 0)
      }
    }
    lines.push('')
  }

  const emittedConcepts = new Set<string>()
  const emittedElements = new Set<ElementNode>()
  const allElements: ElementNode[] = []
  for (const [, list] of model.elements.entries()) {
    allElements.push(...list)
  }

  const emitElement = (node: ElementNode, depth: number, isLast: boolean) => {
    emittedElements.add(node)
    const hDepth = node.headingDepth || depth
    const hashes = '#'.repeat(hDepth)
    lines.push(`${hashes} NN ${node.type}: ${node.name}`)
    // An authored `slug::` is an identity declaration and leads the
    // element. A derived slug is not written: see `slugExplicit`.
    if (node.slugExplicit && node.slug) lines.push(`slug:: ${node.slug}`)
    for (const [k, v] of Object.entries(node.fields)) {
      // A citation field with a repeated pointer is rewritten (dropping
      // its raw text, deliberately); anything else keeps the author's
      // exact source text.
      const value = SOURCE_FIELD_NAMES.has(k.toLowerCase()) ? dedupeCitationList(v) : v
      const raw = value === v ? node.rawFields?.[k] : undefined
      lines.push(`${k}:: ${serializePropertyValue(value, raw)}`)
    }
    if (node.tags && node.tags.length > 0) {
      lines.push(`tags:: ${serializeTagsValue(node.tags, node.rawTags)}`)
    }
    if (node.description) {
      if (node.descriptionBlankLine) lines.push('')
      for (const descLine of node.description.split('\n')) {
        lines.push(descLine)
      }
    }

    // Emit nested child elements immediately after parent body
    const children = allElements.filter(
      (ch) =>
        !emittedElements.has(ch) &&
        ((ch.parentSlug && node.slug && ch.parentSlug.toLowerCase() === node.slug.toLowerCase()) ||
          (ch.parentElement &&
            ch.parentElement.concept.toLowerCase() === node.type.toLowerCase() &&
            (ch.parentElement.name.toLowerCase() === node.name.toLowerCase() ||
              (ch.parentElement.slug &&
                node.slug &&
                ch.parentElement.slug.toLowerCase() === node.slug.toLowerCase())))),
    )

    if (children.length > 0) {
      if (lines.length > 0 && lines[lines.length - 1] !== '') {
        lines.push('')
      }
      children.forEach((child, cIdx) => {
        const isChildLast = cIdx === children.length - 1
        emitElement(child, hDepth + 1, isChildLast)
      })
    }

    if (isLast || node.trailingBlankLine !== false) {
      if (lines.length > 0 && lines[lines.length - 1] !== '') {
        lines.push('')
      }
    }
  }

  const emitConceptSection = (conceptName: string) => {
    const key = conceptName.toLowerCase()
    if (emittedConcepts.has(key)) return
    emittedConcepts.add(key)
    const elementNodes = model.elements.get(conceptName)
    const rawBody = model.rawSections?.[conceptName]
    const unEmitted = elementNodes?.filter((n) => !emittedElements.has(n)) ?? []
    const hasUnEmitted = unEmitted.length > 0
    const cFields = model.conceptFields?.[conceptName]
    const hasConceptFields = cFields && Object.keys(cFields).length > 0
    const hasConceptTags = model.conceptTags?.[conceptName] && model.conceptTags[conceptName].length > 0
    if (!hasUnEmitted && (!rawBody || !rawBody.trim()) && !hasConceptFields && !hasConceptTags) return

    lines.push(`# NN ${conceptName}`)
    const hasProperties = hasConceptFields || hasConceptTags
    if (headingBlankLine(conceptName, true) && !hasProperties) {
      lines.push('')
    }
    if (hasConceptFields) {
      for (const [k, v] of Object.entries(cFields)) {
        if (k === 'tags') {
          // If tags is in conceptFields, emit it via serializeTagsValue if array, or normal
          if (Array.isArray(v)) {
            lines.push(`tags:: ${serializeTagsValue(v, model.rawConceptFields?.[conceptName]?.[k] ?? model.rawConceptTags?.[conceptName])}`)
          } else {
            const raw = model.rawConceptFields?.[conceptName]?.[k]
            lines.push(`${k}:: ${serializePropertyValue(v, raw)}`)
          }
        } else {
          const raw = model.rawConceptFields?.[conceptName]?.[k]
          lines.push(`${k}:: ${serializePropertyValue(v, raw)}`)
        }
      }
    } else if (hasConceptTags) {
      lines.push(
        `tags:: ${serializeTagsValue(model.conceptTags![conceptName], model.rawConceptTags?.[conceptName])}`,
      )
    }
    if (hasProperties && (hasUnEmitted || (rawBody && rawBody.trim()))) {
      lines.push('')
    }
    if (hasUnEmitted) {
      unEmitted.forEach((node, idx) => {
        const isLast = idx === unEmitted.length - 1
        emitElement(node, 2, isLast)
      })
    } else if (rawBody) {
      lines.push(rawBody)
      lines.push('')
    } else {
      lines.push('')
    }
  }

  const matrixBlankLine = (name: string) => headingBlankLine(`matrices: ${name}`, false)

  const emitMatrixTable = (matrix: MatrixData) => {
    // Preserve declaration-only matrices (no cells) too: a `# NN matrices:`
    // block that only declares the matrix must not silently vanish on
    // round-trip, otherwise the tree loses the matrix entirely.
    lines.push(`# NN matrices: ${matrix.name}`)
    if (matrixBlankLine(matrix.name)) lines.push('')
    const colSet = new Set(matrix.cells.map((c) => c.col))
    const rowSet = new Set(matrix.cells.map((c) => c.row))
    const cols = Array.from(colSet)
    const rows = Array.from(rowSet)
    const cellMap = new Map(matrix.cells.map((c) => [`${c.row}||${c.col}`, c.value]))

    // Axis labels are emitted exactly as held, empty ones included. An
    // earlier `Row` / `Col` placeholder was substituted here for label-less
    // matrices; it invented axis names that came back as real data on the
    // next parse, which breaks round-trip identity and idempotency
    // (Requirements 1 and 2). Cosmetics do not outrank fidelity.
    const headerLine = `| ${matrix.source} \\ ${matrix.target} | ${cols.join(' | ')} |`
    const sepLine = `| :--- | ${cols.map(() => ':---:').join(' | ')} |`
    lines.push(headerLine)
    lines.push(sepLine)
    for (const row of rows) {
      const vals = cols.map((c) => cellMap.get(`${row}||${c}`) || '-')
      lines.push(`| ${row} | ${vals.join(' | ')} |`)
    }
    lines.push('')
  }

  let nodeMarkersEmitted = false
  const emitNodeMarkers = () => {
    if (nodeMarkersEmitted) return
    nodeMarkersEmitted = true
    const nodeMarkerEntries = Object.entries(model.nodeMarkers)
    if (nodeMarkerEntries.length === 0) return
    lines.push('# NN matrices: item-markers matrix')
    if (matrixBlankLine('item-markers matrix')) lines.push('')
    // Start from the columns the source table DECLARED, so a marker column
    // whose every cell is `-` is not silently dropped; then add any marker
    // set after parsing (by a mutation) that the declaration did not cover.
    const markerKeys = new Set<string>(model.nodeMarkerColumns ?? [])
    for (const [, markers] of nodeMarkerEntries) {
      for (const key of Object.keys(markers)) {
        markerKeys.add(key)
      }
    }
    const keys = Array.from(markerKeys)
    const headerLine = `| Item \\ Marker | ${keys.join(' | ')} |`
    const sepLine = `| :--- | ${keys.map(() => ':---:').join(' | ')} |`
    lines.push(headerLine)
    lines.push(sepLine)
    for (const [itemName, markers] of nodeMarkerEntries) {
      const vals = keys.map((k) => (markers[k] !== undefined ? String(markers[k]) : '-'))
      lines.push(`| ${itemName} | ${vals.join(' | ')} |`)
    }
    lines.push('')
  }

  const emittedMatrices = new Set<string>()
  const emitMatrixSection = (matrixName: string) => {
    const key = matrixName.toLowerCase()
    if (emittedMatrices.has(key)) return
    emittedMatrices.add(key)
    if (key === 'item-markers matrix') {
      emitNodeMarkers()
      return
    }
    const matrix = model.matrices.find((m) => m.name.toLowerCase() === key)
    if (matrix) emitMatrixTable(matrix)
  }

  for (const entry of model.sectionOrder ?? []) {
    if (entry === 'index') emitIndex()
    else if (entry.startsWith('matrices: ')) emitMatrixSection(entry.slice('matrices: '.length))
    else emitConceptSection(entry)
  }

  // Anything not covered by `sectionOrder` — either because the model was
  // built programmatically (no `sectionOrder` at all) or because a mutation
  // added it after parsing — is appended here, in current insertion order.
  emitIndex()
  for (const [conceptName] of model.elements.entries()) emitConceptSection(conceptName)
  if (model.conceptFields) {
    for (const conceptName of Object.keys(model.conceptFields)) emitConceptSection(conceptName)
  }
  if (model.rawSections) {
    for (const conceptName of Object.keys(model.rawSections)) emitConceptSection(conceptName)
  }
  for (const matrix of model.matrices) emitMatrixSection(matrix.name)
  emitNodeMarkers()

  return lines.join('\n')
}
