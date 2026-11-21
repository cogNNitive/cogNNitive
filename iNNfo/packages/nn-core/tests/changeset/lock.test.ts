import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawn } from 'node:child_process'
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { acquireLock } from '../../src/changeset/lock.js'

/** A pid that is certainly not running: a child that already exited. */
async function deadPid(): Promise<number> {
  const child = spawn(process.execPath, ['-e', 'process.exit(0)'], { stdio: 'ignore' })
  const pid = child.pid!
  await new Promise((resolve) => child.on('exit', resolve))
  return pid
}

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

  it('recovers from a lock whose holder is gone', async () => {
    const lockPath = join(testDir, 'changes', '.lock')
    const stalePayload = {
      pid: await deadPid(),
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

  it('does not rob a live holder that outlives the stale window', async () => {
    const lockPath = join(testDir, 'changes', '.lock')
    // Our own pid is alive, and the payload is older than timeoutMs but inside the orphan
    // window: a large changeset can legitimately take longer than 60s to apply.
    await writeFile(
      lockPath,
      JSON.stringify({
        pid: process.pid,
        timestamp: Date.now() - 70000,
        changeset: 'slow-but-alive',
        nonce: 'theirs',
      }),
      'utf8',
    )

    await expect(acquireLock(testDir, 'new-changeset', 60000)).rejects.toThrow(
      /CONCURRENT_APPLY_ACTIVE/,
    )
  })

  it('does not let a robbed holder delete the lock of its successor', async () => {
    const handle = await acquireLock(testDir, 'changeset-01')
    const lockPath = handle.lockPath
    // A successor now owns the file (different nonce, live pid). Releasing by path would hand
    // the domain to a third writer while the successor still believes it holds the lock.
    await writeFile(
      lockPath,
      JSON.stringify({
        pid: process.pid,
        timestamp: Date.now(),
        changeset: 'successor',
        nonce: 'successor',
      }),
      'utf8',
    )

    await handle.release()
    const content = await readFile(lockPath, 'utf8')
    expect(JSON.parse(content).changeset).toBe('successor')
  })

  it('breaks a payload that cannot name its holder instead of wedging forever', async () => {
    const lockPath = join(testDir, 'changes', '.lock')
    // Parses as JSON but carries no pid and no timestamp: age would be NaN and a `>` test
    // would be false forever, so the domain would never apply another changeset.
    await writeFile(lockPath, '{}', 'utf8')

    const handle = await acquireLock(testDir, 'new-changeset', 60000)
    expect(handle.payload.changeset).toBe('new-changeset')
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
