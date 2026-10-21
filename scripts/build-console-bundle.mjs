#!/usr/bin/env node
/**
 * scripts/build-console-bundle.mjs
 *
 * Builds or checks the single-file nn-console bundle from the console package's UMD
 * sources. Uses scripts/lib/console-bundle.js.
 *
 * Usage:
 *   node scripts/build-console-bundle.mjs           # builds and writes bundle
 *   node scripts/build-console-bundle.mjs --check   # checks for drift without writing (exit 1 if drift)
 */

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..')

const require = createRequire(import.meta.url)
const {
  SOURCES,
  buildConsoleBundle,
  checkConsoleBundle,
} = require('./lib/console-bundle.js')
const { getConsoleReleaseInfo } = require('./lib/console-release-info.js')

const isCheck = process.argv.includes('--check')

if (isCheck) {
  const result = checkConsoleBundle(repoRoot)
  if (!result.ok) {
    console.error('Console bundle drift detected:\n' + result.errors.map(e => `  - ${e}`).join('\n'))
    process.exit(1)
  }
  console.log('Console bundle is fresh and matches sources.')
} else {
  buildConsoleBundle(repoRoot, { write: true })
  const { version } = getConsoleReleaseInfo(repoRoot)
  const consoleDir = join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'console')
  const outPath = join(consoleDir, 'nn-console.bundle.js')
  console.log(`wrote ${outPath} (${SOURCES.length} sources, version ${version})`)
}