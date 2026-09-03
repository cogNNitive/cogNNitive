import { ValidationCheck, ValidationReport } from '../types'
import { parseModel } from '../parser'
import { VERSION_RE, WIKILINK_RE, SECTION_NN_RE } from './constants'
import { CONCEPT_DEFINITION } from '../schema'

/**
 * Validates iNNfo document content (frontmatter + body syntax + conventions).
 * This is the full innfo-editor validator, moved to core for reuse by any client.
 *
 * @param content - Raw file content to validate
 * @param fileName - File name (used for naming convention checks)
 * @param expectedSpecVersion - Optional expected spec_version (e.g. "V_0-1-5").
 *   Pass the current iNNfo spec version to validate spec_version matches.
 */
export function validateFormatContent(
  content: string,
  fileName: string,
  expectedSpecVersion?: string,
): ValidationReport {
  const checks: ValidationCheck[] = []
  const parsed = parseModel(content)
  const fm = parsed.frontmatter

  // ── R-MM-02: Reject reserved concept names ───────────────────
  // Level-2 templates declare concepts as `# NN Concept Definition` body
  // elements; there is no frontmatter `concepts` block anymore.

  const RESERVED_CONCEPT_NAMES = new Set(['Concepts', 'Elements', 'Markers'])
  const reservedViolations: string[] = []
  for (const el of parsed.elements.get(CONCEPT_DEFINITION) ?? []) {
    if (RESERVED_CONCEPT_NAMES.has(el.name)) {
      reservedViolations.push(el.name)
    }
  }
  if (reservedViolations.length > 0) {
    checks.push({
      id: 'fm-reserved-names',
      label: 'No reserved concept names',
      description:
        'Concepts, Elements, and Markers are reserved built-in pseudo-concepts and MUST NOT be declared as concept names',
      category: 'frontmatter',
      severity: 'error',
      passed: false,
      message: `Reserved concept name(s) used: ${reservedViolations.join(', ')}`,
    })
  }

  // ── Template concept hierarchy validation (parent integrity & cycles) ──
  const conceptDefs = parsed.elements.get(CONCEPT_DEFINITION) ?? []
  if (conceptDefs.length > 0) {
    const conceptNames = new Set(conceptDefs.map((c) => c.name.toLowerCase()))
    const parentMap = new Map<string, string>()

    for (const el of conceptDefs) {
      const rawParent = el.fields['parent']
      if (rawParent !== undefined && rawParent !== null && String(rawParent).trim() !== '') {
        let parentName = String(rawParent).trim()
        if (parentName.startsWith('[[') && parentName.endsWith(']]')) {
          parentName = parentName.slice(2, -2).trim()
        }
        if (parentName !== '') {
          const childLower = el.name.toLowerCase()
          const parentLower = parentName.toLowerCase()
          parentMap.set(childLower, parentLower)

          if (!conceptNames.has(parentLower)) {
            checks.push({
              id: 'template-parent-not-found',
              label: 'Parent concept exists in template',
              description: 'The parent concept referenced in parent:: must be defined in the template',
              category: 'body',
              severity: 'error',
              passed: false,
              message: `Concept "${el.name}" references non-existent parent concept "${parentName}"`,
            })
          }
        }
      }
    }

    // Cycle detection
    for (const start of parentMap.keys()) {
      const path = [start]
      let curr = parentMap.get(start)
      while (curr && conceptNames.has(curr)) {
        if (path.includes(curr)) {
          const cyclePath = [...path.slice(path.indexOf(curr)), curr].join(' -> ')
          checks.push({
            id: 'template-parent-cycle',
            label: 'No circular taxonomy hierarchy',
            description: 'Concept parent hierarchy must not contain cycles',
            category: 'body',
            severity: 'error',
            passed: false,
            message: `Circular taxonomy detected in concept hierarchy: ${cyclePath}`,
          })
          break
        }
        path.push(curr)
        curr = parentMap.get(curr)
      }
    }
  }

  // ── FR-007: Reject FOLDER mode ────────────────────────────────

  if (fm.mode === 'FOLDER') {
    checks.push({
      id: 'fm-no-folder-mode',
      label: 'No FOLDER mode in V_0-1-3',
      description:
        'FOLDER mode is removed in V_0-1-3. Use index.md-based workspace with single-file models.',
      category: 'frontmatter',
      severity: 'error',
      passed: false,
      message:
        'FOLDER mode is removed in V_0-1-3. Use index.md-based workspace with single-file models.',
    })
  }

  // ── Frontmatter ────────────────────────────────────────────────

  // 1. level
  const levelOk = fm.level === 3
  checks.push({
    id: 'fm-level',
    label: 'Model level is 3',
    description: 'iNNfo models must declare level: 3',
    category: 'frontmatter',
    severity: 'error',
    passed: levelOk,
    message: levelOk
      ? undefined
      : fm.level === undefined
        ? 'Missing level field'
        : `Expected level 3, got ${fm.level}`,
  })

  // 1b. R-IE-03: No inline schema in level 3 models
  if (levelOk) {
    const hasInlineSchema =
      fm.matrices !== undefined ||
      fm.concepts !== undefined ||
      fm.markers !== undefined ||
      fm.relationship_types !== undefined
    checks.push({
      id: 'fm-no-inline-schema',
      label: 'No inline schema in frontmatter',
      description:
        'Level 3 models must not declare inline schema (matrices, concepts, markers, relationship_types) in their frontmatter',
      category: 'frontmatter',
      severity: 'error',
      passed: !hasInlineSchema,
      message: hasInlineSchema
        ? 'Inline schema fields (matrices, concepts, markers, relationship_types) found in frontmatter. Move them to the template.'
        : undefined,
    })
  }

  // 2. parent_spec
  const parentOk = !!(
    fm.parent_spec &&
    typeof fm.parent_spec === 'object' &&
    fm.parent_spec.name &&
    fm.parent_spec.url
  )
  checks.push({
    id: 'fm-parent',
    label: 'Parent spec reference (name + URL)',
    description: 'Every model must declare its parent_spec with a name and immutable URL',
    category: 'frontmatter',
    severity: 'error',
    passed: parentOk,
    message: parentOk
      ? undefined
      : !fm.parent_spec
        ? 'Missing parent_spec field'
        : !fm.parent_spec.name
          ? 'Parent_spec missing name'
          : 'Parent_spec missing url',
  })

  // 3. model_version present
  const hasVersion = typeof fm.model_version === 'string' && fm.model_version.length > 0
  checks.push({
    id: 'fm-version',
    label: 'Model version declared',
    description: 'model_version field must be present',
    category: 'frontmatter',
    severity: 'error',
    passed: hasVersion,
    message: hasVersion ? undefined : 'Missing model_version',
  })

  // 4. model_version format
  const versionFormatOk = hasVersion && VERSION_RE.test(fm.model_version as string)
  if (hasVersion) {
    checks.push({
      id: 'fm-version-format',
      label: 'Version follows V_MAJOR-MINOR-PATCH',
      description: 'model_version must match V_x-y-z (e.g. V_0-1-0)',
      category: 'frontmatter',
      severity: 'warning',
      passed: versionFormatOk,
      message: versionFormatOk ? undefined : `"${fm.model_version}" does not match V_x-y-z format`,
    })
  }

  // 5. title
  const titleOk = typeof fm.title === 'string' && fm.title.length > 0
  checks.push({
    id: 'fm-title',
    label: 'Title present',
    description: 'Model must declare a title',
    category: 'frontmatter',
    severity: 'error',
    passed: titleOk,
    message: titleOk ? undefined : 'Missing title',
  })

  // 6. spec_version
  const isLevel3 = fm.level === 3
  const specVersionOk = isLevel3 || (typeof fm.spec_version === 'string' && fm.spec_version.length > 0)
  checks.push({
    id: 'fm-spec-version',
    label: 'Specification version declared',
    description: 'spec_version field must be present',
    category: 'frontmatter',
    severity: 'error',
    passed: specVersionOk,
    message: specVersionOk ? undefined : 'Missing spec_version',
  })

  // 6b. spec_version matches expected spec version
  if (expectedSpecVersion) {
    const specMatch = (isLevel3 && !fm.spec_version) || fm.spec_version === expectedSpecVersion
    checks.push({
      id: 'fm-spec-version-match',
      label: 'Specification version matches current spec',
      description: `spec_version should be "${expectedSpecVersion}" for the current iNNfo specification`,
      category: 'frontmatter',
      severity: 'warning',
      passed: specMatch,
      message: specMatch
        ? undefined
        : `Expected "${expectedSpecVersion}", got "${fm.spec_version}"`,
    })
  }

  // ── Body syntax ────────────────────────────────────────────────

  const body = content.replace(/^---[\s\S]*?---\n?/, '').trim()
  const hasBody = body.length > 0

  // 7. Document notice
  if (hasBody) {
    const hasNote = /^> \[!NOTE\]/m.test(body)
    checks.push({
      id: 'body-note',
      label: 'Document notice blockquote',
      description: 'Body should start with a > [!NOTE] blockquote identifying the iNNfo document',
      category: 'body',
      severity: 'warning',
      passed: hasNote,
      message: hasNote ? undefined : 'Missing [!NOTE] document notice in body',
    })
  }

  // 8. Index section / taxonomy check
  const hasIndex = parsed.taxonomy.length > 0
  if (isLevel3 && hasIndex) {
    checks.push({
      id: 'l3-index-ignored',
      label: 'Level 3 models should not declare an NN index',
      description:
        'Taxonomy and concept hierarchy belong to the Level 2 template. The # NN index in Level 3 models will not override template taxonomy.',
      category: 'body',
      severity: 'warning',
      passed: false,
      message:
        'Level 3 model contains an # NN index section. Taxonomy hierarchy is owned by the parent template and will not be overridden.',
    })
  } else {
    const hasConceptsWithParent = (parsed.elements.get(CONCEPT_DEFINITION) ?? []).some(
      (el) => el.fields['parent'] !== undefined && el.fields['parent'] !== '',
    )
    const indexPassed = hasIndex || isLevel3 || hasConceptsWithParent
    checks.push({
      id: 'body-index',
      label: 'Taxonomy index or parent hierarchy',
      description:
        'Templates should have a # NN index section or concept parent:: declarations to control ordering and hierarchy',
      category: 'body',
      severity: 'warning',
      passed: indexPassed,
      message: indexPassed
        ? undefined
        : 'No NN index section or parent:: hierarchy found — concepts will render in front matter declaration order. Add parent:: to concepts or a # NN index section to control ordering and hierarchy.',
    })
  }

  // 9. Concept section markers
  const sectionMatches = [...content.matchAll(SECTION_NN_RE)]
  const conceptSectionCount = sectionMatches.filter((m) => {
    const name = m[1] === 'matrices' ? m[2] : m[3]
    return m[1] !== 'matrices' && name != null && name.trim().toLowerCase() !== 'index'
  }).length
  if (hasBody) {
    const allValid = sectionMatches.every(
      (m) => m[1] === 'matrices' || (m[3] != null && m[3].trim().length > 0),
    )
    checks.push({
      id: 'body-concept-sections',
      label: 'Valid concept section markers',
      description: 'Each concept section must use # NN <ConceptName> syntax',
      category: 'body',
      severity: 'error',
      passed: conceptSectionCount > 0 && allValid,
      message: !allValid
        ? 'Some section headers have invalid NN markers'
        : conceptSectionCount === 0
          ? 'No concept sections found (body is empty or malformed)'
          : undefined,
    })
  }

  // 10. Element marker syntax (unified `## NN Concept: Element` headings)
  const headingMarkerRe = /^\s*##\s+NN\s+([^:\n]+?):\s+(.+)$/gm
  const headingMarkers = [...body.matchAll(headingMarkerRe)]
  const totalMarkers = headingMarkers.length

  const PROSE_SECTION_TITLES = new Set(['objectives', 'philosophy', 'guidance', 'overview', 'summary', 'introduction', 'documentation', 'rules', 'conventions', 'notes'])
  const suspectLines: string[] = []
  const lines = body.split('\n')
  let currentSectionType: 'index' | 'concept' | 'prose' = 'prose'
  for (const line of lines) {
    const trimmed = line.trim()
    if (/^#\s+/i.test(trimmed)) {
      const headerTitle = trimmed.replace(/^#+\s*(NN\s+)?/i, '').trim().toLowerCase()
      if (headerTitle === 'index') {
        currentSectionType = 'index'
      } else if (PROSE_SECTION_TITLES.has(headerTitle) || !trimmed.startsWith('# NN ')) {
        currentSectionType = 'prose'
      } else {
        currentSectionType = 'concept'
      }
      continue
    }
    if (currentSectionType === 'concept') {
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        suspectLines.push(trimmed.substring(0, 60))
      }
    }
  }

  if (hasBody) {
    checks.push({
      id: 'body-element-markers',
      label: 'Valid element markers',
      description: 'Elements must use `## NN ConceptName: Element` headings',
      category: 'body',
      severity: 'error',
      passed: suspectLines.length === 0 && totalMarkers > 0,
      message:
        suspectLines.length > 0
          ? `${suspectLines.length} bullet(s) look like elements but must use ## NN headings:\n${suspectLines.slice(0, 3).join('\n')}`
          : totalMarkers === 0
            ? 'No NN element markers found'
            : undefined,
    })
  }

  // ── Conventions ────────────────────────────────────────────────

  // 11. File naming
  const namingOk = fileName.endsWith('_NN.md')
  checks.push({
    id: 'conv-file-naming',
    label: 'File naming convention',
    description: 'iNNfo files must end with _NN.md',
    category: 'convention',
    severity: 'warning',
    passed: namingOk,
    message: namingOk ? undefined : `"${fileName}" does not end with _NN.md`,
  })

  // 12. Type field for distributed _NN.md files (§5.1.2) - applies to N2 templates / OKF packages, excluded for canonical N3 models
  if (fileName.endsWith('_NN.md') && fm.level !== 3) {
    const typeOk = typeof fm.type === 'string' && fm.type.length > 0
    checks.push({
      id: 'conv-type-field',
      label: 'Type field present for OKF conformance',
      description:
        'Distributed _NN.md files should include a type field in frontmatter for OKF conformance (§5.1.2)',
      category: 'convention',
      severity: 'warning',
      passed: typeOk,
      message: typeOk
        ? undefined
        : 'Missing type field in frontmatter (required for OKF conformance)',
    })
  }

  // 13. Wikilinks reference
  if (hasIndex) {
    const allWikilinks = [...content.matchAll(WIKILINK_RE)].map((m) => m[1].toLowerCase())
    const conceptNames = new Set<string>()
    for (const key of parsed.elements.keys()) {
      conceptNames.add(key.toLowerCase())
    }
    // Also collect concept section titles
    for (const m of sectionMatches) {
      const isMatrix = m[1] === 'matrices'
      const name = (isMatrix ? m[2] || '' : m[3] || '').trim().toLowerCase()
      if (name && name !== 'index') conceptNames.add(name)
    }
    const undefinedRefs = [...new Set(allWikilinks.filter((w) => !conceptNames.has(w)))]

    checks.push({
      id: 'conv-wikilinks',
      label: 'All [[wikilinks]] reference existing concepts',
      description: 'Every wikilink in the index should match a concept section or element',
      category: 'convention',
      severity: 'warning',
      passed: undefinedRefs.length === 0,
      message:
        undefinedRefs.length > 0
          ? `${undefinedRefs.length} undefined reference(s): ${undefinedRefs.slice(0, 5).join(', ')}${undefinedRefs.length > 5 ? '…' : ''}`
          : undefined,
    })
  }

  // 14. Index block MUST NOT contain Elements (only Concepts)
  // Check for index block in content (independent of hasIndex which requires edges)
  const indexSectionMatch = content.match(/# NN index\s*\n([\s\S]*?)(?=\n# |\n*$)/i)
  if (indexSectionMatch) {
    // Collect all element names from the model
    const elementNames = new Set<string>()
    for (const [, elements] of parsed.elements) {
      for (const el of elements) {
        elementNames.add(el.name.toLowerCase())
      }
    }

    const indexContent = indexSectionMatch[1]
    const indexWikilinks = [...indexContent.matchAll(WIKILINK_RE)].map((m) =>
      m[1].trim().toLowerCase(),
    )
    const elementsInIndex = indexWikilinks.filter((w) => elementNames.has(w))

    checks.push({
      id: 'index-no-elements',
      label: 'Index block contains only Concepts',
      description:
        'The # NN index block MUST list only Concepts, not Elements. Elements are declared within their Concept sections using ## NN headings.',
      category: 'body',
      severity: 'error',
      passed: elementsInIndex.length === 0,
      message:
        elementsInIndex.length > 0
          ? `${elementsInIndex.length} Element(s) found in index block: ${elementsInIndex.slice(0, 5).join(', ')}${elementsInIndex.length > 5 ? '…' : ''}. Elements should NOT appear in the index — they are discovered within their Concept sections.`
          : undefined,
    })
  }

  // ── Summary ────────────────────────────────────────────────────

  const errors = checks.filter((c) => !c.passed && c.severity === 'error').length
  const warnings = checks.filter((c) => !c.passed && c.severity === 'warning').length

  // Only show active checks (skip info and passed warnings from totals)
  const activeChecks = checks.filter((c) => c.severity !== 'info')

  return {
    checks,
    summary: {
      total: activeChecks.length,
      passed: activeChecks.filter((c) => c.passed).length,
      errors,
      warnings,
    },
  }
}
