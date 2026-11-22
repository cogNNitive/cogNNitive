import { hostname } from 'node:os'
import type { StepRow } from './types.js'

/** The default timeout of one step attempt, when the procedure declares none. */
export const DEFAULT_STEP_TIMEOUT_MS = 60_000
/** The hard ceiling a step timeout may never exceed. */
export const MAX_STEP_TIMEOUT_MS = 300_000
/**
 * Extra slack before a claim is called stale when its pid cannot be probed (another host).
 * A step is given its own timeout plus this grace, never the fixed lock age.
 */
export const CRASH_GRACE_MS = 60_000

/** `pid@host`, the holder a claim records. */
export function holderOf(pid: number): string {
  return `${pid}@${hostname()}`
}

/** Whether a pid is alive on this host. `EPERM` means alive but not ours, so alive. */
function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === 'EPERM'
  }
}

export interface CrashProbeOptions {
  /** The clock, injected so the age fallback is testable. */
  now?: number
  /** Whether a pid is alive; defaults to a signal-0 probe. */
  alive?: (pid: number) => boolean
  /** The host this process runs on; defaults to `os.hostname()`. */
  host?: string
}

/**
 * Whether an `active` step row is crashed (design §3.3): its holder names this host and the
 * pid is gone, or the holder is another host (or names none) and the attempt outlived
 * `claimed_at + timeout_ms + grace`.
 *
 * Age alone is weaker than a pid probe — a legitimate slow step would be mistaken for a
 * crash — so the probe comes first and age is only the fallback.
 */
export function crashProbe(row: StepRow, opts: CrashProbeOptions = {}): boolean {
  const now = opts.now ?? Date.now()
  const host = opts.host ?? hostname()
  const alive = opts.alive ?? pidAlive
  const timeout = row.timeoutMs ?? DEFAULT_STEP_TIMEOUT_MS

  const holder = row.holder ?? ''
  const at = holder.lastIndexOf('@')
  const pid = at > 0 ? Number(holder.slice(0, at)) : Number.NaN
  const holderHost = at > 0 ? holder.slice(at + 1) : ''

  if (holderHost === host && Number.isInteger(pid) && pid > 0) {
    return !alive(pid)
  }

  // Another host, or a payload that cannot name a live probe: fall back to age.
  if (!row.claimedAt) return false
  const claimed = Date.parse(row.claimedAt)
  if (!Number.isFinite(claimed)) return false
  return now > claimed + timeout + CRASH_GRACE_MS
}
