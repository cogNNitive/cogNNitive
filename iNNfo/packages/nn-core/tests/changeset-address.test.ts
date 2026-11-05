import { describe, it, expect } from 'vitest'
import { extractInstanceProblems } from '../src/changeset/types.js'
import type { ChangeItem } from '../src/changeset/types.js'
import { parseKnowledge } from '../src/parser/index.js'
import { applyMutation } from '../src/mutate.js'

describe('extract_instance before a container-less distributed concept (issue 542)', () => {
  const base = {
    id: 'x1',
    op: 'extract_instance' as const,
    target: 'packages@core-pkg',
    blueprint_name: 'package',
    blueprint_url: 'https://example.test/package_V_0-1-0_NN.md',
    evidence: 'decision',
  } as ChangeItem

  it('accepts a one-segment destination id', () => {
    expect(extractInstanceProblems({ ...base, to: 'core-pkg' })).toEqual([])
  })

  it('still accepts a hierarchical destination id', () => {
    expect(extractInstanceProblems({ ...base, to: 'packages/core-pkg' })).toEqual([])
  })

  it('rejects a malformed id', () => {
    expect(extractInstanceProblems({ ...base, to: 'packages//core-pkg' }).join(' ')).toContain(
      'valid instance model id',
    )
    expect(extractInstanceProblems({ ...base, to: '..' }).join(' ')).toContain(
      'valid instance model id',
    )
  })
})

describe('update_field on an element name containing "&" (issue 491 C)', () => {
  const MODEL = [
    '---',
    'level: 3',
    'knowledge_version: "V_0-1-0"',
    'parent_spec:',
    '  name: "x"',
    '  url: "https://example.test/x_NN.md"',
    '---',
    '',
    '# NN Video',
    '',
    '## NN Video: Elon Musk & Joe Rogan',
    'sources:: a.md',
    '',
  ].join('\n')

  it('splits the address at the last "&" so the field is not swallowed', () => {
    const model = parseKnowledge(MODEL)
    const res = applyMutation(model, 'update_field', {
      target: 'series@Elon Musk & Joe Rogan&sources',
      to: 'b.md',
    })
    expect(res.success).toBe(true)
    const el = model.elements.get('Video')!.find((e) => e.name.includes('Elon Musk'))!
    expect(el.fields.sources).toBe('b.md')
  })
})
