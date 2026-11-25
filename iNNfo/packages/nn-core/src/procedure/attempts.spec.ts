import { describe, expect, it } from 'vitest'
import type { LoggedChange } from '../changelog/index.js'
import { runAttemptsOf } from './index.js'

let seq = 0
/** One logged field of a `set_fields`: `cs` and `index` identify the change it belongs to. */
const field = (
  target: string,
  to: string,
  over: Partial<LoggedChange> & { cs?: string } = {},
): LoggedChange => ({
  id: `c${seq++}`,
  changeset: over.cs ?? 'changes/a_changes_NN.md',
  index: 0,
  status: 'applied',
  changesetStatus: 'applied',
  op: 'update_field',
  target,
  to,
  applied: true,
  ...over,
})

describe('runAttemptsOf', () => {
  it('skips a change that never applied, so a lost claim is not an attempt', () => {
    const attempts = runAttemptsOf(
      [
        field('r1@draft&attempt', '1', { cs: 'changes/1_changes_NN.md', author: 'ana' }),
        field('r1@draft&attempt', '2', {
          cs: 'changes/2_changes_NN.md',
          applied: false,
          status: 'conflict',
        }),
      ],
      'r1',
      ['draft'],
    )
    expect(attempts).toEqual({ draft: [{ attempt: 1, inputs: {}, actor: 'ana' }] })
  })

  it('reads only its own run, never one whose id it is a prefix of', () => {
    const attempts = runAttemptsOf(
      [field('r10@draft&attempt', '1'), field('r1@draft&attempt', '1')],
      'r1',
      ['draft'],
    )
    expect(attempts.draft).toHaveLength(1)
  })

  it('ignores a malformed inputs value and an empty failure', () => {
    const cs = 'changes/3_changes_NN.md'
    const attempts = runAttemptsOf(
      [
        field('r1@draft&attempt', '1', { cs }),
        field('r1@draft&inputs', 'not json', { cs }),
        field('r1@draft&failure', '', { cs: 'changes/4_changes_NN.md' }),
      ],
      'r1',
      ['draft'],
    )
    expect(attempts).toEqual({ draft: [{ attempt: 1, inputs: {} }] })
  })
})
