import { describe, it, expect } from 'vitest'
import { parseKnowledge } from '../../src/parser/index.js'
import { buildChangeLogFromChangesets } from '../../src/changelog/load.js'
import type { ChangeLike, ChangesetLike } from '../../src/changelog/load.js'
import { checkProvenance } from '../../src/changelog/drift.js'
import type { ProvenanceModel } from '../../src/changelog/drift.js'

/**
 * change-provenance: drift means the fold does not reproduce the file.
 * A4 rules and the four diagnostic codes, in fold mode (warnings) and strict
 * mode (errors).
 */

let stamp = 0
function logOf(changesets: Array<{ status?: string; changes: Array<Partial<ChangeLike> & Pick<ChangeLike, 'id' | 'op' | 'target'>> }>) {
  const records: ChangesetLike[] = changesets.map((cs) => {
    stamp += 1
    return {
      path: `changes/t_20260101T0001${String(stamp).padStart(2, '0')}Z_changes_NN.md`,
      status: cs.status ?? 'applied',
      author: 'agent',
      // A change's evidence is mandatory; default it so only the evidence cases
      // exercise EVIDENCE_UNKNOWN.
      changes: cs.changes.map((c) => (c.evidence === undefined ? { ...c, evidence: 'decision' } : c)),
    }
  })
  return buildChangeLogFromChangesets(records)
}

const MODEL = `---
spec_version: "V_0-4-0"
level: 3
knowledge_version: "V_0-1-0"
title: "Strategy"
---

# NN Goal
## NN Goal: Grow
slug:: grow
owner:: Ana
`

const modelOf = (content: string, modelId = 'm'): ProvenanceModel => ({
  modelId,
  model: parseKnowledge(content),
  path: 'kNNowledge/m_NN.md',
})

const codes = (report: { diagnostics: Array<{ code: string }> }) => report.diagnostics.map((d) => d.code)

describe('field drift', () => {
  it('a hand edit is EDITED_WITHOUT_RECORD with expected and actual', () => {
    const log = logOf([
      { changes: [{ id: 'c-01', op: 'update_field', target: 'm@grow&owner', to: 'Ana', resolved_target: 'm@grow&owner' }] },
    ])
    const edited = MODEL.replace('owner:: Ana', 'owner:: Bea')
    const report = checkProvenance(log, [modelOf(edited)])
    const d = report.diagnostics.find((x) => x.code === 'EDITED_WITHOUT_RECORD')
    expect(d).toMatchObject({ severity: 'warning', unit: 'm@grow&owner', expected: 'Ana', actual: 'Bea' })
    expect(report.ok).toBe(true)
  })

  it('a unit with no applied change is UNIT_WITHOUT_RECORD', () => {
    const log = logOf([
      { changes: [{ id: 'c-01', op: 'update_field', target: 'm@grow&owner', to: 'Ana', resolved_target: 'm@grow&owner' }] },
    ])
    const extra = MODEL.replace('owner:: Ana', 'owner:: Ana\nteam:: Blue')
    expect(codes(checkProvenance(log, [modelOf(extra)]))).toContain('UNIT_WITHOUT_RECORD')
  })

  it('a merged rename does not produce false drift', () => {
    const log = logOf([
      {
        changes: [
          { id: 'c-01', op: 'update_field', target: 'm@grow&owner', to: '[[Alpha]]', resolved_target: 'm@grow&owner' },
          { id: 'c-02', op: 'rename_element', target: 'm@alpha', name: 'Beta', from: 'Alpha', resolved_target: 'm@alpha' },
        ],
      },
    ])
    const relinked = MODEL.replace('owner:: Ana', 'owner:: [[Beta]]')
    expect(checkProvenance(log, [modelOf(relinked)]).diagnostics).toEqual([])
  })

  it('a cleared field is expected absent; re-adding it is drift', () => {
    const log = logOf([
      {
        changes: [
          { id: 'c-01', op: 'update_field', target: 'm@grow&owner', to: 'Ana', resolved_target: 'm@grow&owner' },
          { id: 'c-02', op: 'update_field', target: 'm@grow&owner', to: '', resolved_target: 'm@grow&owner' },
        ],
      },
    ])
    const absent = MODEL.replace('owner:: Ana\n', '')
    expect(checkProvenance(log, [modelOf(absent)]).diagnostics).toEqual([])
    const readded = checkProvenance(log, [modelOf(MODEL)])
    const d = readded.diagnostics.find((x) => x.unit === 'm@grow&owner')
    expect(d?.code).toBe('EDITED_WITHOUT_RECORD')
  })

  it('compares typed values in canonical form', () => {
    const log = logOf([
      {
        changes: [
          { id: 'c-01', op: 'update_field', target: 'm@grow&price', to: '7', resolved_target: 'm@grow&price' },
          { id: 'c-02', op: 'update_field', target: 'm@grow&active', to: 'true', resolved_target: 'm@grow&active' },
          { id: 'c-03', op: 'update_field', target: 'm@grow&tags', to: '[a, b]', resolved_target: 'm@grow&tags' },
        ],
      },
    ])
    const file = MODEL.replace('owner:: Ana', 'price:: 7\nactive:: true\ntags:: [a, b]')
    expect(checkProvenance(log, [modelOf(file)]).diagnostics).toEqual([])
  })

  it('a whitespace-only edit is not fold drift', () => {
    const log = logOf([
      { changes: [{ id: 'c-01', op: 'update_field', target: 'm@grow&owner', to: 'Ana', resolved_target: 'm@grow&owner' }] },
    ])
    const spaced = MODEL.replace('owner:: Ana', 'owner::   Ana   ')
    expect(checkProvenance(log, [modelOf(spaced)]).diagnostics).toEqual([])
  })
})

describe('element-level drift', () => {
  it('an element with no frozen slug is UNIT_WITHOUT_RECORD', () => {
    const log = logOf([
      { changes: [{ id: 'c-01', op: 'update_field', target: 'm@grow&owner', to: 'Ana', resolved_target: 'm@grow&owner' }] },
    ])
    const unfrozen = MODEL.replace('slug:: grow\n', '')
    const report = checkProvenance(log, [modelOf(unfrozen)])
    expect(report.diagnostics.some((d) => d.code === 'UNIT_WITHOUT_RECORD' && /slug/i.test(d.message))).toBe(true)
  })

  it('an element missing from the file is EDITED_WITHOUT_RECORD', () => {
    const log = logOf([
      {
        changes: [
          { id: 'c-01', op: 'add_element', target: 'm@Grow', name: 'Grow', resolved_target: 'm@grow' },
          { id: 'c-02', op: 'update_field', target: 'm@grow&owner', to: 'Ana', resolved_target: 'm@grow&owner' },
        ],
      },
    ])
    const noElement = `---
spec_version: "V_0-4-0"
level: 3
knowledge_version: "V_0-1-0"
title: "Strategy"
---

# NN Goal
`
    expect(codes(checkProvenance(log, [modelOf(noElement)]))).toContain('EDITED_WITHOUT_RECORD')
  })

  it('a matrix cell present with no change is UNIT_WITHOUT_RECORD', () => {
    const log = logOf([
      { changes: [{ id: 'c-01', op: 'update_field', target: 'm@grow&owner', to: 'Ana', resolved_target: 'm@grow&owner' }] },
    ])
    const withMatrix = `${MODEL}
# NN matrices: Risk
| | A |
|---|---|
| R | High |
`
    const report = checkProvenance(log, [modelOf(withMatrix)])
    expect(report.diagnostics.some((d) => d.code === 'UNIT_WITHOUT_RECORD' && d.unit?.includes('&'))).toBe(true)
  })
})

describe('evidence drift', () => {
  const evidenceLog = () =>
    logOf([
      {
        changes: [
          { id: 'c-01', op: 'update_field', target: 'm@grow&owner', to: 'Ana', resolved_target: 'm@grow&owner', evidence: 'unknown' },
          {
            id: 'c-02',
            op: 'update_field',
            target: 'm@grow&team',
            to: 'Blue',
            resolved_target: 'm@grow&team',
            evidence: 'sources/import/a.md',
            evidence_sha256: ['aaaa'],
          },
        ],
      },
    ])

  it('EVIDENCE_UNKNOWN names the change, author and target', () => {
    const report = checkProvenance(evidenceLog(), [modelOf(MODEL.replace('owner:: Ana', 'owner:: Ana\nteam:: Blue'))])
    const d = report.diagnostics.find((x) => x.code === 'EVIDENCE_UNKNOWN')
    expect(d?.changeId).toBe('c-01')
    expect(d?.author).toBe('agent')
    expect(d?.unit).toBe('m@grow&owner')
  })

  it('a changed source sha is EVIDENCE_SOURCE_CHANGED; a matching sha is silent', () => {
    const models = [modelOf(MODEL.replace('owner:: Ana', 'owner:: Ana\nteam:: Blue'))]
    const changed = checkProvenance(evidenceLog(), models, { sha256: () => 'bbbb' })
    expect(changed.diagnostics.find((d) => d.code === 'EVIDENCE_SOURCE_CHANGED')?.changeId).toBe('c-02')
    const same = checkProvenance(evidenceLog(), models, { sha256: () => 'aaaa' })
    expect(same.diagnostics.some((d) => d.code === 'EVIDENCE_SOURCE_CHANGED')).toBe(false)
  })
})

describe('a model touched by an applied change with no file entry (distributed-storage S6c)', () => {
  const touchedChange = { id: 'c-01', op: 'update_field', target: 'villabotijos-today/intro@grow&owner', to: 'Ana', resolved_target: 'villabotijos-today/intro@grow&owner' } as const

  it('MODEL_WITHOUT_FILE names the id and the change, as a warning in fold mode', () => {
    const log = logOf([{ changes: [touchedChange] }])
    const report = checkProvenance(log, [])
    const d = report.diagnostics.find((x) => x.code === 'MODEL_WITHOUT_FILE')
    expect(d).toMatchObject({ severity: 'warning', changeId: 'c-01', unit: 'villabotijos-today/intro' })
    expect(d?.message).toContain('villabotijos-today/intro')
    expect(d?.message).toContain('c-01')
    expect(report.ok).toBe(true)
  })

  it('is an error in strict mode', () => {
    const log = logOf([{ changes: [touchedChange] }])
    const report = checkProvenance(log, [], { strict: true })
    const d = report.diagnostics.find((x) => x.code === 'MODEL_WITHOUT_FILE')
    expect(d?.severity).toBe('error')
    expect(report.ok).toBe(false)
  })

  it('is silent when the model is present', () => {
    const log = logOf([{ changes: [touchedChange] }])
    const models = [modelOf(MODEL.replace('owner:: Ana', ''), 'villabotijos-today/intro')]
    expect(codes(checkProvenance(log, models))).not.toContain('MODEL_WITHOUT_FILE')
  })

  it('a model renamed by move_model whose chain ends in a live model is not drift', () => {
    const log = logOf([
      {
        changes: [
          { id: 'c-01', op: 'update_field', target: 'innteresante/intro@grow&owner', to: 'Ana', resolved_target: 'innteresante/intro@grow&owner' },
          { id: 'c-02', op: 'move_model', target: 'innteresante/intro', to: 'villabotijos-today/intro' },
        ],
      },
    ])
    const models = [modelOf(MODEL, 'villabotijos-today/intro')]
    expect(codes(checkProvenance(log, models))).not.toContain('MODEL_WITHOUT_FILE')
  })

  it('a hand-deleted instance is reported (A-5)', () => {
    const log = logOf([
      {
        changes: [
          { id: 'c-01', op: 'add_model', target: 'villabotijos-today/intro', concept: 'Video', name: 'Intro' },
          { id: 'c-02', op: 'update_field', target: 'villabotijos-today/intro@intro&title', to: 'Intro', resolved_target: 'villabotijos-today/intro@intro&title' },
        ],
      },
    ])
    const d = checkProvenance(log, []).diagnostics.find((x) => x.code === 'MODEL_WITHOUT_FILE')
    expect(d).toMatchObject({ unit: 'villabotijos-today/intro' })
    expect(d?.message).toContain('villabotijos-today/intro')
  })
})

describe('modes and scope', () => {
  it('strict mode reports errors', () => {
    const log = logOf([
      { changes: [{ id: 'c-01', op: 'update_field', target: 'm@grow&owner', to: 'Ana', resolved_target: 'm@grow&owner' }] },
    ])
    const report = checkProvenance(log, [modelOf(MODEL.replace('owner:: Ana', 'owner:: Bea'))], { strict: true })
    expect(report.mode).toBe('strict')
    expect(report.diagnostics.every((d) => d.severity === 'error')).toBe(true)
    expect(report.ok).toBe(false)
  })

  it('with no changeset context there are no diagnostics', () => {
    const empty = logOf([])
    expect(checkProvenance(empty, [modelOf(MODEL)]).diagnostics).toEqual([])
  })

  it('a model the log never touches is not checked', () => {
    const log = logOf([
      { changes: [{ id: 'c-01', op: 'update_field', target: 'other@grow&owner', to: 'Ana', resolved_target: 'other@grow&owner' }] },
    ])
    // `m` is not checked; the touched-but-missing `other` is the only diagnostic
    // (distributed-storage S6c).
    expect(checkProvenance(log, [modelOf(MODEL)]).diagnostics.map((d) => [d.code, d.unit])).toEqual([
      ['MODEL_WITHOUT_FILE', 'other'],
    ])
  })
})
