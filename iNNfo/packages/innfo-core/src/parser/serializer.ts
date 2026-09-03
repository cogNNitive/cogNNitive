import { ParsedModel } from '../types'
import { stringify as yamlStringify } from 'yaml'
import { printTaxonomyNode } from './taxonomy'

/** Serializes a property value into the unified `key:: value` form. */
function serializePropertyValue(value: unknown): string {
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
      return `[${value.map(serializePropertyValue).join(', ')}]`
    }
  }
  return JSON.stringify(value)
}

export function serializeModel(model: ParsedModel): string {
  const lines: string[] = []
  const fm = model.frontmatter
  lines.push('---')
  if (fm.level !== 3 || fm.spec_version) {
    // Fallback only reached for a non-level-3 doc that somehow lacks an
    // explicit spec_version; track the adopted L1 (iNNfo_V_0-2-0), not the
    // superseded one.
    lines.push(`spec_version: "${fm.spec_version || 'V_0-2-0'}"`)
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
  if ((fm as any).parent !== undefined) {
    const val = (fm as any).parent
    lines.push(yamlStringify({ parent: val }).trim())
  }
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
    '> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://innfo.cognnitive.com/app/innfo-doc).',
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
        lines.push(`  ${k}:: ${serializePropertyValue(v)}`)
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
