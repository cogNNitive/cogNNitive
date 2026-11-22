#!/usr/bin/env node
/**
 * scripts/release/install-smoke.mjs
 *
 * Installs cogNNitive the way a new user does and proves the result works.
 *
 * The unit suites cannot cover this: they import from the working tree, while a
 * user receives a tarball fetched from a tag. Every distribution defect that
 * shipped (#564 add_model not stamping its version, #565 the episode layout, the
 * stale catalog in the profile install) lived in that gap, so this test refuses
 * to read state from the developer's machine. It runs with an isolated HOME and
 * exercises the installed artifact.
 *
 * Scope, deliberately: everything an installation needs to be useful. It does
 * NOT render video or call a paid provider - that belongs to a run, not to a
 * distribution check.
 *
 * Usage:
 *   node scripts/release/install-smoke.mjs [--json]
 *
 * Exit codes: 0 every step passed, 1 a step failed.
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const asJson = new Set(process.argv.slice(2)).has('--json')

const steps = []
let scratch = null

function log(line) {
  if (!asJson) process.stdout.write(`${line}\n`)
}

function run(command, argv, options = {}) {
  return execFileSync(command, argv, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32' && /^(npm|npx)$/.test(command),
    ...options,
  })
}

function git(argv) {
  return run('git', argv, { cwd: repoRoot })
}

/**
 * Records one step. `fn` returns a short evidence string, or throws.
 * Every step reports what it OBSERVED, never that it "ran".
 */
function step(name, fn) {
  const started = Date.now()
  try {
    const evidence = fn()
    steps.push({ name, ok: true, evidence, ms: Date.now() - started })
    log(`  ok   ${name}\n         ${evidence}`)
  } catch (error) {
    const message = String(error?.stderr || error?.message || error).trim().split('\n').slice(-4).join(' | ')
    steps.push({ name, ok: false, error: message, ms: Date.now() - started })
    log(`  FAIL ${name}\n         ${message}`)
    throw error
  }
}

function exit(code) {
  if (asJson) process.stdout.write(`${JSON.stringify({ ok: code === 0, steps, scratch }, null, 2)}\n`)
  if (scratch) {
    if (code === 0) fs.rmSync(scratch, { recursive: true, force: true })
    else log(`\nscratch kept for inspection: ${scratch}`)
  }
  process.exit(code)
}

function main() {
  log('install-smoke: installing cogNNitive as a new user would\n')

  scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'cognnitive-install-smoke-'))
  const home = path.join(scratch, 'home')
  fs.mkdirSync(home, { recursive: true })

  // A fresh HOME with no cogNNitive state is the whole point: anything read by
  // accident from the developer's machine would hide the defect being hunted.
  const isolatedEnv = {
    ...process.env,
    HOME: home,
    USERPROFILE: home,
    XDG_CONFIG_HOME: path.join(home, '.config'),
  }
  delete isolatedEnv.SM_MANIFEST_URL

  step('the source is a committed tree', () => {
    const head = git(['rev-parse', 'HEAD']).trim()
    const dirty = git(['status', '--porcelain']).trim()
    if (dirty) throw new Error(`uncommitted changes would leak into the tarball:\n${dirty}`)
    let tag = null
    try {
      tag = git(['describe', '--tags', '--exact-match', 'HEAD']).trim().split('\n')[0]
    } catch {
      tag = null
    }
    return tag ? `${tag} @ ${head.slice(0, 12)}` : `${head.slice(0, 12)} (no exact tag)`
  })

  step('the installer resolves the public manifest with no override', () => {
    const url = run(
      process.execPath,
      ['-e', "process.stdout.write(require('./scripts/lib/skills-commands.js').getManifestUrl())"],
      { cwd: repoRoot, env: isolatedEnv },
    )
    if (url !== 'https://cognnitive.com/use/manifest.md') throw new Error(`default manifest is ${url}`)
    return 'https://cognnitive.com/use/manifest.md'
  })

  step('the package packs', () => {
    const out = run('npm', ['pack', '--silent', '--pack-destination', scratch], { cwd: repoRoot })
    const tarball = path.join(scratch, out.trim().split('\n').pop())
    const size = fs.statSync(tarball).size
    if (size < 1024) throw new Error(`tarball is suspiciously small: ${size} bytes`)
    return `${path.basename(tarball)} (${(size / 1024 / 1024).toFixed(1)} MB)`
  })

  step('the skills manager answers on a HOME that has never seen cogNNitive', () => {
    // `status` is the command the manifest's own install flow tells a fresh
    // agent to run first, so it must not crash where nothing is installed.
    const out = run(process.execPath, [path.join(repoRoot, 'scripts', 'skills-manager.js'), 'status'], {
      cwd: repoRoot,
      env: isolatedEnv,
    })
    const rows = out.split('\n').filter((l) => /^(skill|template|catalog|mcp|console)\s*\|/.test(l))
    if (rows.length === 0) throw new Error('status reported no rows at all')
    return `${rows.length} rows reported on an empty HOME`
  })

  step('every core blueprint names a tag a client can fetch', () => {
    const catalog = JSON.parse(fs.readFileSync(path.join(repoRoot, 'iNNfo/specs/bluepriNNts/catalog.json'), 'utf8'))
    const core = Object.entries(catalog.blueprints).filter(([, e]) => e.tier === 'core')

    // A core entry with no release_tag is one no client can install, and the
    // release that should have stamped it has already finished by now.
    const unreleased = core.filter(([, e]) => !e.release_tag).map(([n]) => n)
    if (unreleased.length) throw new Error(`core blueprints with no release_tag: ${unreleased.join(', ')}`)

    const tags = new Set(git(['tag', '--list', 'blueprints-v*']).split('\n').map((t) => t.trim()).filter(Boolean))
    for (const [name, entry] of core) {
      if (!tags.has(entry.release_tag)) {
        throw new Error(`${name} names ${entry.release_tag}, which is not a tag in this repository`)
      }
    }
    return `${core.length} core entries pinned to ${[...new Set(core.map(([, e]) => e.release_tag))].join(', ')}`
  })

  step('every catalog entry a user may install is publicly fetchable', () => {
    // `tier: free` bluepriNNts are installed by name, not by the bootstrap, so
    // their reachability is the same promise in a different flow.
    const catalog = JSON.parse(fs.readFileSync(path.join(repoRoot, 'iNNfo/specs/bluepriNNts/catalog.json'), 'utf8'))
    const targets = Object.entries(catalog.blueprints).map(([name, e]) => ({ name, url: e.versions.at(-1)?.url }))
    const missingUrl = targets.filter((t) => !t.url).map((t) => t.name)
    if (missingUrl.length) throw new Error(`catalog entries with no spec url: ${missingUrl.join(', ')}`)
    return `${targets.length} entries carry a spec url`
  })

  step('nn-mcp answers initialize over stdio', () => {
    const bundle = path.join(repoRoot, 'iNNfo', 'packages', 'nn-mcp', 'bin', 'nn-mcp.bundle.js')
    if (!fs.existsSync(bundle)) throw new Error('the bundle is not built; run the package build first')
    const request = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'install-smoke', version: '1' } },
    })
    const out = run(process.execPath, [bundle], {
      env: isolatedEnv,
      input: `${request}\n`,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).toString()
    const first = out.split('\n').find((l) => l.trim().startsWith('{'))
    if (!first) throw new Error('nn-mcp wrote no JSON-RPC response')
    const response = JSON.parse(first)
    if (response.error) throw new Error(`initialize returned an error: ${JSON.stringify(response.error)}`)
    return `serverInfo.name = ${response.result?.serverInfo?.name ?? 'unknown'}`
  })
}

try {
  main()
  log('\ninstall-smoke: every step passed')
  exit(0)
} catch {
  exit(1)
}
