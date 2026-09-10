#!/usr/bin/env node

/**
 * scripts/build-trannsform-slug-mirror.mjs
 *
 * Bundles the heading/name slug primitives from `@cognnitive/innfo-core`
 * (`src/slugPrimitives.ts`, re-exporting `sourceRef.ts`) into a committed,
 * zero-dependency CommonJS artifact the DISTRIBUTED `nn-trannsform` skill can
 * `require()`. The skill is installed at `~/.agents/skills/` where
 * `@cognnitive/innfo-core` does not exist, and innfo-core is ESM-only, so a
 * runtime import is impossible — this bundle IS the single shared
 * implementation (`markdown-utils.js` hand-mirrored it before; that drift is
 * what this removes).
 *
 *   input : iNNfo/packages/innfo-core/src/slugPrimitives.ts
 *   output: actioNN/skills/nn-trannsform/scripts/lib/slug-mirror.generated.cjs
 *
 * Usage:
 *   node scripts/build-trannsform-slug-mirror.mjs [--check] [--out <file>]
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
const ENTRY = path.join(REPO_ROOT, 'iNNfo', 'packages', 'innfo-core', 'src', 'slugPrimitives.ts')
const DEFAULT_OUT = path.join(
  REPO_ROOT,
  'actioNN',
  'skills',
  'nn-trannsform',
  'scripts',
  'lib',
  'slug-mirror.generated.cjs',
)

const BANNER =
  '/**\n' +
  ' * GENERATED FILE — DO NOT EDIT.\n' +
  ' * Source: iNNfo/packages/innfo-core/src/slugPrimitives.ts (-> src/sourceRef.ts)\n' +
  ' * Regenerate: node scripts/build-trannsform-slug-mirror.mjs\n' +
  ' * Drift-guarded by scripts/verify.js (build-trannsform-slug-mirror --check).\n' +
  ' */'

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
    platform: 'neutral',
    target: 'node20',
    write: false,
    legalComments: 'none',
    banner: { js: BANNER },
  })
  return result.outputFiles[0].text.replace(/\r\n/g, '\n')
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
      console.log(`build-trannsform-slug-mirror: OK — ${rel} is up to date.`)
      process.exit(0)
    }
    console.error(`build-trannsform-slug-mirror: DRIFT — ${rel} is stale. Re-run without --check.`)
    process.exit(1)
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, rendered, 'utf-8')
  console.log(`build-trannsform-slug-mirror: wrote ${rel}.`)
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err)
  process.exit(2)
})
