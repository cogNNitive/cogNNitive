import { describe, it, expect } from 'vitest'
import {
  readWritePolicy,
  resolveWritePolicy,
  validateWritePolicy,
  writeOperationOf,
  writePolicyViolation,
} from '../../src/schema/writePolicy.js'
import { extractBlueprintSchemaFromContent } from '../../src/schema/extract.js'
import { resolveBlueprintSchema } from '../../src/schema/compose.js'
import type { ScopeNode } from '../../src/scope/types.js'

const L2 = (...defs: Array<[string, string]>) =>
  [
    '---',
    'level: 2',
    'title: "T"',
    '---',
    '',
    '# NN Concept Definition',
    ...defs.map(([name, body]) => `\n## NN Concept Definition: ${name}\nslug:: ${name.toLowerCase()}\ntype:: list\n${body}`),
  ].join('\n')

const scope = (id: string, value?: string, isolate = false): ScopeNode => ({
  id,
  kind: id === '' ? 'root' : 'scope',
  doc: `${id || 'domaiNN'}_NN.md`,
  isolate,
  values: value === undefined ? {} : { write_policy: value },
})

describe('write_policy declaration', () => {
  it('is read from a Concept Definition and kept on the concept', () => {
    const [proc, exec] = extractBlueprintSchemaFromContent(
      L2(['Procedure', ''], ['Procedure Execution', 'write_policy:: append-only']),
    ).concepts
    expect(proc.writePolicy).toBeUndefined()
    expect(exec.writePolicy).toEqual({ policy: 'append-only' })
  })

  it('keeps an unknown value and reports it when the schema composes', () => {
    expect(readWritePolicy({ write_policy: 'sometimes' })).toEqual({ unknown: 'sometimes' })
    const composed = resolveBlueprintSchema(L2(['Log', 'write_policy:: sometimes']))
    expect(composed.errors.map((e) => (e as { code?: string }).code)).toContain('WRITE_POLICY_UNKNOWN')
  })

  it('reports nothing for known values', () => {
    const concepts = extractBlueprintSchemaFromContent(
      L2(['A', 'write_policy:: mutable'], ['B', 'write_policy:: append-only'], ['C', 'write_policy:: read-only']),
    ).concepts
    expect(validateWritePolicy(concepts)).toEqual([])
  })
})

describe('write_policy cascade', () => {
  it('defaults to mutable when nothing declares it', () => {
    const r = resolveWritePolicy({})
    expect(r).toMatchObject({ policy: 'mutable', declaredBy: 'default' })
    expect(r.allowed).toEqual(['add', 'update', 'remove'])
  })

  it('takes the bluepriNNt default when the concept declares nothing', () => {
    expect(resolveWritePolicy({ blueprint: 'append-only' })).toMatchObject({
      policy: 'append-only',
      declaredBy: 'blueprint',
    })
  })

  it('lets the concept override the bluepriNNt default, in either direction', () => {
    expect(resolveWritePolicy({ blueprint: 'append-only', concept: { policy: 'mutable' } }).policy).toBe('mutable')
    expect(resolveWritePolicy({ blueprint: 'mutable', concept: { policy: 'read-only' } }).policy).toBe('read-only')
  })

  it('lets the domaiNN and its scopes tighten the policy', () => {
    const r = resolveWritePolicy({
      concept: { policy: 'mutable' },
      scopes: [scope('', 'append-only'), scope('archive-2025', 'read-only')],
    })
    expect(r.policy).toBe('read-only')
    expect(r.explain?.strategy).toBe('restrict')
  })

  it('never lets the domaiNN loosen the policy', () => {
    const r = resolveWritePolicy({ concept: { policy: 'append-only' }, scopes: [scope('', 'mutable')] })
    expect(r.policy).toBe('append-only')
  })

  it('does not let an isolated scope escape a tighter ancestor', () => {
    const r = resolveWritePolicy({
      concept: { policy: 'mutable' },
      scopes: [scope('', 'read-only'), scope('sandbox', 'mutable', true)],
    })
    expect(r.policy).toBe('read-only')
  })

  it('fails closed on an unknown value at any level', () => {
    expect(resolveWritePolicy({ concept: { unknown: 'sometimes' } }).policy).toBe('read-only')
    expect(resolveWritePolicy({ blueprint: 'whatever' }).policy).toBe('read-only')
    const r = resolveWritePolicy({ scopes: [scope('', 'loose')] })
    expect(r.policy).toBe('read-only')
    expect(r.unknownScopes).toEqual([{ scope: '', value: 'loose' }])
  })

  it('ignores scopes that do not declare it', () => {
    expect(resolveWritePolicy({ concept: { policy: 'append-only' }, scopes: [scope(''), scope('x')] }).policy).toBe(
      'append-only',
    )
  })
})

describe('write_policy and changeset operations', () => {
  it('classifies instance writes and leaves the rest outside the policy', () => {
    expect(writeOperationOf('add_element')).toBe('add')
    expect(writeOperationOf('update_field')).toBe('update')
    expect(writeOperationOf('set_fields')).toBe('update')
    expect(writeOperationOf('remove_element')).toBe('remove')
    expect(writeOperationOf('extract_instance')).toBe('remove')
    expect(writeOperationOf('comment')).toBeNull()
    expect(writeOperationOf('review_gate')).toBeNull()
  })

  it('allows only additions on an append-only concept', () => {
    expect(writePolicyViolation('append-only', 'add_element', 'Procedure Execution')).toBeNull()
    const denied = writePolicyViolation('append-only', 'update_field', 'Procedure Execution')
    expect(denied?.code).toBe('WRITE_POLICY_DENIED')
    expect(denied?.message).toContain('"Procedure Execution" is append-only')
  })

  it('allows nothing on a read-only concept and everything on a mutable one', () => {
    expect(writePolicyViolation('read-only', 'add_element', 'X')?.code).toBe('WRITE_POLICY_DENIED')
    expect(writePolicyViolation('mutable', 'remove_element', 'X')).toBeNull()
  })
})
