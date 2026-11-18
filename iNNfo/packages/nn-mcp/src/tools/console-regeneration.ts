import { readFile } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseChangeset, resolveConsoleModulePath } from '@cognnitive/nn-core'
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
  /**
   * `error` is a refused write: the target delivery console already exists and deliveries
   * are immutable, so nothing was written and `error` says why. `writeConsole` in
   * `scripts/export-console.mjs` is the only producer; its JSDoc states the same set.
   */
  status: 'written' | 'unchanged' | 'error'
  knowledgeVersions?: Record<string, { knowledge_version: string | null; sha256: string }>
  opened: boolean
  /** The console was already open in a tab inside the coalescing window; nothing was launched. */
  alreadyOpen?: boolean
  openError?: string
  /** Why the write was refused; set only with `status: "error"`. */
  error?: string
}

export type ConsoleWriter = (options: ConsoleWriterOptions) => Promise<ConsoleWriterResult>

/** Outcome of one regeneration, reported next to (never inside) a tool result. */
export interface ConsoleOutcome {
  status: 'written' | 'unchanged' | 'failed'
  path?: string
  opened?: boolean
  /** The console was already open in a tab; the browser was not launched again. */
  alreadyOpen?: boolean
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
  /** Open the console in a browser tab (default false: opening is explicit). */
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

/** Never open a browser when this is set (CI, headless runs, test suites). */
export const NO_OPEN_ENV = 'INNFO_CONSOLE_NO_OPEN'

/**
 * Locate `export-console.mjs` from trusted locations only. Owned by nn-core
 * (`console/locate-writer.ts`) and re-exported here for this package's tests
 * (design D-C5, task 4a.8).
 */
export { resolveConsoleModulePath }

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
  // Default: do NOT open. Every apply used to launch a browser tab, and each
  // domain console is heavy enough that the tabs piled up until the machine hit
  // memory pressure and every renderer burned a core. Opening is now explicit.
  const open = (opts.open ?? false) && env[NO_OPEN_ENV] !== '1'
  try {
    const writer = opts.writer ?? (await loadSharedWriter({ env, home: opts.home, devRoot: opts.devRoot }))
    const result = await writer({
      rootDir: root,
      scope: opts.scope ?? 'domain',
      open,
      ...(opts.launcher ? { launcher: opts.launcher } : {}),
    })
    if (result.status === 'error') {
      // A refused write is a blocked write, and this module reports those as `failed`.
      // This comparison is also the typecheck pin on the union: dropping "error" from
      // `ConsoleWriterResult.status` makes it a non-overlapping comparison, and returning
      // `result.status` unchanged makes it a non-assignable ConsoleOutcome status.
      return {
        status: 'failed',
        path: result.path,
        error: result.error ?? `the console writer refused to write ${result.path}`,
      }
    }
    return {
      status: result.status,
      path: result.path,
      opened: result.opened,
      ...(result.alreadyOpen ? { alreadyOpen: true } : {}),
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
  if (outcome.alreadyOpen) {
    return [
      regenerated,
      `It is already open in a browser tab; reload that tab to review ${what}. Opening it again would add a second copy of the same heavy document.`,
    ]
  }
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
  /** Ids of the models removed by `remove_model` changes in this apply. */
  removedModels?: string[]
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
  // A commit that created or removed models reconciles the domain manifest (a derived
  // index) first, so the regenerated console lists them and archives the removed ones.
  // A failure never alters the apply outcome.
  const affectedModels = [...(result.createdModels ?? []), ...(result.removedModels ?? [])]
  if (affectedModels.length > 0) {
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
