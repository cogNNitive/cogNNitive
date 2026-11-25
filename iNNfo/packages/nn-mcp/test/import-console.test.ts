import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { cpSync, existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseChangeset } from '@cognnitive/nn-core'
import { procedureState } from '../src/tools/procedure-state.js'
import { procedureRecord, procedureStart } from '../src/tools/procedure-record.js'
import { procedurePending } from '../src/tools/procedure-pending.js'
import { importConsole } from '../src/tools/import-console.js'
import { dispatchTool, toolDefinitions } from '../src/server.js'

/**
 * `import_console`: the domain owner's agent turns a console HTML the recipient saved
 * ("Save Snapshot") into a changeset, applies it, consumes the Step Requests it carried and
 * starts the runs it asked for. The console here is a real export of the scratch domaiNN
 * (the shared `writeConsole`), with its `nn-drafts` slot filled the way Save Snapshot does.
 */

const SLOW = { timeout: 180_000 }

const REPO = join(import.meta.dirname!, '..', '..', '..', '..')
const FIXTURE = join(import.meta.dirname!, 'fixtures', 'procedure-runner')
const CONSOLE_DIR = join(REPO, 'iNNfo', 'specs', 'bluepriNNts', 'console')
const EXECUTIONS_SPEC = join(REPO, 'iNNfo', 'specs', 'bluepriNNts', 'executions', 'spec_NN.md')
const req = createRequire(import.meta.url)

const scratch: string[] = []
let root: string
/** A folder outside the domaiNN, where the recipient's saved file lands. */
let inbox: string

function makeDomain(prefix: string): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), prefix)))
  scratch.push(dir)
  cpSync(FIXTURE, dir, { recursive: true })
  mkdirSync(join(dir, 'specs', 'bluepriNNts', 'executions'), { recursive: true })
  cpSync(EXECUTIONS_SPEC, join(dir, 'specs', 'bluepriNNts', 'executions', 'spec_NN.md'))
  return dir
}

beforeEach(() => {
  root = makeDomain('nn-import-console-')
  inbox = realpathSync(mkdtempSync(join(tmpdir(), 'nn-import-inbox-')))
  scratch.push(inbox)
  process.env.INNFO_CACHE_DIR = join(root, '.cache')
  process.env.INNFO_GLOBAL_DIR = join(root, '.global')
  process.env.INNFO_SKILLS_DIR = join(root, '.skills')
  process.env.INNFO_CONSOLE_NO_OPEN = '1'
  vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
})

afterEach(() => {
  delete process.env.INNFO_CACHE_DIR
  delete process.env.INNFO_GLOBAL_DIR
  delete process.env.INNFO_SKILLS_DIR
  delete process.env.INNFO_CONSOLE_NO_OPEN
  vi.restoreAllMocks()
  for (const d of scratch.splice(0)) rmSync(d, { recursive: true, force: true })
})

type Result = { ok: boolean; code?: string; [key: string]: unknown }

function ok<T extends Result>(r: T): T {
  if (!r.ok) throw new Error(`expected ok, got ${r.code}: ${JSON.stringify(r)}`)
  return r
}

/** Every file of a folder with its content, for "writes nothing" checks. */
async function snapshot(dir: string, base = ''): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === '.cache' || e.name === '.global' || e.name === '.skills') continue
    const rel = base ? `${base}/${e.name}` : e.name
    if (e.isDirectory()) Object.assign(out, await snapshot(join(dir, e.name), rel))
    else out[rel] = await readFile(join(dir, e.name), 'utf-8')
  }
  return out
}

/** Exports the domain console of `domain` with the shared writer and returns its HTML. */
async function exportConsole(domain: string): Promise<string> {
  const mod = (await import(pathToFileURL(join(REPO, 'scripts', 'export-console.mjs')).href)) as {
    writeConsole: (o: Record<string, unknown>) => Promise<{ path: string }>
  }
  const written = await mod.writeConsole({ rootDir: domain, scope: 'domain', open: false })
  return readFile(written.path, 'utf-8')
}

/** What Save Snapshot leaves in the file: the drafts and UI state as plain JSON. */
function saveSnapshot(html: string, drafts: unknown[], reviewer: string | null): string {
  const slot = JSON.stringify({
    drafts,
    uiState: {
      activeTab: 'procedures',
      searchQuery: '',
      ...(reviewer ? { reviewer } : {}),
      savedAt: '2026-11-23T10:00:00.000Z',
    },
  }).replace(/</g, '\\u003c')
  return html.replace(
    /<script type="application\/json" id="nn-drafts">[\s\S]*?<\/script>/,
    () => `<script type="application/json" id="nn-drafts">${slot}</script>`,
  )
}

/** A Step Request draft exactly as the procedure stepper proposes it (`runRequest`). */
function requestDraft(id: string, run: string, name: string, fields: Record<string, unknown>) {
  return {
    id,
    element_id: '',
    concept: 'Step Request',
    element: name,
    base_hash: '',
    kind: 'new',
    created_at: '2026-11-23T09:59:00.000Z',
    knowledge_id: run,
    element_slug: name,
    proposed: JSON.stringify({ request_status: 'pending', ...fields }),
  }
}

const runStartDraft = (extra: Record<string, unknown> = {}) => ({
  id: 'fb-002',
  kind: 'run_start',
  procedure: 'review',
  params: { doc: 'guide' },
  run: 'r2',
  ...extra,
})

/** A domaiNN with run r1 started at its draft step, and the saved console carrying `drafts`. */
async function savedConsole(drafts: unknown[], reviewer: string | null = 'ana'): Promise<string> {
  ok(await procedureStart(root, { procedure: 'review', params: { doc: 'spec' }, run: 'r1' }))
  ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
  const html = saveSnapshot(await exportConsole(root), drafts, reviewer)
  const file = join(inbox, 'domaiNN_console (1).html')
  await writeFile(file, html, 'utf-8')
  return file
}

async function runSeq(run: string): Promise<number> {
  return ok(await procedureState(root, { run })).seq
}

describe('import_console', SLOW, () => {
  it('reads the domaiNN console itself when path is omitted', async () => {
    // A save writes the console file the person opened, in place, so the domain's own
    // console is the source: "the document is updated, import the changes" needs no path.
    const file = join(root, 'domaiNN_console.html')
    await writeFile(
      file,
      saveSnapshot(await exportConsole(root), [runStartDraft()], 'ana'),
      'utf-8',
    )

    const res = ok(await importConsole(root, {}))
    expect(res).toMatchObject({ applied: false, author: 'ana', drafts: 1, source: file })
    expect(res.would_start).toEqual([{ procedure: 'review', params: { doc: 'guide' }, run: 'r2' }])
  })

  it('names the console to pass when the domaiNN console is missing and no path was given', async () => {
    const res = await importConsole(root, {})
    expect(res.ok).toBe(false)
    expect(res.code).toBe('CONSOLE_NOT_FOUND')
    expect(res.detail).toContain('pass path')
  })

  it('without apply writes the console changeset to changes/ and reports the runs it would start', async () => {
    const file = await savedConsole([])
    const seq = await runSeq('r1')
    // Rewrite the saved file now that the seq is known.
    await writeFile(
      file,
      saveSnapshot(
        await readFile(file, 'utf-8'),
        [
          requestDraft('fb-001', 'r1', 'q-001', {
            action: 'complete',
            step: 'draft',
            base_seq: seq,
          }),
          runStartDraft(),
        ],
        'ana',
      ),
    )
    const before = await snapshot(join(root, 'executions'))

    const res = ok(await importConsole(root, { path: file }))
    expect(res).toMatchObject({ applied: false, author: 'ana', drafts: 2 })
    const changeset = res.changeset as string
    expect(changeset).toMatch(/^changes\/.+_ana_.+_changes_NN\.md$/)
    const text = await readFile(join(root, changeset), 'utf-8')
    const doc = parseChangeset(text)
    // The run request is not a change: only the Step Request row is.
    expect(doc.changes.map((c) => c.op)).toEqual(['add_element'])
    expect(doc.changes[0]!.target).toBe('r1@Step Request')

    // The same bytes the console's "Download changes" composes from the same slots.
    const html = await readFile(file, 'utf-8')
    const runtime = req(join(CONSOLE_DIR, 'nn-runtime.js')) as {
      composeSavedExport: (i: unknown) => {
        ok: boolean
        changesetText: string
        changesetFilename: string
      }
    }
    const { readConsoleModel } = (await import(
      pathToFileURL(join(REPO, 'scripts', 'export-console.mjs')).href
    )) as { readConsoleModel: (h: string) => { meta: unknown } }
    const slot = JSON.parse(
      /<script type="application\/json" id="nn-drafts">([\s\S]*?)<\/script>/.exec(html)![1]!,
    )
    const composed = runtime.composeSavedExport({
      meta: readConsoleModel(html).meta,
      drafts: slot.drafts,
      reviewer: 'ana',
      exportedAt: slot.uiState.savedAt,
    })
    expect(composed.ok).toBe(true)
    expect(text).toBe(composed.changesetText)
    expect(changeset).toBe(`changes/${composed.changesetFilename}`)

    // Nothing was applied or started.
    expect(res.would_start).toEqual([{ procedure: 'review', params: { doc: 'guide' }, run: 'r2' }])
    expect(res.requests).toEqual([])
    expect(res.runs_started).toEqual([])
    expect(await snapshot(join(root, 'executions'))).toEqual(before)
    expect(ok(await procedurePending(root, { run: 'r1' })).requests).toEqual([])
    expect(res.next_steps).toMatchObject({ approve: { tool: 'import_console' } })
  })

  it('with apply and consume applies the changeset, consumes the request and starts the run', async () => {
    const file = await savedConsole([])
    const seq = await runSeq('r1')
    await writeFile(
      file,
      saveSnapshot(
        await readFile(file, 'utf-8'),
        [
          requestDraft('fb-001', 'r1', 'q-001', {
            action: 'complete',
            step: 'draft',
            base_seq: seq,
          }),
          runStartDraft(),
        ],
        'ana',
      ),
    )

    const res = ok(await importConsole(root, { path: file, apply: true, consume: true }))
    expect(res).toMatchObject({ applied: true, applied_count: 1 })
    expect(res.requests).toEqual([
      expect.objectContaining({ run: 'r1', request: 'q-001', status: 'done' }),
    ])
    expect(res.runs_started).toEqual([
      expect.objectContaining({ procedure: 'review', run: 'r2', ok: true }),
    ])
    // The request was consumed: the step moved and the queue is empty.
    const r1 = ok(await procedureState(root, { run: 'r1' }))
    expect(r1.state.steps['draft']).toMatchObject({ status: 'done' })
    expect(ok(await procedurePending(root, { run: 'r1' }))).toMatchObject({ pending: 0 })
    // The run the person asked for exists, with the reviewer as its actor.
    const r2 = ok(await procedureState(root, { run: 'r2' }))
    expect(r2.params).toMatchObject({ doc: 'guide' })
    expect(existsSync(join(root, 'executions', 'r2'))).toBe(true)
    const csText = await readFile(join(root, res.changeset as string), 'utf-8')
    expect(csText).toMatch(/^status: applied$/m)
  })

  it('reports a request whose step moved since it was made as stale', async () => {
    const file = await savedConsole([])
    const seq = await runSeq('r1')
    await writeFile(
      file,
      saveSnapshot(
        await readFile(file, 'utf-8'),
        [
          requestDraft('fb-001', 'r1', 'q-001', {
            action: 'complete',
            step: 'draft',
            base_seq: seq,
          }),
        ],
        'ana',
      ),
    )
    // Someone completed the step by hand after the console was sent.
    ok(await procedureRecord(root, { run: 'r1', action: 'complete' }))

    const res = ok(await importConsole(root, { path: file, apply: true, consume: true }))
    expect(res.requests).toEqual([
      expect.objectContaining({ run: 'r1', request: 'q-001', status: 'stale' }),
    ])
    expect((await procedurePending(root, { run: 'r1' })) as Result).toMatchObject({ pending: 0 })
  })

  it('applies without consuming when consume is false: the request stays pending', async () => {
    const file = await savedConsole([])
    const seq = await runSeq('r1')
    await writeFile(
      file,
      saveSnapshot(
        await readFile(file, 'utf-8'),
        [
          requestDraft('fb-001', 'r1', 'q-001', {
            action: 'complete',
            step: 'draft',
            base_seq: seq,
          }),
        ],
        'ana',
      ),
    )
    const res = ok(await importConsole(root, { path: file, apply: true }))
    expect(res.requests).toEqual([])
    expect((await procedurePending(root, { run: 'r1' })) as Result).toMatchObject({ pending: 1 })
  })

  it('refuses a console of another domaiNN, writing nothing', async () => {
    const file = await savedConsole([runStartDraft()])
    const other = makeDomain('nn-import-other-')
    const before = await snapshot(other)
    expect(await importConsole(other, { path: file, apply: true })).toMatchObject({
      ok: false,
      code: 'DOMAIN_MISMATCH',
    })
    expect(await snapshot(other)).toEqual(before)
  })

  it('refuses a missing file, a page that is not a console, a missing reviewer, consume without apply and a malformed run request', async () => {
    const file = await savedConsole([runStartDraft()], null)
    const before = await snapshot(root)
    expect(await importConsole(root, { path: join(inbox, 'ghost.html') })).toMatchObject({
      ok: false,
      code: 'CONSOLE_NOT_FOUND',
    })
    const page = join(inbox, 'page.html')
    await writeFile(page, '<html><body>hello</body></html>')
    expect(await importConsole(root, { path: page })).toMatchObject({
      ok: false,
      code: 'NOT_A_CONSOLE',
    })
    expect(await importConsole(root, { path: file })).toMatchObject({
      ok: false,
      code: 'REVIEWER_REQUIRED',
    })
    expect(await importConsole(root, { path: file, consume: true, author: 'ana' })).toMatchObject({
      ok: false,
      code: 'INVALID_ARGUMENT',
    })
    await writeFile(
      file,
      saveSnapshot(await readFile(file, 'utf-8'), [runStartDraft({ procedure: '' })], 'ana'),
    )
    expect(await importConsole(root, { path: file, apply: true })).toMatchObject({
      ok: false,
      code: 'INVALID_DRAFT',
    })
    expect(await snapshot(root)).toEqual(before)
  })

  it('the author argument overrides the saved reviewer', async () => {
    const file = await savedConsole([runStartDraft()], 'ana')
    const res = ok(await importConsole(root, { path: file, author: 'luis', apply: true }))
    expect(res).toMatchObject({ author: 'luis' })
    // Only a run request: no changeset is written, the run is started.
    expect(res.changeset).toBeNull()
    expect(res.runs_started).toEqual([expect.objectContaining({ run: 'r2', ok: true })])
  })
})

describe('import_console over MCP', SLOW, () => {
  it('is registered with its schema and dispatches to the tool', async () => {
    const tool = toolDefinitions.find((t) => t.name === 'import_console')!
    expect(tool).toBeDefined()
    expect(tool.annotations?.readOnlyHint).toBe(false)
    expect(Object.keys(tool.inputSchema.properties as object).sort()).toEqual(
      ['apply', 'author', 'consume', 'domain', 'path', 'root'].sort(),
    )
    // `path` is optional: omitting it reads the domaiNN's own console (save in place).
    expect(tool.inputSchema.required).toBeUndefined()
    const res = await dispatchTool('import_console', {
      path: join(inbox, 'ghost.html'),
      domain: root,
    })
    expect(res.isError).toBe(true)
    expect(JSON.parse((res.content[0] as { text: string }).text)).toMatchObject({
      version: 'innfo-import-console@1',
      ok: false,
      code: 'CONSOLE_NOT_FOUND',
    })
  })
})

describe('console draft contract: run_start', () => {
  const review = req(join(CONSOLE_DIR, 'review.js')) as {
    createDraftStore: (
      s: unknown,
      id: string,
    ) => { addDraft: (d: unknown) => Record<string, unknown>; drafts: () => unknown[] }
  }
  const memory = () => {
    const map: Record<string, string> = {}
    return {
      getItem: (k: string) => map[k] ?? null,
      setItem: (k: string, v: string) => {
        map[k] = String(v)
      },
      removeItem: (k: string) => {
        delete map[k]
      },
    }
  }

  it('the draft store keeps a run_start draft with its procedure, params, run and path', () => {
    const store = review.createDraftStore(memory(), 'contract')
    const saved = store.addDraft({
      kind: 'run_start',
      procedure: 'procedures/review_procedures_NN.md',
      params: { doc: 'guide' },
      run: 'r2',
      path: 'clients/acme',
    })
    expect(saved).toMatchObject({
      kind: 'run_start',
      procedure: 'procedures/review_procedures_NN.md',
      params: { doc: 'guide' },
      run: 'r2',
      path: 'clients/acme',
    })
    expect(store.drafts()).toHaveLength(1)
  })

  it('the draft store refuses a run_start without procedure, with non-object params or a bad run slug', () => {
    const store = review.createDraftStore(memory(), 'contract')
    expect(() => store.addDraft({ kind: 'run_start', procedure: '' })).toThrow(/requires procedure/)
    expect(() => store.addDraft({ kind: 'run_start', procedure: 'review', params: 'x' })).toThrow(
      /params must be an object/,
    )
    expect(() =>
      store.addDraft({ kind: 'run_start', procedure: 'review', run: 'Bad Run' }),
    ).toThrow(/lowercase slug/)
    expect(store.drafts()).toHaveLength(0)
  })

  it('the console export emits no change for a run_start draft', () => {
    const runtime = req(join(CONSOLE_DIR, 'nn-runtime.js')) as {
      ITEM_KINDS: string[]
      composeSavedExport: (i: unknown) => { ok: boolean; changesetText: string }
    }
    expect(runtime.ITEM_KINDS).toContain('run_start')
    const composed = runtime.composeSavedExport({
      meta: { title: 't', modelId: 't', changesBlueprintVersion: 'V_0-15-0' },
      drafts: [runStartDraft()],
      reviewer: 'ana',
    })
    expect(composed.ok).toBe(true)
    expect(parseChangeset(composed.changesetText).changes).toEqual([])
  })
})
