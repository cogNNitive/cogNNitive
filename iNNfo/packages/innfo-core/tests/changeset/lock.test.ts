import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { acquireLock } from '../../src/changeset/lock.js'

describe('Single-Writer Lock Manager', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'lock-test-'))
    await mkdir(join(testDir, 'changes'), { recursive: true })
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  it('acquires exclusive lock at changes/.lock and unlinks on release', async () => {
    const handle = await acquireLock(testDir, 'changeset-01')
    expect(handle).toBeDefined()
    expect(handle.lockPath).toBe(join(testDir, 'changes', '.lock'))
    expect(handle.payload.changeset).toBe('changeset-01')
    expect(handle.payload.pid).toBe(process.pid)

    const content = await readFile(handle.lockPath, 'utf8')
    const parsed = JSON.parse(content)
    expect(parsed.changeset).toBe('changeset-01')

    await handle.release()
    await expect(readFile(handle.lockPath, 'utf8')).rejects.toThrow()
  })

  it('rejects concurrent lock acquisition with CONCURRENT_APPLY_ACTIVE', async () => {
    const handle1 = await acquireLock(testDir, 'changeset-01')

    await expect(acquireLock(testDir, 'changeset-02')).rejects.toThrow(
      /CONCURRENT_APPLY_ACTIVE/,
    )

    await handle1.release()

    // Can now acquire
    const handle2 = await acquireLock(testDir, 'changeset-02')
    expect(handle2.payload.changeset).toBe('changeset-02')
    await handle2.release()
  })

  it('recovers from stale lock older than 60 seconds with warning and successfully re-acquires', async () => {
    const lockPath = join(testDir, 'changes', '.lock')
    const stalePayload = {
      pid: 999999,
      timestamp: Date.now() - 70000, // 70s ago (> 60s)
      changeset: 'stale-changeset',
    }
    await writeFile(lockPath, JSON.stringify(stalePayload), 'utf8')

    // Should break stale lock and succeed
    const handle = await acquireLock(testDir, 'new-changeset', 60000)
    expect(handle.payload.changeset).toBe('new-changeset')

    const content = await readFile(lockPath, 'utf8')
    expect(JSON.parse(content).changeset).toBe('new-changeset')

    await handle.release()
  })

  it('guarantees lock release when executed in finally block', async () => {
    const lockPath = join(testDir, 'changes', '.lock')

    try {
      const handle = await acquireLock(testDir, 'tx-changeset')
      try {
        throw new Error('Transaction failure simulation')
      } finally {
        await handle.release()
      }
    } catch {
      // Expected error
    }

    await expect(readFile(lockPath, 'utf8')).rejects.toThrow()
  })

  it('recovers from a corrupt (torn) lock file instead of blocking forever', async () => {
    const lockPath = join(testDir, 'changes', '.lock')
    await writeFile(lockPath, '{ "pid": 123, "timestamp": ', 'utf8') // truncated JSON

    const handle = await acquireLock(testDir, 'new-changeset', 60000)
    expect(handle.payload.changeset).toBe('new-changeset')

    const content = await readFile(lockPath, 'utf8')
    expect(JSON.parse(content).changeset).toBe('new-changeset')

    await handle.release()
  })
})
