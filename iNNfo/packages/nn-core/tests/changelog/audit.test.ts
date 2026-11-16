import { describe, it, expect } from 'vitest'
import { parseKnowledge } from '../../src/parser/index.js'
import { buildChangeLogFromChangesets } from '../../src/changelog/load.js'
import type { ChangeLike, ChangesetLike } from '../../src/changelog/load.js'
import { checkProvenance } from '../../src/changelog/drift.js'
import {
  auditModelRecords,
  type RecordedModel,
} from '../../src/changelog/audit.js'

/**
 * The recordless-model audit (issue #587): a model written as a raw file and
 * registered in the manifest, outside every changeset, keeps its elements
 * without history — the console Changes tab renders "No recorded changes
 * targeting this unit". The audit names it; it never fails a write or a report.
 */

let stamp = 0
function logOf(
  changesets: Array<{
    status?: string
    changes: Array<Partial<ChangeLike> & Pick<ChangeLike, 'id' | 'op' | 'target'>>
  }>,
) {
  const records: ChangesetLike[] = changesets.map((cs) => {
    stamp += 1
    return {
      path: `changes/t_20260101T0001${String(stamp).padStart(2, '0')}Z_changes_NN.md`,
      status: cs.status ?? 'applied',
      author: 'agent',
      changes: cs.changes.map((c) => (c.evidence === undefined ? { ...c, evidence: 'decision' } : c)),
    }
  })
  return buildChangeLogFromChangesets(records)
}

const recorded = (modelId: string, path = `kNNowledge/${modelId}_NN.md`): RecordedModel => ({
  modelId,
  path,
})

const modelOf = recorded

describe('auditModelRecords', () => {
  it('a model no applied change names is MODEL_WITHOUT_RECORD, with its path and the fix', () => {
    const log = logOf([
      {
        changes: [
          {
            id: 'c-01',
            op: 'update_field',
            target: 'other@grow&owner',
            to: 'Ana',
            resolved_target: 'other@grow&owner',
          },
        ],
      },
    ])

    const diagnostics = auditModelRecords(log, [modelOf('orphan')])

    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]).toMatchObject({
      code: 'MODEL_WITHOUT_RECORD',
      severity: 'warning',
      unit: 'orphan',
    })
    expect(diagnostics[0]?.message).toContain('orphan')
    expect(diagnostics[0]?.message).toContain('kNNowledge/orphan_NN.md')
    expect(diagnostics[0]?.message).toContain('add_model')
  })

  it('a model an applied change names is recorded, and reports nothing', () => {
    const log = logOf([
      {
        changes: [
          {
            id: 'c-01',
            op: 'update_field',
            target: 'm@grow&owner',
            to: 'Ana',
            resolved_target: 'm@grow&owner',
          },
        ],
      },
    ])

    expect(auditModelRecords(log, [modelOf('m')])).toEqual([])
  })

  it('a change that is only proposed records nothing: the model is still an orphan', () => {
    const log = logOf([
      {
        status: 'proposed',
        changes: [
          {
            id: 'c-01',
            op: 'add_model',
            target: 'orphan',
            blueprint_name: 'coNNtent_V_0-1-0',
          },
        ],
      },
    ])

    expect(auditModelRecords(log, [modelOf('orphan')]).map((d) => d.code)).toEqual([
      'MODEL_WITHOUT_RECORD',
    ])
  })

  it('a rename chain records the id the model carried before the move', () => {
    const log = logOf([
      {
        changes: [
          {
            id: 'c-01',
            op: 'update_field',
            target: 'before@grow&owner',
            to: 'Ana',
            resolved_target: 'before@grow&owner',
          },
          { id: 'c-02', op: 'move_model', target: 'before', to: 'after' },
        ],
      },
    ])

    expect(auditModelRecords(log, [modelOf('after')])).toEqual([])
  })

  it('an extraction records the instance it created', () => {
    const log = logOf([
      {
        changes: [
          {
            id: 'c-01',
            op: 'extract_instance',
            target: 'registry@intro',
            to: 'series/villa/intro',
            extracted_slugs: ['intro'],
          },
        ],
      },
    ])

    expect(auditModelRecords(log, [modelOf('series/villa/intro')])).toEqual([])
  })

  it('a recorded target carrying a version token still records the plain model id', () => {
    const log = logOf([
      {
        changes: [
          {
            id: 'c-01',
            op: 'update_field',
            target: 'acme_V_0-1-0@grow&owner',
            to: 'Ana',
            resolved_target: 'acme_V_0-1-0@grow&owner',
          },
        ],
      },
    ])

    expect(auditModelRecords(log, [modelOf('acme')])).toEqual([])
  })

  it('names every orphan of a workspace, in the order it was given', () => {
    const log = logOf([
      {
        changes: [
          { id: 'c-01', op: 'add_model', target: 'kept', blueprint_name: 'coNNtent_V_0-1-0' },
        ],
      },
    ])

    const diagnostics = auditModelRecords(log, [
      modelOf('first'),
      modelOf('kept'),
      modelOf('second'),
    ])

    expect(diagnostics.map((d) => d.unit)).toEqual(['first', 'second'])
  })

  it('stays out of the fold: checkProvenance still says nothing about a model it never touches', () => {
    const log = logOf([
      {
        changes: [
          {
            id: 'c-01',
            op: 'update_field',
            target: 'other@grow&owner',
            to: 'Ana',
            resolved_target: 'other@grow&owner',
          },
        ],
      },
    ])
    const model = parseKnowledge(`---
level: 3
parent_spec:
  name: coNNtent_V_0-1-0
---

# NN Goal
## NN Goal: Grow
slug:: grow
owner:: Ana
`)

    // The fold's contract is unchanged: drift is reported inside a model the log
    // touches, never as a verdict on a model no change names.
    const fold = checkProvenance(log, [
      { modelId: 'orphan', model, path: 'kNNowledge/orphan_NN.md' },
    ]).diagnostics
    expect(fold.map((d) => [d.code, d.unit])).toEqual([['MODEL_WITHOUT_FILE', 'other']])
    expect(
      auditModelRecords(log, [{ modelId: 'orphan', path: 'kNNowledge/orphan_NN.md' }]).map(
        (d) => d.code,
      ),
    ).toEqual(['MODEL_WITHOUT_RECORD'])
  })
})
