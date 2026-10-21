import { rm } from 'node:fs/promises'

/** Minimal shape of the remover, injectable as a test seam. */
export type RemoveDir = (
  dir: string,
  options: { recursive: boolean; force: boolean },
) => Promise<void>

const RETRYABLE_CODES = new Set(['EBUSY', 'EPERM', 'ENOTEMPTY'])

/**
 * Removes a directory tree, retrying transient Windows lock errors
 * (EBUSY / EPERM / ENOTEMPTY). Any other filesystem error is rethrown unmasked
 * so a real cleanup failure still fails the test instead of being swallowed.
 *
 * Shared by the innfo-mcp specs; do not reintroduce a local retry loop.
 */
export async function rmWithRetry(
  dir: string,
  attempts = 6,
  remove: RemoveDir = rm,
  delay: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      await remove(dir, { recursive: true, force: true })
      return
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code
      if (!code || !RETRYABLE_CODES.has(code)) throw err
      await delay(30 * (i + 1))
    }
  }
  // Attempts exhausted: let any remaining error surface unmasked.
  await remove(dir, { recursive: true, force: true })
}
