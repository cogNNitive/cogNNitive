import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Marker file that identifies the cogNNitive repo itself (not any repo that has scripts/). */
export const DEV_ROOT_MARKER = join('iNNfo', 'specs', 'bluepriNNts', 'console', 'artifact_shell.html')

/** The single shared console writer module name. */
export const EXPORT_MODULE = 'export-console.mjs'

/** Never open a browser when this is set (CI, headless runs, test suites). */
export const NO_OPEN_ENV = 'INNFO_CONSOLE_NO_OPEN'

export interface DevCheckoutOptions {
  /** Directory to walk up from. Defaults to this module's own location (tests override it). */
  startDir?: string
  /** Checkout-relative paths that must also exist for a directory to count as the checkout. */
  requires?: readonly string[]
}

/**
 * The cogNNitive dev checkout this module runs from, or null. Derived from the module's
 * own location, never from the domain path: the domain is untrusted input and whatever
 * is resolved from the checkout is imported (executed).
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

export interface ConsoleModuleOptions {
  env?: NodeJS.ProcessEnv
  home?: string
  devRoot?: string | null
}

/**
 * Locate `export-console.mjs` from trusted locations only: `$INNFO_CONSOLE_DIR`, the
 * installed set in `~/.agents/console`, then the cogNNitive dev checkout this module
 * itself lives in. Never from the domain or the working directory. Returns null when
 * none holds the module.
 *
 * One trusted-location policy, owned here and shared by the MCP and the engine
 * (capability console-regeneration; design D-C5; task 4a.8).
 */
export function resolveConsoleModulePath(opts: ConsoleModuleOptions = {}): string | null {
  const env = opts.env ?? process.env
  const candidates: string[] = []
  if (env.INNFO_CONSOLE_DIR) candidates.push(join(env.INNFO_CONSOLE_DIR, EXPORT_MODULE))
  const devRoot =
    opts.devRoot === undefined ? devCheckoutRoot({ requires: [join('scripts', EXPORT_MODULE)] }) : opts.devRoot
  if (devRoot && existsSync(join(devRoot, DEV_ROOT_MARKER))) candidates.push(join(devRoot, 'scripts', EXPORT_MODULE))
  candidates.push(join(opts.home ?? homedir(), '.agents', 'console', EXPORT_MODULE))
  return candidates.find((candidate) => existsSync(candidate)) ?? null
}
