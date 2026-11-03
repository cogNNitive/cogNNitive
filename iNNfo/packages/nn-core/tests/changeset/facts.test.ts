import { describe, it, expect } from 'vitest'
import {
  EXECUTION_FACT_KEYS,
  PROPOSAL_KEYS,
  computeProposalSha,
  verifyProposalSha,
} from '../../src/changeset/hasher.js'
import { parseChangeset } from '../../src/changeset/parser.js'
import { serializeChangeset } from '../../src/changeset/serializer.js'
import type { ChangeItem } from '../../src/changeset/types.js'
import { canonicalUnitModelId, resolvedTarget } from '../../src/changeset/resolved-target.js'
import { unitAddress } from '../../src/console/unit-address.js'
import { formatAddress, parseAddress } from '../../src/address/index.js'
import type { ModelId } from '../../src/address/index.js'

function doc(changeBlock: string, proposalShas?: string): string {
  return `---
spec_version: "V_0-5-0"
level: 3
parent_spec:
  name: changes
  url: "https://example.test/changes/spec_NN.md"
blueprint_version: "V_0-6-0"
status: proposed
proposal_sha: "${proposalShas ?? 'sealed'}"
---

# NN Change

${changeBlock}
`
}

const change = (over: Partial<ChangeItem> = {}): ChangeItem => ({
  id: 'c-01',
  op: 'update_field',
  target: 'm@goal-1&owner',
  to: 'Ana',
  evidence: 'sources/a.md',
  ...over,
})

describe('EXECUTION_FACT_KEYS', () => {
  it('is the single exported list of apply-written facts', () => {
    expect(EXECUTION_FACT_KEYS).toEqual(['resolved_slug', 'resolved_target', 'evidence_sha256'])
  })

  it('are excluded from the seal', () => {
    for (const key of EXECUTION_FACT_KEYS) {
      expect(PROPOSAL_KEYS as readonly string[]).not.toContain(key)
    }
  })
})

describe('PROPOSAL_KEYS', () => {
  it('seals seed and no longer seals fields', () => {
    expect(PROPOSAL_KEYS as readonly string[]).toContain('seed')
    expect(PROPOSAL_KEYS as readonly string[]).not.toContain('fields')
  })

  it('seals the serialized evidence string, list form included', () => {
    const a = computeProposalSha([change({ evidence: '[A, B]' })])
    const b = computeProposalSha([change({ evidence: '[B, A]' })])
    const c = computeProposalSha([change({ evidence: '[A, B]' })])
    expect(a).not.toBe(b)
    expect(a).toBe(c)
  })

  it('keeps the seal stable after the execution facts are stamped', () => {
    const sealed = computeProposalSha([change()])
    const stamped = change({
      status: 'applied',
      applied_at: '2026-10-10T12:00:00.000Z',
      resolved_slug: 'goal-1',
      resolved_target: 'm@goal-1&owner',
      evidence_sha256: 'deadbeef',
    })
    expect(computeProposalSha([stamped])).toBe(sealed)
    expect(verifyProposalSha({ frontmatter: { proposal_sha: sealed } as never, changes: [stamped] })).toBe(true)
  })
})

describe('annotation round trip', () => {
  it('reads and rewrites resolved_target and evidence_sha256 as annotations', () => {
    const raw = doc(
      [
        '## NN Change: c-01',
        'op:: update_field',
        'target:: m@goal-1&owner',
        'to:: Ana',
        'evidence:: [sources/a.md, sources/b.md]',
        'resolved_target:: m@goal-1&owner',
        'evidence_sha256:: [aaa, bbb]',
      ].join('\n'),
    )
    const parsed = parseChangeset(raw)
    expect(parsed.changes[0].resolved_target).toBe('m@goal-1&owner')
    expect(parsed.changes[0].evidence_sha256).toEqual(['aaa', 'bbb'])

    const out = serializeChangeset({
      ...parsed,
      changes: [{ ...parsed.changes[0], status: 'applied' }],
    })
    expect(out).toContain('resolved_target:: m@goal-1&owner')
    expect(out).toContain('evidence_sha256:: [aaa, bbb]')
    expect(out).toContain('evidence:: [sources/a.md, sources/b.md]')
    expect(out).not.toContain('fields::')
  })

  it('parses seed and writes it back sealed', () => {
    const raw = doc(
      [
        '## NN Change: c-01',
        'op:: add_matrix',
        'target:: m',
        'name:: SWOT',
        'seed:: {"columns":["Strengths","Weaknesses"],"rows":["Risk One"]}',
      ].join('\n'),
    )
    const parsed = parseChangeset(raw)
    expect(parsed.changes[0].seed).toEqual({
      columns: ['Strengths', 'Weaknesses'],
      rows: ['Risk One'],
    })
    const out = serializeChangeset({ ...parsed, changes: [parsed.changes[0]] })
    expect(out).toContain('seed:: {"columns":["Strengths","Weaknesses"],"rows":["Risk One"]}')
  })

  it('still parses a change that carries no seed', () => {
    const parsed = parseChangeset(doc(['## NN Change: c-01', 'op:: update_field', 'target:: m@e&f', 'to:: v'].join('\n')))
    expect(parsed.changes[0].seed).toBeUndefined()
  })
})

describe('resolved targets are canonical unified addresses', () => {
  it('accepts a hierarchical model id', () => {
    expect(resolvedTarget.field('a/b', 's', 'f')).toBe('a/b@s&f')
    expect(canonicalUnitModelId('a/b')).toBe('a/b')
  })

  it('equals formatAddress and the console unitAddress builders', () => {
    const model = 'villabotijos-today/pepper-mapache'
    expect(resolvedTarget.field(model, '00-gancho', 'voice')).toBe(
      formatAddress({ kind: 'unit', model: model as ModelId, unit: { kind: 'element', slug: '00-gancho', field: 'voice' } }),
    )
    expect(resolvedTarget.field(model, '00-gancho', 'voice')).toBe(
      unitAddress.value(`${model}@00-gancho`, 'voice'),
    )
    expect(resolvedTarget.body(model, '00-gancho')).toBe(
      formatAddress({ kind: 'unit', model: model as ModelId, unit: { kind: 'body', slug: '00-gancho' } }),
    )
    expect(resolvedTarget.element(model, '00-gancho')).toBe(unitAddress.element(model, '00-gancho'))
    expect(resolvedTarget.concept('strategy', 'Goal', 'owner')).toBe(
      formatAddress({ kind: 'unit', model: 'strategy' as ModelId, unit: { kind: 'concept', concept: 'Goal', field: 'owner' } }),
    )
  })

  it('builds a matrix cell target equal to unitAddress.cell', () => {
    expect(resolvedTarget.cell('strategy', 'swot', 'r1', 'c1')).toBe(unitAddress.cell('strategy', 'swot', 'r1', 'c1'))
  })

  it('rejects a file path or a backslash as the model part', () => {
    expect(() => resolvedTarget.field('kNNowledge/x_NN.md', 's', 'f')).toThrow(TypeError)
    expect(() => resolvedTarget.element('a\\b', 's')).toThrow(TypeError)
  })

  it('rejects a slug that is not canonical', () => {
    expect(() => resolvedTarget.element('m', 'Not A Slug')).toThrow(TypeError)
  })
})

describe('unitAddress builders take hierarchical ids', () => {
  it('accepts every segment of a hierarchical id and rejects an invalid one', () => {
    expect(unitAddress.element('villabotijos-today/intro', '00-gancho')).toBe('villabotijos-today/intro@00-gancho')
    expect(unitAddress.document('a/b/c')).toBe('a/b/c')
    expect(() => unitAddress.element('a b', 's')).toThrow(TypeError)
    expect(() => unitAddress.document('x.md')).toThrow(TypeError)
    expect(() => unitAddress.cell('a//b', 'm', 'r', 'c')).toThrow(TypeError)
  })

  it('emits a concept address the grammar parses back, including the boundary slug', () => {
    const address = unitAddress.section('strategy', 'Vision--Mission')
    expect(address).toBe('strategy@concept:vision--mission')
    expect(parseAddress(address)).toMatchObject({ kind: 'unit', unit: { kind: 'concept', concept: 'vision--mission' } })
  })
})
