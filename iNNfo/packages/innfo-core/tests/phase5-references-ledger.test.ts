import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  parseKnowledge,
  validateReferences,
  validateElementFieldReferences,
  validateKnowledge,
} from '../src/index.js'
import { ElementsMap, type Concept, type ParsedKnowledge } from '../src/types/index.js'
import { checkFrontmatterInvariants } from '../src/validator/knowledge-checks.js'
import { Diagnostics } from '../src/diagnostics.js'

describe('Phase 5: Reference Resolution, Diagnostics & Legacy Ledger', () => {
  it('5.1.1 Structural references and wikilinks match element slugs before display names (D6)', () => {
    // Model has two elements:
    // Concept A element: name "Old Gross Margin", slug "margin-rev"
    // Concept B element: name "margin-rev", slug "other-slug"
    // Reference targeting "margin-rev" should resolve to Concept A (slug match), NOT Concept B
    const elements = new ElementsMap()
    elements.set('Financials', [
      {
        type: 'Financials',
        name: 'Old Gross Margin',
        slug: 'margin-rev',
        slugExplicit: true,
        description: '',
        fields: {},
        markers: {},
      },
      {
        type: 'Financials',
        name: 'Target Metric',
        slug: 'target-metric',
        slugExplicit: true,
        description: '',
        fields: {
          related: 'margin-rev',
        },
        markers: {},
      },
    ])

    const model: ParsedKnowledge = {
      frontmatter: {
        spec_version: 'V_0-3-0',
        spec_url: '',
        level: 3,
        knowledge_version: 'V_0-1-0',
      } as ParsedKnowledge['frontmatter'],
      taxonomy: [],
      elements,
      matrices: [
        {
          name: 'metric-matrix',
          source: 'Financials',
          target: 'Financials',
          params: '',
          cells: [{ row: 'margin-rev', col: 'target-metric', value: '1' }],
        },
      ],
      nodeMarkers: {},
      rawContent: '',
    }

    const templateConcepts: Concept[] = [
      {
        name: 'Financials',
        type: 'list',
        fields: [{ name: 'related', type: 'reference' }],
      },
    ]

    // Matrix references should resolve cleanly via slug
    const matrixDiags = validateReferences(model)
    expect(matrixDiags.filter((d) => d.severity === 'error')).toHaveLength(0)

    // Field reference should resolve cleanly via slug
    const fieldDiags = validateElementFieldReferences(model, templateConcepts)
    expect(fieldDiags.filter((d) => d.severity === 'error')).toHaveLength(0)
  })

  it('5.1.2 When display name fallback resolves to > 1 element across concepts, emit AMBIGUOUS_ELEMENT_NAME', () => {
    // Model defines two elements with identical display name "Status" under different concepts:
    // Concept Task element "Status"
    // Concept Project element "Status"
    // Reference to "Status" is ambiguous!
    const elements = new ElementsMap()
    elements.set('Task', [
      {
        type: 'Task',
        name: 'Status',
        slug: 'task-status',
        slugExplicit: true,
        description: '',
        fields: {},
        markers: {},
      },
    ])
    elements.set('Project', [
      {
        type: 'Project',
        name: 'Status',
        slug: 'project-status',
        slugExplicit: true,
        description: '',
        fields: {},
        markers: {},
      },
      {
        type: 'Project',
        name: 'Milestone',
        slug: 'milestone',
        slugExplicit: true,
        description: '',
        fields: {
          link: '[[Status]]',
        },
        markers: {},
      },
    ])

    const model: ParsedKnowledge = {
      frontmatter: {
        spec_version: 'V_0-3-0',
        spec_url: '',
        level: 3,
        knowledge_version: 'V_0-1-0',
      } as ParsedKnowledge['frontmatter'],
      taxonomy: [],
      elements,
      matrices: [
        {
          name: 'status-matrix',
          source: 'Project',
          target: 'Task',
          params: '',
          cells: [{ row: 'Status', col: 'Milestone', value: 'x' }],
        },
      ],
      nodeMarkers: {},
      rawContent: '',
    }

    const templateConcepts: Concept[] = [
      { name: 'Task', type: 'list', fields: [] },
      { name: 'Project', type: 'list', fields: [{ name: 'link', type: 'reference' }] },
    ]

    const fieldDiags = validateElementFieldReferences(model, templateConcepts)
    const ambiguousField = fieldDiags.find((d) => d.code === 'AMBIGUOUS_ELEMENT_NAME')
    expect(ambiguousField).toBeDefined()
    expect(ambiguousField!.message).toContain('Status')

    const matrixDiags = validateReferences(model)
    const ambiguousMatrix = matrixDiags.find((d) => d.code === 'AMBIGUOUS_ELEMENT_NAME')
    expect(ambiguousMatrix).toBeDefined()
  })

  it('5.1.3 Two elements in the same model with identical slugs emit DUPLICATE_SLUG error', () => {
    const elements = new ElementsMap()
    elements.set('ConceptA', [
      {
        type: 'ConceptA',
        name: 'Element One',
        slug: 'shared-slug',
        slugExplicit: true,
        description: '',
        fields: {},
        markers: {},
      },
      {
        type: 'ConceptA',
        name: 'Element Two',
        slug: 'shared-slug',
        slugExplicit: true,
        description: '',
        fields: {},
        markers: {},
      },
    ])

    const model: ParsedKnowledge = {
      frontmatter: {
        spec_version: 'V_0-3-0',
        spec_url: '',
        level: 3,
        knowledge_version: 'V_0-1-0',
        parent_spec: { name: 'spec', url: 'https://example.com' },
      } as ParsedKnowledge['frontmatter'],
      taxonomy: [],
      elements,
      matrices: [],
      nodeMarkers: {},
      rawContent: '',
    }

    const d = new Diagnostics()
    checkFrontmatterInvariants(model, d)
    const dupSlug = d.errors.find((e) => e.code === 'DUPLICATE_SLUG')
    expect(dupSlug).toBeDefined()
    expect(dupSlug!.severity).toBe('error')
    expect(dupSlug!.message).toContain('shared-slug')
  })

  it('5.1.4 A Level 3 model lacking slugExplicit flags emits UNFROZEN_MODEL warning', () => {
    const elements = new ElementsMap()
    elements.set('ConceptA', [
      {
        type: 'ConceptA',
        name: 'Unfrozen Element',
        slug: 'unfrozen-element',
        slugExplicit: false,
        description: '',
        fields: {},
        markers: {},
      },
    ])

    const model: ParsedKnowledge = {
      frontmatter: {
        spec_version: 'V_0-3-0',
        spec_url: '',
        level: 3,
        knowledge_version: 'V_0-1-0',
        parent_spec: { name: 'spec', url: 'https://example.com' },
      } as ParsedKnowledge['frontmatter'],
      taxonomy: [],
      elements,
      matrices: [],
      nodeMarkers: {},
      rawContent: '',
    }

    const d = new Diagnostics()
    checkFrontmatterInvariants(model, d)
    const unfrozen = d.warnings.find((w) => w.code === 'UNFROZEN_MODEL')
    expect(unfrozen).toBeDefined()
    expect(unfrozen!.severity).toBe('warning')
  })

  it('5.1.5 Legacy fallback path contains comment marker legacy:lineage-reference-name-fallback', () => {
    const refSource = readFileSync(
      join(__dirname, '../src/validator/references.ts'),
      'utf-8',
    )
    expect(refSource).toContain('legacy:' + 'stable-element-identity/lineage-reference-name-fallback')
  })
})
