import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, isAbsolute, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createContext, runInContext } from 'node:vm'
import {
  procedureIdOf,
  resolveConsoleBundlePath,
  resolveConsoleModulePath,
} from '@cognnitive/nn-core'
import type { StepRequestRow } from '@cognnitive/nn-core'
import { applyChange } from './apply-change.js'
import { applyWithConsole } from './console-regeneration.js'
import type { RegenerateOptions } from './console-regeneration.js'
import { procedurePending } from './procedure-pending.js'
import { procedureRecord, procedureStart } from './procedure-record.js'
import { fail, foldStoredRun, readRun } from './procedure-state.js'
import type { ToolError } from './procedure-state.js'
import { isHandoffChoice } from './run-handoff.js'
import { checkHandoff, recordHandoff } from './run-handoff-record.js'
import type { HandoffChoice } from './run-handoff.js'

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
 * DOMAIN_MISMATCH, REVIEWER_REQUIRED, INVALID_DRAFT, REQUEST_CONFLICT, HANDOFF_CONFLICT, EXPORT_REFUSED, CHANGESET_EXISTS,
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
  /**
   * What happened to the request: done, stale, rejected, or failed (still pending). `duplicate`
   * means the run already held this very request from an earlier import: nothing was written
   * for it, and `row_status` is what became of the row.
   */
  status: 'done' | 'stale' | 'rejected' | 'failed' | 'duplicate'
  /** With `duplicate`: the status of the row the run already holds. */
  row_status?: StepRequestRow['status']
  code?: string
  detail?: string
}

export interface RunStartReport {
  procedure: string
  run?: string
  ok: boolean
  /** The run asked for by this very draft already existed from an earlier import. */
  already_started?: true
  code?: string
  detail?: string
}

/** A completed run's final handoff, as a saved console asks for it. */
export interface HandoffReport {
  run: string
  choice: HandoffChoice
  /**
   * recorded: this import wrote the choice. duplicate: the run already holds it. ready: it
   * would be recorded by an import with apply. refused: it cannot be recorded (see code).
   */
  status: 'recorded' | 'duplicate' | 'ready' | 'refused'
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
  /** How many Step Requests the runs already held from an earlier import (not written again). */
  duplicates: number
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
  /** The person's final choice per completed run; recorded only with apply. */
  handoffs: HandoffReport[]
  /**
   * Runs the consumed requests brought to their end (`canComplete`): closing a run is never a
   * request, so the agent records `finish`, and only then can the person choose the handoff.
   */
  ready_to_finish: string[]
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
  const derivedRuns = new Set<string>()
  const handoffAsks: Array<{ run: string; choice: HandoffChoice }> = []
  const changeDrafts: Json[] = []
  for (const d of drafts) {
    if (d['kind'] === 'run_handoff') {
      const run = text(d['run'])
      if (!run || !RUN_SLUG.test(run) || !isHandoffChoice(d['choice']))
        return fail(
          'INVALID_DRAFT',
          `Draft "${String(d['id'] ?? '?')}": a run_handoff draft names its run and a choice of administrator or agent.`,
          { draft: d['id'] ?? null },
        )
      // The same run asked twice in one file keeps the last choice, as the console does.
      const at = handoffAsks.findIndex((h) => h.run === run)
      if (at >= 0) handoffAsks.splice(at, 1)
      handoffAsks.push({ run, choice: d['choice'] })
      continue
    }
    if (d['kind'] !== 'run_start') {
      changeDrafts.push(d)
      continue
    }
    const problem = validateRunStart(d)
    if (problem)
      return fail('INVALID_DRAFT', `Draft "${String(d['id'] ?? '?')}": ${problem}.`, {
        draft: d['id'] ?? null,
      })
    const procedure = text(d['procedure'])!
    runStarts.push({
      kind: 'run_start',
      procedure,
      ...(isObject(d['params']) ? { params: d['params'] } : {}),
      ...(text(d['run']) ? { run: text(d['run'])! } : {}),
      ...(text(d['path']) ? { path: text(d['path'])! } : {}),
    })
    // A request that names no run gets one derived from the draft itself, so importing the
    // same saved file again finds the run it already started instead of starting another.
    const last = runStarts[runStarts.length - 1]!
    if (!last.run) derivedRuns.add((last.run = derivedRunId(procedure, d)))
  }
  const wouldStart = runStarts.map(({ procedure, params, run, path }) => ({
    procedure,
    ...(params ? { params } : {}),
    ...(run ? { run } : {}),
    ...(path ? { path } : {}),
  }))

  // 2b. Reconcile with what the runs already hold: a saved console keeps its drafts after they
  // were imported (the recipient's browser profile never forgets one), so the same request
  // comes back in every later save. Those are skipped; a name taken by a different request
  // refuses the whole import before anything is written.
  const reconciled = await reconcileRequests(root, changeDrafts)
  if (reconciled.conflicts.length > 0)
    return fail(
      'REQUEST_CONFLICT',
      `A Step Request of that name already exists with other content: ${reconciled.conflicts
        .map((c) => `${c.request} of ${c.run}`)
        .join(', ')}. Nothing was imported.`,
      { conflicts: reconciled.conflicts },
    )

  // 2c. The final handoff of a completed run: a run that was already handed off another way
  // refuses the whole import; one that is not completed (or not there) is refused alone.
  const handoffs: HandoffReport[] = []
  for (const h of handoffAsks) {
    const checked = await checkHandoff(root, h.run, h.choice)
    if (checked.ok) handoffs.push({ ...h, status: checked.recorded ? 'duplicate' : 'ready' })
    else if (checked.code === 'HANDOFF_CONFLICT')
      return fail('HANDOFF_CONFLICT', `${checked.detail} Nothing was imported.`, {
        run: h.run,
        recorded: checked['recorded'],
      })
    else handoffs.push({ ...h, status: 'refused', code: checked.code, detail: checked.detail })
  }
  const seen = new Set(reconciled.duplicates.map((d) => d.draft))
  const freshDrafts = changeDrafts.filter((d) => !seen.has(d))

  // 3. The changeset the console's "Download changes" composes from the same slots.
  let changeset: string | null = null
  let changesetText: string | null = null
  if (freshDrafts.length > 0) {
    const savedAt = text(uiState['savedAt'])
    const composed = await composeWithConsole(bundlePath, {
      meta,
      drafts: freshDrafts,
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
    duplicates: reconciled.duplicates.length,
    changeset,
    would_start: wouldStart,
  }
  const handoffNotes = (list: HandoffReport[]): string[] =>
    list.map((h) =>
      h.status === 'refused'
        ? `Run ${h.run} was not handed off: ${h.code}.`
        : h.status === 'duplicate'
          ? `Run ${h.run} was already handed off as "${h.choice}".`
          : h.status === 'ready'
            ? `It chooses to hand run ${h.run} off as "${h.choice}".`
            : `Run ${h.run} was handed off as "${h.choice}" (recorded with the run; nothing was added to the models).`,
    )
  const skipped =
    reconciled.duplicates.length > 0
      ? [
          `${reconciled.duplicates.length} Step Request(s) were already imported from an earlier save and are not written again.`,
        ]
      : []

  if (!apply) {
    const lines = [
      changeset
        ? `The console changes were written to ${changeset} (not applied).`
        : 'The console carries no new model change.',
      ...skipped,
      ...wouldStart.map(
        (r) => `It asks to start a run of "${r.procedure}"${r.run ? ` as ${r.run}` : ''}.`,
      ),
      ...handoffNotes(handoffs),
      'Reply OK to apply it, consume its step requests and start its runs.',
    ]
    return {
      ...base,
      applied: false,
      requests: [],
      runs_started: [],
      handoffs,
      ready_to_finish: [],
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
  const handed: HandoffReport[] = []
  const readyToFinish: string[] = []
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
        const held = new Map(reconciled.duplicates.map((d) => [d.draft, d]))
        for (const d of changeDrafts.filter(isStepRequest)) {
          const run = text(d['knowledge_id'])!
          const request = text(d['element_slug']) ?? text(d['element']) ?? ''
          const dup = held.get(d)
          // A request the run holds and nobody consumed yet (an earlier import skipped consume)
          // is consumed now; one that was already resolved stays as it is.
          if (dup && dup.rowStatus !== 'pending')
            requests.push({ run, request, status: 'duplicate', row_status: dup.rowStatus })
          else requests.push(await consumeRequest(root, run, request, author))
        }
        readyToFinish.push(...(await runsReadyToFinish(root, requests)))
      }
      for (const r of runStarts) {
        const res = await procedureStart(root, {
          procedure: r.procedure,
          params: r.params ?? {},
          ...(r.run ? { run: r.run } : {}),
          ...(r.path ? { path: r.path } : {}),
          actor: author,
        })
        if (!res.ok && res.code === 'RUN_EXISTS' && r.run && derivedRuns.has(r.run)) {
          // The run id was derived from this very draft: the run is the one it started before.
          if ((await readRun(root, r.run)).ok) {
            started.push({ procedure: r.procedure, run: r.run, ok: true, already_started: true })
            continue
          }
        }
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
      // The final choices come last: they record a decision about a run that is already complete.
      for (const h of handoffs) {
        if (h.status === 'refused') {
          handed.push(h)
          continue
        }
        const rec = await recordHandoff(root, h.run, h.choice, author)
        handed.push(
          rec.ok
            ? { run: h.run, choice: h.choice, status: rec.written ? 'recorded' : 'duplicate' }
            : { ...h, status: 'refused', code: rec.code, detail: rec.detail },
        )
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
      : 'The console carried no new model change.',
    ...skipped,
    ...requests.map((r) => `Step request ${r.request} of ${r.run}: ${r.status}.`),
    ...started.map((s) =>
      s.ok
        ? s.already_started
          ? `Run ${s.run} of "${s.procedure}" was already started by an earlier import.`
          : `Run ${s.run} of "${s.procedure}" started.`
        : `Run of "${s.procedure}" not started: ${s.code}.`,
    ),
    ...readyToFinish.map(
      (r) =>
        `Run ${r} reached its end: record procedure_record action=finish outcome=completed, then its person can choose the handoff in the regenerated console.`,
    ),
    ...handoffNotes(handed),
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
    handoffs: handed,
    ready_to_finish: readyToFinish,
    console: outcome['console'],
    ...(outcome['manifest'] ? { manifest: outcome['manifest'] } : {}),
    next_steps: {
      notice: lines.map((l, i) => `${i + 1}. ${l}`).join('\n'),
      ...(consoleOutcome?.path ? { console_path: consoleOutcome.path } : {}),
    },
  }
}

/**
 * The run id a `run_start` draft without one gets: the procedure's own id plus a short hash of
 * the draft (its store id and creation time, which the browser profile never repeats, with the
 * request itself). The same draft always names the same run.
 */
function derivedRunId(procedure: string, d: Json): string {
  const identity = JSON.stringify([
    d['id'] ?? null,
    d['created_at'] ?? null,
    procedure,
    d['params'] ?? null,
    d['path'] ?? null,
  ])
  const hash = createHash('sha256').update(identity, 'utf8').digest('hex').slice(0, 8)
  return `${procedureIdOf(procedure)}-${hash}`
}

interface HeldRequest {
  draft: Json
  rowStatus: StepRequestRow['status']
}

/**
 * Compares the Step Request drafts of a save with the rows their runs already hold. A draft
 * whose name exists with the same action, step, outcome, note and base_seq is the same
 * request imported before (`duplicates`); a name that exists with anything else is a
 * `conflict`. A run that does not exist is left to the ordinary import to report.
 */
async function reconcileRequests(
  root: string,
  drafts: Json[],
): Promise<{ duplicates: HeldRequest[]; conflicts: Array<{ run: string; request: string }> }> {
  const duplicates: HeldRequest[] = []
  const conflicts: Array<{ run: string; request: string }> = []
  const runs = new Map<string, Record<string, StepRequestRow> | null>()
  for (const d of drafts.filter(isStepRequest)) {
    const run = text(d['knowledge_id'])!
    const request = text(d['element_slug']) ?? text(d['element']) ?? ''
    if (!runs.has(run)) {
      const read = await readRun(root, run)
      runs.set(run, read.ok ? read.run.requests : null)
    }
    const row = runs.get(run)?.[request]
    if (!row) continue
    if (sameRequest(d, row)) duplicates.push({ draft: d, rowStatus: row.status })
    else conflicts.push({ run, request })
  }
  return { duplicates, conflicts }
}

function sameRequest(draft: Json, row: StepRequestRow): boolean {
  let fields: Json
  try {
    const parsed: unknown =
      typeof draft['proposed'] === 'string' ? JSON.parse(draft['proposed']) : draft['proposed']
    if (!isObject(parsed)) return false
    fields = parsed
  } catch {
    return false
  }
  const same = (a: unknown, b: unknown): boolean =>
    (a === undefined || a === null || a === '' ? undefined : String(a).trim()) ===
    (b === undefined || b === null || b === '' ? undefined : String(b).trim())
  return (
    same(fields['action'], row.action) &&
    same(fields['step'], row.step) &&
    same(fields['requested_outcome'], row.outcome) &&
    same(fields['requested_value'], row.value) &&
    sameOutputs(fields['requested_outputs'], row.outputs) &&
    same(fields['base_seq'], row.baseSeq)
  )
}

/**
 * Two `requested_outputs` are the same when they hold the same map. Both sides are JSON text
 * (the draft's one-line form, the row as the run model stores it), so each is parsed and
 * serialized again before comparing; text that does not parse is compared as written.
 */
function sameOutputs(draft: unknown, row: string | undefined): boolean {
  const canonical = (v: unknown): string | undefined => {
    if (v === undefined || v === null || v === '') return undefined
    if (typeof v !== 'string') return JSON.stringify(v)
    try {
      return JSON.stringify(JSON.parse(v))
    } catch {
      return v
    }
  }
  return canonical(draft) === canonical(row)
}

/** The runs a consumed request touched that are now open with nothing left to walk. */
async function runsReadyToFinish(root: string, requests: ConsumedRequest[]): Promise<string[]> {
  const runs = [...new Set(requests.filter((r) => r.status === 'done').map((r) => r.run))].sort()
  const ready: string[] = []
  for (const run of runs) {
    const read = await readRun(root, run)
    if (!read.ok || read.run.closed) continue
    const folded = await foldStoredRun(root, read.run)
    if (folded.ok && folded.folded.state.canComplete) ready.push(run)
  }
  return ready
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
