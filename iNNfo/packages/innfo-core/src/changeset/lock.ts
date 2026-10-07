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

  // Lock exists, check staleness
  try {
    const raw = await readFile(lockPath, 'utf8')
    const existing: LockPayload = JSON.parse(raw)
    const age = Date.now() - existing.timestamp

    if (age > timeoutMs) {
      console.warn(
        `[ChangesetLock] Breaking stale lock at ${lockPath} held by pid ${existing.pid} for changeset ${existing.changeset} (age: ${age}ms > ${timeoutMs}ms)`,
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
  } catch (readErr: unknown) {
    if ((readErr as { code?: string })?.code === 'ENOENT') {
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
