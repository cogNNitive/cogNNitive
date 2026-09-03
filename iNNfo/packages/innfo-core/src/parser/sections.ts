import { ElementNode, MatrixCell } from '../types'
import { parseMarkdownTable } from './markdown'

/**
 * Unified syntax (Metaplantilla Nivel 1, V_0-1-0). There is NO legacy syntax:
 *
 *   Concept section:  `# NN <Concept>`              (H1 heading)
 *   Element heading:  `## NN <Concept>: <Element>`  (H2 heading)
 *   Property line:    `key:: value`                 (immediately after the H2)
 */

/** Unified element heading: `## NN Concept: Element`. */
const UNIFIED_ELEMENT_RE = /^\s*##\s+NN\s+([^:\n]+?):\s+(.*)$/

/** Property line: `key:: value`. */
const PROPERTY_RE = /^\s*([A-Za-z_][A-Za-z0-9_-]*)\s*::\s*(.*)$/

/** Section heading marker: `NN`, followed by `matrices: name` or a bare concept name. */
const SECTION_RE = /^NN\s+(?:(matrices):\s*(.*)|(.*))/

export function sectionName(rawTitle: string): string | null {
  const fm = rawTitle.match(SECTION_RE)
  if (fm) {
    if (fm[1]) return fm[1] // 'matrices'
    if (fm[3] != null) return 'concepts' // implicit 'concepts' for bare ConceptName
  }
  return null
}

export function sectionTitle(rawTitle: string): string {
  const fm = rawTitle.match(SECTION_RE)
  if (fm) {
    if (fm[2]) return fm[2].trim() // matrix name
    if (fm[3] != null) return fm[3].trim() // concept name
  }
  return rawTitle
}

/** Unified element heading parser: `## NN <Concept>: <Element>`. */
export function parseElementHeading(line: string): string | null {
  const match = line.match(UNIFIED_ELEMENT_RE)
  if (match) return match[2].trim()
  return null
}

/** Unified property line parser: `key:: value`. Returns `[key, value]`. */
export function parsePropertyLine(line: string): [string, string] | null {
  const match = line.match(PROPERTY_RE)
  if (!match) return null
  return [match[1], match[2].trim()]
}

/** Parses a property value into a plain JS value (arrays, numbers, booleans, quoted strings). */
export function parsePropertyValue(raw: string): unknown {
  const value = raw.trim()
  if (value === '') return ''
  if (
    (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
    (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
  ) {
    return value.slice(1, -1)
  }
  // WikiLinks [[Name]] or [[Name1, Name2]] — return as-is (reference fields)
  if (value.startsWith('[[') && value.endsWith(']]')) {
    return value
  }
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim()
    if (inner === '') return []
    return inner.split(',').map((part) => parsePropertyValue(part.trim()))
  }
  if (value.startsWith('{') && value.endsWith('}')) {
    try {
      return JSON.parse(value)
    } catch {
      /* fall through to scalar parsing */
    }
  }
  if (value.toLowerCase() === 'true') return true
  if (value.toLowerCase() === 'false') return false
  if (value.toLowerCase() === 'null') return null
  if (/^-?\d+$/.test(value)) return parseInt(value, 10)
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value)
  return value
}

export interface ParsedConceptSection {
  /** Element instances parsed from `## NN` headings (empty for `text` concepts). */
  elements: ElementNode[]
  /** Free-form Markdown content that precedes/falls outside any element
   *  (the full section body for `text` concepts; leading prose for others). */
  content: string
  tags?: string[]
}

export function parseConceptSection(conceptName: string, content: string): ParsedConceptSection {
  const nodes: ElementNode[] = []
  const lines = content.split('\n')
  let current: ElementNode | null = null
  let descriptionLines: string[] = []
  const leadingLines: string[] = []
  let seenElement = false

  const startElement = (name: string): ElementNode => {
    if (current) {
      current.description = descriptionLines.join('\n').trim()
      nodes.push(current)
    }
    const node: ElementNode = { type: conceptName, name, description: '', fields: {}, markers: {} }
    descriptionLines = []
    seenElement = true
    return node
  }

  let conceptTags: string[] | undefined

  for (const line of lines) {
    // Unified element heading: `## NN Concept: Element`
    const headingName = parseElementHeading(line)
    if (headingName !== null) {
      current = startElement(headingName)
      continue
    }

    // Unified property line: `key:: value` (immediately after an element heading)
    if (current) {
      const prop = parsePropertyLine(line)
      if (prop !== null) {
        if (prop[0] === 'slug') {
          current.slug = String(prop[1])
        } else if (prop[0] === 'tags') {
          current.tags = String(prop[1])
            .split(',')
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean)
        } else {
          current.fields[prop[0]] = parsePropertyValue(prop[1])
        }
        continue
      }
    } else {
      const prop = parsePropertyLine(line)
      if (prop !== null && prop[0] === 'tags') {
        conceptTags = String(prop[1])
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
        continue
      }
    }

    if (!line.trim().startsWith('*') && !line.trim().startsWith('-')) {
      if (seenElement) {
        descriptionLines.push(line)
      } else {
        leadingLines.push(line)
      }
    }
  }

  if (current) {
    current.description = descriptionLines.join('\n').trim()
    nodes.push(current)
  }

  return {
    elements: nodes,
    content: leadingLines.join('\n').trim(),
    tags: conceptTags,
  }
}

export function parseMatrixSection(content: string, _matrixName: string): MatrixCell[] {
  const rows = parseMarkdownTable(content)
  if (rows.length === 0) return []
  const colNames = Object.keys(rows[0] || {})
  const cells: MatrixCell[] = []
  for (const row of rows) {
    const rowName = colNames.length > 0 ? row[colNames[0]] || '' : ''
    for (let i = 1; i < colNames.length; i++) {
      if (row[colNames[i]]) {
        cells.push({ row: rowName, col: colNames[i], value: row[colNames[i]] })
      }
    }
  }
  return cells
}

export function getSectionType(rawTitle: string): 'index' | 'concept' | 'matrix' | 'other' {
  const sn = sectionName(rawTitle)
  if (!sn) return 'other'
  const s = sn.toLowerCase()
  if (s === 'concepts') {
    const name = sectionTitle(rawTitle).toLowerCase()
    if (name === 'index') return 'index'
    return 'concept'
  }
  if (s === 'matrices') return 'matrix'
  return 'other'
}
