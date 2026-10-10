import { writeFile, readFile, unlink, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { LockHandle, LockPayload } from './types.js'

/**
 * Acquires a single-writer filesystem lock at `<rootDir>/changes/.lock`.
 * If an active lock exists, throws CONCURRENT_APPLY_ACTIVE.
 * If a stale lock (> timeoutMs, default 60s) exists, breaks it safely with a warning and acquires.
 */
export async function acquireLock(
  rootDir: string,
  changesetName: string,
  timeoutMs: number = 60000,
): Promise<LockHandle> {
  const lockDir = join(rootDir, 'changes')
  await mkdir(lockDir, { recursive: true })
  const lockPath = join(lockDir, '.lock')

  const payload: LockPayload = {
    pid: process.pid,
    timestamp: Date.now(),
    changeset: changesetName,
  }

  const payloadStr = JSON.stringify(payload)

  const tryCreate = async (): Promise<boolean> => {
    try {
      await writeFile(lockPath, payloadStr, { flag: 'wx' })
      return true
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === 'EEXIST') {
        return false
      }
      throw err
    }
  }

  if (await tryCreate()) {
    return {
      lockPath,
      payload,
      release: async () => {
        try {
          await unlink(lockPath)
        } catch {
          // ignore if already deleted
        }
      },
    }
  }

  // Lock exists: read it to decide whether it is stale or corrupt.
  let existing: LockPayload | null = null
  let corrupt = false
  try {
    const raw = await readFile(lockPath, 'utf8')
    existing = JSON.parse(raw) as LockPayload
  } catch (readErr: unknown) {
    if ((readErr as { code?: string })?.code === 'ENOENT') {
      // Lock vanished between `tryCreate` and `readFile`: attempt to acquire.
      if (await tryCreate()) {
        return {
          lockPath,
          payload,
          release: async () => {
            await unlink(lockPath).catch(() => undefined)
          },
        }
      }
      // Another writer re-created it: fall through to the busy error below.
    } else {
      // A torn/corrupt `.lock` (e.g. a writer crashed mid-write) is unusable as a
      // concurrency gate; treat it as breakable rather than a permanent block.
      corrupt = true
    }
  }

  const age = existing ? Date.now() - existing.timestamp : 0
  if (corrupt || age > timeoutMs) {
    console.warn(
      corrupt
        ? `[ChangesetLock] Breaking corrupt lock at ${lockPath} (unreadable payload)`
        : `[ChangesetLock] Breaking stale lock at ${lockPath} held by pid ${existing!.pid} for changeset ${existing!.changeset} (age: ${age}ms > ${timeoutMs}ms)`,
    )
    try {
      await unlink(lockPath)
    } catch {
      // ignore if race-unlinked
    }
    if (await tryCreate()) {
      return {
        lockPath,
        payload,
        release: async () => {
          await unlink(lockPath).catch(() => undefined)
        },
      }
    }
  }

  const err = new Error(
    `CONCURRENT_APPLY_ACTIVE: Changeset apply lock is currently held at ${lockPath}`,
  )
  ;(err as { code?: string }).code = 'CONCURRENT_APPLY_ACTIVE'
  throw err
}

export async function releaseLock(handle: LockHandle): Promise<void> {
  await handle.release()
}
