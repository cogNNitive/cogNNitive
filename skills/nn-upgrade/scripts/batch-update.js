#!/usr/bin/env node

/**
 * skills/nn-upgrade/scripts/batch-update.js
 *
 * nn-upgrade Flow C orchestrator (Work Unit 1 / slice 1): READ-ONLY
 * scanner + planner + selector over sibling domaiNN workspaces.
 *
 * Reuses `migrate-domain.js` (`createFsDomainReader`) and the generated
 * migration planner (`planMigration`) so a batch never reimplements migration
 * logic and its `planHash` matches `migrate-domain.js --json` exactly.
 *
 * Slice 1 delivers: `--dir`, `--scan` (default), `--json`, `--only`,
 * `--exclude`, `--plan`. It writes exactly one artifact per parent,
 * `<parent>/batch-plan.json` (atomic), and ZERO domain files.
 *
 * `--apply` / `--rollback` are parsed but cleanly refused here; Work Unit 2
 * replaces the refusal branch with the apply loop + aggregate journal.
 */

const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { createFsDomainReader } = require('./migrate-domain.js')
const { planMigration } = require('./lib/legacy-migrate.generated.cjs')

// Same tiny dependency stub as migrate-domain.js so planHash parity holds.
const DEPS = {
  targets: {
    domaiNN: { version: '0.1.0', spec: '# domaiNN Spec\n' },
  },
  validate() {
    return []
  },
}

const USAGE =
  'Usage: node batch-update.js [--dir <parent> ...] [--scan] [--only a,b] [--exclude x,y] [--plan <file>] [--json] [--apply --yes] [--rollback <journal> --yes]'

const PLAN_FILE = 'batch-plan.json'

function normalizeOut(out) {
  if (!out) {
    return { log: (s) => console.log(s), error: (s) => console.error(s) }
  }
  if (typeof out === 'function') {
    return { log: (s) => out(s), error: (s) => console.error(s) }
  }
  return {
    log: out.log || ((s) => console.log(s)),
    error: out.error || ((s) => console.error(s)),
  }
}

function toIso(value) {
  const d = value instanceof Date ? value : new Date(value)
  return d.toISOString()
}

function isPlanArtifactName(name) {
  return name === PLAN_FILE || /^batch-journal-.*\.json$/.test(name)
}

/**
 * Directory-only discovery. Excludes dot-dirs, `-backup-*`, `_archive`,
 * `_templates`, and (defensively) plan/journal artifact names. Sorted so the
 * plan is deterministic and diffable.
 */
function discoverDomainDirs(parent) {
  let entries
  try {
    entries = fs.readdirSync(parent, { withFileTypes: true })
  } catch {
    return []
  }
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith('.'))
    .filter((name) => !name.includes('-backup-'))
    .filter((name) => name !== '_archive' && name !== '_templates')
    .filter((name) => !isPlanArtifactName(name))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}

/** A directory is a domaiNN candidate iff it carries a domain marker. */
function hasDomainMarker(dir) {
  let entries
  try {
    entries = fs.readdirSync(dir)
  } catch {
    return false
  }
  for (const entry of entries) {
    if (entry === 'domaiNN_NN.md') return true
    if (/^workspace.*\.md$/i.test(entry)) return true
    if (/_base_[a-z0-9]+\.md$/i.test(entry)) return true
    if (entry === 'kNNowledge' || entry === 'models') return true
  }
  return false
}

async function classifyDomain(name, dir) {
  if (!hasDomainMarker(dir)) {
    return { name, path: dir, status: 'skipped', opsCount: 0, planHash: null, reason: 'not-a-domain' }
  }

  let plan
  try {
    plan = await planMigration(createFsDomainReader(dir), DEPS)
  } catch (err) {
    return { name, path: dir, status: 'blocked', opsCount: 0, planHash: null, reason: err.message }
  }

  const opsCount = Array.isArray(plan.ops) ? plan.ops.length : 0
  const planHash = plan.planHash || null

  if (plan.status === 'blocked') {
    const first =
      (plan.problems || []).find((p) => p.severity === 'error') || (plan.problems || [])[0]
    return { name, path: dir, status: 'blocked', opsCount, planHash, reason: first ? first.message : 'blocked' }
  }
  if (plan.status === 'noop') {
    return { name, path: dir, status: 'noop', opsCount: 0, planHash, reason: null }
  }
  return { name, path: dir, status: 'ready', opsCount, planHash, reason: null }
}

function countsFor(domains) {
  const counts = { ready: 0, noop: 0, blocked: 0, skipped: 0 }
  for (const d of domains) {
    if (counts[d.status] !== undefined) counts[d.status] += 1
  }
  return counts
}

/**
 * Explicit, non-interactive selection: intersect `ready` with `--only`, then
 * subtract `--exclude`. Unknown `--only` names warn but are not fatal.
 */
function selectReady(plan, only, exclude, sink) {
  const known = new Set(plan.domains.map((d) => d.name))
  for (const name of only) {
    if (!known.has(name)) {
      sink.error(`Warning: --only name not found in ${plan.parentDir}: ${name}`)
    }
  }
  let selected = plan.domains.filter((d) => d.status === 'ready').map((d) => d.name)
  if (only.length) selected = selected.filter((name) => only.includes(name))
  if (exclude.length) selected = selected.filter((name) => !exclude.includes(name))
  return selected
}

function atomicWriteJson(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf-8')
  fs.renameSync(tmp, file)
}

function renderTable(report) {
  const header = ['DOMAIN'.padEnd(14), 'STATUS'.padEnd(8), 'OPS'.padEnd(5), 'PLAN HASH'.padEnd(16), 'PATH'].join(' ')
  const rows = report.domains.map((d) =>
    [
      String(d.name).padEnd(14),
      String(d.status).padEnd(8),
      String(d.opsCount).padEnd(5),
      String(d.planHash || '-').padEnd(16),
      d.path,
    ].join(' '),
  )
  const c = report.counts
  const summary = `\n${report.parentDir}: ${report.domains.length} dir(s) — ready ${c.ready}, noop ${c.noop}, blocked ${c.blocked}, skipped ${c.skipped}`
  return [header, ...rows].join('\n') + summary
}

/**
 * In-process batch scan. Pure seam: no process/console/fs globals beyond the
 * injected `spawn` (reserved for Work Unit 2), `now`, and `out`.
 *
 * @returns {Promise<{exitCode:number, command:string, parents:Array, selected:string[]}>}
 */
async function runBatch(opts = {}) {
  const {
    parents = [process.cwd()],
    command = 'scan',
    selection = {},
    planPath = null,
    spawn = spawnSync,
    now = () => new Date(),
    out,
    json = false,
  } = opts

  void spawn // seam reserved for Work Unit 2 (`--apply` / `--rollback`)
  const sink = normalizeOut(out)

  // Slice boundary: apply/rollback are known flags, not implemented yet.
  if (command !== 'scan') {
    const message = `--${command} is not implemented in this slice (Work Unit 1 delivers scan/plan/select only).`
    sink.error(message)
    return { exitCode: 1, command, parents: [], selected: [], messages: [message] }
  }

  const only = Array.isArray(selection.only) ? selection.only : []
  const exclude = Array.isArray(selection.exclude) ? selection.exclude : []
  const generatedAt = toIso(now())

  const parentResults = []
  const allSelected = []
  let exitCode = 0

  for (const parentRaw of parents) {
    const parent = path.resolve(parentRaw)
    if (!fs.existsSync(parent) || !fs.statSync(parent).isDirectory()) {
      sink.error(`Error: parent directory not found: ${parent}`)
      exitCode = 1
      continue
    }

    const domains = []
    for (const name of discoverDomainDirs(parent)) {
      domains.push(await classifyDomain(name, path.join(parent, name)))
    }

    const plan = { version: 1, generatedAt, parentDir: parent, domains }
    const targetPlanPath = planPath ? path.resolve(planPath) : path.join(parent, PLAN_FILE)
    atomicWriteJson(targetPlanPath, plan)

    const selected = selectReady(plan, only, exclude, sink)
    allSelected.push(...selected)

    parentResults.push({
      parentDir: parent,
      planPath: targetPlanPath,
      plan,
      report: { parentDir: parent, scannedAt: generatedAt, counts: countsFor(domains), domains },
      selected,
    })

    if (domains.some((d) => d.status === 'blocked')) exitCode = 1
  }

  if (json) {
    if (parentResults.length === 1) {
      sink.log(JSON.stringify(parentResults[0].report, null, 2))
    } else {
      sink.log(JSON.stringify({ parents: parentResults.map((p) => p.report) }, null, 2))
    }
  } else {
    for (const p of parentResults) sink.log(renderTable(p.report))
  }

  return { exitCode, command, parents: parentResults, selected: allSelected }
}

function parseArgs(argv) {
  const opts = {
    parents: [],
    command: 'scan',
    json: false,
    only: [],
    exclude: [],
    planPath: null,
    yes: false,
    force: false,
  }
  const known = new Set([
    '--dir',
    '--scan',
    '--apply',
    '--rollback',
    '--restore',
    '--json',
    '--only',
    '--exclude',
    '--plan',
    '--yes',
    '--force',
  ])

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!known.has(arg)) return { error: `Unknown flag: ${arg}` }
    switch (arg) {
      case '--dir': {
        const value = argv[++i]
        if (value === undefined) return { error: '--dir requires a value' }
        opts.parents.push(value)
        break
      }
      case '--scan':
        opts.command = 'scan'
        break
      case '--apply':
        opts.command = 'apply'
        break
      case '--rollback':
      case '--restore': {
        opts.command = 'rollback'
        const value = argv[i + 1]
        if (value !== undefined && !value.startsWith('--')) {
          opts.journalPath = value
          i += 1
        }
        break
      }
      case '--json':
        opts.json = true
        break
      case '--only': {
        const value = argv[++i]
        if (value === undefined) return { error: '--only requires a value' }
        opts.only = value.split(',').map((s) => s.trim()).filter(Boolean)
        break
      }
      case '--exclude': {
        const value = argv[++i]
        if (value === undefined) return { error: '--exclude requires a value' }
        opts.exclude = value.split(',').map((s) => s.trim()).filter(Boolean)
        break
      }
      case '--plan': {
        const value = argv[++i]
        if (value === undefined) return { error: '--plan requires a value' }
        opts.planPath = value
        break
      }
      case '--yes':
        opts.yes = true
        break
      case '--force':
        opts.force = true
        break
      default:
        break
    }
  }
  return { opts }
}

async function main(argv = process.argv.slice(2)) {
  const parsed = parseArgs(argv)
  if (parsed.error) {
    console.error(`Error: ${parsed.error}`)
    console.error(USAGE)
    process.exitCode = 2
    return 2
  }

  const opts = parsed.opts
  const parents = opts.parents.length ? opts.parents.map((p) => path.resolve(p)) : [process.cwd()]
  if (opts.planPath && parents.length > 1) {
    console.error('Error: --plan can only be combined with a single --dir parent.')
    process.exitCode = 2
    return 2
  }

  const result = await runBatch({
    parents,
    command: opts.command,
    selection: { only: opts.only, exclude: opts.exclude },
    planPath: opts.planPath,
    now: () => new Date(),
    json: opts.json,
  })

  process.exitCode = result.exitCode
  return result.exitCode
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
}

module.exports = {
  runBatch,
  main,
  discoverDomainDirs,
  hasDomainMarker,
  atomicWriteJson,
}
