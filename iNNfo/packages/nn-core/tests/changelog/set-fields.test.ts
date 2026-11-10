import { describe, it, expect } from 'vitest'
import { parseKnowledge } from '../../src/parser/index.js'
import { buildChangeLogFromChangesets, type ChangesetLike } from '../../src/changelog/load.js'
import { checkProvenance } from '../../src/changelog/drift.js'
import { compareChanges } from '../../src/changelog/order.js'
import { computeProposalSha, verifyProposalSha } from '../../src/changeset/hasher.js'
import { parseChangeset } from '../../src/changeset/parser.js'
import { serializeChangeset } from '../../src/changeset/serializer.js'
import { setFieldsEntries, setFieldsProblems, type ChangeItem } from '../../src/changeset/types.js'

/**
 * changeset-document-model: `set_fields` sets several fields of one element from one
 * evidence. change-provenance: the fold expands an applied `set_fields` into one unit
 * per field, with the same hop, evidence and canonical position.
 */

const SET_FIELDS = {
  id: 'c-01',
  op: 'set_fields',
  target: 'm@alerta',
  to: '{"topics":"ai","language":"es"}',
  evidence: '[A]',
  status: 'applied',
}

function changeset(path: string, changes: ChangesetLike['changes']): ChangesetLike {
  return { path, status: 'applied', author: 'juan', appliedAt: '2026-10-23T10:00:00.123Z', changes }
}

describe('set_fields in the change log', () => {
  it('gives each field its own unit and origin', () => {
    const log = buildChangeLogFromChangesets([
      changeset('changes/d_a_20261023T100000Z_changes_NN.md', [SET_FIELDS]),
    ])
    const units = new Map([...log.units('m')].map((u) => [u.key, u]))
    expect(units.get('m@alerta&topics')?.value).toBe('ai')
    expect(units.get('m@alerta&language')?.value).toBe('es')
    for (const unit of ['m@alerta&topics', 'm@alerta&language']) {
      const origin = log.origin(unit)
      expect(origin?.id).toBe('c-01')
      expect(origin?.evidence).toBe('[A]')
      expect(origin?.appliedAt).toBe('2026-10-23T10:00:00.123Z')
      expect(origin?.author).toBe('juan')
    }
  })

  it('a later update_field supersedes one field only', () => {
    const log = buildChangeLogFromChangesets([
      changeset('changes/d_a_20261023T100000Z_changes_NN.md', [
        SET_FIELDS,
        { id: 'c-02', op: 'update_field', target: 'm@alerta&language', to: 'en', evidence: '[B]', status: 'applied' },
      ]),
    ])
    expect(log.origin('m@alerta&language')?.id).toBe('c-02')
    expect(log.origin('m@alerta&language')?.to).toBe('en')
    expect(log.origin('m@alerta&topics')?.id).toBe('c-01')
  })

  it('keys the units on the frozen slug of resolved_target', () => {
    const log = buildChangeLogFromChangesets([
      changeset('changes/d_a_20261023T100000Z_changes_NN.md', [
        { ...SET_FIELDS, target: 'm@Alerta Roja', resolved_target: 'm@alerta-roja' },
      ]),
    ])
    expect(log.origin('m@alerta-roja&topics')?.id).toBe('c-01')
  })

  it('keeps every expanded entry distinct in the canonical order', () => {
    const log = buildChangeLogFromChangesets([
      changeset('changes/d_a_20261023T100000Z_changes_NN.md', [SET_FIELDS]),
    ])
    const expanded = log.all.filter((c) => c.id === 'c-01')
    expect(expanded).toHaveLength(2)
    expect(compareChanges(expanded[0]!, expanded[1]!)).toBeLessThan(0)
    expect(compareChanges(expanded[1]!, expanded[0]!)).toBeGreaterThan(0)
    expect(expanded.map((c) => c.resolvedTarget)).toEqual(['m@alerta&topics', 'm@alerta&language'])
  })

  it('leaves an unapplied set_fields as one change', () => {
    const log = buildChangeLogFromChangesets([
      changeset('changes/d_a_20261023T100000Z_changes_NN.md', [{ ...SET_FIELDS, status: 'conflict' }]),
    ])
    expect(log.all).toHaveLength(1)
    expect(log.all[0]!.op).toBe('set_fields')
  })

  it('drift sees no unrecorded edit for a model written only by set_fields', () => {
    const log = buildChangeLogFromChangesets([
      changeset('changes/d_a_20261023T100000Z_changes_NN.md', [
        { id: 'c-01', op: 'add_element', target: 'm@alerta', concept: 'Goal', name: 'Alerta', evidence: '[A]', status: 'applied', resolved_target: 'm@alerta' },
        { ...SET_FIELDS, id: 'c-02' },
      ]),
    ])
    const model = parseKnowledge(
      '---\nlevel: 3\nknowledge_version: "V_0-1-0"\ntitle: "M"\n---\n\n# NN Goal\n## NN Goal: Alerta\nslug:: alerta\ntopics:: ai\nlanguage:: es\n',
    )
    const codes = checkProvenance(log, [{ modelId: 'm', model, path: 'kNNowledge/m_NN.md' }]).diagnostics.map((d) => d.code)
    expect(codes).not.toContain('EDITED_WITHOUT_RECORD')
    expect(codes).not.toContain('UNIT_WITHOUT_RECORD')
  })
})

describe('set_fields shape', () => {
  const shape = (over: Partial<ChangeItem>) =>
    setFieldsProblems({ op: 'set_fields', target: 'm@alerta', to: '{"a":"1"}', ...over }).map((p) => p.code)

  it('accepts a well-formed payload with a partial from', () => {
    expect(shape({ to: '{"language":"fr","topics":"ai"}', from: '{"language":"es"}' })).toEqual([])
    expect(
      setFieldsEntries({ op: 'set_fields', to: '{"language":"fr","topics":"ai"}', from: '{"language":"es"}' }),
    ).toEqual([
      { field: 'language', to: 'fr', from: 'es' },
      { field: 'topics', to: 'ai' },
    ])
  })

  it('rejects empty, non-object, repeated-key and stray-from payloads with INVALID_OPERATION', () => {
    expect(shape({ to: '{}' })).toEqual(['INVALID_OPERATION'])
    expect(shape({ to: '["a"]' })).toEqual(['INVALID_OPERATION'])
    expect(shape({ to: '{"a":"1","a":"2"}' })).toEqual(['INVALID_OPERATION'])
    expect(shape({ from: '{"b":"x"}' })).toEqual(['INVALID_OPERATION'])
    expect(shape({ target: 'm@alerta&a' })).toEqual(['INVALID_OPERATION'])
  })

  it('rejects the description key with USE_UPDATE_ELEMENT_TEXT', () => {
    expect(shape({ to: '{"description":"prose"}' })).toEqual(['USE_UPDATE_ELEMENT_TEXT'])
  })
})

describe('set_fields seal and serialization', () => {
  const change: ChangeItem = {
    id: 'c-01',
    op: 'set_fields',
    target: 'm@alerta',
    to: '{"topics":"ai, news, travel","language":"es"}',
    evidence: 'sources/import/r.csv@12',
  }
  const doc = () => ({
    frontmatter: {
      spec_version: 'V_0-4-0',
      level: 3 as const,
      parent_spec: { name: 'changes' as const, url: 'https://example.test/changes/spec_NN.md' },
      blueprint_version: 'V_0-9-0',
      status: 'proposed' as const,
      proposal_sha: computeProposalSha([change]),
    },
    changes: [change],
  })

  it('writes the payload as one JSON line and parses it back', () => {
    const text = serializeChangeset(doc())
    expect(text).toContain('to:: {"topics":"ai, news, travel","language":"es"}')
    const parsed = parseChangeset(text)
    expect(parsed.changes[0]!.to).toBe(change.to)
    expect(verifyProposalSha(parsed)).toBe(true)
  })

  it('fails the seal when one value inside to is edited', () => {
    const text = serializeChangeset(doc()).replace('"language":"es"', '"language":"en"')
    expect(verifyProposalSha(parseChangeset(text))).toBe(false)
  })
})
