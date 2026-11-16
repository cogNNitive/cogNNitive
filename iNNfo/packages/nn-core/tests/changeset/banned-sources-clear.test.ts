/**
 * Repairing a banned Level-3 field goes through the change log (issue-560).
 *
 * `sources::` is banned on L3 (`SOURCES_FIELD_BANNED`): a unit declares no
 * provenance of its own, because provenance is the `evidence` of the applied
 * change that set the value. A document that still carries the field is
 * repaired by clearing it through a sealed changeset, never by hand and never
 * by a dedicated remove operation:
 *
 *   update_field on `model@element&sources` with `to:: ""`
 *
 * An empty `to` is how a field is cleared (`null`/`undefined` are not values).
 * These tests pin the round-trip the generic clear tests do not cover: the
 * banned field is the target, the document validates clean afterwards, every
 * unrelated field survives byte for byte, the change is recorded as the one
 * that cleared the unit, and a wrong `from` conflicts without writing.
 */
import { describe, it, expect } from 'vitest'
import {
  applyMutation,
  buildChangeLogFromChangesets,
  changesetLikeOf,
  computeProposalSha,
  parseChangeset,
  parseKnowledge,
  partitionChangeset,
  serializeChangeset,
  serializeKnowledge,
  validateKnowledge,
  verifyProposalSha,
} from '../../src/index.js'
import type { ChangeItem, ChangesetDocument, SpecDocument } from '../../src/index.js'

/** A minimal `strategy` bluepriNNt: one concept, two declared fields, no citation. */
const STRATEGY_SPEC: SpecDocument = {
  name: 'strategy_V_0-2-0',
  level: 2,
  frontmatter: { spec_version: 'V_0-4-0', level: 2 },
  rawContent: [
    '# NN Concept Definition',
    '',
    '## NN Concept Definition: Work',
    'type:: list',
    '',
    '# NN Field Definition',
    '',
    '## NN Field Definition: statement',
    'concept:: Work',
    'type:: string',
    '',
    '## NN Field Definition: target_year',
    'concept:: Work',
    'type:: string',
    '',
  ].join('\n'),
}

/** The banned field the change log repairs, and the value it currently carries. */
const BANNED_FIELD = 'sources'
const BANNED_VALUE = 'sources/import/interview.md@## Vision'

const MODEL = `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: "strategy_V_0-2-0"
  url: "specs/strategy_V_0-2-0_NN.md"
knowledge_version: "V_0-1-0"
title: "Strategy"
---

# NN Work
## NN Work: Vision
statement:: Accelerate green energy
target_year:: 2030
${BANNED_FIELD}:: ${BANNED_VALUE}
`

const TARGET = 'strategy@vision&sources'

function bannedErrors(model: ReturnType<typeof parseKnowledge>) {
  return validateKnowledge(model, STRATEGY_SPEC, null).errors.filter(
    (e) => e.code === 'SOURCES_FIELD_BANNED',
  )
}

/** A sealed changeset with one `update_field` that clears the banned field. */
function sealedClearChangeset(from: string): ChangesetDocument {
  const changes: ChangeItem[] = [
    {
      id: 'c-01',
      op: 'update_field',
      target: TARGET,
      from,
      to: '',
      evidence: 'decision',
    },
  ]
  return {
    frontmatter: {
      spec_version: 'V_0-5-0',
      level: 3,
      parent_spec: { name: 'changes', url: 'specs/changes_V_0-9-0_NN.md' },
      blueprint_version: 'V_0-9-0',
      status: 'proposed',
      proposal_sha: computeProposalSha(changes),
    },
    changes,
  }
}

describe('a banned L3 field is cleared through a sealed changeset', () => {
  it('removes sources:: and leaves the document valid with every other field intact', () => {
    const model = parseKnowledge(MODEL)
    const before = bannedErrors(model)
    expect(before).toHaveLength(1)
    expect(before[0].message).toContain('banned on L3')

    const original = serializeChangeset(sealedClearChangeset(BANNED_VALUE))
    const parsed = parseChangeset(original)
    expect(verifyProposalSha(parsed)).toBe(true)
    expect(parsed.changes[0].to).toBe('')

    const res = applyMutation(model, parsed.changes[0].op, {
      elementName: 'Vision',
      fieldName: BANNED_FIELD,
      to: parsed.changes[0].to,
    })
    expect(res.success).toBe(true)

    const live = serializeKnowledge(parseKnowledge(serializeKnowledge(model)))
    expect(live).not.toContain(`${BANNED_FIELD}::`)
    expect(live).toContain('statement:: Accelerate green energy')
    expect(live).toContain('target_year:: 2030')
    expect(bannedErrors(parseKnowledge(live))).toHaveLength(0)
  })

  it('records the applied change as the one that cleared the unit', () => {
    const doc = sealedClearChangeset(BANNED_VALUE)
    const parsed = parseChangeset(serializeChangeset(doc))
    const change = parsed.changes[0]
    change.status = 'applied'
    change.applied_at = '2026-11-16T00:00:00.000Z'
    change.resolved_target = TARGET
    parsed.frontmatter.status = 'applied'

    const applied = parseChangeset(serializeChangeset(parsed))
    const log = buildChangeLogFromChangesets([changesetLikeOf('changes/clear_changes_NN.md', applied)])

    expect(log.all.map((c) => c.op)).toEqual(['update_field'])
    expect(log.cleared.has(TARGET)).toBe(true)
    const history = log.history(TARGET)
    expect(history).toHaveLength(1)
    expect(history[0].from).toBe(BANNED_VALUE)
    expect(history[0].to).toBe('')
    // A cleared unit has no live value, so it has no origin; the clear lives in history.
    expect(log.origin(TARGET)).toBeUndefined()
  })

  it('a clear whose from does not match the banned value conflicts and writes nothing', async () => {
    const model = parseKnowledge(MODEL)
    const before = serializeKnowledge(model)

    const parsed = parseChangeset(
      serializeChangeset(sealedClearChangeset('sources/import/stale.md@## Older')),
    )
    expect(parsed.changes[0].from).not.toBe(BANNED_VALUE)

    // The apply engine's from-precondition holds the change back before any write.
    const partition = await partitionChangeset([parsed.changes[0]], new Map([['strategy', model]]))
    expect(partition.cleanSubset).toHaveLength(0)
    expect(partition.conflictedSubset).toHaveLength(1)
    expect(partition.conflictDiagnostics.get('c-01')?.code).toBe('PRECONDITION_FAILED')

    // Nothing was mutated: the banned field is still there and still invalid.
    expect(serializeKnowledge(model)).toBe(before)
    expect(bannedErrors(model)).toHaveLength(1)
  })
})
