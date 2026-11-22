/* Emits the browser source of nn-core's procedure fold, ready to put in a console slot.
   `foldRun` is not self-contained (TERMINAL, ARTIFACT_STATUS, reachable, guardOf live in the
   module), so bundling the module is the only honest way to ship the real implementation. */
const path = require('node:path')
const esbuild = require('esbuild')

async function procedureFoldBrowserSource(repoRoot) {
  const entry = path.join(repoRoot, 'iNNfo', 'packages', 'nn-core', 'src', 'procedure', 'fold.ts')
  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: 'iife',
    globalName: '__nnFoldModule',
    platform: 'browser',
    target: 'es2020',
    legalComments: 'none',
    // esbuild stamps each module's absolute path into a `// <path>` banner by default, which
    // makes the artifact differ per checkout: the fixture could never reproduce on another
    // machine. Paths are rebased to the repo root, so the same sources give the same bytes.
    absWorkingDir: repoRoot,
  })
  const code = result.outputFiles[0].text
  // The slot is JSON, so the payload is the source as a JSON string.
  return JSON.stringify(code)
}

module.exports = { procedureFoldBrowserSource }
