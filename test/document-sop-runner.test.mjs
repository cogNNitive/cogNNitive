import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const mcp = fileURLToPath(new URL('../iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js', import.meta.url))
const specs = fileURLToPath(new URL('../iNNfo/specs', import.meta.url))
const definition = 'procedures/document_sop_procedures_NN.md'
const output = 'procedures/review-monthly-inventory_procedures_NN.md'
const sample = `---
level: 3
parent_spec:
  name: "procedures_V_0-6-1"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/procedures/spec_NN.md"
knowledge_version: "V_1-0-0"
title: "Review Monthly Inventory"
---

# NN Work

## NN Work: Compare Counts
slug:: compare-counts
step_type:: task
executor:: human
next:: @record-discrepancies

Compare the last physical stock count to the monthly inventory ledger.

## NN Work: Record Discrepancies
slug:: record-discrepancies
step_type:: task
executor:: human

Record mismatches in the monthly reconciliation log, or explicitly record none.
`

test(
  'Document SOP starts, stops on rejected scope and records a verified new SOP on success',
  { timeout: 120_000 },
  async () => {
    const domain = await mkdtemp(join(tmpdir(), 'nn-document-sop-'))
    let server
    try {
      await mkdir(join(domain, 'procedures'))
      await mkdir(join(domain, 'kNNowledge'))
      await writeFile(join(domain, 'domaiNN_NN.md'), '---\ntitle: SOP pilot\n---\n# SOP pilot\n')
      await cp(specs, join(domain, 'specs'), {
        recursive: true,
        filter: (path) => {
          const rel = path.slice(specs.length).replaceAll('\\', '/')
          return (
            !rel ||
            /^\/[^/]+\.md$/.test(rel) ||
            /^\/bluepriNNts(?:\/(?:procedures|executions|changes)(?:\/spec_NN\.md)?)?$/.test(rel)
          )
        },
      })
      const source = await readFile(join(specs, 'bluepriNNts/procedures', definition), 'utf8')
      await writeFile(join(domain, definition), source)
      await writeFile(
        join(domain, 'intake.md'),
        'Compare physical count with the ledger and record discrepancies.\n',
      )
      const offline = join(domain, 'offline.cjs')
      await writeFile(
        offline,
        "globalThis.fetch = async () => { throw new Error('Network disabled for SOP pilot') }\n",
      )
      server = spawn(process.execPath, ['--require', offline, mcp], {
        cwd: domain,
        env: {
          ...process.env,
          INNFO_CACHE_DIR: join(domain, '.cache'),
          INNFO_GLOBAL_DIR: join(domain, '.global'),
          INNFO_SKILLS_DIR: join(domain, '.skills'),
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      const pending = new Map()
      let seq = 0
      let stderr = ''
      server.stderr.setEncoding('utf8').on('data', (chunk) => {
        stderr += chunk
      })
      server.once('exit', (code) => {
        for (const { reject } of pending.values())
          reject(new Error(`nn-mcp exited ${code}: ${stderr}`))
      })
      createInterface({ input: server.stdout }).on('line', (line) => {
        const msg = JSON.parse(line)
        const waiter = pending.get(msg.id)
        if (!waiter) return
        pending.delete(msg.id)
        if (msg.error) waiter.reject(new Error(JSON.stringify(msg.error)))
        else waiter.resolve(msg.result)
      })
      const send = (message) =>
        server.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`)
      const request = (method, params) =>
        new Promise((resolve, reject) => {
          pending.set(++seq, { resolve, reject })
          send({ id: seq, method, params })
        })
      await request('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'sop-pilot', version: '1.0.0' },
      })
      send({ method: 'notifications/initialized' })
      const call = async (name, args) =>
        JSON.parse(
          (await request('tools/call', { name, arguments: { domain, ...args } })).content[0].text,
        )
      const ok = async (name, args) => {
        const result = await call(name, args)
        assert.equal(result.ok, true, JSON.stringify(result))
        return result
      }
      const start = (run) =>
        ok('procedure_start', {
          procedure: definition,
          run,
          params: { intake: 'intake.md', sop: output },
        })
      const record = (run, action, args = {}) => ok('procedure_record', { run, action, ...args })
      const complete = async (run, step, outcome) => {
        await record(run, 'start', { step })
        return record(run, 'complete', { step, outcome })
      }
      assert.equal(
        (await call('procedure_start', { procedure: definition, run: 'missing-input' })).code,
        'MISSING_REQUIRED_SLOT',
      )
      await start('rejected')
      await complete('rejected', 'scope-trigger-identification')
      await record('rejected', 'start', { step: 'scope-approval' })
      const beforeDenial = await ok('procedure_state', { run: 'rejected' })
      const denied = await call('procedure_record', {
        run: 'rejected',
        action: 'complete',
        step: 'scope-approval',
        outcome: 'reject',
        next: 'workflow-step-decomposition',
      })
      assert.equal(denied.code, 'INVALID_TRANSITION')
      assert.deepEqual(await ok('procedure_state', { run: 'rejected' }), beforeDenial)
      const rejected = await record('rejected', 'complete', {
        step: 'scope-approval',
        outcome: 'reject',
      })
      assert.equal(rejected.state.currentStep, 'stop-unapproved-scope')
      assert.equal(
        (await record('rejected', 'finish', { outcome: 'failed' })).state.status,
        'failed',
      )
      assert.deepEqual((await readdir(join(domain, 'procedures'))).sort(), [
        'document_sop_procedures_NN.md',
      ])

      await start('inventory-sop')
      for (const [step, outcome] of [
        ['scope-trigger-identification'],
        ['scope-approval', 'approve'],
        ['workflow-step-decomposition'],
        ['artifact-tool-attachment'],
        ['raci-governance-assignment'],
      ])
        await complete('inventory-sop', step, outcome)
      await record('inventory-sop', 'start', { step: 'integrity-syntax-verification' })
      const missing = await call('procedure_record', {
        run: 'inventory-sop',
        action: 'complete',
        next: 'confirm-validated-sop',
      })
      assert.equal(missing.code, 'INVALID_TRANSITION')
      await writeFile(join(domain, output), sample)
      const validation = await call('validate_knowledge', {
        id: 'review-monthly-inventory_procedures',
        intent: 'verify',
      })
      assert.deepEqual(validation.errors, [], JSON.stringify(validation))
      assert.deepEqual(validation.warnings, [], JSON.stringify(validation))
      const rev = createHash('sha256')
        .update(await readFile(join(domain, output)))
        .digest('hex')
      await record('inventory-sop', 'artifact', {
        field: 'validated-innfo-level-3-model',
        fact: 'validated',
        value: output,
        rev,
      })
      await record('inventory-sop', 'complete')
      await complete('inventory-sop', 'confirm-validated-sop')
      await record('inventory-sop', 'finish', { outcome: 'completed' })
      const { state } = await ok('procedure_state', { run: 'inventory-sop' })
      assert.equal(state.status, 'completed')
      assert.equal(state.artifacts['validated-innfo-level-3-model'].status, 'validated')
      assert.equal(state.artifacts['validated-innfo-level-3-model'].rev, rev)
      assert.equal(await readFile(join(domain, definition), 'utf8'), source)
      const generated = await ok('procedure_start', { procedure: output, run: 'try-inventory-sop' })
      assert.equal(generated.state.currentStep, 'compare-counts')
      const [runFile] = (await readdir(join(domain, 'executions/inventory-sop'))).filter((file) =>
        file.endsWith('_NN.md'),
      )
      assert.match(
        await readFile(join(domain, 'executions/inventory-sop', runFile), 'utf8'),
        /^state:: completed$/m,
      )
    } finally {
      if (server && server.exitCode === null) {
        const closed = new Promise((resolve) => server.once('close', resolve))
        server.stdin.end()
        await closed
      }
      await rm(domain, { recursive: true, force: true })
    }
  },
)
