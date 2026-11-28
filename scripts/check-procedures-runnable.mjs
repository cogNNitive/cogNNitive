#!/usr/bin/env node

/**
 * scripts/check-procedures-runnable.mjs
 *
 * Every shipped procedure document is well formed and runnable. Well formed is nn-core's
 * `procedureDocumentDiagnostics`: exactly one `Procedure` header with every `Work` nested
 * under it. Runnable is nn-core's `procedureGraph`, the parser the procedure runner itself
 * uses (`procedure_start`, `procedure_state`), reporting no error. A procedure that breaks
 * either (no header, a loose step, no `slug::`, a `next` to a step that is not one, two
 * starts, an unguarded loop) is listed with its file and its step, so it cannot ship broken.
 *
 * Discovery is shared with `check-procedures-version.mjs` (every `*_NN.md` directly under
 * a bluepriNNt's `procedures/` directory), narrowed to the `*_procedures_NN.md` documents
 * the runner loads. A run walks a whole document, so every document is checked whole.
 *
 * nn-core is imported from its built `dist/` (CI builds it before verify.js). The guard
 * FAILS; it never rewrites a procedure.
 *
 * Usage:
 *   node scripts/check-procedures-runnable.mjs          # check (default); exit 1 on failure
 *   node scripts/check-procedures-runnable.mjs --json   # machine-readable failures
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { discoverProcedureFiles } from './check-procedures-version.mjs'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..')
const BLUEPRINTS_ROOT = path.join(REPO_ROOT, 'iNNfo', 'specs', 'bluepriNNts')
const CORE_DIST = path.join(REPO_ROOT, 'iNNfo', 'packages', 'nn-core', 'dist', 'index.js')
const require = createRequire(import.meta.url)
const { isProcedureDocument } = /** @type {{ isProcedureDocument: (name: string) => boolean }} */ (
  require('../skills/nn-preflight/scripts/lib/naming-contract.generated.cjs')
)

/** nn-core's parser and graph, from its built dist. */
export async function loadCore(distFile = CORE_DIST) {
  if (!fs.existsSync(distFile)) {
    throw new Error(
      `nn-core is not built (${path.relative(REPO_ROOT, distFile)} is missing): ` +
        'run `npm --workspace=@cognnitive/nn-core run build` first.',
    )
  }
  const core = await import(pathToFileURL(distFile).href)
  return {
    parseKnowledge: core.parseKnowledge,
    procedureGraph: core.procedureGraph,
    procedureDocumentDiagnostics: core.procedureDocumentDiagnostics,
  }
}

/**
 * @param {{ blueprintsRoot?: string, core?: { parseKnowledge: Function, procedureGraph: Function, procedureDocumentDiagnostics: Function } }} [options]
 *   `core` is the nn-core pair from `loadCore()`; loaded from dist when omitted.
 * @returns {Promise<{ ok: boolean, checked: number, failures: Array<{target:string, step:string|null, code:string, detail:string}> }>}
 */
export async function checkProceduresRunnable({ blueprintsRoot = BLUEPRINTS_ROOT, core } = {}) {
  const { parseKnowledge, procedureGraph, procedureDocumentDiagnostics } =
    core ?? (await loadCore())
  const failures = []
  const files = discoverProcedureFiles(blueprintsRoot).filter((f) =>
    isProcedureDocument(path.basename(f)),
  )
  for (const file of files) {
    const target = path.relative(blueprintsRoot, file).split(path.sep).join('/')
    const model = parseKnowledge(fs.readFileSync(file, 'utf8'))
    for (const d of [
      ...procedureDocumentDiagnostics(model),
      ...procedureGraph(model).diagnostics,
    ]) {
      if (d.severity !== 'error') continue
      failures.push({ target, step: d.step ?? null, code: d.code, detail: d.detail })
    }
  }
  return { ok: failures.length === 0, checked: files.length, failures }
}

// ── CLI ────────────────────────────────────────────────────────────────
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  const asJson = process.argv.includes('--json')
  let result
  try {
    result = await checkProceduresRunnable()
  } catch (err) {
    console.error(`❌ ${err.message}`)
    process.exit(1)
  }
  const { ok, checked, failures } = result

  if (asJson) {
    console.log(JSON.stringify({ ok, checked, failures }, null, 2))
  } else if (ok) {
    console.log(`✅ ${checked} shipped procedure document(s) are well formed and runnable.`)
  } else {
    console.error('❌ Unrunnable shipped procedures:')
    for (const f of failures) {
      console.error(`  - ${f.target}${f.step ? ` (step ${f.step})` : ''} [${f.code}] ${f.detail}`)
    }
    console.error(
      '\nA procedure document holds one `## NN Procedure:` header with every step nested',
    )
    console.error('under it as `### NN Work:`; every step carries `slug::`, `next::` names `@slug`')
    console.error(
      'addresses of steps of the same document, there is one start, and no unguarded loop.',
    )
  }

  process.exit(ok ? 0 : 1)
}
