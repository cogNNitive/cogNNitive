#!/usr/bin/env node

/**
 * scripts/build-skills-manager-bundle.mjs
 *
 * Bundles scripts/skills-manager.js (and scripts/lib/*, plus the projection
 * helper it requires from nn-preflight) into one committed, zero-dependency
 * CommonJS file shipped inside the `nn-skills-lifecycle` skill, so the skill
 * can run on a fresh install with no repo checkout.
 *
 *   source: scripts/skills-manager.js
 *   output: skills/nn-skills-lifecycle/scripts/skills-manager.js
 *
 * Usage:
 *   node scripts/build-skills-manager-bundle.mjs [--check]
 *
 *   --check   render the bundle and compare to the committed file; exit 1 on drift.
 */

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..')

const ENTRY = path.join(REPO_ROOT, 'scripts', 'skills-manager.js')
const OUT = path.join(REPO_ROOT, 'skills', 'nn-skills-lifecycle', 'scripts', 'skills-manager.js')

const BANNER =
  '/**\n' +
  ' * GENERATED FILE — DO NOT EDIT.\n' +
  ' * Source: scripts/skills-manager.js (+ scripts/lib/*)\n' +
  ' * Regenerate: node scripts/build-skills-manager-bundle.mjs\n' +
  ' * Drift-guarded by scripts/verify.js (build-skills-manager-bundle --check).\n' +
  ' */\n// @ts-nocheck'

/** Resolve esbuild from the hoisted iNNfo workspace (root has no node_modules). */
function loadEsbuild() {
  for (const base of [path.join(REPO_ROOT, 'iNNfo'), REPO_ROOT]) {
    try {
      return require(require.resolve('esbuild', { paths: [base] }))
    } catch {
      // try the next base
    }
  }
  throw new Error(
    'esbuild not found. Run `npm ci` in iNNfo/ so the hoisted esbuild/tsup dependency is available.',
  )
}

async function render() {
  const result = await loadEsbuild().build({
    entryPoints: [ENTRY],
    absWorkingDir: REPO_ROOT,
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node20',
    write: false,
    legalComments: 'none',
    banner: { js: BANNER },
  })
  return result.outputFiles[0].text.replace(/\r\n/g, '\n')
}

async function main() {
  const check = process.argv.includes('--check')
  const rel = path.relative(REPO_ROOT, OUT).split(path.sep).join('/')
  const rendered = await render()

  if (check) {
    const committed = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf-8').replace(/\r\n/g, '\n') : null
    if (rendered !== committed) {
      console.error(`build-skills-manager-bundle: DRIFT — ${rel} is stale. Re-run without --check.`)
      process.exit(1)
    }
    console.log(`build-skills-manager-bundle: OK — ${rel} is up to date.`)
    return
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, rendered, 'utf-8')
  console.log(`build-skills-manager-bundle: wrote ${rel}.`)
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err)
  process.exit(2)
})
