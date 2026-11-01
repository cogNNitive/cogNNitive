/**
 * Loads `@cognnitive/nn-core` for the simulation.
 *
 * The simulation deliberately consumes the package the way an ordinary Node
 * program would: it first tries a plain `import '@cognnitive/nn-core'`. nn-core
 * is built with NodeNext resolution and explicit `.js` specifiers, so that
 * import is expected to work under Node ESM.
 *
 * The esbuild bundling below is a fallback kept for the case where the direct
 * import fails (for example a regression to extensionless directory imports,
 * which Node rejects with ERR_UNSUPPORTED_DIR_IMPORT). Scenario S08 reports
 * which path was taken.
 */
import { existsSync, mkdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT, SIM } from './harness.mjs'

const ENTRY = join(ROOT, 'iNNfo', 'packages', 'nn-core', 'dist', 'index.js')
const OUT_DIR = join(SIM, '.cache')
const OUT = join(OUT_DIR, 'nn-core.bundle.mjs')

/** True when plain Node ESM can import the package as published. */
export async function nodeEsmImportWorks() {
  try {
    await import('@cognnitive/nn-core')
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
    cached = await import('@cognnitive/nn-core')
    return cached
  }
  if (!existsSync(ENTRY)) {
    throw new Error(`nn-core is not built. Run: npm --prefix iNNfo/packages/nn-core run build`)
  }
  const stale = !existsSync(OUT) || statSync(OUT).mtimeMs < statSync(ENTRY).mtimeMs
  if (stale) {
    mkdirSync(OUT_DIR, { recursive: true })
    const { build } = await import(pathToFileURL(join(ROOT, 'node_modules', 'esbuild', 'lib', 'main.js')).href)
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
