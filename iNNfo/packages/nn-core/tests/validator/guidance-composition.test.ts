import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { parseKnowledge, resolveBlueprintSchema, validateKnowledge } from '../../src/index.js'

const guidance = (concept: string, h3s: string[]): string =>
  [`## ${concept}`, ...h3s.flatMap((h) => [`### ${h}`, `Text for ${h}.`])].join('\n')
const ALL = ['Summary', 'Description', 'Methodologies', 'Prompts']

const CHILD = [
  '---',
  'level: 2',
  'title: "Child"',
  'blueprint_version: "V_0-1-0"',
  'parent_spec:',
  '  name: "iNNfo_V_0-5-0"',
  '  url: "https://example.com/iNNfo_V_0-5-0_NN.md"',
  '---',
  '',
  '# NN Concept Definition',
  '## NN Concept Definition: Alpha',
  'type:: list',
  '## NN Concept Definition: Beta',
  'type:: list',
  '',
  guidance('Alpha', ALL),
  '',
  guidance('Beta', ['Summary']),
  '',
].join('\n')

const PARENT = [
  '---',
  'level: 2',
  'title: "Parent"',
  'blueprint_version: "V_0-1-0"',
  'parent_spec:',
  '  name: "iNNfo_V_0-5-0"',
  '  url: "https://example.com/iNNfo_V_0-5-0_NN.md"',
  'includes:',
  '  - name: "child"',
  '    url: "https://example.com/child/spec_NN.md"',
  '---',
  '',
  '# NN Concept Definition',
  '## NN Concept Definition: Gamma',
  'type:: list',
  '',
  guidance('Gamma', ALL),
  '',
].join('\n')

const MODEL = [
  '---',
  'level: 3',
  'title: "M"',
  'knowledge_version: "V_0-1-0"',
  'parent_spec:',
  '  name: "parent"',
  '  url: "https://example.com/parent/spec_NN.md"',
  '---',
  '',
].join('\n')

const BETA_INCOMPLETE = { concepts: [{ name: 'Beta', missing: ['Description', 'Methodologies', 'Prompts'] }] }

const resolveChild = (ref: { name: string }): string | null => (ref.name === 'child' ? CHILD : null)

function guidanceWarning(parentRaw: string, resolve: typeof resolveChild | undefined) {
  const result = validateKnowledge(parseKnowledge(MODEL), parseKnowledge(parentRaw) as never, null, resolve)
  return result.warnings.find((w) => w.code === 'PARENT_CONCEPT_GUIDANCE_INCOMPLETE')
}

describe('guidance check is composition-aware', () => {
  it('judges an included concept against the blueprint that defines it', () => {
    // Alpha (complete in child) and Gamma (complete in parent) pass; only Beta is incomplete.
    expect(guidanceWarning(PARENT, resolveChild)?.meta).toEqual(BETA_INCOMPLETE)
  })

  it('does not accept guidance for an included concept that only the host happens to carry', () => {
    // The parent documents Beta fully, but Beta is DEFINED by the child, whose guidance is incomplete.
    expect(guidanceWarning(PARENT + '\n' + guidance('Beta', ALL), resolveChild)?.meta).toEqual(BETA_INCOMPLETE)
  })

  it('still requires the exact H2 title and all four H3s (completeness is unchanged)', () => {
    const lowercase = CHILD.replace('## Alpha', '## alpha')
    const w = guidanceWarning(PARENT, (ref) => (ref.name === 'child' ? lowercase : null))
    expect((w?.meta as { concepts: Array<{ name: string }> }).concepts.map((c) => c.name)).toEqual(['Alpha', 'Beta'])
  })

  it('without an include resolver only the top-level blueprint is evaluated', () => {
    // Included concepts are not composed at all, so only the host concept is checked and it is complete.
    expect(guidanceWarning(PARENT, undefined)).toBeUndefined()
  })

  it('follows a concept alias back to the guidance of the original name', () => {
    const aliased = PARENT.replace(
      '    url: "https://example.com/child/spec_NN.md"',
      '    url: "https://example.com/child/spec_NN.md"\n    alias:\n      concepts:\n        Alpha: Omega',
    )
    expect(guidanceWarning(aliased, resolveChild)?.meta).toEqual(BETA_INCOMPLETE)
  })
})

describe('guidance check on the shipped business bluepriNNt', () => {
  const dir = join(import.meta.dirname!, '..', '..', '..', '..', 'specs', 'bluepriNNts')
  const read = (name: string): string => readFileSync(join(dir, name, 'spec_NN.md'), 'utf-8')
  const resolveInclude = (ref: { name: string }): string | null =>
    existsSync(join(dir, ref.name, 'spec_NN.md')) ? read(ref.name) : null

  it('reports exactly the 13 concepts whose own blueprint lacks complete guidance', () => {
    const result = validateKnowledge(parseKnowledge(MODEL), parseKnowledge(read('business')) as never, null, resolveInclude)
    const w = result.warnings.find((x) => x.code === 'PARENT_CONCEPT_GUIDANCE_INCOMPLETE')
    const names = (w?.meta as { concepts: Array<{ name: string }> }).concepts.map((c) => c.name).sort()
    expect(names).toEqual(
      [
        'Contributions', 'Compensations', 'Procedure', // business-model
        'Validation', 'Suggestions', 'Keys', // analysis
        'Project', 'Milestone', 'Phases', 'Deliverable', 'Task', 'Risk', 'Project roles', // projects
      ].sort(),
    )
    expect(names).toHaveLength(13)
    // sanity: the composed schema is far larger than the incomplete subset
    expect(resolveBlueprintSchema(read('business'), resolveInclude).schema.concepts.length).toBeGreaterThan(40)
  })
})
