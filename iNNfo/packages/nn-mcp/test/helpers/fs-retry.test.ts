import { describe, it, expect } from 'vitest'
import { rmWithRetry, type RemoveDir } from './fs-retry'

const noDelay = async () => {}

function errWithCode(code: string): NodeJS.ErrnoException {
  const err = new Error(code) as NodeJS.ErrnoException
  err.code = code
  return err
}

describe('rmWithRetry', () => {
  it('retries a transient EBUSY then succeeds', async () => {
    let calls = 0
    const remove: RemoveDir = async () => {
      calls++
      if (calls < 3) throw errWithCode('EBUSY')
    }

    await rmWithRetry('irrelevant', 6, remove, noDelay)

    expect(calls).toBe(3)
  })

  it('retries EPERM and ENOTEMPTY too', async () => {
    const codes = ['EPERM', 'ENOTEMPTY']
    let calls = 0
    const remove: RemoveDir = async () => {
      const code = codes[calls]
      calls++
      if (code) throw errWithCode(code)
    }

    await rmWithRetry('irrelevant', 6, remove, noDelay)

    expect(calls).toBe(3)
  })

  it('rethrows a nontransient error without masking it', async () => {
    const remove: RemoveDir = async () => {
      throw errWithCode('ENOSPC')
    }

    await expect(rmWithRetry('irrelevant', 6, remove, noDelay)).rejects.toMatchObject({
      code: 'ENOSPC',
    })
  })
})
