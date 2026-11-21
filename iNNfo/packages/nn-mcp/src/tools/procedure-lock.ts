import { randomUUID } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * A `procedure_record` call is one read-plan-write window: it folds the run, decides the
 * fact the fold allows, and only then appends it. The apply lock (`changes/.lock`) makes
 * each *apply* atomic but says nothing about the fold that decided it, so two callers that
 * fold the same state both pass the check and both write. This lock makes the whole window
 * single-writer per run.
 *
 * The engine suffixe a colliding `add_element` slug (`e-005`, `e-005-1`, `parser/slug.ts`),
 * so a duplicated event name does NOT fail the apply: without this lock the duplicate lands.
 */

/** A holder that has been silent this long is presumed gone, once its pid is also gone. */
export const RUN_LOCK_STALE_MS = 120_000

/**
 * Upper bound for `timeout_ms` on `action=run`. A holder's window has to be bounded, or
 * "is this holder still working?" stops being decidable from the outside: without a cap,
 * a legitimate five-minute step is indistinguishable from a crashed process, and the
 * owner of the lock gets robbed mid-write.
 */
export const MAX_STEP_TIMEOUT_MS = 300_000

export interface RunLockHandle {
  path: string
  release: () => Promise<void>
}

/** `<root>/changes/.lock.procedure-<run>`; never `changes/.lock`, which `isLockFree` reads as the apply lock. */
export const runLockPath = (root: string, run: string): string =>
  join(root, 'changes', `.lock.procedure-${run}`)

interface StoredRunLock {
  pid?: unknown
  timestamp?: unknown
  nonce?: unknown
}

/**
 * Liveness probe for the recorded holder. `kill(pid, 0)` performs the existence/permission
 * check without sending a signal; `EPERM` means the process exists but is not ours, so it
 * counts as alive. A lock with a live holder is never broken, however old it looks: age is
 * only evidence against a holder we cannot probe.
 */
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
 * Releases the lock we acquired, and only that one. Comparing our nonce before unlinking is
 * what stops the stolen-lock cascade: without it, a holder that was robbed while still
 * running deletes its successor's file on the way out, and a third caller walks straight in.
 * The read-then-unlink is not atomic; the worst case is deleting nobody's lock, never
 * deleting somebody else's.
 */
const releaseOwned = (path: string, nonce: string): (() => Promise<void>) => {
  let released = false
  return async () => {
    if (released) return
    released = true
    try {
      const current = JSON.parse(await readFile(path, 'utf8')) as StoredRunLock
      if (current?.nonce !== nonce) return
    } catch {
      return
    }
    await unlink(path).catch(() => undefined)
  }
}

type StoredRead =
  { kind: 'ok'; value: StoredRunLock } | { kind: 'missing' } | { kind: 'unreadable' }

const readStored = async (path: string): Promise<StoredRead> => {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8')) as unknown
    return parsed !== null && typeof parsed === 'object'
      ? { kind: 'ok', value: parsed as StoredRunLock }
      : { kind: 'ok', value: {} }
  } catch (err: unknown) {
    return (err as { code?: string })?.code === 'ENOENT'
      ? { kind: 'missing' }
      : { kind: 'unreadable' }
  }
}

const busy = (run: string, path: string): Error => {
  const err = new Error(`RUN_BUSY: run "${run}" is being written by another caller (lock ${path})`)
  ;(err as { code?: string }).code = 'RUN_BUSY'
  return err
}

/**
 * Acquires the single-writer lock of one run. A live holder throws an error whose code is
 * `RUN_BUSY`; a holder that is gone, a payload that cannot name its holder, or a pid that a
 * later process reused past `staleMs + MAX_STEP_TIMEOUT_MS` is broken and re-acquired.
 */
export async function acquireRunLock(
  root: string,
  run: string,
  staleMs: number = RUN_LOCK_STALE_MS,
): Promise<RunLockHandle> {
  const path = runLockPath(root, run)
  await mkdir(join(root, 'changes'), { recursive: true })
  const nonce = randomUUID()
  const payload = JSON.stringify({
    pid: process.pid,
    timestamp: Date.now(),
    changeset: `procedure:${run}`,
    nonce,
  })
  const handle = (): RunLockHandle => ({ path, release: releaseOwned(path, nonce) })

  const tryCreate = async (): Promise<boolean> => {
    try {
      await writeFile(path, payload, { flag: 'wx' })
      return true
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === 'EEXIST') return false
      throw err
    }
  }

  if (await tryCreate()) return handle()

  let stored = await readStored(path)
  if (stored.kind === 'missing') {
    // The holder released between `tryCreate` and the read. Try once more; if a peer wins
    // that race, its payload is what the next read sees.
    if (await tryCreate()) return handle()
    stored = await readStored(path)
  }
  if (stored.kind === 'missing') throw busy(run, path)

  const value = stored.kind === 'ok' ? stored.value : null
  const age =
    value && typeof value.timestamp === 'number'
      ? Date.now() - value.timestamp
      : Number.POSITIVE_INFINITY
  const recyclable =
    value === null || // unreadable or non-object payload: a writer died mid-write
    typeof value.timestamp !== 'number' || // parseable but nameless: cannot be reasoned about
    !holderAlive(value.pid) || // the holder is gone
    age > staleMs + MAX_STEP_TIMEOUT_MS // pid reused by an unrelated process
  if (recyclable) {
    await unlink(path).catch(() => undefined)
    if (await tryCreate()) return handle()
  }

  throw busy(run, path)
}
