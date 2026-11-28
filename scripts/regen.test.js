'use strict'

/**
 * scripts/regen.test.js
 *
 * `npm run regen` must refuse to run when a freshness-guard generator is missing,
 * instead of silently dropping the artifact it rebuilds. Runs a copy of regen.js (and
 * the libs it requires) in a temp root, so the real checkout is never touched.
 */

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { FRESHNESS_GUARDS } = require('./lib/freshness-guards.js')

const LIBS = [
  'freshness-guards.js',
  'regen-gate.js',
  'shared-artifacts.js',
  'console-fixture-freshness.js',
]

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'regen-missing-'))
  fs.mkdirSync(path.join(root, 'scripts', 'lib'), { recursive: true })
  fs.copyFileSync(path.join(__dirname, 'regen.js'), path.join(root, 'scripts', 'regen.js'))
  for (const lib of LIBS) {
    fs.copyFileSync(path.join(__dirname, 'lib', lib), path.join(root, 'scripts', 'lib', lib))
  }
  return root
}

function runRegen(root) {
  const res = spawnSync(process.execPath, [path.join(root, 'scripts', 'regen.js')], {
    cwd: root,
    encoding: 'utf8',
  })
  return { status: res.status, output: (res.stdout || '') + (res.stderr || '') }
}

test('a missing freshness-guard generator fails before any build and names the path', (t) => {
  const root = makeRoot()
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  for (const g of FRESHNESS_GUARDS.filter((g) => g.id !== 'field-registry')) {
    fs.mkdirSync(path.dirname(path.join(root, g.script)), { recursive: true })
    fs.writeFileSync(path.join(root, g.script), '')
  }

  const res = runRegen(root)

  assert.equal(res.status, 1, res.output)
  assert.match(res.output, /regen: missing freshness-guard script/)
  assert.ok(
    res.output.includes(
      path.join(
        root,
        'iNNfo',
        'specs',
        'bluepriNNts',
        'coNNtent',
        'skills',
        'nn-conntent',
        'scripts',
        'build-field-registry.mjs',
      ),
    ),
    res.output,
  )
  assert.doesNotMatch(res.output, /nn-core build/)
})

test('with every generator present, regen proceeds to the builds', (t) => {
  const root = makeRoot()
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  for (const g of FRESHNESS_GUARDS) {
    fs.mkdirSync(path.dirname(path.join(root, g.script)), { recursive: true })
    fs.writeFileSync(path.join(root, g.script), '')
  }

  const res = runRegen(root)

  // The temp root has no npm workspace, so the first build is where it stops.
  assert.equal(res.status, 1, res.output)
  assert.doesNotMatch(res.output, /missing freshness-guard script/)
  assert.match(res.output, /regen: nn-core build failed/)
})
