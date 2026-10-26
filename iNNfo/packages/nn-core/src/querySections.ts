import { extractHeadings, normalizeName, slugifyHeading, splitBracketList } from './sourceRef.js'
import { FIELD_LINE, sectionOwnLines } from './unitResolve.js'

export interface SectionFields {
  slug: string
  level: number
  text: string
  concept?: string
  conceptSlug?: string
  /** Normalized field name → matchable item values. */
  fields: Map<string, string[]>
  /** Normalized field name → raw trimmed value (for projection). */
  rawFields: Map<string, string>
}

/**
 * Scan a Markdown document into per-section field maps (template-free: headings
 * plus `key::` lines only). Mirrors the section-boundary semantics of
 * `resolveHeadingSection`. First occurrence wins for duplicate field names.
 */
export function scanSections(content: string): SectionFields[] {
  const headings = extractHeadings(content)
  const lines = content.split('\n')
  let currentH1Concept: string | undefined

  return headings.map((h) => {
    if (h.level === 1) {
      const match = h.text.match(/^NN\s+([^:\n]+)/i)
      currentH1Concept = match ? match[1].trim() : undefined
    }
    const conceptName = h.concept
      ? h.concept.replace(/^NN\s+/i, '').trim()
      : (h.level > 1 ? currentH1Concept : undefined)
    const conceptSlug = conceptName ? slugifyHeading(conceptName) : undefined

    // Nearest-section ownership (shared with validation): a parent Concept
    // never matches its Elements' fields.
    const owned = sectionOwnLines(content, h.slug) ?? []
    const fields = new Map<string, string[]>()
    const rawFields = new Map<string, string>()
    for (const i of owned) {
      const match = lines[i].match(FIELD_LINE)
      if (!match) continue
      const name = normalizeName(match[1])
      if (fields.has(name)) continue
      const raw = lines[i].slice(lines[i].indexOf('::') + 2).trim()
      fields.set(name, splitBracketList(raw))
      rawFields.set(name, raw)
    }
    return { slug: h.slug, level: h.level, text: h.text, concept: conceptName, conceptSlug, fields, rawFields }
  })
}
