#!/usr/bin/env node

/**
 * scripts/console-views.test.mjs
 *
 * Unit tests for scripts/console-views.mjs (plain node, zero-framework .test convention).
 *
 * The regression this guards: `collectViewData` runs inside the long-lived MCP
 * server, so a data module imported once stays cached for the life of the
 * process. A view owner edits `*.data.mjs`, the exporter is called again, and
 * the console is written with the previous viewData - silently, because the
 * import resolves to the cached module.
 */

import assert from 'node:assert'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { collectViewData } from './console-views.mjs'

function dataModule(marker) {
  return `export async function collect() {\n  return { marker: '${marker}' }\n}\n`
}

async function collectProbe(dir) {
  const views = [{ id: 'probe', dataPath: path.join(dir, 'probe.data.mjs') }]
  const out = await collectViewData({ views, rootDir: dir })
  return out.probe
}

async function runTests() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'console-views-test-'))
  const dataPath = path.join(dir, 'probe.data.mjs')

  try {
    // Test 1: the data module is loaded and its result reaches the caller
    fs.writeFileSync(dataPath, dataModule('first'), 'utf-8')
    assert.deepStrictEqual(await collectProbe(dir), { marker: 'first' })
    console.log('ok Test 1: a data module is collected into viewData')

    // Test 2: editing the module is seen by the next collection in this process
    fs.writeFileSync(dataPath, dataModule('second'), 'utf-8')
    const later = new Date(Date.now() + 5000)
    fs.utimesSync(dataPath, later, later)
    assert.deepStrictEqual(
      await collectProbe(dir),
      { marker: 'second' },
      'a second collection in the same process must read the edited module, not the cached one',
    )
    console.log('ok Test 2: an edited data module is re-read on the next collection')

    // Test 3: a module that does not export collect() reports the module path
    const badPath = path.join(dir, 'bad.data.mjs')
    fs.writeFileSync(badPath, 'export const nope = 1\n', 'utf-8')
    await assert.rejects(
      () => collectViewData({ views: [{ id: 'bad', dataPath: badPath }], rootDir: dir }),
      /must export a collect\(\) function/,
    )
    console.log('ok Test 3: a module without collect() fails with a clear message')

    // Test 4: a missing module keeps the wrapping error and its path
    const missingPath = path.join(dir, 'missing.data.mjs')
    await assert.rejects(
      () => collectViewData({ views: [{ id: 'missing', dataPath: missingPath }], rootDir: dir }),
      (err) => {
        /* assert.rejects hands the predicate `unknown`, and this suite is
           typechecked as strictly as the exporter it tests. */
        const message = err instanceof Error ? err.message : String(err)
        assert.match(message, /cannot load the data module for view "missing"/)
        assert.ok(message.includes(missingPath))
        return true
      },
    )
    console.log('ok Test 4: a missing data module fails with the wrapped path')

    console.log('All console-views unit tests passed successfully!')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

runTests().catch((err) => {
  console.error(err)
  process.exit(1)
})
