import { ParsedModel } from '../types'
import { stringify as yamlStringify } from 'yaml'
import { printTaxonomyNode } from './taxonomy'
import { SOURCE_FIELD_NAMES } from '../sourceRef'

/**
 * Serializes a property value into the unified `key:: value` form.
 *
 * `fieldName`, when provided, lets citation-list fields (`sources`/`source`,
 * see `SOURCE_FIELD_NAMES`) use the spec-correct unquoted bracket-list
 * grammar that `splitSourceFieldValue` (`sourceRef.ts`) already expects on
 * the read side, instead of falling through to `JSON.stringify`. Detection is
 * keyed by field NAME, never by value shape: this function serializes EVERY
 * field of EVERY model, and non-citation fields that happen to look like
 * bracket lists (`options`, `values`, `applies_to`, `target_concepts`, ...)
 * MUST keep serializing exactly as before this branch was added.
 */
function serializePropertyValue(value: unknown, fieldName?: string): string {
  if (fieldName && SOURCE_FIELD_NAMES.has(fieldName.toLowerCase())) {
    const citation = serializeCitationValue(value)
    if (citation !== null) return citation
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    // WikiLinks [[Name]]
    if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
      return trimmed
    }
  } else if (Array.isArray(value)) {
    // If it contains a WikiLink, serialize elements individually
    const hasWikiLink = value.some(
      (v) => typeof v === 'string' && v.trim().startsWith('[[') && v.trim().endsWith(']]'),
    )
    if (hasWikiLink) {
      return `[${value.map((v) => serializePropertyValue(v)).join(', ')}]`
    }
  }
  return JSON.stringify(value)
}

/**
 * Citation-list grammar for `sources::`/`source::` values: a bare unquoted
 * scalar, or a bracketed list of bare unquoted items joined with `, '`.
 * Returns `null` (caller falls through to the default `JSON.stringify` path,
 * unchanged from before this change) when any item is not a plain string or
 * contains a character (`,` `[` `]`) that `splitSourceFieldValue`'s naive
 * comma-split on a bracketed string cannot round-trip safely.
 */
function serializeCitationValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    if (!value.every(isSafeCitationItem)) return null
    return `[${value.join(', ')}]`
  }
  if (isSafeCitationItem(value)) return value
  return null
}

function isSafeCitationItem(v: unknown): v is string {
  return typeof v === 'string' && !/[,[\]]/.test(v)
}

export function serializeModel(model: ParsedModel): string {
  const lines: string[] = []
  const fm = model.frontmatter
  lines.push('---')
  if (fm.level !== 3 || fm.spec_version) {
    // Fallback only reached for a non-level-3 doc that somehow lacks an
    // explicit spec_version; track the adopted L1 (iNNfo_V_0-2-1), not the
    // superseded one.
    lines.push(`spec_version: "${fm.spec_version || 'V_0-2-1'}"`)
  }
  if (fm.spec_url) {
    lines.push(`spec_url: "${fm.spec_url}"`)
  }
  if (fm.level !== undefined) lines.push(`level: ${fm.level}`)
  if (fm.parent_spec) {
    lines.push('parent_spec:')
    lines.push(`  name: "${fm.parent_spec.name}"`)
    lines.push(`  url: "${fm.parent_spec.url}"`)
  } else if ((fm as any).parent !== undefined) {
    const val = (fm as any).parent
    if (typeof val === 'string') {
      lines.push(`parent: "${val}"`)
    } else {
      lines.push(yamlStringify({ parent: val }).trim())
    }
  }
  if (fm.model_version) lines.push(`model_version: "${fm.model_version}"`)
  if (fm.title) lines.push(`title: "${fm.title}"`)
  if (fm.mode) lines.push(`mode: "${fm.mode}"`)
  if ((fm as any).template !== undefined) {
    const val = (fm as any).template
    lines.push(yamlStringify({ template: val }).trim())
  }
  // `parent` is already emitted above, in the `else if` paired with
  // `parent_spec`. A second unconditional emit here produced a duplicate
  // `parent:` key (invalid YAML) whenever the frontmatter carried `parent`.
  if ((fm as any).last_saved !== undefined) {
    lines.push(`last_saved: "${(fm as any).last_saved}"`)
  }
  if ((fm as any).last_updated !== undefined) {
    lines.push(`last_updated: "${(fm as any).last_updated}"`)
  }

  // Matrix declarations
  const matrices = fm.matrices as
    | Array<{
        name: string
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
  lines.push('')
  lines.push('> [!NOTE]')
  lines.push(
    '> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/innfo-doc).',
  )
  lines.push('')

  if (model.taxonomy.length > 0) {
    lines.push('# NN index')
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

  for (const [conceptName, elementNodes] of model.elements.entries()) {
    lines.push(`# NN ${conceptName}`)
    if (model.conceptTags?.[conceptName] && model.conceptTags[conceptName].length > 0) {
      lines.push(`tags:: ${model.conceptTags[conceptName].join(', ')}`)
    }
    for (const node of elementNodes) {
      lines.push(`## NN ${conceptName}: ${node.name}`)
      if (node.tags && node.tags.length > 0) {
        lines.push(`  tags:: ${node.tags.join(', ')}`)
      }
      for (const [k, v] of Object.entries(node.fields)) {
        lines.push(`  ${k}:: ${serializePropertyValue(v, k)}`)
      }
      if (node.description) {
        for (const descLine of node.description.split('\n')) {
          lines.push(`  ${descLine}`)
        }
      }
    }
    lines.push('')
  }

  // Preserve `text`-type concepts (single-block concepts with no element
  // markers). Their content lives in rawSections keyed by concept name and
  // must round-trip back into the serialized document.
  if (model.rawSections) {
    for (const [conceptName, body] of Object.entries(model.rawSections)) {
      if (model.elements.has(conceptName)) continue
      if (!body.trim()) continue
      lines.push(`# NN ${conceptName}`)
      lines.push('')
      lines.push(body)
      lines.push('')
    }
  }

  for (const matrix of model.matrices) {
    // Preserve declaration-only matrices (no cells) too: a `# NN matrices:`
    // block that only declares the matrix must not silently vanish on
    // round-trip, otherwise the tree loses the matrix entirely.
    lines.push(`# NN matrices: ${matrix.name}`)
    const colSet = new Set(matrix.cells.map((c) => c.col))
    const rowSet = new Set(matrix.cells.map((c) => c.row))
    const cols = Array.from(colSet)
    const rows = Array.from(rowSet)
    const cellMap = new Map(matrix.cells.map((c) => [`${c.row}||${c.col}`, c.value]))

    const headerLine = `| ${matrix.source || 'Row'} \\ ${matrix.target || 'Col'} | ${cols.join(' | ')} |`
    const sepLine = `| :--- | ${cols.map(() => ':---:').join(' | ')} |`
    lines.push(headerLine)
    lines.push(sepLine)
    for (const row of rows) {
      const vals = cols.map((c) => cellMap.get(`${row}||${c}`) || '-')
      lines.push(`| ${row} | ${vals.join(' | ')} |`)
    }
    lines.push('')
  }

  // Node markers (item-markers matrix)
  const nodeMarkerEntries = Object.entries(model.nodeMarkers)
  if (nodeMarkerEntries.length > 0) {
    lines.push('# NN matrices: item-markers matrix')
    // Collect all unique marker keys
    const markerKeys = new Set<string>()
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

  return lines.join('\n')
}
