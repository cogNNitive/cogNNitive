#!/usr/bin/env node

/**
 * scripts/build-video-parser-mirror.mjs
 *
 * Bundles the VUS parser from `iNNfo/packages/innfo-video-parser` into a committed,
 * self-contained ESM artifact the DISTRIBUTED `nn-video-script` skill imports by
 * relative path. The skill is installed at `~/.agents/skills/` where neither the
 * monorepo path (`../../../iNNfo/...`) nor `@cognnitive/innfo-video-parser` exists,
 * and the package ships TypeScript source requiring a `tsx` loader — so this bundle
 * IS the single self-contained implementation (zod + the VUS spec are embedded).
 *
 *   entry : scripts/mirror/video-parser-entry.ts
 *   output: skills/nn-video-script/scripts/lib/innfo-video-parser.generated.mjs
 *
 * Usage:
 *   node scripts/build-video-parser-mirror.mjs [--check] [--out <file>]
 *
 *   --check   render the bundle and compare to the committed file; exit 1 on drift.
 *   --out     override the output file (default: the committed skill artifact).
 *
 * Mirrors scripts/build-trannsform-core-mirror.mjs conventions, plus ESM format,
 * `preserveSymlinks:true` (worktree junction safety) and a build-time `define` of
 * the vendored spec digest so spec drift fails the `--check` step in scripts/verify.js.
 */

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..')
const ENTRY = path.join(REPO_ROOT, 'scripts', 'mirror', 'video-parser-entry.ts')
const SPEC_FILE = path.join(
  REPO_ROOT,
  'iNNfo',
  'packages',
  'innfo-video-parser',
  'specs',
  'V_0-3-3.json',
)
const DEFAULT_OUT = path.join(
  REPO_ROOT,
  'skills',
  'nn-video-script',
  'scripts',
  'lib',
  'innfo-video-parser.generated.mjs',
)

const BANNER =
  '/**\n' +
  ' * GENERATED FILE — DO NOT EDIT.\n' +
  ' * Source: iNNfo/packages/innfo-video-parser (via scripts/mirror/video-parser-entry.ts)\n' +
  ' * Regenerate: node scripts/build-video-parser-mirror.mjs\n' +
  ' * Drift-guarded by scripts/verify.js (build-video-parser-mirror --check).\n' +
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

/** LF-normalized sha256 of the vendored spec, matching the pin in SKILL.md. */
function specSha256() {
  let text = fs.readFileSync(SPEC_FILE, 'utf8')
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  return crypto.createHash('sha256').update(text.replace(/\r\n/g, '\n'), 'utf8').digest('hex')
}

async function render() {
  const esbuild = loadEsbuild()
  const result = await esbuild.build({
    entryPoints: [ENTRY],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    absWorkingDir: REPO_ROOT,
    preserveSymlinks: true,
    write: false,
    legalComments: 'none',
    banner: { js: BANNER },
    loader: { '.json': 'json' },
    define: { __VUS_SPEC_SHA256__: JSON.stringify(specSha256()) },
  })
  const rawCode = result.outputFiles[0].text.replace(/\r\n/g, '\n')
  // Install-layout-independent output: esbuild annotates each bundled module
  // with a `// <path>` comment, and the path of hoisted vs nested
  // `node_modules` copies differs between installs (local nested copy vs CI
  // `npm ci` hoisting) and platforms (worktree junctions). Normalize every
  // full-line path comment to start at `node_modules/` so `--check` compares
  // module content, never install layout. Code lines are left untouched.
  return rawCode
    .replace(/(?:\.\.\/)+node_modules\//g, 'node_modules/')
    .split('\n')
    .map((line) => {
      const m = /^(\/\/\s*)\S*?node_modules\//.exec(line)
      return m ? line.replace(/^\/\/\s*\S*?node_modules\//, '// node_modules/') : line
    })
    .join('\n')
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
      console.log(`build-video-parser-mirror: OK — ${rel} is up to date.`)
      process.exit(0)
    }
    console.error(`build-video-parser-mirror: DRIFT — ${rel} is stale. Re-run without --check.`)
    process.exit(1)
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, rendered, 'utf-8')
  console.log(`build-video-parser-mirror: wrote ${rel}.`)
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err)
  process.exit(2)
})
