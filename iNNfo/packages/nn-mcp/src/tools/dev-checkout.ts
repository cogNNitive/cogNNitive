import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Marker file that identifies the cogNNitive repo itself (not any repo that happens to have scripts/). */
export const DEV_ROOT_MARKER = join('iNNfo', 'specs', 'bluepriNNts', 'console', 'artifact_shell.html')

export interface DevCheckoutOptions {
  /** Directory to walk up from. Defaults to this module's own location (tests override it). */
  startDir?: string
  /** Checkout-relative paths that must also exist for a directory to count as the checkout. */
  requires?: readonly string[]
}

/**
 * The cogNNitive dev checkout this MCP module runs from, or null. Derived from the
 * module's own location, never from the domain path: the domain is untrusted input
 * and whatever is resolved from the checkout is imported (executed).
 */
export function devCheckoutRoot(opts: DevCheckoutOptions = {}): string | null {
  const requires = opts.requires ?? []
  let dir = opts.startDir ?? dirname(fileURLToPath(import.meta.url))
  for (;;) {
    if (existsSync(join(dir, DEV_ROOT_MARKER)) && requires.every((rel) => existsSync(join(dir, rel)))) return dir
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}
