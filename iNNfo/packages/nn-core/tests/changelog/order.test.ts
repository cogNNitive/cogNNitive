import { describe, it, expect } from 'vitest'
import { compareChanges, changeStamp, type ChangeOrderKey } from '../../src/changelog/order.js'

function key(changeset: string, index: number, appliedAt?: string): ChangeOrderKey {
  return { changeset, index, appliedAt }
}

describe('changeStamp', () => {
  it('parses the UTC stamp from a changeset filename', () => {
    expect(changeStamp('changes/acme_agent_20261010T120000Z_changes_NN.md')).toBe('20261010T120000Z')
  })

  it('returns an empty stamp when the filename carries none', () => {
    expect(changeStamp('changes/acme_agent_changes_NN.md')).toBe('')
    expect(changeStamp('changes/notes.md')).toBe('')
    expect(changeStamp('changes/acme_agent_2026101T120000Z_changes_NN.md')).toBe('')
  })

  it('only accepts the canonical _<stamp>_changes_NN.md suffix', () => {
    expect(changeStamp('changes/acme_agent_20261010T120000Z_changes_NN.md.bak')).toBe('')
    expect(changeStamp('changes/acme_agent_20261010T120000Z_other_NN.md')).toBe('')
  })
})

describe('compareChanges', () => {
  it('orders by applied_at first', () => {
    const early = key('changes/z_agent_20261010T130000Z_changes_NN.md', 0, '2026-10-10T12:00:00.000Z')
    const late = key('changes/a_agent_20261010T120000Z_changes_NN.md', 0, '2026-10-10T13:00:00.000Z')
    expect([late, early].sort(compareChanges)).toEqual([early, late])
  })

  it('breaks an applied_at tie with the filename UTC stamp, not the author or filename order', () => {
    const stampEarly = key('changes/zz_agent_20261010T120000Z_changes_NN.md', 0, '2026-10-10T12:00:00.000Z')
    const stampLate = key('changes/aa_agent_20261010T130000Z_changes_NN.md', 0, '2026-10-10T12:00:00.000Z')
    expect([stampLate, stampEarly].sort(compareChanges)).toEqual([stampEarly, stampLate])
  })

  it('orders same-second changesets of one author by their numeric -seq suffix', () => {
    const first = key('changes/acme_bot_20261010T120000Z_changes_NN.md', 0)
    const second = key('changes/acme_bot_20261010T120000Z-2_changes_NN.md', 0)
    const tenth = key('changes/acme_bot_20261010T120000Z-10_changes_NN.md', 0)
    expect([tenth, second, first].sort(compareChanges)).toEqual([first, second, tenth])
  })

  it('breaks a stamp tie by filename, then by document index', () => {
    const b = key('changes/b_agent_20261010T120000Z_changes_NN.md', 0)
    const a = key('changes/a_agent_20261010T120000Z_changes_NN.md', 2)
    const aFirst = key('changes/a_agent_20261010T120000Z_changes_NN.md', 1)
    expect([b, a, aFirst].sort(compareChanges)).toEqual([aFirst, a, b])
  })

  it('treats a missing applied_at as the earliest', () => {
    const missing = key('changes/z_agent_20261010T120000Z_changes_NN.md', 0)
    const stamped = key('changes/a_agent_20261010T110000Z_changes_NN.md', 0, '2026-10-10T12:00:00.000Z')
    expect(compareChanges(missing, stamped)).toBeLessThan(0)
  })

  it('is a total order: two distinct changes never compare equal', () => {
    const changes = [
      key('changes/a_agent_20261010T120000Z_changes_NN.md', 0, '2026-10-10T12:00:00.000Z'),
      key('changes/a_agent_20261010T120000Z_changes_NN.md', 1, '2026-10-10T12:00:00.000Z'),
      key('changes/b_agent_20261010T120000Z_changes_NN.md', 0, '2026-10-10T12:00:00.000Z'),
      key('changes/b_agent_20261010T130000Z_changes_NN.md', 0, '2026-10-10T12:00:00.000Z'),
      key('changes/b_agent_20261010T130000Z_changes_NN.md', 0, '2026-10-10T14:00:00.000Z'),
      key('changes/b_agent_20261010T130000Z_changes_NN.md', 0),
    ]
    for (const x of changes) {
      for (const y of changes) {
        if (x === y) continue
        expect(compareChanges(x, y)).not.toBe(0)
        expect(Math.sign(compareChanges(x, y))).toBe(-Math.sign(compareChanges(y, x)))
      }
    }
  })
})
