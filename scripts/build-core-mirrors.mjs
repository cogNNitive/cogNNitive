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
 *   2. coNNtent (nn-conntent):
 *      input : scripts/core-mirrors/coNNtent.ts
 *      output: iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/nn-core.generated.cjs
 *
 * Usage:
 *   node scripts/build-core-mirrors.mjs [--check] [--target <name>] [--out <file>]
 *
 *   --check   render targets and compare to committed files; exit 1 on drift.
 *   --target  render only one target ('trannsform' | 'coNNtent' | 'update').
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
    name: 'coNNtent',    entry: path.join(REPO_ROOT, 'scripts', 'core-mirrors', 'coNNtent.ts'),
    out: path.join(
      REPO_ROOT,
      'iNNfo',
      'specs',
      'bluepriNNts',
      'coNNtent',
      'skills',
      'nn-conntent',
      'scripts',
      'lib',
      'nn-core.generated.cjs',
    ),
    banner:
      '/**\n' +
      ' * GENERATED FILE — DO NOT EDIT.\n' +
      ' * Source: scripts/core-mirrors/coNNtent.ts (nn-core scope, parser, changeset and apply)\n' +
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

/**
 * esbuild empties `import.meta` in cjs output, so nn-core code that locates itself with
 * `fileURLToPath(import.meta.url)` (console/locate-writer) threw on `undefined` inside a
 * mirror (#611). A mirror that uses `import.meta.url` gets it defined as its own file URL,
 * declared after the banner and after any "use strict" directive so the prologue stands.
 */
const IMPORT_META_URL = '__nnImportMetaUrl'
const IMPORT_META_URL_SHIM = `const ${IMPORT_META_URL} = require('node:url').pathToFileURL(__filename).href;`

function withImportMetaUrl(code, banner) {
  if (!code.includes(IMPORT_META_URL)) return code
  const strictAnchor = `${banner}\n"use strict";\n`
  const anchor = code.startsWith(strictAnchor) ? strictAnchor : `${banner}\n`
  if (!code.startsWith(anchor)) throw new Error('build-core-mirrors: generated code does not start with its banner')
  return `${anchor}${IMPORT_META_URL_SHIM}\n${code.slice(anchor.length)}`
}

async function renderTarget(target, esbuild) {
  const result = await esbuild.build({
    entryPoints: [target.entry],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node20',
    absWorkingDir: REPO_ROOT,
    alias: {
      '@cognnitive/nn-core': path.join(REPO_ROOT, 'iNNfo', 'packages', 'nn-core', 'dist', 'index.js'),
    },
    write: false,
    legalComments: 'none',
    define: { 'import.meta.url': IMPORT_META_URL },
    banner: { js: target.banner },
  })
  const rawCode = withImportMetaUrl(result.outputFiles[0].text.replace(/\r\n/g, '\n'), target.banner)
  return rawCode
    .replace(/(?:\.\.\/)+(?:[\w.-]+\/)?node_modules\//g, 'node_modules/')
    .replace(/(?:\.\.\/)+(?:[\w.-]+\/)?iNNfo\//g, 'iNNfo/')
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
        if (committed) {
          const rLines = rendered.split('\n')
          const cLines = committed.split('\n')
          console.error(`Rendered lines: ${rLines.length}, Committed lines: ${cLines.length}`)
          for (let i = 0; i < Math.max(rLines.length, cLines.length); i++) {
            if (rLines[i] !== cLines[i]) {
              console.error(`Diff at line ${i + 1}:`)
              console.error(`  Rendered : ${JSON.stringify(rLines[i])}`)
              console.error(`  Committed: ${JSON.stringify(cLines[i])}`)
              for (let k = 1; k <= 3; k++) {
                if (rLines[i + k] !== undefined || cLines[i + k] !== undefined) {
                  console.error(`  +${k} R: ${JSON.stringify(rLines[i + k])}`)
                  console.error(`  +${k} C: ${JSON.stringify(cLines[i + k])}`)
                }
              }
              break
            }
          }
        }
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
