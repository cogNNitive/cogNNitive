import { describe, it, expect } from 'vitest'
import {
  computeProposalSha,
  parseChangeset,
  serializeChangeset,
  parseTransitions,
} from '@cognnitive/nn-core'
import type { ChangesetDocument, ChangeItem } from '@cognnitive/nn-core'
import { buildChangeLog } from '../../src/changelog/load.js'
import type { FileSnapshot } from '../../src/queryUnits.js'

/**
 * Run context on changesets (design B1, D3): a sealed `run::` frontmatter naming the run
 * and step that wrote the file, and a run-scoped read of the change log.
 */

const change = (id: string, to: string): ChangeItem => ({
  id,
  op: 'update_field',
  target: 'videos@episode-one&title',
  to,
  evidence: 'decision',
})

function doc(changes: ChangeItem[], fm: Record<string, unknown> = {}): ChangesetDocument {
  return {
    frontmatter: {
      spec_version: 'V_0-5-0',
      level: 3,
      parent_spec: { name: 'changes', url: 'https://example.test/changes/spec_NN.md' },
      blueprint_version: 'V_0-14-0',
      status: 'proposed',
      proposal_sha: computeProposalSha(changes, fm as never),
      author: 'agent',
      applied_at: '2026-11-21T10:00:00.000Z',
      ...fm,
    },
    changes,
  }
}

describe('run context frontmatter', () => {
  it('parses a run context', () => {
    const parsed = parseChangeset(
      serializeChangeset(doc([change('c-1', 'A')], { run: 'run-1@draft' })),
    )
    expect(parsed.frontmatter.run).toBe('run-1@draft')
  })

  it('leaves run undefined when absent', () => {
    const parsed = parseChangeset(serializeChangeset(doc([change('c-1', 'A')])))
    expect(parsed.frontmatter.run).toBeUndefined()
  })

  it('rejects an empty run context', () => {
    const raw = serializeChangeset(doc([change('c-1', 'A')])).replace(
      'author: agent',
      'author: agent\nrun: ""',
    )
    expect(() => parseChangeset(raw)).toThrow()
  })

  it('is sealed: changing the run breaks the seal', () => {
    const changes = [change('c-1', 'A')]
    const withoutRun = computeProposalSha(changes, {})
    const withRun = computeProposalSha(changes, { run: 'run-1@draft' })
    expect(withRun).not.toBe(withoutRun)
    expect(computeProposalSha(changes, { run: 'run-1@other' })).not.toBe(withRun)
  })

  it('keeps the run line through a write-back', () => {
    const serialized = serializeChangeset(doc([change('c-1', 'A')], { run: 'run-1@draft' }))
    const reapplied = serializeChangeset({
      ...parseChangeset(serialized),
      frontmatter: { ...parseChangeset(serialized).frontmatter, status: 'applied' },
    })
    expect(reapplied).toContain('run: run-1@draft')
    expect(reapplied).toContain('status: applied')
  })
})

describe('runChanges (the run-scoped change-log read)', () => {
  const snapshot = (
    path: string,
    fm: Record<string, unknown>,
    changes: ChangeItem[],
  ): FileSnapshot => ({
    path,
    content: serializeChangeset(doc(changes, fm)),
  })

  const files: FileSnapshot[] = [
    snapshot('changes/ws_a_run1draft_changes_NN.md', { run: 'run-1@draft', status: 'applied' }, [
      change('a-1', 'Title from draft'),
    ]),
    snapshot('changes/ws_b_run1seal_changes_NN.md', { run: 'run-1@seal', status: 'applied' }, [
      change('b-1', 'Title from seal'),
    ]),
    snapshot('changes/ws_c_run2draft_changes_NN.md', { run: 'run-2@draft', status: 'applied' }, [
      change('c-1', 'Title from run two'),
    ]),
    snapshot('changes/ws_d_human_changes_NN.md', { status: 'applied' }, [
      change('d-1', 'Human edit'),
    ]),
  ]

  const log = buildChangeLog(files)

  it('reads every applied change of a run', () => {
    const changes = log.runChanges('run-1')
    expect(changes.map((c) => c.id).sort()).toEqual(['a-1', 'b-1'])
  })

  it('narrows to one step', () => {
    const changes = log.runChanges('run-1', 'draft')
    expect(changes.map((c) => c.id)).toEqual(['a-1'])
  })

  it('does not leak one run into another', () => {
    expect(log.runChanges('run-2').map((c) => c.id)).toEqual(['c-1'])
  })

  it('never returns a change with no run context', () => {
    expect(log.runChanges('run-1').some((c) => c.id === 'd-1')).toBe(false)
  })

  it('returns nothing for an unknown run', () => {
    expect(log.runChanges('run-9')).toEqual([])
  })

  it('does not parse a run id prefix by accident', () => {
    // `run-1` must not match `run-10`.
    const prefixed = buildChangeLog([
      snapshot('changes/ws_e_run10_changes_NN.md', { run: 'run-10@draft', status: 'applied' }, [
        change('e-1', 'Other run'),
      ]),
    ])
    expect(prefixed.runChanges('run-1')).toEqual([])
    expect(prefixed.runChanges('run-10').map((c) => c.id)).toEqual(['e-1'])
  })
})

describe('parseTransitions stays independent of the run context', () => {
  it('a changeset with no run parses with no transitions involved', () => {
    expect(parseTransitions('{"": ["a"], "a": []}')).toEqual({ '': ['a'], a: [] })
  })
})
