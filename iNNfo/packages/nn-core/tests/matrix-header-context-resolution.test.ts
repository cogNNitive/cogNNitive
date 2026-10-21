import { describe, it, expect } from 'vitest'
import {
  parseKnowledge,
  validateReferences,
  validateElementFieldReferences,
} from '../src/index.js'
import type { Concept } from '../src/types/index.js'

/**
 * Matrix cell row/column headers are references by display name. When two
 * elements in different concepts share that name, the resolver must use the
 * containing matrix's declared `source` (rows) / `target` (columns) concept to
 * disambiguate. A header whose axis does not disambiguate stays an advisory
 * `AMBIGUOUS_ELEMENT_NAME` warning. Field/wikilink ambiguity stays an error.
 *
 * Names carry a space so the display name differs from the derived slug and the
 * reference exercises the name-resolution path (not the slug path).
 */
const dup = 'Public Relations'

function frontmatter(source: string, target: string): string[] {
  return [
    '---',
    'spec_version: "V_0-3-0"',
    'level: 3',
    'knowledge_version: "V_0-0-1"',
    'title: "Matrix Context Test"',
    'parent_spec:',
    '  name: "test_V_0-1-1"',
    '  url: "https://example.com/test"',
    'matrices:',
    '  - name: "activities-resources matrix"',
    `    source: "${source}"`,
    `    target: "${target}"`,
    '---',
    '',
  ]
}

const RULE = '| --- | --- |'

describe('matrix header context resolution', () => {
  it('resolves a row header via the matrix source concept and a column header via the target concept', () => {
    const parsed = parseKnowledge(
      [
        ...frontmatter('Activities', 'Resources'),
        '# NN index',
        `* [[${dup}]]`,
        '',
        '# NN Activities',
        `## NN Activities: ${dup}`,
        '',
        '# NN Resources',
        `## NN Resources: ${dup}`,
        '',
        '# NN matrices: activities-resources matrix',
        `| Activities \\ Resources | ${dup} |`,
        RULE,
        `| ${dup} | ✅ |`,
        '',
      ].join('\n'),
    )

    const diags = validateReferences(parsed)
    expect(diags.filter((d) => d.code === 'AMBIGUOUS_ELEMENT_NAME')).toHaveLength(0)
    expect(diags.filter((d) => d.severity === 'error')).toHaveLength(0)
  })

  it('matches the axis label against the concept name case-insensitively', () => {
    const parsed = parseKnowledge(
      [
        ...frontmatter('activities', 'resources'),
        '# NN index',
        `* [[${dup}]]`,
        '',
        '# NN Activities',
        `## NN Activities: ${dup}`,
        '',
        '# NN Resources',
        `## NN Resources: ${dup}`,
        '',
        '# NN matrices: activities-resources matrix',
        `| activities \\ resources | Local Team |`,
        RULE,
        `| ${dup} | ✅ |`,
        '',
      ].join('\n'),
    )

    const diags = validateReferences(parsed)
    expect(diags.filter((d) => d.code === 'AMBIGUOUS_ELEMENT_NAME')).toHaveLength(0)
  })

  it('keeps an advisory warning when the axis concept does not disambiguate, naming the axis tried', () => {
    const parsed = parseKnowledge(
      [
        ...frontmatter('Segments', 'Resources'),
        '# NN index',
        `* [[${dup}]]`,
        '',
        '# NN Activities',
        `## NN Activities: ${dup}`,
        '',
        '# NN Communication',
        `## NN Communication: ${dup}`,
        '',
        '# NN Resources',
        '## NN Resources: Local Team',
        '',
        '# NN matrices: activities-resources matrix',
        '| Segments \\ Resources | Local Team |',
        RULE,
        `| ${dup} | ✅ |`,
        '',
      ].join('\n'),
    )

    const ambiguous = validateReferences(parsed).filter((d) => d.code === 'AMBIGUOUS_ELEMENT_NAME')
    expect(ambiguous).toHaveLength(1)
    expect(ambiguous[0].severity).toBe('warning')
    expect(ambiguous[0].message).toContain(dup)
    expect(ambiguous[0].message).toContain('Segments')
  })

  it('does not consume matrix context for field-level references or wikilinks: ambiguity stays an error', () => {
    const parsed = parseKnowledge(
      [
        ...frontmatter('Activities', 'Task'),
        '# NN index',
        `* [[${dup}]]`,
        '',
        '# NN Activities',
        `## NN Activities: ${dup}`,
        '',
        '# NN Task',
        `## NN Task: ${dup}`,
        `link:: [[${dup}]]`,
        '',
        '# NN matrices: activities-resources matrix',
        `| Activities \\ Task | Local Team |`,
        RULE,
        `| ${dup} | ✅ |`,
        '',
      ].join('\n'),
    )

    const templateConcepts: Concept[] = [
      { name: 'Activities', type: 'list', fields: [] },
      { name: 'Task', type: 'list', fields: [{ name: 'link', type: 'reference' }] },
    ]

    // The matrix header itself resolves via its axis context...
    expect(
      validateReferences(parsed).filter((d) => d.code === 'AMBIGUOUS_ELEMENT_NAME'),
    ).toHaveLength(0)

    // ...but the field reference stays ambiguous (error); matrix context is not used.
    const ambiguousField = validateElementFieldReferences(parsed, templateConcepts).find(
      (d) => d.code === 'AMBIGUOUS_ELEMENT_NAME',
    )
    expect(ambiguousField).toBeDefined()
    expect(ambiguousField!.severity).toBe('error')
  })
})
