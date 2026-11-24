import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, isAbsolute, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createContext, runInContext } from 'node:vm'
import { resolveConsoleBundlePath, resolveConsoleModulePath } from '@cognnitive/nn-core'
import { applyChange } from './apply-change.js'
import { applyWithConsole } from './console-regeneration.js'
import type { RegenerateOptions } from './console-regeneration.js'
import { procedurePending } from './procedure-pending.js'
import { procedureRecord, procedureStart } from './procedure-record.js'
import { fail } from './procedure-state.js'
import type { ToolError } from './procedure-state.js'

/**
 * `import_console`: the domain owner's agent turns a console HTML the recipient saved
 * ("Save Snapshot") into what the console would have downloaded, then optionally applies it.
 *
 * The saved file carries two slots: `nn-model` (the payload, deflate-raw + base64) and
 * `nn-drafts` (`{ drafts, uiState }`, plain JSON). Nothing here maps a draft to a change: the
 * changeset is composed by the console runtime's own `composeSavedExport`, the function its
 * "Download changes" button runs, loaded from the TRUSTED console bundle (the installed set,
 * `$INNFO_CONSOLE_DIR` or the dev checkout) and never from the file being imported, whose
 * scripts are untrusted input. The payload codec and the domain identity come from the shared
 * `export-console.mjs`, the module that wrote the console in the first place.
 *
 * Drafts of kind `run_start` are not changes: they ask for a new procedure run, which this
 * tool starts through `procedure_start` (only with `apply`).
 *
 * Refusals write nothing: INVALID_ARGUMENT, CONSOLE_NOT_FOUND, NOT_A_CONSOLE,
 * DOMAIN_MISMATCH, REVIEWER_REQUIRED, INVALID_DRAFT, EXPORT_REFUSED, CHANGESET_EXISTS,
 * CONSOLE_ASSETS_NOT_FOUND. APPLY_FAILED reports an apply refusal after the changeset file
 * was written, exactly as apply_change leaves it.
 */

/** A draft asking the owner's agent to start a procedure run (console contract). */
export interface RunStartDraft {
  kind: 'run_start'
  id?: string
  /** Procedure id (e.g. `review`) or domain-relative procedure document path. */
  procedure: string
  /** Slot values, `slot name -> value`. */
  params?: Record<string, unknown>
  /** Optional run id, a lowercase slug. */
  run?: string
  /** Optional scope the procedure id is resolved from (default the domain root). */
  path?: string
}

export interface ConsumedRequest {
  run: string
  request: string
  /** What happened to the request: done, stale, rejected, or failed (still pending). */
  status: 'done' | 'stale' | 'rejected' | 'failed'
  code?: string
  detail?: string
}

export interface RunStartReport {
  procedure: string
  run?: string
  ok: boolean
  code?: string
  detail?: string
}

export interface ImportConsoleResult {
  ok: true
  /** The saved console that was read. */
  source: string
  domain_id: string
  author: string
  /** How many drafts the file carried (changes plus run requests). */
  drafts: number
  /** Domain-relative changeset path, or null when no draft is a model change. */
  changeset: string | null
  applied: boolean
  apply_status?: string
  applied_count?: number
  /** Step Requests consumed (apply + consume only). */
  requests: ConsumedRequest[]
  /** Runs the file asks for; started only with apply. */
  would_start: Array<Pick<RunStartDraft, 'procedure' | 'params' | 'run' | 'path'>>
  runs_started: RunStartReport[]
  console?: unknown
  manifest?: unknown
  next_steps: {
    notice: string
    console_path?: string
    approve?: { reply: 'OK'; tool: 'import_console'; args: Record<string, unknown> }
  }
}

export interface ImportConsoleOptions {
  /** Console asset resolution and regeneration (tests). */
  env?: NodeJS.ProcessEnv
  home?: string
  devRoot?: string | null
  regenerate?: RegenerateOptions
}

const DRAFTS_SLOT = /<script type="application\/json" id="nn-drafts">([\s\S]*?)<\/script>/
const RUN_SLUG = /^[a-z0-9][a-z0-9-]*$/
/** The console `writeConsole` puts at the domain root; the default import source. */
const DEFAULT_CONSOLE_FILE = 'domaiNN_console.html'
/** The console's placeholder reviewer: the export treats it as "no identifier". */
const DEFAULT_REVIEWER = 'reviewer'

type Json = Record<string, unknown>
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined

interface ExportConsoleModule {
  readConsoleModel: (html: string) => { meta?: Json } | null
  domainIdSourcePath: (root: string) => string
}

interface SavedExport {
  ok: boolean
  changesetText?: string
  changesetFilename?: string
  errors?: string[]
}

async function loadExportModule(opts: ImportConsoleOptions): Promise<ExportConsoleModule | null> {
  const modulePath = resolveConsoleModulePath(opts)
  if (!modulePath) return null
  const mod = (await import(pathToFileURL(modulePath).href)) as Partial<ExportConsoleModule>
  if (typeof mod.readConsoleModel !== 'function' || typeof mod.domainIdSourcePath !== 'function')
    return null
  return mod as ExportConsoleModule
}

/**
 * Runs the console's own `composeSavedExport` from the trusted bundle in a fresh context.
 * Values cross the context boundary as JSON, so the runtime sees plain objects of its realm.
 */
async function composeWithConsole(
  bundlePath: string,
  input: { meta: Json; drafts: unknown[]; reviewer: string; exportedAt?: string },
): Promise<SavedExport> {
  const source = await readFile(bundlePath, 'utf-8')
  const quiet = { log() {}, info() {}, warn() {}, error() {}, debug() {} }
  const sandbox: Json = { console: quiet, __input: JSON.stringify(input) }
  sandbox['self'] = sandbox
  createContext(sandbox)
  runInContext(source, sandbox, { filename: bundlePath })
  const out = runInContext(
    'JSON.stringify(nnConsole.composeSavedExport(JSON.parse(__input)))',
    sandbox,
  ) as string
  return JSON.parse(out) as SavedExport
}

/**
 * The draft-store key the console was exported under (`meta.domainId`), without the scope
 * suffix a scoped console appends. `writeConsole` derives it as
 * `<folder name>-<first 8 hex of sha256(domainIdSourcePath(root))>`; the path half comes
 * from the shared module, so a moved checkout of the same project keeps its identity.
 */
function domainIdOf(root: string, mod: ExportConsoleModule): string {
  const hash = createHash('sha256').update(mod.domainIdSourcePath(root), 'utf8').digest('hex')
  return `${basename(resolve(root))}-${hash.slice(0, 8)}`
}

function validateRunStart(d: Json): string | null {
  if (!text(d['procedure'])) return 'a run_start draft names its procedure'
  if (d['params'] !== undefined && d['params'] !== null && !isObject(d['params']))
    return 'run_start params must be an object of slot values'
  if (d['run'] !== undefined && d['run'] !== null && d['run'] !== '') {
    if (typeof d['run'] !== 'string' || !RUN_SLUG.test(d['run']))
      return 'run_start run must be a lowercase slug'
  }
  if (d['path'] !== undefined && d['path'] !== null && typeof d['path'] !== 'string')
    return 'run_start path must be a string'
  return null
}

const isStepRequest = (d: Json): boolean =>
  d['kind'] === 'new' && d['concept'] === 'Step Request' && !!text(d['knowledge_id'])

export async function importConsole(
  root: string,
  args: Record<string, unknown>,
  opts: ImportConsoleOptions = {},
): Promise<ImportConsoleResult | ToolError> {
  const given = text(args['path'])
  // Without a path the domaiNN's own console is the source: a console saved in place keeps
  // the path it was opened from, so "the document is updated, import the changes" needs no
  // argument. A console saved anywhere else still passes its path.
  const file = given
    ? isAbsolute(given)
      ? given
      : resolve(root, given)
    : join(root, DEFAULT_CONSOLE_FILE)
  if (!existsSync(file))
    return fail(
      'CONSOLE_NOT_FOUND',
      given
        ? `No file at ${file}.`
        : `No saved console at ${file}; pass path to the file the person saved.`,
    )
  const html = await readFile(file, 'utf-8')

  const apply = args['apply'] === true
  const consume = args['consume'] === true
  if (consume && !apply)
    return fail(
      'INVALID_ARGUMENT',
      'consume needs apply: a request is consumed after its row exists.',
    )

  const mod = await loadExportModule(opts)
  const bundlePath = resolveConsoleBundlePath(opts)
  if (!mod || !bundlePath)
    return fail(
      'CONSOLE_ASSETS_NOT_FOUND',
      'Console assets not found (export-console.mjs and nn-console.bundle.js in INNFO_CONSOLE_DIR, ~/.agents/console or the cogNNitive dev checkout).',
    )

  // 1. The file is a console of THIS domaiNN.
  const model = mod.readConsoleModel(html)
  const meta = model && isObject(model.meta) ? model.meta : null
  if (!meta) return fail('NOT_A_CONSOLE', `${file} has no readable nn-model slot.`)
  let slot: Json = {}
  const rawSlot = DRAFTS_SLOT.exec(html)?.[1]?.trim()
  if (rawSlot) {
    try {
      const parsed: unknown = JSON.parse(rawSlot)
      if (!isObject(parsed)) throw new Error('not an object')
      slot = parsed
    } catch {
      return fail('NOT_A_CONSOLE', `${file} holds a corrupt nn-drafts slot.`)
    }
  }
  const consoleDomain = String(meta['domainId'] ?? '').split('::')[0]!
  const domainId = domainIdOf(root, mod)
  if (!consoleDomain || consoleDomain.toLowerCase() !== domainId.toLowerCase())
    return fail(
      'DOMAIN_MISMATCH',
      consoleDomain
        ? `The console belongs to domaiNN "${consoleDomain}", not to "${domainId}".`
        : 'The console carries no domaiNN identity (meta.domainId).',
      { console_domain: consoleDomain || null, domain_id: domainId },
    )

  // 2. Who signs it, and what it carries.
  const uiState = isObject(slot['uiState']) ? slot['uiState'] : {}
  const author = text(args['author']) ?? text(uiState['reviewer'])
  if (!author || author === DEFAULT_REVIEWER)
    return fail(
      'REVIEWER_REQUIRED',
      'The saved console names no reviewer; pass author with the name of the person who sent it.',
    )
  const drafts = (Array.isArray(slot['drafts']) ? slot['drafts'] : []).filter(isObject)
  const runStarts: RunStartDraft[] = []
  const changeDrafts: Json[] = []
  for (const d of drafts) {
    if (d['kind'] !== 'run_start') {
      changeDrafts.push(d)
      continue
    }
    const problem = validateRunStart(d)
    if (problem)
      return fail('INVALID_DRAFT', `Draft "${String(d['id'] ?? '?')}": ${problem}.`, {
        draft: d['id'] ?? null,
      })
    runStarts.push({
      kind: 'run_start',
      procedure: text(d['procedure'])!,
      ...(isObject(d['params']) ? { params: d['params'] } : {}),
      ...(text(d['run']) ? { run: text(d['run'])! } : {}),
      ...(text(d['path']) ? { path: text(d['path'])! } : {}),
    })
  }
  const wouldStart = runStarts.map(({ procedure, params, run, path }) => ({
    procedure,
    ...(params ? { params } : {}),
    ...(run ? { run } : {}),
    ...(path ? { path } : {}),
  }))

  // 3. The changeset the console's "Download changes" composes from the same slots.
  let changeset: string | null = null
  let changesetText: string | null = null
  if (changeDrafts.length > 0) {
    const savedAt = text(uiState['savedAt'])
    const composed = await composeWithConsole(bundlePath, {
      meta,
      drafts: changeDrafts,
      reviewer: author,
      ...(savedAt ? { exportedAt: savedAt } : {}),
    })
    if (!composed.ok || !composed.changesetText || !composed.changesetFilename)
      return fail('EXPORT_REFUSED', 'The console refused to export these drafts.', {
        errors: composed.errors ?? [],
      })
    const name = composed.changesetFilename
    if (basename(name) !== name || !name.endsWith('_changes_NN.md'))
      return fail('EXPORT_REFUSED', `The console named an unexpected changeset file "${name}".`)
    changeset = `changes/${name}`
    changesetText = composed.changesetText
    const target = join(root, 'changes', name)
    // The same saved file composes the same bytes: a second import reuses the proposal. A
    // file that differs (it was applied, or someone edited it) is never overwritten.
    if (existsSync(target) && (await readFile(target, 'utf-8')) !== changesetText)
      return fail('CHANGESET_EXISTS', `${changeset} already exists with other content.`, {
        changeset,
      })
  }

  if (changeset && changesetText) {
    await mkdir(join(root, 'changes'), { recursive: true })
    const target = join(root, changeset)
    if (!existsSync(target)) await writeFile(target, changesetText, 'utf-8')
  }

  const base = {
    ok: true as const,
    source: file,
    domain_id: domainId,
    author,
    drafts: drafts.length,
    changeset,
    would_start: wouldStart,
  }

  if (!apply) {
    const lines = [
      changeset
        ? `The console changes were written to ${changeset} (not applied).`
        : 'The console carries no model change.',
      ...wouldStart.map(
        (r) => `It asks to start a run of "${r.procedure}"${r.run ? ` as ${r.run}` : ''}.`,
      ),
      'Reply OK to apply it, consume its step requests and start its runs.',
    ]
    return {
      ...base,
      applied: false,
      requests: [],
      runs_started: [],
      next_steps: {
        notice: lines.map((l, i) => `${i + 1}. ${l}`).join('\n'),
        approve: {
          reply: 'OK',
          tool: 'import_console',
          args: { path: file, apply: true, consume: true },
        },
      },
    }
  }

  // 4. Apply, consume, start: one console regeneration at the end, through the shared path.
  let applyStatus: string | undefined
  let appliedCount: number | undefined
  let applyFailure: ToolError | undefined
  const requests: ConsumedRequest[] = []
  const started: RunStartReport[] = []
  const outcome = await applyWithConsole(
    root,
    async () => {
      const createdModels: string[] = []
      if (changeset) {
        const applied = await applyChange(root, changeset)
        applyStatus = applied.status
        appliedCount = applied.appliedCount
        if (
          !applied.success ||
          (applied.status !== 'applied' && applied.status !== 'partially_applied')
        ) {
          applyFailure = fail('APPLY_FAILED', `${changeset} was not applied.`, {
            changeset,
            status: applied.status,
            errors: applied.errors ?? [],
          })
          return { success: false }
        }
        createdModels.push(...(applied.createdModels ?? []))
      }
      if (consume) {
        for (const d of changeDrafts.filter(isStepRequest)) {
          const run = text(d['knowledge_id'])!
          const request = text(d['element_slug']) ?? text(d['element']) ?? ''
          requests.push(await consumeRequest(root, run, request, author))
        }
      }
      for (const r of runStarts) {
        const res = await procedureStart(root, {
          procedure: r.procedure,
          params: r.params ?? {},
          ...(r.run ? { run: r.run } : {}),
          ...(r.path ? { path: r.path } : {}),
          actor: author,
        })
        if (res.ok) {
          started.push({ procedure: r.procedure, run: res.run, ok: true })
          createdModels.push(res.run)
        } else
          started.push({
            procedure: r.procedure,
            ...(r.run ? { run: r.run } : {}),
            ok: false,
            code: res.code,
            detail: res.detail,
          })
      }
      return { success: true, status: 'applied', createdModels }
    },
    opts.regenerate ?? {},
  )
  if (applyFailure) return applyFailure

  const consoleOutcome = outcome['console'] as { status?: string; path?: string; error?: string }
  const lines = [
    changeset
      ? `The console changes were applied: ${changeset}.`
      : 'The console carried no model change.',
    ...requests.map((r) => `Step request ${r.request} of ${r.run}: ${r.status}.`),
    ...started.map((s) =>
      s.ok
        ? `Run ${s.run} of "${s.procedure}" started.`
        : `Run of "${s.procedure}" not started: ${s.code}.`,
    ),
    consoleOutcome?.status === 'failed'
      ? `The domain console could not be regenerated (${consoleOutcome.error ?? 'unknown error'}); call regenerate_console to retry.`
      : `The domain console was regenerated (${consoleOutcome?.path ?? 'domaiNN_console.html'}).`,
  ]
  return {
    ...base,
    applied: true,
    ...(applyStatus ? { apply_status: applyStatus } : {}),
    ...(appliedCount !== undefined ? { applied_count: appliedCount } : {}),
    requests,
    runs_started: started,
    console: outcome['console'],
    ...(outcome['manifest'] ? { manifest: outcome['manifest'] } : {}),
    next_steps: {
      notice: lines.map((l, i) => `${i + 1}. ${l}`).join('\n'),
      ...(consoleOutcome?.path ? { console_path: consoleOutcome.path } : {}),
    },
  }
}

/** Consumes one request through procedure_record and reads back what became of it. */
async function consumeRequest(
  root: string,
  run: string,
  request: string,
  actor: string,
): Promise<ConsumedRequest> {
  const res = await procedureRecord(root, { run, request, actor })
  if (res.ok) return { run, request, status: 'done' }
  const queue = await procedurePending(root, { run })
  const row = queue.ok ? queue.requests.find((r) => r.id === request) : undefined
  const status = row?.status === 'stale' || row?.status === 'rejected' ? row.status : 'failed'
  return { run, request, status, code: res.code, detail: res.detail }
}
