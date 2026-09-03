import { ParsedModel, ElementsMap, MatrixData, SpecFrontmatter, TaxonomyEdge } from '../types'
import { normalizeSource, YAML_BLOCK_RE, parseMarkdownTable } from './markdown'
import { parseFrontmatter } from './yaml'
import { parseIndexBlock } from './taxonomy'
import { parseConceptSection, parseMatrixSection, getSectionType, sectionTitle } from './sections'
import { slugify } from './slug'

/**
 * Derive slugs for all elements that don't have one, and detect collisions.
 * Called after all sections are parsed, once all elements are known.
 * Returns aggregated collisions keyed by slug.
 */
export function deriveElementSlugs(
  elements: ElementsMap,
): Array<{ slug: string; elements: string[]; concept: string }> {
  const usedSlugs = new Map<string, { name: string; concept: string }>()
  const colliding = new Map<string, { elements: Set<string>; concept: string }>()

  for (const [conceptName, elementNodes] of elements.entries()) {
    for (const el of elementNodes) {
      if (el.slug === undefined) {
        const ownerConcept =
          typeof el.fields['concept'] === 'string' && el.fields['concept'].trim() !== ''
            ? el.fields['concept'].trim()
            : undefined
        el.slug = ownerConcept ? slugify(`${ownerConcept}.${el.name}`) : slugify(el.name)
      }
      const existing = usedSlugs.get(el.slug!)
      if (existing) {
        if (!colliding.has(el.slug!)) {
          const set = new Set<string>([existing.name, el.name])
          colliding.set(el.slug!, { elements: set, concept: conceptName })
        } else {
          colliding.get(el.slug!)!.elements.add(el.name)
        }
      } else {
        usedSlugs.set(el.slug!, { name: el.name, concept: conceptName })
      }
    }
  }

  return Array.from(colliding.entries()).map(([slug, info]) => ({
    slug,
    elements: Array.from(info.elements),
    concept: info.concept,
  }))
}

export function parseModel(content: string): ParsedModel {
  const normalizedContent = normalizeSource(content)
  const frontmatter = parseFrontmatter(normalizedContent)
  const elements = new ElementsMap()
  const matrices: MatrixData[] = []
  const nodeMarkers: Record<string, Record<string, number | string>> = {}
  let taxonomy: TaxonomyEdge[] = []
  const conceptTags: Record<string, string[]> = {}

  const body = normalizedContent.replace(YAML_BLOCK_RE, '').trim()
  const sections = body.split(/(?=^#\s)/m)
  const rawSections: Record<string, string> = {}

  for (const section of sections) {
    const headerMatch = section.match(/^#\s+(.*)$/m)
    if (!headerMatch) continue
    const rawTitle = headerMatch[1].trim()
    const type = getSectionType(rawTitle)
    const name = sectionTitle(rawTitle)
    const bodyContent = section.replace(/^#\s+.*$/m, '').trim()

    if (type === 'index') {
      taxonomy = parseIndexBlock(bodyContent)
    } else if (type === 'concept') {
      const parsed = parseConceptSection(name, bodyContent)
      if (parsed.elements.length > 0) {
        const existing = elements.get(name)
        if (existing) {
          existing.push(...parsed.elements)
        } else {
          elements.set(name, parsed.elements)
        }
      }
      if (parsed.tags) {
        conceptTags[name] = parsed.tags
      }
      // Preserve the concept's raw body for round-trip fidelity AND as the
      // concept-level description/content of `text` concepts. Concepts with
      // element markers carry their content in `elements`; element-free
      // concepts (e.g. `text`) keep their free-form Markdown here. Empty
      // sections are skipped so ghost detection still flags no-content
      // concepts.
      if (parsed.elements.length === 0 && bodyContent.trim()) {
        rawSections[name] = bodyContent
      }
    } else if (type === 'matrix') {
      if (name.toLowerCase() === 'item-markers matrix') {
        const rows = parseMarkdownTable(bodyContent)
        for (const row of rows) {
          const keys = Object.keys(row)
          if (keys.length > 0) {
            const itemName = row[keys[0]]
            if (itemName) {
              nodeMarkers[itemName] = {}
              for (let i = 1; i < keys.length; i++) {
                if (row[keys[i]] && row[keys[i]] !== '-') {
                  nodeMarkers[itemName][keys[i]] = isNaN(Number(row[keys[i]]))
                    ? row[keys[i]]
                    : Number(row[keys[i]])
                }
              }
            }
          }
        }
      } else {
        const matrixDecl = frontmatter?.matrices?.find(
          (m) => m.name.toLowerCase() === name.toLowerCase(),
        )
        const cells = parseMatrixSection(bodyContent, name)
        matrices.push({
          name,
          source: matrixDecl?.source ?? '',
          target: matrixDecl?.target ?? '',
          cells,
        })
      }
    }
  }

  // Derive slugs and detect collisions (FR-002)
  const collisions = deriveElementSlugs(elements)
  const slugCollisions =
    collisions.length > 0
      ? collisions.map((c) => ({ slug: c.slug, elements: c.elements, concept: c.concept }))
      : undefined

  // FR-007: Warn about deprecated FOLDER mode
  const parseWarnings: string[] = []
  if (frontmatter?.mode === 'FOLDER') {
    parseWarnings.push(
      'FOLDER mode is removed in V_0-1-3. Use index.md-based workspace with single-file models.',
    )
  }

  return {
    frontmatter: frontmatter ?? ({} as SpecFrontmatter),
    taxonomy,
    elements,
    matrices,
    nodeMarkers,
    slugCollisions,
    parseWarnings: parseWarnings.length > 0 ? parseWarnings : undefined,
    conceptTags: Object.keys(conceptTags).length > 0 ? conceptTags : undefined,
    rawSections: Object.keys(rawSections).length > 0 ? rawSections : undefined,
    rawContent: content,
  }
}
