/**
 * Loads `@cognnitive/innfo-core` for the simulation.
 *
 * WHY THIS EXISTS (this file is itself a finding — see results/report.md, F-01):
 * `innfo-core` is published as `"type": "module"` with `"main": "./dist/index.js"`,
 * but it is compiled with `moduleResolution: "bundler"`, so its emitted ESM
 * contains extensionless directory imports (`export * from './types'`). Plain
 * Node ESM rejects those with ERR_UNSUPPORTED_DIR_IMPORT, so
 * `import '@cognnitive/innfo-core'` fails outright in Node.
 *
 * Every current consumer hides this: the editor goes through Vite, the tests
 * through Vitest, and innfo-mcp through tsup — all bundlers, all of which
 * resolve directory imports. The simulation deliberately consumes the package
 * the way an ordinary Node program would, hits the wall, and then bundles it
 * with esbuild exactly as innfo-mcp's build does.
 *
 * Delete this shim the day `dist/index.js` imports resolve under Node.
 */
import { existsSync, mkdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT, SIM } from './harness.mjs'

const ENTRY = join(ROOT, 'iNNfo', 'packages', 'innfo-core', 'dist', 'index.js')
const OUT_DIR = join(SIM, '.cache')
const OUT = join(OUT_DIR, 'innfo-core.bundle.mjs')

/** True when plain Node ESM can import the package as published. */
export async function nodeEsmImportWorks() {
  try {
    await import('@cognnitive/innfo-core')
    return { ok: true, error: null }
  } catch (err) {
    return { ok: false, error: `${err.code ?? err.name}: ${err.url ?? err.message}` }
  }
}

let cached = null

export async function loadCore() {
  if (cached) return cached
  const direct = await nodeEsmImportWorks()
  if (direct.ok) {
    cached = await import('@cognnitive/innfo-core')
    return cached
  }
  if (!existsSync(ENTRY)) {
    throw new Error(`innfo-core is not built. Run: npm --prefix iNNfo/packages/innfo-core run build`)
  }
  const stale = !existsSync(OUT) || statSync(OUT).mtimeMs < statSync(ENTRY).mtimeMs
  if (stale) {
    mkdirSync(OUT_DIR, { recursive: true })
    const { build } = await import(pathToFileURL(join(ROOT, 'iNNfo', 'node_modules', 'esbuild', 'lib', 'main.js')).href)
    await build({
      entryPoints: [ENTRY],
      outfile: OUT,
      bundle: true,
      format: 'esm',
      platform: 'node',
      target: 'node20',
      logLevel: 'silent',
      external: ['node:*'],
      // `yaml` ships CJS; bundling it into ESM needs a working `require`.
      banner: {
        js: [
          "import { createRequire as __createRequire } from 'node:module'",
          'const require = __createRequire(import.meta.url)',
        ].join(String.fromCharCode(10)),
      },
    })
  }
  cached = await import(pathToFileURL(OUT).href)
  return cached
}
