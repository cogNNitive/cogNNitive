#!/usr/bin/env node

/**
 * skills/nn-upgrade/scripts/batch-update.test.js
 *
 * Work Unit 1 (slice 1) suite for batch-update.js: READ-ONLY scanner + planner +
 * selector. Covers tasks 1.2/1.3 (exports), 2.1/2.2 (discovery + classification),
 * 3.1/3.2 (persisted plan shape), 3.3/3.4 (hash parity + --plan override) and
 * 4.1/4.2 (selection precedence, empty no-op).
 *
 * Style mirrors migrate-domain.test.js: node assert + spawnSync, fixtures under
 * repo-root temp/ (gitignored), removed in finally. No --apply / --rollback here
 * (Work Unit 2) — only that the CLI parses and cleanly refuses them.
 */

const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { spawnSync } = require('node:child_process')

const SCRIPT_DIR = __dirname
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../../../')
const TEMP_ROOT = path.join(REPO_ROOT, 'temp')
const BATCH_CLI = path.join(SCRIPT_DIR, 'batch-update.js')
const MIGRATE_CLI = path.join(SCRIPT_DIR, 'migrate-domain.js')

const { runBatch, main } = require('./batch-update.js')

function runBatchCli(args) {
  return spawnSync(process.execPath, [BATCH_CLI, ...args], { encoding: 'utf-8' })
}

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

/** Recursive file-path -> sha256 map, used to prove scan writes nothing. */
function snapshotTree(dir) {
  const out = {}
  function walk(current, rel) {
    let entries
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const relPath = rel ? `${rel}/${entry.name}` : entry.name
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        walk(full, relPath)
      } else {
        out[relPath] = sha256File(full)
      }
    }
  }
  walk(dir, '')
  return out
}

function capturingOut() {
  const lines = []
  return {
    lines,
    log: (s) => lines.push(String(s)),
    error: (s) => lines.push(String(s)),
  }
}

function populateLegacyDomain(dir) {
  fs.mkdirSync(path.join(dir, 'models'), { recursive: true })
  fs.mkdirSync(path.join(dir, 'specs', 'templates', 'workspace'), { recursive: true })
  fs.mkdirSync(path.join(dir, 'feedback'), { recursive: true })

  fs.writeFileSync(
    path.join(dir, 'workspace_NN.md'),
    '---\ntemplate_version: "0.1.0"\ntemplate_name: "workspace"\nmodels_dir: "models"\ntemplates_dir: "specs/templates"\nparent_spec:\n  name: "workspace"\n  url: "https://raw.githubusercontent.com/cognnitive/innfo/main/iNNfo/specs/templates/workspace/spec_NN.md"\n---\n# NN index\n\n* [[Workspace]]\n* [[Models]]\n\n# NN Workspace\n\n- Ref: path:: models/core_NN.md\n- Sources: fuentes:: ["models/core_NN.md"]\n- Link: [Core](./models/core_NN.md)\n- Wikilink: [[#Workspace]]\n\n## NN Models\n\n## NN Templates\n',
    'utf-8',
  )

  fs.writeFileSync(
    path.join(dir, 'models', 'core_NN.md'),
    '---\nmodel_version: "0.1.0"\nblueprint_name: "custom_app"\n---\n# Custom App Heading\n\n- Field:: value\n- Related: fuentes:: ["models/core_NN.md"]\n',
    'utf-8',
  )
}

function makeReadyDomain(parent, name) {
  const dir = path.join(parent, name)
  fs.mkdirSync(dir, { recursive: true })
  populateLegacyDomain(dir)
  return dir
}

function fixedNow() {
  return new Date('2026-10-01T12:00:00.000Z')
}

function findDomain(res, name) {
  return res.parents[0].plan.domains.find((d) => d.name === name)
}

async function runTests() {
  fs.mkdirSync(TEMP_ROOT, { recursive: true })
  const tmpRoot = fs.mkdtempSync(path.join(TEMP_ROOT, 'batch-update-'))
  console.log('Running batch-update.js (Work Unit 1) unit tests...')

  try {
    // 1. Exports smoke (tasks 1.2 / 1.3)
    {
      assert.strictEqual(typeof runBatch, 'function', 'runBatch is exported')
      assert.strictEqual(typeof main, 'function', 'main is exported')
      console.log('✔ runBatch + main exports present')
    }

    // 2. Discovery exclusions + classification + zero domain writes (tasks 2.1 / 2.2)
    {
      const parent = fs.mkdtempSync(path.join(TEMP_ROOT, 'discover-'))
      const acme = makeReadyDomain(parent, 'acme')
      // Decoys that MUST be excluded by discovery (name rules).
      makeReadyDomain(parent, 'acme-backup-20261001-120000')
      fs.mkdirSync(path.join(parent, '_archive'), { recursive: true })
      fs.mkdirSync(path.join(parent, '_templates'), { recursive: true })
      fs.mkdirSync(path.join(parent, '.hidden'), { recursive: true })
      // A plain directory that is discovered but is not a domain.
      fs.mkdirSync(path.join(parent, 'notes'), { recursive: true })

      const before = snapshotTree(acme)
      const out = capturingOut()
      const res = await runBatch({
        parents: [parent],
        command: 'scan',
        selection: { only: [], exclude: [] },
        now: fixedNow,
        out,
      })

      assert.strictEqual(res.exitCode, 0, 'scan exits 0 when nothing is blocked')
      const names = res.parents[0].plan.domains.map((d) => d.name)
      assert.ok(!names.includes('acme-backup-20261001-120000'), 'backup sibling excluded')
      assert.ok(!names.includes('_archive'), '_archive excluded')
      assert.ok(!names.includes('_templates'), '_templates excluded')
      assert.ok(!names.includes('.hidden'), 'dot-directory excluded')

      const notes = findDomain(res, 'notes')
      assert.ok(notes, 'plain dir is discovered')
      assert.strictEqual(notes.status, 'skipped', 'non-domain is skipped')
      assert.strictEqual(notes.reason, 'not-a-domain', 'non-domain reason recorded')

      const acmeEntry = findDomain(res, 'acme')
      assert.strictEqual(acmeEntry.status, 'ready', 'legacy domaiNN is ready')
      assert.ok(acmeEntry.opsCount > 0, 'ready domain has ops')
      assert.strictEqual(acmeEntry.path, acme, 'plan records absolute domain path')

      assert.deepStrictEqual(snapshotTree(acme), before, 'scan wrote zero domain files')
      console.log('✔ discovery excludes backups/archives/dot-dirs and scan writes nothing')
    }

    // 3. Persisted plan shape + plan/journal names never candidates (tasks 3.1 / 3.2)
    {
      const parent = fs.mkdtempSync(path.join(TEMP_ROOT, 'plan-'))
      makeReadyDomain(parent, 'acme')
      makeReadyDomain(parent, 'beta')
      // Defensive: file names that must never be discovered (they are files anyway).
      fs.writeFileSync(path.join(parent, 'batch-journal-2026.json'), '{}', 'utf-8')

      const res = await runBatch({
        parents: [parent],
        command: 'scan',
        selection: { only: [], exclude: [] },
        now: fixedNow,
        out: capturingOut(),
      })

      const plan = res.parents[0].plan
      assert.strictEqual(plan.version, 1, 'plan version')
      assert.strictEqual(plan.generatedAt, '2026-10-01T12:00:00.000Z', 'plan generatedAt from injected now')
      assert.strictEqual(plan.parentDir, parent, 'plan parentDir')
      assert.ok(Array.isArray(plan.domains), 'plan domains array')

      for (const d of plan.domains) {
        assert.deepStrictEqual(
          Object.keys(d).sort(),
          ['name', 'opsCount', 'path', 'planHash', 'reason', 'status'].sort(),
          `domain keys for ${d.name}`,
        )
      }

      const names = plan.domains.map((d) => d.name)
      assert.ok(!names.includes('batch-plan.json'), 'plan file never a candidate')
      assert.ok(!names.includes('batch-journal-2026.json'), 'journal file never a candidate')

      const planFile = path.join(parent, 'batch-plan.json')
      assert.ok(fs.existsSync(planFile), 'batch-plan.json written')
      const onDisk = JSON.parse(fs.readFileSync(planFile, 'utf-8'))
      assert.deepStrictEqual(onDisk, plan, 'on-disk plan matches returned plan')

      // --plan override (task 3.4)
      const alt = path.join(parent, 'custom-plan.json')
      const resAlt = await runBatch({
        parents: [parent],
        command: 'scan',
        selection: { only: [], exclude: [] },
        planPath: alt,
        now: fixedNow,
        out: capturingOut(),
      })
      assert.ok(fs.existsSync(alt), '--plan override path written')
      assert.strictEqual(resAlt.parents[0].planPath, alt, 'result records override planPath')

      console.log('✔ plan shape/persistence correct and plan/journal names are never candidates')
    }

    // 4. Hash parity vs migrate-domain.js --json (task 3.3)
    {
      const parent = fs.mkdtempSync(path.join(TEMP_ROOT, 'parity-'))
      const acme = makeReadyDomain(parent, 'acme')

      const res = await runBatch({
        parents: [parent],
        command: 'scan',
        selection: { only: [], exclude: [] },
        now: fixedNow,
        out: capturingOut(),
      })
      const batchHash = findDomain(res, 'acme').planHash

      const mig = spawnSync(process.execPath, [MIGRATE_CLI, '--domain-dir', acme, '--json'], {
        encoding: 'utf-8',
      })
      assert.strictEqual(mig.status, 0, mig.stderr)
      const migrateHash = JSON.parse(mig.stdout).planHash
      assert.strictEqual(batchHash, migrateHash, 'batch planHash matches migrate-domain --json planHash')
      console.log('✔ batch planHash is identical to migrate-domain.js --json planHash')
    }

    // 5. Selection precedence + empty selection no-op (tasks 4.1 / 4.2)
    {
      const parent = fs.mkdtempSync(path.join(TEMP_ROOT, 'select-'))
      makeReadyDomain(parent, 'acme')
      makeReadyDomain(parent, 'beta')

      const onlyRes = await runBatch({
        parents: [parent],
        command: 'scan',
        selection: { only: ['acme'], exclude: [] },
        now: fixedNow,
        out: capturingOut(),
      })
      assert.deepStrictEqual(onlyRes.parents[0].selected, ['acme'], '--only A selects only A')

      const excludeAll = await runBatch({
        parents: [parent],
        command: 'scan',
        selection: { only: [], exclude: ['acme', 'beta'] },
        now: fixedNow,
        out: capturingOut(),
      })
      assert.deepStrictEqual(excludeAll.parents[0].selected, [], 'exclude-all selects nothing')
      assert.strictEqual(excludeAll.exitCode, 0, 'empty selection exits 0 (no-op)')

      // Unknown --only name warns but is not fatal.
      const unknown = await runBatch({
        parents: [parent],
        command: 'scan',
        selection: { only: ['ghost'], exclude: [] },
        now: fixedNow,
        out: capturingOut(),
      })
      assert.deepStrictEqual(unknown.parents[0].selected, [], 'unknown only-name selects nothing')
      assert.strictEqual(unknown.exitCode, 0, 'unknown only-name is not fatal')

      // CLI wiring: --only/--exclude parse and exit 0 on empty selection.
      const cli = runBatchCli(['--dir', parent, '--scan', '--only', 'acme', '--exclude', 'acme'])
      assert.strictEqual(cli.status, 0, cli.stderr)
      console.log('✔ selection precedence and empty selection no-op')
    }

    // 6. Slice boundary: apply/rollback parsed but cleanly refused; invalid flags exit 2
    {
      const parent = fs.mkdtempSync(path.join(TEMP_ROOT, 'cli-'))
      makeReadyDomain(parent, 'acme')

      const applyRes = runBatchCli(['--dir', parent, '--apply', '--yes'])
      assert.strictEqual(applyRes.status, 1, '--apply refused in slice 1')
      assert.ok(
        (applyRes.stdout + applyRes.stderr).includes('not implemented in this slice'),
        '--apply refusal message is explicit',
      )

      const rollbackRes = runBatchCli(['--dir', parent, '--rollback', 'batch-journal.json', '--yes'])
      assert.strictEqual(rollbackRes.status, 1, '--rollback refused in slice 1')
      assert.ok(
        (rollbackRes.stdout + rollbackRes.stderr).includes('not implemented in this slice'),
        '--rollback refusal message is explicit',
      )

      const badFlagRes = runBatchCli(['--dir', parent, '--nope'])
      assert.strictEqual(badFlagRes.status, 2, 'unknown flag exits 2')

      console.log('✔ apply/rollback refuse cleanly (exit 1); unknown flags exit 2')
    }
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  }

  console.log('All batch-update (Work Unit 1) unit tests passed successfully!\n')
}

runTests().catch((err) => {
  console.error('Test failure:', err)
  process.exit(1)
})
