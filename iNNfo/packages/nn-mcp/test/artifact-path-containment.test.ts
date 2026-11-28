import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { procedureRecord, procedureStart } from '../src/tools/procedure-record.js'
import { embedRunArtifacts } from '../../../../scripts/export-console.mjs'

/**
 * Every procedure artifact path (an `at` filled from run params, an agent-supplied `value`,
 * the `verify` fallback) stays a relative path inside the domain root and never names a
 * `*_NN.md` model. A violation is a typed refusal before anything is written or hashed.
 */

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

const PROCEDURE = `---
level: 3
parent_spec:
  name: "procedures_V_0-6-0"
  url: "https://example.invalid/procedures/spec_NN.md"
knowledge_version: "V_1-0-0"
title: "Contained"
slots:
  - { name: target, kind: value, required: true }
---

# NN Procedure

## NN Procedure: Contained
slug:: contained-proc

# NN Work

## NN Work: Generate
slug:: generate
step_type:: task
executor:: agent
next:: @review
output:: @deliverable

## NN Work: Review
slug:: review
step_type:: decision
executor:: human
decision:: Approve?
input:: @deliverable

# NN Artifact

## NN Artifact: Deliverable
slug:: deliverable
kind:: file
at:: {target}.md
required:: true
`

let root: string

type Result = { ok: boolean; code?: string; [key: string]: unknown }
function ok<T extends Result>(r: T): T {
  if (!r.ok) throw new Error(`expected ok, got ${r.code}: ${JSON.stringify(r)}`)
  return r
}

async function start(target: string): Promise<void> {
  ok(await procedureStart(root, { procedure: 'contained', params: { target }, run: 'c1' }))
  ok(await procedureRecord(root, { run: 'c1', action: 'start' }))
}

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'nn-artifact-paths-')))
  cpSync(FIXTURE, root, { recursive: true })
  mkdirSync(join(root, 'specs', 'bluepriNNts', 'executions'), { recursive: true })
  cpSync(EXECUTIONS_SPEC, join(root, 'specs', 'bluepriNNts', 'executions', 'spec_NN.md'))
  writeFileSync(join(root, 'procedures', 'contained_procedures_NN.md'), PROCEDURE, 'utf-8')
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

describe('procedure artifact paths stay inside the domain', () => {
  it('writes an output at a legitimate in-domain at', async () => {
    await start('reports/acme')
    const done = ok(
      await procedureRecord(root, {
        run: 'c1',
        action: 'complete',
        outputs: { deliverable: { text: '# ACME\n' } },
      }),
    )
    expect(readFileSync(join(root, 'reports', 'acme.md'), 'utf-8')).toBe('# ACME\n')
    expect(done.state.artifacts['deliverable']).toMatchObject({
      status: 'validated',
      value: 'reports/acme.md',
    })
  })

  it('refuses a ../ param substituted into at before writing anything', async () => {
    const escape = `escape-${randomUUID()}`
    await start(`../${escape}`)
    const res = await procedureRecord(root, {
      run: 'c1',
      action: 'complete',
      outputs: { deliverable: { text: 'pwned' } },
    })
    expect(res).toMatchObject({
      ok: false,
      code: 'ARTIFACT_PATH_OUTSIDE_DOMAIN',
      artifact: 'deliverable',
    })
    expect(existsSync(join(root, '..', `${escape}.md`))).toBe(false)
  })

  it('refuses a ../ at when recording the artifact without a value', async () => {
    await start('../../outside')
    const res = await procedureRecord(root, {
      run: 'c1',
      action: 'artifact',
      fact: 'validated',
      field: 'deliverable',
    })
    expect(res).toMatchObject({ ok: false, code: 'ARTIFACT_PATH_OUTSIDE_DOMAIN' })
  })

  it('refuses an at that targets a *_NN.md model and leaves the model untouched', async () => {
    const model = join(root, 'domaiNN_NN.md')
    const before = readFileSync(model, 'utf-8')
    await start('domaiNN_NN')
    const res = await procedureRecord(root, {
      run: 'c1',
      action: 'complete',
      outputs: { deliverable: { text: 'overwritten' } },
    })
    expect(res).toMatchObject({
      ok: false,
      code: 'ARTIFACT_PATH_IS_MODEL',
      artifact: 'deliverable',
      path: 'domaiNN_NN.md',
    })
    expect(readFileSync(model, 'utf-8')).toBe(before)
  })

  it('refuses an absolute value without hashing it, even one inside the root', async () => {
    await start('report')
    const inside = join(root, 'inside.md')
    writeFileSync(inside, 'x', 'utf-8')
    for (const value of [inside, join(tmpdir(), 'outside.md'), '/etc/hosts']) {
      const res = await procedureRecord(root, {
        run: 'c1',
        action: 'artifact',
        fact: 'validated',
        field: 'deliverable',
        value,
      })
      expect(res).toMatchObject({ ok: false, code: 'ARTIFACT_PATH_OUTSIDE_DOMAIN' })
      expect(res).not.toHaveProperty('actual')
    }
  })

  it('refuses a model value on record', async () => {
    await start('report')
    const res = await procedureRecord(root, {
      run: 'c1',
      action: 'artifact',
      fact: 'validated',
      field: 'deliverable',
      value: 'procedures/contained_procedures_NN.md',
    })
    expect(res).toMatchObject({ ok: false, code: 'ARTIFACT_PATH_IS_MODEL' })
  })

  it('the console export resolves value, then at, then verify, and never embeds a model', () => {
    writeFileSync(join(root, 'at-acme.md'), 'from at', 'utf-8')
    writeFileSync(join(root, 'verify-acme.md'), 'from verify', 'utf-8')
    const graph = {
      artifacts: {
        deliverable: { kind: 'file', at: 'at-{target}.md', verify: 'file:verify-{target}.md' },
        model: { kind: 'file', verify: 'file:domaiNN_NN.md' },
      },
    }
    const record = {
      id: 'c1',
      params: { target: 'acme' },
      artifacts: {
        deliverable: { kind: 'file', status: 'produced' },
        model: { kind: 'file', status: 'produced' },
      },
    }
    const embeds = embedRunArtifacts(root, graph, record)
    expect(embeds.deliverable).toMatchObject({ path: 'at-acme.md', text: 'from at' })
    expect(embeds.model).toMatchObject({ path: 'domaiNN_NN.md', omitted: 'missing' })
  })

  it('returns a typed error for a directory value instead of throwing EISDIR', async () => {
    await start('report')
    mkdirSync(join(root, 'adir'), { recursive: true })
    for (const fact of ['validated', 'produced']) {
      const res = await procedureRecord(root, {
        run: 'c1',
        action: 'artifact',
        fact,
        field: 'deliverable',
        value: 'adir',
        rev: 'abc',
      })
      expect(res).toMatchObject({ ok: false, code: 'ARTIFACT_PATH_NOT_A_FILE', path: 'adir' })
    }
  })
})
