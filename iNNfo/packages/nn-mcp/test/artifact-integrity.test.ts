import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { procedureRecord, procedureStart } from '../src/tools/procedure-record.js'
import { procedureState } from '../src/tools/procedure-state.js'
import { embedRunArtifacts } from '../../../../scripts/export-console.mjs'

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

type Result = { ok: boolean; code?: string; [key: string]: unknown }
function ok<T extends Result>(r: T): T {
  if (!r.ok) throw new Error(`expected ok, got ${r.code}: ${JSON.stringify(r)}`)
  return r
}

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'nn-artifact-integrity-')))
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

describe('artifact integrity checks', () => {
  it('Case 1: refuses invented sha with REV_MISMATCH when file exists on disk', async () => {
    // review procedure: draft-doc verifies file:{doc}.md. With doc: "spec", file is spec.md
    const realContent = '# Real Spec Document\n'
    writeFileSync(join(root, 'spec.md'), realContent, 'utf-8')
    const realSha = createHash('sha256').update(realContent).digest('hex')

    ok(await procedureStart(root, { procedure: 'review', params: { doc: 'spec' }, run: 'r1' }))
    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))

    // Calling artifact with an invented rev returns REV_MISMATCH
    const res = await procedureRecord(root, {
      run: 'r1',
      action: 'artifact',
      fact: 'validated',
      field: 'draft-doc',
      value: 'spec.md',
      rev: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    })
    expect(res).toMatchObject({
      ok: false,
      code: 'REV_MISMATCH',
      artifact: 'draft-doc',
      path: 'spec.md',
    })

    // Passing the actual sha succeeds and records the actual rev
    const okRes = ok(
      await procedureRecord(root, {
        run: 'r1',
        action: 'artifact',
        fact: 'validated',
        field: 'draft-doc',
        value: 'spec.md',
        rev: realSha,
      }),
    )
    expect(okRes.state.artifacts['draft-doc']).toMatchObject({
      status: 'validated',
      rev: realSha,
      value: 'spec.md',
    })
  })

  it('Case 2: refuses non-existent file with FILE_NOT_FOUND in action=artifact and action=complete', async () => {
    // gated procedure requires draft-doc (file:{doc}.md)
    ok(await procedureStart(root, { procedure: 'gated', params: { doc: 'missing' }, run: 'g1' }))
    ok(await procedureRecord(root, { run: 'g1', action: 'start' }))

    // 1. action=artifact with non-existent file returns FILE_NOT_FOUND
    const artRes = await procedureRecord(root, {
      run: 'g1',
      action: 'artifact',
      fact: 'validated',
      field: 'draft-doc',
      value: 'missing.md',
    })
    expect(artRes).toMatchObject({
      ok: false,
      code: 'FILE_NOT_FOUND',
      artifact: 'draft-doc',
      path: 'missing.md',
    })

    // Also when rev is supplied for non-existent file
    const artResWithRev = await procedureRecord(root, {
      run: 'g1',
      action: 'artifact',
      fact: 'validated',
      field: 'draft-doc',
      value: 'missing.md',
      rev: 'abc123',
    })
    expect(artResWithRev).toMatchObject({
      ok: false,
      code: 'FILE_NOT_FOUND',
    })

    // 2. action=complete when required artifact references a non-existent file returns FILE_NOT_FOUND
    const compRes = await procedureRecord(root, {
      run: 'g1',
      action: 'complete',
      artifacts: [{ fact: 'validated', field: 'draft-doc', value: 'missing.md' }],
    })
    expect(compRes).toMatchObject({
      ok: false,
      code: 'FILE_NOT_FOUND',
      artifact: 'draft-doc',
      path: 'missing.md',
    })
  })

  it('Case 3: declared at path written with matching sha is verified by runner and export-console', async () => {
    const procContent = `---
level: 3
parent_spec:
  name: "procedures_V_0-6-0"
  url: "https://example.invalid/procedures/spec_NN.md"
knowledge_version: "V_1-0-0"
title: "DeclaredAt"
slots:
  - { name: target, kind: value, required: true }
---

# NN Procedure

## NN Procedure: DeclaredAt
slug:: declared-at-proc

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
at:: entregables/report-{target}.md
required:: true
`
    writeFileSync(join(root, 'procedures', 'declared_procedures_NN.md'), procContent, 'utf-8')

    // Start procedure with slot target: "acme"
    ok(await procedureStart(root, { procedure: 'declared', params: { target: 'acme' }, run: 'd1' }))
    ok(await procedureRecord(root, { run: 'd1', action: 'start' }))

    // Deliverable target resolves to: entregables/report-acme.md
    const deliverablePath = 'entregables/report-acme.md'
    const deliverableContent = '# ACME Deliverable Report\nAll checks passed.'
    mkdirSync(join(root, 'entregables'), { recursive: true })
    writeFileSync(join(root, deliverablePath), deliverableContent, 'utf-8')
    const deliverableSha = createHash('sha256').update(deliverableContent).digest('hex')

    // 1. Record artifact without supplying value or rev: it resolves at and computes sha
    const artRec = ok(
      await procedureRecord(root, {
        run: 'd1',
        action: 'artifact',
        fact: 'validated',
        field: 'deliverable',
      }),
    )
    expect(artRec.state.artifacts.deliverable).toMatchObject({
      status: 'validated',
      value: deliverablePath,
      rev: deliverableSha,
    })

    // Complete the step
    const completed = ok(await procedureRecord(root, { run: 'd1', action: 'complete' }))
    expect(completed.state.currentStep).toBe('review')

    // 2. Verify with export-console embedRunArtifacts
    const state = ok(await procedureState(root, { run: 'd1' }))
    const graph = {
      artifacts: {
        deliverable: {
          kind: 'file',
          name: 'Deliverable',
          at: 'entregables/report-{target}.md',
        },
      },
    }
    const embeds = embedRunArtifacts(root, graph, state.state)
    expect(embeds.deliverable).toBeDefined()
    expect(embeds.deliverable).toMatchObject({
      path: deliverablePath,
      kind: 'text',
      bytes: Buffer.byteLength(deliverableContent),
      text: deliverableContent,
    })
    // No mismatch when rev matches actual file sha256
    expect(embeds.deliverable.mismatch).toBeUndefined()

    // 3. Test that export-console detects mismatch if file content changed after recording
    writeFileSync(join(root, deliverablePath), '# Tampered Content\n', 'utf-8')
    const tamperedEmbeds = embedRunArtifacts(root, graph, state.state)
    expect(tamperedEmbeds.deliverable).toMatchObject({
      path: deliverablePath,
      mismatch: true,
    })
  })
})
