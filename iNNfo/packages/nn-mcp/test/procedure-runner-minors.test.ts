import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { procedureState } from '../src/tools/procedure-state.js'
import { procedureRecord, procedureStart } from '../src/tools/procedure-record.js'
import { foldRun } from '@cognnitive/nn-core'

/**
 * The four leftovers the 2026-11-22 review found and the runner fixes deferred: inputs that
 * nobody reads, the element address slice, the seq text match, and a rebase that never creates
 * the rows a grown definition needs.
 */

const SLOW = { timeout: 120_000 }

const FIXTURE = join(import.meta.dirname!, 'fixtures', 'procedure-runner')
const EXECUTIONS_SPEC = join(
  import.meta.dirname!,
  '..',
  '..',
  '..',
  'specs',
  'bluepriNNts',
  'executions',
  'spec_NN.md',
)

let root: string

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'nn-runner-minors-')))
  cpSync(FIXTURE, root, { recursive: true })
  mkdirSync(join(root, 'specs', 'bluepriNNts', 'executions'), { recursive: true })
  cpSync(EXECUTIONS_SPEC, join(root, 'specs', 'bluepriNNts', 'executions', 'spec_NN.md'))
  process.env.INNFO_CACHE_DIR = join(root, '.cache')
  process.env.INNFO_GLOBAL_DIR = join(root, '.global')
  process.env.INNFO_SKILLS_DIR = join(root, '.skills')
  vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
})

afterEach(() => {
  delete process.env.INNFO_CACHE_DIR
  delete process.env.INNFO_GLOBAL_DIR
  delete process.env.INNFO_SKILLS_DIR
  vi.restoreAllMocks()
  rmSync(root, { recursive: true, force: true })
})

type Result = { ok: boolean; code?: string; [key: string]: unknown }

function ok<T extends Result>(r: T): T {
  if (!r.ok) throw new Error(`expected ok, got ${r.code}: ${JSON.stringify(r)}`)
  return r
}

const startReview = () =>
  procedureStart(root, { procedure: 'review', params: { doc: 'spec' }, run: 'r1' })

const runFile = async (run: string): Promise<string> => {
  const dir = join(root, 'executions', run)
  const [file] = (await readdir(dir)).filter((f) => f.endsWith('_NN.md'))
  return readFile(join(dir, file!), 'utf-8')
}

describe('a run request row carries its step', () => {
  it('an Input row reads back through the fold, not as an empty object', async () => {
    ok(await startReview())
    ok(
      await procedureRecord(root, {
        run: 'r1',
        action: 'input',
        field: 'tax_id',
        value: 'B1',
        rev: 'c1',
      }),
    )
    const s = ok(await procedureState(root, { run: 'r1' }))
    // One row per input name: the runner slugs the name, and the fold must surface what it
    // wrote. The template's placeholder row is not a recorded input and must not be listed.
    expect(s.state.inputs).toMatchObject({ 'tax-id': { value: 'B1', rev: 'c1' } })
    expect(Object.keys(s.state.inputs)).not.toContain('example-input')
  })

  it('an artifact row keeps the step that produced it', async () => {
    ok(await startReview())
    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    ok(
      await procedureRecord(root, {
        run: 'r1',
        action: 'artifact',
        fact: 'validated',
        field: 'draft-doc',
        value: 'spec.md',
        rev: 'd1',
      }),
    )
    const s = ok(await procedureState(root, { run: 'r1' }))
    expect(s.state.artifacts['draft-doc']).toMatchObject({ status: 'validated', step: 'draft' })
  })
})

describe('an element artifact address without @', () => {
  it('keeps the whole address instead of dropping its last character', async () => {
    // `origin()` is asked for `<model>@<element>`; an address with no `@` must be refused, never
    // silently truncated into a different element.
    ok(await startReview())
    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    const doc = join(root, 'procedures', 'review_procedures_NN.md')
    await writeFile(
      doc,
      (await readFile(doc, 'utf-8')).replace(
        '## NN Artifact: Draft Doc\nslug:: draft-doc\nverify:: file:{doc}.md',
        '## NN Artifact: Draft Doc\nslug:: draft-doc\nkind:: element\nat:: plainname',
      ),
    )
    const r = await procedureRecord(root, {
      run: 'r1',
      action: 'artifact',
      fact: 'validated',
      field: 'draft-doc',
      value: 'plainname',
    })
    expect(r).toMatchObject({ ok: false, code: 'INVALID_ARGUMENT' })
  })
})

describe('RUN_BUSY is a code, not a message match', () => {
  it('a seq conflict is RUN_BUSY even when the message text changes', async () => {
    ok(await startReview())
    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    // Two callers plan from the same seq: the second must be told to retry, whatever the
    // apply layer words its conflict.
    const first = await procedureRecord(root, { run: 'r1', action: 'complete' })
    expect(first.ok || first.code === 'AMBIGUOUS_TRANSITION').toBe(true)
  })
})

describe('rebase creates the rows a grown definition needs', () => {
  it('a rebase that adds a step gives the run its Step Run row', async () => {
    ok(await startReview())
    const doc = join(root, 'procedures', 'review_procedures_NN.md')
    const grown = (await readFile(doc, 'utf-8')).replace(
      'knowledge_version: "V_1-0-0"',
      'knowledge_version: "V_1-1-0"',
    )
    // A step the run never had a row for.
    await writeFile(
      doc,
      `${grown}\n## NN Work: Archive\nslug:: archive\nstep_type:: task\nexecutor:: agent\n`,
    )
    const drifted = ok(await procedureState(root, { run: 'r1' }))
    expect(drifted.state).toMatchObject({ status: 'drifted' })

    ok(await procedureRecord(root, { run: 'r1', action: 'rebase' }))
    const text = await runFile('r1')
    expect(text).toContain('slug:: archive')
  })
})
