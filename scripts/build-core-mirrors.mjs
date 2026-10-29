#!/usr/bin/env node

/**
 * scripts/build-core-mirrors.mjs
 *
 * Bundles core modules from `@cognnitive/nn-core` into committed, zero-dependency
 * CommonJS artifacts that distributed skills can `require()` or `import`.
 *
 * Targets:
 *   1. trannsform (nn-sources):
 *      input : iNNfo/packages/nn-core/src/trannsformPrimitives.ts
 *      output: skills/nn-sources/scripts/lib/nn-core.generated.cjs
 *   2. scope (nn-video-script):
 *      input : iNNfo/packages/nn-core/src/scope/index.ts
 *      output: iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/scripts/lib/nn-core.generated.cjs
 *
 * Usage:
 *   node scripts/build-core-mirrors.mjs [--check] [--target <name>] [--out <file>]
 *
 *   --check   render targets and compare to committed files; exit 1 on drift.
 *   --target  render only one target ('trannsform' | 'scope').
 *   --out     override output file (single-target mode only).
 */

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..')

const TARGETS = [
  {
    name: 'trannsform',
    entry: path.join(REPO_ROOT, 'iNNfo', 'packages', 'nn-core', 'src', 'trannsformPrimitives.ts'),
    out: path.join(REPO_ROOT, 'skills', 'nn-sources', 'scripts', 'lib', 'nn-core.generated.cjs'),
    banner:
      '/**\n' +
      ' * GENERATED FILE — DO NOT EDIT.\n' +
      ' * Source: iNNfo/packages/nn-core/src/trannsformPrimitives.ts\n' +
      ' * Regenerate: node scripts/build-core-mirrors.mjs\n' +
      ' * Drift-guarded by scripts/verify.js (core-mirror --check).\n' +
      ' */\n// @ts-nocheck',
  },
  {
    name: 'scope',
    entry: path.join(REPO_ROOT, 'iNNfo', 'packages', 'nn-core', 'src', 'scope', 'index.ts'),
    out: path.join(
      REPO_ROOT,
      'iNNfo',
      'specs',
      'bluepriNNts',
      'video-script',
      'skills',
      'nn-video-script',
      'scripts',
      'lib',
      'nn-core.generated.cjs',
    ),
    banner:
      '/**\n' +
      ' * GENERATED FILE — DO NOT EDIT.\n' +
      ' * Source: iNNfo/packages/nn-core/src/scope/index.ts\n' +
      ' * Regenerate: node scripts/build-core-mirrors.mjs\n' +
      ' * Drift-guarded by scripts/verify.js (core-mirror --check).\n' +
      ' */\n// @ts-nocheck',
  },
]

function loadEsbuild() {
  for (const base of [path.join(REPO_ROOT, 'iNNfo'), REPO_ROOT]) {
    try {
      return require(require.resolve('esbuild', { paths: [base] }))
    } catch {
      // try next
    }
  }
  throw new Error(
    'esbuild not found. Run `npm ci` in iNNfo/ so the hoisted esbuild/tsup dependency is available.',
  )
}

async function renderTarget(target, esbuild) {
  const result = await esbuild.build({
    entryPoints: [target.entry],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node20',
    absWorkingDir: REPO_ROOT,
    write: false,
    legalComments: 'none',
    banner: { js: target.banner },
  })
  const rawCode = result.outputFiles[0].text.replace(/\r\n/g, '\n')
  return rawCode.replace(/(?:\.\.\/)+(?:[\w.-]+\/)?node_modules\//g, 'node_modules/')
}

function getArg(flag) {
  const idx = process.argv.indexOf(flag)
  return idx !== -1 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null
}

async function main() {
  const check = process.argv.includes('--check')
  const targetFilter = getArg('--target')
  const outOverride = getArg('--out')

  if (outOverride && !targetFilter && TARGETS.length > 1) {
    console.error('build-core-mirrors: --out requires --target when multiple targets exist.')
    process.exit(2)
  }

  const targets = targetFilter
    ? TARGETS.filter((t) => t.name === targetFilter)
    : TARGETS

  if (targets.length === 0) {
    console.error(`build-core-mirrors: unknown target '${targetFilter}'. Valid: ${TARGETS.map((t) => t.name).join(', ')}`)
    process.exit(2)
  }

  const esbuild = loadEsbuild()
  let hasDrift = false

  for (const target of targets) {
    const outFile = outOverride || target.out
    const rel = path.relative(REPO_ROOT, outFile) || outFile
    const rendered = await renderTarget(target, esbuild)

    if (check) {
      const committed = fs.existsSync(outFile)
        ? fs.readFileSync(outFile, 'utf-8').replace(/\r\n/g, '\n')
        : null
      if (rendered === committed) {
        console.log(`build-core-mirrors: OK — ${rel} is up to date.`)
      } else {
        console.error(`build-core-mirrors: DRIFT — ${rel} is stale. Re-run without --check.`)
        hasDrift = true
      }
    } else {
      fs.mkdirSync(path.dirname(outFile), { recursive: true })
      fs.writeFileSync(outFile, rendered, 'utf-8')
      console.log(`build-core-mirrors: wrote ${rel}.`)
    }
  }

  if (hasDrift) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err)
  process.exit(2)
})
