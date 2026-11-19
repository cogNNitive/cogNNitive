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

/** A holder older than this is broken: a `run` step is bounded by its own `timeout_ms` (60s default). */
export const RUN_LOCK_STALE_MS = 120_000

export interface RunLockHandle {
  path: string
  release: () => Promise<void>
}

/** `<root>/changes/.lock.procedure-<run>`; never `changes/.lock`, which `isLockFree` reads as the apply lock. */
export const runLockPath = (root: string, run: string): string =>
  join(root, 'changes', `.lock.procedure-${run}`)

const releaseOnce = (path: string): (() => Promise<void>) => {
  let released = false
  return async () => {
    if (released) return
    released = true
    await unlink(path).catch(() => undefined)
  }
}

/**
 * Acquires the single-writer lock of one run. A live holder throws an error whose code is
 * `RUN_BUSY`; a holder past `staleMs` (or an unreadable payload) is broken and re-acquired,
 * exactly as `acquireLock` does for the apply lock.
 */
export async function acquireRunLock(
  root: string,
  run: string,
  staleMs: number = RUN_LOCK_STALE_MS,
): Promise<RunLockHandle> {
  const path = runLockPath(root, run)
  await mkdir(join(root, 'changes'), { recursive: true })
  const payload = JSON.stringify({
    pid: process.pid,
    timestamp: Date.now(),
    changeset: `procedure:${run}`,
  })

  const tryCreate = async (): Promise<boolean> => {
    try {
      await writeFile(path, payload, { flag: 'wx' })
      return true
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === 'EEXIST') return false
      throw err
    }
  }

  if (await tryCreate()) return { path, release: releaseOnce(path) }

  let existing: { timestamp?: number; pid?: number } | null = null
  let corrupt = false
  try {
    existing = JSON.parse(await readFile(path, 'utf8')) as { timestamp?: number; pid?: number }
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'ENOENT') {
      // The holder released between `tryCreate` and `readFile`: try once more.
      if (await tryCreate()) return { path, release: releaseOnce(path) }
    } else {
      corrupt = true
    }
  }

  const age = existing?.timestamp ? Date.now() - existing.timestamp : 0
  if (corrupt || age > staleMs) {
    await unlink(path).catch(() => undefined)
    if (await tryCreate()) return { path, release: releaseOnce(path) }
  }

  const err = new Error(
    `RUN_BUSY: run "${run}" is being written by another caller (lock ${path})`,
  )
  ;(err as { code?: string }).code = 'RUN_BUSY'
  throw err
}
