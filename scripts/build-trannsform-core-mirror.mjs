#!/usr/bin/env node

/**
 * scripts/build-trannsform-core-mirror.mjs
 *
 * Bundles the core primitives from `@cognnitive/nn-core`
 * (`src/trannsformPrimitives.ts`) into a committed, zero-dependency CommonJS
 * artifact the DISTRIBUTED `nn-sources` skill can `require()`. The skill is
 * installed at `~/.agents/skills/` where `@cognnitive/nn-core` does not exist,
 * and nn-core is ESM-only, so a runtime import is impossible — this bundle IS
 * the single shared implementation.
 *
 *   input : iNNfo/packages/nn-core/src/trannsformPrimitives.ts
 *   output: skills/nn-sources/scripts/lib/nn-core.generated.cjs
 *
 * Usage:
 *   node scripts/build-trannsform-core-mirror.mjs [--check] [--out <file>]
 *
 *   --check   render the bundle and compare to the committed file; exit 1 on drift.
 *   --out     override the output file (default: the committed skill artifact).
 *
 * Mirrors scripts/build-preflight-primitives.mjs conventions: LF endings,
 * `--check` drift mode wired into scripts/verify.js.
 */

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..')
const ENTRY = path.join(REPO_ROOT, 'iNNfo', 'packages', 'nn-core', 'src', 'trannsformPrimitives.ts')
const DEFAULT_OUT = path.join(
  REPO_ROOT,
  'skills',
  'nn-sources',
  'scripts',
  'lib',
  'nn-core.generated.cjs',
)

const BANNER =
  '/**\n' +
  ' * GENERATED FILE — DO NOT EDIT.\n' +
  ' * Source: iNNfo/packages/nn-core/src/trannsformPrimitives.ts\n' +
  ' * Regenerate: node scripts/build-trannsform-core-mirror.mjs\n' +
  ' * Drift-guarded by scripts/verify.js (build-trannsform-core-mirror --check).\n' +
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
  const esbuild = loadEsbuild()
  const result = await esbuild.build({
    entryPoints: [ENTRY],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node20',
    absWorkingDir: REPO_ROOT,
    write: false,
    legalComments: 'none',
    banner: { js: BANNER },
  })
  const rawCode = result.outputFiles[0].text.replace(/\r\n/g, '\n')
  // Collapse the relative prefix before node_modules. When node_modules is a
  // junction/symlink to another checkout (session worktrees), esbuild reports
  // `../<checkout-dir>/node_modules/...`; on CI it is `node_modules/...`.
  return rawCode.replace(/(?:\.\.\/)+(?:[\w.-]+\/)?node_modules\//g, 'node_modules/')
}

function getArg(flag) {
  const idx = process.argv.indexOf(flag)
  return idx !== -1 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null
}

async function main() {
  const check = process.argv.includes('--check')
  const outFile = getArg('--out') || DEFAULT_OUT
  const rel = path.relative(REPO_ROOT, outFile) || outFile

  const rendered = await render()

  if (check) {
    const committed = fs.existsSync(outFile)
      ? fs.readFileSync(outFile, 'utf-8').replace(/\r\n/g, '\n')
      : null
    if (rendered === committed) {
      console.log(`build-trannsform-core-mirror: OK — ${rel} is up to date.`)
      process.exit(0)
    }
    console.error(`build-trannsform-core-mirror: DRIFT — ${rel} is stale. Re-run without --check.`)
    process.exit(1)
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, rendered, 'utf-8')
  console.log(`build-trannsform-core-mirror: wrote ${rel}.`)
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err)
  process.exit(2)
})
