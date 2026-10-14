import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseChangeset } from '@cognnitive/innfo-core'
import { syncDomainManifest } from './workspace-sync.js'

/**
 * Console regeneration for the MCP.
 *
 * The MCP never renders a console itself. It imports the one shared writer,
 * `writeConsole`, from `export-console.mjs` (the CLI module) and calls it, so the
 * CLI and the MCP always produce the same file at the same path. Every failure is
 * returned as data (`status: "failed"`), never thrown: a console problem must not
 * undo or hide an applied change.
 */

export type ConsoleScopeArg = 'domain' | { model: string }

/** Options the shared writer accepts (a subset of `writeConsole` in export-console.mjs). */
export interface ConsoleWriterOptions {
  rootDir: string
  scope: ConsoleScopeArg
  open: boolean
  launcher?: (command: string, args: string[]) => Promise<void> | void
}

export interface ConsoleWriterResult {
  path: string
  relativePath?: string
  status: 'written' | 'unchanged'
  knowledgeVersions?: Record<string, { knowledge_version: string | null; sha256: string }>
  opened: boolean
  openError?: string
}

export type ConsoleWriter = (options: ConsoleWriterOptions) => Promise<ConsoleWriterResult>

/** Outcome of one regeneration, reported next to (never inside) a tool result. */
export interface ConsoleOutcome {
  status: 'written' | 'unchanged' | 'failed'
  path?: string
  opened?: boolean
  openError?: string
  error?: string
  code?: string
  knowledgeVersions?: ConsoleWriterResult['knowledgeVersions']
}

export interface NextSteps {
  /** Text the agent MUST relay to the user. */
  notice: string
  console_path?: string
  opened: boolean
  /** Proposals only: the reply that approves, and what the agent then calls. */
  approve?: { reply: 'OK'; tool: 'apply_change'; changeset: string }
}

export interface RegenerateOptions {
  scope?: ConsoleScopeArg
  /** Open the console in a browser tab (default true). */
  open?: boolean
  launcher?: ConsoleWriterOptions['launcher']
  /** Injected writer (tests). Defaults to the shared `writeConsole`. */
  writer?: ConsoleWriter
  /** Environment used to locate the console assets (tests). */
  env?: NodeJS.ProcessEnv
  /** Home directory used to locate installed assets (tests). */
  home?: string
  /** Dev checkout root holding the console assets (tests). `null` disables the dev fallback. */
  devRoot?: string | null
  /** Injected manifest reconciler (tests). Defaults to `sync_domain_manifest` (non-dry). */
  syncManifest?: (root: string, options: { dry_run: boolean }) => Promise<unknown>
}

const EXPORT_MODULE = 'export-console.mjs'

/** Never open a browser when this is set (CI, headless runs, test suites). */
export const NO_OPEN_ENV = 'INNFO_CONSOLE_NO_OPEN'

/** Marker file that identifies the cogNNitive repo itself (not any repo that happens to have scripts/). */
const DEV_ROOT_MARKER = join('iNNfo', 'specs', 'bluepriNNts', 'console', 'artifact_shell.html')

/**
 * The cogNNitive dev checkout this MCP module runs from, or null. Derived from the
 * module's own location, never from the domain path: the domain is untrusted input
 * and `export-console.mjs` is imported (executed) once resolved.
 */
function devCheckoutRoot(): string | null {
  let dir = dirname(fileURLToPath(import.meta.url))
  for (;;) {
    if (existsSync(join(dir, DEV_ROOT_MARKER)) && existsSync(join(dir, 'scripts', EXPORT_MODULE))) return dir
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

/**
 * Locate `export-console.mjs` from trusted locations only: `$INNFO_CONSOLE_DIR`, the
 * installed set in `~/.agents/console`, then the cogNNitive dev checkout this module
 * itself lives in. Never from the domain or the working directory. Returns null when
 * none holds the module.
 */
export function resolveConsoleModulePath(
  opts: { env?: NodeJS.ProcessEnv; home?: string; devRoot?: string | null } = {},
): string | null {
  const env = opts.env ?? process.env
  const candidates: string[] = []
  if (env.INNFO_CONSOLE_DIR) candidates.push(join(env.INNFO_CONSOLE_DIR, EXPORT_MODULE))
  const devRoot = opts.devRoot === undefined ? devCheckoutRoot() : opts.devRoot
  if (devRoot && existsSync(join(devRoot, DEV_ROOT_MARKER))) candidates.push(join(devRoot, 'scripts', EXPORT_MODULE))
  candidates.push(join(opts.home ?? homedir(), '.agents', 'console', EXPORT_MODULE))
  return candidates.find((candidate) => existsSync(candidate)) ?? null
}

class ConsoleAssetsNotFoundError extends Error {
  readonly code = 'CONSOLE_ASSETS_NOT_FOUND'
}

/** The shared writer, imported from the resolved console asset directory. */
async function loadSharedWriter(
  opts: { env?: NodeJS.ProcessEnv; home?: string; devRoot?: string | null },
): Promise<ConsoleWriter> {
  const modulePath = resolveConsoleModulePath(opts)
  if (!modulePath) {
    throw new ConsoleAssetsNotFoundError(
      'Console assets not found: no export-console.mjs in INNFO_CONSOLE_DIR, ~/.agents/console or the cogNNitive dev checkout. ' +
        'Install the console assets or set INNFO_CONSOLE_DIR.',
    )
  }
  const mod = (await import(pathToFileURL(modulePath).href)) as {
    writeConsole?: (options: Record<string, unknown>) => Promise<ConsoleWriterResult>
  }
  if (typeof mod.writeConsole !== 'function') {
    throw new ConsoleAssetsNotFoundError(`${modulePath} does not export writeConsole; update the console assets.`)
  }
  const writeConsole = mod.writeConsole
  return (options) => writeConsole({ ...options, log: () => {} })
}

/**
 * Regenerate the domain console (or one model-scoped console). Never throws:
 * missing assets, a render error or a blocked write become `status: "failed"`.
 */
export async function regenerateConsole(root: string, opts: RegenerateOptions = {}): Promise<ConsoleOutcome> {
  const env = opts.env ?? process.env
  const open = (opts.open ?? true) && env[NO_OPEN_ENV] !== '1'
  try {
    const writer = opts.writer ?? (await loadSharedWriter({ env, home: opts.home, devRoot: opts.devRoot }))
    const result = await writer({
      rootDir: root,
      scope: opts.scope ?? 'domain',
      open,
      ...(opts.launcher ? { launcher: opts.launcher } : {}),
    })
    return {
      status: result.status,
      path: result.path,
      opened: result.opened,
      ...(result.openError ? { openError: result.openError } : {}),
      ...(result.knowledgeVersions ? { knowledgeVersions: result.knowledgeVersions } : {}),
    }
  } catch (err) {
    const e = err as { message?: string; code?: unknown }
    return {
      status: 'failed',
      error: String(e?.message ?? err),
      ...(typeof e?.code === 'string' ? { code: e.code } : {}),
    }
  }
}

export type NextStepsKind = 'proposal' | 'apply' | 'regenerate'

export interface NextStepsInput {
  console: ConsoleOutcome
  /** Workspace-relative changeset path (proposal and apply). */
  changeset?: string
  /** Ids of conflicted changes (apply with partially_applied). */
  conflicted?: string[]
}

function consoleStep(outcome: ConsoleOutcome, what: string): string[] {
  if (outcome.status === 'failed') {
    return [
      `The domain console could not be regenerated (${outcome.error ?? 'unknown error'}); ` +
        'call regenerate_console to retry once the cause is fixed.',
    ]
  }
  const regenerated =
    outcome.status === 'unchanged'
      ? `The domain console was already up to date (${outcome.path}).`
      : `The domain console was regenerated (${outcome.path}).`
  if (outcome.opened) return [regenerated, `It was opened in a browser tab, where you can review ${what}.`]
  return [regenerated, `Open ${outcome.path} in a browser to review ${what}.`]
}

/**
 * The structured relay contract carried by every result that regenerated (or tried
 * to regenerate) a console. The agent MUST relay `notice` to the user. The console
 * is static HTML and cannot call the MCP, so approval always returns through the agent.
 */
export function buildNextSteps(kind: NextStepsKind, input: NextStepsInput): NextSteps {
  const { console: outcome, changeset, conflicted } = input
  const failed = outcome.status === 'failed'
  const parts: string[] = []

  if (kind === 'proposal') {
    parts.push(`The changeset was generated: ${changeset}.`)
    parts.push(...consoleStep(outcome, 'the proposed changes'))
    if (failed) parts.push(`Review the proposed changes in the changeset file ${changeset} instead.`)
    parts.push('If you trust the changes you may skip the review and simply reply OK to apply them.')
  } else if (kind === 'apply') {
    parts.push(`The changeset was applied: ${changeset}.`)
    if (conflicted && conflicted.length > 0) {
      parts.push(`These changes conflicted and were not applied: ${conflicted.join(', ')}.`)
    }
    parts.push(...consoleStep(outcome, 'the applied changes'))
  } else {
    parts.push(...consoleStep(outcome, 'the domain'))
  }

  const notice = parts.map((part, index) => `${index + 1}. ${part}`).join('\n')
  const steps: NextSteps = {
    notice,
    ...(outcome.path ? { console_path: outcome.path } : {}),
    opened: outcome.opened === true,
  }
  if (kind === 'proposal' && changeset) {
    steps.approve = { reply: 'OK', tool: 'apply_change', changeset }
  }
  return steps
}

/** Ids of the changes a partially applied changeset left conflicted. */
async function conflictedChangeIds(root: string, changesetPath: string): Promise<string[]> {
  try {
    const absolute = isAbsolute(changesetPath) ? changesetPath : resolve(root, changesetPath)
    const doc = parseChangeset(await readFile(absolute, 'utf-8'))
    return doc.changes.filter((change) => change.status === 'conflict').map((change) => change.id)
  } catch {
    return []
  }
}

export interface ApplyOutcomeLike {
  success: boolean
  status?: string
  changesetPath?: string
  changeset?: string
  /** Ids of the models created by `add_model` changes in this apply. */
  createdModels?: string[]
}

/**
 * Run an apply, then reconcile the manifest (if models were created) and regenerate
 * the console. Both happen AFTER the apply
 * returned, so the apply has committed and `changes/.lock` is already released. It runs
 * for `applied` and `partially_applied` (including an idempotent replay) and never for
 * `conflict` or `rejected`. Its outcome is a separate `console` field: it can never change
 * `success`, `status`, `models` or `appliedCount`.
 */
export async function applyWithConsole<T extends ApplyOutcomeLike>(
  root: string,
  run: () => Promise<T>,
  opts: RegenerateOptions = {},
): Promise<Record<string, unknown>> {
  const result = await run()
  const payload: Record<string, unknown> = { ...(result as ApplyOutcomeLike) }
  if (!result.success || (result.status !== 'applied' && result.status !== 'partially_applied')) {
    return payload
  }
  // A commit that created models reconciles the domain manifest (a derived index) first,
  // so the regenerated console lists them. A failure never alters the apply outcome.
  if (result.createdModels && result.createdModels.length > 0) {
    try {
      payload.manifest = await (opts.syncManifest ?? syncDomainManifest)(root, { dry_run: false })
    } catch (err) {
      payload.manifest = { error: err instanceof Error ? err.message : String(err), written: false }
    }
  }
  const outcome = await regenerateConsole(root, opts)
  const changeset = result.changeset ?? result.changesetPath
  const conflicted =
    result.status === 'partially_applied' && changeset ? await conflictedChangeIds(root, changeset) : []
  payload.console = outcome
  payload.next_steps = buildNextSteps('apply', { console: outcome, changeset, conflicted })
  return payload
}
