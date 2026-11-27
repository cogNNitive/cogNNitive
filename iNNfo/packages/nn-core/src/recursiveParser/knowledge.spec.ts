import { describe, expect, it } from 'vitest'
import { normalizeSingleKnowledge } from './knowledge.js'

const doc = (frontmatter: string) => `---\n${frontmatter}\n---\n\n# NN index\n\n* [[Music Group]]\n`

const blueprintVersionIssue = (issues: { message: string }[]) =>
  issues.find((issue) => issue.message.includes('blueprint_version'))

// C2 of the blueprints-distribution plan: `blueprint_version` is required at load,
// not validated when present. 114 of 140 documents in a real domain declare none
// and the engine loads them anyway, which is why the field enforced nothing.
describe('normalizeSingleKnowledge — blueprint_version is required at load', () => {
  it('refuses a level-3 document that declares none, naming the file and the field', () => {
    const path = 'series/s1/episode_NN.md'
    const { nodes, issues } = normalizeSingleKnowledge(
      doc(
        [
          'level: 3',
          'parent_spec:',
          '  name: "coNNtent_V_0-32-4"',
          '  url: "https://example.test/spec_NN.md"',
          'knowledge_version: "V_0-2-0"',
          'title: "Episode One"',
        ].join('\n'),
      ),
      path,
      'episode',
    )

    expect(Object.keys(nodes)).toHaveLength(0)
    const issue = blueprintVersionIssue(issues)
    expect(issue).toBeDefined()
    expect(issue?.path).toBe(path)
    expect(issue?.message).toContain('blueprint_version')
  })

  it('refuses a level-2 blueprint spec that declares none', () => {
    const path = 'iNNfo/specs/bluepriNNts/music-bands/spec_NN.md'
    const { nodes, issues } = normalizeSingleKnowledge(
      doc(['spec_version: "V_0-9-0"', 'level: 2', 'title: "Music Bands App"'].join('\n')),
      path,
      'music-bands',
    )

    expect(Object.keys(nodes)).toHaveLength(0)
    expect(blueprintVersionIssue(issues)?.path).toBe(path)
  })

  it('exempts level-1 documents, which declare spec_version and instantiate no blueprint', () => {
    const path = 'iNNfo/specs/iNNfo_V_0-9-0_NN.md'
    const { nodes, issues } = normalizeSingleKnowledge(
      doc(
        [
          'spec_version: "V_0-9-0"',
          'level: 1',
          'title: "iNNfo Meta-bluepriNNt Specification"',
        ].join('\n'),
      ),
      path,
      'iNNfo',
    )

    expect(Object.keys(nodes).length).toBeGreaterThan(0)
    expect(blueprintVersionIssue(issues)).toBeUndefined()
  })

  it('loads a level-3 document that declares one', () => {
    const path = 'kNNowledge/episodes_NN.md'
    const { nodes, issues } = normalizeSingleKnowledge(
      doc(
        [
          'level: 3',
          'parent_spec:',
          '  name: "coNNtent_V_0-32-4"',
          '  url: "https://example.test/spec_NN.md"',
          'blueprint_version: "V_0-32-4"',
          'knowledge_version: "V_0-2-0"',
          'title: "Episodes"',
        ].join('\n'),
      ),
      path,
      'episodes',
    )

    expect(Object.keys(nodes).length).toBeGreaterThan(0)
    expect(blueprintVersionIssue(issues)).toBeUndefined()
  })

  it('still skips a non-NN file with no frontmatter without raising the new refusal', () => {
    const { nodes, issues } = normalizeSingleKnowledge(
      '# Notes\n\nNothing here.\n',
      'sources/notes.md',
      'notes',
    )

    expect(Object.keys(nodes)).toHaveLength(0)
    expect(issues).toHaveLength(0)
  })

  // D7 / P5 of the blueprints-distribution plan: unknown constructs are refused loudly at load
  it('refuses a document with an unknown construct, naming the construct', () => {
    const path = 'kNNowledge/test_NN.md'
    const content = [
      '---',
      'level: 3',
      'parent_spec:',
      '  name: "coNNtent_V_0-32-4"',
      '  url: "https://example.test/spec_NN.md"',
      'blueprint_version: "V_0-32-4"',
      'title: "Invalid Doc"',
      '---',
      '',
      '# NN index',
      '* [[Element]]',
      '',
      '# NN unknown_directive: some_value',
      'field:: 123',
    ].join('\n')

    const { nodes, issues } = normalizeSingleKnowledge(content, path, 'test')
    expect(Object.keys(nodes)).toHaveLength(0)
    const issue = issues.find((i) => i.message.includes('unknown construct'))
    expect(issue).toBeDefined()
    expect(issue?.path).toBe(path)
    expect(issue?.message).toContain('NN unknown_directive: some_value')
    expect(issue?.message).toContain('refused')
  })

  it('refuses a document with a malformed NN element heading, naming the construct', () => {
    const path = 'kNNowledge/test_el_NN.md'
    const content = [
      '---',
      'level: 3',
      'parent_spec:',
      '  name: "coNNtent_V_0-32-4"',
      '  url: "https://example.test/spec_NN.md"',
      'blueprint_version: "V_0-32-4"',
      'title: "Invalid Element Doc"',
      '---',
      '',
      '# NN Stakeholders',
      '## NN MalformedElementWithoutColon',
      'description here',
    ].join('\n')

    const { nodes, issues } = normalizeSingleKnowledge(content, path, 'test_el')
    expect(Object.keys(nodes)).toHaveLength(0)
    const issue = issues.find((i) => i.message.includes('unknown construct'))
    expect(issue).toBeDefined()
    expect(issue?.message).toContain('NN MalformedElementWithoutColon')
    expect(issue?.message).toContain('refused')
  })

  it('refuses a document with removed marker constructs, naming the construct', () => {
    const path = 'kNNowledge/marker_doc_NN.md'
    const content = [
      '---',
      'level: 3',
      'parent_spec:',
      '  name: "coNNtent_V_0-32-4"',
      '  url: "https://example.test/spec_NN.md"',
      'blueprint_version: "V_0-32-4"',
      'title: "Legacy Marker Doc"',
      '---',
      '',
      '# NN Marker Definition',
      '## NN Marker Definition: priority',
      'type:: scale',
    ].join('\n')

    const { nodes, issues } = normalizeSingleKnowledge(content, path, 'marker_doc')
    expect(Object.keys(nodes)).toHaveLength(0)
    const issue = issues.find((i) => i.message.includes('removed in iNNfo V_0-5-0'))
    expect(issue).toBeDefined()
    expect(issue?.message).toContain('Marker Definitions (priority)')
    expect(issue?.message).toContain('refused')
  })
})
