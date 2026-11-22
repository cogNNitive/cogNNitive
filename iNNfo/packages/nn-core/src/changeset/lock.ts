import { randomUUID } from 'node:crypto'
import { writeFile, readFile, unlink, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { LockHandle, LockPayload } from './types.js'

/**
 * Acquires a single-writer filesystem lock at `<rootDir>/changes/.lock`.
 * If an active lock exists, throws CONCURRENT_APPLY_ACTIVE.
 * If the holder is gone, or the payload cannot name it, the lock is broken and re-acquired.
 *
 * Two rules make the file an actual gate, and both were missing until 2026-11-21:
 *
 * - The payload carries a `nonce` and `release` unlinks only when the file still carries it.
 *   Unlinking by path lets a holder that lost the lock while still running delete its
 *   successor's file, and a third writer then walks in on a changeset nobody is serializing.
 * - A holder that is alive is never broken for age alone inside `timeoutMs * ORPHAN_MULTIPLIER`,
 *   because an apply can legitimately outlive the stale window on a large changeset. Past that
 *   multiple the pid belongs to another process, and the lock is orphaned.
 */

/**
 * How long past `timeoutMs` a lock held by a live process is still honoured before it is read
 * as a reused pid rather than a long apply.
 */
const ORPHAN_MULTIPLIER = 10

/** Liveness probe: `kill(pid, 0)` checks existence without signalling; EPERM means it exists. */
const holderAlive = (pid: unknown): boolean => {
  if (typeof pid !== 'number' || !Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    return (err as { code?: string })?.code === 'EPERM'
  }
}

/**
 * Releases the lock we acquired, and only that one. Comparing the nonce before unlinking is
 * what stops a stolen lock from cascading: without it, the robbed holder deletes its
 * successor's file and a third writer enters.
 */
const releaseOwned = (lockPath: string, nonce: string): (() => Promise<void>) => {
  let released = false
  return async () => {
    if (released) return
    released = true
    try {
      const current = JSON.parse(await readFile(lockPath, 'utf8')) as { nonce?: unknown }
      if (current?.nonce !== nonce) return
    } catch {
      return
    }
    await unlink(lockPath).catch(() => undefined)
  }
}

type StoredLock =
  { kind: 'ok'; value: Record<string, unknown> } | { kind: 'missing' } | { kind: 'unreadable' }

const readStored = async (lockPath: string): Promise<StoredLock> => {
  try {
    const parsed = JSON.parse(await readFile(lockPath, 'utf8')) as unknown
    return parsed !== null && typeof parsed === 'object'
      ? { kind: 'ok', value: parsed as Record<string, unknown> }
      : { kind: 'ok', value: {} }
  } catch (err: unknown) {
    return (err as { code?: string })?.code === 'ENOENT'
      ? { kind: 'missing' }
      : { kind: 'unreadable' }
  }
}

const busy = (lockPath: string): Error => {
  const err = new Error(
    `CONCURRENT_APPLY_ACTIVE: Changeset apply lock is currently held at ${lockPath}`,
  )
  ;(err as { code?: string }).code = 'CONCURRENT_APPLY_ACTIVE'
  return err
}

function warn(message: string): void {
  console.warn(`[ChangesetLock] ${message}`)
}

/**
 * @param rootDir repo/domain root; the lock lives in `<rootDir>/changes/.lock`
 * @param changesetName recorded in the payload, for the human reading a stuck lock
 * @param timeoutMs the stale window; unchanged for callers that pass one
 */
export async function acquireLock(
  rootDir: string,
  changesetName: string,
  timeoutMs: number = 60000,
): Promise<LockHandle> {
  const lockDir = join(rootDir, 'changes')
  await mkdir(lockDir, { recursive: true })
  const lockPath = join(lockDir, '.lock')

  const nonce = randomUUID()
  const payload: LockPayload = {
    pid: process.pid,
    timestamp: Date.now(),
    changeset: changesetName,
    nonce,
  }
  const payloadStr = JSON.stringify(payload)
  const handle = (): LockHandle => ({ lockPath, payload, release: releaseOwned(lockPath, nonce) })

  const tryCreate = async (): Promise<boolean> => {
    try {
      await writeFile(lockPath, payloadStr, { flag: 'wx' })
      return true
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === 'EEXIST') return false
      throw err
    }
  }

  if (await tryCreate()) return handle()

  let stored = await readStored(lockPath)
  if (stored.kind === 'missing') {
    // The holder released between `tryCreate` and the read: try once more, then look again
    // rather than unlinking blind, because a peer may have won the race.
    if (await tryCreate()) return handle()
    stored = await readStored(lockPath)
  }
  if (stored.kind === 'missing') throw busy(lockPath)

  const value = stored.kind === 'ok' ? stored.value : null
  const age =
    value && typeof value.timestamp === 'number'
      ? Date.now() - value.timestamp
      : Number.POSITIVE_INFINITY
  const alive = value !== null && holderAlive(value.pid)
  const breakable =
    value === null || // unreadable or non-object payload: a writer died mid-write
    typeof value.timestamp !== 'number' || // parseable but nameless: cannot be reasoned about
    !alive || // the holder is gone
    age > timeoutMs * ORPHAN_MULTIPLIER // the pid belongs to another process now
  if (breakable) {
    warn(
      alive
        ? `Breaking orphaned lock at ${lockPath} held by pid ${String(value?.pid)} for changeset ${String(value?.changeset)} (age: ${Math.round(age)}ms)`
        : `Breaking lock at ${lockPath} whose holder is gone (pid ${String(value?.pid)}, age: ${Math.round(age)}ms)`,
    )
    await unlink(lockPath).catch(() => undefined)
    if (await tryCreate()) return handle()
  }

  throw busy(lockPath)
}

export async function releaseLock(handle: LockHandle): Promise<void> {
  await handle.release()
}
