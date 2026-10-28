import { describe, it, expect } from 'vitest'
import { serializeKnowledge, parseKnowledge } from '../src/parser/index.js'
import { scaffoldBodyFromSchema } from '../src/scaffold/knowledge.js'
import type { ParsedKnowledge } from '../src/types'

/**
 * [document-preamble: The Preamble Is Optional And Author-Owned]
 * The slot between the frontmatter and the first `# NN` heading belongs to the
 * author. No emitter fills it with boilerplate; an author-written preamble is
 * reproduced verbatim.
 */
const BADGE = '> This is an **iNNfo document**'

function emptyModel(extra: Partial<ParsedKnowledge> = {}): ParsedKnowledge {
  return {
    frontmatter: { level: 3, knowledge_version: 'V_0-1-0', title: 'Preamble Repro' },
    elements: new Map(),
    taxonomy: [],
    matrices: [],
    nodeMarkers: {},
    ...extra,
  } as unknown as ParsedKnowledge
}

describe('document preamble channel', () => {
  it('emits no preamble for a model that has none', () => {
    const out = serializeKnowledge(emptyModel())
    expect(out).not.toContain('> [!NOTE]')
    expect(out).not.toContain(BADGE)
  })

  it('preserves an author-written preamble verbatim', () => {
    const preamble = '> [!WARNING]\n> Edit this model through the agent, not by hand.'
    const out = serializeKnowledge(emptyModel({ rawPreamble: preamble }))
    expect(out).toContain(preamble)
    expect(out).not.toContain(BADGE)
  })

  it('keeps the preamble across a parse/serialize round trip', () => {
    const source = [
      '---',
      'level: 3',
      'knowledge_version: "V_0-1-0"',
      'title: "Round Trip"',
      '---',
      '',
      '> [!NOTE]',
      '> Hand-written provenance line, kept as-is.',
      '',
      '# NN Notes',
      '',
      '## NN Notes: First',
      'slug:: first',
      'body:: hello',
      '',
    ].join('\n')

    const out = serializeKnowledge(parseKnowledge(source))
    expect(out).toContain('> Hand-written provenance line, kept as-is.')
  })

  it('scaffoldBodyFromSchema starts at a heading, with no callout', () => {
    const out = scaffoldBodyFromSchema({ concepts: [], matrices: [], markers: [] } as never)
    expect(out).not.toContain('> [!NOTE]')
    expect(out).not.toContain(BADGE)
  })
})
